import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { BookOpen, AlertTriangle, UserCheck, Clock } from 'lucide-react';

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState('');
  const [showChartModal, setShowChartModal] = useState(false);

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

  const handleSendWarning = async (studentId, studentName) => {
    try {
      await api.post('/teacher/send-warning', { studentId });
      setNotification(`Warning sent successfully to ${studentName}`);
      setTimeout(() => setNotification(''), 3000);
    } catch (error) {
      alert('Failed to send warning');
    }
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row items-center md:justify-between">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
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
