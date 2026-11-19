import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Routine from '../models/Routine.js';
import AttendanceSession from '../models/AttendanceSession.js';
import AuditLog from '../models/AuditLog.js';

export const getRoster = async (req, res) => {
  try {
    // In a real scenario, this would query based on the teacher's subject and enrolled students
    const students = await User.find({ role: 'Student' }).select('-password');
    
    // Attach mock attendance percentage for demonstration
    const roster = students.map(student => {
      // Mocking attendance between 20% and 100%
      const attendancePercentage = Math.floor(Math.random() * 80) + 20; 
      return {
        ...student.toObject(),
        attendancePercentage
      };
    });

    res.json(roster);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendWarning = async (req, res) => {
  try {
    const { studentId } = req.body;
    const teacherId = req.user._id;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    const notification = await Notification.create({
      studentId,
      teacherId,
      message: 'Warning: Your attendance has fallen below the 30% threshold. Please meet your teacher immediately.'
    });

    res.status(201).json({ message: 'Warning alert sent successfully', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// POST /api/teacher/sessions  — open an attendance window
// ---------------------------------------------------------------------------
export const openSession = async (req, res) => {
  try {
    const { routineId, windowMins = 15 } = req.body;
    const teacherId = req.user._id;

    if (!routineId) {
      return res.status(400).json({ message: 'routineId is required.' });
    }

    // Verify the routine belongs to this teacher
    const routine = await Routine.findById(routineId);
    if (!routine) {
      return res.status(404).json({ message: 'Routine not found.' });
    }
    if (routine.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'You are not assigned to this routine.' });
    }

    // Close any stale open session for this routine first
    await AttendanceSession.updateMany(
      { routineId, isOpen: true },
      { isOpen: false, closedAt: new Date() }
    );

    const session = await AttendanceSession.create({ routineId, teacherId, windowMins });

    await AuditLog.create({
      actorId:   teacherId,
      actorRole: 'Teacher',
      action:    'OPEN_SESSION',
      targetId:  session._id,
      meta:      { routineId, windowMins },
      ip:        req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ message: 'Attendance session opened.', session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/teacher/sessions/:id  — manually close a session
// ---------------------------------------------------------------------------
export const closeSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found.' });
    if (session.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not your session.' });
    }

    session.isOpen   = false;
    session.closedAt = new Date();
    await session.save();

    await AuditLog.create({
      actorId:   req.user._id,
      actorRole: 'Teacher',
      action:    'CLOSE_SESSION',
      targetId:  session._id,
      meta:      { routineId: session.routineId },
      ip:        req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ message: 'Session closed.', session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------------------
// GET /api/teacher/sessions  — list this teacher's open sessions
// ---------------------------------------------------------------------------
export const getMySessions = async (req, res) => {
  try {
    const sessions = await AttendanceSession.find({
      teacherId: req.user._id,
      isOpen: true,
    }).populate('routineId', 'subject day startTime endTime');
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
