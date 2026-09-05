import React, { useState, useRef } from "react";
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Maximize2, 
  Activity, 
  Compass, 
  Layers, 
  Fingerprint, 
  Users,
  AlertCircle
} from "lucide-react";
import HudControls from "./HudControls";
import HudCanvas from "./HudCanvas";

export default function VerificationView({
  profiles,
  activeProfileId,
  setActiveProfileId,
  onNavigateToEnroll,
}) {
  const [imageSrc, setImageSrc] = useState(null);
  const [detectionData, setDetectionData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedFaceIndex, setSelectedFaceIndex] = useState(0);

  const [hudToggles, setHudToggles] = useState({
    box: true,
    keypoints: true,
    contours: true,
    mesh: true,
    telemetry: true,
  });

  const fileInputRef = useRef(null);
  const currentQueryFileRef = useRef(null);
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  const executeIdentification = async (file, targetId) => {
    if (!file) return;
    setIsAnalyzing(true);
    setErrorMessage("");

    const formData = new FormData();
    formData.append("file", file);
    if (targetId) {
      formData.append("profile_id", targetId);
    }

    try {
      const resp = await fetch("/api/identify", {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.detail || "Identification failed.");
      }

      setDetectionData(data);
      setSelectedFaceIndex(0);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  React.useEffect(() => {
    if (currentQueryFileRef.current && activeProfile) {
      executeIdentification(currentQueryFileRef.current, activeProfile.id);
    }
  }, [activeProfileId]);

  const handleQueryFile = async (file) => {
    if (!file) return;
    currentQueryFileRef.current = file;

    const reader = new FileReader();
    reader.onload = async (e) => {
      setImageSrc(e.target.result);
      const targetId = activeProfile ? activeProfile.id : null;
      await executeIdentification(file, targetId);
    };
    reader.readAsDataURL(file);
  };

  const handleSampleQuery = async (type) => {
    setIsAnalyzing(true);
    setErrorMessage("");

    try {
      const resp = await fetch("/api/sample-demo", { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Demo loading failed.");

      const queryBase64 = type === "match" ? data.sample_query_match : data.sample_query_non_match;
      setImageSrc(queryBase64);

      const blob = await (await fetch(queryBase64)).blob();
      const file = new File([blob], `sample_${type}.jpg`, { type: "image/jpeg" });
      currentQueryFileRef.current = file;

      const targetId = activeProfile ? activeProfile.id : (activeProfileId || data.demo_profile_id);
      await executeIdentification(file, targetId);
    } catch (err) {
      setErrorMessage(err.message);
      setIsAnalyzing(false);
    }
  };

  const currentFace =
    detectionData &&
    detectionData.detected_faces &&
    detectionData.detected_faces[selectedFaceIndex];

  return (
    <div style={{ maxWidth: "1600px", margin: "0 auto", padding: "20px 24px" }}>
      {(!profiles || profiles.length === 0) && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "rgba(245, 158, 11, 0.12)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "6px",
          color: "#fcd34d",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: "0.85rem" }}>
              No target friend profile enrolled. Verification requires at least one enrolled profile.
            </span>
          </div>
          <button
            onClick={onNavigateToEnroll}
            style={{
              padding: "6px 14px",
              borderRadius: "4px",
              background: "var(--accent-amber)",
              color: "#451a03",
              fontWeight: 600,
              fontSize: "0.78rem",
              fontFamily: "var(--font-mono)"
            }}
          >
            Enroll Friend (&ge;10 Photos)
          </button>

        </div>
      )}

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "6px",
        padding: "12px 18px",
        marginBottom: "16px",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <Fingerprint size={18} color="var(--accent-cyan)" />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span className="mono-tag" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Active Target Friend:
            </span>
            {profiles && profiles.length > 0 ? (
              <select
                value={activeProfile ? activeProfile.id : ""}
                onChange={(e) => setActiveProfileId(e.target.value)}
                style={{
                  background: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "4px",
                  padding: "4px 10px",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  color: "#f8fafc",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: "var(--bg-surface)" }}>
                    {p.name} ({p.sample_count} photos)
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-muted)" }}>
                None Enrolled
              </span>
            )}
            {activeProfile && (
              <span className="mono-tag" style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                Calibrated Threshold: {activeProfile.threshold}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => handleSampleQuery("match")}
            disabled={isAnalyzing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "4px",
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              color: "#34d399",
              fontSize: "0.76rem",
              fontFamily: "var(--font-mono)"
            }}
          >
            <Sparkles size={13} />
            Test Target Friend (Match)
          </button>
          <button
            onClick={() => handleSampleQuery("non-match")}
            disabled={isAnalyzing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "4px",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.4)",
              color: "#fca5a5",
              fontSize: "0.76rem",
              fontFamily: "var(--font-mono)"
            }}
          >
            <Sparkles size={13} />
            Test Other Person (Non-Match)
          </button>
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={isAnalyzing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "4px",
              background: "var(--accent-cyan)",
              color: "#082f49",
              fontWeight: 600,
              fontSize: "0.76rem",
              fontFamily: "var(--font-mono)"
            }}
          >
            <Upload size={13} />
            Upload Query Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleQueryFile(e.target.files[0]);
              }
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <HudControls hudToggles={hudToggles} setHudToggles={setHudToggles} />
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: "18px",
        alignItems: "start"
      }}>
        <div style={{ position: "relative" }}>
          {isAnalyzing && (
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              background: "rgba(8, 10, 15, 0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              borderRadius: "6px"
            }}>
              <div style={{
                width: "40px",
                height: "40px",
                border: "2px solid rgba(6, 182, 212, 0.2)",
                borderTopColor: "var(--accent-cyan)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite"
              }} />
              <span className="mono-tag" style={{ color: "var(--accent-cyan)", fontSize: "0.82rem" }}>
                Processing Biometric Feature Mesh & 512D Embeddings...
              </span>
              <style jsx>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}

          {imageSrc ? (
            <HudCanvas
              imageSrc={imageSrc}
              detectionData={detectionData}
              hudToggles={hudToggles}
              selectedFaceIndex={selectedFaceIndex}
              onSelectFace={(idx) => setSelectedFaceIndex(idx)}
            />
          ) : (
            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                height: "min(440px, calc(100vh - 280px))",
                minHeight: "320px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-surface)",
                border: "1px dashed var(--border-medium)",
                borderRadius: "6px",
                cursor: "pointer",
                padding: "24px"
              }}
            >
              <div style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.03)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-muted)",
                marginBottom: "16px"
              }}>
                <Upload size={28} />
              </div>
              <p style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)" }}>
                Select or drop a query image to verify
              </p>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "6px" }}>
                Accepts single image portraits or group photos. The engine detects all faces and layers forensic HUD telemetry.
              </p>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", position: "sticky", top: "80px" }}>
          {currentFace ? (
            <>
              <div className="hud-panel" style={{
                padding: "16px",
                borderLeft: `4px solid ${currentFace.is_match ? "var(--accent-emerald)" : "var(--accent-crimson)"}`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {currentFace.is_match ? (
                    <CheckCircle2 size={24} color="var(--accent-emerald)" />
                  ) : (
                    <XCircle size={24} color="var(--accent-crimson)" />
                  )}
                  <div>
                    <span className="mono-tag" style={{
                      fontSize: "0.68rem",
                      color: currentFace.is_match ? "var(--accent-emerald)" : "var(--accent-crimson)"
                    }}>
                      VERIFICATION VERDICT
                    </span>
                    <h3 style={{
                      fontSize: "1.05rem",
                      fontWeight: 700,
                      color: currentFace.is_match ? "#34d399" : "#f87171"
                    }}>
                      {currentFace.is_match ? "FRIEND IDENTIFIED" : "NOT TARGET FRIEND"}
                    </h3>
                  </div>
                </div>
                <div style={{
                  marginTop: "12px",
                  padding: "8px 10px",
                  background: "var(--bg-surface-elevated)",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)"
                }}>
                  {currentFace.is_match ? (
                    <span>Subject matches enrolled profile for <strong>{currentFace.target_name}</strong>.</span>
                  ) : currentFace.other_matched_profile ? (
                    <span>
                      Subject matches enrolled profile for <strong>{currentFace.other_matched_profile.name}</strong> (Cosine: {currentFace.other_matched_profile.similarity}), but <strong>NOT</strong> the active target friend <strong>{currentFace.friend_name || "selected target"}</strong>.
                    </span>
                  ) : (
                    <span>Facial embedding diverged from <strong>{currentFace.friend_name || "target friend"}</strong> profile.</span>
                  )}
                </div>
              </div>

              <div className="hud-panel" style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                  <Activity size={15} color="var(--accent-cyan)" />
                  <span className="mono-tag" style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Biometric Telemetry Matrix
                  </span>
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Match Confidence Score:</span>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: currentFace.is_match ? "var(--accent-emerald)" : "var(--accent-crimson)"
                    }}>
                      {currentFace.confidence_score}%
                    </span>
                  </div>
                  <div style={{
                    height: "6px",
                    background: "var(--bg-surface-subtle)",
                    borderRadius: "3px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${currentFace.confidence_score}%`,
                      background: currentFace.is_match ? "var(--accent-emerald)" : "var(--accent-crimson)",
                      transition: "width 0.3s ease"
                    }} />
                  </div>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.74rem"
                }}>
                  <div style={{ background: "var(--bg-surface-elevated)", padding: "8px 10px", borderRadius: "4px" }}>
                    <span style={{ color: "var(--text-dim)", display: "block" }}>COSINE SIMILARITY</span>
                    <strong style={{ color: "#f8fafc", fontSize: "0.85rem" }}>
                      {currentFace.cosine_similarity.toFixed(4)}
                    </strong>
                  </div>
                  <div style={{ background: "var(--bg-surface-elevated)", padding: "8px 10px", borderRadius: "4px" }}>
                    <span style={{ color: "var(--text-dim)", display: "block" }}>MATCH THRESHOLD</span>
                    <strong style={{ color: "var(--accent-cyan)", fontSize: "0.85rem" }}>
                      {currentFace.threshold.toFixed(3)}
                    </strong>
                  </div>
                  <div style={{ background: "var(--bg-surface-elevated)", padding: "8px 10px", borderRadius: "4px" }}>
                    <span style={{ color: "var(--text-dim)", display: "block" }}>EUCLIDEAN DISTANCE</span>
                    <strong style={{ color: "#f8fafc", fontSize: "0.85rem" }}>
                      {currentFace.euclidean_distance.toFixed(4)}
                    </strong>
                  </div>
                  <div style={{ background: "var(--bg-surface-elevated)", padding: "8px 10px", borderRadius: "4px" }}>
                    <span style={{ color: "var(--text-dim)", display: "block" }}>DETECTION PROB</span>
                    <strong style={{ color: "#f8fafc", fontSize: "0.85rem" }}>
                      {currentFace.detection_prob}%
                    </strong>
                  </div>
                </div>

                {currentFace.pose && (
                  <div style={{
                    marginTop: "12px",
                    background: "var(--bg-surface-elevated)",
                    padding: "10px",
                    borderRadius: "4px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      <Compass size={13} color="var(--accent-cyan)" />
                      <span className="mono-tag" style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                        Head Pose Orientation
                      </span>
                    </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem",
                      color: "var(--text-muted)"
                    }}>
                      <span>Yaw: <strong style={{ color: "#f8fafc" }}>{currentFace.pose.yaw}°</strong></span>
                      <span>Pitch: <strong style={{ color: "#f8fafc" }}>{currentFace.pose.pitch}°</strong></span>
                      <span>Roll: <strong style={{ color: "#f8fafc" }}>{currentFace.pose.roll}°</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {detectionData && detectionData.detected_faces.length > 1 && (
                <div className="hud-panel" style={{ padding: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <Users size={14} color="var(--text-secondary)" />
                    <span className="mono-tag" style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                      Multiple Faces Detected ({detectionData.detected_faces.length})
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {detectionData.detected_faces.map((f, fIdx) => (
                      <button
                        key={fIdx}
                        onClick={() => setSelectedFaceIndex(fIdx)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          fontFamily: "var(--font-mono)",
                          background: selectedFaceIndex === fIdx ? "var(--accent-cyan)" : "var(--bg-surface-elevated)",
                          color: selectedFaceIndex === fIdx ? "#082f49" : "var(--text-secondary)",
                          fontWeight: 600,
                          border: "1px solid var(--border-subtle)"
                        }}
                      >
                        Face {fIdx + 1} {f.is_match ? "(Match)" : "(Unknown)"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="hud-panel" style={{ padding: "20px", textAlign: "center" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.03)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-dim)",
                margin: "0 auto 10px"
              }}>
                <Activity size={20} />
              </div>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                Biometric Standby
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Upload or select a test query image to trigger face detection, 468-point mesh extraction, and forensic matching.
              </p>
            </div>
          )}

          <div className="hud-panel" style={{ padding: "14px" }}>
            <span className="mono-tag" style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
              Engine Specification
            </span>
            <div style={{
              marginTop: "8px",
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              lineHeight: 1.5
            }}>
              <div>MODEL: FaceNet Inception-ResNet-v1</div>
              <div>EMBEDDING: 512-Dimensional L2</div>
              <div>MESH: MediaPipe 468-pt FrontCpu</div>
              <div>METRIC: Cosine Angle + Euclidean L2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
