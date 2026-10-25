const { pool } = require('../config/db');

/**
 * Get all room categories and pricing
 * GET /api/rooms
 */
async function getRooms(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, room_number, room_type, type_name, description, price_per_night, capacity, availability_status FROM rooms ORDER BY price_per_night ASC'
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * Check room availability for specific dates & guest requirements
 * GET /api/rooms/availability
 */
async function checkAvailability(req, res, next) {
  try {
    const { checkin, checkout, room_type = 'any', guests = 1 } = req.query;

    if (!checkin || !checkout) {
      return res.status(400).json({
        success: false,
        message: 'Both check-in and check-out dates are required to check availability.'
      });
    }

    const cIn = new Date(checkin);
    const cOut = new Date(checkout);

    if (isNaN(cIn.getTime()) || isNaN(cOut.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format. Expected YYYY-MM-DD.' });
    }

    if (cOut <= cIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be at least one day after check-in date.'
      });
    }

    const guestCount = parseInt(guests, 10) || 1;
    const roomTypeFilter = (room_type === 'any' || !room_type) ? null : room_type;

    // Calculate total nights
    const diffTime = Math.abs(cOut - cIn);
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Find available rooms that don't conflict with confirmed/pending bookings
    let sql = `
      SELECT r.id, r.room_number, r.room_type, r.type_name, r.description,
             r.price_per_night, r.capacity, (r.price_per_night * ?) AS total_for_stay
      FROM rooms r
      WHERE r.availability_status = 'available'
        AND r.capacity >= ?
    `;
    const params = [nights, guestCount];

    if (roomTypeFilter) {
      sql += ` AND r.room_type = ?`;
      params.push(roomTypeFilter);
    }

    // Exclude rooms booked for overlapping date ranges
    sql += `
      AND r.id NOT IN (
        SELECT res.room_id FROM reservations res
        WHERE res.room_id IS NOT NULL
          AND res.reservation_status NOT IN ('cancelled')
          AND (res.check_in < ? AND res.check_out > ?)
      )
      ORDER BY r.price_per_night ASC
    `;
    params.push(checkout, checkin);

    const [availableRooms] = await pool.query(sql, params);

    res.json({
      success: true,
      nights,
      checkin,
      checkout,
      guests: guestCount,
      room_type: room_type,
      available_count: availableRooms.length,
      available_rooms: availableRooms,
      message: availableRooms.length > 0
        ? `${availableRooms.length} luxury accommodation(s) available for your selected dates.`
        : 'No rooms of this category are available for the selected dates. Please adjust dates or select another suite.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRooms,
  checkAvailability
};
