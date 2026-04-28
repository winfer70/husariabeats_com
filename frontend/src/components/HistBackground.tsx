/*
 * components/HistBackground.tsx — SVG painterly parallax background
 *
 * Renders an abstract historical-feel background using SVG gradients + terrain shapes.
 * Used as full-bleed section backgrounds on the Timeline page.
 *
 * Props:
 *   hue      - oklch hue value controlling the colour mood
 *   label    - placeholder description text (visible in dev, low opacity)
 *   parallax - scroll progress 0→1; shifts bg vertically for parallax effect
 */

interface HistBackgroundProps {
  /** oklch hue value (0–360) — controls overall colour mood of the bg */
  hue: number;
  /** Descriptive label shown as a watermark (placeholder art indicator) */
  label: string;
  /** Scroll progress 0–1 used to offset bg vertically for parallax. Default 0. */
  parallax?: number;
}

/**
 * Painterly SVG background with radial gradient, diagonal stripes, and terrain.
 * Moves at 60% of scroll speed (parallax = 60px max vertical offset).
 *
 * @param hue      - oklch hue 0–360
 * @param label    - placeholder watermark text
 * @param parallax - scroll progress 0–1
 */
export default function HistBackground({ hue, label, parallax = 0 }: HistBackgroundProps) {
  const id = `bg-${hue}`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position:  "absolute",
        inset:     0,
        width:     "100%",
        height:    "120%",
        transform: `translate3d(0, ${parallax * -60}px, 0) scale(1.05)`,
        willChange:"transform",
      }}
    >
      <defs>
        <radialGradient id={`${id}-r`} cx="50%" cy="40%" r="70%">
          <stop offset="0%"   stopColor={`oklch(0.32 0.06 ${hue})`} />
          <stop offset="55%"  stopColor={`oklch(0.18 0.04 ${hue})`} />
          <stop offset="100%" stopColor={`oklch(0.07 0.02 ${hue})`} />
        </radialGradient>
        <linearGradient id={`${id}-l`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={`oklch(0.28 0.08 ${hue})`} stopOpacity="0.5" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.9" />
        </linearGradient>
        <pattern id={`${id}-stripes`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="14" stroke={`oklch(0.5 0.08 ${hue})`} strokeWidth="0.5" strokeOpacity="0.18" />
        </pattern>
      </defs>

      {/* Base gradient */}
      <rect width="1600" height="900" fill={`url(#${id}-r)`} />
      {/* Diagonal stripe texture */}
      <rect width="1600" height="900" fill={`url(#${id}-stripes)`} />
      {/* Terrain silhouette — mid */}
      <path
        d="M0 700 Q 200 580, 480 640 T 1000 600 Q 1300 560, 1600 660 L 1600 900 L 0 900 Z"
        fill={`oklch(0.12 0.03 ${hue})`}
        opacity="0.85"
      />
      {/* Terrain silhouette — foreground */}
      <path
        d="M0 780 Q 300 720, 600 760 T 1200 740 Q 1450 720, 1600 770 L 1600 900 L 0 900 Z"
        fill="#000"
        opacity="0.6"
      />
      {/* Overlay gradient */}
      <rect width="1600" height="900" fill={`url(#${id}-l)`} />

      {/* Placeholder watermark — low opacity */}
      <g transform="translate(60, 60)" opacity="0.55">
        <rect width="220" height="22" fill="rgba(0,0,0,0.6)" stroke={`oklch(0.7 0.12 ${hue})`} strokeWidth="0.5" />
        <text x="10" y="15" fill={`oklch(0.85 0.08 ${hue})`} fontFamily="JetBrains Mono, monospace" fontSize="9" letterSpacing="1">
          PLACEHOLDER · KEY ART
        </text>
      </g>
      <text x="60" y="120" fill={`oklch(0.7 0.06 ${hue})`} fontFamily="JetBrains Mono, monospace" fontSize="11" letterSpacing="0.5" opacity="0.5">
        {label}
      </text>
    </svg>
  );
}
