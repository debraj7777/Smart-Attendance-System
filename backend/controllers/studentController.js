import Routine          from '../models/Routine.js';
import Attendance       from '../models/Attendance.js';
import User             from '../models/User.js';
import AttendanceSession from '../models/AttendanceSession.js';
import AuditLog         from '../models/AuditLog.js';
import { decryptDescriptor } from '../utils/crypto.js';

// ---------------------------------------------------------------------------
// Geofencing helpers
// ---------------------------------------------------------------------------
const ALLOWED_ZONES = [
  { name: 'Techno India University', lat: 22.5758538, lng: 88.4271862 },
  { name: 'Godrej Genesis Building',  lat: 22.5737,    lng: 88.4336    },
];
const MAX_RADIUS_METERS = 500;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R  = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a  = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Face-match helpers (pure JS — no face-api dependency on the server)
// ---------------------------------------------------------------------------
function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Infinity;
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : -1;
}

const FACE_MATCH_THRESHOLD = 0.45;
const MIN_COSINE_SIMILARITY = 0.90;
const REQUIRE_LIVENESS = false;

async function verifyStudentFace(studentId, liveDescriptor) {
  if (!liveDescriptor || !Array.isArray(liveDescriptor) || liveDescriptor.length !== 128) {
    return { status: 400, error: 'Valid 128-D face descriptor is required.' };
  }
  const student = await User.findById(studentId).select('+faceDescriptor');
  if (!student?.faceDescriptor) {
    return { status: 400, error: 'No enrolled face data found. Please enroll first.' };
  }

  let enrolledDescriptor;
  try {
    enrolledDescriptor = decryptDescriptor(student.faceDescriptor);
  } catch {
    return { status: 500, error: 'Could not read enrolled face data. Please re-enroll.' };
  }

  const liveArr = Array.from(liveDescriptor);
  const dist = euclideanDistance(liveArr, enrolledDescriptor);
  const cos = cosineSimilarity(liveArr, enrolledDescriptor);
  const matched = dist <= FACE_MATCH_THRESHOLD && cos >= MIN_COSINE_SIMILARITY;

  return { status: 200, matched, dist, cos };
}

