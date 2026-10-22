import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { InteractiveMockup } from './InteractiveMockup'

export const HeroSection = ({ onDemoClick, demoLoading }) => {
  // Kinetic dynamic word animation: "remember.", "trust.", "deliver.", "convert.", "scale."
  const rotatingWords = ['remember.', 'trust.', 'deliver.', 'convert.', 'scale.']
  const [currentWordIdx, setCurrentWordIdx] = useState(0)
  const [fadeState, setFadeState] = useState('fade-in')

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeState('fade-out')
      setTimeout(() => {
        setCurrentWordIdx((prev) => (prev + 1) % rotatingWords.length)
        setFadeState('fade-in')
      }, 400)
    }, 2800)
    return () => clearInterval(interval)
  }, [rotatingWords.length])

  return (
    <section
      className="cm-hero-section"
      style={{
        paddingTop: '160px',
        paddingBottom: '90px',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
        backgroundColor: '#F5F5F7',
      }}
    >
      {/* ─── Ambient Glow Grid ─── */}
      <div
        className="cm-grid-texture"
        style={{
          position: 'absolute',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '1240px',
          height: '640px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Amber Warm Radial Glow Disc */}
      <div
        style={{
          position: 'absolute',
          top: '110px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '640px',
          height: '420px',
          background: 'radial-gradient(circle, rgba(224, 94, 58, 0.12) 0%, rgba(245, 158, 11, 0.05) 45%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="cm-container" style={{ position: 'relative', zIndex: 1, maxWidth: '1100px' }}>
        {/* Kinetic Hero Headline */}
        <h1
          className="cm-hero-title"
          data-reveal="words"
          style={{
            fontSize: 'clamp(2.8rem, 6.8vw, 5.8rem)',
            maxWidth: '1020px',
            margin: '0 auto',
            lineHeight: 1.02,
            color: '#161722',
          }}
        >
          <span className="cm-hero-word-light">
            <span className="reveal-word inline-block">We </span>
            <span className="reveal-word inline-block">build </span>
            <span className="reveal-word inline-block">CRM </span>
            <span className="reveal-word inline-block">systems </span>
            <span className="reveal-word inline-block">that </span>
          </span>
          <br className="d-none d-md-block" />
          <span className="reveal-word inline-block">teams </span>
          <span
            className="cm-hero-dynamic-word"
            style={{
              opacity: fadeState === 'fade-in' ? 1 : 0,
              filter: fadeState === 'fade-in' ? 'blur(0px)' : 'blur(8px)',
              transform: fadeState === 'fade-in' ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              color: '#E05E3A',
            }}
          >
            {rotatingWords[currentWordIdx]}
          </span>
        </h1>

        {/* Studio Subheading */}
        <p
          style={{
            fontFamily: 'var(--cm-font, Poppins)',
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            lineHeight: 1.6,
            color: '#6B6A66',
            maxWidth: '680px',
            margin: '24px auto 0',
            fontWeight: 400,
          }}
        >
          AI-accelerated sales pipelines, instant WhatsApp outreach, and unified project delivery for founders and teams who care how it feels.
        </p>

        {/* Dual CTA Buttons */}
        <div
          className="cm-flex cm-items-center cm-justify-center cm-gap-4"
          style={{ marginTop: '38px', flexWrap: 'wrap' }}
        >
          {/* Main Action Button with Up-Right Arrow Disc */}
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <span className="cm-btn-action" style={{ height: '52px', padding: '6px 6px 6px 24px', fontSize: '15px' }}>
              <span>Start 14-day trial</span>
              <span className="arrow-disc" style={{ width: '40px', height: '40px' }}>
                <ArrowUpRight size={18} />
              </span>
            </span>
          </Link>

          {/* White Pill Secondary CTA */}
          <button
            type="button"
            onClick={onDemoClick}
            disabled={demoLoading}
            className="cm-btn-white"
            style={{ height: '52px', padding: '0 26px', fontSize: '15px', gap: '8px' }}
          >
            <Sparkles size={16} color="#E05E3A" />
            <span>{demoLoading ? 'Launching Sandbox...' : 'See live interactive demo'}</span>
          </button>
        </div>

        {/* Micro-Trust Tags */}
        <div
          style={{
            marginTop: '20px',
            fontSize: '12.5px',
            color: '#8D8D96',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '18px',
          }}
        >
          <span>• No credit card required</span>
          <span>• Ready in 90 seconds</span>
          <span>• Complete multi-tenant privacy</span>
        </div>

        {/* Product Studio Mockup */}
        <div style={{ marginTop: '64px' }}>
          <InteractiveMockup />
        </div>
      </div>
    </section>
  )
}

export default HeroSection
