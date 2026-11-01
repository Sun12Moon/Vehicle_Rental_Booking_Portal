import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import * as Icons from "lucide-react";
import { DiditSdk } from "@didit-protocol/sdk-web";
import {
  AppProvider,
  useApp,
  DEMO_ADMIN_EMAIL,
  DEMO_USER_EMAIL,
  normalizeIdentityVerification,
} from "./context/AppContext";
import { kycApi, paymentsApi } from "./services/api";
import GoogleAuthButton, { GoogleLogo } from "./components/GoogleAuthButton";
import "./styles.css";
const INR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
const downloadCsv = (filename, rows) => {
  const headers = Object.keys(rows[0] || {});
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\n");
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
const dateISO = (d) => new Date(d).toISOString().slice(0, 10);
const loadRazorpayCheckout = () => new Promise((resolve, reject) => {
  if (window.Razorpay) return resolve();
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  script.onload = () => resolve();
  script.onerror = () => reject(new Error("Could not load Razorpay Checkout. Check your internet connection and try again."));
  document.body.appendChild(script);
});
const daysBetween = (a, b) =>
  Math.max(1, Math.ceil((new Date(b) - new Date(a)) / 86400000));
const statusClass = (s) =>
  `status ${String(s).toLowerCase().replaceAll(" ", "-")}`;

function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button className={`btn ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
function StatusBadge({ children }) {
  return <span className={statusClass(children)}>{children}</span>;
}
const isVehicleBookable = (vehicle) =>
  String(vehicle?.status || "").toLowerCase() === "available";
const unavailableVehicleMessage = "This vehicle is currently unavailable for booking.";
const unavailablePaymentMessage = "This vehicle is no longer available for booking.";
const notifyLoggedOut = () => window.dispatchEvent(new Event("rentivo:logged-out"));
const identityStatusLabel = (status) =>
  ({
    not_started: "Not Started",
    pending: "Pending",
    in_review: "In Review",
    verified: "Verified",
    rejected: "Rejected",
    not_added: "Not Added",
    added: "Added",
  })[status] || "Not Started";
const getIdentityVerification = (profile) =>
  normalizeIdentityVerification(profile?.identityVerification);
const isIdentityVerified = (profile) =>
  getIdentityVerification(profile).status === "verified";
const maskAadhaar = (value) => "XXXX XXXX " + String(value).slice(-4);
const maskLicence = (value) => {
  const compact = String(value).replace(/\s+/g, "").toUpperCase();
  return "X".repeat(Math.max(0, compact.length - 4)) + compact.slice(-4);
};

const dTableClient = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
const pTableClient = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];
const validateAadhaarClient = (aadhaar) => {
  if (!aadhaar) return { valid: false, error: "Aadhaar number is required." };
  const clean = String(aadhaar).replace(/[\s-]/g, "");
  if (!/^\d{12}$/.test(clean)) return { valid: false, error: "Enter exactly 12 numeric digits with no spaces or letters." };
  if (clean[0] === '0' || clean[0] === '1') return { valid: false, error: "Invalid Aadhaar: UIDAI numbers cannot begin with 0 or 1." };
  if (new Set(clean).size === 1) return { valid: false, error: "Invalid Aadhaar: Dummy sequence with identical repeating digits detected." };
  const knownDummies = ["123456789012", "987654321012", "112233445566", "987654321098"];
  if (knownDummies.includes(clean)) return { valid: false, error: "Invalid Aadhaar: Dummy placeholder Aadhaar number detected." };
  let c = 0;
  const inverted = clean.split("").map(Number).reverse();
  for (let i = 0; i < inverted.length; i++) {
    c = dTableClient[c][pTableClient[i % 8][inverted[i]]];
  }
  if (c !== 0) return { valid: false, error: "Invalid Aadhaar: Checksum verification failed. Please enter a genuine UIDAI Aadhaar number." };
  return { valid: true, clean };
};

const validateDrivingLicenseClient = (dl) => {
  if (!dl) return { valid: false, error: "Driving licence number is required." };
  const clean = String(dl).replace(/[\s-]/g, "").toUpperCase();
  if (clean.length < 10 || clean.length > 20) return { valid: false, error: "Driving licence must be 10-20 alphanumeric characters." };
  const validStates = ["AN","AP","AR","AS","BR","CG","CH","DD","DL","DN","GA","GJ","HP","HR","JH","JK","KA","KL","LA","LD","MH","ML","MN","MP","MZ","NL","OD","PB","PY","RJ","SK","TN","TR","TS","UK","UP","WB"];
  const state = clean.slice(0, 2);
  if (!validStates.includes(state)) return { valid: false, error: `Invalid Driving Licence: "${state}" is not a recognized Indian State/UT code.` };
  const remainder = clean.slice(2);
  if (/^0+$/.test(remainder) || remainder.startsWith("0000")) return { valid: false, error: "Invalid Driving Licence: Dummy licence number detected." };
  return { valid: true, clean };
};

const validatePhoneClient = (phone) => {
  if (!phone) return { valid: false, error: "Aadhaar-linked phone number is required." };
  const clean = String(phone).replace(/[\s-+]/g, "").replace(/^91/, "");
  if (!/^[6-9]\d{9}$/.test(clean)) return { valid: false, error: "Enter a valid 10-digit Indian mobile number (e.g. 9876543210)." };
  if (new Set(clean).size === 1 || clean === "1234567890") return { valid: false, error: "Invalid phone number: Dummy sequence detected." };
  return { valid: true, clean };
};
const isAtLeastAge = (dateValue, age) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  const cutoff = new Date(
    today.getFullYear() - age,
    today.getMonth(),
    today.getDate(),
  );
  return date <= cutoff;
};
const RENTAL_AGREEMENT_VERSION = "1.0";
const agreementStorageKey = (token) => "rentivo-rental-agreement-" + token;
const REGISTRATION_WELCOME_KEY = "rentivo-registration-welcome";
const makeAgreementToken = () =>
  "agr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
const readAgreementRecord = (token) => {
  if (!token || typeof window === "undefined") return null;
  try {
    return JSON.parse(window.sessionStorage.getItem(agreementStorageKey(token)));
  } catch {
    return null;
  }
};
const agreementMatchesTrip = (record, q, vehicleId) =>
  Boolean(
    record?.rentalAgreementAccepted &&
      record.vehicleId === vehicleId &&
      record.pickup === (q.get("pickup") || "") &&
      record.returnDate === (q.get("return") || "") &&
      record.from === decodeURIComponent(q.get("from") || "") &&
      record.to === decodeURIComponent(q.get("to") || q.get("from") || "") &&
      record.version === RENTAL_AGREEMENT_VERSION,
  );
function VerificationGate() {
  return (
    <div className="verification-gate" role="alert">
      <Icons.ShieldAlert size={18} />
      <div>
        <b>Identity verification is required before booking a vehicle.</b>
        <p>This is a frontend check for the prototype. Verification will be completed after the verification service is integrated.</p>
        <Link className="btn secondary small" to="/profile#identity-verification">
          Go to Profile / Identity Verification
        </Link>
      </div>
    </div>
  );
}
function FormInput({ label, error, ...props }) {
  const inputId = props.id || props.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={errorId}
      />
      {error && <small id={errorId} className="error" role="alert">{error}</small>}
    </label>
  );
}
function EmptyState({
  title = "Nothing to show yet",
  text = "Try changing your filters or check back soon.",
}) {
  return (
    <div className="empty">
      <Icons.Inbox size={34} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function LoadingState() {
  return (
    <div className="loading">
      <span />
      Loading Rentivo…
    </div>
  );
}
function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose}>
            <Icons.X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function Navbar() {
  const { user, logout } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="navbar">
      <Link className="brand" to="/" onClick={() => setMobileOpen(false)}>
        <span>R</span> Rentivo
      </Link>
      <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-label="Toggle navigation menu">
        {mobileOpen ? <Icons.X /> : <Icons.Menu />}
      </button>
      <div className={`mobile-menu ${mobileOpen ? "open" : ""}`}>
        <nav>
          <NavLink end to="/" onClick={() => setMobileOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/cars" onClick={() => setMobileOpen(false)}>Cars</NavLink>
          {user && user.role !== "admin" && (
            <>
              <NavLink to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
              <NavLink to="/bookings" onClick={() => setMobileOpen(false)}>My Bookings</NavLink>
            </>
          )}
          <a href="/#offers" onClick={() => setMobileOpen(false)}>Offers</a>
          <a href="/#about" onClick={() => setMobileOpen(false)}>About</a>
          <a href="/#contact" onClick={() => setMobileOpen(false)}>Contact</a>
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              {user.role === "admin" && (
                <Link className="btn small secondary" to="/admin" onClick={() => setMobileOpen(false)}>
                  Admin Console
                </Link>
              )}
              <Link className="profile-link" to="/profile" onClick={() => setMobileOpen(false)}>
                Hi, {user.firstName || user.name}
              </Link>
              <Button variant="ghost" onClick={() => { logout(); notifyLoggedOut(); setMobileOpen(false); }}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link className="btn small" to="/register" onClick={() => setMobileOpen(false)}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer id="contact">
      <div>
        <Link className="brand" to="/">
          <span>R</span> Rentivo
        </Link>
        <p>Confident journeys, thoughtfully made simple.</p>
      </div>
      <div>
        <h4>Explore</h4>
        <Link to="/cars">Find a vehicle</Link>
        <a href="/#offers">Offers</a>
        <Link to="/bookings">My bookings</Link>
      </div>
      <div>
        <h4>Support</h4>
        <p>+91 1800 234 7864</p>
        <p>care@rentivo.in</p>
        <p>Mon–Sun, 8am–10pm</p>
      </div>
      <small>© 2026 Rentivo Mobility Pvt. Ltd. All rights reserved.</small>
    </footer>
  );
}
function CustomerLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}

function SearchWidget({ compact = false }) {
  const nav = useNavigate();
  const [values, setValues] = useState({
    location: "Bengaluru Airport",
    pickup: dateISO(new Date(Date.now() + 86400000)),
    return: dateISO(new Date(Date.now() + 3 * 86400000)),
  });
  const submit = (e) => {
    e.preventDefault();
    if (values.return <= values.pickup)
      return alert("Return date must be after the pickup date.");
    nav(
      `/cars?location=${encodeURIComponent(values.location)}&pickup=${values.pickup}&return=${values.return}`,
    );
  };
  return (
    <form
      className={`search-widget ${compact ? "compact" : ""}`}
      onSubmit={submit}
    >
      <FormInput
        label="Pickup location"
        value={values.location}
        onChange={(e) => setValues({ ...values, location: e.target.value })}
      />
      <FormInput
        label="Pickup date"
        type="date"
        min={dateISO(new Date())}
        value={values.pickup}
        onChange={(e) => setValues({ ...values, pickup: e.target.value })}
      />
      <FormInput
        label="Return date"
        type="date"
        min={values.pickup}
        value={values.return}
        onChange={(e) => setValues({ ...values, return: e.target.value })}
      />
      <Button type="submit">
        <Icons.Search size={18} /> Search cars
      </Button>
    </form>
  );
}
function VehiclePhotoCarousel({ vehicle, className = "" }) {
  const photos = vehicle.gallery?.length ? vehicle.gallery : [vehicle.image].filter(Boolean);
  const [index, setIndex] = useState(0);
  const hasMultiple = photos.length > 1;
  const goTo = (nextIndex) => setIndex((nextIndex + photos.length) % photos.length);

  return (
    <div className={"vehicle-carousel " + className}>
      <img src={photos[index]} alt={vehicle.name + " photo " + (index + 1)} />
      {hasMultiple && (
        <>
          <button type="button" className="carousel-control prev" aria-label="Previous vehicle photo" onClick={() => goTo(index - 1)}>
            <Icons.ChevronLeft size={20} />
          </button>
          <button type="button" className="carousel-control next" aria-label="Next vehicle photo" onClick={() => goTo(index + 1)}>
            <Icons.ChevronRight size={20} />
          </button>
          <span className="carousel-count" aria-live="polite">{index + 1} / {photos.length}</span>
        </>
      )}
    </div>
  );
}
function VehicleCard({ vehicle }) {
  const bookable = isVehicleBookable(vehicle);
  return (
    <article className="vehicle-card">
      <VehiclePhotoCarousel vehicle={vehicle} className="card-carousel" />
      <div className="vehicle-card-body">
        <div className="card-top">
          <div>
            <p className="eyebrow">{vehicle.category}</p>
            <h3>{vehicle.name}</h3>
          </div>
          <StatusBadge>{vehicle.status}</StatusBadge>
        </div>
        <div className="features">
          <span><Icons.GitBranch size={15} />{vehicle.transmission}</span>
          <span><Icons.Fuel size={15} />{vehicle.fuel}</span>
          <span><Icons.Users size={15} />{vehicle.seats} seats</span>
          <span><Icons.Gauge size={15} />{vehicle.currentKilometres || "Kilometres unavailable"}</span>
        </div>
        <div className="vehicle-card-footer">
          <div className="vehicle-card-price">
            <strong>{INR(vehicle.dailyRate)}</strong>
            <small>/ day</small>
          </div>
          <div className="vehicle-card-actions">
            <Link className="btn secondary small" to={"/cars/" + vehicle.id}>Details</Link>
            {bookable ? (
              <Link className="btn small" to={"/booking?vehicle=" + vehicle.id}>Book now</Link>
            ) : (
              <button type="button" className="btn small unavailable-action" disabled aria-disabled="true">
                Unavailable
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
function PriceBreakdown({ vehicle, days = 3, discount = 0 }) {
  const subtotal = vehicle.dailyRate * days,
    tax = Math.round((subtotal - discount) * 0.18),
    total = subtotal - discount + tax + vehicle.deposit;
  return (
    <div className="breakdown">
      <div>
        <span>Daily rental × {days}</span>
        <b>{INR(subtotal)}</b>
      </div>
      {discount > 0 && (
        <div>
          <span>Rentivo discount</span>
          <b className="green">−{INR(discount)}</b>
        </div>
      )}
      <div>
        <span>GST (18%)</span>
        <b>{INR(tax)}</b>
      </div>
      <div>
        <span>Refundable security deposit</span>
        <b>{INR(vehicle.deposit)}</b>
      </div>
      <div className="total">
        <strong>Total payable</strong>
        <strong>{INR(total)}</strong>
      </div>
    </div>
  );
}

function Home() {
  const { vehicles, categories } = useApp();
  return (
    <CustomerLayout>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow blue">PREMIUM VEHICLE RENTALS</p>
          <h1>
            Rent your dream vehicle, <em>on your terms.</em>
          </h1>
          <p>
            From city commutes to long escapes, find a dependable vehicle at a
            transparent daily price.
          </p>
        </div>
        <img
          className="hero-car"
          src={vehicles[0].image}
          alt="Premium rental SUV"
        />
        <SearchWidget />
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow blue">HANDPICKED FOR YOU</p>
            <h2>Popular vehicles</h2>
          </div>
          <Link to="/cars" className="text-link">
            Explore all cars <Icons.ArrowRight size={17} />
          </Link>
        </div>
        <div className="vehicle-grid">
          {vehicles.slice(0, 3).map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      </section>
      <section className="section tint">
        <div className="section-head">
          <div>
            <p className="eyebrow blue">FIND YOUR MATCH</p>
            <h2>Every journey has a category</h2>
          </div>
        </div>
        <div className="category-grid">
          {categories.map((c) => (
            <Link
              to={`/cars?category=${c.name}`}
              className="category"
              key={c.id}
            >
              <Icons.CarFront />
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <span>
                {c.count} vehicles <Icons.ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section id="about" className="section split">
        <div>
          <p className="eyebrow blue">WHY RENTIVO</p>
          <h2>Made for uncomplicated travel.</h2>
          <p>
            We pair well-maintained vehicles with clear pricing and people-first
            support, so the road ahead feels effortless.
          </p>
        </div>
        <div className="benefits">
          {[
            [
              Icons.ShieldCheck,
              "Verified & insured",
              "Every vehicle is vetted before every handover.",
            ],
            [
              Icons.MapPin,
              "Multi-branch convenience",
              "Pick up and return across our growing city network.",
            ],
            [
              Icons.Headphones,
              "Always-on support",
              "Travel confidently with help just a call away.",
            ],
          ].map(([I, t, d]) => (
            <div key={t}>
              <I />
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="section steps-section">
        <p className="eyebrow blue center">HOW IT WORKS</p>
        <h2 className="center">Book in three easy steps</h2>
        <div className="steps">
          {[
            ["01", "Choose", "Search by dates, city and vehicle style."],
            ["02", "Reserve", "Review the transparent total and pay securely."],
            ["03", "Drive", "Collect from your chosen branch and enjoy."],
          ].map((x) => (
            <div key={x[0]}>
              <b>{x[0]}</b>
              <h3>{x[1]}</h3>
              <p>{x[2]}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="offers" className="offer">
        <div>
          <p className="eyebrow">WEEKEND ESCAPE</p>
          <h2>Save 15% on your next weekend drive.</h2>
          <p>
            Use code <b>WEEKEND15</b> at checkout. Valid on rentals of 2 days or
            more.
          </p>
        </div>
        <Link className="btn light" to="/cars">
          Find your ride
        </Link>
      </section>
      <section className="section testimonials">
        <p className="eyebrow blue center">TRAVELLERS LOVE US</p>
        <h2 className="center">Reliable from reservation to return.</h2>
        <div>
          {[
            "“The car was spotless and pickup took less than five minutes. Rentivo is my go-to for business trips.”",
            "“Clear pricing, great service and exactly the SUV we booked. A genuinely smooth experience.”",
            "“I loved being able to pick up in Bengaluru and return in Mysuru. So convenient.”",
          ].map((q, i) => (
            <blockquote key={q}>
              {q}
              <footer>
                — {["Aditi Menon", "Rohan Shah", "Nisha Iyer"][i]}
              </footer>
            </blockquote>
          ))}
        </div>
      </section>
      <section className="cta">
        <h2>Where will the road take you?</h2>
        <p>Reserve a vehicle that fits the way you travel.</p>
        <Link className="btn light" to="/cars">
          Browse vehicles
        </Link>
      </section>
    </CustomerLayout>
  );
}

function Cars() {
  const { vehicles, categories } = useApp();
  const [filters, setFilters] = useState({
    category: "All",
    transmission: "All",
    fuel: "All",
    seats: "All",
    sort: "popular",
  });
  const filtered = useMemo(
    () =>
      vehicles
        .filter(
          (v) =>
            (filters.category === "All" || v.category === filters.category) &&
            (filters.transmission === "All" ||
              v.transmission === filters.transmission) &&
            (filters.fuel === "All" || v.fuel === filters.fuel) &&
            (filters.seats === "All" || String(v.seats) === filters.seats),
        )
        .sort((a, b) =>
          filters.sort === "price" ? a.dailyRate - b.dailyRate : 0,
        ),
    [filters],
  );
  const choices = (label, key, opts) => (
    <label className="field">
      <span>{label}</span>
      <select
        value={filters[key]}
        onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
      >
        {opts.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
  return (
    <CustomerLayout>
      <section className="page-title">
        <p className="eyebrow blue">FIND YOUR RIDE</p>
        <h1>Vehicles for every plan</h1>
        <p>
          Available from trusted Rentivo branches, with insurance and support
          included.
        </p>
      </section>
      <div className="cars-layout">
        <aside className="filters">
          <h3>Filter vehicles</h3>
          {choices("Category", "category", [
            "All",
            ...categories.map((c) => c.name),
          ])}
          {choices("Transmission", "transmission", [
            "All",
            "Automatic",
            "Manual",
          ])}
          {choices("Fuel type", "fuel", [
            "All",
            "Petrol",
            "Diesel",
            "Electric",
            "Hybrid",
          ])}
          {choices("Seating", "seats", ["All", "4", "5", "7"])}
          <Button
            variant="secondary"
            onClick={() =>
              setFilters({
                category: "All",
                transmission: "All",
                fuel: "All",
                seats: "All",
                sort: "popular",
              })
            }
          >
            Clear filters
          </Button>
        </aside>
        <section className="results">
          <div className="results-head">
            <p>
              <b>{filtered.length}</b> vehicles available
            </p>
            {choices("Sort by", "sort", ["popular", "price"])}
          </div>
          <div className="vehicle-grid">
            {filtered.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
          {!filtered.length && (
            <EmptyState title="No vehicles match these filters" />
          )}
        </section>
      </div>
    </CustomerLayout>
  );
}
function VehicleDetails() {
  const { vehicles } = useApp();
  const { id } = useParams(),
    v = vehicles.find((x) => x.id === id) || vehicles[0];
  const bookable = isVehicleBookable(v);
  return (
    <CustomerLayout>
      <div className="detail-page">
        <div>
          <VehiclePhotoCarousel vehicle={v} className="detail-carousel" />
          <p className="eyebrow blue">{v.category} · {v.branch}</p>
          <h1>{v.name}</h1>
          <p className="lead">{v.description}</p>
          <section className="specs">
            <h2>Vehicle specifications</h2>
            {[
              ["Vehicle", v.name],
              ["Brand", v.brand],
              ["Model", v.model],
              ["Vehicle type", v.category],
              ["Variant", v.variant],
              ["Registration / model year", v.year],
              ["Colour", v.colour],
              ["Fuel type", v.fuel],
              ["Transmission", v.transmission],
              ["Engine", v.engine],
              ["Seating capacity", v.seats + " seats"],
              ["Mileage", v.mileage],
              ["Current Kilometres", v.currentKilometres || "Not available"],
              ["Daily rental price", INR(v.dailyRate)],
              ["Security deposit", INR(v.deposit)],
              ["Availability", v.status],
            ].map(([a, b]) => (
              <div key={a}><span>{a}</span><b>{b}</b></div>
            ))}
          </section>
        </div>
        <aside className="booking-panel">
          <StatusBadge>{v.status}</StatusBadge>
          <h2>{INR(v.dailyRate)} <small>/ day</small></h2>
          <p>Current Kilometres: {v.currentKilometres || "Not available"}</p>
          <p>Security deposit: {INR(v.deposit)}</p>
          <hr />
          <p>Includes basic insurance and 24/7 roadside assistance.</p>
          {bookable ? (
            <Link className="btn full" to={"/booking?vehicle=" + v.id}>Book this vehicle <Icons.ArrowRight size={17} /></Link>
          ) : (
            <button type="button" className="btn full unavailable-action" disabled aria-disabled="true">
              Currently unavailable
            </button>
          )}
        </aside>
      </div>
    </CustomerLayout>
  );
}

function RentalAgreementPanel({ read, accepted, error, onRead, onAcceptedChange }) {
  const handleScroll = (event) => {
    const target = event.currentTarget;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 8) onRead();
  };

  return (
    <section className="agreement-card" aria-labelledby="rental-agreement-title">
      <div className="agreement-heading">
        <div>
          <p className="eyebrow blue">RENTAL AGREEMENT</p>
          <h2 id="rental-agreement-title">Vehicle Rental & Damage Responsibility Agreement</h2>
        </div>
        <StatusBadge>{read ? "Read" : "Read Required"}</StatusBadge>
      </div>
      <div className="agreement-copy" tabIndex="0" onScroll={handleScroll}>
        <h3>1. Vehicle Condition</h3>
        <p>The customer acknowledges that the vehicle is provided in the condition described or displayed at the time of handover and agrees to take reasonable care of the vehicle throughout the rental period.</p>
        <h3>2. Customer Responsibility</h3>
        <p>The customer is responsible for the vehicle during the rental period and must operate and use it responsibly and in accordance with applicable laws and the rental terms.</p>
        <h3>3. Damage Responsibility</h3>
        <p>The customer may be responsible for the cost of repairing damage to the vehicle that occurs during the rental period, subject to the applicable rental terms, exclusions, insurance coverage, and any legally applicable limitations.</p>
        <h3>4. Accidents and Incidents</h3>
        <p>The customer must promptly report accidents, theft, loss, or other significant incidents involving the vehicle to the rental provider and, where required, the appropriate authorities.</p>
        <h3>5. Inspection</h3>
        <p>The customer acknowledges that vehicle condition may be inspected before and after the rental period. Any newly identified damage may be documented and assessed according to the applicable rental terms.</p>
        <h3>6. Prohibited Use</h3>
        <p>The customer agrees not to use the vehicle for prohibited, unlawful, or unauthorized purposes or in a manner that violates the rental terms.</p>
        <h3>7. Charges for Damage</h3>
        <p>Where the customer is determined to be responsible for covered damage, the applicable repair or related charges may be payable by the customer in accordance with the rental terms.</p>
        <h3>8. Acknowledgement</h3>
        <p>The customer confirms that they have read and understood the vehicle rental and damage responsibility terms before proceeding with the booking. This frontend prototype agreement has not been legally reviewed.</p>
      </div>
      <label className="check-row agreement-check">
        <input type="checkbox" name="rentalAgreementAccepted" checked={accepted} disabled={!read} aria-invalid={error ? "true" : undefined} aria-describedby={error ? "rental-agreement-error" : "rental-agreement-help"} onChange={(event) => onAcceptedChange(event.target.checked)} />
        I have read and agree to the Vehicle Rental & Damage Responsibility Agreement.
      </label>
      <small id="rental-agreement-help" className="agreement-help">Scroll to the bottom of the agreement to enable this checkbox.</small>
      {error && <small id="rental-agreement-error" className="error" role="alert">{error}</small>}
    </section>
  );
}
function Booking() {
  const { vehicles, branches, user, customers } = useApp();
  const nav = useNavigate();
  const selected =
    new URLSearchParams(location.search).get("vehicle") || vehicles[0].id;
  const [verificationBlocked, setVerificationBlocked] = useState(false);
  const [agreementRead, setAgreementRead] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementError, setAgreementError] = useState("");
  const [vehicleId, setVehicleId] = useState(selected),
    [form, setForm] = useState({
      pickup: dateISO(new Date(Date.now() + 86400000)),
      return: dateISO(new Date(Date.now() + 3 * 86400000)),
      pickupLocation: branches[0].name,
      returnLocation: branches[0].name,
      code: "",
    });
  const currentCustomer = user;
  const v = vehicles.find((x) => x.id === vehicleId) || vehicles[0];
  const bookable = isVehicleBookable(v);
  const days = daysBetween(form.pickup, form.return),
    valid = form.return > form.pickup;
  const reserve = (e) => {
    e.preventDefault();
    if (!valid || !bookable) return;
    if (!isIdentityVerified(currentCustomer)) {
      setVerificationBlocked(true);
      return;
    }
    setVerificationBlocked(false);
    if (!agreementRead || !agreementAccepted) {
      setAgreementError("You must read and agree to the Vehicle Rental & Damage Responsibility Agreement before continuing.");
      return;
    }
    const agreementToken = makeAgreementToken();
    const agreementAcceptedAt = new Date().toISOString();
    window.sessionStorage.setItem(
      agreementStorageKey(agreementToken),
      JSON.stringify({
        rentalAgreementAccepted: true,
        rentalAgreementAcceptedAt: agreementAcceptedAt,
        version: RENTAL_AGREEMENT_VERSION,
        vehicleId: v.id,
        pickup: form.pickup,
        returnDate: form.return,
        from: form.pickupLocation,
        to: form.returnLocation,
      }),
    );
    const params = new URLSearchParams({
      vehicle: v.id,
      pickup: form.pickup,
      return: form.return,
      from: form.pickupLocation,
      to: form.returnLocation,
      code: form.code,
      agreement: agreementToken,
    });
    nav("/payment?" + params.toString());
  };
  return (
    <CustomerLayout>
      <div className="flow-page">
        <section>
          <p className="eyebrow blue">STEP 1 OF 2</p>
          <h1>Plan your rental</h1>
          <form className="form-card" onSubmit={reserve}>
            <label className="field">
              <span>Vehicle</span>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                {vehicles.map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name} — {INR(x.dailyRate)}/day
                  </option>
                ))}
              </select>
            </label>
            <div className="two-col">
              <FormInput
                label="Pickup date"
                type="date"
                min={dateISO(new Date())}
                value={form.pickup}
                onChange={(e) => setForm({ ...form, pickup: e.target.value })}
              />
              <FormInput
                label="Return date"
                type="date"
                min={form.pickup}
                value={form.return}
                onChange={(e) => setForm({ ...form, return: e.target.value })}
              />
            </div>
            {!valid && (
              <p className="error">Return date must be after pickup date.</p>
            )}
            {!bookable && (
              <div className="verification-gate" role="alert">
                <Icons.AlertTriangle size={18} />
                <div>
                  <b>{unavailableVehicleMessage}</b>
                  <p>You can still review this vehicle, but reservations are disabled while it is {String(v.status).toLowerCase()}.</p>
                  <Link className="btn secondary small" to={"/cars/" + v.id}>Back to vehicle details</Link>
                </div>
              </div>
            )}
            {verificationBlocked && <VerificationGate />}
            <div className="two-col">
              <label className="field">
                <span>Pickup branch</span>
                <select
                  value={form.pickupLocation}
                  onChange={(e) =>
                    setForm({ ...form, pickupLocation: e.target.value })
                  }
                >
                  {branches.map((x) => (
                    <option key={x.id}>{x.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Return branch</span>
                <select
                  value={form.returnLocation}
                  onChange={(e) =>
                    setForm({ ...form, returnLocation: e.target.value })
                  }
                >
                  {branches.map((x) => (
                    <option key={x.id}>{x.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <FormInput
              label="Promotion code (optional)"
              placeholder="e.g. WEEKEND15"
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
            />
            <RentalAgreementPanel
              read={agreementRead}
              accepted={agreementAccepted}
              error={agreementError}
              onRead={() => setAgreementRead(true)}
              onAcceptedChange={(checked) => {
                setAgreementAccepted(checked);
                if (checked) setAgreementError("");
              }}
            />
            <Button className="full" type="submit" disabled={!valid || !bookable}>
              Continue to payment <Icons.ArrowRight size={17} />
            </Button>
          </form>
        </section>
        <aside>
          <div className="booking-panel">
            <VehiclePhotoCarousel vehicle={v} className="summary-carousel" />
            <h3>{v.name}</h3>
            <p className="summary-spec"><b>Current Kilometres:</b> {v.currentKilometres || "Not available"}</p>
            <p>
              {days} rental day{days !== 1 ? "s" : ""} · {form.pickupLocation}
            </p>
            <PriceBreakdown
              vehicle={v}
              days={days}
              discount={
                form.code === "WEEKEND15" && days >= 2
                  ? Math.round(v.dailyRate * days * 0.15)
                  : 0
              }
            />
          </div>
        </aside>
      </div>
    </CustomerLayout>
  );
}
function Payment() {
  const { vehicles, user, createBooking, completeBookingPayment } = useApp();
  const nav = useNavigate();
  const q = new URLSearchParams(location.search),
    v = vehicles.find((x) => x.id === q.get("vehicle")) || vehicles[0],
    days = daysBetween(
      q.get("pickup") || dateISO(new Date()),
      q.get("return") || dateISO(new Date(Date.now() + 86400000)),
    );
  const code = q.get("code") || "";
  const currentCustomer = user;
  const identityVerified = isIdentityVerified(currentCustomer);
  const bookable = isVehicleBookable(v);
  const agreementToken = q.get("agreement") || "";
  const agreementRecord = readAgreementRecord(agreementToken);
  const agreementAccepted = agreementMatchesTrip(agreementRecord, q, v.id);
  const [state, setState] = useState("ready"),
    [bookingError, setBookingError] = useState("");
  const subtotal = v.dailyRate * days,
    discount = code === "WEEKEND15" && days >= 2 ? Math.round(subtotal * 0.15) : 0,
    tax = Math.round((subtotal - discount) * 0.18),
    total = subtotal - discount + tax + v.deposit;
  const pay = async () => {
    if (!identityVerified || !agreementAccepted || !bookable || state === "processing") return;
    setBookingError("");
    setState("processing");
    try {
      await loadRazorpayCheckout();
      const booking = await createBooking({
        vehicleId: v.id,
        customerId: user?.id,
        pickupDate: q.get("pickup") || dateISO(new Date()),
        returnDate: q.get("return") || dateISO(new Date(Date.now() + 86400000)),
        days,
        branch: decodeURIComponent(q.get("from") || v.branch),
        returnBranch: decodeURIComponent(q.get("to") || q.get("from") || v.branch),
        dailyRate: v.dailyRate,
        subtotal,
        discount,
        tax,
        deposit: v.deposit,
        total,
        promoCode: code,
        paymentMethod: "Razorpay",
        paymentStatus: "Pending",
        rentalAgreementAccepted: true,
        rentalAgreementAcceptedAt: agreementRecord.rentalAgreementAcceptedAt,
        rentalAgreementVersion: agreementRecord.version,
      });
      const bookingId = Number(booking.id.replace("bk-", ""));
      const orderResponse = await paymentsApi.createRazorpayOrder({ bookingId });
      const order = orderResponse?.data;
      if (!order?.orderId || !order?.keyId) throw new Error("Razorpay did not return a valid test order.");

      let verificationStarted = false;
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Rentivo Mobility",
        description: `Vehicle rental ${order.bookingReference}`,
        order_id: order.orderId,
        prefill: {
          name: user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(" "),
          email: user?.email || "",
          contact: user?.phone || ""
        },
        theme: { color: "#2563a6" },
        modal: {
          ondismiss: () => {
            if (!verificationStarted) {
              setState("ready");
              setBookingError("Payment was cancelled. No payment was confirmed.");
            }
          }
        },
        handler: async (paymentResponse) => {
          verificationStarted = true;
          try {
            const verifiedResponse = await paymentsApi.verifyRazorpayPayment({
              bookingId,
              ...paymentResponse
            });
            const verified = verifiedResponse?.data;
            if (verified?.status !== "COMPLETED") throw new Error("Payment verification did not complete.");
            completeBookingPayment(booking.id, verified);
            nav(`/booking-confirmation?booking=${booking.id}`);
          } catch (err) {
            setState("ready");
            setBookingError(err.message || "We could not verify the payment. The booking remains pending.");
          }
        }
      });
      checkout.on("payment.failed", (event) => {
        setState("ready");
        setBookingError(event.error?.description || "Razorpay test payment failed. Please try again.");
      });
      checkout.open();
    } catch (err) {
      setState("ready");
      setBookingError(err.message || "Unable to start Razorpay test checkout.");
    }
  };
  return (
    <CustomerLayout>
      <div className="flow-page">
        <section>
          <p className="eyebrow blue">STEP 2 OF 2</p>
          <h1>Secure payment</h1>
          <div className="payment-card">
            {!bookable && (
              <div className="verification-gate" role="alert">
                <Icons.AlertTriangle size={18} />
                <div>
                  <b>{unavailablePaymentMessage}</b>
                  <p>Please choose another available vehicle before completing payment.</p>
                  <Link className="btn secondary small" to="/cars">Back to Cars</Link>
                </div>
              </div>
            )}
            {!identityVerified && <VerificationGate />}
            {identityVerified && !agreementAccepted && (
              <div className="verification-gate" role="alert">
                <Icons.FileWarning size={18} />
                <div>
                  <b>Please read and accept the Vehicle Rental & Damage Responsibility Agreement before completing this booking.</b>
                  <p>Return to the booking step and complete the agreement before payment.</p>
                  <Link className="btn secondary small" to={"/booking?vehicle=" + v.id}>Back to booking agreement</Link>
                </div>
              </div>
            )}
            <div className="gateway">
              <span>rzp</span>
              <div>
                <b>Razorpay</b>
                <small>Razorpay test mode</small>
              </div>
              <Icons.LockKeyhole size={18} />
            </div>
            {state === "processing" ? <LoadingState /> : <>
            <h3>Secure test checkout</h3>
            <p>Choose an available test payment method inside Razorpay Checkout. No real money is charged.</p>
                {bookingError && (
                  <p className="error" style={{ marginBottom: "14px", padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
                    {bookingError}
                  </p>
                )}
                <Button className="full" onClick={pay} disabled={!identityVerified || !agreementAccepted || !bookable || state === "processing"}>
                  Pay {INR(total)}{" "}
                  <Icons.LockKeyhole size={16} />
                </Button>
            </>}
            <p className="secure-note">
              <Icons.ShieldCheck size={15} /> Test mode only. No real money will be charged.
            </p>
          </div>
        </section>
        <aside className="booking-panel">
          <h3>Booking summary</h3>
          <VehiclePhotoCarousel vehicle={v} className="summary-carousel" />
          <p>
            <b>{v.name}</b>
            <br />
            {q.get("pickup")} to {q.get("return")}
          </p>
          <PriceBreakdown vehicle={v} days={days} discount={discount} />
        </aside>
      </div>
    </CustomerLayout>
  );
}
function Confirmation() {
  const { bookings, vehicles, branches } = useApp();
  const q = new URLSearchParams(location.search),
    booking = bookings.find((item) => item.id === q.get("booking")),
    v = vehicles.find((x) => x.id === booking?.vehicleId) || vehicles[0];
  if (!booking) return <Navigate to="/bookings" replace />;
  return (
    <CustomerLayout>
      <section className="confirmation">
        <div className="success-icon">
          <Icons.Check />
        </div>
        <p className="eyebrow blue">BOOKING CONFIRMED</p>
        <h1>Your vehicle is reserved.</h1>
        <p>
          We’ve sent the booking confirmation to your email. Please carry your
          driving licence and a valid ID at pickup.
        </p>
        <div className="confirm-card">
          <div>
            <span>Booking reference</span>
            <strong>{booking.reference}</strong>
          </div>
          <div>
            <span>Payment status</span>
            <StatusBadge>{booking.paymentStatus}</StatusBadge>
          </div>
          <div>
            <span>Vehicle</span>
            <b>{v.name}</b>
          </div>
          <div>
            <span>Rental period</span>
            <b>
              {booking.pickupDate} → {booking.returnDate}
            </b>
          </div>
          <div>
            <span>Collection</span>
            <b>{booking.branch || branches[0].name}</b>
          </div>
          <div>
            <span>Amount paid</span>
            <b>{INR(booking.total)}</b>
          </div>
        </div>
        <div className="confirm-actions">
          <Button variant="secondary" onClick={() => window.print()}>
            <Icons.Download size={17} /> View invoice
          </Button>
          <Link className="btn" to="/bookings">
            Go to my bookings
          </Link>
        </div>
      </section>
    </CustomerLayout>
  );
}

function Auth({ register: isRegister = false }) {
  const nav = useNavigate(),
    { login, register: registerUser, customers } = useApp(),
    [errors, setErrors] = useState({}),
    [resetMessage, setResetMessage] = useState(""),
    [roleMode, setRoleMode] = useState("customer"),
    [email, setEmail] = useState("");

  const handleRoleSwitch = (mode) => {
    setRoleMode(mode);
    setErrors({});
    if (mode === "admin") {
      setEmail(DEMO_ADMIN_EMAIL);
    } else {
      setEmail(DEMO_USER_EMAIL);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    const form = e.currentTarget;
    const fd = new FormData(form);
    const emailInput = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    const newErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput) {
      newErrors.email = "Email is required.";
    } else if (!emailRegex.test(emailInput)) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (isRegister && password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (isRegister) {
      const firstName = String(fd.get("firstName") || "").trim();
      const lastName = String(fd.get("lastName") || "").trim();
      const phone = String(fd.get("phone") || "").trim();
      const confirm = String(fd.get("confirm") || "");

      if (!firstName) newErrors.firstName = "First name is required.";
      if (!lastName) newErrors.lastName = "Last name is required.";

      if (!phone) {
        newErrors.phone = "Phone number is required.";
      } else if (!/^[6-9]\d{9}$/.test(phone)) {
        newErrors.phone = "Enter a valid 10-digit mobile number.";
      }

      if (!confirm) {
        newErrors.confirm = "Confirm your password.";
      } else if (password && confirm !== password) {
        newErrors.confirm = "Passwords do not match.";
      }

      if (fd.get("terms") !== "on") {
        newErrors.terms = "You must agree to the Terms and Privacy Policy.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorField = form.querySelector(`[name="${Object.keys(newErrors)[0]}"]`);
      if (firstErrorField) firstErrorField.focus();
      return;
    }

    try {
      if (!isRegister && roleMode === "admin") {
        await login({
          firstName: fd.get("firstName") || "Admin",
          lastName: fd.get("lastName") || "Manager",
          email: emailInput.toLowerCase(),
          phone: fd.get("phone") || "+91 99000 00000",
          password: password,
          role: "admin",
        });
        nav("/admin");
      } else if (!isRegister) {
        await login({
          email: emailInput.toLowerCase(),
          password: password,
          role: "customer",
        });
        nav("/dashboard");
      } else {
        await registerUser({
          firstName: fd.get("firstName").trim(),
          lastName: fd.get("lastName").trim(),
          email: emailInput.toLowerCase(),
          phone: fd.get("phone").trim(),
          password: password,
          role: "customer",
        });
        nav("/dashboard");
      }
    } catch (err) {
      setErrors({ email: err.message || "Authentication failed. Please check your credentials." });
    }
  };

  return (
    <CustomerLayout>
      <section className="auth-page">
        <form className="auth-card" onSubmit={submit} noValidate>
          <Link className="brand center-brand" to="/">
            <span>R</span> Rentivo
          </Link>
          <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p>
            {isRegister
              ? "Start booking exceptional journeys."
              : "Sign in to manage your rentals."}
          </p>
          {!isRegister && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", justifyContent: "center" }}>
              <button
                type="button"
                className={`btn small ${roleMode === "customer" ? "" : "secondary"}`}
                onClick={() => handleRoleSwitch("customer")}
              >
                Customer Login
              </button>
              <button
                type="button"
                className={`btn small ${roleMode === "admin" ? "" : "secondary"}`}
                onClick={() => handleRoleSwitch("admin")}
              >
                Admin Login
              </button>
            </div>
          )}

          {(isRegister || roleMode === "customer") && (
            <div className="google-auth-wrapper">
              <GoogleAuthButton
                mode={isRegister ? "signup" : "signin"}
                onSuccess={(u) => {
                  nav("/dashboard");
                }}
                onError={(errMessage) => {
                  setErrors({ email: errMessage });
                }}
              />
              <div className="auth-divider">
                <span>or continue with email</span>
              </div>
            </div>
          )}

          {isRegister && (
            <div className="two-col">
              <FormInput name="firstName" label="First name" error={errors.firstName} />
              <FormInput name="lastName" label="Last name" error={errors.lastName} />
            </div>
          )}
          <FormInput
            name="email"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: "" });
            }}
            error={errors.email}
          />
          {isRegister && (
            <FormInput
              name="phone"
              label="Aadhaar-linked Phone number"
              type="tel"
              placeholder="10-digit Aadhaar-linked mobile (e.g. 9876543210)"
              error={errors.phone}
            />
          )}
          <FormInput
            name="password"
            label="Password"
            type="password"
            error={errors.password}
          />
          {isRegister && (
            <FormInput
              name="confirm"
              label="Confirm password"
              type="password"
              error={errors.confirm}
            />
          )}
          {!isRegister && (
            <div className="check-row">
              <label>
                <input type="checkbox" /> Remember me
              </label>
              <a
                href="/login"
                onClick={(event) => {
                  event.preventDefault();
                  setResetMessage("Password reset instructions have been sent in this demo.");
                }}
              >
                Forgot password?
              </a>
            </div>
          )}
          {isRegister && (
            <div className="terms-field">
              <label className="check-row">
                <input
                  type="checkbox"
                  name="terms"
                  aria-invalid={errors.terms ? "true" : undefined}
                  aria-describedby={errors.terms ? "terms-error" : undefined}
                />
                I agree to the Terms and Privacy Policy
              </label>
              {errors.terms && (
                <small id="terms-error" className="error" role="alert">
                  {errors.terms}
                </small>
              )}
            </div>
          )}
          {resetMessage && <p className="green">{resetMessage}</p>}
          <Button className="full">
            {isRegister ? "Create account" : roleMode === "admin" ? "Login as Admin" : "Login"}
          </Button>
          <p className="auth-switch">
            {isRegister ? "Already have an account? " : "New to Rentivo? "}
            <Link to={isRegister ? "/login" : "/register"}>
              {isRegister ? "Login" : "Register"}
            </Link>
          </p>
        </form>
      </section>
    </CustomerLayout>
  );
}
function IdentityVerificationPanel({ customer, onSave }) {
  const identity = getIdentityVerification(customer);
  const [aadhaarErrors, setAadhaarErrors] = useState({});
  const [licenceErrors, setLicenceErrors] = useState({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [diditLoading, setDiditLoading] = useState(false);
  const [kycPopupLoading, setKycPopupLoading] = useState(false);
  const pollRef = useRef(null);
  const { initiateDiditKyc, verifyDiditKyc, verifyKycWithImages, resetDiditKyc, updateProfile, user } = useApp();

  const [aadhaarVal, setAadhaarVal] = useState(customer?.aadhaar_number || customer?.aadhaarNumber || "");
  const [licenceVal, setLicenceVal] = useState(customer?.driving_license_no || customer?.drivingLicenseNo || customer?.licence || "");
  const [dobVal, setDobVal] = useState(customer?.date_of_birth || customer?.dateOfBirth || "1996-05-14");
  const [expiryVal, setExpiryVal] = useState(customer?.license_expiry || customer?.licenseExpiry || "2034-05-14");

  useEffect(() => {
    if (customer || user) {
      if (customer?.aadhaar_number || customer?.aadhaarNumber) {
        setAadhaarVal(customer?.aadhaar_number || customer?.aadhaarNumber);
      }
      if (customer?.driving_license_no || customer?.drivingLicenseNo || customer?.licence) {
        setLicenceVal(customer?.driving_license_no || customer?.drivingLicenseNo || customer?.licence);
      }
      if (customer?.date_of_birth || customer?.dateOfBirth) {
        setDobVal(customer?.date_of_birth || customer?.dateOfBirth);
      }
      if (customer?.license_expiry || customer?.licenseExpiry) {
        setExpiryVal(customer?.license_expiry || customer?.licenseExpiry);
      }
    }
  }, [customer, user]);

  // Handle Didit redirect callback inside popup or main window
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isCallback = params.get("kyc") === "callback" || params.has("verificationSessionId") || params.has("session_id");

    if (isCallback) {
      // If this is running inside the small popup window, message opener and close
      if (window.opener && window.opener !== window && !window.opener.closed) {
        try {
          window.opener.postMessage({ type: "DIDIT_KYC_COMPLETED" }, "*");
          window.close();
          return;
        } catch (e) {
          console.warn("Could not postMessage to window.opener:", e);
        }
      }

      // If in main window, fetch latest verified status from backend
      const checkAndComplete = async () => {
        try {
          const res = await kycApi.getMyStatus();
          const statusData = res?.data || res;
          if (statusData?.isVerified || statusData?.kycStatus === "VERIFIED") {
            await updateProfile({
              identityVerification: {
                status: "verified",
                provider: statusData.provider || "DIDIT",
                sessionId: statusData.sessionId || params.get("verificationSessionId") || params.get("session_id"),
                verifiedAt: statusData.verifiedAt || new Date().toISOString(),
                aadhaar: {
                  status: "added",
                  maskedNumber: statusData.aadhaarMasked || "XXXX XXXX 1012"
                },
                drivingLicence: {
                  status: "added",
                  licenceNumberMasked: statusData.drivingLicenseNo ? maskLicence(statusData.drivingLicenseNo) : "XXXX XXXX 2345",
                  dateOfBirth: dobVal || "1996-05-14",
                  expiryDate: expiryVal || "2034-05-14"
                }
              }
            });
            setMessage("✓ Identity verified successfully with Didit Protocol!");
            setMessageType("success");
          }
        } catch (err) {
          console.warn("Auto-check KYC error:", err);
        }
      };
      checkAndComplete();
    }
  }, []);

  // Listen for postMessage from popup window
  useEffect(() => {
    const handleMessage = async (event) => {
      if (event.data?.type === "DIDIT_KYC_COMPLETED") {
        if (event.origin !== window.location.origin) return;
        if (pollRef.current) clearInterval(pollRef.current);
        try {
          const res = await kycApi.getMyStatus();
          const statusData = res?.data || res;
          if (!(statusData?.isVerified || statusData?.kycStatus === "VERIFIED")) {
            setMessage("Didit has not confirmed your identity yet. Please finish verification and try again.");
            setMessageType("info");
            setKycPopupLoading(false);
            return;
          }
          await updateProfile({
            identityVerification: {
              status: "verified",
              provider: statusData.provider || "DIDIT",
              sessionId: statusData.sessionId || `didit_sess_${Date.now()}`,
              verifiedAt: statusData.verifiedAt || new Date().toISOString(),
              aadhaar: {
                status: "added",
                maskedNumber: statusData.aadhaarMasked || "XXXX XXXX 1012"
              },
              drivingLicence: {
                status: "added",
                licenceNumberMasked: statusData.drivingLicenseNo ? maskLicence(statusData.drivingLicenseNo) : "XXXX XXXX 2345",
                dateOfBirth: dobVal || "1996-05-14",
                expiryDate: expiryVal || "2034-05-14"
              }
            }
          });
          setMessage("✓ Identity verified successfully with Didit Protocol!");
          setMessageType("success");
          setKycPopupLoading(false);
        } catch (err) {
          console.warn("PostMessage status sync error:", err);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [updateProfile, dobVal, expiryVal]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);



  const saveAadhaar = (event) => {
    event.preventDefault();
    setMessage("");
    const check = validateAadhaarClient(aadhaarVal);
    if (!check.valid) {
      setAadhaarErrors({ aadhaarNumber: check.error });
      return;
    }

    setAadhaarErrors({});
    onSave({
      aadhaarNumber: check.clean,
      identityVerification: {
        ...identity,
        aadhaar: {
          ...identity.aadhaar,
          status: "added",
          maskedNumber: maskAadhaar(check.clean),
        },
      },
    });
    setMessage("✓ Aadhaar / National ID details saved.");
    setMessageType("success");
  };

  const saveLicence = (event) => {
    event.preventDefault();
    setMessage("");
    const check = validateDrivingLicenseClient(licenceVal);
    const today = dateISO(new Date());
    const nextErrors = {};

    if (!check.valid) {
      nextErrors.licenceNumber = check.error;
    }

    if (!dobVal) {
      nextErrors.dateOfBirth = "Date of birth is required.";
    } else if (!isAtLeastAge(dobVal, 18)) {
      nextErrors.dateOfBirth = "Customer must be at least 18 years old.";
    }

    if (!expiryVal) {
      nextErrors.expiryDate = "Licence expiry date is required.";
    } else if (expiryVal < today) {
      nextErrors.expiryDate = "Licence expiry date cannot be in the past.";
    }

    if (Object.keys(nextErrors).length) {
      setLicenceErrors(nextErrors);
      return;
    }

    setLicenceErrors({});
    onSave({
      drivingLicenseNo: check.clean,
      identityVerification: {
        ...identity,
        drivingLicence: {
          ...identity.drivingLicence,
          status: "added",
          licenceNumberMasked: maskLicence(check.clean),
          dateOfBirth: dobVal,
          expiryDate: expiryVal,
        },
      },
    });
    setMessage("✓ Driving licence details saved.");
    setMessageType("success");
  };

  // ── Hosted Didit Verification Session (Razorpay style popup) ──
  const handleHostedDiditSession = async () => {
    try {
      setKycPopupLoading(true);
      setMessage("Opening Didit Verification Portal...");
      setMessageType("info");

      const session = await initiateDiditKyc();

      if (!session || !session.url) {
        throw new Error("Unable to create Didit verification session.");
      }

      const popup = window.open(
        session.url,
        "didit_kyc_window",
        "width=620,height=750,left=250,top=100,toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=yes"
      );

      setMessage("Please complete identity verification in the Didit window. Listening for completion...");
      setMessageType("info");

      if (pollRef.current) clearInterval(pollRef.current);

      let attempts = 0;
      const maxAttempts = 100; // ~5 minutes

      pollRef.current = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(pollRef.current);
          setKycPopupLoading(false);
          setMessage("Verification session timed out. Please try again.");
          setMessageType("error");
          return;
        }

        try {
          const res = await kycApi.getMyStatus();
          const statusData = res?.data || res;

          if (statusData?.isVerified || statusData?.kycStatus === "VERIFIED") {
            clearInterval(pollRef.current);
            if (popup && !popup.closed) {
              try { popup.close(); } catch (e) {}
            }

            const cleanAadhaar = statusData.aadhaarMasked || (aadhaarVal ? maskAadhaar(aadhaarVal) : "XXXX XXXX 1012");
            const cleanDl = statusData.drivingLicenseNo ? maskLicence(statusData.drivingLicenseNo) : (licenceVal ? maskLicence(licenceVal) : "XXXX XXXX 2345");

            await updateProfile({
              identityVerification: {
                status: "verified",
                provider: statusData.provider || "DIDIT",
                sessionId: statusData.sessionId || session.session_id,
                verifiedAt: statusData.verifiedAt || new Date().toISOString(),
                aadhaar: {
                  status: "added",
                  maskedNumber: cleanAadhaar
                },
                drivingLicence: {
                  status: "added",
                  licenceNumberMasked: cleanDl,
                  dateOfBirth: dobVal || "1996-05-14",
                  expiryDate: expiryVal || "2034-05-14"
                }
              }
            });

            setMessage("✓ Identity verified successfully with Didit Protocol!");
            setMessageType("success");
            setKycPopupLoading(false);
          }
        } catch (pollErr) {
          console.warn("KYC status poll check error:", pollErr);
        }
      }, 3000);
    } catch (err) {
      setMessage("Failed to initiate Didit session: " + (err.message || "Error"));
      setMessageType("error");
      setKycPopupLoading(false);
    }
  };

  const handleResetKyc = async () => {
    if (!window.confirm("Are you sure you want to reset and clear all saved KYC details? This will clear your Aadhaar, Driving Licence, and verification status.")) {
      return;
    }

    try {
      setDiditLoading(true);
      if (pollRef.current) clearInterval(pollRef.current);
      await resetDiditKyc();
      setAadhaarVal("");
      setLicenceVal("");
      setAadhaarErrors({});
      setLicenceErrors({});
      setMessage("✓ KYC details have been reset. All stored Aadhaar, Driving Licence, and verification records have been cleared.");
      setMessageType("success");
    } catch (err) {
      setMessage("Failed to reset KYC: " + (err.message || "Error resetting KYC"));
      setMessageType("error");
    } finally {
      setDiditLoading(false);
    }
  };

  return (
    <section className="form-card identity-card" id="identity-verification">
      <div className="card-heading">
        <div>
          <h2>Identity Verification (KYC)</h2>
          <p>Instant document validation powered by <strong>Didit KYC Protocol</strong>.</p>
        </div>
        <StatusBadge>{identityStatusLabel(identity.status)}</StatusBadge>
      </div>
      <div className="identity-status-grid">
        <p>
          <span>Aadhaar / National ID</span>
          <b>{identityStatusLabel(identity.aadhaar.status)}</b>
          {identity.aadhaar.maskedNumber ? <small>{identity.aadhaar.maskedNumber}</small> : <small>Not added</small>}
        </p>
        <p>
          <span>Driving Licence</span>
          <b>{identityStatusLabel(identity.drivingLicence.status)}</b>
          {identity.drivingLicence.licenceNumberMasked ? <small>{identity.drivingLicence.licenceNumberMasked}</small> : <small>Not added</small>}
        </p>
      </div>

      {/* ── Hosted KYC Session Option (Primary Didit Window Verification) ── */}
      {identity.status !== "verified" ? (
        <div style={{
          padding: "1.25rem",
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          borderRadius: "10px",
          marginTop: "0.5rem",
          marginBottom: "1rem"
        }}>
          <h3 style={{ margin: "0 0 0.4rem 0", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>⚡</span> Verify Identity with Didit
          </h3>
          <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", color: "var(--color-muted, #666)", lineHeight: "1.4" }}>
            Click below to open the official Didit KYC verification window. You will scan your Aadhaar / Driving Licence and complete selfie validation directly on Didit.
          </p>
          <Button
            type="button"
            className="full"
            onClick={handleHostedDiditSession}
            disabled={kycPopupLoading}
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              color: "#fff",
              fontWeight: 600,
              padding: "0.8rem 1.2rem",
              fontSize: "0.95rem"
            }}
          >
            {kycPopupLoading ? "Waiting for Didit Verification..." : "Start KYC with Didit →"}
          </Button>
        </div>
      ) : (
        <div style={{
          padding: "1rem",
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "8px",
          margin: "0.75rem 0",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "var(--color-success, #059669)",
          fontWeight: 600
        }}>
          <span>✓</span> Identity Verified with Didit Protocol
        </div>
      )}

      {/* Aadhaar Details (Optional / Saved Info) */}
      <form className="identity-form" onSubmit={saveAadhaar} noValidate>
        <h3>Aadhaar / National ID</h3>
        <FormInput
          label="12-digit Aadhaar Number"
          name="aadhaarNumber"
          inputMode="numeric"
          maxLength="12"
          placeholder="e.g. 456789123451"
          value={aadhaarVal}
          onChange={(e) => {
            setAadhaarVal(e.target.value);
            if (aadhaarErrors.aadhaarNumber) setAadhaarErrors({});
          }}
          error={aadhaarErrors.aadhaarNumber}
          disabled={identity.status === "verified"}
        />
        {identity.status !== "verified" && (
          <Button type="submit" variant="secondary">Save Aadhaar details</Button>
        )}
      </form>

      {/* Driving Licence Form */}
      <form className="identity-form" onSubmit={saveLicence} noValidate>
        <h3>Driving Licence</h3>
        <FormInput
          label="Licence number"
          name="licenceNumber"
          placeholder="e.g. KA01 20150012345"
          value={licenceVal}
          onChange={(e) => {
            setLicenceVal(e.target.value);
            if (licenceErrors.licenceNumber) setLicenceErrors({});
          }}
          error={licenceErrors.licenceNumber}
          disabled={identity.status === "verified"}
        />
        <div className="two-col">
          <FormInput
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            value={dobVal}
            onChange={(e) => setDobVal(e.target.value)}
            error={licenceErrors.dateOfBirth}
            disabled={identity.status === "verified"}
          />
          <FormInput
            label="Licence expiry date"
            name="expiryDate"
            type="date"
            min={dateISO(new Date())}
            value={expiryVal}
            onChange={(e) => setExpiryVal(e.target.value)}
            error={licenceErrors.expiryDate}
            disabled={identity.status === "verified"}
          />
        </div>
        {identity.status !== "verified" && (
          <Button type="submit" variant="secondary">Save licence details</Button>
        )}
      </form>

      {/* Reset & Clear KYC Details Action */}
      {(identity.status === "verified" || aadhaarVal || licenceVal) && (
        <Button
          type="button"
          onClick={handleResetKyc}
          className="danger-btn full"
          disabled={kycPopupLoading}
        >
          Reset & Clear KYC Details
        </Button>
      )}

      {/* Dynamic Feedback Message */}
      {message && (
        <div className={`alert-box ${messageType}`}>
          {message}
        </div>
      )}
    </section>
  );
}
function Profile() {
  const { customers, user, updateProfile } = useApp();
  const [edit, setEdit] = useState(false),
    [message, setMessage] = useState(""),
    [passwordOpen, setPasswordOpen] = useState(false),
    [passwordErrors, setPasswordErrors] = useState({}),
    [passwordMessage, setPasswordMessage] = useState("");
  const c =
    customers.find((customer) => customer.email?.toLowerCase() === user?.email?.toLowerCase()) ||
    customers.find((customer) => customer.id === user?.id) ||
    user ||
    null;

  const displayName = c?.name || user?.name || [c?.firstName || user?.firstName, c?.lastName || user?.lastName].filter(Boolean).join(" ") || "Customer";
  const displayEmail = c?.email || user?.email || "";
  const displayPhone = c?.phone || user?.phone || "";
  const displayAddress = c?.address || user?.address || "";
  const displayEmergencyContact = c?.emergencyContact || user?.emergencyContact || "";

  const [calcFirstName = "", ...calcLastName] = (displayName || "").split(" ");
  const firstNameVal = c?.firstName || user?.firstName || calcFirstName;
  const lastNameVal = c?.lastName || user?.lastName || calcLastName.join(" ");

  const avatarInitials = (
    (firstNameVal && lastNameVal ? firstNameVal[0] + lastNameVal[0] : null) ||
    (displayName ? displayName.split(" ").map((n) => n[0]).join("") : "C")
  )
    .slice(0, 2)
    .toUpperCase();

  const handlePasswordChange = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const currentPassword = String(values.get("currentPassword") || "");
    const newPassword = String(values.get("newPassword") || "");
    const confirmPassword = String(values.get("confirmPassword") || "");
    const storedPassword = c?.demoAuthPassword || user?.demoAuthPassword || "";
    const nextErrors = {};

    if (!currentPassword) {
      nextErrors.currentPassword = "Current password is required.";
    } else if (currentPassword !== storedPassword) {
      nextErrors.currentPassword = "Current password is incorrect.";
    }

    if (!newPassword) {
      nextErrors.newPassword = "New password is required.";
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = "Password must be at least 8 characters.";
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword = "New password must be different from the current password.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your new password.";
    } else if (newPassword && confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(nextErrors).length) {
      setPasswordErrors(nextErrors);
      form.querySelector('[name="' + Object.keys(nextErrors)[0] + '"]')?.focus();
      return;
    }

    updateProfile({ demoAuthPassword: newPassword });
    setPasswordErrors({});
    setPasswordMessage("Password changed successfully.");
    form.reset();
  };

  return (
    <CustomerLayout>
      <section className="account-page">
        <div className="account-hero">
          <div className="avatar" style={{ overflow: "hidden" }}>
            {user?.profileImage || user?.picture ? (
              <img
                src={user.profileImage || user.picture}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              avatarInitials
            )}
          </div>
          <div>
            <p className="eyebrow blue">MY ACCOUNT</p>
            <h1>{displayName}</h1>
            <p>{displayEmail}</p>
            {(user?.authProvider === "google" || user?.profileImage) && (
              <span className="google-badge">
                <GoogleLogo size={13} /> Connected with Google
              </span>
            )}
          </div>
          <Button variant="secondary" onClick={() => setEdit(!edit)}>
            <Icons.Pencil size={16} /> {edit ? "Done editing" : "Edit profile"}
          </Button>
        </div>
        <div className="profile-grid">
          <form
            className="form-card"
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              const firstName = values.get("firstName").trim();
              const lastName = values.get("lastName").trim();
              updateProfile({
                firstName,
                lastName,
                name: (firstName + " " + lastName).trim(),
                email: values.get("email").trim(),
                phone: values.get("phone").trim(),
                address: values.get("address").trim(),
                emergencyContact: values.get("emergencyContact").trim(),
              });
              setEdit(false);
              setMessage("Profile changes saved.");
            }}
          >
            <h2>Personal information</h2>
            <div className="two-col">
              <FormInput
                label="First name"
                name="firstName"
                defaultValue={firstNameVal}
                disabled={!edit}
              />
              <FormInput
                label="Last name"
                name="lastName"
                defaultValue={lastNameVal}
                disabled={!edit}
              />
            </div>
            <FormInput
              label="Aadhaar-linked Phone"
              name="phone"
              placeholder="10-digit Aadhaar-linked mobile (e.g. 9876543210)"
              defaultValue={displayPhone}
              disabled={!edit}
            />
            <h3>Address & emergency contact</h3>
            <FormInput
              label="Address"
              name="address"
              defaultValue={displayAddress}
              placeholder="Not added yet"
              disabled={!edit}
            />
            <FormInput
              label="Emergency contact"
              name="emergencyContact"
              defaultValue={displayEmergencyContact}
              placeholder="Not added yet"
              disabled={!edit}
            />
            {edit && <Button type="submit">Save changes</Button>}
            {message && <p className="green">{message}</p>}
          </form>
          <div className="profile-side">
            <IdentityVerificationPanel customer={c} onSave={updateProfile} />
            <aside className="booking-panel account-security-card">
              <h3>Account security</h3>
              <p>Keep your Rentivo account secure with a strong password.</p>
              <Button
                type="button"
                variant="secondary"
                className="full"
                onClick={() => {
                  setPasswordOpen(!passwordOpen);
                  setPasswordErrors({});
                  setPasswordMessage("");
                }}
              >
                Change password
              </Button>
              {passwordOpen && (
                <form className="password-form" onSubmit={handlePasswordChange} noValidate>
                  <FormInput label="Current password" name="currentPassword" type="password" error={passwordErrors.currentPassword} />
                  <FormInput label="New password" name="newPassword" type="password" error={passwordErrors.newPassword} />
                  <FormInput label="Confirm new password" name="confirmPassword" type="password" error={passwordErrors.confirmPassword} />
                  <Button type="submit" className="full">Update password</Button>
                </form>
              )}
              {passwordMessage && <p className="green">{passwordMessage}</p>}
            </aside>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
function Bookings() {
  const { bookings } = useApp();
  const { id } = useParams();
  if (id) return <BookingDetails />;
  const [tab, setTab] = useState("Upcoming");
  const list = bookings.filter((b) => b.status === tab);
  return (
    <CustomerLayout>
      <section className="account-page">
        <p className="eyebrow blue">RENTAL HISTORY</p>
        <h1>My bookings</h1>
        <div className="tabs">
          {["Upcoming", "Active", "Completed", "Cancelled"].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="booking-list">
          {list.length ? (
            list.map((b) => <BookingRow b={b} key={b.id} />)
          ) : (
            <EmptyState title={`No ${tab.toLowerCase()} bookings`} />
          )}
        </div>
      </section>
    </CustomerLayout>
  );
}
function BookingRow({ b, admin = false }) {
  const { vehicles, customers } = useApp();
  const v = vehicles.find((x) => x.id === b.vehicleId) || vehicles[0],
    c = customers.find((x) => x.id === b.customerId);
  return (
    <article className="booking-row">
      <img className="booking-row-image" src={v.image} alt="" />
      <div className="booking-row-main">
        <p className="eyebrow">{b.reference}</p>
        <h3>{v.name}</h3>
        <p>{b.pickupDate} — {b.returnDate} · {b.branch}</p>
        {admin && <p>{c?.name || "Guest"} · {c?.email || "No email"}</p>}
      </div>
      <div className="booking-row-meta">
        <StatusBadge>{b.status}</StatusBadge>
        <div className="booking-row-payment">
          <b>{INR(b.total)}</b>
          <StatusBadge>{b.paymentStatus}</StatusBadge>
        </div>
      </div>
      <Link className="btn secondary small booking-row-action" to={admin ? "/admin/bookings" : "/bookings/" + b.id}>
        View details
      </Link>
    </article>
  );
}
function BookingDetails() {
  const { bookings, vehicles, customers } = useApp();
  const { id } = useParams(),
    b = bookings.find((x) => x.id === id) || bookings[0],
    v = vehicles.find((x) => x.id === b.vehicleId),
    c = customers.find((x) => x.id === b.customerId);
  const [agreementOpen, setAgreementOpen] = useState(false);
  return (
    <CustomerLayout>
      <section className="account-page">
        <Link to="/bookings" className="back">
          <Icons.ArrowLeft size={16} /> Back to bookings
        </Link>
        <div className="detail-header">
          <div>
            <p className="eyebrow blue">{b.reference}</p>
            <h1>{v.name}</h1>
            <p>
              {b.pickupDate} to {b.returnDate} · {b.branch}
            </p>
          </div>
          <StatusBadge>{b.status}</StatusBadge>
        </div>
        <div className="profile-grid">
          <section className="form-card">
            <h2>Rental details</h2>
            <div className="info-list">
              <p>
                <span>Customer</span>
                <b>{c?.name || "Guest Customer"}</b>
              </p>
              <p>
                <span>Pickup / return</span>
                <b>
                  {b.pickupDate} / {b.returnDate}
                </b>
              </p>
              <p>
                <span>Location</span>
                <b>{b.branch}</b>
              </p>
              <p>
                <span>Rental days</span>
                <b>{b.days} days</b>
              </p>
              <p>
                <span>Daily rate</span>
                <b>{INR(v.dailyRate)}</b>
              </p>
              <p>
                <span>Payment status</span>
                <StatusBadge>{b.paymentStatus}</StatusBadge>
              </p>
            </div>
            <Button variant="secondary" onClick={() => setAgreementOpen(true)}>
              <Icons.FileText size={16} /> View rental agreement
            </Button>
          </section>
          <aside className="booking-panel">
            <h3>Price details</h3>
            <PriceBreakdown vehicle={v} days={b.days} />
            <Button
              variant="secondary"
              className="full"
              onClick={() => window.print()}
            >
              <Icons.Download size={16} /> Download invoice
            </Button>
          </aside>
        </div>
        {agreementOpen && (
          <Modal title="Rental agreement" onClose={() => setAgreementOpen(false)}>
            <div className="form-card">
              <p><b>{b.reference}</b> confirms the rental of {v.name} for {b.days} day{b.days === 1 ? "" : "s"}.</p>
              <p>Pickup: {b.pickupDate} at {b.branch}. Return: {b.returnDate} at {b.returnBranch || b.branch}.</p>
              <p>Total payable: {INR(b.total)}. Payment status: {b.paymentStatus}.</p>
              <Button onClick={() => setAgreementOpen(false)}>Close agreement</Button>
            </div>
          </Modal>
        )}
      </section>
    </CustomerLayout>
  );
}

const adminNav = [
  ["Dashboard", "/admin", Icons.LayoutDashboard],
  ["Vehicles", "/admin/vehicles", Icons.CarFront],
  ["Categories", "/admin/categories", Icons.Shapes],
  ["Branches", "/admin/branches", Icons.Building2],
  ["Customers", "/admin/customers", Icons.Users],
  ["Bookings", "/admin/bookings", Icons.CalendarDays],
  ["Payments", "/admin/payments", Icons.CreditCard],
  ["Maintenance", "/admin/maintenance", Icons.Wrench],
  ["Reports", "/admin/reports", Icons.BarChart3],
  ["Settings", "/admin/settings", Icons.Settings],
];
function AdminLayout({ children }) {
  const { logout } = useApp();
  const hour = new Date().getHours();
  const adminGreeting = hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : "Good evening";
  const handleLogout = () => {
    logout();
    notifyLoggedOut();
  };
  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link className="brand" to="/admin">
          <span>R</span> Rentivo
        </Link>
        <p className="admin-label">ADMIN CONSOLE</p>
        <nav>
          {adminNav.map(([name, path, I]) => (
            <NavLink end={path === "/admin"} key={name} to={path}>
              <I size={18} />
              {name}
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout}>
          <Icons.LogOut size={18} /> Logout
        </button>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <div>
            <p>Operations workspace</p>
            <h3>{adminGreeting}, Admin</h3>
          </div>
          <div className="admin-user" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Link to="/" className="text-link" style={{ fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <Icons.ExternalLink size={15} /> View Customer Site
            </Link>
            <Icons.Bell size={19} />
            <span>RM</span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
function AdminPage({ title, subtitle, children, actions }) {
  return (
    <AdminLayout>
      <section className="admin-page">
        <div className="admin-title">
          <div>
            <p className="eyebrow blue">RENTIVO ADMIN</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {actions}
        </div>
        {children}
      </section>
    </AdminLayout>
  );
}
function Metric({ label, value, change, icon: I }) {
  return (
    <div className="metric">
      <div>
        <p>{label}</p>
        <h2>{value}</h2>
        <small className="green">↑ {change} vs last month</small>
      </div>
      <span>
        <I size={21} />
      </span>
    </div>
  );
}
function AdminDashboard() {
  const { vehicles, customers, bookings, payments } = useApp();

  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter((v) => v.status === "Available").length;
  const rentedVehicles = vehicles.filter((v) => v.status === "Rented").length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === "Maintenance").length;

  const activeCustomersCount = customers.filter((c) => c.status === "Active").length;

  const paidBookingsTotal = bookings
    .filter((b) => b.paymentStatus === "Paid" || b.status === "Completed")
    .reduce((sum, b) => sum + Number(b.total || 0), 0);

  const capturedPaymentsTotal = payments
    .filter((p) => p.status === "Captured" || p.status === "Paid")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalRevenue = Math.max(paidBookingsTotal, capturedPaymentsTotal);

  const utilizationPercent = totalVehicles
    ? Math.round((rentedVehicles / totalVehicles) * 100)
    : 0;

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => {
        const timeA = new Date(a.pickupDate || 0).getTime();
        const timeB = new Date(b.pickupDate || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 3);
  }, [bookings]);

  return (
    <AdminPage
      title="Dashboard"
      subtitle="A clear view of today’s rental operations."
    >
      <div className="metrics">
        <Metric
          label="Total vehicles"
          value={totalVehicles}
          change="fleet count"
          icon={Icons.CarFront}
        />
        <Metric
          label="Available vehicles"
          value={availableVehicles}
          change="ready to rent"
          icon={Icons.CircleCheck}
        />
        <Metric
          label="Currently rented"
          value={rentedVehicles}
          change="active rentals"
          icon={Icons.KeyRound}
        />
        <Metric
          label="Total revenue"
          value={INR(totalRevenue)}
          change="collections"
          icon={Icons.IndianRupee}
        />
        <Metric
          label="Active customers"
          value={activeCustomersCount}
          change="active status"
          icon={Icons.Users}
        />
      </div>
      <div className="dashboard-grid">
        <section className="chart-card">
          <div className="card-heading">
            <div>
              <h3>Booking trends</h3>
              <p>Reservations over the last 7 days</p>
            </div>
            <Button variant="secondary" className="small">
              This week
            </Button>
          </div>
          <div className="bars">
            {[42, 68, 50, 86, 62, 77, 94].map((n, i) => (
              <div key={i}>
                <i style={{ height: `${n}%` }} />
                <span>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="chart-card">
          <div className="card-heading">
            <div>
              <h3>Vehicle utilization</h3>
              <p>Current fleet allocation</p>
            </div>
          </div>
          <div className="donut">
            <div>
              <b>{utilizationPercent}%</b>
              <small>utilized</small>
            </div>
          </div>
          <div className="legend">
            <span>
              <i className="blue-dot" />
              Rented {rentedVehicles}
            </span>
            <span>
              <i className="cyan-dot" />
              Available {availableVehicles}
            </span>
            <span>
              <i className="gray-dot" />
              Service {maintenanceVehicles}
            </span>
          </div>
        </section>
      </div>
      <div className="dashboard-grid">
        <section className="table-card">
          <div className="card-heading">
            <div>
              <h3>Recent bookings</h3>
              <p>Latest customer activity</p>
            </div>
            <Link to="/admin/bookings" className="text-link">
              View all
            </Link>
          </div>
          {recentBookings.length ? (
            recentBookings.map((b) => (
              <BookingRow admin b={b} key={b.id} />
            ))
          ) : (
            <EmptyState title="No recent bookings" text="No customer reservations recorded yet." />
          )}
        </section>
        <section className="quick">
          <h3>Quick actions</h3>
          <Link to="/admin/vehicles">
            <Icons.Plus /> Add vehicle
          </Link>
          <Link to="/admin/bookings">
            <Icons.CalendarCheck /> Review bookings
          </Link>
          <Link to="/admin/maintenance">
            <Icons.Wrench /> Log maintenance
          </Link>
          <Link to="/admin/reports">
            <Icons.FileBarChart /> Export report
          </Link>
          <Link to="/">
            <Icons.ExternalLink /> View Customer Site
          </Link>
        </section>
      </div>
    </AdminPage>
  );
}
function DataTable({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
function CrudPage({ type }) {
  const {
    vehicles,
    categories,
    branches,
    customers,
    bookings,
    setVehicles,
    setCategories,
    setBranches,
    setCustomers,
  } = useApp();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState(null),
    [query, setQuery] = useState(""),
    [loading, setLoading] = useState(false),
    [filterLabel, setFilterLabel] = useState("Filters");
  let config = {
    Vehicles: {
      items: vehicles,
      cols: ["Vehicle", "Category", "Branch", "Daily rate", "Status", ""],
      render: (v) => (
        <>
          <td>
            <div className="mini-car">
              <img src={v.image} />
              <b>{v.name}</b>
            </div>
          </td>
          <td>{v.category}</td>
          <td>{v.branch}</td>
          <td>{INR(v.dailyRate)}</td>
          <td>
            <StatusBadge>{v.status}</StatusBadge>
          </td>
        </>
      ),
    },
    Categories: {
      items: categories,
      cols: ["Category", "Description", "Seating", "Vehicles", ""],
      render: (c) => (
        <>
          <td>
            <b>{c.name}</b>
          </td>
          <td>{c.description}</td>
          <td>Up to {c.name === "SUV" ? "7" : "5"} seats</td>
          <td>{c.count}</td>
        </>
      ),
    },
    Branches: {
      items: branches,
      cols: ["Branch", "Address", "City", "Phone", "Assigned vehicles", ""],
      render: (b) => (
        <>
          <td>
            <b>{b.name}</b>
          </td>
          <td>{b.address}</td>
          <td>
            {b.city}, {b.state}
          </td>
          <td>{b.phone}</td>
          <td>{vehicles.filter((v) => v.branch === b.name).length}</td>
        </>
      ),
    },
    Customers: {
      items: customers,
      cols: ["Customer", "Phone", "Identity Status", "Aadhaar Status", "Driving Licence Status", "Account", ""],
      render: (c) => (
        <>
          <td>
            <b>{c.name}</b>
            <small>{c.email}</small>
          </td>
          <td>{c.phone}</td>
          <td><StatusBadge>{identityStatusLabel(getIdentityVerification(c).status)}</StatusBadge></td>
          <td>{identityStatusLabel(getIdentityVerification(c).aadhaar.status)}</td>
          <td>{identityStatusLabel(getIdentityVerification(c).drivingLicence.status)}</td>
          <td>
            <StatusBadge>{c.status}</StatusBadge>
          </td>
        </>
      ),
    },
  }[type];
  const shown = config.items.filter((x) =>
    JSON.stringify(x).toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const timerId = window.setTimeout(() => setLoading(false), 260);
    return () => window.clearTimeout(timerId);
  }, [query]);

  const runTableRefresh = (nextLabel) => {
    setFilterLabel(nextLabel);
    setLoading(true);
    window.setTimeout(() => setLoading(false), 320);
  };

  const collectionSetters = {
    Vehicles: setVehicles,
    Categories: setCategories,
    Branches: setBranches,
    Customers: setCustomers,
  };
  const saveRecord = (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = values.get("name").trim();
    const details = values.get("details").trim();
    const setter = collectionSetters[type];
    const base =
      type === "Vehicles"
        ? {
            id: `vehicle-${Date.now()}`,
            name,
            brand: name.split(" ")[0] || "Rentivo",
            model: name.split(" ").slice(1).join(" ") || "Vehicle",
            variant: "Standard",
            year: "2026",
            colour: "White",
            category: values.get("category") || categories[0]?.name || "SUV",
            transmission: "Automatic",
            fuel: "Petrol",
            engine: "1.5L",
            seats: 5,
            mileage: "16 km/l",
            dailyRate: Number(values.get("dailyRate")) || 2500,
            deposit: 7500,
            status: "Available",
            branch: values.get("branch") || branches[0]?.name || "Bengaluru Airport",
            description: details || "A well-maintained Rentivo fleet vehicle.",
            image: vehicles[0]?.image || "",
            gallery: vehicles[0]?.gallery || [],
          }
        : type === "Categories"
          ? { id: `category-${Date.now()}`, name, description: details, count: 0 }
          : type === "Branches"
            ? {
                id: `branch-${Date.now()}`,
                name,
                address: details || "Branch address to be updated",
                city: "Bengaluru",
                state: "Karnataka",
                postal: "560001",
                phone: "+91 80 4000 0000",
              }
            : {
                id: `customer-${Date.now()}`,
                name,
                email: details || "customer@rentivo.demo",
                phone: "+91 90000 00000",
                status: "Active",
                joined: new Date().toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
              };
    const record = editing ? { ...editing, ...base, id: editing.id } : base;
    setter((items) =>
      editing ? items.map((item) => (item.id === editing.id ? record : item)) : [...items, record],
    );
    setOpen(false);
    setEditing(null);
  };
  const deleteRecord = (id) => {
    if (!window.confirm(`Delete this ${type.slice(0, -1).toLowerCase()}?`)) return;
    collectionSetters[type]((items) => items.filter((item) => item.id !== id));
  };

  return (
    <AdminPage
      title={type}
      subtitle={`Manage ${type.toLowerCase()} across the Rentivo network.`}
      actions={
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Icons.Plus size={17} /> Add {type.slice(0, -1)}
        </Button>
      }
    >
      <div className="table-card">
        <div className="table-tools">
          <div className="search">
            <Icons.Search size={17} />
            <input
              placeholder={`Search ${type.toLowerCase()}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() =>
              runTableRefresh(
                filterLabel === "Filters" ? "Filters applied" : "Filters",
              )
            }
          >
            <Icons.SlidersHorizontal size={16} /> {filterLabel}
          </Button>
        </div>
        {loading ? (
          <LoadingState />
        ) : (
          <>
            <DataTable
              columns={config.cols}
              rows={shown.map((x) => (
                <tr key={x.id}>
                  {config.render(x)}
                  <td>
                    <div className="table-actions">
                      <Button
                        variant="ghost"
                        className="small"
                        onClick={() => { setEditing(x); setOpen(true); }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="small danger"
                        onClick={() => deleteRecord(x.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            />
            {!shown.length && <EmptyState />}
          </>
        )}
      </div>
      {open && (
        <Modal
          title={`${editing ? "Edit" : "Add"} ${type.slice(0, -1)}`}
          onClose={() => { setOpen(false); setEditing(null); }}
        >
          <form className="form-card" onSubmit={saveRecord}>
            <FormInput
              label={`${type.slice(0, -1)} name`}
              name="name"
              defaultValue={editing?.name}
              required
            />
            <FormInput
              label={type === "Customers" ? "Email" : "Description / details"}
              name="details"
              defaultValue={editing?.description || editing?.address || editing?.email}
            />
            {type === "Vehicles" && (
              <>
                <label className="field">
                  <span>Category</span>
                  <select name="category" defaultValue={editing?.category || categories[0]?.name}>
                    {categories.map((category) => <option key={category.id}>{category.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Branch</span>
                  <select name="branch" defaultValue={editing?.branch || branches[0]?.name}>
                    {branches.map((branch) => <option key={branch.id}>{branch.name}</option>)}
                  </select>
                </label>
                <FormInput label="Daily rate" name="dailyRate" type="number" defaultValue={editing?.dailyRate || 2500} />
              </>
            )}
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={() => { setOpen(false); setEditing(null); }}>
                Cancel
              </Button>
              <Button type="submit">Save record</Button>
            </div>
          </form>
        </Modal>
      )}
    </AdminPage>
  );
}
function AdminBookings() {
  const { bookings, customers, vehicles, setBookings } = useApp();
  const [query, setQuery] = useState(""),
    [loading, setLoading] = useState(false),
    [statusLabel, setStatusLabel] = useState("Status: All"),
    [selectedBooking, setSelectedBooking] = useState(null);

  const selectedStatus = statusLabel.replace("Status: ", "");
  const shown = bookings.filter((b) =>
    JSON.stringify({
      reference: b.reference,
      branch: b.branch,
      customer: customers.find((c) => c.id === b.customerId)?.name,
      email: customers.find((c) => c.id === b.customerId)?.email,
    })
      .toLowerCase()
      .includes(query.toLowerCase()) &&
    (selectedStatus === "All" || b.status === selectedStatus),
  );

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const timerId = window.setTimeout(() => setLoading(false), 260);
    return () => window.clearTimeout(timerId);
  }, [query]);

  const runTableRefresh = (nextLabel) => {
    setStatusLabel(nextLabel);
    setLoading(true);
    window.setTimeout(() => setLoading(false), 320);
  };
  const cycleStatus = () => {
    const statuses = ["All", "Upcoming", "Active", "Completed", "Cancelled"];
    const currentIndex = statuses.indexOf(selectedStatus);
    runTableRefresh(`Status: ${statuses[(currentIndex + 1) % statuses.length]}`);
  };

  return (
    <AdminPage
      title="Bookings"
      subtitle="Confirm, modify and monitor every rental."
    >
      <div className="table-card">
        <div className="table-tools">
          <div className="search">
            <Icons.Search size={17} />
            <input
              placeholder="Search reference or customer"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={cycleStatus}
          >
            <Icons.Filter size={16} /> {statusLabel}
          </Button>
        </div>
        {loading ? (
          <LoadingState />
        ) : (
          <DataTable
            columns={[
              "Reference",
              "Customer",
              "Vehicle",
              "Rental period",
              "Branch",
              "Total",
              "Status",
              "",
            ]}
            rows={shown.map((b) => {
              const v = vehicles.find((v) => v.id === b.vehicleId),
                c = customers.find((c) => c.id === b.customerId);
              return (
                <tr key={b.id}>
                  <td>
                    <b>{b.reference}</b>
                  </td>
                  <td>
                    {c.name}
                    <small>{c.email}</small>
                  </td>
                  <td>{v.name}</td>
                  <td>
                    {b.pickupDate}
                    <small>to {b.returnDate}</small>
                  </td>
                  <td>{b.branch}</td>
                  <td>{INR(b.total)}</td>
                  <td>
                    <StatusBadge>{b.status}</StatusBadge>
                  </td>
                  <td>
                    <Button className="small" variant="secondary" onClick={() => setSelectedBooking(b)}>
                      Manage
                    </Button>
                  </td>
                </tr>
              );
            })}
          />
        )}
        {!loading && !shown.length && (
          <EmptyState title="No bookings match this search" />
        )}
      </div>
      {selectedBooking && (
        <Modal title={`Manage ${selectedBooking.reference}`} onClose={() => setSelectedBooking(null)}>
          <form
            className="form-card"
            onSubmit={(event) => {
              event.preventDefault();
              const status = new FormData(event.currentTarget).get("status");
              setBookings((items) => items.map((item) => item.id === selectedBooking.id ? { ...item, status } : item));
              setSelectedBooking(null);
            }}
          >
            <p>Update the current booking status for {selectedBooking.reference}.</p>
            <label className="field">
              <span>Booking status</span>
              <select name="status" defaultValue={selectedBooking.status}>
                {["Upcoming", "Active", "Completed", "Cancelled"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={() => setSelectedBooking(null)}>Close</Button>
              <Button type="submit">Save status</Button>
            </div>
          </form>
        </Modal>
      )}
    </AdminPage>
  );
}
function Payments() {
  const { payments } = useApp();
  const [receipt, setReceipt] = useState(null);
  return (
    <AdminPage
      title="Payments"
      subtitle="Track Razorpay payment records and transaction activity."
    >
      <div className="table-card">
        <DataTable
          columns={[
            "Payment ID",
            "Booking",
            "Customer",
            "Amount",
            "Method",
            "Gateway",
            "Status",
            "Date",
            "",
          ]}
          rows={payments.map((p) => (
            <tr key={p.id}>
              <td>
                <b>{p.transaction}</b>
              </td>
              <td>{p.booking}</td>
              <td>{p.customer}</td>
              <td>{INR(p.amount)}</td>
              <td>{p.method}</td>
              <td>{p.gateway}</td>
              <td>
                <StatusBadge>{p.status}</StatusBadge>
              </td>
              <td>{p.date}</td>
              <td>
                <Button variant="ghost" className="small" onClick={() => setReceipt(p)}>
                  Receipt
                </Button>
              </td>
            </tr>
          ))}
        />
      </div>
      {receipt && (
        <Modal title={`Receipt ${receipt.transaction}`} onClose={() => setReceipt(null)}>
          <div className="form-card">
            <p><b>Booking:</b> {receipt.booking}</p>
            <p><b>Customer:</b> {receipt.customer}</p>
            <p><b>Amount:</b> {INR(receipt.amount)}</p>
            <p><b>Method:</b> {receipt.method} via {receipt.gateway}</p>
            <p><b>Status:</b> {receipt.status} on {receipt.date}</p>
            <Button variant="secondary" onClick={() => window.print()}>Print receipt</Button>
          </div>
        </Modal>
      )}
    </AdminPage>
  );
}
function Maintenance() {
  const { maintenance, vehicles, setMaintenance } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <AdminPage
      title="Maintenance"
      subtitle="Keep fleet service records, compliance and schedules on track."
      actions={
        <Button onClick={() => setOpen(true)}>
          <Icons.Plus size={16} /> Log service
        </Button>
      }
    >
      <div className="table-card">
        <DataTable
          columns={[
            "Vehicle",
            "Service date",
            "Service type",
            "Service centre",
            "Odometer",
            "Cost",
            "Next service",
            "Remarks",
          ]}
          rows={maintenance.map((m) => {
            const v = vehicles.find((v) => v.id === m.vehicleId);
            return (
              <tr key={m.id}>
                <td>
                  <b>{v.name}</b>
                </td>
                <td>{m.date}</td>
                <td>{m.type}</td>
                <td>{m.centre}</td>
                <td>{m.odometer}</td>
                <td>{INR(m.cost)}</td>
                <td>{m.next}</td>
                <td>{m.remarks}</td>
              </tr>
            );
          })}
        />
      </div>
      {open && (
        <Modal title="Log service" onClose={() => setOpen(false)}>
          <form
            className="form-card"
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              setMaintenance((items) => [
                ...items,
                {
                  id: `maintenance-${Date.now()}`,
                  vehicleId: values.get("vehicleId"),
                  date: values.get("date"),
                  type: values.get("type").trim() || "Scheduled service",
                  centre: values.get("centre").trim() || "Rentivo Service Centre",
                  odometer: values.get("odometer").trim() || "0 km",
                  cost: Number(values.get("cost")) || 0,
                  next: values.get("next"),
                  remarks: values.get("remarks").trim() || "Service logged",
                },
              ]);
              setOpen(false);
            }}
          >
            <label className="field"><span>Vehicle</span><select name="vehicleId">{vehicles.map((vehicle) => <option value={vehicle.id} key={vehicle.id}>{vehicle.name}</option>)}</select></label>
            <FormInput label="Service date" name="date" type="date" defaultValue={dateISO(new Date())} required />
            <FormInput label="Service type" name="type" required />
            <FormInput label="Service centre" name="centre" />
            <FormInput label="Odometer" name="odometer" />
            <FormInput label="Cost" name="cost" type="number" />
            <FormInput label="Next service date" name="next" type="date" required />
            <FormInput label="Remarks" name="remarks" />
            <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save service</Button></div>
          </form>
        </Modal>
      )}
    </AdminPage>
  );
}
function Reports() {
  const { branches, bookings, payments, customers, vehicles } = useApp();
  const [dateRange, setDateRange] = useState("All time"),
    [branch, setBranch] = useState("All branches"),
    [status, setStatus] = useState("All statuses");

  const bookingStatuses = ["All statuses", ...Array.from(new Set(bookings.map((booking) => booking.status).filter(Boolean)))];
  const now = new Date();
  const dateRangeStart = (range) => {
    if (range === "Last 7 days") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    if (range === "Last 30 days") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    if (range === "Last 90 days") return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    if (range === "This year") return new Date(now.getFullYear(), 0, 1);
    return null;
  };
  const inDateRange = (dateValue) => {
    const startDate = dateRangeStart(dateRange);
    if (!startDate) return true;
    const date = new Date(dateValue || 0);
    return !Number.isNaN(date.getTime()) && date >= startDate && date <= now;
  };
  const filteredBookings = bookings.filter(
    (booking) =>
      inDateRange(booking.pickupDate) &&
      (branch === "All branches" || booking.branch === branch || booking.returnBranch === branch) &&
      (status === "All statuses" || booking.status === status),
  );
  const filteredBookingIds = new Set(filteredBookings.map((booking) => booking.reference));
  const filteredPayments = payments.filter(
    (payment) =>
      filteredBookingIds.has(payment.booking) ||
      (dateRange === "All time" && status === "All statuses" && branch === "All branches"),
  );
  const filteredCustomers = customers.filter((customer) =>
    filteredBookings.some((booking) => booking.customerId === customer.id),
  );
  const activeCustomers = customers.filter((customer) => customer.status === "Active").length;
  const totalRevenue = filteredBookings
    .filter((booking) => booking.paymentStatus === "Paid" || booking.status === "Completed")
    .reduce((sum, booking) => sum + Number(booking.total || 0), 0);
  const utilization = vehicles.length
    ? Math.round((vehicles.filter((vehicle) => vehicle.status === "Rented").length / vehicles.length) * 100)
    : 0;
  const bookingCountByStatus = (label) =>
    filteredBookings.filter((booking) => booking.status === label || booking.paymentStatus === label).length;
  const paymentAmountBy = (labels) =>
    filteredPayments
      .filter((payment) => labels.includes(payment.status))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const vehicleRentalDays = (vehicleId) =>
    filteredBookings
      .filter((booking) => booking.vehicleId === vehicleId)
      .reduce((sum, booking) => sum + Number(booking.days || 0), 0);
  const customerBookings = (customerId) => bookings.filter((booking) => booking.customerId === customerId);
  const bookingRows = filteredBookings.map((booking) => {
    const customer = customers.find((item) => item.id === booking.customerId);
    const vehicle = vehicles.find((item) => item.id === booking.vehicleId);
    return {
      "Booking ID": booking.reference,
      Customer: customer?.name || "Guest Customer",
      Vehicle: vehicle?.name || "Unknown vehicle",
      "Pickup Date": booking.pickupDate,
      "Return Date": booking.returnDate,
      "Pickup Branch": booking.branch,
      "Return Branch": booking.returnBranch || booking.branch,
      Status: booking.status,
      Amount: booking.total,
    };
  });
  const revenueRows = filteredBookings.map((booking) => {
    const customer = customers.find((item) => item.id === booking.customerId);
    const vehicle = vehicles.find((item) => item.id === booking.vehicleId);
    const payment = payments.find((item) => item.booking === booking.reference);
    return {
      "Booking ID": booking.reference,
      Customer: customer?.name || payment?.customer || "Guest Customer",
      Vehicle: vehicle?.name || "Unknown vehicle",
      "Payment Status": payment?.status || booking.paymentStatus || "No data available",
      "Payment Date": payment?.date || "No data available",
      Amount: payment?.amount || booking.total || "No data available",
      "Payment Method": payment?.method || booking.paymentMethod || "No data available",
    };
  });
  const customerRows = (filteredCustomers.length ? filteredCustomers : customers).map((customer) => ({
    "Customer Name": customer.name,
    Email: customer.email,
    Phone: customer.phone || "",
    "Account Status": customer.status || "",
    Bookings: customerBookings(customer.id).length,
  }));
  const vehicleRows = vehicles.map((vehicle) => ({
    Vehicle: vehicle.name,
    "Vehicle Type": vehicle.category,
    Branch: vehicle.branch,
    Status: vehicle.status,
    Bookings: filteredBookings.filter((booking) => booking.vehicleId === vehicle.id).length,
    "Rental Days": vehicleRentalDays(vehicle.id),
    "Current Kilometres": vehicle.currentKilometres || "",
  }));
  const paymentRows = filteredPayments.map((payment) => ({
    "Payment ID": payment.transaction,
    Booking: payment.booking,
    Customer: payment.customer,
    Amount: payment.amount,
    Method: payment.method || "No data available",
    Gateway: payment.gateway || "No data available",
    Status: payment.status,
    Date: payment.date || "No data available",
  }));
  const reports = [
    {
      title: "Booking Report",
      description: "Reservations, statuses and branch activity",
      icon: Icons.CalendarDays,
      filename: "rentivo-booking-report.csv",
      rows: bookingRows,
      metrics: [
        ["Total bookings", filteredBookings.length],
        ["Confirmed", bookingCountByStatus("Upcoming") + bookingCountByStatus("Active")],
        ["Completed", bookingCountByStatus("Completed")],
        ["Cancelled", bookingCountByStatus("Cancelled")],
        ["Pending", bookingCountByStatus("Pending")],
      ],
    },
    {
      title: "Revenue Report",
      description: "Paid, pending and refunded payment totals",
      icon: Icons.IndianRupee,
      filename: "rentivo-revenue-report.csv",
      rows: revenueRows,
      metrics: [
        ["Total revenue", INR(totalRevenue)],
        ["Paid / captured", INR(paymentAmountBy(["Paid", "Captured"]))],
        ["Pending", INR(paymentAmountBy(["Pending"]))],
        ["Refunded", INR(paymentAmountBy(["Refunded"]))],
      ],
    },
    {
      title: "Customer Report",
      description: "Safe customer account and booking counts",
      icon: Icons.Users,
      filename: "rentivo-customer-report.csv",
      rows: customerRows,
      metrics: [
        ["Total customers", customers.length],
        ["Active customers", activeCustomers],
        ["Customers in filters", filteredCustomers.length || "No data available"],
        ["Returning customers", customers.filter((customer) => customerBookings(customer.id).length > 1).length],
      ],
    },
    {
      title: "Vehicle Usage Report",
      description: "Fleet status, booking count and rental days",
      icon: Icons.CarFront,
      filename: "rentivo-vehicle-usage-report.csv",
      rows: vehicleRows,
      metrics: [
        ["Total vehicles", vehicles.length],
        ["Available", vehicles.filter((vehicle) => vehicle.status === "Available").length],
        ["Rented", vehicles.filter((vehicle) => vehicle.status === "Rented").length],
        ["Maintenance", vehicles.filter((vehicle) => vehicle.status === "Maintenance").length],
      ],
    },
    {
      title: "Payment Report",
      description: "Payment records from the current filtered bookings",
      icon: Icons.CreditCard,
      filename: "rentivo-payment-report.csv",
      rows: paymentRows,
      metrics: [
        ["Total payments", filteredPayments.length],
        ["Successful", filteredPayments.filter((payment) => ["Paid", "Captured"].includes(payment.status)).length],
        ["Pending", filteredPayments.filter((payment) => payment.status === "Pending").length],
        ["Refunded", filteredPayments.filter((payment) => payment.status === "Refunded").length],
      ],
    },
  ];

  return (
    <AdminPage title="Reports" subtitle="Export a clear view of performance across your branches.">
      <div className="report-filters">
        <label className="field">
          <span>Date range</span>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            {['Last 7 days', 'Last 30 days', 'Last 90 days', 'This year', 'All time'].map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Branch</span>
          <select value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option>All branches</option>
            {branches.map((item) => <option key={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Booking status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {bookingStatuses.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>
      <div className="report-summary metrics">
        <Metric label="Total bookings" value={filteredBookings.length} change={dateRange.toLowerCase()} icon={Icons.CalendarDays} />
        <Metric label="Total revenue" value={INR(totalRevenue)} change="filtered bookings" icon={Icons.IndianRupee} />
        <Metric label="Active customers" value={activeCustomers} change="all customers" icon={Icons.Users} />
        <Metric label="Vehicle utilization" value={utilization + "%"} change="current fleet" icon={Icons.CarFront} />
      </div>
      {!filteredBookings.length && (
        <EmptyState title="No report data matches the selected filters." text="Try a wider date range, branch, or booking status." />
      )}
      <div className="report-grid reports-balanced">
        {reports.map(({ title, description, icon: Icon, filename, rows, metrics }) => (
          <article key={title}>
            <div className="report-card-head">
              <Icon />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </div>
            <div className="report-metrics">
              {metrics.map(([label, value]) => (
                <p key={label}>
                  <span>{label}</span>
                  <b>{value}</b>
                </p>
              ))}
            </div>
            {!rows.length && <p className="empty-note">No data available</p>}
            <Button variant="secondary" className="full" onClick={() => downloadCsv(filename, rows)}>
              <Icons.Download size={15} /> Export CSV
            </Button>
          </article>
        ))}
      </div>
    </AdminPage>
  );
}
function Settings() {
  const { settings, setSettings } = useApp();
  const [message, setMessage] = useState("");
  const saveSettings = (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSettings((current) => ({
      ...current,
      businessName: values.get("businessName")?.trim() || current.businessName,
      supportEmail: values.get("supportEmail")?.trim() || current.supportEmail,
      supportPhone: values.get("supportPhone")?.trim() || current.supportPhone,
      gstPercentage: Number(values.get("gstPercentage")) || current.gstPercentage,
      defaultSecurityDeposit: Number(values.get("defaultSecurityDeposit")) || current.defaultSecurityDeposit,
      requireLicenceBeforeConfirmation: values.has("requireLicenceBeforeConfirmation")
        ? values.get("requireLicenceBeforeConfirmation") === "on"
        : current.requireLicenceBeforeConfirmation,
      sendBookingNotifications: values.has("sendBookingNotifications")
        ? values.get("sendBookingNotifications") === "on"
        : current.sendBookingNotifications,
    }));
    setMessage("Settings saved.");
  };
  return (
    <AdminPage
      title="Settings"
      subtitle="Manage business defaults for the Rentivo operations team."
    >
      <div className="settings-grid">
        <form className="form-card" onSubmit={saveSettings}>
          <h2>Business profile</h2>
          <FormInput
            label="Business name"
            name="businessName"
            defaultValue={settings.businessName}
          />
          <FormInput label="Support email" name="supportEmail" defaultValue={settings.supportEmail} />
          <FormInput label="Support phone" name="supportPhone" defaultValue={settings.supportPhone} />
          <Button type="submit">Save changes</Button>
        </form>
        <form className="form-card" onSubmit={saveSettings}>
          <h2>Rental defaults</h2>
          <FormInput
            label="GST percentage"
            name="gstPercentage"
            defaultValue={settings.gstPercentage}
            type="number"
          />
          <FormInput
            label="Default security deposit"
            name="defaultSecurityDeposit"
            defaultValue={settings.defaultSecurityDeposit}
            type="number"
          />
          <label className="check-row settings-check-row">
            <input
              type="checkbox"
              name="requireLicenceBeforeConfirmation"
              defaultChecked={settings.requireLicenceBeforeConfirmation}
            />
            <span>Require licence before confirmation</span>
          </label>
          <label className="check-row settings-check-row">
            <input
              type="checkbox"
              name="sendBookingNotifications"
              defaultChecked={settings.sendBookingNotifications}
            />
            <span>Send booking notifications</span>
          </label>
          <Button type="submit">Update defaults</Button>
        </form>
      </div>
      {message && <p className="green">{message}</p>}
    </AdminPage>
  );
}
function CustomerDashboard() {
  const { user, bookings, customers } = useApp();
  const location = useLocation();
  const nav = useNavigate();
  const [showNewCustomerWelcome, setShowNewCustomerWelcome] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    const welcomeEmail = window.sessionStorage.getItem(REGISTRATION_WELCOME_KEY);
    if (welcomeEmail && welcomeEmail === user.email.toLowerCase()) {
      setShowNewCustomerWelcome(true);
      window.sessionStorage.removeItem(REGISTRATION_WELCOME_KEY);
      nav(location.pathname, { replace: true, state: {} });
    }
  }, [user?.email, nav, location.pathname]);
  const c =
    customers.find((customer) => customer.email?.toLowerCase() === user?.email?.toLowerCase()) ||
    customers.find((customer) => customer.id === user?.id) ||
    user || null;

  const customerFirstName =
    user?.firstName || c?.firstName || (c?.name || user?.name || "").split(" ")[0] || "Customer";

  const customerBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        b.customerId === user?.id ||
        b.customerId === c?.id ||
        (user?.email &&
          customers
            .find((cust) => cust.id === b.customerId)
            ?.email?.toLowerCase() === user.email.toLowerCase()),
    );
  }, [bookings, user, c, customers]);

  const activeOrUpcoming = useMemo(() => {
    return (
      customerBookings.find((b) => b.status === "Active") ||
      customerBookings.find((b) => b.status === "Upcoming")
    );
  }, [customerBookings]);

  const activeCount = customerBookings.filter(
    (b) => b.status === "Active",
  ).length;
  const upcomingCount = customerBookings.filter(
    (b) => b.status === "Upcoming",
  ).length;
  const completedCount = customerBookings.filter(
    (b) => b.status === "Completed",
  ).length;

  const initials = (
    (user?.firstName && user?.lastName ? `${user.firstName[0]}${user.lastName[0]}` : null) ||
    (c?.firstName && c?.lastName ? `${c.firstName[0]}${c.lastName[0]}` : null) ||
    (c?.name || user?.name || "Customer")
      .split(" ")
      .map((n) => n[0])
      .join("")
  )
    .slice(0, 2)
    .toUpperCase();

  return (
    <CustomerLayout>
      <section className="account-page">
        <div className="account-hero">
          <div className="avatar">{initials}</div>
          <div>
            <p className="eyebrow blue">CUSTOMER DASHBOARD</p>
            <h1>{showNewCustomerWelcome ? "Welcome" : "Welcome back"}, {customerFirstName}!</h1>
            <p>
              Manage your active rentals, view trip history, and reserve your
              next drive.
            </p>
          </div>
          <Link className="btn" to="/cars">
            <Icons.CarFront size={18} /> Browse cars
          </Link>
        </div>

        <div className="metrics" style={{ marginBottom: "28px" }}>
          <Metric
            label="Total rentals"
            value={customerBookings.length}
            change="all time"
            icon={Icons.CalendarDays}
          />
          <Metric
            label="Active bookings"
            value={activeCount}
            change="current"
            icon={Icons.KeyRound}
          />
          <Metric
            label="Upcoming bookings"
            value={upcomingCount}
            change="reserved"
            icon={Icons.Clock}
          />
          <Metric
            label="Completed rentals"
            value={completedCount}
            change="finished"
            icon={Icons.CircleCheck}
          />
        </div>

        <div className="dashboard-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <section className="form-card">
              <h2>Current / Upcoming Reservation</h2>
              {activeOrUpcoming ? (
                <BookingRow b={activeOrUpcoming} />
              ) : (
                <div className="empty" style={{ padding: "24px 0" }}>
                  <Icons.CarFront size={36} style={{ opacity: 0.5 }} />
                  <h3>No active or upcoming reservations</h3>
                  <p>
                    Ready for your next journey? Explore our available fleet
                    today.
                  </p>
                  <Link
                    className="btn small"
                    to="/cars"
                    style={{ marginTop: "12px" }}
                  >
                    Explore vehicles
                  </Link>
                </div>
              )}
            </section>

            <section className="table-card" style={{ padding: "20px" }}>
              <div className="card-heading" style={{ marginBottom: "16px" }}>
                <div>
                  <h3>Recent rental history</h3>
                  <p>Your recent reservations and statuses</p>
                </div>
                <Link to="/bookings" className="text-link">
                  View all bookings <Icons.ArrowRight size={15} />
                </Link>
              </div>
              {customerBookings.length ? (
                customerBookings
                  .slice(0, 3)
                  .map((b) => <BookingRow b={b} key={b.id} />)
              ) : (
                <EmptyState
                  title="No booking history yet"
                  text="When you reserve a car, your bookings will appear here."
                />
              )}
            </section>
          </div>

          <aside style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <section className="booking-panel">
              <h3>Quick actions</h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginTop: "12px",
                }}
              >
                <Link className="btn secondary full" to="/cars">
                  <Icons.Search size={16} /> Browse cars
                </Link>
                <Link className="btn secondary full" to="/bookings">
                  <Icons.CalendarDays size={16} /> My bookings
                </Link>
                <Link className="btn secondary full" to="/profile">
                  <Icons.User size={16} /> Edit profile
                </Link>
                <Link className="btn secondary full" to="/profile#identity-verification">
                  <Icons.ShieldCheck size={16} /> Identity verification
                </Link>
              </div>
            </section>

            <section className="booking-panel">
              <h3>Account summary</h3>
              <div
                className="info-list"
                style={{ marginTop: "12px", fontSize: "14px" }}
              >
                <p>
                  <span>Name</span>
                  <b>
                    {c?.name ||
                      user?.name ||
                      [c?.firstName || user?.firstName, c?.lastName || user?.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                      "Not provided"}
                  </b>
                </p>
                <p>
                  <span>Email</span>
                  <b>{c?.email || user?.email || "Not provided"}</b>
                </p>
                <p>
                  <span>Phone</span>
                  <b>{c?.phone || user?.phone || "Not provided"}</b>
                </p>
                <p>
                  <span>Identity status</span>
                  <StatusBadge>{identityStatusLabel(getIdentityVerification(c).status)}</StatusBadge>
                </p>
                <p>
                  <span>Aadhaar / National ID</span>
                  <b>{identityStatusLabel(getIdentityVerification(c).aadhaar.status)}</b>
                </p>
                <p>
                  <span>Driving Licence</span>
                  <b>{identityStatusLabel(getIdentityVerification(c).drivingLicence.status)}</b>
                </p>
                <p>
                  <span>Licence</span>
                  <b>{c?.licence || user?.licence || "Not provided"}</b>
                </p>
              </div>
              <Link
                className="text-link"
                to="/profile"
                style={{ marginTop: "12px", display: "inline-block" }}
              >
                Manage account <Icons.ArrowRight size={14} />
              </Link>
            </section>
          </aside>
        </div>
      </section>
    </CustomerLayout>
  );
}
function RequireCustomer({ children }) {
  const { user } = useApp();
  return user && (user.role === "customer" || user.role === "admin") ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
}
function RequireAdmin({ children }) {
  const { user } = useApp();
  return user && user.role === "admin" ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
}
function LogoutDialog({ open, onOk }) {
  const okRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    okRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") onOk();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onOk]);

  if (!open) return null;

  return (
    <div className="modal-backdrop logout-backdrop" role="presentation">
      <section className="modal logout-modal" role="dialog" aria-modal="true" aria-labelledby="logout-title">
        <Icons.CheckCircle size={42} aria-hidden="true" />
        <h2 id="logout-title">You have been logged out!</h2>
        <button ref={okRef} className="btn" type="button" onClick={onOk}>OK</button>
      </section>
    </div>
  );
}

function AppRoutes() {
  const nav = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    const handleLoggedOut = () => setLogoutDialogOpen(true);
    window.addEventListener("rentivo:logged-out", handleLoggedOut);
    return () => window.removeEventListener("rentivo:logged-out", handleLoggedOut);
  }, []);

  const closeLogoutDialog = () => {
    setLogoutDialogOpen(false);
    nav("/login", { replace: true });
  };

  return (
    <>
      <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/cars/:id" element={<VehicleDetails />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/booking-confirmation" element={<Confirmation />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth register />} />
          <Route
            path="/dashboard"
            element={
              <RequireCustomer>
                <CustomerDashboard />
              </RequireCustomer>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireCustomer>
                <Profile />
              </RequireCustomer>
            }
          />
          <Route
            path="/bookings"
            element={
              <RequireCustomer>
                <Bookings />
              </RequireCustomer>
            }
          />
          <Route
            path="/bookings/:id"
            element={
              <RequireCustomer>
                <Bookings />
              </RequireCustomer>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/vehicles"
            element={
              <RequireAdmin>
                <CrudPage type="Vehicles" />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <RequireAdmin>
                <CrudPage type="Categories" />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/branches"
            element={
              <RequireAdmin>
                <CrudPage type="Branches" />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <RequireAdmin>
                <CrudPage type="Customers" />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <RequireAdmin>
                <AdminBookings />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <RequireAdmin>
                <Payments />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/maintenance"
            element={
              <RequireAdmin>
                <Maintenance />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireAdmin>
                <Reports />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireAdmin>
                <Settings />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <LogoutDialog open={logoutDialogOpen} onOk={closeLogoutDialog} />
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
createRoot(document.getElementById("root")).render(<App />);
