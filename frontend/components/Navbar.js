import React from "react";
import { ShieldCheck, UserCheck, Search, Activity, Cpu, Users, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar({
  activeTab,
  setActiveTab,
  backendStatus,
  profiles,
  activeProfileId,
  setActiveProfileId,
  onOpenAuth,
}) {
  const { user, logout } = useAuth();
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <header style={{
      borderBottom: "1px solid var(--border-subtle)",
      background: "rgba(14, 18, 25, 0.8)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 100,
      padding: "0 24px"
    }}>
      <div style={{
        maxWidth: "1600px",
        margin: "0 auto",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "6px",
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(16, 185, 129, 0.1))",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-cyan)"
          }}>
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "1.1rem",
                letterSpacing: "-0.02em",
                color: "#f8fafc"
              }}>
                IsItYou?
              </span>
              <span className="mono-tag" style={{
                fontSize: "0.65rem",
                padding: "2px 6px",
                borderRadius: "3px",
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)"
              }}>
                v1.0.0
              </span>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.01em" }}>
              Deep Biometric Verification & Topological HUD
            </p>
          </div>
        </div>

        <nav style={{
          display: "flex",
          alignItems: "center",
          background: "var(--bg-surface-elevated)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "6px",
          padding: "3px"
        }}>
          <button
            onClick={() => setActiveTab("verify")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 16px",
              borderRadius: "4px",
              fontSize: "0.82rem",
              fontWeight: 500,
              fontFamily: "var(--font-mono)",
              background: activeTab === "verify" ? "rgba(6, 182, 212, 0.15)" : "transparent",
              color: activeTab === "verify" ? "#38bdf8" : "var(--text-secondary)",
              border: activeTab === "verify" ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid transparent",
              transition: "all 0.15s ease"
            }}
          >
            <Search size={15} />
            Verification HUD
          </button>
          <button
            onClick={() => setActiveTab("enroll")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 16px",
              borderRadius: "4px",
              fontSize: "0.82rem",
              fontWeight: 500,
              fontFamily: "var(--font-mono)",
              background: activeTab === "enroll" ? "rgba(16, 185, 129, 0.15)" : "transparent",
              color: activeTab === "enroll" ? "#34d399" : "var(--text-secondary)",
              border: activeTab === "enroll" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid transparent",
              transition: "all 0.15s ease"
            }}
          >
            <UserCheck size={15} />
            Enroll Friend ({profiles.length})
          </button>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {profiles.length > 0 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              padding: "5px 10px",
              borderRadius: "4px",
              fontSize: "0.76rem"
            }}>
              <Users size={14} color="var(--text-muted)" />
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>Target:</span>
              <select
                value={activeProfileId || ""}
                onChange={(e) => setActiveProfileId(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  cursor: "pointer"
                }}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: "var(--bg-surface)" }}>
                    {p.name} ({p.sample_count} photos)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            padding: "5px 10px",
            borderRadius: "4px"
          }}>
            <div style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: backendStatus.online ? "var(--accent-emerald)" : "var(--accent-crimson)",
              boxShadow: backendStatus.online ? "0 0 6px rgba(16, 185, 129, 0.8)" : "none"
            }} />
            <span className="mono-tag" style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
              {backendStatus.online ? `Core ${backendStatus.device || "Ready"}` : "Core Offline"}
            </span>
          </div>

          {user ? (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              padding: "4px 8px 4px 10px",
              borderRadius: "4px"
            }}>
              <span className="mono-tag" style={{ fontSize: "0.72rem", color: "#34d399", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email}
              </span>
              <button
                onClick={logout}
                title="Sign Out"
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                  color: "var(--text-muted)",
                  borderRadius: "3px",
                  transition: "color 0.15s ease"
                }}
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "4px",
                background: "rgba(6, 182, 212, 0.12)",
                border: "1px solid rgba(6, 182, 212, 0.4)",
                color: "#38bdf8",
                fontSize: "0.76rem",
                fontWeight: 600,
                fontFamily: "var(--font-mono)"
              }}
            >
              <LogIn size={13} />
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
