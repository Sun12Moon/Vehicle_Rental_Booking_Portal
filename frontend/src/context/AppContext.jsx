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

export const DEMO_ADMIN_EMAIL = "admin@rentivo.in";
export const DEMO_ADMIN_PASSWORD = "password123";

const STORAGE_KEY = "rentivo-app-state-v1";

const seedSettings = {
  businessName: "Rentivo Mobility Pvt. Ltd.",
  supportEmail: "care@rentivo.in",
  supportPhone: "+91 1800 234 7864",
  gstPercentage: 18,
  defaultSecurityDeposit: 7500,
  requireLicenceBeforeConfirmation: true,
  sendBookingNotifications: true,
};

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

const initialState = {
  user: null,
  vehicles: seedVehicles,
  categories: seedCategories,
  branches: seedBranches,
  customers: seedCustomers,
  bookings: seedBookings,
  payments: seedPayments,
  maintenance: seedMaintenance,
  settings: seedSettings,
};

const AppContext = createContext(null);

const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const hydrateArray = (value, fallback) => (Array.isArray(value) ? value : fallback);

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
  };
};

const readPersistedState = () => {
  if (typeof window === "undefined") return initialState;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? hydrateState(JSON.parse(stored)) : initialState;
  } catch {
    return initialState;
  }
};

export function AppProvider({ children }) {
  const [state, setState] = useState(readPersistedState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage write failures in demo mode.
    }
  }, [state]);

  const updateKey = (key, nextValue) => {
    setState((previous) => ({
      ...previous,
      [key]:
        typeof nextValue === "function"
          ? nextValue(previous[key])
          : nextValue,
    }));
  };

  const login = (payload = {}) => {
    setState((previous) => {
      const normalizedEmail = String(payload.email || "").toLowerCase();
      const matchedCustomer = previous.customers.find(
        (customer) => customer.email?.toLowerCase() === normalizedEmail,
      );

      const fallbackName = [payload.firstName, payload.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const derivedName = normalizedEmail ? normalizedEmail.split("@")[0] : "Customer";
      const name =
        fallbackName ||
        matchedCustomer?.name ||
        derivedName;

      const [defaultFirst = name, ...defaultRest] = name.split(" ");
      const firstName =
        payload.firstName ||
        matchedCustomer?.firstName ||
        (matchedCustomer?.name ? matchedCustomer.name.split(" ")[0] : defaultFirst);
      const lastName =
        payload.lastName ||
        matchedCustomer?.lastName ||
        (matchedCustomer?.name ? matchedCustomer.name.split(" ").slice(1).join(" ") : defaultRest.join(" "));

      const customerId =
        payload.id ||
        matchedCustomer?.id ||
        (normalizedEmail
          ? `user-${normalizedEmail.replace(/[^a-z0-9]/g, "-")}`
          : `user-${Date.now()}`);

      const user = {
        id: customerId,
        role: payload.role || matchedCustomer?.role || "customer",
        name: `${firstName} ${lastName}`.trim() || name,
        firstName,
        lastName,
        email: payload.email || matchedCustomer?.email || "",
        phone: payload.phone || matchedCustomer?.phone || "",
        licence: payload.licence || matchedCustomer?.licence || "",
        aadhaar: payload.aadhaar || matchedCustomer?.aadhaar || "",
        address: payload.address || matchedCustomer?.address || "",
        emergencyContact: payload.emergencyContact || matchedCustomer?.emergencyContact || "",
        demoAuthPassword:
          payload.demoAuthPassword || matchedCustomer?.demoAuthPassword || "",
        identityVerification: normalizeIdentityVerification(
          payload.identityVerification || matchedCustomer?.identityVerification,
        ),
      };

      if (user.role === "admin") {
        if (normalizedEmail !== DEMO_ADMIN_EMAIL.toLowerCase()) {
          return previous;
        }
        return {
          ...previous,
          user,
        };
      }

      const customerRecord = {
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        licence: user.licence,
        aadhaar: user.aadhaar,
        address: user.address,
        emergencyContact: user.emergencyContact,
        demoAuthPassword: user.demoAuthPassword,
        identityVerification: user.identityVerification,
        status: matchedCustomer?.status || "Active",
        joined:
          matchedCustomer?.joined ||
          new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      };

      const hasCustomer = previous.customers.some(
        (c) => c.id === user.id || (user.email && c.email?.toLowerCase() === user.email.toLowerCase()),
      );

      const nextCustomers = hasCustomer
        ? previous.customers.map((c) =>
            c.id === user.id || (user.email && c.email?.toLowerCase() === user.email.toLowerCase())
              ? { ...c, ...customerRecord }
              : c,
          )
        : [...previous.customers, customerRecord];

      return {
        ...previous,
        user,
        customers: nextCustomers,
      };
    });
  };

  const createBooking = (booking, payment) => {
    setState((previous) => {
      const hasCustomer = previous.customers.some(
        (customer) => customer.id === booking.customerId,
      );
      const customer = previous.user;

      return {
        ...previous,
        bookings: [...previous.bookings, booking],
        payments: [...previous.payments, payment],
        customers:
          hasCustomer || !customer
            ? previous.customers
            : [
                ...previous.customers,
                {
                  id: customer.id,
                  name: customer.name,
                  email: customer.email,
                  phone: customer.phone,
                  identityVerification: normalizeIdentityVerification(
                    customer.identityVerification,
                  ),
                  status: "Active",
                  joined: new Date().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }),
                },
              ],
      };
    });
  };

  const updateProfile = (updates) => {
    setState((previous) => {
      if (!previous.user) return previous;
      const user = {
        ...previous.user,
        ...updates,
        identityVerification: normalizeIdentityVerification(
          updates.identityVerification || previous.user.identityVerification,
        ),
      };
      const customers = previous.customers.map((customer) =>
        customer.id === user.id || customer.email === previous.user.email
          ? {
              ...customer,
              ...updates,
              id: user.id,
              identityVerification: normalizeIdentityVerification(
                updates.identityVerification || customer.identityVerification,
              ),
            }
          : customer,
      );
      const hasCustomer = customers.some((customer) => customer.id === user.id);

      return {
        ...previous,
        user,
        customers: hasCustomer
          ? customers
          : [
              ...customers,
              {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                identityVerification: user.identityVerification,
                status: "Active",
                joined: new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
              },
            ],
      };
    });
  };

  const value = useMemo(
    () => ({
      ...state,
      login,
      createBooking,
      updateProfile,
      logout: () => updateKey("user", null),
      setUser: (nextValue) => updateKey("user", nextValue),
      setVehicles: (nextValue) => updateKey("vehicles", nextValue),
      setCategories: (nextValue) => updateKey("categories", nextValue),
      setBranches: (nextValue) => updateKey("branches", nextValue),
      setCustomers: (nextValue) => updateKey("customers", nextValue),
      setBookings: (nextValue) => updateKey("bookings", nextValue),
      setPayments: (nextValue) => updateKey("payments", nextValue),
      setMaintenance: (nextValue) => updateKey("maintenance", nextValue),
      setSettings: (nextValue) => updateKey("settings", nextValue),
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
