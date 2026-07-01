/**
 * SealProof — Request Validation Middleware
 * Lightweight schema validation without external deps.
 */

/**
 * Create a validation middleware.
 * @param {object} schema  { body?: {field: {required, type, enum, pattern}}, params?: ..., query?: ... }
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [source, fields] of Object.entries(schema)) {
      const data = req[source] || {};
      for (const [field, rules] of Object.entries(fields)) {
        const value = data[field];

        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`${source}.${field} is required`);
          continue;
        }

        if (value === undefined || value === null) continue;

        if (rules.type && typeof value !== rules.type) {
          errors.push(`${source}.${field} must be of type ${rules.type}`);
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${source}.${field} must be one of: ${rules.enum.join(', ')}`);
        }

        if (rules.pattern && !rules.pattern.test(String(value))) {
          errors.push(`${source}.${field} has invalid format`);
        }

        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${source}.${field} must be >= ${rules.min}`);
        }

        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${source}.${field} must be <= ${rules.max}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors } });
    }
    next();
  };
}

module.exports = validate;
