const express = require('express');
const router = express.Router();
const foodController = require('../controllers/foodController');

// Public Dining API
router.get('/menu', foodController.getMenu);
router.post('/orders', foodController.createOrder);
router.post('/food-orders', foodController.createOrder);
router.post('/food-order', foodController.createOrder);
router.get('/orders/:orderNumber', foodController.trackOrder);
router.get('/food-orders/:orderNumber', foodController.trackOrder);

module.exports = router;
