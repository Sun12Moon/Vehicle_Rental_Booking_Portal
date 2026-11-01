import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  branches as seedBranches,
  bookings as seedBookings,
  categories as seedCategories,
  customers as seedCustomers,
  maintenance as seedMaintenance,
  payments as seedPayments,
  vehicles as seedVehicles,
} from "../data/mockData";
import {
  authApi,
  vehiclesApi,
  branchesApi,
  bookingsApi,
  paymentsApi,
  adminApi,
  kycApi
} from "../services/api";

export const DEMO_ADMIN_EMAIL = import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@rentivo.in';
export const DEMO_USER_EMAIL = import.meta.env.VITE_DEMO_USER_EMAIL || 'user@rentivo.in';

const STORAGE_KEY = "rentivo-app-state-v2";
const TOKEN_KEY = "rentivo_jwt_token";

const seedSettings = {
  businessName: "Rentivo Mobility Pvt. Ltd.",
  supportEmail: "care@rentivo.in",
  supportPhone: "+91 1800 234 7864",
  gstPercentage: 18,
  defaultSecurityDeposit: 7500,
  requireLicenceBeforeConfirmation: true,
  sendBookingNotifications: true,
};

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hydrateArray = (value, fallback) => (Array.isArray(value) ? value : fallback);

export const defaultIdentityVerification = () => ({
  status: "not_started",
  aadhaar: {
    status: "not_added",
    maskedNumber: "",
  },
  drivingLicence: {
    status: "not_added",
    licenceNumberMasked: "",
    dateOfBirth: "",
    expiryDate: "",
  },
  provider: "DIDIT",
  sessionId: null,
  verifiedAt: null,
});

export const normalizeIdentityVerification = (value = {}) => {
  const defaults = defaultIdentityVerification();
  if (!isObject(value)) return defaults;

  return {
    ...defaults,
    ...value,
    aadhaar: {
      ...defaults.aadhaar,
      ...(isObject(value.aadhaar) ? value.aadhaar : {}),
    },
    drivingLicence: {
      ...defaults.drivingLicence,
      ...(isObject(value.drivingLicence) ? value.drivingLicence : {}),
    },
  };
};

const identityVerificationFromUser = (user, fallback) => {
  const rawStatus = String(user?.kycStatus || user?.kyc_status || '').toUpperCase();
  const statusMap = {
    NOT_STARTED: 'not_started',
    PENDING: 'pending',
    IN_REVIEW: 'in_review',
    VERIFIED: 'verified',
    REJECTED: 'rejected'
  };
  if (!statusMap[rawStatus]) {
    return normalizeIdentityVerification(user?.identityVerification || fallback);
  }

  const previous = normalizeIdentityVerification(user?.identityVerification || fallback);
  return normalizeIdentityVerification({
    ...previous,
    status: statusMap[rawStatus],
    provider: user?.kycProvider || user?.kyc_provider || previous.provider || 'DIDIT',
    sessionId: user?.kycSessionId || user?.kyc_session_id || previous.sessionId,
    verifiedAt: user?.kycVerifiedAt || user?.kyc_verified_at || previous.verifiedAt,
    aadhaar: {
      ...previous.aadhaar,
      status: user?.aadhaarMasked ? 'added' : previous.aadhaar.status,
      maskedNumber: user?.aadhaarMasked || previous.aadhaar.maskedNumber
    },
    drivingLicence: {
      ...previous.drivingLicence,
      status: user?.drivingLicenseNo ? 'added' : previous.drivingLicence.status,
      licenceNumberMasked: user?.drivingLicenseNo
        ? `XXXX XXXX ${String(user.drivingLicenseNo).slice(-4)}`
        : previous.drivingLicence.licenceNumberMasked
    }
  });
};

const hydrateCustomers = (value) =>
  hydrateArray(value, seedCustomers).map((customer) => {
    const seededCustomer = seedCustomers.find(
      (seedCustomer) =>
        seedCustomer.email?.toLowerCase() === customer.email?.toLowerCase(),
    );
    return {
      ...customer,
      identityVerification: normalizeIdentityVerification(
        customer.identityVerification || seededCustomer?.identityVerification,
      ),
    };
  });

