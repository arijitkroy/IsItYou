import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import VerificationView from "../components/VerificationView";
import EnrollmentView from "../components/EnrollmentView";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../context/AuthContext";
import { getUserProfiles, saveUserProfile, deleteUserProfile } from "../lib/firestoreService";

export default function Home() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("verify");
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ online: false, device: "CPU" });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMode, setAuthModalInitialMode] = useState("login");

  const openAuth = (mode = "login") => {
    setAuthModalInitialMode(mode);
    setIsAuthModalOpen(true);
  };

  const fetchProfiles = async () => {
    if (!user) {
      setProfiles([]);
      setActiveProfileId(null);
      return;
    }

    try {
      const firestoreProfiles = await getUserProfiles(user.uid);
      setProfiles(firestoreProfiles || []);
      if (firestoreProfiles && firestoreProfiles.length > 0) {
        if (!activeProfileId || !firestoreProfiles.some((p) => p.id === activeProfileId)) {
          setActiveProfileId(firestoreProfiles[0].id);
        }
      } else {
        setActiveProfileId(null);
      }
    } catch (err) {
      setProfiles([]);
      setActiveProfileId(null);
    }
  };

  const fetchHealth = async () => {
    try {
      const resp = await fetch("/api/health");
      if (resp.ok) {
        const data = await resp.json();
        setBackendStatus({ online: true, device: data.device || "CPU" });
      } else {
        setBackendStatus({ online: false });
      }
    } catch (err) {
      setBackendStatus({ online: false });
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchProfiles();
    const interval = setInterval(() => {
      fetchHealth();
    }, 12000);
    return () => clearInterval(interval);
  }, [user]);

  const handleProfileCreated = async (newProfile) => {
    if (!user) {
      openAuth("login");
      return;
    }

    if (newProfile && (newProfile.profile_id || newProfile.id)) {
      try {
        const profileToSave = {
          ...newProfile,
          id: newProfile.profile_id || newProfile.id,
          user_id: user.uid
        };
        await saveUserProfile(user.uid, profileToSave);
      } catch (err) {
        console.error("Failed saving profile to Firestore:", err);
      }
    }

    await fetchProfiles();
    if (newProfile && (newProfile.profile_id || newProfile.id || newProfile.demo_profile_id)) {
      setActiveProfileId(newProfile.profile_id || newProfile.id || newProfile.demo_profile_id);
    }
    setActiveTab("verify");
  };

  const handleProfileDeleted = async (profileId) => {
    if (user) {
      try {
        await deleteUserProfile(user.uid, profileId);
      } catch (err) {
        console.error("Failed deleting profile from Firestore:", err);
      }
    }

    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    if (activeProfileId === profileId) {
      const remaining = profiles.filter((p) => p.id !== profileId);
      setActiveProfileId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendStatus={backendStatus}
        profiles={profiles}
        activeProfileId={activeProfileId}
        setActiveProfileId={setActiveProfileId}
        onOpenAuth={() => openAuth("login")}
      />

      <main style={{ flex: 1, paddingBottom: "40px" }}>
        {loading ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "450px",
            gap: "14px"
          }}>
            <div style={{
              width: "36px",
              height: "36px",
              border: "2px solid rgba(6, 182, 212, 0.2)",
              borderTopColor: "var(--accent-cyan)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
            <span className="mono-tag" style={{ color: "var(--accent-cyan)", fontSize: "0.8rem" }}>
              Connecting to Firestore Vault...
            </span>
            <style jsx>{`
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        ) : !user ? (
          <div style={{
            maxWidth: "680px",
            margin: "60px auto 0",
            padding: "0 24px"
          }}>
            <div className="hud-panel" style={{
              padding: "36px 32px",
              textAlign: "center",
              borderTop: "3px solid var(--accent-cyan)"
            }}>
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(6, 182, 212, 0.12)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                color: "var(--accent-cyan)"
              }}>
                <span style={{ fontSize: "1.4rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  ID
                </span>
              </div>

              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.01em", color: "#f8fafc", marginBottom: "10px" }}>
                Authentication Required
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "28px", maxWidth: "520px", margin: "0 auto 28px" }}>
                To ensure privacy and biometric data isolation, friend profiles and 512D neural centroids are stored strictly in your personal Firebase Firestore vault. Please sign in or register to access the identification console.
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
                <button
                  onClick={() => openAuth("login")}
                  style={{
                    padding: "10px 24px",
                    background: "var(--accent-cyan)",
                    color: "#082f49",
                    fontWeight: 600,
                    borderRadius: "4px",
                    fontSize: "0.84rem",
                    fontFamily: "var(--font-mono)"
                  }}
                >
                  Sign In to Access Vault
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  style={{
                    padding: "10px 24px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.4)",
                    color: "#34d399",
                    fontWeight: 600,
                    borderRadius: "4px",
                    fontSize: "0.84rem",
                    fontFamily: "var(--font-mono)"
                  }}
                >
                  Create New Account
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === "verify" ? (
          <VerificationView
            profiles={profiles}
            activeProfileId={activeProfileId}
            setActiveProfileId={setActiveProfileId}
            onNavigateToEnroll={() => setActiveTab("enroll")}
          />
        ) : (
          <EnrollmentView
            profiles={profiles}
            onProfileCreated={handleProfileCreated}
            onProfileDeleted={handleProfileDeleted}
            activeProfileId={activeProfileId}
            setActiveProfileId={setActiveProfileId}
          />
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalInitialMode}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <footer style={{
        borderTop: "1px solid var(--border-subtle)",
        padding: "16px 24px",
        background: "rgba(10, 13, 19, 0.9)",
        fontSize: "0.72rem",
        color: "var(--text-dim)",
        fontFamily: "var(--font-mono)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div>
          <span>IS IT YOU? &copy; {new Date().getFullYear()}</span>
          <span style={{ margin: "0 8px" }}>|</span>
          <span>NEURAL BIOMETRIC IDENTIFICATION PLATFORM</span>
        </div>
        <div>
          <span>FACENET INCEPTION-RESNET-V1 (512D)</span>
          <span style={{ margin: "0 8px" }}>|</span>
          <span>FIREBASE AUTH & FIRESTORE CLOUD REPOSITORY</span>
        </div>
      </footer>
    </div>
  );
}
