const { pool } = require('../config/db');
const { sanitize, isValidEmail } = require('../middleware/validationMiddleware');

/**
 * Handle new customer inquiry / contact form submission
 * POST /api/contact or POST /api/contacts
 */
async function submitContact(req, res, next) {
  try {
    const body = req.body || {};

    const name = sanitize(body.name || body.contact_name || '');
    const email = sanitize(body.email || body.contact_email || '');
    const phone = sanitize(body.phone || body.contact_phone || '');
    const country = sanitize(body.country || body.contact_country || '');
    const subject = sanitize(body.subject || body.inquiry_type || 'General Inquiry');
    const department = sanitize(body.department || body.inquiry_type || 'General Concierge');
    const message = sanitize(body.message || body.contact_message || '');
    const estimatedGuests = parseInt(body.estimated_guests, 10) || null;
    const checkinDate = body.checkin_date || null;
    const checkoutDate = body.checkout_date || null;
    const newsletterOpt = body.newsletter_opt === 'true' || body.newsletter_opt === true || body.newsletter_opt === '1';

    // 1. Validations
    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide your full name.' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (!message || message.length < 5) {
      return res.status(400).json({ success: false, message: 'Inquiry message must be at least 5 characters.' });
    }

    // 2. Insert into MySQL
    const [result] = await pool.query(`
      INSERT INTO contact_messages (
        name, email, phone, country, subject, department,
        message, estimated_guests, checkin_date, checkout_date, newsletter_opt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      email,
      phone || null,
      country || null,
      subject,
      department,
      message,
      estimatedGuests,
      checkinDate,
      checkoutDate,
      newsletterOpt ? 1 : 0
    ]);

    res.status(201).json({
      success: true,
      inquiry_id: result.insertId,
      message: 'Thank you! Your inquiry has been received by our luxury concierge team. A dedicated guest services manager will contact you within 2 hours.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitContact
};
