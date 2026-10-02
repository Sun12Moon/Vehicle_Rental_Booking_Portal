-- Vehicle Rental Booking Portal
-- Performance & Optimization Indexes for MySQL 8.x

USE vehicle_rental_db;

-- Composite Indexes for High-Frequency Query Paths

-- 1. Optimized Vehicle Search by Branch, Category & Availability (FR4)
CREATE INDEX idx_vehicles_search_composite 
ON vehicles(status, category_id, branch_id, daily_rent);

-- 2. Optimized Concurrency / Overlap Validation (FR7)
CREATE INDEX idx_bookings_availability_check 
ON bookings(vehicle_id, booking_status, pickup_date, return_date);

-- 3. Customer Booking History Index (FR10)
CREATE INDEX idx_bookings_customer_history 
ON bookings(customer_id, booking_date DESC);

-- 4. Payment Status & Transaction Lookup
CREATE INDEX idx_payments_lookup 
ON payments(booking_id, payment_status);

-- 5. KYC Status Verification Lookup
CREATE INDEX idx_customer_kyc_lookup 
ON customer_profiles(kyc_status, user_id);

-- 6. Audit Trail Search by Module & Time
CREATE INDEX idx_audit_logs_module_time 
ON audit_logs(module, created_at DESC);
