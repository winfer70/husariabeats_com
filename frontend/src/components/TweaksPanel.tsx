/*
 * components/TweaksPanel.tsx — Dev-only design tweaks panel
 *
 * Wraps the Claude Design TweaksPanel. Renders ONLY in development
 * (NODE_ENV === 'development'). Stripped from production builds entirely.
 *
 * Controls: accent colour (oklch), heading font, grain intensity, vignette toggle.
 * Changes are applied as CSS variable overrides on document.documentElement.
 */
"use client";

import { useEffect, useState } from "react";

// Only render in development — Next.js tree-shakes this in production builds
const IS_DEV = process.env.NODE_ENV === "development";

interface Tweaks {
  accentHue:        number;
  accentChroma:     number;
  accentLightness:  number;
  headingFamily:    string;
  grain:            number;
  vignette:         boolean;
}

const DEFAULTS: Tweaks = {
  accentHue:       18,
  accentChroma:    22,
  accentLightness: 56,
  headingFamily:   "Cormorant Garamond",
  grain:           18,
  vignette:        true,
};

/**
 * Floating dev panel for live design tweaks.
 * Applies changes directly to CSS custom properties.
 * Not rendered in production (NODE_ENV guard).
 */
export default function TweaksPanel() {
  const [open,   setOpen]   = useState(false);
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULTS);

  // Apply tweaks to CSS variables
  useEffect(() => {
    if (!IS_DEV) return;
    const root = document.documentElement;
    const L = (tweaks.accentLightness / 100).toFixed(2);
    const C = (tweaks.accentChroma / 100).toFixed(2);
    const H = tweaks.accentHue;
    root.style.setProperty("--gold",      `oklch(${L} ${C} ${H})`);
    root.style.setProperty("--gold-soft", `oklch(${(parseFloat(L) - 0.1).toFixed(2)} ${C} ${H})`);
    root.style.setProperty("--gold-glow", `oklch(${L} ${C} ${H} / 0.35)`);
    root.style.setProperty("--serif",     `"${tweaks.headingFamily}", Georgia, serif`);

    const grainEl = document.querySelector(".grain") as HTMLElement | null;
    if (grainEl) grainEl.style.opacity = (tweaks.grain / 100).toFixed(2);
    const vigEl   = document.querySelector(".vignette") as HTMLElement | null;
    if (vigEl)   vigEl.style.display = tweaks.vignette ? "block" : "none";
  }, [tweaks]);

  if (!IS_DEV) return null;

  const set = (key: keyof Tweaks, value: Tweaks[keyof Tweaks]) =>
    setTweaks((prev) => ({ ...prev, [key]: value }));

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position:      "fixed",
          right:          16,
          bottom:         16,
          zIndex:         9999,
          padding:       "8px 14px",
          background:    "rgba(220,20,60,0.15)",
          border:        "1px solid rgba(220,20,60,0.4)",
          borderRadius:   6,
          color:         "var(--gold)",
          fontFamily:    "var(--mono)",
          fontSize:       11,
          letterSpacing: "0.2em",
          cursor:        "pointer",
        }}
      >
        TWEAKS
      </button>
    );
  }

  const labelStyle: React.CSSProperties = {
    fontFamily:    "var(--mono)",
    fontSize:       10,
    letterSpacing: "0.2em",
    color:         "var(--muted-2)",
    textTransform: "uppercase",
    marginBottom:   6,
    display:       "block",
  };

  return (
    <div style={{
      position:        "fixed",
      right:            16,
      bottom:           16,
      zIndex:           9999,
      width:            280,
      background:      "rgba(22,16,19,0.96)",
      backdropFilter:  "blur(20px)",
      border:          "1px solid rgba(220,20,60,0.2)",
      borderRadius:     10,
      padding:         "20px 20px 24px",
      fontFamily:      "var(--sans)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.3em", color: "var(--gold)", textTransform: "uppercase" }}>
          Tweaks
        </span>
        <button onClick={() => setOpen(false)} style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Accent hue */}
        <div>
          <label style={labelStyle}>Accent hue — {tweaks.accentHue}</label>
          <input type="range" min={0} max={360} value={tweaks.accentHue}
            onChange={(e) => set("accentHue", Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--gold)" }} />
        </div>

        {/* Accent chroma */}
        <div>
          <label style={labelStyle}>Accent chroma — {tweaks.accentChroma}</label>
          <input type="range" min={0} max={30} value={tweaks.accentChroma}
            onChange={(e) => set("accentChroma", Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--gold)" }} />
        </div>

        {/* Accent lightness */}
        <div>
          <label style={labelStyle}>Lightness — {tweaks.accentLightness}</label>
          <input type="range" min={40} max={90} value={tweaks.accentLightness}
            onChange={(e) => set("accentLightness", Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--gold)" }} />
        </div>

        {/* Heading font */}
        <div>
          <label style={labelStyle}>Heading font</label>
          <select
            value={tweaks.headingFamily}
            onChange={(e) => set("headingFamily", e.target.value)}
            style={{ width: "100%", padding: "6px 8px", background: "var(--bg-2)", color: "var(--cream)", border: "1px solid var(--line-2)", borderRadius: 4, fontFamily: "var(--sans)", fontSize: 13 }}
          >
            {["Cormorant Garamond", "EB Garamond", "Playfair Display", "Georgia"].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        {/* Grain */}
        <div>
          <label style={labelStyle}>Grain — {tweaks.grain}</label>
          <input type="range" min={0} max={50} value={tweaks.grain}
            onChange={(e) => set("grain", Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--gold)" }} />
        </div>

        {/* Vignette toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Vignette</label>
          <button
            onClick={() => set("vignette", !tweaks.vignette)}
            style={{
              width:        36,
              height:        20,
              borderRadius:  999,
              background:    tweaks.vignette ? "var(--gold)" : "var(--bg-3)",
              border:       "1px solid var(--line-2)",
              position:     "relative",
              cursor:       "pointer",
            }}
          >
            <span style={{
              position:    "absolute",
              top:          2,
              left:         tweaks.vignette ? 17 : 2,
              width:        14,
              height:       14,
              borderRadius: "50%",
              background:  "#fff",
              transition:  "left 150ms",
            }} />
          </button>
        </div>

        {/* Reset */}
        <button
          onClick={() => setTweaks(DEFAULTS)}
          style={{ padding: "8px", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 4, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.2em", cursor: "pointer" }}
        >
          RESET
        </button>
      </div>
    </div>
  );
}
