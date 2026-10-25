const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { pool, testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const roomRoutes = require('./routes/roomRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const foodRoutes = require('./routes/foodRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security & Core Middleware ──
app.use(cors({
  origin: '*', // Allow all origins for dev / local testing
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '.')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate Limiting (Spam & Brute Force Protection) ──
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit login attempts
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes before retrying.' }
});

// ── Health Check Endpoint ──
app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({
      success: true,
      status: 'online',
      message: 'Grand Azure Backend & MySQL Database are connected and healthy.',
      database: process.env.DB_NAME || 'grand_azure_hotel',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      status: 'offline',
      message: `Database connection error: ${err.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// ── Mount API Routes ──
app.use('/api/rooms', roomRoutes);

// Support both singular and plural forms for convenience
app.use('/api/reservations', publicLimiter, reservationRoutes);
app.use('/api/reservation', publicLimiter, reservationRoutes);

app.use('/api', foodRoutes); // Handles /api/menu, /api/orders, /api/food-orders

app.use('/api/contact', publicLimiter, contactRoutes);
app.use('/api/contacts', publicLimiter, contactRoutes);

app.use('/api/admin/login', authLimiter);
app.use('/api/admin', adminRoutes);

// ── 404 Route Handler for undefined endpoints ──
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found.`
  });
});

// ── Centralized Error Handler ──
app.use(errorHandler);

// ── Start Express Server ──
const server = app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`🏨 Grand Azure Hotel & Resort API Server`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📡 Health Check URL:  http://localhost:${PORT}/api/health`);
  console.log('====================================================');

  // Verify database connection at launch
  await testConnection();
});

module.exports = app;
