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
  adminApi
} from "../services/api";

export const DEMO_ADMIN_EMAIL = "admin@rentivo.in";
export const DEMO_ADMIN_PASSWORD = "password123";

const STORAGE_KEY = "rentivo-app-state-v1";
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
  provider: null,
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

const hydrateCustomers = (value) =>
  hydrateArray(value, seedCustomers).map((customer) => {
    const seededCustomer = seedCustomers.find(
      (seedCustomer) =>
        seedCustomer.email?.toLowerCase() === customer.email?.toLowerCase(),
    );
    return {
      ...customer,
      demoAuthPassword:
        customer.demoAuthPassword || seededCustomer?.demoAuthPassword || "",
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
            setState(prev => ({
              ...prev,
              user: {
                ...meRes.data.user,
                identityVerification: normalizeIdentityVerification(
                  prev.user?.identityVerification || meRes.data.user?.identityVerification
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
      const response = await authApi.login({
        email: payload.email,
        password: payload.password || (payload.role === 'admin' ? 'Admin@123' : 'Customer@123')
      });

      if (response?.data?.token) {
        const { token, user } = response.data;

        const completeUser = {
          ...user,
          identityVerification: normalizeIdentityVerification(
            payload.identityVerification || user.identityVerification
          )
        };

        setState(prev => ({
          ...prev,
          token,
          user: completeUser
        }));

        return { success: true, user: completeUser };
      }

      throw new Error('Invalid login response from server.');
    } catch (apiErr) {
      console.error('Login failed:', apiErr.message);
      throw apiErr;
    }
  };

  const register = async (payload = {}) => {
    try {
      const response = await authApi.register({
        email: payload.email,
        password: payload.password || 'Customer@123',
        firstName: payload.firstName,
        lastName: payload.lastName,
        phone: payload.phone,
        drivingLicenseNo: payload.licence
      });

      if (response?.data?.token) {
        const { token, user } = response.data;
        const completeUser = {
          ...user,
          identityVerification: normalizeIdentityVerification(
            payload.identityVerification
          )
        };
        setState(prev => ({
          ...prev,
          token,
          user: completeUser
        }));
        return { success: true, user: completeUser };
      }
    } catch (apiErr) {
      console.warn('Backend registration fallback:', apiErr.message);
    }

    return login(payload);
  };

  const createBooking = async (booking, payment) => {
    try {
      // Find numeric vehicle ID if available
      const matchedVehicle = state.vehicles.find(v => v.id === booking.vehicleId || v.vehicle_id === booking.vehicleId);
      const vehicleId = matchedVehicle?.vehicle_id || 1;

      const apiRes = await bookingsApi.createBooking({
        vehicleId,
        pickupDate: booking.pickupDate,
        returnDate: booking.returnDate,
        pickupLocation: booking.branch,
        returnLocation: booking.returnBranch || booking.branch,
        paymentMethod: payment?.method || 'UPI',
        remarks: 'Online portal booking'
      });

      if (apiRes?.data?.booking) {
        const b = apiRes.data.booking;
        const newBooking = {
          ...booking,
          id: `bk-${b.booking_id}`,
          reference: b.booking_reference,
          status: b.booking_status,
          total: b.total_amount,
          invoiceNumber: apiRes.data.invoice?.invoiceNumber
        };

        setState(prev => ({
          ...prev,
          bookings: [newBooking, ...prev.bookings],
          payments: payment ? [payment, ...prev.payments] : prev.payments
        }));
        return newBooking;
      }
    } catch (apiErr) {
      console.warn('API Booking note:', apiErr.message);
      if (apiErr.message.includes('unavailable') || apiErr.message.includes('overlaps')) {
        throw apiErr;
      }
    }

    // Local fallback creation
    setState(previous => ({
      ...previous,
      bookings: [booking, ...previous.bookings],
      payments: payment ? [payment, ...previous.payments] : previous.payments
    }));
    return booking;
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
      logout,
      createBooking,
      updateProfile,
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
