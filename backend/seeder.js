import mongoose  from 'mongoose';
import dotenv    from 'dotenv';
import bcrypt    from 'bcryptjs';
import User      from './models/User.js';
import Routine   from './models/Routine.js';
import Attendance from './models/Attendance.js';

dotenv.config();

const DEFAULT_DEMO_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || '1234test';

/** Hash a plaintext password */
async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
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

    const hashedPassword = await hashPassword(DEFAULT_DEMO_PASSWORD);

    const accounts = [
      { name: 'Admin User',           email: 'admin@test.com',                                password: hashedPassword, role: 'Admin' },
      { name: 'Teacher Data Science', email: 'teacher1@technoindiaeducation.com',              password: hashedPassword, role: 'Teacher', assignedSubjects: ['Data Science'] },
      { name: 'Teacher Intrusion',    email: 'teacher2@technoindiaeducation.com',              password: hashedPassword, role: 'Teacher', assignedSubjects: ['Intrusion Detection'] },
      { name: 'Teacher Cloud',        email: 'teacher3@technoindiaeducation.com',              password: hashedPassword, role: 'Teacher', assignedSubjects: ['Cloud Computing'] },
      { name: 'Sudeshna',             email: 'sudeshna221001001001@technoindiaeducation.com',  password: hashedPassword, role: 'Student' },
      { name: 'Riya',                 email: 'riya221001001002@technoindiaeducation.com',      password: hashedPassword, role: 'Student' },
      { name: 'Prantik',              email: 'prantik221001001003@technoindiaeducation.com',   password: hashedPassword, role: 'Student' },
    ];

    const createdUsers = await User.insertMany(accounts);

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                  🔑  SEED ACCOUNT CREDENTIALS                  ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Default password (all): ${DEFAULT_DEMO_PASSWORD.padEnd(36)}  ║`);
    console.log('║  admin@test.com                                (Admin)         ║');
    console.log('║  teacher1@technoindiaeducation.com             (Teacher)       ║');
    console.log('║  teacher2@technoindiaeducation.com             (Teacher)       ║');
    console.log('║  teacher3@technoindiaeducation.com             (Teacher)       ║');
    console.log('║  sudeshna221001001001@technoindiaeducation.com (Student)       ║');
    console.log('║  riya221001001002@technoindiaeducation.com     (Student)       ║');
    console.log('║  prantik221001001003@technoindiaeducation.com  (Student)       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

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
