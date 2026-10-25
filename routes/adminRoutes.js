const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// ── Public Admin Authentication ──
router.post('/login', authController.adminLogin);

// ── Protected Administrator Routes ──
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard Metrics
router.get('/dashboard', adminController.getDashboardStats);

// Reservations
router.get('/reservations', adminController.getReservations);
router.patch('/reservations/:id/status', adminController.updateReservationStatus);
router.patch('/reservations/:id', adminController.updateReservationStatus);
router.delete('/reservations/:id', adminController.deleteReservation);

// Dining Orders
router.get('/orders', adminController.getFoodOrders);
router.get('/food-orders', adminController.getFoodOrders);
router.patch('/orders/:id/status', adminController.updateFoodOrderStatus);
router.patch('/food-orders/:id', adminController.updateFoodOrderStatus);
router.delete('/orders/:id', adminController.deleteFoodOrder);
router.delete('/food-orders/:id', adminController.deleteFoodOrder);

// Contact Inquiries
router.get('/contacts', adminController.getContacts);

// Members
router.get('/members', adminController.getMembers);
router.delete('/members/:id', adminController.deleteMember);

// Administrator User Management
router.get('/users', adminController.getAdminUsers);
router.post('/create-user', adminController.createAdminUser);
router.patch('/change-password', adminController.changePassword);
router.delete('/users/:id', adminController.deleteAdminUser);

module.exports = router;
