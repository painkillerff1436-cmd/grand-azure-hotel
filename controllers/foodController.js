const { pool } = require('../config/db');
const { sanitize } = require('../middleware/validationMiddleware');

/**
 * Get Food Menu from MySQL
 * GET /api/menu
 */
async function getMenu(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id, item_name, description, category, price, image_url, tags, is_available FROM food_menu WHERE is_available = TRUE ORDER BY category, id'
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new Food Order with Transaction
 * POST /api/orders or POST /api/food-orders
 */
async function createOrder(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const body = req.body || {};

    const roomNumber = sanitize(body.room_number || '');
    const guestName = sanitize(body.guest_name || '');
    const guestPhone = sanitize(body.guest_phone || '');
    const guestEmail = sanitize(body.guest_email || '');
    const deliveryType = sanitize(body.delivery_type || 'room');
    const deliveryDate = sanitize(body.delivery_date || 'Today');
    const deliveryTime = sanitize(body.delivery_time || '13:00');
    const covers = parseInt(body.covers, 10) || 1;
    const spiceLevel = parseInt(body.spice_level, 10) || 3;
    const specialInstructions = sanitize(body.special_instructions || '');
    const rawItems = body.items; // can be string summary or array of { item_name, qty }

    if (!roomNumber) {
      return res.status(400).json({ success: false, message: 'Room number is required for in-room delivery.' });
    }
    if (!guestName) {
      return res.status(400).json({ success: false, message: 'Guest name is required.' });
    }

    // Load available menu items from database to verify server-side prices
    const [menuRows] = await connection.query('SELECT id, item_name, price, is_available FROM food_menu');
    const menuMap = new Map();
    menuRows.forEach(m => menuMap.set(m.item_name.toLowerCase(), m));

    let orderItems = [];
    let subtotal = 0;

    if (Array.isArray(body.order_items) && body.order_items.length > 0) {
      for (const it of body.order_items) {
        const menuItem = menuMap.get((it.name || it.item_name || '').toLowerCase());
        const qty = parseInt(it.quantity || it.qty, 10) || 1;
        if (menuItem) {
          const itemTotal = parseFloat(menuItem.price) * qty;
          subtotal += itemTotal;
          orderItems.push({
            menu_item_id: menuItem.id,
            item_name: menuItem.item_name,
            quantity: qty,
            unit_price: parseFloat(menuItem.price),
            subtotal: itemTotal
          });
        }
      }
    } else if (typeof rawItems === 'string' && rawItems.trim()) {
      // Parse summary string: "2x Azure Continental Breakfast (₹1,700); 1x Azure Sunset Mocktail (₹420)"
      const parts = rawItems.split(';');
      for (const p of parts) {
        const match = p.trim().match(/^(\d+)x\s+([^(]+)/);
        if (match) {
          const qty = parseInt(match[1], 10) || 1;
          const name = match[2].trim();
          const menuItem = menuMap.get(name.toLowerCase());
          const unitPrice = menuItem ? parseFloat(menuItem.price) : 500;
          const itemTotal = unitPrice * qty;
          subtotal += itemTotal;
          orderItems.push({
            menu_item_id: menuItem ? menuItem.id : null,
            item_name: menuItem ? menuItem.item_name : name,
            quantity: qty,
            unit_price: unitPrice,
            subtotal: itemTotal
          });
        }
      }
    }

    // Fallback if parsing produced 0 items but total_amount was provided
    if (orderItems.length === 0) {
      const fallbackTotal = parseFloat(body.total_amount) || 1200;
      subtotal = Math.round(fallbackTotal / 1.15);
      orderItems.push({
        menu_item_id: null,
        item_name: rawItems || 'Selected Dining Selection',
        quantity: 1,
        unit_price: subtotal,
        subtotal: subtotal
      });
    }

    // Authoritative Server-side calculations
    const serviceCharge = Math.round(subtotal * 0.10); // 10% Luxury Service
    const taxAmount = Math.round(subtotal * 0.05); // 5% GST
    const finalTotal = subtotal + serviceCharge + taxAmount;

    // Create string summary for quick dashboard rendering
    const itemsSummary = orderItems.map(i => `${i.quantity}x ${i.item_name}`).join(', ');

    // Generate Unique Order Reference
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderNumber = `DINE-${new Date().getFullYear()}-${randomSuffix}`;

    // Execute within MySQL Transaction
    await connection.beginTransaction();

    const [orderResult] = await connection.query(`
      INSERT INTO food_orders (
        order_number, guest_name, room_number, phone, email,
        delivery_type, delivery_date, delivery_time, covers,
        spice_level, special_instructions, items,
        subtotal_amount, service_charge, tax_amount, total_amount, order_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderNumber,
      guestName,
      roomNumber,
      guestPhone || null,
      guestEmail || null,
      deliveryType,
      deliveryDate,
      deliveryTime,
      covers,
      spiceLevel,
      specialInstructions || null,
      itemsSummary,
      subtotal,
      serviceCharge,
      taxAmount,
      finalTotal,
      'preparing'
    ]);

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of orderItems) {
      await connection.query(`
        INSERT INTO food_order_items (order_id, menu_item_id, item_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [orderId, item.menu_item_id, item.item_name, item.quantity, item.unit_price, item.subtotal]);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      order_ref: orderNumber,
      order_number: orderNumber,
      order_id: orderId,
      room_number: roomNumber,
      total_amount: finalTotal,
      estimated_delivery: '30–45 minutes',
      message: `Dining order #${orderNumber} placed with the kitchen! Charged to Room #${roomNumber}.`
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
}

/**
 * Track Order Status
 * GET /api/orders/:orderNumber
 */
async function trackOrder(req, res, next) {
  try {
    const { orderNumber } = req.params;
    const [orders] = await pool.query(
      'SELECT id, order_number, guest_name, room_number, delivery_time, items, total_amount, order_status, created_at FROM food_orders WHERE order_number = ?',
      [orderNumber]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const [items] = await pool.query(
      'SELECT item_name, quantity, unit_price, subtotal FROM food_order_items WHERE order_id = ?',
      [orders[0].id]
    );

    res.json({
      success: true,
      order: orders[0],
      items
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMenu,
  createOrder,
  trackOrder
};
