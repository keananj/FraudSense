/*
 * LogoMark — the FraudSense brand mark.
 * A dark rounded square with a red signal-dot in the center,
 * suggesting "scanning" / "detection".
 */
export default function LogoMark({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lm-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a1a1f" />
          <stop offset="1" stopColor="#08080a" />
        </linearGradient>
        <radialGradient id="lm-dot" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff3b54" />
          <stop offset="1" stopColor="#c01829" />
        </radialGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="62"
        height="62"
        rx="14"
        fill="url(#lm-bg)"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="1"
      />
      {/* Concentric "scan" rings */}
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke="rgba(239, 35, 60, 0.18)"
        strokeWidth="1"
      />
      <circle
        cx="32"
        cy="32"
        r="16"
        stroke="rgba(239, 35, 60, 0.28)"
        strokeWidth="1"
      />
      {/* Signal dot */}
      <circle cx="32" cy="32" r="9" fill="url(#lm-dot)" />
    </svg>
  )
}
