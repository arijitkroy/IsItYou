import React, { useRef, useEffect, useState, useCallback } from "react";

export default function HudCanvas({
  imageSrc,
  detectionData,
  hudToggles,
  selectedFaceIndex,
  onSelectFace,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [imageElement, setImageElement] = useState(null);

  useEffect(() => {
    if (!imageSrc) {
      setImageElement(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageElement(img);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const drawHud = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageElement) return;

    const ctx = canvas.getContext("2d");
    const container = containerRef.current;
    const maxDisplayWidth = Math.max(200, container ? container.clientWidth - 16 : 800);
    const windowH = typeof window !== "undefined" ? window.innerHeight : 900;
    const maxDisplayHeight = Math.max(320, Math.min(640, windowH - 260));

    const naturalW = imageElement.naturalWidth || 800;
    const naturalH = imageElement.naturalHeight || 600;

    const scale = Math.min(maxDisplayWidth / naturalW, maxDisplayHeight / naturalH);
    const displayW = Math.max(1, Math.round(naturalW * scale));
    const displayH = Math.max(1, Math.round(naturalH * scale));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayW, displayH);

    ctx.drawImage(imageElement, 0, 0, displayW, displayH);

    if (!detectionData || !detectionData.detected_faces) return;

    const scaleX = displayW / naturalW;
    const scaleY = displayH / naturalH;

    detectionData.detected_faces.forEach((face, idx) => {
      const isSelected = selectedFaceIndex === idx || selectedFaceIndex === null;
      const isMatch = face.is_match;
      const primaryColor = isMatch ? "#10b981" : "#f43f5e";
      const secondaryColor = isMatch ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)";
      const cyanAccent = "#38bdf8";

      const hud = face.hud_layers || {};
      const box = hud.bounding_box;

      if (!box) return;

      const bx = box.x * scaleX;
      const by = box.y * scaleY;
      const bw = box.width * scaleX;
      const bh = box.height * scaleY;

      // Layer 4: 3D Face Mesh Wireframe
      if (hudToggles.mesh && hud.mesh_landmarks && hud.mesh_connections) {
        ctx.save();
        ctx.strokeStyle = isMatch ? "rgba(16, 185, 129, 0.28)" : "rgba(56, 189, 248, 0.22)";
        ctx.lineWidth = 0.8;

        const connections = hud.mesh_connections;
        const lms = hud.mesh_landmarks;

        ctx.beginPath();
        for (let i = 0; i < connections.length; i++) {
          const p1 = lms[connections[i][0]];
          const p2 = lms[connections[i][1]];
          if (p1 && p2) {
            ctx.moveTo(p1.x * displayW, p1.y * displayH);
            ctx.lineTo(p2.x * displayW, p2.y * displayH);
          }
        }
        ctx.stroke();

        ctx.fillStyle = isMatch ? "rgba(16, 185, 129, 0.6)" : "rgba(56, 189, 248, 0.5)";
        for (let j = 0; j < lms.length; j += 6) {
          const pt = lms[j];
          ctx.beginPath();
          ctx.arc(pt.x * displayW, pt.y * displayH, 0.8, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.restore();
      }

      // Layer 3: Anatomical Contours
      if (hudToggles.contours && hud.mesh_landmarks && hud.contours) {
        ctx.save();
        const lms = hud.mesh_landmarks;
        const contourGroups = [
          { key: "lips", color: "#f472b6", width: 1.6 },
          { key: "left_eye", color: "#38bdf8", width: 1.6 },
          { key: "right_eye", color: "#38bdf8", width: 1.6 },
          { key: "left_eyebrow", color: "#818cf8", width: 1.4 },
          { key: "right_eyebrow", color: "#818cf8", width: 1.4 },
          { key: "nose", color: "#fbbf24", width: 1.5 },
          { key: "face_oval", color: "rgba(255, 255, 255, 0.4)", width: 1.2 },
        ];

        contourGroups.forEach((group) => {
          const pairs = hud.contours[group.key];
          if (!pairs || pairs.length === 0) return;

          ctx.strokeStyle = group.color;
          ctx.lineWidth = group.width;
          ctx.beginPath();
          pairs.forEach(([idx1, idx2]) => {
            const p1 = lms[idx1];
            const p2 = lms[idx2];
            if (p1 && p2) {
              ctx.moveTo(p1.x * displayW, p1.y * displayH);
              ctx.lineTo(p2.x * displayW, p2.y * displayH);
            }
          });
          ctx.stroke();
        });
        ctx.restore();
      }

      // Layer 2: 5-Point Biometric Landmarks
      if (hudToggles.keypoints && hud.keypoints && hud.keypoints.length >= 5) {
        ctx.save();
        const kps = hud.keypoints;

        ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(kps[0].x * scaleX, kps[0].y * scaleY);
        ctx.lineTo(kps[1].x * scaleX, kps[1].y * scaleY);
        ctx.lineTo(kps[2].x * scaleX, kps[2].y * scaleY);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        kps.forEach((pt, kIdx) => {
          const kx = pt.x * scaleX;
          const ky = pt.y * scaleY;

          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(kx, ky, 4, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.strokeStyle = cyanAccent;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(kx - 7, ky);
          ctx.lineTo(kx + 7, ky);
          ctx.moveTo(kx, ky - 7);
          ctx.lineTo(kx, ky + 7);
          ctx.stroke();

          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.arc(kx, ky, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        });
        ctx.restore();
      }

      // Layer 1: Layered Bounding Box & Target Callout Tag
      if (hudToggles.box) {
        ctx.save();

        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);

        const bracketLen = Math.min(22, bw * 0.2, bh * 0.2);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.5;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(bx, by + bracketLen);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + bracketLen, by);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(bx + bw - bracketLen, by);
        ctx.lineTo(bx + bw, by);
        ctx.lineTo(bx + bw, by + bracketLen);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(bx, by + bh - bracketLen);
        ctx.lineTo(bx, by + bh);
        ctx.lineTo(bx + bracketLen, by + bh);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(bx + bw - bracketLen, by + bh);
        ctx.lineTo(bx + bw, by + bh);
        ctx.lineTo(bx + bw, by + bh - bracketLen);
        ctx.stroke();

        // Top Header Tag
        const tagText = isMatch
          ? `MATCH: ${face.target_name.toUpperCase()} (${face.confidence_score}%)`
          : `UNVERIFIED PERSON (${face.confidence_score}%)`;

        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        const tagPadding = 6;
        const textMetrics = ctx.measureText(tagText);
        const tagW = textMetrics.width + tagPadding * 2;
        const tagH = 20;

        ctx.fillStyle = isMatch ? "#064e3b" : "#4c0519";
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1;
        ctx.fillRect(bx, by - tagH, tagW, tagH);
        ctx.strokeRect(bx, by - tagH, tagW, tagH);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(tagText, bx + tagPadding, by - 6);

        // Bottom Sub-tag with Coordinates
        const coordText = `FACE_${idx + 1} | SIM: ${face.cosine_similarity.toFixed(3)} | THRESH: ${face.threshold.toFixed(2)}`;
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(14, 18, 25, 0.85)";
        ctx.fillRect(bx, by + bh + 4, ctx.measureText(coordText).width + 8, 16);
        ctx.fillStyle = isMatch ? "#34d399" : "#fca5a5";
        ctx.fillText(coordText, bx + 4, by + bh + 16);

        ctx.restore();
      }

      // Layer 5: Biometric Telemetry HUD
      if (hudToggles.telemetry && face.pose) {
        ctx.save();
        const p = face.pose;
        const poseText = `YAW: ${p.yaw > 0 ? "+" : ""}${p.yaw}°  PITCH: ${p.pitch > 0 ? "+" : ""}${p.pitch}°  ROLL: ${p.roll > 0 ? "+" : ""}${p.roll}°`;

        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(14, 18, 25, 0.9)";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
        ctx.lineWidth = 1;

        const infoW = ctx.measureText(poseText).width + 12;
        const infoH = 22;
        const infoX = bx + bw + 10;
        const infoY = by + 10;

        if (infoX + infoW < displayW) {
          ctx.fillRect(infoX, infoY, infoW, infoH);
          ctx.strokeRect(infoX, infoY, infoW, infoH);
          ctx.fillStyle = "#38bdf8";
          ctx.fillText(poseText, infoX + 6, infoY + 15);

          // Connecting telemetry guide line
          ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(bx + bw, by + 21);
          ctx.lineTo(infoX, infoY + 11);
          ctx.stroke();
        }

        ctx.restore();
      }
    });
  }, [imageElement, detectionData, hudToggles, selectedFaceIndex]);

  useEffect(() => {
    drawHud();
    window.addEventListener("resize", drawHud);
    return () => window.removeEventListener("resize", drawHud);
  }, [drawHud]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        maxHeight: "calc(100vh - 240px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#05070a",
        borderRadius: "6px",
        overflow: "hidden",
        border: "1px solid var(--border-subtle)",
        padding: "8px"
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          maxWidth: "100%",
          maxHeight: "calc(100vh - 260px)",
          objectFit: "contain",
          imageRendering: "auto"
        }}
      />
    </div>
  );
}
