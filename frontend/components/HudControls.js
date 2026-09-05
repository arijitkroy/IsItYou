import React from "react";
import { 
  Square, 
  Target, 
  Grid, 
  Eye, 
  Sliders, 
  Layers, 
  Crosshair,
  Gauge
} from "lucide-react";

export default function HudControls({ hudToggles, setHudToggles }) {
  const toggle = (key) => {
    setHudToggles((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const layers = [
    {
      id: "box",
      label: "L1: Bounding Box",
      desc: "Target box & verdict tag",
      icon: Square,
      active: hudToggles.box,
    },
    {
      id: "keypoints",
      label: "L2: Landmarks",
      desc: "5-point ocular & oral reticles",
      icon: Target,
      active: hudToggles.keypoints,
    },
    {
      id: "contours",
      label: "L3: Contours",
      desc: "Anatomical feature boundaries",
      icon: Eye,
      active: hudToggles.contours,
    },
    {
      id: "mesh",
      label: "L4: 3D Face Mesh",
      desc: "468-pt topological wireframe",
      icon: Grid,
      active: hudToggles.mesh,
    },
    {
      id: "telemetry",
      label: "L5: Telemetry HUD",
      desc: "Pose angles, axes & vectors",
      icon: Gauge,
      active: hudToggles.telemetry,
    },
  ];

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      padding: "10px 14px",
      background: "var(--bg-surface-elevated)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "6px",
      flexWrap: "wrap"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Layers size={14} color="var(--accent-cyan)" />
        <span className="mono-tag" style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
          HUD Layer Filters:
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        {layers.map((layer) => {
          const Icon = layer.icon;
          return (
            <button
              key={layer.id}
              onClick={() => toggle(layer.id)}
              className={`hud-toggle-btn ${layer.active ? "active" : ""}`}
              title={layer.desc}
            >
              <div className="hud-toggle-indicator" />
              <Icon size={13} />
              <span>{layer.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
