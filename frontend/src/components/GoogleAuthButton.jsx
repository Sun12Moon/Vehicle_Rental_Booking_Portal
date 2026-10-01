import React, { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useApp } from "../context/AppContext";

export function GoogleLogo({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

const DEFAULT_DEMO_ACCOUNTS = [
  {
    name: "Alex Kumar",
    firstName: "Alex",
    lastName: "Kumar",
    email: "alex.kumar@gmail.com",
    picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
    phone: "+91 98450 11223"
  },
  {
    name: "Priya Sharma",
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya.sharma@gmail.com",
    picture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    phone: "+91 97312 44556"
  }
];

function AccountChooserModal({ isOpen, onClose, onSelect, mode, loading }) {
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  if (!isOpen) return null;

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customEmail)) return;
    const [firstName = "Google", ...rest] = (customName || customEmail.split("@")[0]).trim().split(" ");
    const lastName = rest.join(" ") || "User";
    onSelect({
      email: customEmail.toLowerCase().trim(),
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firstName + " " + lastName)}`
    });
  };

  return (
    <div className="google-modal-overlay" onClick={onClose}>
      <div className="google-account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="google-modal-header">
          <GoogleLogo size={28} />
          <h2>{mode === "signup" ? "Sign up with Google" : "Sign in with Google"}</h2>
          <p className="subtext">Choose an account to continue to <strong>Rentivo Mobility</strong></p>
        </div>

        <div className="google-dev-notice">
          <span className="notice-dot"></span>
          <span>Google OAuth Simulation & Live Ready Mode</span>
        </div>

        {!isCustomMode ? (
          <div className="google-accounts-list">
            {DEFAULT_DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="google-account-item"
                disabled={loading}
                onClick={() => onSelect(acc)}
              >
                <img src={acc.picture} alt={acc.name} className="account-avatar" />
                <div className="account-info">
                  <span className="account-name">{acc.name}</span>
                  <span className="account-email">{acc.email}</span>
                </div>
                <span className="account-chevron">&rsaquo;</span>
              </button>
            ))}

            <button
              type="button"
              className="google-account-item custom-trigger"
              disabled={loading}
              onClick={() => setIsCustomMode(true)}
            >
              <div className="account-avatar placeholder-avatar">+</div>
              <div className="account-info">
                <span className="account-name">Use another Google account</span>
                <span className="account-email">Enter custom @gmail.com address</span>
              </div>
              <span className="account-chevron">&rsaquo;</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="custom-account-form">
            <div className="field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Verma"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <label>Google Email address</label>
              <input
                type="email"
                placeholder="name@gmail.com"
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn small secondary"
                onClick={() => setIsCustomMode(false)}
                disabled={loading}
              >
                Back
              </button>
              <button type="submit" className="btn small" disabled={loading || !customEmail}>
                {loading ? "Authenticating..." : mode === "signup" ? "Continue Sign Up" : "Continue Sign In"}
              </button>
            </div>
          </form>
        )}

        <div className="google-modal-footer">
          <small>
            To enable production Google Cloud login, add your <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code>.
          </small>
          <button type="button" className="close-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandedGoogleButton({ onClick, loading, mode }) {
  return (
    <button
      type="button"
      className="google-btn"
      onClick={onClick}
      disabled={loading}
      aria-label={mode === "signup" ? "Sign up with Google" : "Sign in with Google"}
    >
      <span className="google-btn-icon">
        <GoogleLogo size={20} />
      </span>
      <span className="google-btn-text">
        {loading
          ? "Connecting with Google..."
          : mode === "signup"
          ? "Sign up with Google"
          : "Sign in with Google"}
      </span>
    </button>
  );
}

function LiveGoogleClient({ mode, onSuccess, onError, setLoading, loading, onOpenModal }) {
  const { googleAuth } = useApp();

  const handleLiveSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const res = await googleAuth({
        credential: credentialResponse.credential
      });
      if (res?.success) {
        onSuccess?.(res.user);
      }
    } catch (err) {
      onError?.(err.message || "Failed to authenticate with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleLiveError = () => {
    onError?.("Google authentication was unsuccessful or closed.");
  };

  return (
    <div className="google-live-wrapper">
      <div className="google-login-styled">
        <GoogleLogin
          onSuccess={handleLiveSuccess}
          onError={handleLiveError}
          shape="rectangular"
          theme="outline"
          size="large"
          text={mode === "signup" ? "signup_with" : "signin_with"}
          width="100%"
          logo_alignment="center"
        />
      </div>
      <button
        type="button"
        className="google-demo-switch-link"
        onClick={onOpenModal}
      >
        or choose a demo Google account
      </button>
    </div>
  );
}

export default function GoogleAuthButton({ mode = "signup", onSuccess, onError }) {
  const { googleAuth } = useApp();
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasLiveClientId = Boolean(
    rawClientId &&
    rawClientId.trim() !== "" &&
    rawClientId !== "your_google_oauth_client_id_here"
  );

  const handleAccountSelect = async (account) => {
    try {
      setLoading(true);
      const res = await googleAuth({
        email: account.email,
        name: account.name,
        firstName: account.firstName,
        lastName: account.lastName,
        picture: account.picture,
        phone: account.phone,
        googleId: `goog_${Date.now()}`
      });
      setIsModalOpen(false);
      if (res?.success) {
        onSuccess?.(res.user);
      }
    } catch (err) {
      onError?.(err.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="google-auth-container">
      {hasLiveClientId ? (
        <GoogleOAuthProvider clientId={rawClientId}>
          <LiveGoogleClient
            mode={mode}
            onSuccess={onSuccess}
            onError={onError}
            loading={loading}
            setLoading={setLoading}
            onOpenModal={() => setIsModalOpen(true)}
          />
        </GoogleOAuthProvider>
      ) : (
        <BrandedGoogleButton
          mode={mode}
          loading={loading}
          onClick={() => setIsModalOpen(true)}
        />
      )}

      <AccountChooserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleAccountSelect}
        mode={mode}
        loading={loading}
      />
    </div>
  );
}
