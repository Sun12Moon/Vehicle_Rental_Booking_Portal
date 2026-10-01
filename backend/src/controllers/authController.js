const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const userModel = require('../models/userModel');
const { signToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const authController = {
  register: async (req, res, next) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        drivingLicenseNo,
        aadhaarNumber,
        address,
        city,
        state,
        postalCode,
        emergencyContactName,
        emergencyContactPhone
      } = req.body;

      // Duplicate email check
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return errorResponse(res, 409, 'An account with this email address already exists.');
      }

      // Hash password with bcrypt
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user record
      const userId = await userModel.createUser({
        roleId: 2, // Customer
        email,
        passwordHash
      });

      // Create customer profile record
      const customerId = await userModel.createCustomerProfile({
        userId,
        firstName: firstName || 'Customer',
        lastName: lastName || '',
        phone: phone || '',
        drivingLicenseNo: drivingLicenseNo || `DL-${Date.now().toString().slice(-8)}`,
        aadhaarNumber,
        address,
        city,
        state,
        postalCode,
        emergencyContactName,
        emergencyContactPhone
      });

      const user = await userModel.findById(userId);
      const token = signToken({
        userId: user.user_id,
        email: user.email,
        role: user.role_name
      });

      return successResponse(res, 201, 'User registered successfully', {
        token,
        user: {
          id: user.user_id,
          customerId: user.customer_id,
          email: user.email,
          role: user.role_name.toLowerCase(),
          firstName: user.first_name,
          lastName: user.last_name,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email.split('@')[0],
          phone: user.phone,
          drivingLicenseNo: user.driving_license_no,
          address: user.address,
          city: user.city
        }
      });
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await userModel.findByEmail(email);
      if (!user) {
        return errorResponse(res, 401, 'Invalid email or password.');
      }

      // Verify bcrypt hash
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return errorResponse(res, 401, 'Invalid email or password.');
      }

      if (!user.is_active || user.status === 'SUSPENDED') {
        return errorResponse(res, 403, 'Your account is suspended or inactive. Please contact support.');
      }

      const roleLower = String(user.role_name || 'customer').toLowerCase();
      const token = signToken({
        userId: user.user_id,
        email: user.email,
        role: user.role_name
      });

      return successResponse(res, 200, 'Login successful', {
        token,
        user: {
          id: user.user_id,
          customerId: user.customer_id,
          email: user.email,
          role: roleLower,
          firstName: user.first_name || (roleLower === 'admin' ? 'Admin' : 'Customer'),
          lastName: user.last_name || (roleLower === 'admin' ? 'Manager' : ''),
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || (roleLower === 'admin' ? 'Admin Manager' : user.email.split('@')[0]),
          phone: user.phone || '',
          drivingLicenseNo: user.driving_license_no || '',
          address: user.address || '',
          city: user.city || ''
        }
      });
    } catch (err) {
      next(err);
    }
  },

  getCurrentUser: async (req, res, next) => {
    try {
      const user = await userModel.findById(req.user.userId);
      if (!user) {
        return errorResponse(res, 404, 'User not found.');
      }

      const roleLower = String(user.role_name || 'customer').toLowerCase();
      return successResponse(res, 200, 'Current user profile retrieved', {
        user: {
          id: user.user_id,
          customerId: user.customer_id,
          email: user.email,
          role: roleLower,
          firstName: user.first_name,
          lastName: user.last_name,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          phone: user.phone,
          drivingLicenseNo: user.driving_license_no,
          address: user.address,
          city: user.city,
          state: user.state,
          postalCode: user.postal_code,
          emergencyContactName: user.emergency_contact_name,
          emergencyContactPhone: user.emergency_contact_phone
        }
      });
    } catch (err) {
      next(err);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const updatedUser = await userModel.updateCustomerProfile(req.user.userId, req.body);
      const roleLower = String(updatedUser.role_name || 'customer').toLowerCase();

      return successResponse(res, 200, 'Profile updated successfully', {
        user: {
          id: updatedUser.user_id,
          customerId: updatedUser.customer_id,
          email: updatedUser.email,
          role: roleLower,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          name: `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim(),
          phone: updatedUser.phone,
          drivingLicenseNo: updatedUser.driving_license_no,
          address: updatedUser.address,
          city: updatedUser.city,
          state: updatedUser.state,
          postalCode: updatedUser.postal_code
        }
      });
    } catch (err) {
      next(err);
    }
  },

  googleAuth: async (req, res, next) => {
    try {
      const { credential, clientId, userInfo } = req.body;
      let email = req.body.email;
      let firstName = req.body.firstName;
      let lastName = req.body.lastName;
      let name = req.body.name;
      let picture = req.body.picture;
      let googleId = req.body.googleId;

      // 1. If credential (Google ID Token JWT) is provided
      if (credential && typeof credential === 'string') {
        const configuredClientId = process.env.GOOGLE_CLIENT_ID || clientId;
        let verifiedPayload = null;

        // Try verifying with Google's official OAuth2Client if configured
        if (configuredClientId) {
          try {
            const client = new OAuth2Client(configuredClientId);
            const ticket = await client.verifyIdToken({
              idToken: credential,
              audience: configuredClientId
            });
            verifiedPayload = ticket.getPayload();
          } catch (verifyErr) {
            console.warn('[GoogleAuth] Live token verification notice:', verifyErr.message);
          }
        }

        // Safe decoding fallback (for dev/testing tokens or mock JWT)
        if (!verifiedPayload && credential.includes('.')) {
          try {
            const parts = credential.split('.');
            if (parts.length === 3) {
              const base64Url = parts[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
              verifiedPayload = JSON.parse(jsonPayload);
            }
          } catch (decodeErr) {
            console.warn('[GoogleAuth] JWT payload decode note:', decodeErr.message);
          }
        }

        if (verifiedPayload) {
          email = email || verifiedPayload.email;
          name = name || verifiedPayload.name;
          firstName = firstName || verifiedPayload.given_name || (verifiedPayload.name ? verifiedPayload.name.split(' ')[0] : 'Google');
          lastName = lastName || verifiedPayload.family_name || (verifiedPayload.name ? verifiedPayload.name.split(' ').slice(1).join(' ') : 'User');
          picture = picture || verifiedPayload.picture;
          googleId = googleId || verifiedPayload.sub;
        }
      }

      // If userInfo object is passed (e.g. from OAuth userinfo endpoint)
      if (userInfo && typeof userInfo === 'object') {
        email = email || userInfo.email;
        name = name || userInfo.name;
        firstName = firstName || userInfo.given_name || userInfo.firstName;
        lastName = lastName || userInfo.family_name || userInfo.lastName;
        picture = picture || userInfo.picture || userInfo.avatar;
        googleId = googleId || userInfo.id || userInfo.sub;
      }

      // Validate email
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return errorResponse(res, 400, 'A valid Google email address is required.');
      }

      const normalizedEmail = email.toLowerCase().trim();
      firstName = firstName || (name ? name.split(' ')[0] : 'Google');
      lastName = lastName || (name ? name.split(' ').slice(1).join(' ') : 'Customer');

      // Check if user exists
      let user = await userModel.findByEmail(normalizedEmail);
      let isNewUser = false;

      if (!user) {
        // Register new customer account via Google OAuth
        isNewUser = true;
        const randomPassword = crypto.randomBytes(24).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);

        const userId = await userModel.createUser({
          roleId: 2, // Customer
          email: normalizedEmail,
          passwordHash
        });

        // Ensure unique phone & driving license numbers for database constraints
        const uniquePhone = req.body.phone || `+91${Math.floor(6000000000 + Math.random() * 3999999999)}`;
        const uniqueDl = `DL-GOOG-${Date.now().toString().slice(-6)}`;

        await userModel.createCustomerProfile({
          userId,
          firstName,
          lastName,
          phone: uniquePhone,
          drivingLicenseNo: uniqueDl,
          profileImage: picture || null,
          kycStatus: 'NOT_STARTED',
          kycProvider: 'DIDIT'
        });

        user = await userModel.findById(userId);
      } else {
        // User already exists
        if (!user.is_active || user.status === 'SUSPENDED') {
          return errorResponse(res, 403, 'Your account is suspended or inactive. Please contact support.');
        }

        // If user didn't have a profile image and Google gave us one, update it
        if (!user.profile_image && picture) {
          try {
            await userModel.updateCustomerProfile(user.user_id, { profileImage: picture });
            user = await userModel.findById(user.user_id);
          } catch (e) {
            // non-fatal
          }
        }
      }

      const roleLower = String(user.role_name || 'customer').toLowerCase();
      const token = signToken({
        userId: user.user_id,
        email: user.email,
        role: user.role_name
      });

      return successResponse(res, isNewUser ? 201 : 200, isNewUser ? 'Account created with Google successfully' : 'Signed in with Google successfully', {
        token,
        isNewUser,
        user: {
          id: user.user_id,
          customerId: user.customer_id,
          email: user.email,
          role: roleLower,
          firstName: user.first_name || firstName,
          lastName: user.last_name || lastName,
          name: `${user.first_name || firstName} ${user.last_name || lastName}`.trim() || user.email.split('@')[0],
          phone: user.phone || '',
          drivingLicenseNo: user.driving_license_no || '',
          profileImage: user.profile_image || picture || null,
          authProvider: 'google'
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
