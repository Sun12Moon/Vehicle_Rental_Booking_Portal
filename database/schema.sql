-- Vehicle Rental Booking Portal
-- MySQL 8.x Database Schema

CREATE DATABASE IF NOT EXISTS vehicle_rental_db;
USE vehicle_rental_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  email_verified BOOLEAN DEFAULT FALSE,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_email ON users(email);

-- 3. CUSTOMER PROFILES (With DIDIT KYC Integration Fields)
CREATE TABLE IF NOT EXISTS customer_profiles (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  gender VARCHAR(20),
  date_of_birth DATE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  alternate_phone VARCHAR(20),
  driving_license_no VARCHAR(100) NOT NULL UNIQUE,
  license_expiry DATE,
  aadhaar_number VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  postal_code VARCHAR(15),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  profile_image VARCHAR(255),
  kyc_status ENUM('NOT_STARTED', 'PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED') DEFAULT 'NOT_STARTED',
  kyc_provider VARCHAR(50) DEFAULT 'DIDIT',
  kyc_session_id VARCHAR(255),
  kyc_verified_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_customer_profiles_city ON customer_profiles(city);
CREATE INDEX idx_customer_profiles_kyc_status ON customer_profiles(kyc_status);
CREATE INDEX idx_customer_profiles_phone ON customer_profiles(phone);

-- 4. VEHICLE CATEGORIES
CREATE TABLE IF NOT EXISTS vehicle_categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  seating_capacity INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
  branch_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_name VARCHAR(100) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(15),
  phone VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. VEHICLES
CREATE TABLE IF NOT EXISTS vehicles (
  vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  branch_id INT NOT NULL,
  registration_number VARCHAR(50) NOT NULL UNIQUE,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  variant VARCHAR(100),
  manufacture_year INT,
  color VARCHAR(50),
  fuel_type ENUM('PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'CNG'),
  transmission ENUM('MANUAL', 'AUTOMATIC'),
  engine_capacity VARCHAR(50),
  seating_capacity INT,
  mileage DECIMAL(10,2),
  daily_rent DECIMAL(10,2) NOT NULL,
  security_deposit DECIMAL(10,2),
  status ENUM('AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'INACTIVE') DEFAULT 'AVAILABLE',
  image_url VARCHAR(255),
  chassis_number VARCHAR(100) UNIQUE,
  insurance_number VARCHAR(100),
  insurance_expiry DATE,
  pollution_expiry DATE,
  last_service_date DATE,
  next_service_date DATE,
  current_odometer INT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (category_id) REFERENCES vehicle_categories(category_id),
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vehicles_category_id ON vehicles(category_id);
CREATE INDEX idx_vehicles_branch_id ON vehicles(branch_id);
CREATE INDEX idx_vehicles_brand ON vehicles(brand);
CREATE INDEX idx_vehicles_model ON vehicles(model);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_daily_rent ON vehicles(daily_rent);

-- 7. BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  booking_reference VARCHAR(30) NOT NULL UNIQUE,
  booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  actual_pickup DATETIME,
  actual_return DATETIME,
  pickup_location VARCHAR(150) NOT NULL,
  return_location VARCHAR(150) NOT NULL,
  booking_status ENUM('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
  total_days INT,
  daily_rent DECIMAL(10,2),
  security_deposit DECIMAL(10,2),
  discount DECIMAL(10,2) DEFAULT 0.00,
  tax DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  cancellation_reason TEXT,
  cancelled_at DATETIME,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(customer_id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX idx_bookings_pickup_date ON bookings(pickup_date);
CREATE INDEX idx_bookings_return_date ON bookings(return_date);
CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);

-- 8. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  transaction_reference VARCHAR(100) UNIQUE NOT NULL,
  payment_method ENUM('UPI', 'CARD', 'NET_BANKING', 'WALLET', 'CASH') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
  payment_gateway VARCHAR(100),
  gateway_response TEXT,
  payment_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payments_payment_status ON payments(payment_status);

-- 9. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL UNIQUE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  pdf_path VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(payment_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. RENTAL AGREEMENTS
CREATE TABLE IF NOT EXISTS rental_agreements (
  agreement_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  agreement_number VARCHAR(50) UNIQUE NOT NULL,
  agreement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  agreement_status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'ACTIVE',
  document_path VARCHAR(255),
  signed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. REPORTS
CREATE TABLE IF NOT EXISTS reports (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  report_type VARCHAR(100),
  generated_by INT,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  file_path VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (generated_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reports_report_type ON reports(report_type);
CREATE INDEX idx_reports_generated_by ON reports(generated_by);

-- 12. VEHICLE IMAGES
CREATE TABLE IF NOT EXISTS vehicle_images (
  image_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);

-- 13. BOOKING STATUS HISTORY
CREATE TABLE IF NOT EXISTS booking_status_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL,
  changed_by INT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  remarks TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_bsh_booking_id ON booking_status_history(booking_id);
CREATE INDEX idx_bsh_status ON booking_status_history(status);
CREATE INDEX idx_bsh_changed_at ON booking_status_history(changed_at);

-- 14. VEHICLE CONDITION MEDIA
CREATE TABLE IF NOT EXISTS vehicle_condition_media (
  media_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  uploaded_by INT NOT NULL,
  condition_stage ENUM('BEFORE_RENTAL', 'AFTER_RENTAL') NOT NULL,
  media_type ENUM('PHOTO', 'VIDEO') NOT NULL,
  media_source ENUM('ADMIN', 'CUSTOMER') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  storage_provider VARCHAR(50) NOT NULL,
  customer_visible BOOLEAN DEFAULT FALSE,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vcm_booking_id ON vehicle_condition_media(booking_id);
CREATE INDEX idx_vcm_uploaded_by ON vehicle_condition_media(uploaded_by);
CREATE INDEX idx_vcm_condition_stage ON vehicle_condition_media(condition_stage);

-- 15. MAINTENANCE RECORDS
CREATE TABLE IF NOT EXISTS maintenance_records (
  maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  service_date DATE,
  service_type VARCHAR(100),
  service_center VARCHAR(150),
  odometer_reading INT,
  service_cost DECIMAL(10,2),
  next_service_due DATE,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_maintenance_records_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX idx_maintenance_records_service_date ON maintenance_records(service_date);

-- 16. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  module VARCHAR(100),
  entity_id INT,
  ip_address VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);

SET FOREIGN_KEY_CHECKS = 1;
