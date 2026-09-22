/**
 * In-Memory Store Preloaded with SRS Seed Data
 * Provides graceful fallback when MySQL server is not connected
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
      password_hash: '$2b$10$CYUabm3pBoxdwoKMH6DaMeZBBKyi/PDSSt0n/yhWltkpLjdlo62Ra', // Admin@123
      is_active: true,
      status: 'ACTIVE',
      email_verified: true,
      created_at: new Date()
    },
    {
      user_id: 2,
      role_id: 2,
      email: 'aditi.menon@example.com',
      password_hash: '$2b$10$oY7tM/DtY3o6sqHg4DGcGev.mFRrplV0jPk0VdGNqrTeI.BWRUY4q', // Customer@123
      is_active: true,
      status: 'ACTIVE',
      email_verified: true,
      created_at: new Date()
    },
    {
      user_id: 3,
      role_id: 2,
      email: 'rohan.shah@example.com',
      password_hash: '$2b$10$oY7tM/DtY3o6sqHg4DGcGev.mFRrplV0jPk0VdGNqrTeI.BWRUY4q',
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
      address: 'Rentivo HQ, MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postal_code: '560001',
      emergency_contact_name: 'Rentivo Support',
      emergency_contact_phone: '+91 1800 234 7864'
    },
    {
      customer_id: 2,
      user_id: 2,
      first_name: 'Aditi',
      last_name: 'Menon',
      gender: 'Female',
      phone: '+91 98452 18203',
      driving_license_no: 'KA01 20150012345',
      address: '14, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postal_code: '560038',
      emergency_contact_name: 'Arjun Menon',
      emergency_contact_phone: '+91 98765 44321'
    },
    {
      customer_id: 3,
      user_id: 3,
      first_name: 'Rohan',
      last_name: 'Shah',
      gender: 'Male',
      phone: '+91 99872 55711',
      driving_license_no: 'MH02 20170098765',
      address: '72, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      postal_code: '560034',
      emergency_contact_name: 'Pooja Shah',
      emergency_contact_phone: '+91 99872 55700'
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
  vehicle_categories: [
    { category_id: 1, category_name: 'Hatchback', description: 'Nimble, smart city companions.', seating_capacity: 5 },
    { category_id: 2, category_name: 'Sedan', description: 'Comfort for work and weekends.', seating_capacity: 5 },
    { category_id: 3, category_name: 'SUV', description: 'Room to roam with confidence.', seating_capacity: 7 },
    { category_id: 4, category_name: 'Luxury', description: 'Elevated travel, beautifully done.', seating_capacity: 5 }
  ],
  vehicles: [
    {
      vehicle_id: 1,
      category_id: 3,
      branch_id: 1,
      registration_number: 'KA-01-MJ-2024',
      brand: 'Mahindra',
      model: 'XUV700',
      variant: 'AX7 Luxury',
      manufacture_year: 2024,
      color: 'Everest White',
      fuel_type: 'PETROL',
      transmission: 'AUTOMATIC',
      engine_capacity: '2.0L Turbo',
      seating_capacity: 7,
      mileage: 13,
      daily_rent: 4200,
      security_deposit: 10000,
      status: 'AVAILABLE',
      image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85',
      description: 'A refined seven-seat SUV with confident performance, a panoramic cabin and premium safety technology.'
    },
    {
      vehicle_id: 2,
      category_id: 2,
      branch_id: 2,
      registration_number: 'KA-03-NV-5120',
      brand: 'Hyundai',
      model: 'Verna',
      variant: 'SX(O) Turbo',
      manufacture_year: 2024,
      color: 'Abyss Black',
      fuel_type: 'PETROL',
      transmission: 'AUTOMATIC',
      engine_capacity: '1.5L Turbo',
      seating_capacity: 5,
      mileage: 18,
      daily_rent: 2900,
      security_deposit: 7500,
      status: 'AVAILABLE',
      image_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=85',
      description: 'A contemporary sedan that makes every intercity drive smooth, connected and comfortably composed.'
    },
    {
      vehicle_id: 3,
      category_id: 3,
      branch_id: 1,
      registration_number: 'KA-04-EV-9011',
      brand: 'Tata',
      model: 'Nexon EV',
      variant: 'Empowered+',
      manufacture_year: 2024,
      color: 'Pristine White',
      fuel_type: 'ELECTRIC',
      transmission: 'AUTOMATIC',
      engine_capacity: '40.5 kWh',
      seating_capacity: 5,
      mileage: 465,
      daily_rent: 3400,
      security_deposit: 9000,
      status: 'AVAILABLE',
      image_url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=85',
      description: 'A quiet, capable electric SUV for sustainable city breaks and effortless daily errands.'
    },
    {
      vehicle_id: 4,
      category_id: 1,
      branch_id: 3,
      registration_number: 'KA-09-BL-3341',
      brand: 'Maruti Suzuki',
      model: 'Baleno',
      variant: 'Alpha AGS',
      manufacture_year: 2023,
      color: 'Nexa Blue',
      fuel_type: 'PETROL',
      transmission: 'AUTOMATIC',
      engine_capacity: '1.2L',
      seating_capacity: 5,
      mileage: 22,
      daily_rent: 1900,
      security_deposit: 5000,
      status: 'AVAILABLE',
      image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85',
      description: 'An easy-to-drive hatchback with plenty of room, ideal for quick getaways and city plans.'
    },
    {
      vehicle_id: 5,
      category_id: 3,
      branch_id: 1,
      registration_number: 'KA-01-IN-7809',
      brand: 'Toyota',
      model: 'Innova Crysta',
      variant: 'ZX AT',
      manufacture_year: 2023,
      color: 'Silver',
      fuel_type: 'DIESEL',
      transmission: 'AUTOMATIC',
      engine_capacity: '2.4L',
      seating_capacity: 7,
      mileage: 15,
      daily_rent: 4800,
      security_deposit: 12000,
      status: 'RENTED',
      image_url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=85',
      description: 'The trusted people-mover for family holidays, airport transfers and long highway runs.'
    },
    {
      vehicle_id: 6,
      category_id: 2,
      branch_id: 2,
      registration_number: 'KA-03-HC-4412',
      brand: 'Honda',
      model: 'City',
      variant: 'ZX CVT',
      manufacture_year: 2024,
      color: 'Platinum White',
      fuel_type: 'PETROL',
      transmission: 'AUTOMATIC',
      engine_capacity: '1.5L',
      seating_capacity: 5,
      mileage: 18,
      daily_rent: 3100,
      security_deposit: 8000,
      status: 'MAINTENANCE',
      image_url: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=85',
      description: 'A polished sedan with exceptional rear-seat comfort and a reassuring highway character.'
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
      daily_rent: 4200,
      security_deposit: 10000,
      discount: 0,
      tax: 2268,
      total_amount: 24868,
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
      daily_rent: 2900,
      security_deposit: 7500,
      discount: 0,
      tax: 2088,
      total_amount: 21188,
      remarks: 'Returned in pristine condition'
    },
    {
      booking_id: 3,
      customer_id: 3,
      vehicle_id: 5,
      booking_reference: 'RNT-701834',
      booking_date: '2026-09-08 09:15:00',
      pickup_date: '2026-09-10',
      return_date: '2026-09-14',
      pickup_location: 'Bengaluru Airport',
      return_location: 'Bengaluru Airport',
      booking_status: 'ACTIVE',
      total_days: 4,
      daily_rent: 4800,
      security_deposit: 12000,
      discount: 0,
      tax: 3456,
      total_amount: 34656,
      remarks: 'Highway trip to Coorg'
    }
  ],
  payments: [
    {
      payment_id: 1,
      booking_id: 1,
      transaction_reference: 'pay_RNT8x912',
      payment_method: 'UPI',
      amount: 24868,
      payment_status: 'COMPLETED',
      payment_gateway: 'Razorpay',
      payment_date: '2026-09-01 10:05:00'
    },
    {
      payment_id: 2,
      booking_id: 2,
      transaction_reference: 'pay_RNT7b401',
      payment_method: 'CARD',
      amount: 21188,
      payment_status: 'COMPLETED',
      payment_gateway: 'Razorpay',
      payment_date: '2026-08-25 14:35:00'
    },
    {
      payment_id: 3,
      booking_id: 3,
      transaction_reference: 'pay_RNT9m763',
      payment_method: 'NET_BANKING',
      amount: 34656,
      payment_status: 'COMPLETED',
      payment_gateway: 'Razorpay',
      payment_date: '2026-09-08 09:20:00'
    }
  ],
  invoices: [
    {
      invoice_id: 1,
      payment_id: 1,
      invoice_number: 'INV-2026-0001',
      invoice_date: '2026-09-01 10:05:00',
      subtotal: 12600,
      tax_amount: 2268,
      total_amount: 24868,
      pdf_path: '/invoices/INV-2026-0001.pdf'
    }
  ],
  maintenance_records: [
    {
      maintenance_id: 1,
      vehicle_id: 6,
      service_date: '2026-08-30',
      service_type: 'Scheduled service',
      service_center: 'Metro Honda Service',
      odometer_reading: 18420,
      service_cost: 6400,
      next_service_due: '2027-02-28',
      remarks: 'Oil, filter and brake inspection.'
    },
    {
      maintenance_id: 2,
      vehicle_id: 5,
      service_date: '2026-08-12',
      service_type: 'Tyre replacement',
      service_center: 'Toyota Authorized Service',
      odometer_reading: 32108,
      service_cost: 18400,
      next_service_due: '2027-02-12',
      remarks: 'All four tyres replaced.'
    }
  ]
};

// Deep copy initial data
const store = JSON.parse(JSON.stringify(initialData));

module.exports = store;
