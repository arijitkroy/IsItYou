import React, { useState } from "react";
import { 
  X, 
  Mail, 
  Lock, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  Settings, 
  Check, 
  Database 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getFirebaseConfig, saveCustomFirebaseConfig, clearCustomFirebaseConfig } from "../lib/firebase";

export default function AuthModal({ isOpen, onClose, initialMode = "login" }) {
  const { login, signup, isConfigured } = useAuth();
  const [activeMode, setActiveMode] = useState(initialMode || (isConfigured ? "login" : "config"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [signupSuccessEmail, setSignupSuccessEmail] = useState(null);

  React.useEffect(() => {
    if (isOpen && initialMode) {
      setActiveMode(initialMode);
      setErrorMessage("");
      setSignupSuccessEmail(null);
    }
  }, [isOpen, initialMode]);

  const initialConfig = getFirebaseConfig();
  const [configForm, setConfigForm] = useState({
    apiKey: initialConfig.apiKey || "",
    authDomain: initialConfig.authDomain || "",
    projectId: initialConfig.projectId || "",
    storageBucket: initialConfig.storageBucket || "",
    messagingSenderId: initialConfig.messagingSenderId || "",
    appId: initialConfig.appId || "",
  });

  if (!isOpen) return null;

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (activeMode === "login") {
        await login(email, password);
        onClose();
      } else if (activeMode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        await signup(email, password);
        setSignupSuccessEmail(email);
      }
    } catch (err) {
      let msg = err.message || "Authentication failed.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        msg = "Invalid email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password is too weak. Must be at least 6 characters.";
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    if (!configForm.apiKey.trim() || !configForm.projectId.trim()) {
      setErrorMessage("API Key and Project ID are required.");
      return;
    }
    saveCustomFirebaseConfig(configForm);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      background: "rgba(5, 7, 12, 0.85)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "460px",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-medium)",
        borderRadius: "8px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        overflow: "hidden"
      }}>
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-surface-elevated)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Database size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc", fontFamily: "var(--font-mono)" }}>
              {activeMode === "login" ? "USER AUTHENTICATION" : activeMode === "signup" ? "CREATE ACCOUNT" : "FIREBASE SETUP"}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ color: "var(--text-muted)", padding: "4px", borderRadius: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          display: "flex",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(0, 0, 0, 0.2)"
        }}>
          <button
            onClick={() => { setActiveMode("login"); setErrorMessage(""); }}
            style={{
              flex: 1,
              padding: "10px",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              color: activeMode === "login" ? "var(--accent-cyan)" : "var(--text-muted)",
              borderBottom: activeMode === "login" ? "2px solid var(--accent-cyan)" : "2px solid transparent",
              background: activeMode === "login" ? "rgba(6, 182, 212, 0.06)" : "transparent"
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveMode("signup"); setErrorMessage(""); }}
            style={{
              flex: 1,
              padding: "10px",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              color: activeMode === "signup" ? "var(--accent-emerald)" : "var(--text-muted)",
              borderBottom: activeMode === "signup" ? "2px solid var(--accent-emerald)" : "2px solid transparent",
              background: activeMode === "signup" ? "rgba(16, 185, 129, 0.06)" : "transparent"
            }}
          >
            Register
          </button>
          <button
            onClick={() => { setActiveMode("config"); setErrorMessage(""); }}
            style={{
              padding: "10px 16px",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              color: activeMode === "config" ? "var(--accent-amber)" : "var(--text-muted)",
              borderBottom: activeMode === "config" ? "2px solid var(--accent-amber)" : "2px solid transparent",
              background: activeMode === "config" ? "rgba(245, 158, 11, 0.06)" : "transparent"
            }}
          >
            <Settings size={14} style={{ display: "inline", marginRight: "4px" }} />
            Config
          </button>
        </div>

        <div style={{ padding: "24px 20px" }}>
          {errorMessage && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "4px",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fca5a5",
              fontSize: "0.78rem",
              marginBottom: "16px"
            }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {signupSuccessEmail ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "var(--accent-emerald)"
              }}>
                <Check size={22} />
              </div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f8fafc", marginBottom: "8px" }}>
                Verification Link Dispatched
              </h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "20px" }}>
                An authentication confirmation link was sent to <strong>{signupSuccessEmail}</strong>. You must verify your email before accessing the biometric identification console.
              </p>
              <button
                onClick={() => {
                  setSignupSuccessEmail(null);
                  onClose();
                }}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: "4px",
                  background: "var(--accent-emerald)",
                  color: "#022c22",
                  fontWeight: 600,
                  fontSize: "0.84rem",
                  fontFamily: "var(--font-mono)"
                }}
              >
                Proceed to Verification Console
              </button>
            </div>
          ) : activeMode === "config" ? (
            <form onSubmit={handleSaveConfig}>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Enter your Firebase Web App credentials or define them in <code>frontend/.env.local</code>.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
                {Object.keys(configForm).map((key) => (
                  <div key={key}>
                    <label style={{
                      display: "block",
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      marginBottom: "4px",
                      textTransform: "uppercase"
                    }}>
                      {key}
                    </label>
                    <input
                      type="text"
                      value={configForm[key]}
                      onChange={(e) => setConfigForm({ ...configForm, [key]: e.target.value })}
                      placeholder={`Enter ${key}`}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        background: "var(--bg-surface-elevated)",
                        border: "1px solid var(--border-medium)",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontFamily: "var(--font-mono)",
                        color: "#f8fafc",
                        outline: "none"
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "9px 16px",
                    background: "var(--accent-amber)",
                    color: "#451a03",
                    fontWeight: 600,
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    fontFamily: "var(--font-mono)"
                  }}
                >
                  Save Configuration
                </button>
                <button
                  type="button"
                  onClick={clearCustomFirebaseConfig}
                  style={{
                    padding: "9px 14px",
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-muted)",
                    borderRadius: "4px",
                    fontSize: "0.78rem"
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleAuthSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
                <div>
                  <label style={{
                    display: "block",
                    fontSize: "0.72rem",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-secondary)",
                    marginBottom: "6px"
                  }}>
                    EMAIL ADDRESS
                  </label>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "4px",
                    padding: "8px 12px"
                  }}>
                    <Mail size={16} color="var(--text-muted)" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      style={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        flex: 1,
                        fontSize: "0.84rem",
                        color: "#f8fafc"
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{
                    display: "block",
                    fontSize: "0.72rem",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-secondary)",
                    marginBottom: "6px"
                  }}>
                    PASSWORD
                  </label>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-medium)",
                    borderRadius: "4px",
                    padding: "8px 12px"
                  }}>
                    <Lock size={16} color="var(--text-muted)" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        flex: 1,
                        fontSize: "0.84rem",
                        color: "#f8fafc"
                      }}
                    />
                  </div>
                </div>

                {activeMode === "signup" && (
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "0.72rem",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-secondary)",
                      marginBottom: "6px"
                    }}>
                      CONFIRM PASSWORD
                    </label>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "4px",
                      padding: "8px 12px"
                    }}>
                      <Lock size={16} color="var(--text-muted)" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          flex: 1,
                          fontSize: "0.84rem",
                          color: "#f8fafc"
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: "4px",
                  background: activeMode === "login" ? "var(--accent-cyan)" : "var(--accent-emerald)",
                  color: "#082f49",
                  fontWeight: 600,
                  fontSize: "0.84rem",
                  fontFamily: "var(--font-mono)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px"
                }}
              >
                {activeMode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
                {isSubmitting ? "Authenticating..." : activeMode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
