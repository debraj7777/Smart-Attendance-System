import { validationResult } from 'express-validator';

export const STUDENT_EMAIL_REGEX = /^[a-zA-Z]{4,}\d{12}@technoindiaeducation\.com$/i;
export const TEACHER_EMAIL_REGEX = /^[^\s@]+@technoindiaeducation\.com$/i;

/**
 * Validates that an email matches the institutional format for Student or Teacher roles.
 * Returns an error message string if invalid, or null if valid.
 */
export function getRoleEmailError(email, role) {
  if (!email) return 'Valid email is required';
  if (role === 'Student' && !STUDENT_EMAIL_REGEX.test(email)) {
    return 'Student email must be <name><12-digit-number>@technoindiaeducation.com (at least 4 letters before 12 digits).';
  }
  if (role === 'Teacher' && !TEACHER_EMAIL_REGEX.test(email)) {
    return 'Teacher email must end with @technoindiaeducation.com.';
  }
  return null;
}

/**
 * Drop-in middleware: runs after express-validator chains.
 * Returns 422 with field-level errors on the first validation failure.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};
