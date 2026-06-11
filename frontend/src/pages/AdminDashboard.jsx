import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Users, BookOpen, UserCheck, Activity } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ name: '', email: '', password: '' });
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', password: '' });
  const [newSubject, setNewSubject] = useState({ subjectName: '', teacherId: '' });

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsRes, attendanceRes, usersRes] = await Promise.all([
          api.get('/admin/dashboard-stats'),
          api.get('/admin/global-attendance'),
          api.get('/admin/users')
        ]);
        setStats(statsRes.data);
        setAttendance(attendanceRes.data);
        setStudents(usersRes.data.filter(u => u.role === 'Student'));
      } catch (error) {
        console.error("Error fetching admin data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/add-student', newStudent);
      setStudents([...students, { ...res.data.user, role: 'Student' }]);
      setStats({ ...stats, totalStudents: stats.totalStudents + 1 });
      setNewStudent({ name: '', email: '', password: '' });
      alert('Student added successfully. They must login to capture facial data.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add student');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student and their logs?')) return;
    try {
      await api.delete(`/admin/delete-student/${id}`);
      setStudents(students.filter(s => s._id !== id));
      setStats({ ...stats, totalStudents: stats.totalStudents - 1 });
    } catch (error) {
      alert('Failed to delete student');
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/add-teacher', newTeacher);
      setStats({ ...stats, totalTeachers: stats.totalTeachers + 1, teachers: [...stats.teachers, res.data.user] });
      setNewTeacher({ name: '', email: '', password: '' });
      alert('Teacher added successfully.');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to add teacher');
    }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await api.delete(`/admin/delete-teacher/${id}`);
      setStats({ 
        ...stats, 
        totalTeachers: stats.totalTeachers - 1,
        teachers: stats.teachers.filter(t => t._id !== id)
      });
    } catch (error) {
      alert('Failed to delete teacher');
    }
  };

  const handleAssignSubject = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/assign-subject', { subject: newSubject.subjectName, teacherId: newSubject.teacherId });
      alert('Subject assigned successfully! Refreshing data...');
      window.location.reload(); // Simple refresh to fetch new subjects and routines
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to assign subject');
    }
  };

  // Activity Trends Math
  const activityTrends = Array(7).fill(0);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  attendance.forEach(log => {
    const diffDays = Math.floor(Math.abs(today - new Date(log.date)) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < 7) {
      activityTrends[6 - diffDays]++;
    }
  });
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const trendLabels = Array(7).fill('').map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return daysOfWeek[d.getDay()];
  });

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-500">System-wide statistics and logs.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <button onClick={() => setShowStudentModal(true)} className="text-left focus:outline-none transition-transform hover:scale-105">
          <StatCard icon={<Users />} title="Total Students (Click)" value={stats?.totalStudents || 0} color="bg-blue-500" />
        </button>
        <button onClick={() => setShowTeacherModal(true)} className="text-left focus:outline-none transition-transform hover:scale-105">
          <StatCard icon={<UserCheck />} title="Total Teachers (Click)" value={stats?.totalTeachers || 0} color="bg-indigo-500" />
        </button>
        <button onClick={() => setShowSubjectModal(true)} className="text-left focus:outline-none transition-transform hover:scale-105">
          <StatCard icon={<BookOpen />} title="Total Subjects (Click)" value={stats?.totalSubjects || 0} color="bg-purple-500" />
        </button>
        <button onClick={() => setShowChartModal(true)} className="text-left focus:outline-none transition-transform hover:scale-105">
          <StatCard icon={<Activity />} title="Total Logs (Chart)" value={attendance.length} color="bg-green-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrollments Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-1">
          <h3 className="font-semibold text-lg mb-4">Enrollments per Subject</h3>
          <div className="space-y-4">
            {stats?.enrollments?.map((e, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{e.subject}</span>
                  <span className="text-gray-500">{e.count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min((e.count/200)*100, 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Attendance Log */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="font-semibold text-lg mb-4">Recent Attendance Logs</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Student</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 rounded-tr-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 8).map((log, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{log.studentId?.name || 'Unknown'}</td>
                    <td className="px-4 py-3 text-gray-600">{log.routineId?.subject || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(log.date).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${log.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {attendance.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">No attendance records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showTeacherModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center"><UserCheck className="w-5 h-5 mr-2 text-indigo-500"/> Teacher Management</h3>
              <button onClick={() => setShowTeacherModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Add New Teacher</h4>
                <form onSubmit={handleAddTeacher} className="flex flex-col md:flex-row gap-3">
                  <input type="text" placeholder="Full Name" required className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} />
                  <input type="email" placeholder="Email Address" required className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={newTeacher.email} onChange={e => setNewTeacher({...newTeacher, email: e.target.value})} />
                  <input type="text" placeholder="Password" required className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={newTeacher.password} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} />
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm whitespace-nowrap shadow-md">Add Teacher</button>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Teacher Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Assigned Subjects</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.teachers?.map((teacher, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{teacher.name}</td>
                        <td className="px-4 py-3 text-gray-500">{teacher.email}</td>
                        <td className="px-4 py-3 text-indigo-700 font-medium">{teacher.assignedSubjects?.join(', ') || 'None'}</td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleDeleteTeacher(teacher._id)}
                            className="text-red-500 hover:text-white border border-red-500 hover:bg-red-500 px-3 py-1 rounded transition-colors text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!stats?.teachers || stats.teachers.length === 0) && (
                      <tr><td colSpan="4" className="text-center py-4 text-gray-500">No teachers found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center"><BookOpen className="w-5 h-5 mr-2 text-purple-500"/> Subject Management</h3>
              <button onClick={() => setShowSubjectModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Add Subject & Assign Teacher</h4>
                <form onSubmit={handleAssignSubject} className="flex flex-col md:flex-row gap-3">
                  <input type="text" placeholder="Subject Name (e.g. Cybersecurity)" required className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm" value={newSubject.subjectName} onChange={e => setNewSubject({...newSubject, subjectName: e.target.value})} />
                  <select required className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white" value={newSubject.teacherId} onChange={e => setNewSubject({...newSubject, teacherId: e.target.value})}>
                    <option value="" disabled>Select a Teacher...</option>
                    {stats?.teachers?.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors text-sm whitespace-nowrap shadow-md">Assign Subject</button>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Subject Name</th>
                      <th className="px-4 py-3 text-right">Student Enrollments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.enrollments?.map((e, idx) => (
                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{e.subject}</td>
                        <td className="px-4 py-3 text-right font-bold text-purple-700">{e.count} Students</td>
                      </tr>
                    ))}
                    {(!stats?.enrollments || stats.enrollments.length === 0) && (
                      <tr><td colSpan="2" className="text-center py-4 text-gray-500">No subjects found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showChartModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center"><Activity className="w-5 h-5 mr-2 text-green-500"/> Activity Trends (Last 7 Days)</h3>
              <button onClick={() => setShowChartModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-8">
              <div className="h-64 flex items-end justify-between space-x-2 border-b border-gray-200 pb-2 relative">
                {activityTrends.map((val, idx) => {
                  const maxVal = Math.max(...activityTrends, 1);
                  return (
                  <div key={idx} className="flex-1 h-full flex flex-col justify-end group">
                    <div className="w-full flex justify-center mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-xs font-bold bg-gray-800 text-white px-2 py-1 rounded">{val} logs</span>
                    </div>
                    <div className="w-full flex justify-center">
                      <div 
                        className="w-10 bg-green-500 rounded-t-sm transition-all duration-1000 ease-out hover:bg-green-400 cursor-pointer"
                        style={{ height: `${(val / maxVal) * 15}rem` }}
                      ></div>
                    </div>
                  </div>
                )})}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium px-4">
                {trendLabels.map((day, idx) => <span key={idx}>{day}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center"><Users className="w-5 h-5 mr-2 text-blue-500"/> Student Management</h3>
              <button onClick={() => setShowStudentModal(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              {/* Add Student Form */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
                <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wider">Add New Student</h4>
                <form onSubmit={handleAddStudent} className="flex flex-col md:flex-row gap-3">
                  <input type="text" placeholder="Full Name" required className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                  <input type="email" placeholder="Email Address" required className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} />
                  <input type="text" placeholder="Password" required className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} />
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm whitespace-nowrap shadow-md">Add Student</button>
                </form>
              </div>

              {/* Student List */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Facial Data</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student._id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-3 text-gray-500">{student.email}</td>
                        <td className="px-4 py-3">
                           {student.faceDescriptor && student.faceDescriptor.length > 0 
                             ? <span className="text-green-600 font-semibold text-xs bg-green-50 px-2 py-1 rounded">Enrolled</span>
                             : <span className="text-orange-500 font-semibold text-xs bg-orange-50 px-2 py-1 rounded">Pending</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleDeleteStudent(student._id)}
                            className="text-red-500 hover:text-white border border-red-500 hover:bg-red-500 px-3 py-1 rounded transition-colors text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr><td colSpan="4" className="text-center py-4 text-gray-500">No students found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
    <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white`}>
      {React.cloneElement(icon, { className: 'w-6 h-6' })}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
    </div>
  </div>
);

export default AdminDashboard;
