import { validationResult } from 'express-validator';

/**
 * Drop-in middleware: runs after express-validator chains.
 * Returns 422 with field-level errors on the first validation failure.
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
};
