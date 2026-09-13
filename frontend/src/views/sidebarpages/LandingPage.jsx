import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { resetToDefaultFavicon } from '../../helpers/dynamicFavicon'
import '../sidebarCSS/landing.css'

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const LogoMark = ({ size = 16, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill={color === 'white' ? '#E05E3A' : '#1A1F36'} />
    <path d="M8 10h16M8 16h10M8 22h13" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="23" cy="22" r="3" fill="#E05E3A" stroke="white" strokeWidth="1.5" />
  </svg>
)

const IconArrowRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

// ─── Mock Dashboard UI (hero illustration) ─────────────────────────────────────
const MockDashboard = () => (
  <div className="lp-mock">
    {/* Header bar */}
    <div className="lp-mock-header">
      <div className="lp-mock-logo">
        <div style={{ width: 18, height: 18, background: '#E05E3A', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 8, height: 1.5, background: 'white', borderRadius: 2, boxShadow: '0 3px 0 white, 0 6px 0 white' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0F0F0F' }}>Clientmark</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ width: 60, height: 20, background: '#F5F5F3', borderRadius: 4 }} />
        <div style={{ width: 24, height: 24, background: '#1A1F36', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 9, color: 'white', fontWeight: 700 }}>A</span>
        </div>
      </div>
    </div>

    {/* Body */}
    <div className="lp-mock-body">
      {/* Sidebar */}
      <div className="lp-mock-sidebar">
        {['Dashboard', 'Leads', 'Projects', 'Users', 'Reports'].map((item, i) => (
          <div key={item} className={`lp-mock-nav-item ${i === 0 ? 'active' : ''}`}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: i === 0 ? 'white' : '#D1D5DB', flexShrink: 0 }} />
            <span>{item}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="lp-mock-content">
        {/* Stat cards */}
        <div className="lp-mock-cards">
          {[
            { label: 'Total Leads', val: '2,847', trend: '+12%', color: '#3B82F6' },
            { label: 'Converted', val: '384', trend: '+8%', color: '#10B981' },
            { label: 'Projects', val: '91', trend: '+5%', color: '#8B5CF6' },
            { label: 'Active Users', val: '24', trend: '+2', color: '#F59E0B' },
          ].map((card) => (
            <div key={card.label} className="lp-mock-card">
              <div style={{ fontSize: 8, color: '#9CA3AF', marginBottom: 3 }}>{card.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F0F0F', lineHeight: 1 }}>{card.val}</div>
              <div style={{ fontSize: 8, color: card.color, marginTop: 2, fontWeight: 600 }}>{card.trend}</div>
            </div>
          ))}
        </div>

        {/* Lead table */}
        <div className="lp-mock-table">
          <div style={{ fontSize: 8, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Recent Leads</div>
          {[
            { name: 'Arjun Mehta', status: 'SALES', stage: 'TELECALLING' },
            { name: 'Priya Sharma', status: 'NEW', stage: 'NEW' },
            { name: 'Rohan Patel', status: 'WON', stage: 'CLOSED' },
            { name: 'Sanjay Kumar', status: 'NEW', stage: 'TELECALLING' },
          ].map((row, i) => (
            <div key={i} className="lp-mock-row">
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: `hsl(${i * 60 + 200}, 60%, 55%)`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 6, color: 'white', fontWeight: 700 }}>{row.name[0]}</span>
              </div>
              <span style={{ flex: 1, fontSize: 8, color: '#374151', fontWeight: 500 }}>{row.name}</span>
              <span className={`lp-mock-badge lp-badge-${row.status.toLowerCase()}`}>{row.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

// ─── Feature card data ─────────────────────────────────────────────────────────
const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: 'Lead Pipeline',
    desc: 'Record incoming inquiries, assign leads to telecallers, log calls, and monitor pipeline stages from new to won.',
    color: '#3B82F6',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: 'Project Delivery',
    desc: 'Convert won leads into active projects with milestone tracking, deadline dates, and task assignments.',
    color: '#10B981',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: 'WhatsApp Messaging',
    desc: 'Send templated WhatsApp messages, status updates, and follow-up reminders directly from the lead record.',
    color: '#25D366',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Real-time Dashboards',
    desc: 'Monitor team conversion rates, calling activities, and project status across your entire workspace.',
    color: '#8B5CF6',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Role Permissions',
    desc: 'Configure access controls per role. Admin, BDE, Telecaller, and Developer see only relevant records.',
    color: '#F59E0B',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: 'Multi-Branch Management',
    desc: 'Organize office locations and track regional sales teams under a single company account.',
    color: '#E05E3A',
  },
]

const pricing = [
  {
    plan: 'Starter',
    price: '₹0',
    period: 'Free',
    desc: 'For testing and small teams',
    features: ['3 team members', '100 leads per month', '1 branch', 'Lead and task tracking', 'Email support'],
    cta: 'Create free account',
    solid: false,
  },
  {
    plan: 'Growth',
    price: '₹1,499',
    period: '/month',
    desc: 'For growing sales teams',
    features: ['15 team members', '5,000 leads per month', '3 branches', 'WhatsApp messaging', 'Project tracking', 'Performance reports'],
    cta: 'Start 14-day trial',
    solid: false,
  },
  {
    plan: 'Professional',
    price: '₹2,999',
    period: '/month',
    desc: 'For established sales and delivery teams',
    features: ['40 team members', '25,000 leads per month', '10 branches', 'Automated follow-ups', 'Role permissions', 'Priority support'],
    cta: 'Start 14-day trial',
    solid: true,
    popular: true,
  },
  {
    plan: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For multi-branch organizations',
    features: ['Custom team seats', 'High-volume lead capacity', 'Unlimited branches', 'Custom workflows', 'Dedicated onboarding', 'Service level agreement'],
    cta: 'Contact sales',
    solid: false,
  },
]

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    // Landing page ALWAYS enforces the OG Clientmark favicon and title
    resetToDefaultFavicon()
    document.title = 'Clientmark — Lead and Project CRM'

    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = ['Features', 'How it works', 'Pricing']

  return (
    <div className="lp2-root">
      {/* ─── Navbar ──────────────────────────────────────────────────────── */}
      <header ref={navRef} className={`lp2-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp2-nav-inner">
          <Link to="/" className="lp2-brand">
            <LogoMark size={28} />
            <span className="lp2-brand-name">Clientmark</span>
          </Link>

          <nav className="lp2-nav-links">
            {navLinks.map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} className="lp2-nav-link">{l}</a>
            ))}
          </nav>

          <div className="lp2-nav-actions">
            <Link to="/login" className="lp2-btn-ghost">Sign in</Link>
            <Link to="/register" className="lp2-btn-cta">Start free</Link>
          </div>

          <button className="lp2-hamburger" aria-label="Open menu" onClick={() => setMobileOpen(!mobileOpen)}>
            <span /><span /><span />
          </button>
        </div>

        {mobileOpen && (
          <div className="lp2-mobile-menu">
            {navLinks.map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} onClick={() => setMobileOpen(false)} className="lp2-mobile-link">{l}</a>
            ))}
            <div className="lp2-mobile-actions">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="lp2-btn-ghost" style={{ textAlign: 'center' }}>Sign in</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="lp2-btn-cta" style={{ textAlign: 'center' }}>Start free</Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ────────────────────────────────────────────────────────── */}
      <section className="lp2-hero">
        <div className="lp2-hero-bg-grid" aria-hidden="true" />

        <div className="lp2-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-hero-badge"
          >
            <span className="lp2-badge-dot" />
            Lead & Project CRM
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-hero-h1"
          >
            Manage sales leads and track<br />
            <span className="lp2-hero-accent">project delivery in one system.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-hero-sub"
          >
            Clientmark organizes incoming leads, team follow-ups, WhatsApp communication,
            and project handovers in one workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-hero-actions"
          >
            <Link to="/register" className="lp2-btn-hero-primary">
              Create an account <IconArrowRight />
            </Link>
            <Link to="/login" className="lp2-btn-hero-ghost">
              Sign in
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.48 }}
            className="lp2-hero-trust"
          >
            {['14-day trial', 'No credit card required'].map((t) => (
              <span key={t} className="lp2-trust-item">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13.5 4L6.5 11l-4-4" />
                </svg>
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Mock Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.85, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="lp2-hero-visual"
        >
          <div className="lp2-mock-wrap">
            <MockDashboard />
          </div>
        </motion.div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="lp2-section lp2-features-section">
        <div className="lp2-container">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-section-head"
          >
            <span className="lp2-eyebrow">Core Capabilities</span>
            <h2 className="lp2-section-title">Built around your sales and delivery pipeline</h2>
            <p className="lp2-section-desc">Track prospects through every stage from initial inquiry to final handover.</p>
          </motion.div>

          <div className="lp2-features-grid">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="lp2-feature-card"
              >
                <div className="lp2-feature-icon" style={{ background: `${f.color}15`, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="lp2-feature-title">{f.title}</h3>
                <p className="lp2-feature-desc">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works (Workflow) ─────────────────────────────────────── */}
      <section id="how-it-works" className="lp2-section lp2-hiw-section">
        <div className="lp2-container">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-section-head"
          >
            <span className="lp2-eyebrow">Workflow</span>
            <h2 className="lp2-section-title">From lead inquiry to project delivery</h2>
          </motion.div>

          <div className="lp2-steps">
            {[
              {
                n: '01',
                title: 'Set up your workspace',
                desc: 'Create your company account, add team members, and configure branch locations.',
              },
              {
                n: '02',
                title: 'Track incoming leads',
                desc: 'Log lead details, assign telecallers or BDEs, schedule follow-ups, and record call notes.',
              },
              {
                n: '03',
                title: 'Deliver the project',
                desc: 'Convert won leads into active projects, track stage milestones, and share status previews.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="lp2-step"
              >
                <div className="lp2-step-num">{step.n}</div>
                <div>
                  <h3 className="lp2-step-title">{step.title}</h3>
                  <p className="lp2-step-desc">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="lp2-section lp2-pricing-section">
        <div className="lp2-container">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-section-head"
          >
            <span className="lp2-eyebrow">Pricing</span>
            <h2 className="lp2-section-title">Plans for teams of any size</h2>
            <p className="lp2-section-desc">Choose a plan based on your team size and monthly lead volume.</p>
          </motion.div>

          <div className="lp2-pricing-grid">
            {pricing.map((plan, i) => (
              <motion.div
                key={plan.plan}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={`lp2-price-card ${plan.popular ? 'popular' : ''}`}
              >
                {plan.popular && <div className="lp2-popular-badge">Most popular</div>}
                <div className="lp2-plan-name">{plan.plan}</div>
                <div className="lp2-plan-price">
                  {plan.price}
                  {plan.period && <span className="lp2-plan-period">{plan.period}</span>}
                </div>
                <div className="lp2-plan-desc">{plan.desc}</div>
                <hr className="lp2-divider" />
                <ul className="lp2-plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={plan.popular ? '#E05E3A' : '#16A34A'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13.5 4L6.5 11l-4-4" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`lp2-plan-cta ${plan.solid ? 'solid' : 'outline'}`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="lp2-cta-section">
        <div className="lp2-container">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-cta-inner"
          >
            <div className="lp2-cta-grid-bg" aria-hidden="true" />
            <span className="lp2-eyebrow" style={{ color: '#E05E3A' }}>Get started</span>
            <h2 className="lp2-cta-title">
              Start organizing your<br />leads and projects.
            </h2>
            <p className="lp2-cta-sub">
              Set up your workspace in minutes with a 14-day trial. No credit card required.
            </p>
            <div className="lp2-cta-actions">
              <Link to="/register" className="lp2-btn-cta-white">
                Create an account <IconArrowRight />
              </Link>
              <Link to="/login" className="lp2-btn-cta-outline">
                Sign in
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="lp2-footer">
        <div className="lp2-container">
          <div className="lp2-footer-top">
            <div className="lp2-footer-brand">
              <Link to="/" className="lp2-brand">
                <LogoMark size={26} />
                <span className="lp2-brand-name" style={{ color: '#0F0F0F' }}>Clientmark</span>
              </Link>
              <p className="lp2-footer-tagline">
                Lead tracking and project delivery CRM.<br />clientmark.app
              </p>
            </div>

            <div className="lp2-footer-links-grid">
              <div>
                <div className="lp2-footer-col-title">Product</div>
                <a href="#features" className="lp2-footer-link">Features</a>
                <a href="#pricing" className="lp2-footer-link">Pricing</a>
                <a href="#how-it-works" className="lp2-footer-link">How it works</a>
              </div>
              <div>
                <div className="lp2-footer-col-title">Account</div>
                <Link to="/login" className="lp2-footer-link">Sign in</Link>
                <Link to="/register" className="lp2-footer-link">Register</Link>
              </div>
            </div>
          </div>

          <div className="lp2-footer-bottom">
            <span>© {new Date().getFullYear()} Clientmark. All rights reserved.</span>
            <span>clientmark.app</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
