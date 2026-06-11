import mongoose from 'mongoose';

const routineSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    required: true,
  },
  period: {
    type: Number,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startTime: {
    type: String, // format "HH:MM" e.g., "09:00"
    required: true,
  },
  endTime: {
    type: String, // format "HH:MM" e.g., "10:00"
    required: true,
  }
}, {
  timestamps: true
});

const Routine = mongoose.model('Routine', routineSchema);

export default Routine;