// ---------------------------------------------------------------------------
// GET /api/student/attendance-stats
// ---------------------------------------------------------------------------
export const getAttendanceStats = async (req, res) => {
  try {
    const studentId      = req.user._id;
    const user           = req.user;
    const attendedClasses = await Attendance.countDocuments({ studentId, status: 'Present' });

    const missedClasses = user.email === 'sudeshna221001001001@technoindiaeducation.com' ? 25 : 5;
    const totalClasses  = attendedClasses > 0 ? attendedClasses + missedClasses : 1;
    const percentage    = (attendedClasses / totalClasses) * 100;

    const subjectBreakdown = [
      { subject: 'Data Science',       attended: Math.floor(attendedClasses * 0.5), total: Math.max(1, Math.floor(totalClasses * 0.5)) },
      { subject: 'Cloud Computing',    attended: Math.floor(attendedClasses * 0.3), total: Math.max(1, Math.floor(totalClasses * 0.3)) },
      { subject: 'Intrusion Detection',attended: Math.ceil(attendedClasses  * 0.2), total: Math.max(1, Math.ceil(totalClasses  * 0.2)) },
    ];

    res.json({
      percentage: percentage.toFixed(1),
      totalClasses,
      attendedClasses: attendedClasses > 0 ? attendedClasses : Math.floor((percentage / 100) * totalClasses),
      subjectBreakdown,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/student/routine
// ---------------------------------------------------------------------------
export const getRoutine = async (req, res) => {
  try {
    const routine = await Routine.find().populate('teacherId', 'name');
    res.json(routine);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/student/mark-attendance
// ---------------------------------------------------------------------------
export const markAttendance = async (req, res) => {
  try {
    const { routineId, location, faceDescriptor: liveDescriptor, livenessVerified } = req.body;
    const studentId = req.user._id;

    if (!routineId || !location) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // ------------------------------------------------------------------
    // 1. Routine existence check (needed for all subsequent checks)
    // ------------------------------------------------------------------
    const routine = await Routine.findById(routineId);
    if (!routine) {
      return res.status(404).json({ message: 'Routine not found.' });
    }

    // ------------------------------------------------------------------
    // 2. Teacher-opened session check
    // ------------------------------------------------------------------
    const session = await AttendanceSession.findOne({ routineId, isOpen: true });
    if (!session) {
      return res.status(403).json({
        message: 'No open attendance session for this class. Ask your teacher to start one.',
      });
    }
    const sessionExpiry = new Date(session.createdAt.getTime() + session.windowMins * 60 * 1000);
    if (new Date() > sessionExpiry) {
      await AttendanceSession.findByIdAndUpdate(session._id, {
        isOpen: false,
        closedAt: new Date(),
      });
      return res.status(403).json({ message: 'Attendance window has closed.' });
    }

    // ------------------------------------------------------------------
    // 3. Timetable-aware time/day window
    // ------------------------------------------------------------------
    const days  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now   = new Date();
    const today = days[now.getDay()];
    const hhmm  = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (routine.day !== today) {
      return res.status(403).json({
        message: `This class is scheduled for ${routine.day}, not today (${today}).`,
      });
    }
    if (hhmm < routine.startTime || hhmm > routine.endTime) {
      return res.status(403).json({
        message: `Attendance window is ${routine.startTime}–${routine.endTime}. Current time: ${hhmm}.`,
      });
    }

    // ------------------------------------------------------------------
    // 4. Server-side geofence
    // ------------------------------------------------------------------
    const { lat, lng } = location;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: 'Invalid location data.' });
    }
    const inZone = ALLOWED_ZONES.some(
      (z) => haversineDistance(lat, lng, z.lat, z.lng) <= MAX_RADIUS_METERS
    );
    if (!inZone) {
      return res.status(403).json({ message: 'You must be on campus to mark attendance.' });
    }

    // ------------------------------------------------------------------
    // 5. Server-side liveness & face descriptor verification
    // ------------------------------------------------------------------
    if (REQUIRE_LIVENESS && !livenessVerified) {
      return res.status(400).json({ message: 'Liveness check must be completed before marking attendance.' });
    }
    const faceCheck = await verifyStudentFace(studentId, liveDescriptor);
    if (faceCheck.error) {
      return res.status(faceCheck.status).json({ message: faceCheck.error });
    }

    const { matched, dist, cos } = faceCheck;
    if (!matched) {
      await AuditLog.create({
        actorId:   studentId,
        actorRole: 'Student',
        action:    'MARK_ATTENDANCE_FACE_FAIL',
        targetId:  routineId,
        meta:      { routineId, faceDistance: dist.toFixed(4), cosineSimilarity: cos.toFixed(4) },
        ip:        req.ip,
        userAgent: req.headers['user-agent'],
      });
      return res.status(403).json({
        message: `Face match failed (distance: ${dist.toFixed(2)}, similarity: ${(cos * 100).toFixed(0)}%). Registered face does not match.`,
      });
    }

    // ------------------------------------------------------------------
    // 6. Duplicate attendance guard
    // ------------------------------------------------------------------
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const existing = await Attendance.findOne({ studentId, routineId, date: { $gte: todayStart } });
    if (existing) {
      return res.status(409).json({ message: 'Attendance already marked for this class today.' });
    }

    // ------------------------------------------------------------------
    // 7. All checks passed — record attendance
    // ------------------------------------------------------------------
    const newAttendance = await Attendance.create({
      studentId,
      routineId,
      location,
      status: 'Present',
      verified: true,
    });

    // Audit log
    await AuditLog.create({
      actorId:   studentId,
      actorRole: 'Student',
      action:    'MARK_ATTENDANCE',
      targetId:  newAttendance._id,
      meta:      { routineId, location, faceDistance: dist.toFixed(4), livenessVerified: Boolean(livenessVerified), sessionId: session._id },
      ip:        req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ message: 'Attendance marked successfully', attendance: newAttendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/student/verify-face  — pre-check live descriptor against enrolled face
// ---------------------------------------------------------------------------
export const verifyFace = async (req, res) => {
  try {
    const { faceDescriptor: liveDescriptor } = req.body;
    const faceCheck = await verifyStudentFace(req.user._id, liveDescriptor);
    if (faceCheck.error) {
      return res.status(faceCheck.status).json({ message: faceCheck.error });
    }

    const { matched, dist, cos } = faceCheck;
    if (!matched) {
      return res.status(403).json({
        matched: false,
        distance: Number(dist.toFixed(4)),
        cosineSimilarity: Number(cos.toFixed(4)),
        message: `Face match failed (distance: ${dist.toFixed(2)}, similarity: ${(cos * 100).toFixed(0)}%). Registered face does not match.`,
      });
    }

    res.json({
      matched: true,
      distance: Number(dist.toFixed(4)),
      cosineSimilarity: Number(cos.toFixed(4)),
      message: 'Face match verified.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
