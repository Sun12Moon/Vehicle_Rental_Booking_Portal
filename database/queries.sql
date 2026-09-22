-- Vehicle Rental Booking Portal
-- Standard Demonstration SQL Queries (DBMS Concepts)

-- 1. CONCURRENT BOOKING OVERLAP CHECK (FR7 - Transaction Isolation & Concurrency)
-- Used before confirming any reservation to ensure vehicle availability across selected dates.
SELECT booking_id, booking_reference, pickup_date, return_date, booking_status
FROM bookings
WHERE vehicle_id = ?
  AND booking_status IN ('CONFIRMED', 'ACTIVE')
  AND (pickup_date <= ? AND return_date >= ?)
FOR UPDATE;

-- 2. DYNAMIC VEHICLE SEARCH WITH MULTI-CRITERIA FILTERING (FR4)
-- Filters vehicles by category, branch, price, fuel, and transmission while ensuring availability.
SELECT 
    v.vehicle_id,
    v.brand,
    v.model,
    v.variant,
    v.manufacture_year,
    v.color,
    v.fuel_type,
    v.transmission,
    v.daily_rent,
    v.security_deposit,
    v.status,
    v.image_url,
    vc.category_name,
    b.branch_name,
    b.city
FROM vehicles v
JOIN vehicle_categories vc ON v.category_id = vc.category_id
JOIN branches b ON v.branch_id = b.branch_id
WHERE v.deleted_at IS NULL
  AND (? IS NULL OR v.category_id = ?)
  AND (? IS NULL OR v.branch_id = ?)
  AND (? IS NULL OR v.fuel_type = ?)
  AND (? IS NULL OR v.transmission = ?)
  AND (? IS NULL OR v.daily_rent <= ?)
  AND v.status = 'AVAILABLE';

-- 3. CUSTOMER BOOKING HISTORY WITH PAYMENT STATUS (FR10)
SELECT 
    b.booking_id,
    b.booking_reference,
    b.booking_date,
    b.pickup_date,
    b.return_date,
    b.pickup_location,
    b.return_location,
    b.booking_status,
    b.total_amount,
    v.brand,
    v.model,
    v.registration_number,
    p.payment_status,
    p.payment_method,
    p.transaction_reference,
    inv.invoice_number
FROM bookings b
JOIN vehicles v ON b.vehicle_id = v.vehicle_id
LEFT JOIN payments p ON b.booking_id = p.booking_id
LEFT JOIN invoices inv ON p.payment_id = inv.payment_id
WHERE b.customer_id = ?
ORDER BY b.booking_date DESC;

-- 4. ADMIN DASHBOARD - OPERATIONAL FLEET & REVENUE SUMMARY (FR16)
SELECT 
    COUNT(DISTINCT v.vehicle_id) AS total_fleet,
    SUM(CASE WHEN v.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_fleet,
    SUM(CASE WHEN v.status = 'RENTED' THEN 1 ELSE 0 END) AS rented_fleet,
    SUM(CASE WHEN v.status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenance_fleet,
    (SELECT COUNT(*) FROM bookings WHERE booking_status = 'ACTIVE') AS active_bookings_count,
    (SELECT COUNT(*) FROM bookings WHERE booking_status = 'CONFIRMED') AS upcoming_bookings_count,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'COMPLETED') AS total_revenue_collected,
    (SELECT COUNT(DISTINCT customer_id) FROM customer_profiles) AS registered_customers_count
FROM vehicles v
WHERE v.deleted_at IS NULL;

-- 5. REVENUE REPORT BY BRANCH & TIME PERIOD (FR15)
SELECT 
    b.branch_name,
    COUNT(bk.booking_id) AS total_rentals,
    COALESCE(SUM(p.amount), 0) AS total_revenue,
    AVG(bk.total_days) AS avg_rental_duration_days
FROM branches b
LEFT JOIN vehicles v ON b.branch_id = v.branch_id
LEFT JOIN bookings bk ON v.vehicle_id = bk.vehicle_id
LEFT JOIN payments p ON bk.booking_id = p.booking_id AND p.payment_status = 'COMPLETED'
GROUP BY b.branch_id, b.branch_name
ORDER BY total_revenue DESC;

-- 6. AUDIT TRAIL QUERY (Security & Compliance)
SELECT 
    a.log_id,
    u.email,
    a.action,
    a.module,
    a.entity_id,
    a.ip_address,
    a.created_at
FROM audit_logs a
JOIN users u ON a.user_id = u.user_id
ORDER BY a.created_at DESC
LIMIT 50;
