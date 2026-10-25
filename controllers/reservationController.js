const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { sanitize, isValidEmail, isValidDateString } = require('../middleware/validationMiddleware');

/**
 * Add-on pricing map (Server authoritative)
 */
const ADDON_PRICES = {
  'breakfast': 2500,
  'gourmet breakfast': 2500,
  'airport': 3500,
  'chauffeur airport transfer': 3500,
  'spa': 6000,
  'royal spa session': 6000,
  'candlelight': 8500,
  'candlelight beach dinner': 8500,
  'helicopter': 45000,
  'private helicopter transfer': 45000
};

/**
 * Handle new room reservation
 * POST /api/reservations
 */
async function createReservation(req, res, next) {
  try {
    const body = req.body || {};

    // Extract & sanitize fields
    const firstName = sanitize(body.first_name || '');
    const lastName = sanitize(body.last_name || '');
    const guestName = sanitize(body.guest_name || `${firstName} ${lastName}`.trim());
    const email = sanitize(body.email || body.guest_email || '');
    const phone = sanitize(body.phone || body.guest_phone || '');
    const checkin = sanitize(body.checkin || body.check_in || '');
    const checkout = sanitize(body.checkout || body.check_out || '');
    const roomType = sanitize(body.room_type || 'deluxe');
    const bedType = sanitize(body.bed_type || 'king');
    const adults = parseInt(body.adults, 10) || 1;
    const children = parseInt(body.children, 10) || 0;
    const upiTxnId = sanitize(body.upi_transaction_id || '');
    const paymentMethod = sanitize(body.payment_method || 'upi');
    const specialRequests = sanitize(body.special_requests || '');
    const city = sanitize(body.city || body.nationality || '');
    const state = sanitize(body.state || '');
    const idDocPath = req.file ? req.file.path : null;

    // Parse add-ons
    let addonsStr = body.addons || '';
    if (Array.isArray(addonsStr)) addonsStr = addonsStr.join(', ');

    // 1. Mandatory Validations
    if (!guestName) {
      return res.status(400).json({ success: false, message: 'Guest full name is required.' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required for confirmation.' });
    }
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Contact phone number is required.' });
    }
    if (!checkin || !checkout || !isValidDateString(checkin) || !isValidDateString(checkout)) {
      return res.status(400).json({ success: false, message: 'Valid check-in and check-out dates are required.' });
    }

    const cIn = new Date(checkin);
    const cOut = new Date(checkout);

    if (cOut <= cIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be later than check-in date.'
      });
    }

    // 2. Calculate Nights
    const diffDays = Math.ceil(Math.abs(cOut - cIn) / (1000 * 60 * 60 * 24));
    const nights = Math.max(1, diffDays);

    // 3. Find Room from Database (Server-side price verification)
    const [matchingRooms] = await pool.query(
      'SELECT id, room_number, room_type, type_name, price_per_night, capacity FROM rooms WHERE room_type = ? AND availability_status = "available" ORDER BY room_number ASC',
      [roomType]
    );

    if (matchingRooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Selected room type '${roomType}' is currently not available.`
      });
    }

    const basePricePerNight = parseFloat(matchingRooms[0].price_per_night);

    // 4. Overlapping Booking Prevention: Find an unreserved room of this type
    const [availableRooms] = await pool.query(`
      SELECT r.id, r.room_number FROM rooms r
      WHERE r.room_type = ?
        AND r.availability_status = 'available'
        AND r.id NOT IN (
          SELECT res.room_id FROM reservations res
          WHERE res.room_id IS NOT NULL
            AND res.reservation_status NOT IN ('cancelled')
            AND (res.check_in < ? AND res.check_out > ?)
        )
      LIMIT 1
    `, [roomType, checkout, checkin]);

    if (availableRooms.length === 0) {
      return res.status(409).json({
        success: false,
        message: `No rooms of type '${matchingRooms[0].type_name}' are available for the selected dates (${checkin} to ${checkout}). Please select different dates or an alternate suite.`
      });
    }

    const assignedRoom = availableRooms[0];

    // 5. Calculate authoritative total & advance amounts
    let roomCharges = basePricePerNight * nights;

    // Calculate addon prices
    let addonsTotal = 0;
    if (addonsStr) {
      const selectedList = addonsStr.split(',').map(s => s.trim().toLowerCase());
      for (const item of selectedList) {
        for (const [key, val] of Object.entries(ADDON_PRICES)) {
          if (item.includes(key)) {
            addonsTotal += val;
            break;
          }
        }
      }
    }

    const serverTotalAmount = roomCharges + addonsTotal;
    const serverAdvanceAmount = Math.round(serverTotalAmount * 0.20); // 20% advance

    // 6. Automatically find or create user in users table
    let userId = null;
    const cleanEmail = email.toLowerCase().trim();
    const [existingUsers] = await pool.query(
      'SELECT id, username, full_name, email FROM users WHERE LOWER(email) = ? LIMIT 1',
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
    } else {
      // Generate unique username candidate from email prefix or guest name
      const emailPrefix = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
      const nameClean = firstName ? firstName.toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
      const baseUsername = emailPrefix || nameClean || 'guest';
      let candidateUsername = baseUsername;

      const [uCheck] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [candidateUsername]);
      if (uCheck.length > 0) {
        candidateUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Generate a secure default password hash for the auto-created guest account
      const defaultPassword = `Azure@${Math.floor(100000 + Math.random() * 900000)}`;
      const passwordHash = await bcrypt.hash(defaultPassword, 10);

      const [newUserResult] = await pool.query(`
        INSERT INTO users (
          username, full_name, email, phone, password_hash, role, membership_tier, city, state, trip_purpose
        ) VALUES (?, ?, ?, ?, ?, 'Guest', 'silver', ?, ?, 'Room Reservation')
      `, [
        candidateUsername,
        guestName,
        cleanEmail,
        phone || null,
        passwordHash,
        city || null,
        state || null
      ]);

      userId = newUserResult.insertId;
    }

    // 7. Generate Unique Booking Reference
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingRef = `AZR-${new Date().getFullYear()}-${randomSuffix}`;

    // 8. Save Reservation to Database with linked user_id
    const [result] = await pool.query(`
      INSERT INTO reservations (
        booking_ref, user_id, room_id, guest_name, email, phone,
        check_in, check_out, guests, adults, children,
        room_type, bed_type, addons, total_amount, advance_amount,
        payment_method, payment_status, reservation_status,
        upi_transaction_id, special_requests, id_document_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bookingRef,
      userId,
      assignedRoom.id,
      guestName,
      email,
      phone,
      checkin,
      checkout,
      adults + children,
      adults,
      children,
      roomType,
      bedType,
      addonsStr || 'None',
      serverTotalAmount,
      serverAdvanceAmount,
      paymentMethod,
      'advance_paid',
      'confirmed',
      upiTxnId || null,
      specialRequests || null,
      idDocPath || null
    ]);

    res.status(201).json({
      success: true,
      booking_ref: bookingRef,
      booking_id: result.insertId,
      user_id: userId,
      room_number: assignedRoom.room_number,
      room_type: matchingRooms[0].type_name,
      nights,
      total_amount: serverTotalAmount,
      advance_amount: serverAdvanceAmount,
      message: `Reservation confirmed! Booking Reference: ${bookingRef}. User ID #${userId} linked. Room #${assignedRoom.room_number} reserved.`
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createReservation
};
