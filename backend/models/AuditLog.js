import mongoose from 'mongoose';

/**
 * Tamper-evident audit trail.
 * Written on every significant write (login, enroll, mark-attendance, admin edits).
 * Never exposes a write endpoint — only the Admin GET endpoint reads it.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorRole: { type: String },
    action: {
      type: String,
      required: true,
      // e.g. LOGIN | ENROLL_FACE | MARK_ATTENDANCE | ADD_STUDENT | DELETE_STUDENT | ASSIGN_SUBJECT
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId, // attendance doc, user doc, etc.
    },
    meta: {
      type: mongoose.Schema.Types.Mixed, // freeform detail bag
    },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true } // createdAt === event timestamp
);

// Index for efficient admin queries
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
