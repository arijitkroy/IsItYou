import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import VerificationView from "../components/VerificationView";
import EnrollmentView from "../components/EnrollmentView";

export default function Home() {
  const [activeTab, setActiveTab] = useState("verify");
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ online: false, device: "CPU" });

  const fetchProfiles = async () => {
    try {
      const resp = await fetch("/api/profiles");
      if (resp.ok) {
        const data = await resp.json();
        setProfiles(data.profiles || []);
        if (data.profiles && data.profiles.length > 0 && !activeProfileId) {
          setActiveProfileId(data.profiles[data.profiles.length - 1].id);
        }
      }
    } catch (err) {
      // Backend not reached
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
  }, []);

  const handleProfileCreated = (newProfile) => {
    fetchProfiles();
    if (newProfile && (newProfile.profile_id || newProfile.demo_profile_id)) {
      setActiveProfileId(newProfile.profile_id || newProfile.demo_profile_id);
    }
    setActiveTab("verify");
  };

  const handleProfileDeleted = async (profileId) => {
    try {
      const resp = await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });
      if (resp.ok) {
        setProfiles((prev) => prev.filter((p) => p.id !== profileId));
        if (activeProfileId === profileId) {
          const remaining = profiles.filter((p) => p.id !== profileId);
          setActiveProfileId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } catch (err) {
      // Ignore
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
      />

      <main style={{ flex: 1, paddingBottom: "40px" }}>
        {activeTab === "verify" ? (
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
          <span>MEDIAPIPE TOPOLOGICAL MESH (468 PT)</span>
        </div>
      </footer>
    </div>
  );
}
