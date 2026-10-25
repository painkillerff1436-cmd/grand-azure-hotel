const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { sanitize, isValidEmail } = require('../middleware/validationMiddleware');

/**
 * 1. Admin Dashboard Summary Metrics
 * GET /api/admin/dashboard
 */
async function getDashboardStats(req, res, next) {
  try {
    const [[resStats]] = await pool.query(`
      SELECT 
        COUNT(*) AS total_reservations,
        SUM(CASE WHEN reservation_status = 'pending' THEN 1 ELSE 0 END) AS pending_reservations,
        SUM(CASE WHEN reservation_status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed_reservations,
        SUM(CASE WHEN reservation_status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_reservations,
        COALESCE(SUM(CASE WHEN reservation_status != 'cancelled' THEN total_amount ELSE 0 END), 0) AS total_revenue
      FROM reservations
    `);

    const [[orderStats]] = await pool.query(`
      SELECT 
        COUNT(*) AS total_orders,
        SUM(CASE WHEN order_status = 'preparing' THEN 1 ELSE 0 END) AS preparing_orders,
        SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,
        COALESCE(SUM(total_amount), 0) AS dining_revenue
      FROM food_orders
    `);

    const [[memberStats]] = await pool.query(`
      SELECT COUNT(*) AS total_members FROM users WHERE role NOT LIKE '%Admin%'
    `);

    const [[contactStats]] = await pool.query(`
      SELECT COUNT(*) AS total_inquiries FROM contact_messages
    `);

    res.json({
      success: true,
      data: {
        reservations: resStats,
        orders: orderStats,
        members: memberStats.total_members,
        inquiries: contactStats.total_inquiries
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. Get Reservations
 * GET /api/admin/reservations
 */
async function getReservations(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id, booking_ref, user_id, room_id, guest_name,
        email, email AS guest_email,
        phone, phone AS guest_phone,
        check_in, check_in AS checkin,
        check_out, check_out AS checkout,
        guests, adults, children,
        room_type, bed_type, addons,
        total_amount, advance_amount, payment_method, payment_status,
        reservation_status, reservation_status AS status,
        upi_transaction_id, special_requests, created_at
      FROM reservations
      ORDER BY created_at DESC
    `);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. Update Reservation Status
 * PATCH /api/admin/reservations/:id/status or PATCH /api/admin/reservations/:id
 */
async function updateReservationStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const status = sanitize(req.body.status || req.body.reservation_status || '').toLowerCase();

    const allowed = ['confirmed', 'cancelled', 'pending', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}'. Must be one of: ${allowed.join(', ')}`
      });
    }

    const [result] = await pool.query(
      'UPDATE reservations SET reservation_status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Reservation #${id} not found.` });
    }

    res.json({
      success: true,
      message: `Reservation #${id} status updated to '${status}'.`
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. Delete Reservation
 * DELETE /api/admin/reservations/:id
 */
async function deleteReservation(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await pool.query('DELETE FROM reservations WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Reservation #${id} not found.` });
    }

    res.json({ success: true, message: `Reservation #${id} deleted from database.` });
  } catch (err) {
    next(err);
  }
}

/**
 * 5. Get Food Orders
 * GET /api/admin/orders or GET /api/admin/food-orders
 */
async function getFoodOrders(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id, order_number, order_number AS order_ref,
        guest_name, room_number,
        phone, phone AS guest_phone,
        email, email AS guest_email,
        delivery_type, delivery_date, delivery_time,
        covers, spice_level, special_instructions,
        items, subtotal_amount, service_charge, tax_amount,
        total_amount,
        order_status, order_status AS status,
        created_at
      FROM food_orders
      ORDER BY created_at DESC
    `);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * 6. Update Food Order Status
 * PATCH /api/admin/orders/:id/status or PATCH /api/admin/food-orders/:id
 */
async function updateFoodOrderStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const status = sanitize(req.body.status || req.body.order_status || '').toLowerCase();

    const allowed = ['preparing', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid order status. Allowed: ${allowed.join(', ')}`
      });
    }

    const [result] = await pool.query(
      'UPDATE food_orders SET order_status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Order #${id} not found.` });
    }

    res.json({ success: true, message: `Order #${id} marked as '${status}'.` });
  } catch (err) {
    next(err);
  }
}

