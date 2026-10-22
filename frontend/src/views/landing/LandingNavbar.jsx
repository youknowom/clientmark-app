import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClientmarkLogo } from '../../components/brand/ClientmarkLogo'
import { ArrowUpRight, Menu as MenuIcon, X, Sparkles } from 'lucide-react'

export const LandingNavbar = ({ scrolled, onDemoClick, demoLoading }) => {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { label: 'Work', href: '#work' },
    { label: 'Services', href: '#services' },
    { label: 'Principles', href: '#principles' },
    { label: 'Pricing', href: '#pricing' },
  ]

  return (
    <>
      <header className={`cm-nav-wrapper ${scrolled ? 'scrolled' : ''}`}>
        <div className="cm-nav-container">
          {/* Left Brand Identity: Geometric Monogram + Alexandria Wordmark */}
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              zIndex: 20,
            }}
          >
            <ClientmarkLogo size={32} wordmarkColor="#161722" />
          </Link>

          {/* Center Floating Pill Menu */}
          <nav className="cm-pill-menu d-none d-lg-flex" aria-label="Main menu">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="cm-pill-link"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Action: Pill Button with Arrow Up-Right Disc */}
          <div className="cm-flex cm-items-center cm-gap-3" style={{ zIndex: 20 }}>
            {/* Quick Demo Sandbox Trigger */}
            <button
              type="button"
              onClick={onDemoClick}
              disabled={demoLoading}
              className="cm-btn-white d-none d-sm-inline-flex"
              style={{
                height: '40px',
                fontSize: '13px',
                gap: '6px',
              }}
            >
              <Sparkles size={14} color="#E05E3A" />
              <span>{demoLoading ? 'Launching...' : 'Live Sandbox'}</span>
            </button>

            {/* Book a Call / Sign In Action Button */}
            <Link to="/login" style={{ textDecoration: 'none' }} className="d-none d-md-inline-flex">
              <span className="cm-btn-action">
                <span>Sign in</span>
                <span className="arrow-disc">
                  <ArrowUpRight size={14} />
                </span>
              </span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="d-lg-none"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                color: '#161722',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
              }}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={20} /> : <MenuIcon size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Fullscreen Mobile Overlay Menu */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 45,
            backgroundColor: '#F5F5F7',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '32px 28px',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  fontFamily: 'var(--cm-font-heading, Poppins)',
                  fontSize: '2.4rem',
                  fontWeight: 500,
                  color: '#161722',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                  paddingBottom: '16px',
                  letterSpacing: '-0.03em',
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                onDemoClick()
              }}
              disabled={demoLoading}
              className="cm-btn-white"
              style={{ width: '100%', height: '48px', fontSize: '15px' }}
            >
              <Sparkles size={16} color="#E05E3A" style={{ marginRight: '8px' }} />
              {demoLoading ? 'Launching...' : 'Try Instant Sandbox'}
            </button>

            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              style={{ textDecoration: 'none' }}
            >
              <span className="cm-btn-action" style={{ width: '100%', justifyContent: 'center', height: '48px' }}>
                <span>Access Workspace</span>
                <span className="arrow-disc">
                  <ArrowUpRight size={14} />
                </span>
              </span>
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

export default LandingNavbar
