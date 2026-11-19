import mongoose  from 'mongoose';
import dotenv    from 'dotenv';
import bcrypt    from 'bcryptjs';
import crypto    from 'crypto';
import User      from './models/User.js';
import Routine   from './models/Routine.js';
import Attendance from './models/Attendance.js';

dotenv.config();

/** Generate a random password and return { plain, hashed } */
async function makePassword(plain) {
  const salt   = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(plain, salt);
  return { plain, hashed };
}

export const importData = async () => {
  try {
    const adminExists = await User.findOne({ role: 'Admin' });
    if (adminExists) {
      console.log('Seed data already present — skipping.');
      return;
    }

    await User.deleteMany();
    await Routine.deleteMany();
    await mongoose.model('Attendance').deleteMany();

    // Generate unique random passwords per account (8 chars, alphanumeric)
    const makePlain = () => crypto.randomBytes(4).toString('hex'); // 8 hex chars

    const adminPwd    = await makePassword(makePlain());
    const teacher1Pwd = await makePassword(makePlain());
    const teacher2Pwd = await makePassword(makePlain());
    const teacher3Pwd = await makePassword(makePlain());
    const student1Pwd = await makePassword(makePlain());
    const student2Pwd = await makePassword(makePlain());

    const accounts = [
      { name: 'Admin User',              email: 'admin@test.com',    password: adminPwd.hashed,    role: 'Admin' },
      { name: 'Teacher Data Science',    email: 'teacher1@test.com', password: teacher1Pwd.hashed, role: 'Teacher', assignedSubjects: ['Data Science'] },
      { name: 'Teacher Intrusion',       email: 'teacher2@test.com', password: teacher2Pwd.hashed, role: 'Teacher', assignedSubjects: ['Intrusion Detection'] },
      { name: 'Teacher Cloud',           email: 'teacher3@test.com', password: teacher3Pwd.hashed, role: 'Teacher', assignedSubjects: ['Cloud Computing'] },
      { name: 'Student 1',               email: 'student1@test.com', password: student1Pwd.hashed, role: 'Student' },
      { name: 'Student 2',               email: 'student2@test.com', password: student2Pwd.hashed, role: 'Student' },
    ];

    const createdUsers = await User.insertMany(accounts);

    // Print credentials to console (never stored in source)
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║      🔑  SEED ACCOUNT CREDENTIALS      ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║  admin@test.com    → ${adminPwd.plain}   ║`);
    console.log(`║  teacher1@test.com → ${teacher1Pwd.plain}   ║`);
    console.log(`║  teacher2@test.com → ${teacher2Pwd.plain}   ║`);
    console.log(`║  teacher3@test.com → ${teacher3Pwd.plain}   ║`);
    console.log(`║  student1@test.com → ${student1Pwd.plain}   ║`);
    console.log(`║  student2@test.com → ${student2Pwd.plain}   ║`);
    console.log('╚══════════════════════════════════════╝\n');

    const [, teacher1, teacher2, teacher3, student1] = createdUsers;

    const createdRoutines = await Routine.insertMany([
      { day: 'Monday',  period: 1, subject: 'Data Science',       teacherId: teacher1._id, startTime: '09:00', endTime: '10:00' },
      { day: 'Monday',  period: 2, subject: 'Intrusion Detection', teacherId: teacher2._id, startTime: '10:00', endTime: '11:00' },
      { day: 'Monday',  period: 3, subject: 'Cloud Computing',     teacherId: teacher3._id, startTime: '11:00', endTime: '12:00' },
      { day: 'Tuesday', period: 1, subject: 'Cloud Computing',     teacherId: teacher3._id, startTime: '09:00', endTime: '10:00' },
      { day: 'Tuesday', period: 2, subject: 'Data Science',        teacherId: teacher1._id, startTime: '10:00', endTime: '11:00' },
    ]);

    // 25 mock attendance records for Student 1
    const mockAttendances = Array.from({ length: 25 }, (_, i) => ({
      studentId: student1._id,
      routineId: createdRoutines[0]._id,
      date:      new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      status:    'Present',
      location:  { lat: 22.5758538, lng: 88.4271862 },
      verified:  true,
    }));

    await mongoose.model('Attendance').insertMany(mockAttendances);

    console.log('✅ Seed data imported successfully.');
  } catch (error) {
    console.error(`❌ Seeder error: ${error.message}`);
  }
};
