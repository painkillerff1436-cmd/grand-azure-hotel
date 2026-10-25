/**
 * Input sanitization & validation middleware for Grand Azure backend
 */

// Simple string sanitizer to prevent stored XSS and remove dangerous tags
function sanitize(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .replace(/[<>]/g, ''); // strip < and >
}

// Email format check
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

// Date validation: YYYY-MM-DD
function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

module.exports = {
  sanitize,
  isValidEmail,
  isValidDateString
};
