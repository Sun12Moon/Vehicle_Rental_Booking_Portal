-- Vehicle Rental Booking Portal
-- Converted from DBML to MySQL 8.x

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ROLES
CREATE TABLE roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- USERS
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
  email_verified BOOLEAN DEFAULT FALSE,
  last_login DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  FOREIGN KEY (role_id) REFERENCES roles(role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_role_id ON users(role_id);

-- CUSTOMER PROFILES
CREATE TABLE customer_profiles (
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
  country VARCHAR(100),
  postal_code VARCHAR(15),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  profile_image VARCHAR(255),
  created_at DATETIME,
  updated_at DATETIME,
  deleted_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_customer_profiles_city ON customer_profiles(city);

-- VEHICLE CATEGORIES
CREATE TABLE vehicle_categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  seating_capacity INT,
  created_at DATETIME,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BRANCHES
CREATE TABLE branches (
  branch_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_name VARCHAR(100) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(15),
  phone VARCHAR(20),
  created_at DATETIME,
  updated_at DATETIME
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VEHICLES
CREATE TABLE vehicles (
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
  created_at DATETIME,
  updated_at DATETIME,
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

-- BOOKINGS
CREATE TABLE bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  vehicle_id INT NOT NULL,
  booking_reference VARCHAR(30) NOT NULL UNIQUE,
  booking_date DATETIME,
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
  discount DECIMAL(10,2),
  tax DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  cancellation_reason TEXT,
  cancelled_at DATETIME,
  remarks TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customer_profiles(customer_id),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_booking_status ON bookings(booking_status);
CREATE INDEX idx_bookings_pickup_date ON bookings(pickup_date);
CREATE INDEX idx_bookings_return_date ON bookings(return_date);
CREATE INDEX idx_bookings_booking_date ON bookings(booking_date);

-- PAYMENTS
CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  transaction_reference VARCHAR(100) UNIQUE NOT NULL,
  payment_method ENUM('UPI', 'CARD', 'NET_BANKING', 'CASH') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
  payment_gateway VARCHAR(100),
  gateway_response TEXT,
  payment_date DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payments_payment_status ON payments(payment_status);

-- INVOICES
CREATE TABLE invoices (
  invoice_id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL UNIQUE,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATETIME,
  subtotal DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  pdf_path VARCHAR(255),
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RENTAL AGREEMENTS
CREATE TABLE rental_agreements (
  agreement_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  agreement_number VARCHAR(50) UNIQUE NOT NULL,
  agreement_date DATETIME,
  agreement_status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'ACTIVE',
  document_path VARCHAR(255),
  signed_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- REPORTS
CREATE TABLE reports (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  report_type VARCHAR(100),
  generated_by INT,
  generated_at DATETIME,
  file_path VARCHAR(255),
  created_at DATETIME,
  FOREIGN KEY (generated_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reports_report_type ON reports(report_type);
CREATE INDEX idx_reports_generated_by ON reports(generated_by);

-- VEHICLE IMAGES
CREATE TABLE vehicle_images (
  image_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_at DATETIME,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);

-- BOOKING STATUS HISTORY
CREATE TABLE booking_status_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  status ENUM('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL,
  changed_by INT,
  changed_at DATETIME,
  remarks TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  FOREIGN KEY (changed_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_bsh_booking_id ON booking_status_history(booking_id);
CREATE INDEX idx_bsh_status ON booking_status_history(status);
CREATE INDEX idx_bsh_changed_at ON booking_status_history(changed_at);

-- VEHICLE CONDITION MEDIA
CREATE TABLE vehicle_condition_media (
  media_id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  uploaded_by INT NOT NULL,
  condition_stage ENUM('BEFORE_RENTAL', 'AFTER_RENTAL') NOT NULL,
  media_type ENUM('PHOTO', 'VIDEO') NOT NULL,
  media_source ENUM('ADMIN', 'CUSTOMER') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  storage_provider VARCHAR(50) NOT NULL,
  customer_visible BOOLEAN DEFAULT FALSE,
  uploaded_at DATETIME,
  description TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
  FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_vcm_booking_id ON vehicle_condition_media(booking_id);
CREATE INDEX idx_vcm_uploaded_by ON vehicle_condition_media(uploaded_by);
CREATE INDEX idx_vcm_condition_stage ON vehicle_condition_media(condition_stage);
CREATE INDEX idx_vcm_media_type ON vehicle_condition_media(media_type);
CREATE INDEX idx_vcm_media_source ON vehicle_condition_media(media_source);
CREATE INDEX idx_vcm_customer_visible ON vehicle_condition_media(customer_visible);

-- MAINTENANCE RECORDS
CREATE TABLE maintenance_records (
  maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id INT NOT NULL,
  service_date DATE,
  service_type VARCHAR(100),
  service_center VARCHAR(150),
  odometer_reading INT,
  service_cost DECIMAL(10,2),
  next_service_due DATE,
  remarks TEXT,
  created_at DATETIME,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_maintenance_records_vehicle_id ON maintenance_records(vehicle_id);
CREATE INDEX idx_maintenance_records_service_date ON maintenance_records(service_date);

-- AUDIT LOGS
CREATE TABLE audit_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  module VARCHAR(100),
  entity_id INT,
  ip_address VARCHAR(50),
  created_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);

SET FOREIGN_KEY_CHECKS = 1;
