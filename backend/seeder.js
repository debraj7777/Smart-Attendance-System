import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Routine from './models/Routine.js';
import Attendance from './models/Attendance.js';

dotenv.config();

export const importData = async () => {
  try {
    // Check if data already exists to prevent duplicate seeding on every restart
    const adminExists = await User.findOne({ role: 'Admin' });
    if (adminExists) {
       console.log('Mock data already exists, skipping seed.');
       return;
    }

    await User.deleteMany();
    await Routine.deleteMany();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('1234test', salt);

    const accounts = [
      { name: 'Admin User', email: 'admin@test.com', password: hashedPassword, role: 'Admin' },
      { name: 'Teacher Data Science', email: 'teacher1@test.com', password: hashedPassword, role: 'Teacher', assignedSubjects: ['Data Science'] },
      { name: 'Teacher Intrusion', email: 'teacher2@test.com', password: hashedPassword, role: 'Teacher', assignedSubjects: ['Intrusion Detection'] },
      { name: 'Teacher Cloud', email: 'teacher3@test.com', password: hashedPassword, role: 'Teacher', assignedSubjects: ['Cloud Computing'] },
      { name: 'Student 1', email: 'student1@test.com', password: hashedPassword, role: 'Student' },
      { name: 'Student 2', email: 'student2@test.com', password: hashedPassword, role: 'Student' }
    ];

    const createdUsers = await User.insertMany(accounts);

    console.log('\n--- 🔑 ACCOUNT CREDENTIALS ---');
    console.log('All accounts have the password: 1234test');
    console.log('----------------------------------------\n');

    const teacher1 = createdUsers[1]._id;
    const teacher2 = createdUsers[2]._id;
    const teacher3 = createdUsers[3]._id;

    const createdRoutines = await Routine.insertMany([
      { day: 'Monday', period: 1, subject: 'Data Science', teacherId: teacher1, startTime: '09:00', endTime: '10:00' },
      { day: 'Monday', period: 2, subject: 'Intrusion Detection', teacherId: teacher2, startTime: '10:00', endTime: '11:00' },
      { day: 'Monday', period: 3, subject: 'Cloud Computing', teacherId: teacher3, startTime: '11:00', endTime: '12:00' },
      { day: 'Tuesday', period: 1, subject: 'Cloud Computing', teacherId: teacher3, startTime: '09:00', endTime: '10:00' },
      { day: 'Tuesday', period: 2, subject: 'Data Science', teacherId: teacher1, startTime: '10:00', endTime: '11:00' },
    ]);

    // Create 25 mock attendance records for Student 1 (to give exactly 50% attendance out of 50 mocked classes)
    const student1Id = createdUsers[4]._id;
    const mockAttendances = [];
    for (let i = 0; i < 25; i++) {
      mockAttendances.push({
        studentId: student1Id,
        routineId: createdRoutines[0]._id, // Attach to first routine for mock purposes
        date: new Date(new Date().setDate(new Date().getDate() - i)), // Past 25 days
        status: 'Present',
        location: { lat: 22.5726, lng: 88.3639 },
        verified: true
      });
    }
    
    // Clear old mock attendances before inserting
    await mongoose.model('Attendance').deleteMany();
    await mongoose.model('Attendance').insertMany(mockAttendances);

    console.log('✅ Mock Data Imported Successfully (including 50% attendance for Student 1)!');
  } catch (error) {
    console.error(`❌ Error seeding data: ${error.message}`);
  }
};
