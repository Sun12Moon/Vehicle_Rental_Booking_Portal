import React, {
  useEffect,
  useMemo,
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
  useNavigate,
  useParams,
} from "react-router-dom";
import * as Icons from "lucide-react";
import { AppProvider, useApp } from "./context/AppContext";
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
function FormInput({ label, error, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
      {error && <small className="error">{error}</small>}
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
  return (
    <header className="navbar">
      <Link className="brand" to="/">
        <span>R</span> Rentivo
      </Link>
      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/cars">Cars</NavLink>
        {user && user.role !== "admin" && (
          <>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/bookings">My Bookings</NavLink>
          </>
        )}
        <a href="/#offers">Offers</a>
        <a href="/#about">About</a>
        <a href="/#contact">Contact</a>
      </nav>
      <div className="nav-actions">
        {user ? (
          <>
            {user.role === "admin" && (
              <Link className="btn small secondary" to="/admin">
                Admin Console
              </Link>
            )}
            <Link className="profile-link" to="/profile">
              Hi, {user.firstName}
            </Link>
            <Button variant="ghost" onClick={logout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link className="btn small" to="/register">
              Register
            </Link>
          </>
        )}
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
function VehicleCard({ vehicle }) {
  return (
    <article className="vehicle-card">
      <img src={vehicle.image} alt={`${vehicle.brand} ${vehicle.model}`} />
      <div className="vehicle-card-body">
        <div className="card-top">
          <div>
            <p className="eyebrow">{vehicle.category}</p>
            <h3>{vehicle.name}</h3>
          </div>
          <StatusBadge>{vehicle.status}</StatusBadge>
        </div>
        <div className="features">
          <span>
            <Icons.GitBranch size={15} />
            {vehicle.transmission}
          </span>
          <span>
            <Icons.Fuel size={15} />
            {vehicle.fuel}
          </span>
          <span>
            <Icons.Users size={15} />
            {vehicle.seats} seats
          </span>
        </div>
        <div className="price-row">
          <div>
            <strong>{INR(vehicle.dailyRate)}</strong>
            <small>/ day</small>
          </div>
          <div>
            <Link className="btn secondary small" to={`/cars/${vehicle.id}`}>
              Details
            </Link>
            <Link className="btn small" to={`/booking?vehicle=${vehicle.id}`}>
              Book now
            </Link>
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
  return (
    <CustomerLayout>
      <div className="detail-page">
        <div>
          <div className="gallery">
            <img src={v.image} alt={v.name} />
            <img src={v.gallery[1]} alt={`${v.name} interior`} />
          </div>
          <p className="eyebrow blue">
            {v.category} · {v.branch}
          </p>
          <h1>{v.name}</h1>
          <p className="lead">{v.description}</p>
          <section className="specs">
            <h2>Vehicle specifications</h2>
            {[
              ["Brand", v.brand],
              ["Model", v.model],
              ["Variant", v.variant],
              ["Year", v.year],
              ["Colour", v.colour],
              ["Fuel", v.fuel],
              ["Transmission", v.transmission],
              ["Engine", v.engine],
              ["Seats", v.seats],
              ["Mileage", v.mileage],
            ].map(([a, b]) => (
              <div key={a}>
                <span>{a}</span>
                <b>{b}</b>
              </div>
            ))}
          </section>
        </div>
        <aside className="booking-panel">
          <StatusBadge>{v.status}</StatusBadge>
          <h2>
            {INR(v.dailyRate)} <small>/ day</small>
          </h2>
          <p>Security deposit: {INR(v.deposit)}</p>
          <hr />
          <p>Includes basic insurance and 24/7 roadside assistance.</p>
          <Link className="btn full" to={`/booking?vehicle=${v.id}`}>
            Book this vehicle <Icons.ArrowRight size={17} />
          </Link>
        </aside>
      </div>
    </CustomerLayout>
  );
}

function Booking() {
  const { vehicles, branches } = useApp();
  const nav = useNavigate();
  const selected =
    new URLSearchParams(location.search).get("vehicle") || vehicles[0].id;
  const [vehicleId, setVehicleId] = useState(selected),
    [form, setForm] = useState({
      pickup: dateISO(new Date(Date.now() + 86400000)),
      return: dateISO(new Date(Date.now() + 3 * 86400000)),
      pickupLocation: branches[0].name,
      returnLocation: branches[0].name,
      code: "",
    });
  const v = vehicles.find((x) => x.id === vehicleId);
  const days = daysBetween(form.pickup, form.return),
    valid = form.return > form.pickup;
  const reserve = (e) => {
    e.preventDefault();
    if (!valid) return;
    nav(
      `/payment?vehicle=${v.id}&pickup=${form.pickup}&return=${form.return}&from=${encodeURIComponent(form.pickupLocation)}&to=${encodeURIComponent(form.returnLocation)}`,
    );
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
            <Button className="full" type="submit" disabled={!valid}>
              Continue to payment <Icons.ArrowRight size={17} />
            </Button>
          </form>
        </section>
        <aside>
          <div className="booking-panel">
            <img src={v.image} alt={v.name} />
            <h3>{v.name}</h3>
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
  const { vehicles, user, createBooking } = useApp();
  const nav = useNavigate(),
    q = new URLSearchParams(location.search),
    v = vehicles.find((x) => x.id === q.get("vehicle")) || vehicles[0],
    days = daysBetween(
      q.get("pickup") || dateISO(new Date()),
      q.get("return") || dateISO(new Date(Date.now() + 86400000)),
    );
  const [method, setMethod] = useState("UPI"),
    [state, setState] = useState("ready");
  const subtotal = v.dailyRate * days,
    discount = 0,
    tax = Math.round((subtotal - discount) * 0.18),
    total = subtotal - discount + tax + v.deposit;
  const pay = () => {
    setState("processing");
    setTimeout(() => {
      if (method === "Wallet") setState("failed");
      else {
        const id = `bk-${Date.now()}`;
        const reference = `RNT-${Math.floor(100000 + Math.random() * 899999)}`;
        const booking = {
          id,
          reference,
          vehicleId: v.id,
          customerId: user?.id || "u1",
          pickupDate: q.get("pickup") || dateISO(new Date()),
          returnDate:
            q.get("return") || dateISO(new Date(Date.now() + 86400000)),
          days,
          branch: decodeURIComponent(q.get("from") || v.branch),
          returnBranch: decodeURIComponent(q.get("to") || q.get("from") || v.branch),
          dailyRate: v.dailyRate,
          subtotal,
          discount,
          tax,
          deposit: v.deposit,
          total,
          paymentMethod: method,
          paymentStatus: "Paid",
          status: "Upcoming",
        };
        const payment = {
          id: `pay-${Date.now()}`,
          transaction: `pay_${Math.random().toString(36).slice(2, 10)}`,
          booking: reference,
          customer: user?.name || "Aditi Menon",
          amount: total,
          method,
          gateway: "Razorpay",
          status: "Paid",
          date: new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        };
        createBooking(booking, payment);
        nav(
          `/booking-confirmation?booking=${id}`,
        );
      }
    }, 800);
  };
  return (
    <CustomerLayout>
      <div className="flow-page">
        <section>
          <p className="eyebrow blue">STEP 2 OF 2</p>
          <h1>Secure payment</h1>
          <div className="payment-card">
            <div className="gateway">
              <span>rzp</span>
              <div>
                <b>Razorpay</b>
                <small>Secure mock checkout</small>
              </div>
              <Icons.LockKeyhole size={18} />
            </div>
            {state === "processing" ? (
              <LoadingState />
            ) : (
              <>
                <h3>Select payment method</h3>
                {["UPI", "Card", "Net Banking", "Wallet"].map((m) => (
                  <label
                    className={`pay-option ${method === m ? "selected" : ""}`}
                    key={m}
                  >
                    <input
                      type="radio"
                      name="method"
                      checked={method === m}
                      onChange={() => setMethod(m)}
                    />
                    <span>
                      {m === "UPI"
                        ? "UPI"
                        : m === "Card"
                          ? "Credit / Debit Card"
                          : m}
                    </span>
                    {m === "UPI" && <small>Google Pay, PhonePe, Paytm</small>}
                  </label>
                ))}
                {state === "failed" && (
                  <p className="error">
                    Mock payment declined for Wallet. Select another method to
                    continue.
                  </p>
                )}
                <Button className="full" onClick={pay}>
                  Pay {INR(total)}{" "}
                  <Icons.LockKeyhole size={16} />
                </Button>
              </>
            )}
            <p className="secure-note">
              <Icons.ShieldCheck size={15} /> This is a UI prototype. No money
              will be charged.
            </p>
          </div>
        </section>
        <aside className="booking-panel">
          <h3>Booking summary</h3>
          <img src={v.image} alt={v.name} />
          <p>
            <b>{v.name}</b>
            <br />
            {q.get("pickup")} to {q.get("return")}
          </p>
          <PriceBreakdown vehicle={v} days={days} />
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

function Auth({ register = false }) {
  const nav = useNavigate(),
    { login } = useApp(),
    [error, setError] = useState(""),
    [resetMessage, setResetMessage] = useState(""),
    [roleMode, setRoleMode] = useState("customer");
  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (register && fd.get("password") !== fd.get("confirm"))
      return setError("Passwords do not match.");
    if (!register && roleMode === "admin") {
      login({
        firstName: fd.get("firstName") || "Admin",
        lastName: fd.get("lastName") || "Manager",
        email: fd.get("email") || "admin@rentivo.in",
        phone: fd.get("phone") || "+91 99000 00000",
        role: "admin",
      });
      nav("/admin");
    } else if (!register) {
      login({
        email: fd.get("email") || "",
        role: "customer",
      });
      nav("/dashboard");
    } else {
      login({
        firstName: fd.get("firstName") || "",
        lastName: fd.get("lastName") || "",
        email: fd.get("email") || "",
        phone: fd.get("phone") || "",
        role: "customer",
      });
      nav("/dashboard");
    }
  };
  return (
    <CustomerLayout>
      <section className="auth-page">
        <form className="auth-card" onSubmit={submit}>
          <Link className="brand center-brand" to="/">
            <span>R</span> Rentivo
          </Link>
          <h1>{register ? "Create your account" : "Welcome back"}</h1>
          <p>
            {register
              ? "Start booking exceptional journeys."
              : "Sign in to manage your rentals."}
          </p>
          {!register && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", justifyContent: "center" }}>
              <button
                type="button"
                className={`btn small ${roleMode === "customer" ? "" : "secondary"}`}
                onClick={() => setRoleMode("customer")}
              >
                Customer Login
              </button>
              <button
                type="button"
                className={`btn small ${roleMode === "admin" ? "" : "secondary"}`}
                onClick={() => setRoleMode("admin")}
              >
                Admin Login
              </button>
            </div>
          )}
          {register && (
            <div className="two-col">
              <FormInput name="firstName" label="First name" required />
              <FormInput name="lastName" label="Last name" required />
            </div>
          )}
          <FormInput
            name="email"
            label="Email address"
            type="email"
            defaultValue={!register && roleMode === "admin" ? "admin@rentivo.in" : ""}
            required
          />
          {register && (
            <FormInput name="phone" label="Phone number" type="tel" required />
          )}
          <FormInput
            name="password"
            label="Password"
            type="password"
            minLength="6"
            required
          />
          {register && (
            <FormInput
              name="confirm"
              label="Confirm password"
              type="password"
              required
            />
          )}
          {!register && (
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
          {register && (
            <label className="check-row">
              <input type="checkbox" required /> I agree to the Terms and
              Privacy Policy
            </label>
          )}
          {error && <p className="error">{error}</p>}
          {resetMessage && <p className="green">{resetMessage}</p>}
          <Button className="full">
            {register ? "Create account" : roleMode === "admin" ? "Login as Admin" : "Login"}
          </Button>
          <p className="auth-switch">
            {register ? "Already have an account? " : "New to Rentivo? "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Login" : "Register"}
            </Link>
          </p>
        </form>
      </section>
    </CustomerLayout>
  );
}
function Profile() {
  const { customers, user, updateProfile } = useApp();
  const [edit, setEdit] = useState(false),
    [message, setMessage] = useState("");
  const c =
    customers.find((customer) => customer.email?.toLowerCase() === user?.email?.toLowerCase()) ||
    customers.find((customer) => customer.id === user?.id) ||
    user ||
    null;

  const displayName = c?.name || user?.name || [c?.firstName || user?.firstName, c?.lastName || user?.lastName].filter(Boolean).join(" ") || "Customer";
  const displayEmail = c?.email || user?.email || "";
  const displayPhone = c?.phone || user?.phone || "";

  const [calcFirstName = "", ...calcLastName] = (displayName || "").split(" ");
  const firstNameVal = c?.firstName || user?.firstName || calcFirstName;
  const lastNameVal = c?.lastName || user?.lastName || calcLastName.join(" ");

  const avatarInitials = (
    (firstNameVal && lastNameVal ? `${firstNameVal[0]}${lastNameVal[0]}` : null) ||
    (displayName ? displayName.split(" ").map((n) => n[0]).join("") : "C")
  )
    .slice(0, 2)
    .toUpperCase();

  return (
    <CustomerLayout>
      <section className="account-page">
        <div className="account-hero">
          <div className="avatar">{avatarInitials}</div>
          <div>
            <p className="eyebrow blue">MY ACCOUNT</p>
            <h1>{displayName}</h1>
            <p>{displayEmail}</p>
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
                name: `${firstName} ${lastName}`.trim(),
                email: values.get("email").trim(),
                phone: values.get("phone").trim(),
                licence: values.get("licence").trim(),
                aadhaar: values.get("aadhaar").trim(),
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
            <FormInput label="Email" name="email" defaultValue={displayEmail} disabled={!edit} />
            <FormInput label="Phone" name="phone" defaultValue={displayPhone} disabled={!edit} />
            <h3>Identity & licence</h3>
            <div className="two-col">
              <FormInput
                label="Driving licence number"
                name="licence"
                defaultValue={c.licence || "KA01 20150012345"}
                disabled={!edit}
              />
              <FormInput
                label="Aadhaar (masked)"
                name="aadhaar"
                defaultValue={c.aadhaar || "XXXX XXXX 4821"}
                disabled={!edit}
              />
            </div>
            <h3>Address & emergency contact</h3>
            <FormInput
              label="Address"
              name="address"
              defaultValue={c.address || "14, Indiranagar, Bengaluru, Karnataka 560038"}
              disabled={!edit}
            />
            <FormInput
              label="Emergency contact"
              name="emergencyContact"
              defaultValue={c.emergencyContact || "Arjun Menon · +91 98765 44321"}
              disabled={!edit}
            />
            {edit && <Button type="submit">Save changes</Button>}
            {message && <p className="green">{message}</p>}
          </form>
          <aside className="booking-panel">
            <h3>Account security</h3>
            <p>Keep your Rentivo account secure with a strong password.</p>
            <Button
              variant="secondary"
              className="full"
              onClick={() => setMessage("Password changes are available in the live account service.")}
            >
              Change password
            </Button>
          </aside>
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
  const v = vehicles.find((x) => x.id === b.vehicleId),
    c = customers.find((x) => x.id === b.customerId);
  return (
    <article className="booking-row">
      <img src={v.image} alt="" />
      <div>
        <p className="eyebrow">{b.reference}</p>
        <h3>{v.name}</h3>
        <p>
          {b.pickupDate} — {b.returnDate} · {b.branch}
        </p>
        {admin && (
          <p>
            {c.name} · {c.email}
          </p>
        )}
      </div>
      <div>
        <StatusBadge>{b.status}</StatusBadge>
        <p>
          <b>{INR(b.total)}</b> · <StatusBadge>{b.paymentStatus}</StatusBadge>
        </p>
      </div>
      <Link
        className="btn secondary small"
        to={admin ? "/admin/bookings" : "/bookings/" + b.id}
      >
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
                <b>{c.name}</b>
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
  const nav = useNavigate();
  const handleLogout = () => {
    logout();
    nav("/login");
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
            <h3>Good morning, Admin</h3>
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
      cols: ["Customer", "Phone", "Joined", "Bookings", "Account", ""],
      render: (c) => (
        <>
          <td>
            <b>{c.name}</b>
            <small>{c.email}</small>
          </td>
          <td>{c.phone}</td>
          <td>{c.joined}</td>
          <td>{bookings.filter((b) => b.customerId === c.id).length}</td>
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
  const [filter, setFilter] = useState("Last 30 days"),
    [branch, setBranch] = useState("All branches"),
    [status, setStatus] = useState("All statuses");
  const visibleBookings = bookings.filter(
    (booking) =>
      (branch === "All branches" || booking.branch === branch) &&
      (status === "All statuses" || booking.status === status),
  );
  const reportRows = (title) => {
    if (title === "Booking report") return visibleBookings.map((booking) => ({ reference: booking.reference, status: booking.status, branch: booking.branch, total: booking.total }));
    if (title === "Revenue report") return visibleBookings.map((booking) => ({ reference: booking.reference, subtotal: booking.subtotal || booking.total - (booking.deposit || 0), tax: booking.tax || "", total: booking.total }));
    if (title === "Customer report") return customers.map((customer) => ({ customer: customer.name, email: customer.email, status: customer.status, bookings: bookings.filter((booking) => booking.customerId === customer.id).length }));
    if (title === "Vehicle usage report") return vehicles.map((vehicle) => ({ vehicle: vehicle.name, category: vehicle.category, branch: vehicle.branch, status: vehicle.status }));
    return payments.map((payment) => ({ transaction: payment.transaction, booking: payment.booking, amount: payment.amount, status: payment.status, date: payment.date }));
  };
  return (
    <AdminPage
      title="Reports"
      subtitle="Export a clear view of performance across your branches."
    >
      <div className="report-filters">
        <label className="field">
          <span>Date range</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>Last 30 days</option>
            <option>This quarter</option>
            <option>This year</option>
          </select>
        </label>
        <label className="field">
          <span>Branch</span>
          <select value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option>All branches</option>
            {branches.map((b) => (
              <option key={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Booking status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All statuses</option>
            <option>Upcoming</option>
            <option>Active</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </label>
      </div>
      <div className="report-grid">
        {[
          [
            "Booking report",
            "Reservations, statuses and branch activity",
            Icons.CalendarDays,
          ],
          [
            "Revenue report",
            "Rental, tax and deposit collections",
            Icons.IndianRupee,
          ],
          [
            "Customer report",
            "New, active and returning customers",
            Icons.Users,
          ],
          [
            "Vehicle usage report",
            "Fleet utilization and rental days",
            Icons.CarFront,
          ],
          [
            "Payment report",
            "Razorpay transaction reconciliation",
            Icons.CreditCard,
          ],
        ].map(([t, d, I]) => (
          <article key={t}>
            <I />
            <h3>{t}</h3>
            <p>{d}</p>
            <Button
              variant="secondary"
              className="full"
              onClick={() => downloadCsv(`${t.toLowerCase().replaceAll(" ", "-")}-${filter.toLowerCase().replaceAll(" ", "-")}.csv`, reportRows(t))}
            >
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
          <label className="check-row">
            <input
              type="checkbox"
              name="requireLicenceBeforeConfirmation"
              defaultChecked={settings.requireLicenceBeforeConfirmation}
            />{" "}
            Require licence before confirmation
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              name="sendBookingNotifications"
              defaultChecked={settings.sendBookingNotifications}
            />{" "}
            Send booking notifications
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
            <h1>Welcome back, {customerFirstName}!</h1>
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
function App() {
  return (
    <AppProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AppProvider>
  );
}
createRoot(document.getElementById("root")).render(<App />);
