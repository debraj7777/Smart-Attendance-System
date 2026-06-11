import User from '../models/User.js';
import Routine from '../models/Routine.js';
import Attendance from '../models/Attendance.js';

export const getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'Student' });
    const totalTeachers = await User.countDocuments({ role: 'Teacher' });
    
    // In a real app, subjects might be a separate collection, but here we derive from routine or teacher assignments
    const routines = await Routine.find();
    const subjects = [...new Set(routines.map(r => r.subject))];
    const totalSubjects = subjects.length || 3; // default to 3 if db empty

    const teachers = await User.find({ role: 'Teacher' }).select('name email assignedSubjects');

    // Accurate Enrollments: Iterate over all students and count subjects
    const students = await User.find({ role: 'Student' });
    const enrollmentCounts = {};
    students.forEach(student => {
      if (student.enrolledClasses) {
        student.enrolledClasses.forEach(subject => {
          enrollmentCounts[subject] = (enrollmentCounts[subject] || 0) + 1;
        });
      }
    });

    const enrollments = Object.keys(enrollmentCounts).map(subject => ({
      subject,
      count: enrollmentCounts[subject]
    }));

    // Breakdown: students under specific teachers
    const stats = {
      totalStudents,
      totalTeachers,
      totalSubjects,
      teachers, 
      enrollments
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getGlobalAttendance = async (req, res) => {
  try {
    const attendanceLogs = await Attendance.find()
      .populate('studentId', 'name email')
      .populate('routineId', 'subject date period')
      .sort('-date');
    
    res.json(attendanceLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'Student',
      enrolledClasses: ['Data Science', 'Cloud Computing', 'Intrusion Detection'] // Default demo classes
    });

    res.status(201).json({ message: 'Student created successfully', user: { _id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user || user.role !== 'Student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    await User.findByIdAndDelete(id);
    await Attendance.deleteMany({ studentId: id }); // Cleanup logs
    
    res.json({ message: 'Student and associated attendance logs deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'Teacher',
      assignedSubjects: [] 
    });

    res.status(201).json({ message: 'Teacher created successfully', user: { _id: user._id, name: user.name, email: user.email, assignedSubjects: [] } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user || user.role !== 'Teacher') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    await User.findByIdAndDelete(id);
    // Cleanup routines associated with teacher
    await Routine.deleteMany({ teacherId: id });
    
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignSubject = async (req, res) => {
  try {
    const { subject, teacherId } = req.body;

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'Teacher') {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (!teacher.assignedSubjects.includes(subject)) {
      teacher.assignedSubjects.push(subject);
      await teacher.save();
    }

    // Create a generic routine for this subject if it doesn't exist
    const routineExists = await Routine.findOne({ subject });
    if (!routineExists) {
      await Routine.create({
        subject,
        teacherId,
        day: 'Monday', // Placeholder schedule
        period: 1,
        startTime: '09:00',
        endTime: '10:00'
      });
    }

    res.json({ message: 'Subject created and assigned successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
