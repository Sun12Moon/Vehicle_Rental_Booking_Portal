-- Vehicle Rental Booking Portal
-- Seed Data for MySQL 8.x

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLES
INSERT INTO roles (role_id, role_name, description, created_at, updated_at) VALUES
(1, 'ADMIN', 'System Administrator with full access to vehicles, bookings, customers, and reports', NOW(), NOW()),
(2, 'CUSTOMER', 'Registered Customer able to search vehicles, create bookings, and view history', NOW(), NOW())
ON DUPLICATE KEY UPDATE role_name=VALUES(role_name);

-- 2. USERS (Passwords: Admin@123 and Customer@123)
INSERT INTO users (user_id, role_id, email, password_hash, is_active, status, email_verified, last_login, created_at, updated_at) VALUES
(1, 1, 'admin@rentivo.in', '$2b$10$CYUabm3pBoxdwoKMH6DaMeZBBKyi/PDSSt0n/yhWltkpLjdlo62Ra', TRUE, 'ACTIVE', TRUE, NOW(), NOW(), NOW()),
(2, 2, 'aditi.menon@example.com', '$2b$10$oY7tM/DtY3o6sqHg4DGcGev.mFRrplV0jPk0VdGNqrTeI.BWRUY4q', TRUE, 'ACTIVE', TRUE, NOW(), NOW(), NOW()),
(3, 2, 'rohan.shah@example.com', '$2b$10$oY7tM/DtY3o6sqHg4DGcGev.mFRrplV0jPk0VdGNqrTeI.BWRUY4q', TRUE, 'ACTIVE', TRUE, NOW(), NOW(), NOW()),
(4, 2, 'nisha.iyer@example.com', '$2b$10$oY7tM/DtY3o6sqHg4DGcGev.mFRrplV0jPk0VdGNqrTeI.BWRUY4q', TRUE, 'INACTIVE', TRUE, NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE email=VALUES(email);

-- 3. CUSTOMER PROFILES
INSERT INTO customer_profiles (customer_id, user_id, first_name, last_name, gender, date_of_birth, phone, alternate_phone, driving_license_no, license_expiry, aadhaar_number, address, city, state, country, postal_code, emergency_contact_name, emergency_contact_phone, profile_image, created_at, updated_at) VALUES
(1, 1, 'Admin', 'Manager', 'Other', '1990-01-01', '+91 99000 00000', NULL, 'DL-ADMIN-001', '2032-01-01', '123456789012', 'Rentivo HQ, MG Road', 'Bengaluru', 'Karnataka', 'India', '560001', 'Rentivo Operations', '+91 1800 234 7864', NULL, NOW(), NOW()),
(2, 2, 'Aditi', 'Menon', 'Female', '1995-05-14', '+91 98452 18203', NULL, 'KA01 20150012345', '2032-05-14', '987654321012', '14, Indiranagar', 'Bengaluru', 'Karnataka', 'India', '560038', 'Arjun Menon', '+91 98765 44321', NULL, NOW(), NOW()),
(3, 3, 'Rohan', 'Shah', 'Male', '1992-08-22', '+91 99872 55711', NULL, 'MH02 20170098765', '2031-08-22', '456789012345', '72, Koramangala', 'Bengaluru', 'Karnataka', 'India', '560034', 'Pooja Shah', '+91 99872 55700', NULL, NOW(), NOW()),
(4, 4, 'Nisha', 'Iyer', 'Female', '1998-11-03', '+91 98203 66422', NULL, 'KA05 20200054321', '2035-11-03', '345678901234', '18, Agrahara', 'Mysuru', 'Karnataka', 'India', '570001', 'Kavita Iyer', '+91 98203 66400', NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE phone=VALUES(phone);

-- 4. VEHICLE CATEGORIES
INSERT INTO vehicle_categories (category_id, category_name, description, seating_capacity, created_at, updated_at) VALUES
(1, 'Hatchback', 'Nimble, smart city companions with great fuel efficiency.', 5, NOW(), NOW()),
(2, 'Sedan', 'Comfort and sophistication for work and highway weekends.', 5, NOW(), NOW()),
(3, 'SUV', 'Spacious cabin, high ground clearance, and confident road presence.', 7, NOW(), NOW()),
(4, 'Luxury', 'Elevated travel experience, beautifully appointed interior.', 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE category_name=VALUES(category_name);

-- 5. BRANCHES
INSERT INTO branches (branch_id, branch_name, address, city, state, postal_code, phone, created_at, updated_at) VALUES
(1, 'Bengaluru Airport', 'Kempegowda International Airport Road, Devanahalli', 'Bengaluru', 'Karnataka', '560300', '+91 80 4020 8877', NOW(), NOW()),
(2, 'Indiranagar, Bengaluru', '100 Feet Road, Indiranagar', 'Bengaluru', 'Karnataka', '560038', '+91 80 4020 8899', NOW(), NOW()),
(3, 'Mysuru Central', 'Sayyaji Rao Road, Agrahara', 'Mysuru', 'Karnataka', '570001', '+91 821 442 1212', NOW(), NOW())
ON DUPLICATE KEY UPDATE branch_name=VALUES(branch_name);

-- 6. VEHICLES
INSERT INTO vehicles (vehicle_id, category_id, branch_id, registration_number, brand, model, variant, manufacture_year, color, fuel_type, transmission, engine_capacity, seating_capacity, mileage, daily_rent, security_deposit, status, image_url, chassis_number, insurance_number, insurance_expiry, pollution_expiry, last_service_date, next_service_date, current_odometer, description, created_at, updated_at) VALUES
(1, 3, 1, 'KA-01-MJ-2024', 'Mahindra', 'XUV700', 'AX7 Luxury', 2024, 'Everest White', 'PETROL', 'AUTOMATIC', '2.0L Turbo', 7, 13.00, 4200.00, 10000.00, 'AVAILABLE', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85', 'CHAS-XUV-001', 'INS-772183', '2027-01-15', '2027-01-15', '2026-06-10', '2026-12-10', 12400, 'A refined seven-seat SUV with confident performance, a panoramic cabin and premium safety technology.', NOW(), NOW()),
(2, 2, 2, 'KA-03-NV-5120', 'Hyundai', 'Verna', 'SX(O) Turbo', 2024, 'Abyss Black', 'PETROL', 'AUTOMATIC', '1.5L Turbo', 5, 18.00, 2900.00, 7500.00, 'AVAILABLE', 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=85', 'CHAS-VRN-002', 'INS-449102', '2027-03-20', '2027-03-20', '2026-07-01', '2027-01-01', 9800, 'A contemporary sedan that makes every intercity drive smooth, connected and comfortably composed.', NOW(), NOW()),
(3, 3, 1, 'KA-04-EV-9011', 'Tata', 'Nexon EV', 'Empowered+', 2024, 'Pristine White', 'ELECTRIC', 'AUTOMATIC', '40.5 kWh', 5, 465.00, 3400.00, 9000.00, 'AVAILABLE', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=85', 'CHAS-NEX-003', 'INS-882031', '2027-04-10', '2027-04-10', '2026-05-15', '2026-11-15', 14200, 'A quiet, capable electric SUV for sustainable city breaks and effortless daily errands.', NOW(), NOW()),
(4, 1, 3, 'KA-09-BL-3341', 'Maruti Suzuki', 'Baleno', 'Alpha AGS', 2023, 'Nexa Blue', 'PETROL', 'AUTOMATIC', '1.2L', 5, 22.00, 1900.00, 5000.00, 'AVAILABLE', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85', 'CHAS-BAL-004', 'INS-110293', '2026-11-05', '2026-11-05', '2026-08-01', '2027-02-01', 21300, 'An easy-to-drive hatchback with plenty of room, ideal for quick getaways and city plans.', NOW(), NOW()),
(5, 3, 1, 'KA-01-IN-7809', 'Toyota', 'Innova Crysta', 'ZX AT', 2023, 'Silver', 'DIESEL', 'AUTOMATIC', '2.4L', 7, 15.00, 4800.00, 12000.00, 'RENTED', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=85', 'CHAS-INN-005', 'INS-556104', '2026-12-18', '2026-12-18', '2026-08-12', '2027-02-12', 32108, 'The trusted people-mover for family holidays, airport transfers and long highway runs.', NOW(), NOW()),
(6, 2, 2, 'KA-03-HC-4412', 'Honda', 'City', 'ZX CVT', 2024, 'Platinum White', 'PETROL', 'AUTOMATIC', '1.5L', 5, 18.00, 3100.00, 8000.00, 'MAINTENANCE', 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=85', 'CHAS-CTY-006', 'INS-990142', '2027-02-01', '2027-02-01', '2026-08-30', '2027-02-28', 18420, 'A polished sedan with exceptional rear-seat comfort and a reassuring highway character.', NOW(), NOW())
ON DUPLICATE KEY UPDATE registration_number=VALUES(registration_number);

-- 7. VEHICLE IMAGES
INSERT INTO vehicle_images (image_id, vehicle_id, image_url, is_primary, uploaded_at) VALUES
(1, 1, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85', TRUE, NOW()),
(2, 1, 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=85', FALSE, NOW()),
(3, 2, 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=85', TRUE, NOW()),
(4, 2, 'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1200&q=85', FALSE, NOW()),
(5, 3, 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=85', TRUE, NOW()),
(6, 4, 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85', TRUE, NOW()),
(7, 5, 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=85', TRUE, NOW()),
(8, 6, 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=85', TRUE, NOW())
ON DUPLICATE KEY UPDATE image_url=VALUES(image_url);

-- 8. BOOKINGS
INSERT INTO bookings (booking_id, customer_id, vehicle_id, booking_reference, booking_date, pickup_date, return_date, actual_pickup, actual_return, pickup_location, return_location, booking_status, total_days, daily_rent, security_deposit, discount, tax, total_amount, cancellation_reason, cancelled_at, remarks, created_at, updated_at) VALUES
(1, 2, 1, 'RNT-628491', '2026-09-01 10:00:00', '2026-09-04', '2026-09-07', NULL, NULL, 'Bengaluru Airport', 'Bengaluru Airport', 'CONFIRMED', 3, 4200.00, 10000.00, 0.00, 2268.00, 24868.00, NULL, NULL, 'Customer requested GPS navigation assistance', NOW(), NOW()),
(2, 2, 2, 'RNT-512807', '2026-08-25 14:30:00', '2026-08-29', '2026-09-02', '2026-08-29 10:00:00', '2026-09-02 18:00:00', 'Indiranagar, Bengaluru', 'Indiranagar, Bengaluru', 'COMPLETED', 4, 2900.00, 7500.00, 0.00, 2088.00, 21188.00, NULL, NULL, 'Vehicle returned in clean condition', NOW(), NOW()),
(3, 2, 4, 'RNT-443219', '2026-07-10 11:20:00', '2026-07-15', '2026-07-18', '2026-07-15 09:30:00', '2026-07-18 17:45:00', 'Mysuru Central', 'Mysuru Central', 'COMPLETED', 3, 1900.00, 5000.00, 0.00, 1026.00, 11726.00, NULL, NULL, 'Weekend leisure trip completed', NOW(), NOW()),
(4, 3, 5, 'RNT-701834', '2026-09-08 09:15:00', '2026-09-10', '2026-09-14', '2026-09-10 09:00:00', NULL, 'Bengaluru Airport', 'Bengaluru Airport', 'ACTIVE', 4, 4800.00, 12000.00, 0.00, 3456.00, 34656.00, NULL, NULL, 'Currently on trip to Coorg', NOW(), NOW()),
(5, 4, 3, 'RNT-390811', '2026-08-15 16:00:00', '2026-08-20', '2026-08-23', NULL, NULL, 'Bengaluru Airport', 'Bengaluru Airport', 'CANCELLED', 3, 3400.00, 9000.00, 0.00, 1836.00, 21036.00, 'Change of travel dates by customer', '2026-08-18 10:00:00', 'Refund initiated', NOW(), NOW())
ON DUPLICATE KEY UPDATE booking_reference=VALUES(booking_reference);

-- 9. PAYMENTS
INSERT INTO payments (payment_id, booking_id, transaction_reference, payment_method, amount, payment_status, payment_gateway, gateway_response, payment_date, created_at, updated_at) VALUES
(1, 1, 'pay_RNT8x912', 'UPI', 24868.00, 'COMPLETED', 'Razorpay', '{"status":"captured","method":"upi"}', '2026-09-01 10:05:00', NOW(), NOW()),
(2, 2, 'pay_RNT7b401', 'CARD', 21188.00, 'COMPLETED', 'Razorpay', '{"status":"captured","method":"card"}', '2026-08-25 14:35:00', NOW(), NOW()),
(3, 3, 'pay_RNT4m119', 'UPI', 11726.00, 'COMPLETED', 'Razorpay', '{"status":"captured","method":"upi"}', '2026-07-10 11:25:00', NOW(), NOW()),
(4, 4, 'pay_RNT9m763', 'NET_BANKING', 34656.00, 'COMPLETED', 'Razorpay', '{"status":"captured","method":"netbanking"}', '2026-09-08 09:20:00', NOW(), NOW()),
(5, 5, 'pay_RNT3c810', 'CARD', 21036.00, 'REFUNDED', 'Razorpay', '{"status":"refunded","amount":21036.00}', '2026-08-15 16:05:00', NOW(), NOW())
ON DUPLICATE KEY UPDATE transaction_reference=VALUES(transaction_reference);

-- 10. INVOICES
INSERT INTO invoices (invoice_id, payment_id, invoice_number, invoice_date, subtotal, tax_amount, total_amount, pdf_path, created_at, updated_at) VALUES
(1, 1, 'INV-2026-0001', '2026-09-01 10:05:00', 12600.00, 2268.00, 24868.00, '/invoices/INV-2026-0001.pdf', NOW(), NOW()),
(2, 2, 'INV-2026-0002', '2026-08-25 14:35:00', 11600.00, 2088.00, 21188.00, '/invoices/INV-2026-0002.pdf', NOW(), NOW()),
(3, 3, 'INV-2026-0003', '2026-07-10 11:25:00', 5700.00, 1026.00, 11726.00, '/invoices/INV-2026-0003.pdf', NOW(), NOW()),
(4, 4, 'INV-2026-0004', '2026-09-08 09:20:00', 19200.00, 3456.00, 34656.00, '/invoices/INV-2026-0004.pdf', NOW(), NOW())
ON DUPLICATE KEY UPDATE invoice_number=VALUES(invoice_number);

-- 11. RENTAL AGREEMENTS
INSERT INTO rental_agreements (agreement_id, booking_id, agreement_number, agreement_date, agreement_status, document_path, signed_at, created_at, updated_at) VALUES
(1, 1, 'AGR-2026-0001', '2026-09-01 10:06:00', 'ACTIVE', '/agreements/AGR-2026-0001.pdf', '2026-09-01 10:06:00', NOW(), NOW()),
(2, 2, 'AGR-2026-0002', '2026-08-25 14:36:00', 'COMPLETED', '/agreements/AGR-2026-0002.pdf', '2026-08-25 14:36:00', NOW(), NOW()),
(3, 4, 'AGR-2026-0003', '2026-09-08 09:21:00', 'ACTIVE', '/agreements/AGR-2026-0003.pdf', '2026-09-08 09:21:00', NOW(), NOW())
ON DUPLICATE KEY UPDATE agreement_number=VALUES(agreement_number);

-- 12. MAINTENANCE RECORDS
INSERT INTO maintenance_records (maintenance_id, vehicle_id, service_date, service_type, service_center, odometer_reading, service_cost, next_service_due, remarks, created_at) VALUES
(1, 6, '2026-08-30', 'Scheduled service', 'Metro Honda Service', 18420, 6400.00, '2027-02-28', 'Oil, filter and brake inspection.', NOW()),
(2, 5, '2026-08-12', 'Tyre replacement', 'Toyota Authorized Service', 32108, 18400.00, '2027-02-12', 'All four tyres replaced.', NOW())
ON DUPLICATE KEY UPDATE service_type=VALUES(service_type);

-- 13. BOOKING STATUS HISTORY
INSERT INTO booking_status_history (history_id, booking_id, status, changed_by, changed_at, remarks) VALUES
(1, 1, 'PENDING', 2, '2026-09-01 10:00:00', 'Booking created by customer'),
(2, 1, 'CONFIRMED', 1, '2026-09-01 10:05:00', 'Payment received via UPI'),
(3, 4, 'PENDING', 3, '2026-09-08 09:15:00', 'Booking created by customer'),
(4, 4, 'CONFIRMED', 1, '2026-09-08 09:20:00', 'Payment received via Net Banking'),
(5, 4, 'ACTIVE', 1, '2026-09-10 09:00:00', 'Vehicle handed over to customer');

SET FOREIGN_KEY_CHECKS = 1;
