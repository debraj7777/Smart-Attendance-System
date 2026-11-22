import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { BookOpen, AlertTriangle, UserCheck, Clock, PlayCircle, StopCircle, Timer } from 'lucide-react';

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [showChartModal, setShowChartModal] = useState(false);

  // Session management state
  const [routines, setRoutines] = useState([]);
  const [openSessions, setOpenSessions] = useState([]);
  const [selectedRoutine, setSelectedRoutine] = useState('');
  const [windowMins, setWindowMins] = useState(15);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [countdown, setCountdown] = useState({}); // sessionId → seconds remaining

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const res = await api.get('/teacher/roster');
        setRoster(res.data);
      } catch (error) {
        console.error("Error fetching roster", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoster();
  }, []);

  // Fetch routines and open sessions on mount
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const [routineRes, sessionRes] = await Promise.all([
          api.get('/teacher/routines'),
          api.get('/teacher/sessions'),
        ]);
        setRoutines(routineRes.data);
        setOpenSessions(sessionRes.data);
      } catch (err) {
        console.error('Error fetching session data', err);
      }
    };
    fetchSessionData();
  }, []);

  // Countdown ticker — updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        const next = { ...prev };
        openSessions.forEach((s) => {
          const expiresAt = new Date(s.createdAt).getTime() + s.windowMins * 60 * 1000;
          next[s._id] = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [openSessions]);

  const handleSendWarning = async (studentId, studentName) => {
    try {
      await api.post('/teacher/send-warning', { studentId });
      setNotification(`Warning sent successfully to ${studentName}`);
      setTimeout(() => setNotification(''), 3000);
    } catch (error) {
      alert('Failed to send warning');
    }
  };

  const handleOpenSession = async () => {
    if (!selectedRoutine) return alert('Please select a class first.');
    setSessionLoading(true);
    try {
      const res = await api.post('/teacher/sessions', {
        routineId: selectedRoutine,
        windowMins: Number(windowMins),
      });
      setOpenSessions((prev) => [...prev, res.data.session]);
      setNotification(`Attendance session opened for ${windowMins} minutes.`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to open session.');
    } finally {
      setSessionLoading(false);
    }
  };

  const handleCloseSession = async (sessionId) => {
    try {
      await api.delete(`/teacher/sessions/${sessionId}`);
      setOpenSessions((prev) => prev.filter((s) => s._id !== sessionId));
      setNotification('Session closed.');
      setTimeout(() => setNotification(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close session.');
    }
  };

  const fmtCountdown = (secs) => {
    if (secs == null || secs <= 0) return 'Expired';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (loading) return <div>Loading roster...</div>;

  return (
    <div className="space-y-6">
      {notification && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center shadow-sm">
          <UserCheck className="w-5 h-5 mr-2" />
          {notification}
        </div>
      )}

      {/* Profile Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center md:justify-between">        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
             <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-500">Subjects: {user?.assignedSubjects?.join(', ') || 'N/A'}</p>
          </div>
        </div>
        <div className="flex space-x-4">
           <button onClick={() => setShowChartModal(true)} className="bg-gray-50 px-4 py-2 rounded-lg text-center border border-gray-100 hover:bg-gray-100 transition-colors focus:outline-none">
             <p className="text-xs text-gray-500 uppercase font-semibold">Total Students (Chart)</p>
             <p className="text-lg font-bold text-gray-900">{roster.length}</p>
           </button>
           <div className="bg-gray-50 px-4 py-2 rounded-lg text-center border border-gray-100">
             <p className="text-xs text-gray-500 uppercase font-semibold">Next Class</p>
             <p className="text-lg font-bold text-gray-900 flex items-center justify-center"><Clock className="w-4 h-4 mr-1"/> 10:00 AM</p>
           </div>
        </div>
      </div>

      {/* ── Attendance Session Management ───────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center">
          <Timer className="w-5 h-5 mr-2 text-blue-500" /> Start Attendance Session
        </h3>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <select
            value={selectedRoutine}
            onChange={(e) => setSelectedRoutine(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">— Select a class —</option>
            {routines.map((r) => (
              <option key={r._id} value={r._id}>
                {r.subject} · {r.day} {r.startTime}–{r.endTime}
              </option>
            ))}
          </select>

          <select
            value={windowMins}
            onChange={(e) => setWindowMins(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-36"
          >
            {[5, 10, 15, 20, 30].map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>

          <button
            onClick={handleOpenSession}
            disabled={sessionLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <PlayCircle className="w-4 h-4" /> Open Session
          </button>
        </div>

        {/* Active sessions */}
        {openSessions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Active Sessions</p>
            {openSessions.map((s) => (
              <div key={s._id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {s.routineId?.subject || 'Class'} · {s.routineId?.day} {s.routineId?.startTime}
                  </p>
                  <p className="text-xs text-green-700 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {countdown[s._id] > 0
                      ? `Closes in ${fmtCountdown(countdown[s._id])}`
                      : 'Window expired — close manually'}
                  </p>
                </div>
                <button
                  onClick={() => handleCloseSession(s._id)}
                  className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  <StopCircle className="w-4 h-4" /> Close
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Roster */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-lg mb-4">Student Roster & Attendance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Student Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Attendance %</th>
                <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((student) => (
                <tr key={student._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 font-medium text-gray-900 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 font-bold text-xs">
                      {student.name.charAt(0)}
                    </div>
                    {student.name}
                  </td>
                  <td className="px-4 py-4 text-gray-500">{student.email}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2 max-w-[100px]">
                        <div 
                          className={`h-2 rounded-full ${student.attendancePercentage < 30 ? 'bg-red-500' : 'bg-green-500'}`} 
                          style={{ width: `${student.attendancePercentage}%` }}
                        ></div>
                      </div>
                      <span className={`font-semibold ${student.attendancePercentage < 30 ? 'text-red-600' : 'text-gray-700'}`}>
                        {student.attendancePercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    {student.attendancePercentage < 30 && (
                      <button
                        onClick={() => handleSendWarning(student._id, student.name)}
                        className="inline-flex items-center px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Send Warning
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showChartModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center"><BookOpen className="w-5 h-5 mr-2 text-indigo-500"/> Student Attendance Spread</h3>
              <button onClick={() => setShowChartModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-8">
              <div className="h-64 flex items-end justify-between space-x-4 border-b border-gray-200 pb-2 overflow-x-auto">
                {roster.map((student, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1 group min-w-[40px]">
                    <div className="w-full flex justify-center mb-2 opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-8">
                       <span className="text-xs font-bold bg-gray-800 text-white px-2 py-1 rounded">{student.attendancePercentage}%</span>
                    </div>
                    <div 
                      className={`w-full max-w-[50px] rounded-t-sm transition-all duration-1000 ease-out cursor-pointer ${student.attendancePercentage < 30 ? 'bg-red-500 hover:bg-red-400' : 'bg-indigo-500 hover:bg-indigo-400'}`}
                      style={{ height: `${Math.max(student.attendancePercentage, 5)}%` }}
                    ></div>
                  </div>
                ))}
                {roster.length === 0 && <p className="text-gray-500 w-full text-center pb-10">No students in roster.</p>}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium px-4 overflow-hidden">
                {roster.map((student, idx) => (
                  <span key={idx} className="truncate w-full text-center px-1" title={student.name}>{student.name.split(' ')[0]}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