const initialState = {
  user: null,
  token: null,
  vehicles: seedVehicles,
  categories: seedCategories,
  branches: seedBranches,
  customers: seedCustomers,
  bookings: seedBookings,
  payments: seedPayments,
  maintenance: seedMaintenance,
  settings: seedSettings,
  isApiConnected: false
};

const AppContext = createContext(null);

const hydrateState = (rawState) => {
  if (!isObject(rawState)) return initialState;

  return {
    user: isObject(rawState.user)
      ? {
          role: "customer",
          ...rawState.user,
          identityVerification: normalizeIdentityVerification(
            rawState.user.identityVerification,
          ),
        }
      : null,
    token: rawState.token || null,
    vehicles: hydrateArray(rawState.vehicles, seedVehicles),
    categories: hydrateArray(rawState.categories, seedCategories),
    branches: hydrateArray(rawState.branches, seedBranches),
    customers: hydrateCustomers(rawState.customers),
    bookings: hydrateArray(rawState.bookings, seedBookings),
    payments: hydrateArray(rawState.payments, seedPayments),
    maintenance: hydrateArray(rawState.maintenance, seedMaintenance),
    settings: isObject(rawState.settings)
      ? { ...seedSettings, ...rawState.settings }
      : seedSettings,
    isApiConnected: false
  };
};

