import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export const PreFooterCta = ({ onDemoClick, demoLoading }) => {
  return (
    <section
      style={{
        padding: '110px 0 100px',
        backgroundColor: '#F5F5F7',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Radiant warm glow disc behind CTA */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '720px',
          height: '420px',
          background: 'radial-gradient(circle, rgba(224, 94, 58, 0.12) 0%, rgba(245, 158, 11, 0.05) 45%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="cm-container" style={{ position: 'relative', zIndex: 1, maxWidth: '880px' }}>
        <h2
          data-reveal="words"
          style={{
            fontFamily: 'var(--cm-font-heading, Poppins)',
            fontSize: 'clamp(2.6rem, 5.5vw, 4.8rem)',
            fontWeight: 600,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            color: '#161722',
            margin: '0 auto 20px',
          }}
        >
          <span className="reveal-word inline-block">Ready </span>
          <span className="reveal-word inline-block">to </span>
          <span className="reveal-word inline-block">experience </span>
          <span className="reveal-word inline-block">CRM </span>
          <span className="reveal-word inline-block" style={{ color: '#E05E3A' }}>that </span>
          <span className="reveal-word inline-block" style={{ color: '#E05E3A' }}>teams </span>
          <span className="reveal-word inline-block" style={{ color: '#E05E3A' }}>remember?</span>
        </h2>

        <p
          style={{
            fontSize: '17px',
            color: '#6B6A66',
            lineHeight: 1.6,
            maxWidth: '580px',
            margin: '0 auto 38px',
          }}
        >
          Join high-growth agencies and sales teams closing larger deals faster on Clientmark.
        </p>

        {/* Action Button Row */}
        <div
          className="cm-flex cm-items-center cm-justify-center cm-gap-4"
          style={{ flexWrap: 'wrap' }}
        >
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <span className="cm-btn-action" style={{ height: '52px', padding: '6px 6px 6px 24px', fontSize: '15px' }}>
              <span>Start 14-day trial free</span>
              <span className="arrow-disc" style={{ width: '40px', height: '40px' }}>
                <ArrowUpRight size={18} />
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={onDemoClick}
            disabled={demoLoading}
            className="cm-btn-white"
            style={{ height: '52px', padding: '0 26px', fontSize: '15px' }}
          >
            {demoLoading ? 'Launching Sandbox...' : 'Test live demo sandbox'}
          </button>
        </div>
      </div>
    </section>
  )
}

export default PreFooterCta
