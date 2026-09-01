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

const hydrateState = (rawState) => {
  if (!isObject(rawState)) return initialState;

  return {
    user: isObject(rawState.user) ? rawState.user : null,
    vehicles: hydrateArray(rawState.vehicles, seedVehicles),
    categories: hydrateArray(rawState.categories, seedCategories),
    branches: hydrateArray(rawState.branches, seedBranches),
    customers: hydrateArray(rawState.customers, seedCustomers),
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
        (customer) => customer.email.toLowerCase() === normalizedEmail,
      );
      const matchedName = matchedCustomer?.name || "";
      const fallbackName = [payload.firstName, payload.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const name = fallbackName || matchedName || "Aditi Menon";
      const [firstName = "Aditi", ...restName] = name.split(" ");

      return {
        ...previous,
        user: {
          id:
            payload.id ||
            matchedCustomer?.id ||
            `user-${normalizedEmail.replace(/[^a-z0-9]/g, "-") || "guest"}`,
          role: payload.role || "customer",
          name,
          firstName: payload.firstName || firstName,
          lastName: payload.lastName || restName.join(" "),
          email: payload.email || matchedCustomer?.email || "",
          phone: payload.phone || matchedCustomer?.phone || "",
        },
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
      const user = { ...previous.user, ...updates };
      const customers = previous.customers.map((customer) =>
        customer.id === user.id || customer.email === previous.user.email
          ? { ...customer, ...updates, id: user.id }
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
