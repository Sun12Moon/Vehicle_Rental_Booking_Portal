const db = require('../config/db');
const store = require('./store');

const userModel = {
  findByEmail: async (email) => {
    const normalizedEmail = String(email).toLowerCase().trim();
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT u.*, r.role_name, cp.*
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN customer_profiles cp ON u.user_id = cp.user_id
        WHERE LOWER(u.email) = ? AND u.deleted_at IS NULL
        LIMIT 1
      `;
      const rows = await db.query(sql, [normalizedEmail]);
      return rows[0] || null;
    }

    // Memory Store Fallback
    const user = store.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) return null;
    const role = store.roles.find(r => r.role_id === user.role_id);
    const profile = store.customer_profiles.find(cp => cp.user_id === user.user_id) || {};
    return {
      ...user,
      role_name: role ? role.role_name : 'CUSTOMER',
      ...profile
    };
  },

  findById: async (userId) => {
    const id = Number(userId);
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT u.user_id, u.email, u.role_id, u.is_active, u.status, r.role_name, cp.*
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN customer_profiles cp ON u.user_id = cp.user_id
        WHERE u.user_id = ? AND u.deleted_at IS NULL
        LIMIT 1
      `;
      const rows = await db.query(sql, [id]);
      return rows[0] || null;
    }

    const user = store.users.find(u => u.user_id === id);
    if (!user) return null;
    const role = store.roles.find(r => r.role_id === user.role_id);
    const profile = store.customer_profiles.find(cp => cp.user_id === user.user_id) || {};
    return {
      ...user,
      role_name: role ? role.role_name : 'CUSTOMER',
      ...profile
    };
  },

  createUser: async ({ roleId = 2, email, passwordHash }) => {
    const normalizedEmail = String(email).toLowerCase().trim();
    if (db.getStatus().isConnected) {
      const sql = `
        INSERT INTO users (role_id, email, password_hash, is_active, status, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, TRUE, 'ACTIVE', TRUE, NOW(), NOW())
      `;
      const result = await db.query(sql, [roleId, normalizedEmail, passwordHash]);
      return result.insertId;
    }

    const newId = store.users.length ? Math.max(...store.users.map(u => u.user_id)) + 1 : 1;
    const newUser = {
      user_id: newId,
      role_id: roleId,
      email: normalizedEmail,
      password_hash: passwordHash,
      is_active: true,
      status: 'ACTIVE',
      email_verified: true,
      created_at: new Date()
    };
    store.users.push(newUser);
    return newId;
  },

  createCustomerProfile: async (profileData) => {
    const {
      userId,
      firstName = '',
      lastName = '',
      phone = '',
      drivingLicenseNo = 'DL-' + Date.now(),
      aadhaarNumber = null,
      address = '',
      city = 'Bengaluru',
      state = 'Karnataka',
      country = 'India',
      postalCode = '560001',
      emergencyContactName = null,
      emergencyContactPhone = null,
      kycStatus = 'NOT_STARTED',
      kycProvider = 'DIDIT',
      kycSessionId = null
    } = profileData;

    if (db.getStatus().isConnected) {
      const sql = `
        INSERT INTO customer_profiles (
          user_id, first_name, last_name, phone, driving_license_no, aadhaar_number,
          address, city, state, country, postal_code, emergency_contact_name, emergency_contact_phone,
          kyc_status, kyc_provider, kyc_session_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      const result = await db.query(sql, [
        userId, firstName, lastName, phone, drivingLicenseNo, aadhaarNumber,
        address, city, state, country, postalCode, emergencyContactName, emergencyContactPhone,
        kycStatus, kycProvider, kycSessionId
      ]);
      return result.insertId;
    }

    const newId = store.customer_profiles.length ? Math.max(...store.customer_profiles.map(cp => cp.customer_id)) + 1 : 1;
    const newProfile = {
      customer_id: newId,
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      phone,
      driving_license_no: drivingLicenseNo,
      aadhaar_number: aadhaarNumber,
      address,
      city,
      state,
      country,
      postal_code: postalCode,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      kyc_status: kycStatus,
      kyc_provider: kycProvider,
      kyc_session_id: kycSessionId
    };
    store.customer_profiles.push(newProfile);
    return newId;
  },

  updateCustomerProfile: async (userId, data) => {
    const id = Number(userId);
    if (db.getStatus().isConnected) {
      const sql = `
        UPDATE customer_profiles
        SET first_name = COALESCE(?, first_name),
            last_name = COALESCE(?, last_name),
            phone = COALESCE(?, phone),
            driving_license_no = COALESCE(?, driving_license_no),
            aadhaar_number = COALESCE(?, aadhaar_number),
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            emergency_contact_name = COALESCE(?, emergency_contact_name),
            emergency_contact_phone = COALESCE(?, emergency_contact_phone),
            kyc_status = COALESCE(?, kyc_status),
            kyc_session_id = COALESCE(?, kyc_session_id),
            kyc_verified_at = COALESCE(?, kyc_verified_at),
            updated_at = NOW()
        WHERE user_id = ?
      `;
      await db.query(sql, [
        data.firstName || null,
        data.lastName || null,
        data.phone || null,
        data.drivingLicenseNo || null,
        data.aadhaarNumber || null,
        data.address || null,
        data.city || null,
        data.emergencyContactName || null,
        data.emergencyContactPhone || null,
        data.kycStatus || null,
        data.kycSessionId || null,
        data.kycVerifiedAt || null,
        id
      ]);
      return userModel.findById(id);
    }

    let profile = store.customer_profiles.find(cp => cp.user_id === id);
    if (!profile) {
      await userModel.createCustomerProfile({ userId: id, ...data });
      profile = store.customer_profiles.find(cp => cp.user_id === id);
    } else {
      if (data.firstName !== undefined) profile.first_name = data.firstName;
      if (data.lastName !== undefined) profile.last_name = data.lastName;
      if (data.phone !== undefined) profile.phone = data.phone;
      if (data.drivingLicenseNo !== undefined) profile.driving_license_no = data.drivingLicenseNo;
      if (data.aadhaarNumber !== undefined) profile.aadhaar_number = data.aadhaarNumber;
      if (data.address !== undefined) profile.address = data.address;
      if (data.city !== undefined) profile.city = data.city;
      if (data.emergencyContactName !== undefined) profile.emergency_contact_name = data.emergencyContactName;
      if (data.emergencyContactPhone !== undefined) profile.emergency_contact_phone = data.emergencyContactPhone;
      if (data.kycStatus !== undefined) profile.kyc_status = data.kycStatus;
      if (data.kycSessionId !== undefined) profile.kyc_session_id = data.kycSessionId;
      if (data.kycVerifiedAt !== undefined) profile.kyc_verified_at = data.kycVerifiedAt;
    }
    return userModel.findById(id);
  },

  resetKycProfile: async (userId) => {
    const id = Number(userId);
    if (db.getStatus().isConnected) {
      const sql = `
        UPDATE customer_profiles
        SET kyc_status = 'NOT_STARTED',
            kyc_session_id = NULL,
            kyc_verified_at = NULL,
            aadhaar_number = NULL,
            driving_license_no = NULL,
            updated_at = NOW()
        WHERE user_id = ?
      `;
      await db.query(sql, [id]);
      return userModel.findById(id);
    }

    const profile = store.customer_profiles.find(cp => cp.user_id === id);
    if (profile) {
      profile.kyc_status = 'NOT_STARTED';
      profile.kyc_session_id = null;
      profile.kyc_verified_at = null;
      profile.aadhaar_number = null;
      profile.driving_license_no = null;
    }
    return userModel.findById(id);
  },

  getAllCustomers: async () => {
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT u.user_id, u.email, u.status, u.created_at, cp.*,
               COUNT(b.booking_id) as total_bookings
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN customer_profiles cp ON u.user_id = cp.user_id
        LEFT JOIN bookings b ON cp.customer_id = b.customer_id
        WHERE r.role_name = 'CUSTOMER' AND u.deleted_at IS NULL
        GROUP BY u.user_id, cp.customer_id
        ORDER BY u.created_at DESC
      `;
      return await db.query(sql);
    }

    return store.users
      .filter(u => u.role_id === 2)
      .map(u => {
        const cp = store.customer_profiles.find(p => p.user_id === u.user_id) || {};
        const bookingsCount = store.bookings.filter(b => b.customer_id === cp.customer_id).length;
        return {
          user_id: u.user_id,
          email: u.email,
          status: u.status,
          created_at: u.created_at,
          ...cp,
          name: `${cp.first_name || ''} ${cp.last_name || ''}`.trim() || u.email.split('@')[0],
          total_bookings: bookingsCount
        };
      });
  }
};

module.exports = userModel;