/**
 * 7. Delete Food Order
 * DELETE /api/admin/orders/:id or DELETE /api/admin/food-orders/:id
 */
async function deleteFoodOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await pool.query('DELETE FROM food_orders WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Order #${id} not found.` });
    }

    res.json({ success: true, message: `Food order #${id} deleted from database.` });
  } catch (err) {
    next(err);
  }
}

/**
 * 8. Get Contact Messages
 * GET /api/admin/contacts
 */
async function getContacts(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id, name, email, phone, country,
        subject, subject AS inquiry_type,
        department, department AS inquiry_dept,
        message, estimated_guests, checkin_date, checkout_date,
        newsletter_opt, created_at
      FROM contact_messages
      ORDER BY created_at DESC
    `);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * 9. Get Loyalty Members
 * GET /api/admin/members
 */
async function getMembers(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id, full_name, username, email, phone,
        SUBSTRING_INDEX(full_name, ' ', 1) AS firstname,
        CASE WHEN INSTR(full_name, ' ') > 0 THEN SUBSTRING(full_name, INSTR(full_name, ' ') + 1) ELSE '' END AS lastname,
        city, state, membership_tier, trip_purpose, created_at
      FROM users
      WHERE role NOT LIKE '%Admin%'
      ORDER BY created_at DESC
    `);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * 10. Delete Member
 * DELETE /api/admin/members/:id
 */
async function deleteMember(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await pool.query('DELETE FROM users WHERE id = ? AND role NOT LIKE "%Admin%"', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Member #${id} not found.` });
    }

    res.json({ success: true, message: `Member #${id} removed from database.` });
  } catch (err) {
    next(err);
  }
}

/**
 * 11. Get Admin Users
 * GET /api/admin/users
 */
async function getAdminUsers(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT id, username, full_name, email, role, created_at
      FROM users
      WHERE role LIKE '%Admin%'
      ORDER BY id ASC
    `);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * 12. Create New Admin User
 * POST /api/admin/create-user
 */
async function createAdminUser(req, res, next) {
  try {
    const { username, password, role = 'Administrator', full_name, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check if username exists
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: `Username '${username}' is already in use.` });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const adminName = full_name || `${username.charAt(0).toUpperCase() + username.slice(1)} (Admin)`;
    const adminEmail = email || `${username.toLowerCase()}@grandazure.com`;

    const [result] = await pool.query(`
      INSERT INTO users (username, full_name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?)
    `, [username.trim(), adminName, adminEmail, hash, role]);

    res.status(201).json({
      success: true,
      user_id: result.insertId,
      message: `Admin user '${username}' created successfully.`
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 13. Change Admin Password
 * PATCH /api/admin/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { username, current_password, new_password } = req.body;

    if (!username || !current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Username, current password, and new password are required.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const [rows] = await pool.query('SELECT id, password_hash FROM users WHERE username = ?', [username.trim()]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Admin user '${username}' not found.` });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);

    res.json({ success: true, message: `Password for '${username}' updated successfully.` });
  } catch (err) {
    next(err);
  }
}

/**
 * 14. Delete Admin User
 * DELETE /api/admin/users/:id
 */
async function deleteAdminUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);

    // Prevent deleting last admin
    const [[adminCount]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role LIKE '%Admin%'");
    if (adminCount.total <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the only remaining administrator account.'
      });
    }

    const [result] = await pool.query('DELETE FROM users WHERE id = ? AND role LIKE "%Admin%"', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: `Admin account #${id} not found.` });
    }

    res.json({ success: true, message: `Admin user #${id} deleted.` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getReservations,
  updateReservationStatus,
  deleteReservation,
  getFoodOrders,
  updateFoodOrderStatus,
  deleteFoodOrder,
  getContacts,
  getMembers,
  deleteMember,
  getAdminUsers,
  createAdminUser,
  changePassword,
  deleteAdminUser
};
