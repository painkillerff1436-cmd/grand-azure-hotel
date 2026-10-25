-- ============================================================
-- GRAND AZURE HOTEL & RESORT — MySQL Database Schema
-- Database Name: grand_azure_hotel
-- Compatible with MySQL 8.0+ / MySQL Workbench
-- ============================================================

CREATE DATABASE IF NOT EXISTS grand_azure_hotel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE grand_azure_hotel;

-- Disable foreign key checks during table setup
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all existing views and tables in safe order to avoid constraint conflicts
DROP VIEW IF EXISTS admin_users;
DROP VIEW IF EXISTS members;
DROP TABLE IF EXISTS food_order_items;
DROP TABLE IF EXISTS food_orders;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS food_menu;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

-- ------------------------------------------------------------
-- 1. USERS & ADMINISTRATORS TABLE
-- ------------------------------------------------------------
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(50) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'Guest', -- 'Guest', 'Member', 'Admin', 'Super Administrator'
  membership_tier ENUM('silver', 'gold', 'platinum') DEFAULT 'silver',
  city VARCHAR(100) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  trip_purpose VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_role (role),
  INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. ROOMS TABLE
-- ------------------------------------------------------------
DROP TABLE IF EXISTS rooms;
CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_number VARCHAR(20) NOT NULL UNIQUE,
  room_type VARCHAR(50) NOT NULL, -- 'deluxe', 'deluxe_garden', 'executive', 'suite', 'ocean', 'penthouse'
  type_name VARCHAR(100) NOT NULL,
  description TEXT,
  price_per_night DECIMAL(10,2) NOT NULL,
  capacity INT NOT NULL DEFAULT 2,
  availability_status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room_type (room_type),
  INDEX idx_room_status (availability_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. RESERVATIONS TABLE
-- ------------------------------------------------------------
DROP TABLE IF EXISTS reservations;
CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_ref VARCHAR(50) NOT NULL UNIQUE,
  user_id INT DEFAULT NULL,
  room_id INT DEFAULT NULL,
  guest_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT NOT NULL DEFAULT 1,
  adults INT NOT NULL DEFAULT 1,
  children INT NOT NULL DEFAULT 0,
  room_type VARCHAR(50) NOT NULL,
  bed_type VARCHAR(50) DEFAULT 'king',
  addons TEXT DEFAULT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  advance_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(50) DEFAULT 'upi',
  payment_status ENUM('unpaid', 'advance_paid', 'paid', 'refunded') DEFAULT 'advance_paid',
  reservation_status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
  upi_transaction_id VARCHAR(100) DEFAULT NULL,
  special_requests TEXT DEFAULT NULL,
  id_document_path VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_res_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_res_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  INDEX idx_res_dates (check_in, check_out),
  INDEX idx_res_status (reservation_status),
  INDEX idx_res_guest (guest_name, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. FOOD MENU TABLE
-- ------------------------------------------------------------
DROP TABLE IF EXISTS food_menu;
CREATE TABLE food_menu (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(150) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'breakfast', 'starters', 'mains', 'desserts', 'beverages'
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  tags VARCHAR(100) DEFAULT NULL, -- 'Veg', 'Non-Veg', "Chef's Special"
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_menu_cat (category),
  INDEX idx_menu_avail (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 5. FOOD ORDERS TABLE
-- ------------------------------------------------------------
DROP TABLE IF EXISTS food_orders;
CREATE TABLE food_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  guest_name VARCHAR(150) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  email VARCHAR(150) DEFAULT NULL,
  delivery_type VARCHAR(50) DEFAULT 'room',
  delivery_date VARCHAR(50) DEFAULT NULL,
  delivery_time VARCHAR(50) DEFAULT NULL,
  covers INT DEFAULT 1,
  spice_level INT DEFAULT 3,
  special_instructions TEXT DEFAULT NULL,
  items TEXT NOT NULL,
  subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  service_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  order_status ENUM('preparing', 'delivered', 'cancelled') DEFAULT 'preparing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_status (order_status),
  INDEX idx_order_room (room_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 6. FOOD ORDER ITEMS TABLE
-- ------------------------------------------------------------
DROP TABLE IF EXISTS food_order_items;
CREATE TABLE food_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT DEFAULT NULL,
  item_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES food_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_item_menu FOREIGN KEY (menu_item_id) REFERENCES food_menu(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 7. CONTACT MESSAGES TABLE
-- ------------------------------------------------------------
DROP TABLE IF EXISTS contact_messages;
CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  country VARCHAR(100) DEFAULT NULL,
  subject VARCHAR(150) DEFAULT NULL,
  department VARCHAR(100) DEFAULT 'General',
  message TEXT NOT NULL,
  estimated_guests INT DEFAULT NULL,
  checkin_date DATE DEFAULT NULL,
  checkout_date DATE DEFAULT NULL,
  newsletter_opt BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 8. COMPATIBILITY VIEWS
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW admin_users AS
  SELECT id, username, full_name, email, password_hash, role, created_at
  FROM users
  WHERE role LIKE '%Admin%';

CREATE OR REPLACE VIEW members AS
  SELECT id, full_name, username, email, phone, city, state, membership_tier, trip_purpose, created_at
  FROM users
  WHERE role NOT LIKE '%Admin%';

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- INITIAL SAMPLE DATA SEEDING
-- ============================================================

-- Seed Default Admin & Sample Loyalty Members
-- Default password for 'admin' is 'admin123' (bcrypt hashed)
INSERT INTO users (username, full_name, email, phone, password_hash, role, membership_tier, city, state, trip_purpose) VALUES
('admin', 'Super Administrator', 'concierge@grandazure.com', '+91 484 288 9000', '$2b$10$FTs7MvEaHXok7yEW5ht8rOnn/BlLFMFFZzlekTQyOpuzrWSwT3RTq', 'Super Administrator', 'platinum', 'Kochi', 'Kerala', 'Resort Management'),
('arthur_p', 'Lord Arthur Pendelton', 'arthur@pendelton-estates.com', '+44 20 7946 0912', '$2b$10$FTs7MvEaHXok7yEW5ht8rOnn/BlLFMFFZzlekTQyOpuzrWSwT3RTq', 'Loyalty Member', 'platinum', 'London', 'Greater London', 'Luxury Retreat & Yachting'),
('priyanka_k', 'Priyanka Kapoor', 'priyanka.k@mumbai-tech.io', '+91 99887 76655', '$2b$10$FTs7MvEaHXok7yEW5ht8rOnn/BlLFMFFZzlekTQyOpuzrWSwT3RTq', 'Loyalty Member', 'gold', 'Mumbai', 'Maharashtra', 'Culinary Vacation')
ON DUPLICATE KEY UPDATE id=id;

-- Seed Hotel Rooms
INSERT INTO rooms (room_number, room_type, type_name, description, price_per_night, capacity, availability_status) VALUES
('101', 'deluxe', 'Deluxe Room', 'Elegantly furnished luxury room with plush king bedding, marble bath, and garden patio.', 8500.00, 2, 'available'),
('102', 'deluxe', 'Deluxe Room', 'Elegantly furnished luxury room with twin bedding, rainforest shower, and private balcony.', 8500.00, 2, 'available'),
('103', 'deluxe_garden', 'Deluxe Garden Villa', 'Secluded tropical garden suite with outdoor soaking tub and private deck.', 7200.00, 2, 'available'),
('104', 'deluxe_garden', 'Deluxe Garden Villa', 'Serene garden sanctuary with artisanal timber architecture and private gazebo.', 7200.00, 2, 'available'),
('201', 'executive', 'Executive Suite', 'Spacious dual-room suite with private ocean-view balcony and personal bar.', 14000.00, 3, 'available'),
('202', 'executive', 'Executive Suite', 'Executive corner suite featuring panoramic coastal views and luxury lounge.', 14000.00, 3, 'available'),
('301', 'suite', 'Grand Suite', 'Palatial suite with private living room, dining salon, and luxury jacuzzi.', 22000.00, 4, 'available'),
('401', 'ocean', 'Ocean Villa', 'Overwater coastal villa with private infinity plunge pool and sunset deck.', 28000.00, 4, 'available'),
('501', 'penthouse', 'Penthouse', 'The crown jewel: Royal Imperial Penthouse with 360-degree Arabian Sea panorama and butler service.', 38000.00, 4, 'available')
ON DUPLICATE KEY UPDATE id=id;

-- Seed Food Menu Items
INSERT INTO food_menu (item_name, description, category, price, image_url, tags, is_available) VALUES
('Azure Continental Breakfast', 'Freshly baked croissants, assorted jams, seasonal fruit platter, orange juice & choice of coffee or tea.', 'breakfast', 850.00, 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80', 'Veg', 1),
('South Indian Breakfast Thali', 'Idli, vada, dosa with sambar and 4 varieties of fresh chutneys, filter coffee.', 'breakfast', 650.00, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80', 'Veg, Chef\'s Special', 1),
('Malabar Prawn Cocktail', 'Tiger prawns poached in citrus court-bouillon, avocado mousse, spiced Marie Rose drizzle.', 'starters', 1200.00, 'https://images.unsplash.com/photo-1576107232684-1279f718c8f7?w=400&q=80', 'Non-Veg', 1),
('Tandoori Paneer Tikka', 'Charcoal-roasted cottage cheese cubes marinated in Kashmiri chili and organic hung curd with mint relish.', 'starters', 780.00, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&q=80', 'Veg', 1),
('Kerala Karimeen Pollichathu', 'Pearl spot fish wrapped in banana leaf with shallots, crushed ginger and coastal spices, steamed to perfection.', 'mains', 1650.00, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80', 'Non-Veg, Chef\'s Special', 1),
('Signature Dal Makhani', 'Black lentils slow-cooked for 36 hours over tandoor with fresh butter and organic cream, served with butter naan.', 'mains', 920.00, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80', 'Veg', 1),
('Grilled Arabian Sea Lobster', 'Whole lobster basted in garlic herb butter, saffron-infused risotto, roasted asparagus.', 'mains', 3800.00, 'https://images.unsplash.com/photo-1559742811-822873691df8?w=400&q=80', 'Non-Veg', 1),
('Mango Saffron Panna Cotta', 'Silky Alphonso mango cream, edible gold leaf, roasted pistachio brittle.', 'desserts', 680.00, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80', 'Veg', 1),
('Azure Sunset Mocktail', 'Blood orange, passion fruit purée, sparkling coconut water, fresh mint & rosemary sprig.', 'beverages', 420.00, 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400&q=80', 'Veg', 1)
ON DUPLICATE KEY UPDATE id=id;

-- Seed Sample Reservations
INSERT INTO reservations (booking_ref, guest_name, email, phone, check_in, check_out, guests, adults, room_type, addons, total_amount, advance_amount, payment_status, reservation_status) VALUES
('AZR-2026-001', 'Lady Eleanor Vance', 'eleanor@vance-holdings.co.uk', '+44 7911 123456', '2026-11-10', '2026-11-15', 2, 2, 'penthouse', 'Private Helicopter, Royal Spa', 190000.00, 38000.00, 'advance_paid', 'confirmed'),
('AZR-2026-002', 'Dr. Vikramaditya Singhania', 'singhania@heritage-foundation.org', '+91 98201 54321', '2026-11-20', '2026-11-23', 2, 2, 'ocean', 'Gourmet Breakfast', 84000.00, 16800.00, 'advance_paid', 'pending')
ON DUPLICATE KEY UPDATE id=id;

-- Seed Sample Food Order
INSERT INTO food_orders (order_number, guest_name, room_number, phone, email, delivery_type, delivery_date, delivery_time, items, subtotal_amount, service_charge, tax_amount, total_amount, order_status) VALUES
('DINE-2026-101', 'Lady Eleanor Vance', '501', '+44 7911 123456', 'eleanor@vance-holdings.co.uk', 'room', 'Today', '20:00', '1x Grilled Arabian Sea Lobster (₹3,800); 2x Azure Sunset Mocktail (₹840)', 4640.00, 464.00, 232.00, 5336.00, 'preparing')
ON DUPLICATE KEY UPDATE id=id;

-- Seed Sample Contact Inquiry
INSERT INTO contact_messages (name, email, phone, country, subject, department, message) VALUES
('Countess Beatrix', 'beatrix@vienna-arts.at', '+43 1 2345678', 'Austria', 'Private Helipad Reservation', 'Concierge & VIP', 'Requesting confirmation for private helipad touchdown and chauffeur greeting at 14:00 hrs.')
ON DUPLICATE KEY UPDATE id=id;
