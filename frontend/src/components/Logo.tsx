/*
 * components/Logo.tsx — Brand mark + flag SVG components
 *
 * Exports:
 *   Logo    — hussar-wing SVG mark + wordmark (size prop)
 *   FlagPL  — Polish flag inline SVG
 *   FlagGB  — GB flag inline SVG
 */

/* ── Logo ─────────────────────────────────────────────────────────────────── */

interface LogoProps {
  /** Height of the SVG mark in px. Default 36. */
  size?: number;
}

/**
 * Hussar-wing inspired brand mark with wordmark.
 * @param size  - SVG mark height in px
 */
export function Logo({ size = 36 }: LogoProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={size} height={size} viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id="hbgold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#f04060" />
            <stop offset="100%" stopColor="#b01030" />
          </linearGradient>
        </defs>
        {/* Outer circle */}
        <circle cx="24" cy="24" r="22" fill="none" stroke="url(#hbgold)" strokeWidth="1.5" />
        {/* Wing arch */}
        <path d="M14 32 Q14 18, 24 12 Q34 18, 34 32" fill="none" stroke="url(#hbgold)" strokeWidth="1.8" strokeLinecap="round" />
        {/* Feather strokes */}
        <line x1="18" y1="30" x2="18" y2="20" stroke="url(#hbgold)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="22" y1="32" x2="22" y2="16" stroke="url(#hbgold)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="26" y1="32" x2="26" y2="16" stroke="url(#hbgold)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="30" y1="30" x2="30" y2="20" stroke="url(#hbgold)" strokeWidth="1.2" strokeLinecap="round" />
        {/* Base dot */}
        <circle cx="24" cy="34" r="2" fill="url(#hbgold)" />
      </svg>

      <div style={{ lineHeight: 1 }}>
        <div style={{
          fontFamily:    "var(--serif)",
          fontWeight:    600,
          fontSize:      20,
          letterSpacing: "0.02em",
          color:         "var(--cream)",
        }}>
          husaria<span style={{ color: "var(--gold)" }}>beats</span>
        </div>
        <div style={{
          fontFamily:    "var(--mono)",
          fontSize:       9,
          letterSpacing: "0.32em",
          color:         "var(--muted-2)",
          textTransform: "uppercase",
          marginTop:      3,
        }}>
          Historia · Muzyka · Prawda
        </div>
      </div>
    </div>
  );
}

/* ── Flag components ──────────────────────────────────────────────────────── */

interface FlagProps {
  /** Height of the flag in px. Width auto-calculated at 1.6:1 ratio. Default 18. */
  size?: number;
}

/**
 * Polish flag (white over crimson).
 * @param size - flag height in px
 */
export function FlagPL({ size = 18 }: FlagProps) {
  return (
    <svg
      width={size * 1.6}
      height={size}
      viewBox="0 0 16 10"
      style={{ borderRadius: 1, boxShadow: "0 0 0 1px rgba(255,255,255,0.15)" }}
    >
      <rect width="16" height="5" fill="#f5f5f0" />
      <rect y="5" width="16" height="5" fill="#dc143c" />
    </svg>
  );
}

/**
 * UK flag (Union Jack).
 * @param size - flag height in px
 */
export function FlagGB({ size = 18 }: FlagProps) {
  return (
    <svg
      width={size * 1.6}
      height={size}
      viewBox="0 0 16 10"
      style={{ borderRadius: 1, boxShadow: "0 0 0 1px rgba(255,255,255,0.15)" }}
    >
      <rect width="16" height="10" fill="#012169" />
      <path d="M0 0 L16 10 M16 0 L0 10" stroke="#fff" strokeWidth="1.5" />
      <path d="M0 0 L16 10 M16 0 L0 10" stroke="#C8102E" strokeWidth="0.7" />
      <path d="M8 0 L8 10 M0 5 L16 5" stroke="#fff" strokeWidth="2.2" />
      <path d="M8 0 L8 10 M0 5 L16 5" stroke="#C8102E" strokeWidth="1" />
    </svg>
  );
}
