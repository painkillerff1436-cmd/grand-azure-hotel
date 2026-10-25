-- ============================================================
-- GRAND AZURE HOTEL — RESERVATION DATABASE CODE (NO SAMPLE BOOKINGS)
-- ============================================================
select * from reservations;
CREATE DATABASE IF NOT EXISTS grand_azure_hotel
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE grand_azure_hotel;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS rooms;

-- ------------------------------------------------------------
-- 1. ROOMS TABLE (அறைகளின் விபரம் & வாடகை)
-- ------------------------------------------------------------
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
-- 2. RESERVATIONS TABLE (முன்பதிவுகள் சேமிக்கும் அட்டவணை - EMPTY)
-- ------------------------------------------------------------
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
  CONSTRAINT fk_res_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  INDEX idx_res_dates (check_in, check_out),
  INDEX idx_res_status (reservation_status),
  INDEX idx_res_guest (guest_name, email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


-- ------------------------------------------------------------
-- 3. HOTEL ROOMS ONLY (Website-ல் Book செய்ய தேவையான ரூம்கள் மட்டும்)
-- ------------------------------------------------------------
INSERT INTO rooms (room_number, room_type, type_name, description, price_per_night, capacity, availability_status) VALUES
('101', 'deluxe', 'Deluxe Room', 'Elegantly furnished luxury room with plush king bedding, marble bath, and garden patio.', 8500.00, 2, 'available'),
('102', 'deluxe', 'Deluxe Room', 'Elegantly furnished luxury room with twin bedding, rainforest shower, and private balcony.', 8500.00, 2, 'available'),
('103', 'deluxe_garden', 'Deluxe Garden Villa', 'Secluded tropical garden suite with outdoor soaking tub and private deck.', 7200.00, 2, 'available'),
('104', 'deluxe_garden', 'Deluxe Garden Villa', 'Serene garden sanctuary with artisanal timber architecture and private gazebo.', 7200.00, 2, 'available'),
('201', 'executive', 'Executive Suite', 'Spacious dual-room suite with private ocean-view balcony and personal bar.', 14000.00, 3, 'available'),
('202', 'executive', 'Executive Suite', 'Executive corner suite featuring panoramic coastal views and luxury lounge.', 14000.00, 3, 'available'),
('301', 'suite', 'Grand Suite', 'Palatial suite with private living room, dining salon, and luxury jacuzzi.', 22000.00, 4, 'available'),
('401', 'ocean', 'Ocean Villa', 'Overwater coastal villa with private infinity plunge pool and sunset deck.', 28000.00, 4, 'available'),
('501', 'penthouse', 'Penthouse', 'Royal Imperial Penthouse with 360-degree Arabian Sea panorama and butler service.', 38000.00, 4, 'available')
ON DUPLICATE KEY UPDATE id=id;

USE grand_azure_hotel;

-- 1. All Bookings / Reservations view panna:
SELECT id, booking_ref, guest_name, email, phone, check_in, check_out, room_type, total_amount, reservation_status 
FROM reservations 
ORDER BY id DESC;

-- 2. All Registered Users / Guests view panna:
SELECT id, username, full_name, email, phone, role, membership_tier, created_at 
FROM users 
ORDER BY id DESC;
