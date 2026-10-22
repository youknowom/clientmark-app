import React from 'react'

/**
 * Clientmark Master Brand Monogram & Wordmark
 * 
 * Geometry: Interlocking geometric monogram fusing the 'C' (Client / Relationship loop)
 * with the 'M' (Milestone delivery crest) and dynamic checkmark apex.
 */
export const ClientmarkMark = ({
  size = 32,
  animated = false,
  className = '',
  style,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`cm-brand-mark ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        borderRadius: `${Math.round(size * 0.25)}px`,
        transition: 'transform var(--cm-duration-fast) var(--cm-ease-spring)',
        ...style,
      }}
    >
      <defs>
        <linearGradient id="cmBrandGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--cm-brand-500, #E05E3A)" />
          <stop offset="100%" stopColor="var(--cm-brand-600, #C24422)" />
        </linearGradient>
        <linearGradient id="cmBaseGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E2230" />
          <stop offset="100%" stopColor="#0A0C12" />
        </linearGradient>
        <filter id="cmGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#E05E3A" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Outer Squircle Container */}
      <rect width="48" height="48" rx="12" fill="url(#cmBaseGrad)" />

      {/* Subtle Precision Grid Dot Accent */}
      <circle cx="36" cy="12" r="2" fill="var(--cm-brand-500, #E05E3A)" />

      {/* Outer 'C' Relationship Arc */}
      <path
        d="M26 14C17.716 14 11 20.716 11 29C11 37.284 17.716 44 26 44C31.5 44 36.3 41 38.8 36.5"
        stroke="url(#cmBrandGrad)"
        strokeWidth="3.75"
        strokeLinecap="round"
      />

      {/* Inner 'M' Milestone Peak & Checkmark Apex */}
      <path
        d="M17 31L23 21L29 30L37 17"
        stroke="#FFFFFF"
        strokeWidth="3.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#cmGlow)"
      />
    </svg>
  )
}

export const ClientmarkLogo = ({
  size = 32,
  showWordmark = true,
  wordmarkColor,
  tagline = null,
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`cm-flex cm-items-center cm-gap-2 ${className}`}
      style={{
        userSelect: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: `${Math.max(8, Math.round(size * 0.3))}px`,
        ...style,
      }}
      {...props}
    >
      <ClientmarkMark size={size} />

      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <div
            style={{
              fontFamily: "var(--cm-font-brand, 'Alexandria', 'Poppins', sans-serif)",
              fontSize: `${Math.round(size * 0.52)}px`,
              letterSpacing: '0.04em',
              lineHeight: 1,
              color: wordmarkColor || 'var(--cm-text-primary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 700 }}>CLIENT</span>
            <span style={{ fontWeight: 300, color: 'var(--cm-brand-400, #F59E0B)', marginLeft: '1px' }}>MARK</span>
          </div>
          {tagline && (
            <span
              style={{
                fontSize: `${Math.max(9, Math.round(size * 0.28))}px`,
                fontWeight: 600,
                color: 'var(--cm-text-muted)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginTop: '3px',
              }}
            >
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default ClientmarkLogo
