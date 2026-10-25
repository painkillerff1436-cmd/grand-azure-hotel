const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'grand_azure_super_secret_jwt_key_2026_secured!';

/**
 * Authentication middleware to verify JWT token in Authorization header
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired authentication token. Please sign in again.'
    });
  }
}

/**
 * Role-based authorization middleware for Administrator routes
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const role = (req.user.role || '').toLowerCase();
  if (role.includes('admin')) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden. Administrator privileges required for this action.'
  });
}

module.exports = {
  authenticateToken,
  requireAdmin,
  JWT_SECRET
};
