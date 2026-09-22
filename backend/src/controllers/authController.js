const bcrypt = require('bcrypt');
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
  }
};

module.exports = authController;
