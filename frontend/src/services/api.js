import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Request interceptor attaching JWT Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rentivo_jwt_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for status handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg = error.response?.data?.message || error.message || 'Network error occurred';
    return Promise.reject(new Error(errorMsg));
  }
);

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  googleAuth: (payload) => apiClient.post('/auth/google', payload),
  getCurrentUser: () => apiClient.get('/auth/me'),
  updateProfile: (profileData) => apiClient.put('/auth/profile', profileData)
};

export const vehiclesApi = {
  getVehicles: (params) => apiClient.get('/vehicles', { params }),
  getVehicle: (id) => apiClient.get(`/vehicles/${id}`),
  createVehicle: (data) => apiClient.post('/vehicles', data),
  updateVehicle: (id, data) => apiClient.put(`/vehicles/${id}`, data),
  deleteVehicle: (id) => apiClient.delete(`/vehicles/${id}`),
  getCategories: () => apiClient.get('/vehicles/categories')
};

export const branchesApi = {
  getBranches: () => apiClient.get('/branches'),
  getBranch: (id) => apiClient.get(`/branches/${id}`),
  createBranch: (data) => apiClient.post('/branches', data),
  updateBranch: (id, data) => apiClient.put(`/branches/${id}`, data)
};

export const bookingsApi = {
  checkAvailability: (params) => apiClient.get('/bookings/check-availability', { params }),
  createBooking: (bookingData) => apiClient.post('/bookings', bookingData),
  getMyBookings: () => apiClient.get('/bookings/my-bookings'),
  getBooking: (id) => apiClient.get(`/bookings/${id}`),
  cancelBooking: (id, reason) => apiClient.patch(`/bookings/${id}/cancel`, { reason })
};

export const paymentsApi = {
  createRazorpayOrder: (paymentData) => apiClient.post('/payments/razorpay/order', paymentData),
  verifyRazorpayPayment: (paymentData) => apiClient.post('/payments/razorpay/verify', paymentData),
  process: (paymentData) => apiClient.post('/payments/process', paymentData),
  getInvoice: (bookingId) => apiClient.get(`/payments/invoice/${bookingId}`),
  getAllPayments: () => apiClient.get('/payments/all')
};

export const adminApi = {
  getStats: () => apiClient.get('/admin/dashboard/stats'),
  getBookings: (params) => apiClient.get('/admin/bookings', { params }),
  updateBookingStatus: (id, status, remarks) => apiClient.patch(`/admin/bookings/${id}/status`, { status, remarks }),
  getCustomers: () => apiClient.get('/admin/customers'),
  getMaintenance: () => apiClient.get('/admin/maintenance'),
  createMaintenance: (data) => apiClient.post('/admin/maintenance', data),
  getReports: (type) => apiClient.get('/admin/reports', { params: { type } })
};

export const kycApi = {
  createSession: (data) => apiClient.post('/kyc/session', data || {}),
  getMyStatus: () => apiClient.get('/kyc/my-status'),
  verify: (data) => apiClient.post('/kyc/verify', data),
  verifyWithImages: (formData) => apiClient.post('/kyc/verify-images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  reset: () => apiClient.post('/kyc/reset')
};

export default apiClient;
