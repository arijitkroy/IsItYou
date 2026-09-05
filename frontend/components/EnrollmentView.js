import React, { useState, useRef } from "react";
import { 
  UploadCloud, 
  Archive, 
  CheckCircle, 
  AlertTriangle, 
  UserPlus, 
  Trash2, 
  Info, 
  Layers, 
  Image as ImageIcon 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function EnrollmentView({
  profiles = [],
  onProfileCreated,
  onProfileDeleted,
  activeProfileId,
  setActiveProfileId,
  onNavigateToVerify,
}) {
  const { user } = useAuth();
  const [friendName, setFriendName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadMode, setUploadMode] = useState("files");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successData, setSuccessData] = useState(null);
  const fileInputRef = useRef(null);

  const isArchive = selectedFiles.some((f) =>
    f.name.toLowerCase().endsWith(".zip") ||
    f.name.toLowerCase().endsWith(".7z") ||
    f.name.toLowerCase().endsWith(".rar")
  );

  const imageCount = selectedFiles.filter((f) =>
    /\.(jpe?g|png|webp|bmp)$/i.test(f.name)
  ).length;

  const isValidSubmission =
    friendName.trim().length > 0 &&
    (isArchive || imageCount >= 10);

  const handleFileChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValidSubmission) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessData(null);

    const formData = new FormData();
    formData.append("name", friendName.trim());
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const headers = {};
      if (user) {
        try {
          const idToken = await user.getIdToken();
          if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
        } catch (tokErr) {}
      }

      const response = await fetch("/api/enroll", {
        method: "POST",
        headers,
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Enrollment failed.");
      }

      setSuccessData(result);
      setFriendName("");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onProfileCreated(result);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 0.8fr",
        gap: "28px",
        alignItems: "start"
      }}>
        <div className="hud-panel" style={{ padding: "24px" }}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
              Enroll Subject Profile
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Provide at least 10 high-resolution facial images or a single compressed archive.
            </p>
          </div>

          {errorMessage && (
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px 16px",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              borderRadius: "4px",
              color: "#fca5a5",
              fontSize: "0.82rem",
              marginBottom: "20px"
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
              <div>
                <strong style={{ display: "block", marginBottom: "2px" }}>Enrollment Constraint Error</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successData && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "12px 16px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "4px",
              color: "#6ee7b7",
              fontSize: "0.82rem",
              marginBottom: "20px"
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <CheckCircle size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <strong style={{ display: "block", marginBottom: "2px" }}>Biometric Model Calibrated</strong>
                  <span>Enrolled <strong>{successData.name}</strong> with {successData.sample_count} verified reference faces. Listed in your enrolled profiles.</span>
                </div>
              </div>
              {onNavigateToVerify && (
                <button
                  type="button"
                  onClick={onNavigateToVerify}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(16, 185, 129, 0.25)",
                    border: "1px solid rgba(16, 185, 129, 0.5)",
                    color: "#6ee7b7",
                    borderRadius: "4px",
                    fontSize: "0.76rem",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  Verify Now &rarr;
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "18px" }}>
              <label style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Subject Identification Label
              </label>
              <input
                type="text"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="e.g. Alex Carter"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "4px",
                  fontSize: "0.9rem",
                  outline: "none"
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em"
              }}>
                Reference Images (&ge;10) or Archive (.ZIP, .7Z, .RAR)
              </label>

              <div
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  border: "1px dashed var(--border-medium)",
                  borderRadius: "6px",
                  padding: "36px 20px",
                  textAlign: "center",
                  background: "var(--bg-surface-elevated)",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.bmp,.zip,.7z,.rar"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)",
                  margin: "0 auto 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-secondary)"
                }}>
                  {isArchive ? <Archive size={24} /> : <UploadCloud size={24} />}
                </div>
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  Click to select or drag and drop images or archives
                </p>
                <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Supports JPEG, PNG, WEBP, BMP, ZIP, 7Z, and RAR archives.
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div style={{
                  marginTop: "12px",
                  padding: "10px 14px",
                  background: "var(--bg-surface-elevated)",
                  borderRadius: "4px",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {isArchive ? (
                      <span className="mono-tag" style={{ color: "var(--accent-cyan)", fontSize: "0.74rem" }}>
                        Archive Ready: {selectedFiles[0].name}
                      </span>
                    ) : (
                      <span
                        className="mono-tag"
                        style={{
                          fontSize: "0.74rem",
                          color: imageCount >= 10 ? "var(--accent-emerald)" : "var(--accent-amber)"
                        }}
                      >
                        {imageCount} Image(s) Selected {imageCount >= 10 ? "(Constraint Met)" : `(Requires ${10 - imageCount} more)`}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFiles([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    style={{ color: "var(--text-muted)", fontSize: "0.74rem" }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!isValidSubmission || isSubmitting}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: "4px",
                background: isValidSubmission ? "var(--accent-emerald)" : "var(--bg-surface-subtle)",
                color: isValidSubmission ? "#052e16" : "var(--text-dim)",
                fontWeight: 600,
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.02em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: isValidSubmission && !isSubmitting ? "pointer" : "not-allowed",
                transition: "all 0.15s ease"
              }}
            >
              <UserPlus size={16} />
              {isSubmitting ? "Extracting Embeddings & Profiling..." : "Train & Calibrate Biometric Model"}
            </button>
          </form>
        </div>

        <div className="hud-panel" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Layers size={16} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
              Enrolled Biometric Profiles ({profiles.length})
            </h3>
          </div>

          {profiles.length === 0 ? (
            <div style={{
              padding: "32px 16px",
              textAlign: "center",
              background: "var(--bg-surface-elevated)",
              borderRadius: "4px",
              border: "1px dashed var(--border-subtle)",
              color: "var(--text-muted)",
              fontSize: "0.8rem"
            }}>
              <p>No friend profiles enrolled.</p>
              <p style={{ marginTop: "6px", fontSize: "0.74rem" }}>
                Upload at least 10 reference facial photographs or a compressed archive (.ZIP, .7Z, .RAR) to enroll a subject.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {profiles.map((profile) => {
                const isActive = profile.id === activeProfileId;
                return (
                  <div
                    key={profile.id}
                    onClick={() => setActiveProfileId(profile.id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "4px",
                      background: isActive ? "rgba(6, 182, 212, 0.08)" : "var(--bg-surface-elevated)",
                      border: isActive ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid var(--border-subtle)",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "#f8fafc" }}>
                            {profile.name}
                          </span>
                          {isActive && (
                            <span className="mono-tag" style={{
                              fontSize: "0.62rem",
                              color: "var(--accent-cyan)",
                              background: "rgba(6, 182, 212, 0.15)",
                              padding: "2px 6px",
                              borderRadius: "3px"
                            }}>
                              ACTIVE TARGET
                            </span>
                          )}
                        </div>
                        <div style={{
                          display: "flex",
                          gap: "12px",
                          fontSize: "0.72rem",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                          marginTop: "4px"
                        }}>
                          <span>SAMPLES: {profile.sample_count}</span>
                          <span>THRESH: {profile.threshold}</span>
                          <span>SIM: {profile.avg_similarity}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onProfileDeleted(profile.id);
                        }}
                        title="Delete Profile"
                        style={{
                          color: "var(--text-dim)",
                          padding: "6px",
                          borderRadius: "4px"
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {profile.thumbnails && profile.thumbnails.length > 0 && (
                      <div style={{
                        display: "flex",
                        gap: "6px",
                        marginTop: "10px",
                        overflowX: "auto",
                        paddingBottom: "4px"
                      }}>
                        {profile.thumbnails.map((thumb, tIdx) => (
                          <img
                            key={tIdx}
                            src={thumb}
                            alt="Face sample"
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "3px",
                              objectFit: "cover",
                              border: "1px solid var(--border-subtle)"
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
