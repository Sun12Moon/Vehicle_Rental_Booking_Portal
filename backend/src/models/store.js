/**
 * In-Memory Store Preloaded with SRS Seed Data
 * Provides graceful fallback when MySQL server is not connected
 * 
 * Default Seed Users:
 * 1. Admin: admin@rentivo.in / Admin@123
 * 2. User:  user@rentivo.in  / User@123
 */

const initialData = {
  roles: [
    { role_id: 1, role_name: 'ADMIN', description: 'System Administrator' },
    { role_id: 2, role_name: 'CUSTOMER', description: 'Registered Customer' }
  ],
  users: [
    {
      user_id: 1,
      role_id: 1,
      email: 'admin@rentivo.in',
      password_hash: '$2b$10$d1O2gfHjgzlHF9R2zIjMz.IU1.qKxvaulNdvwr8przBx4IaBy2jK2', // Admin@123
      is_active: true,
      status: 'ACTIVE',
      email_verified: true,
      created_at: new Date()
    },
    {
      user_id: 2,
      role_id: 2,
      email: 'user@rentivo.in',
      password_hash: '$2b$10$fKrcwA56VB/z5c1esrchDutj9zV.TW.NiZpkFrBJSd0Slov7U.BtW', // User@123
      is_active: true,
      status: 'ACTIVE',
      email_verified: true,
      created_at: new Date()
    }
  ],
  customer_profiles: [
    {
      customer_id: 1,
      user_id: 1,
      first_name: 'Admin',
      last_name: 'Manager',
      gender: 'Other',
      phone: '+91 99000 00000',
      driving_license_no: 'DL-ADMIN-001',
      aadhaar_number: '123456789012',
      address: 'Rentivo HQ, MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postal_code: '560001',
      emergency_contact_name: 'Rentivo Support',
      emergency_contact_phone: '+91 1800 234 7864',
      kyc_status: 'VERIFIED',
      kyc_provider: 'DIDIT',
      kyc_session_id: 'didit_sess_admin_master'
    },
    {
      customer_id: 2,
      user_id: 2,
      first_name: 'Demo',
      last_name: 'User',
      gender: 'Female',
      phone: '+91 98452 18203',
      driving_license_no: 'KA01 20150012345',
      aadhaar_number: '987654321012',
      address: '14, 100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postal_code: '560038',
      emergency_contact_name: 'Emergency Contact',
      emergency_contact_phone: '+91 98765 44321',
      kyc_status: 'VERIFIED',
      kyc_provider: 'DIDIT',
      kyc_session_id: 'didit_sess_user_demo'
    }
  ],
  branches: [
    {
      branch_id: 1,
      branch_name: 'Bengaluru Airport',
      address: 'Kempegowda International Airport Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560300',
      phone: '+91 80 4020 8877'
    },
    {
      branch_id: 2,
      branch_name: 'Indiranagar, Bengaluru',
      address: '100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      postal_code: '560038',
      phone: '+91 80 4020 8899'
    },
    {
      branch_id: 3,
      branch_name: 'Mysuru Central',
      address: 'Sayyaji Rao Road, Agrahara',
      city: 'Mysuru',
      state: 'Karnataka',
      postal_code: '570001',
      phone: '+91 821 442 1212'
    }
  ],
  categories: [
    { category_id: 1, category_name: 'Hatchback', description: 'Nimble, smart city companions.', seating_capacity: 5 },
    { category_id: 2, category_name: 'Sedan', description: 'Comfort and sophistication for highway trips.', seating_capacity: 5 },
    { category_id: 3, category_name: 'SUV', description: 'Spacious cabin and commanding presence.', seating_capacity: 7 },
    { category_id: 4, category_name: 'Luxury', description: 'Elevated travel with premium comfort.', seating_capacity: 5 }
  ],
  vehicle_categories: [
    { category_id: 1, category_name: 'Hatchback', description: 'Nimble, smart city companions.', seating_capacity: 5 },
    { category_id: 2, category_name: 'Sedan', description: 'Comfort and sophistication for highway trips.', seating_capacity: 5 },
    { category_id: 3, category_name: 'SUV', description: 'Spacious cabin and commanding presence.', seating_capacity: 7 },
    { category_id: 4, category_name: 'Luxury', description: 'Elevated travel with premium comfort.', seating_capacity: 5 }
  ],
  vehicles: [
    {
      vehicle_id: 1,
      category_id: 3,
      branch_id: 1,
      brand: 'Mahindra',
      model: 'XUV700',
      variant: 'AX7 Luxury',
      manufacture_year: 2024,
      color: 'Everest White',
      fuel_type: 'PETROL',
      transmission: 'AUTOMATIC',
      engine_capacity: '2.0L Turbo',
      seating_capacity: 7,
      mileage: 13.00,
      daily_rent: 4200.00,
      security_deposit: 10000.00,
      status: 'AVAILABLE',
      image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85',
      registration_number: 'KA-01-MJ-2024',
      chassis_number: 'CHAS-XUV-001',
      insurance_number: 'INS-772183',
      current_odometer: 12400,
      description: 'A refined seven-seat SUV with confident performance and panoramic cabin.'
    },
    {
      vehicle_id: 2,
      category_id: 2,
      branch_id: 2,
      brand: 'Hyundai',
      model: 'Verna',
      variant: 'SX(O) Turbo',
      manufacture_year: 2024,
      color: 'Abyss Black',
      fuel_type: 'PETROL',
      transmission: 'AUTOMATIC',
      engine_capacity: '1.5L Turbo',
      seating_capacity: 5,
      mileage: 18.00,
      daily_rent: 2900.00,
      security_deposit: 7500.00,
      status: 'AVAILABLE',
      image_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=85',
      registration_number: 'KA-03-NV-5120',
      chassis_number: 'CHAS-VRN-002',
      insurance_number: 'INS-449102',
      current_odometer: 9800,
      description: 'A contemporary sedan that makes every intercity drive smooth and composed.'
    },
    {
      vehicle_id: 3,
      category_id: 3,
      branch_id: 1,
      brand: 'Tata',
      model: 'Nexon EV',
      variant: 'Empowered+',
      manufacture_year: 2024,
      color: 'Pristine White',
      fuel_type: 'ELECTRIC',
      transmission: 'AUTOMATIC',
      engine_capacity: '40.5 kWh',
      seating_capacity: 5,
      mileage: 465.00,
      daily_rent: 3400.00,
      security_deposit: 9000.00,
      status: 'AVAILABLE',
      image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=85',
      registration_number: 'KA-04-EV-9011',
      chassis_number: 'CHAS-NEX-003',
      insurance_number: 'INS-882031',
      current_odometer: 14200,
      description: 'A quiet, capable electric SUV for sustainable city breaks and effortless errands.'
    },
    {
      vehicle_id: 4,
      category_id: 1,
      branch_id: 3,
      brand: 'Maruti Suzuki',
      model: 'Baleno',
      variant: 'Alpha AGS',
      manufacture_year: 2023,
      color: 'Nexa Blue',
      fuel_type: 'PETROL',
      transmission: 'AUTOMATIC',
      engine_capacity: '1.2L',
      seating_capacity: 5,
      mileage: 22.00,
      daily_rent: 1900.00,
      security_deposit: 5000.00,
      status: 'AVAILABLE',
      image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85',
      registration_number: 'KA-09-BL-3341',
      chassis_number: 'CHAS-BAL-004',
      insurance_number: 'INS-110293',
      current_odometer: 21300,
      description: 'An easy-to-drive hatchback with plenty of room, ideal for quick getaways.'
    },
    {
      vehicle_id: 5,
      category_id: 3,
      branch_id: 1,
      brand: 'Toyota',
      model: 'Innova Crysta',
      variant: 'ZX AT',
      manufacture_year: 2023,
      color: 'Silver',
      fuel_type: 'DIESEL',
      transmission: 'AUTOMATIC',
      engine_capacity: '2.4L',
      seating_capacity: 7,
      mileage: 15.00,
      daily_rent: 4800.00,
      security_deposit: 12000.00,
      status: 'RENTED',
      image_url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=85',
      registration_number: 'KA-01-IN-7809',
      chassis_number: 'CHAS-INN-005',
      insurance_number: 'INS-556104',
      current_odometer: 32108,
      description: 'The trusted people-mover for family holidays and long highway runs.'
    },
    {
      vehicle_id: 6,
      category_id: 2,
      branch_id: 2,
      brand: 'Honda',
      model: 'City',
      variant: 'ZX CVT',
      manufacture_year: 2024,
      color: 'Platinum White',
      fuel_type: 'PETROL',
      transmission: 'AUTOMATIC',
      engine_capacity: '1.5L',
      seating_capacity: 5,
      mileage: 18.00,
      daily_rent: 3100.00,
      security_deposit: 8000.00,
      status: 'MAINTENANCE',
      image_url: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=85',
      registration_number: 'KA-03-HC-4412',
      chassis_number: 'CHAS-CTY-006',
      insurance_number: 'INS-990142',
      current_odometer: 18420,
      description: 'A polished sedan with exceptional rear-seat comfort and reassuring highway character.'
    }
  ],
  bookings: [
    {
      booking_id: 1,
      customer_id: 2,
      vehicle_id: 1,
      booking_reference: 'RNT-628491',
      booking_date: '2026-09-01 10:00:00',
      pickup_date: '2026-09-04',
      return_date: '2026-09-07',
      pickup_location: 'Bengaluru Airport',
      return_location: 'Bengaluru Airport',
      booking_status: 'CONFIRMED',
      total_days: 3,
      daily_rent: 4200.00,
      security_deposit: 10000.00,
      discount: 0,
      tax: 2268.00,
      total_amount: 24868.00,
      remarks: 'Customer requested GPS navigation assistance'
    },
    {
      booking_id: 2,
      customer_id: 2,
      vehicle_id: 2,
      booking_reference: 'RNT-512807',
      booking_date: '2026-08-25 14:30:00',
      pickup_date: '2026-08-29',
      return_date: '2026-09-02',
      pickup_location: 'Indiranagar, Bengaluru',
      return_location: 'Indiranagar, Bengaluru',
      booking_status: 'COMPLETED',
      total_days: 4,
      daily_rent: 2900.00,
      security_deposit: 7500.00,
      discount: 0,
      tax: 2088.00,
      total_amount: 21188.00,
      remarks: 'Vehicle returned in spotless condition'
    },
    {
      booking_id: 3,
      customer_id: 2,
      vehicle_id: 4,
      booking_reference: 'RNT-443219',
      booking_date: '2026-07-10 11:20:00',
      pickup_date: '2026-07-15',
      return_date: '2026-07-18',
      pickup_location: 'Mysuru Central',
      return_location: 'Mysuru Central',
      booking_status: 'COMPLETED',
      total_days: 3,
      daily_rent: 1900.00,
      security_deposit: 5000.00,
      discount: 0,
      tax: 1026.00,
      total_amount: 11726.00,
      remarks: 'Weekend leisure trip completed'
    },
    {
      booking_id: 4,
      customer_id: 2,
      vehicle_id: 5,
      booking_reference: 'RNT-701834',
      booking_date: '2026-09-08 09:15:00',
      pickup_date: '2026-09-10',
      return_date: '2026-09-14',
      pickup_location: 'Bengaluru Airport',
      return_location: 'Bengaluru Airport',
      booking_status: 'ACTIVE',
      total_days: 4,
      daily_rent: 4800.00,
      security_deposit: 12000.00,
      discount: 0,
      tax: 3456.00,
      total_amount: 34656.00,
      remarks: 'Currently on trip to Coorg'
    }
  ],
  payments: [
    {
      payment_id: 1,
      booking_id: 1,
      transaction_reference: 'pay_RNT8x912',
      payment_method: 'UPI',
      amount: 24868.00,
      payment_status: 'COMPLETED',
      payment_gateway: 'Razorpay',
      gateway_response: '{"status":"captured"}',
      payment_date: '2026-09-01 10:05:00'
    },
    {
      payment_id: 2,
      booking_id: 2,
      transaction_reference: 'pay_RNT7b401',
      payment_method: 'CARD',
      amount: 21188.00,
      payment_status: 'COMPLETED',
      payment_gateway: 'Razorpay',
      gateway_response: '{"status":"captured"}',
      payment_date: '2026-08-25 14:35:00'
    },
    {
      payment_id: 3,
      booking_id: 3,
      transaction_reference: 'pay_RNT4m119',
      payment_method: 'UPI',
      amount: 11726.00,
      payment_status: 'COMPLETED',
      payment_gateway: 'Razorpay',
      gateway_response: '{"status":"captured"}',
      payment_date: '2026-07-10 11:25:00'
    },
    {
      payment_id: 4,
      booking_id: 4,
      transaction_reference: 'pay_RNT9m763',
      payment_method: 'NET_BANKING',
      amount: 34656.00,
      payment_status: 'COMPLETED',
      payment_gateway: 'Razorpay',
      gateway_response: '{"status":"captured"}',
      payment_date: '2026-09-08 09:20:00'
    }
  ],
  invoices: [
    { invoice_id: 1, payment_id: 1, invoice_number: 'INV-2026-0001', subtotal: 12600.00, tax_amount: 2268.00, total_amount: 24868.00 },
    { invoice_id: 2, payment_id: 2, invoice_number: 'INV-2026-0002', subtotal: 11600.00, tax_amount: 2088.00, total_amount: 21188.00 },
    { invoice_id: 3, payment_id: 3, invoice_number: 'INV-2026-0003', subtotal: 5700.00, tax_amount: 1026.00, total_amount: 11726.00 },
    { invoice_id: 4, payment_id: 4, invoice_number: 'INV-2026-0004', subtotal: 19200.00, tax_amount: 3456.00, total_amount: 34656.00 }
  ],
  rental_agreements: [
    { agreement_id: 1, booking_id: 1, agreement_number: 'AGR-2026-0001', agreement_status: 'ACTIVE' },
    { agreement_id: 2, booking_id: 2, agreement_number: 'AGR-2026-0002', agreement_status: 'COMPLETED' },
    { agreement_id: 3, booking_id: 4, agreement_number: 'AGR-2026-0003', agreement_status: 'ACTIVE' }
  ],
  maintenance: [
    { maintenance_id: 1, vehicle_id: 6, service_date: '2026-08-30', service_type: 'Scheduled service', service_center: 'Metro Honda Service', odometer_reading: 18420, service_cost: 6400.00, next_service_due: '2027-02-28', remarks: 'Oil, filter and brake inspection.' },
    { maintenance_id: 2, vehicle_id: 5, service_date: '2026-08-12', service_type: 'Tyre replacement', service_center: 'Toyota Authorized Service', odometer_reading: 32108, service_cost: 18400.00, next_service_due: '2027-02-12', remarks: 'All four tyres replaced.' }
  ],
  booking_status_history: [
    { history_id: 1, booking_id: 1, status: 'PENDING', changed_by: 2, changed_at: '2026-09-01 10:00:00', remarks: 'Booking created by customer' },
    { history_id: 2, booking_id: 1, status: 'CONFIRMED', changed_by: 1, changed_at: '2026-09-01 10:05:00', remarks: 'Payment received via UPI' },
    { history_id: 3, booking_id: 4, status: 'PENDING', changed_by: 2, changed_at: '2026-09-08 09:15:00', remarks: 'Booking created by customer' },
    { history_id: 4, booking_id: 4, status: 'CONFIRMED', changed_by: 1, changed_at: '2026-09-08 09:20:00', remarks: 'Payment received via Net Banking' },
    { history_id: 5, booking_id: 4, status: 'ACTIVE', changed_by: 1, changed_at: '2026-09-10 09:00:00', remarks: 'Vehicle handed over to customer' }
  ],
  audit_logs: [
    { log_id: 1, user_id: 1, action: 'ADMIN_LOGIN', module: 'AUTH', entity_id: 1, ip_address: '127.0.0.1', created_at: new Date() },
    { log_id: 2, user_id: 2, action: 'CUSTOMER_LOGIN', module: 'AUTH', entity_id: 2, ip_address: '127.0.0.1', created_at: new Date() },
    { log_id: 3, user_id: 2, action: 'KYC_DIDIT_VERIFIED', module: 'KYC', entity_id: 2, ip_address: '127.0.0.1', created_at: new Date() }
  ]
};

module.exports = initialData;
