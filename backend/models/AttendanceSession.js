import mongoose from 'mongoose';

/**
 * A teacher-opened attendance window for one routine slot.
 * Students can only call mark-attendance while an open session exists
 * for that routineId and the window hasn't expired.
 */
const attendanceSessionSchema = new mongoose.Schema(
  {
    routineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Routine',
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    windowMins: {
      type: Number,
      default: 15,
      min: 1,
      max: 120,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true } // createdAt = when the teacher opened the session
);

attendanceSessionSchema.index({ routineId: 1, isOpen: 1 });

const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);
export default AttendanceSession;
