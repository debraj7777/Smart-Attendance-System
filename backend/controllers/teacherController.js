import User from '../models/User.js';
import Notification from '../models/Notification.js';

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