export function AppProvider({ children }) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return initialState;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const token = window.localStorage.getItem(TOKEN_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      const hydrated = hydrateState(parsed);
      return {
        ...hydrated,
        token: token || hydrated.token || null
      };
    } catch {
      return initialState;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (state.token) {
        window.localStorage.setItem(TOKEN_KEY, state.token);
      } else {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) {
      // Ignore storage write issues
    }
  }, [state]);

  // Initial Data Fetch & Token Hydration from Backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesRes, branchesRes, categoriesRes] = await Promise.all([
          vehiclesApi.getVehicles().catch(() => null),
          branchesApi.getBranches().catch(() => null),
          vehiclesApi.getCategories().catch(() => null)
        ]);

        if (vehiclesRes?.data) {
          const mappedVehicles = vehiclesRes.data.map(v => ({
            id: `v${v.vehicle_id}`,
            vehicle_id: v.vehicle_id,
            name: `${v.brand} ${v.model}`,
            brand: v.brand,
            model: v.model,
            variant: v.variant || '',
            category: v.category_name,
            transmission: v.transmission ? v.transmission.charAt(0) + v.transmission.slice(1).toLowerCase() : 'Automatic',
            fuel: v.fuel_type ? v.fuel_type.charAt(0) + v.fuel_type.slice(1).toLowerCase() : 'Petrol',
            seats: v.seating_capacity || 5,
            dailyRate: Number(v.daily_rent),
            deposit: Number(v.security_deposit || 7500),
            status: v.status ? v.status.charAt(0) + v.status.slice(1).toLowerCase() : 'Available',
            branch: v.branch_name,
            description: v.description,
            image: v.image_url || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85',
            gallery: [v.image_url]
          }));

          setState(prev => ({
            ...prev,
            vehicles: mappedVehicles.length ? mappedVehicles : prev.vehicles,
            isApiConnected: true
          }));
        }

        if (branchesRes?.data) {
          const mappedBranches = branchesRes.data.map(b => ({
            id: `b${b.branch_id}`,
            branch_id: b.branch_id,
            name: b.branch_name,
            address: b.address,
            city: b.city,
            state: b.state,
            postal: b.postal_code,
            phone: b.phone
          }));
          setState(prev => ({
            ...prev,
            branches: mappedBranches.length ? mappedBranches : prev.branches
          }));
        }

        if (categoriesRes?.data) {
          const mappedCategories = categoriesRes.data.map(c => ({
            id: `c${c.category_id}`,
            name: c.category_name,
            description: c.description,
            count: c.vehicle_count || 4
          }));
          setState(prev => ({
            ...prev,
            categories: mappedCategories.length ? mappedCategories : prev.categories
          }));
        }

        // Hydrate Current User if token exists
        const token = window.localStorage.getItem(TOKEN_KEY);
        if (token) {
          const meRes = await authApi.getCurrentUser().catch(() => null);
          if (meRes?.data?.user) {
            const fetchedUser = meRes.data.user;
            const normalizedRole = String(fetchedUser.role || (fetchedUser.email === DEMO_ADMIN_EMAIL ? 'admin' : 'customer')).toLowerCase();
            setState(prev => ({
              ...prev,
              user: {
                ...fetchedUser,
                role: normalizedRole,
                identityVerification: identityVerificationFromUser(
                  fetchedUser,
                  prev.user?.identityVerification
                )
              },
              token
            }));
          }
        }
      } catch (err) {
        console.warn('API connection notice: running with resilient local store', err);
      }
    };

    fetchData();
  }, []);

  const login = async (payload = {}) => {
    try {
      // Attempt backend login
      const response = await authApi.login({
        email: payload.email,
        password: payload.password
      });

      if (response?.data?.token) {
        const { token, user } = response.data;
        const completeUser = {
          ...user,
          identityVerification: identityVerificationFromUser(user, payload.identityVerification)
        };
        setState(prev => ({
          ...prev,
          token,
          user: completeUser
        }));
        return { success: true, user: completeUser };
      }
    } catch (apiErr) {
      console.warn('Backend login attempt notice:', apiErr.message);
      throw apiErr;
    }

    // Local Fallback if offline
    const normalizedEmail = String(payload.email || "").toLowerCase();
    const isSpecialAdmin = normalizedEmail === DEMO_ADMIN_EMAIL.toLowerCase();
    const role = payload.role || (isSpecialAdmin ? "admin" : "customer");

    const derivedName = normalizedEmail ? normalizedEmail.split("@")[0] : "Customer";
    const user = {
      id: isSpecialAdmin ? 1 : 2,
      role,
      name: `${payload.firstName || (role === 'admin' ? 'Admin' : 'Demo')} ${payload.lastName || (role === 'admin' ? 'Manager' : 'User')}`.trim() || derivedName,
      firstName: payload.firstName || (role === 'admin' ? 'Admin' : 'Demo'),
      lastName: payload.lastName || (role === 'admin' ? 'Manager' : 'User'),
      email: payload.email || '',
      phone: payload.phone || '+91 98452 18203',
      licence: payload.licence || 'KA01 20150012345',
      address: payload.address || 'Bengaluru, Karnataka',
      identityVerification: normalizeIdentityVerification(
        payload.identityVerification || { status: 'not_started', provider: 'DIDIT' }
      )
    };

    setState(prev => ({
      ...prev,
      user
    }));
    return { success: true, user };
  };

  const register = async (payload = {}) => {
    try {
      const response = await authApi.register({
        email: payload.email,
        password: payload.password,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        drivingLicenseNo: payload.licence
      });

      if (response?.data?.token) {
        const { token, user } = response.data;
        const completeUser = {
          ...user,
          identityVerification: identityVerificationFromUser(user, payload.identityVerification)
        };
        setState(prev => ({
          ...prev,
          token,
          user: completeUser
        }));
        return { success: true, user: completeUser };
      }
    } catch (apiErr) {
      console.warn('Backend registration notice:', apiErr.message);
      throw apiErr;
    }

    return login(payload);
  };

  const googleAuth = async (payload = {}) => {
    try {
      const response = await authApi.googleAuth({
        credential: payload.credential,
        clientId: payload.clientId,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.googleId,
        phone: payload.phone
      });

      if (response?.data?.token) {
        const { token, user } = response.data;
        const completeUser = {
          ...user,
          authProvider: 'google',
          identityVerification: identityVerificationFromUser(user, payload.identityVerification)
        };
        setState(prev => ({
          ...prev,
          token,
          user: completeUser
        }));
        return { success: true, user: completeUser };
      }
    } catch (apiErr) {
      console.warn('Backend Google Auth notice:', apiErr.message);
      if (apiErr.message && !apiErr.message.includes('Network') && !apiErr.message.includes('Failed to fetch')) {
        throw apiErr;
      }
    }

    // Local resilient store fallback if backend is offline
    const email = payload.email || 'alex.google@rentivo.in';
    const firstName = payload.firstName || (payload.name ? payload.name.split(' ')[0] : 'Google');
    const lastName = payload.lastName || (payload.name ? payload.name.split(' ').slice(1).join(' ') : 'User');
    const localUser = {
      id: Date.now(),
      role: 'customer',
      email,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      phone: payload.phone || '+91 98452 18203',
      drivingLicenseNo: 'DL-GOOG-' + Date.now().toString().slice(-6),
      profileImage: payload.picture || null,
      authProvider: 'google',
      identityVerification: normalizeIdentityVerification(
        payload.identityVerification || { status: 'not_started', provider: 'DIDIT' }
      )
    };
    setState(prev => ({
      ...prev,
      user: localUser,
      token: 'local_google_token_' + Date.now()
    }));
    return { success: true, user: localUser };
  };

  const createBooking = async (booking) => {
    try {
      // Find numeric vehicle ID if available
      const matchedVehicle = state.vehicles.find(v => v.id === booking.vehicleId || v.vehicle_id === booking.vehicleId);
      const vehicleId = matchedVehicle?.vehicle_id;
      if (!vehicleId) throw new Error('Selected vehicle is not available in the booking catalog.');

      const apiRes = await bookingsApi.createBooking({
        vehicleId,
        pickupDate: booking.pickupDate,
        returnDate: booking.returnDate,
        pickupLocation: booking.branch,
        returnLocation: booking.returnBranch || booking.branch,
        promoCode: booking.promoCode,
        remarks: 'Online portal booking'
      });

      if (apiRes?.data?.booking) {
        const b = apiRes.data.booking;
        const newBooking = {
          ...booking,
          id: `bk-${b.booking_id}`,
          reference: b.booking_reference,
          status: 'Pending',
          total: Number(b.total_amount),
          paymentStatus: 'Pending'
        };

        setState(prev => ({
          ...prev,
          bookings: [newBooking, ...prev.bookings]
        }));
        return newBooking;
      }
    } catch (apiErr) {
      console.warn('API Booking note:', apiErr.message);
      throw apiErr;
    }
    throw new Error('Booking could not be saved. Please try again.');
  };

  const completeBookingPayment = (bookingId, paymentResult) => {
    setState(previous => {
      const booking = previous.bookings.find(item => item.id === bookingId);
      if (!booking) return previous;
      const paidBooking = {
        ...booking,
        status: 'Upcoming',
        paymentStatus: 'Paid',
        invoiceNumber: paymentResult.invoiceNumber,
        transactionReference: paymentResult.transactionReference
      };
      const payment = {
        id: `pay-${paymentResult.transactionReference}`,
        transaction: paymentResult.transactionReference,
        booking: booking.reference,
        customer: previous.user?.name || 'Customer',
        amount: paymentResult.amount,
        method: paymentResult.paymentMethod || 'Razorpay',
        gateway: 'Razorpay Test Mode',
        status: 'Paid',
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      };
      return {
        ...previous,
        bookings: previous.bookings.map(item => item.id === bookingId ? paidBooking : item),
        payments: [payment, ...previous.payments]
      };
    });
  };

  const updateProfile = async (updates) => {
    try {
      await authApi.updateProfile(updates);
    } catch (e) {
      console.warn('API profile update note:', e.message);
    }

    setState(previous => {
      if (!previous.user) return previous;
      const user = {
        ...previous.user,
        ...updates,
        identityVerification: normalizeIdentityVerification(
          updates.identityVerification || previous.user.identityVerification
        )
      };

      const customers = previous.customers.map(c =>
        c.id === user.id || c.email === user.email
          ? {
              ...c,
              ...updates,
              identityVerification: normalizeIdentityVerification(
                updates.identityVerification || c.identityVerification
              )
            }
          : c
      );

      return {
        ...previous,
        user,
        customers
      };
    });
  };

  // DIDIT KYC Flow Helper
  const initiateDiditKyc = async () => {
    const response = await kycApi.createSession({
      callbackUrl: window.location.origin + '/profile?kyc=callback'
    });
    return response.data;
  };

  const verifyDiditKyc = async (verificationData = {}) => {
    // Make call to backend KYC verification
    const response = await kycApi.verify(verificationData);

    const cleanAadhaar = String(verificationData.aadhaarNumber || '').replace(/[\s-]/g, '');
    const cleanDl = String(verificationData.drivingLicenseNo || '').replace(/[\s-]/g, '').toUpperCase();
    const maskedAadhaar = cleanAadhaar ? `XXXX XXXX ${cleanAadhaar.slice(-4)}` : 'XXXX XXXX 1012';
    const maskedDl = cleanDl ? `XXXX XXXX ${cleanDl.slice(-4)}` : 'XXXX XXXX 2345';

    await updateProfile({
      drivingLicenseNo: cleanDl || state.user?.drivingLicenseNo,
      aadhaarNumber: cleanAadhaar || state.user?.aadhaarNumber,
      phone: verificationData.phone || state.user?.phone,
      identityVerification: {
        status: 'verified',
        provider: 'DIDIT',
        sessionId: verificationData.sessionId || `didit_inportal_${Date.now()}`,
        verifiedAt: new Date().toISOString(),
        aadhaar: {
          status: 'added',
          maskedNumber: maskedAadhaar
        },
        drivingLicence: {
          status: 'added',
          licenceNumberMasked: maskedDl,
          dateOfBirth: verificationData.dateOfBirth || state.user?.identityVerification?.drivingLicence?.dateOfBirth || '1996-05-14',
          expiryDate: verificationData.expiryDate || state.user?.identityVerification?.drivingLicence?.expiryDate || '2034-05-14'
        }
      }
    });

    return response?.data || { isVerified: true };
  };

  const verifyKycWithImages = async ({ frontFile, backFile }) => {
    const formData = new FormData();
    formData.append('front_image', frontFile);
    if (backFile) formData.append('back_image', backFile);

    const response = await kycApi.verifyWithImages(formData);

    await updateProfile({
      identityVerification: {
        status: 'verified',
        provider: 'DIDIT',
        sessionId: `didit_img_${Date.now()}`,
        verifiedAt: new Date().toISOString(),
        aadhaar: { status: 'added', maskedNumber: 'XXXX XXXX (scanned)' },
        drivingLicence: { status: 'added', licenceNumberMasked: 'XXXX XXXX (scanned)', dateOfBirth: '', expiryDate: '' }
      }
    });

    return response?.data || { isVerified: true };
  };

  const resetDiditKyc = async () => {
    try {
      await kycApi.reset();
    } catch (e) {
      console.warn('API reset KYC note:', e.message);
    }

    const clearedIdentity = defaultIdentityVerification();

    setState(previous => {
      if (!previous.user) return previous;
      const user = {
        ...previous.user,
        drivingLicenseNo: '',
        aadhaarNumber: '',
        kyc_status: 'NOT_STARTED',
        identityVerification: clearedIdentity
      };

      const customers = previous.customers.map(c =>
        c.id === user.id || c.email === user.email
          ? {
              ...c,
              drivingLicenseNo: '',
              aadhaarNumber: '',
              kyc_status: 'NOT_STARTED',
              identityVerification: clearedIdentity
            }
          : c
      );

      return {
        ...previous,
        user,
        customers
      };
    });

    return { success: true };
  };

  const logout = () => {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
    setState(previous => ({
      ...previous,
      user: null,
      token: null
    }));
  };

  const updateKey = (key, nextValue) => {
    setState(previous => ({
      ...previous,
      [key]: typeof nextValue === "function" ? nextValue(previous[key]) : nextValue,
    }));
  };

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      googleAuth,
      logout,
      createBooking,
      completeBookingPayment,
      updateProfile,
      initiateDiditKyc,
      verifyDiditKyc,
      verifyKycWithImages,
      resetDiditKyc,
      setUser: (v) => updateKey("user", v),
      setVehicles: (v) => updateKey("vehicles", v),
      setCategories: (v) => updateKey("categories", v),
      setBranches: (v) => updateKey("branches", v),
      setCustomers: (v) => updateKey("customers", v),
      setBookings: (v) => updateKey("bookings", v),
      setPayments: (v) => updateKey("payments", v),
      setMaintenance: (v) => updateKey("maintenance", v),
      setSettings: (v) => updateKey("settings", v),
    }),
    [state]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
