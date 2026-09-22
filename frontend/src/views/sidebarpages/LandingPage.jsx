import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Cookies from 'js-cookie'
import { toast } from 'react-hot-toast'
import apiClient from '../../api/axiosClient'
import { resetToDefaultFavicon } from '../../helpers/dynamicFavicon'
import ChatbotWidget from '../../components/ChatbotWidget'
import '../sidebarCSS/landing.css'

// ─── SVG Icons ─────────────────────────────────────────────────────────────────
const LogoMark = ({ size = 20, color = '#E05E3A' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill={color} />
    <path d="M8 10h16M8 16h11M8 22h14" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="24" cy="22" r="2.8" fill={color} stroke="white" strokeWidth="1.6" />
  </svg>
)

const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 4L6.5 11l-4-4" />
  </svg>
)

// ─── Precision Mock UI (Workspace preview) ─────────────────────────────────────
const MockWorkspacePreview = () => (
  <div className="lp2-mock">
    {/* Clean light header */}
    <div className="lp2-mock-header">
      <div className="lp2-mock-logo">
        <LogoMark size={20} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
          Clientmark
        </span>
        <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 8, padding: '2px 8px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 9999 }}>
          HQ Workspace
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, color: '#6B7280', padding: '4px 10px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6 }}>
          Search leads, tasks... ⌘K
        </div>
        <div style={{ width: 26, height: 26, background: '#E05E3A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: '#FFFFFF', fontWeight: 700 }}>A</span>
        </div>
      </div>
    </div>

    {/* Body */}
    <div className="lp2-mock-body">
      {/* Sidebar */}
      <div className="lp2-mock-sidebar">
        {[
          { name: 'Dashboard', active: true },
          { name: 'Lead Pipeline', active: false },
          { name: 'Projects', active: false },
          { name: 'Telecallers', active: false },
          { name: 'WhatsApp', active: false },
          { name: 'Reports', active: false },
        ].map((item) => (
          <div key={item.name} className={`lp2-mock-nav-item ${item.active ? 'active' : ''}`}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.active ? '#E05E3A' : '#D1D5DB' }} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="lp2-mock-content">
        {/* Metric Cards */}
        <div className="lp2-mock-cards">
          {[
            { label: 'Active Pipeline', val: '2,847', trend: '+14% this month', color: '#10B981' },
            { label: 'Converted Won', val: '384', trend: '13.5% conversion', color: '#10B981' },
            { label: 'Live Projects', val: '92', trend: '98% on track', color: '#E05E3A' },
            { label: 'Calls Today', val: '640', trend: '8 telecallers', color: '#4B5563' },
          ].map((card) => (
            <div key={card.label} className="lp2-mock-card">
              <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginBottom: 4 }}>{card.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{card.val}</div>
              <div style={{ fontSize: 10, color: card.color, marginTop: 4, fontWeight: 600 }}>{card.trend}</div>
            </div>
          ))}
        </div>

        {/* Lead Table */}
        <div className="lp2-mock-table">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 650, color: '#111827', letterSpacing: '-0.01em' }}>
              Real-time Lead Activity
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>Updated just now</div>
          </div>
          {[
            { name: 'Arjun Mehta', org: 'TechCorp Pvt Ltd', stage: 'Won', tag: 'won', rep: 'Priya S.', time: '5m ago' },
            { name: 'Kavita Rao', org: 'Apex Solutions', stage: 'Negotiation', tag: 'sales', rep: 'Rohan P.', time: '18m ago' },
            { name: 'Vikram Joshi', org: 'Zenith Global', stage: 'New Inquiry', tag: 'new', rep: 'Sunita M.', time: '42m ago' },
            { name: 'Rahul Nair', org: 'Omega Logistics', stage: 'Telecalling', tag: 'sales', rep: 'Priya S.', time: '1h ago' },
          ].map((row, i) => (
            <div key={i} className="lp2-mock-row">
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#374151' }}>
                {row.name[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{row.name}</div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>{row.org}</div>
              </div>
              <div style={{ fontSize: 11, color: '#4B5563', marginRight: 16 }}>{row.rep}</div>
              <span className={`lp2-mock-badge lp-badge-${row.tag}`}>{row.stage}</span>
              <div style={{ fontSize: 10, color: '#9CA3AF', width: 50, textAlign: 'right' }}>{row.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

// ─── Capability Data ─────────────────────────────────────────────────────────
const capabilities = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E05E3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: 'Lead Pipeline & Staging',
    desc: 'Capture incoming inquiries, assign telecallers, log call summaries, and track prospects smoothly from initial inquiry to won deal.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E05E3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: 'Project Delivery & Milestones',
    desc: 'Convert closed deals into active projects with milestone tracking, deadline dates, task delegation, and customer status previews.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E05E3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: 'Native WhatsApp Messaging',
    desc: 'Send templated messages, quotes, and follow-up reminders directly from each lead card without juggling personal devices.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E05E3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Real-Time Team Analytics',
    desc: 'Evaluate telecaller calling velocity, lead conversion ratios, and delivery progress across branches with real-time reporting.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E05E3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Granular Role Permissions',
    desc: 'Keep data strictly governed. Admins, BDEs, Telecallers, and Delivery Developers only access the records their role permits.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E05E3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    title: 'Multi-Branch & Tenant Isolation',
    desc: 'Manage multiple regional offices and teams under a unified workspace with complete tenant data isolation and custom branding.',
  },
]

// ─── Pricing Data ─────────────────────────────────────────────────────────────
const pricingPlans = [
  {
    plan: 'Starter',
    price: '₹0',
    period: 'Free',
    desc: 'Ideal for evaluation and small agency teams',
    features: ['3 team members', '100 leads / month', '1 branch location', 'Lead and task tracking', 'Email support'],
    cta: 'Create free account',
    solid: false,
    popular: false,
  },
  {
    plan: 'Growth',
    price: '₹1,499',
    period: '/month',
    desc: 'For active sales teams closing daily deals',
    features: ['15 team members', '5,000 leads / month', '3 branches', 'WhatsApp messaging', 'Project milestone tracking', 'Conversion analytics'],
    cta: 'Start 14-day trial',
    solid: false,
    popular: false,
  },
  {
    plan: 'Professional',
    price: '₹2,999',
    period: '/month',
    desc: 'For growing companies with multiple sales reps',
    features: ['40 team members', '25,000 leads / month', '10 branches', 'Automated follow-ups', 'Role permissions engine', 'Priority support'],
    cta: 'Start 14-day trial',
    solid: true,
    popular: true,
  },
  {
    plan: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For high-volume multi-branch organizations',
    features: ['Unlimited team seats', 'High-volume lead ingestion', 'Unlimited branches', 'Custom pipeline workflows', 'Dedicated onboarding rep', '99.9% uptime SLA'],
    cta: 'Contact sales',
    solid: false,
    popular: false,
  },
]

// ─── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const handleDemoLogin = async () => {
    try {
      setDemoLoading(true)
      toast.loading('Launching Acme Agency demo workspace...', { id: 'demo-launch' })
      const res = await apiClient.post('/tenant/demo-login')
      toast.dismiss('demo-launch')

      if (res.data?.success && res.data?.token) {
        Cookies.set('token', res.data.token, { expires: 1 })
        Cookies.set('isDemoMode', 'true', { expires: 1 })
        sessionStorage.setItem('isDemoMode', 'true')
        toast.success('Welcome to the Live Demo Sandbox!')
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      } else {
        toast.error(res.data?.message || 'Failed to start demo.')
      }
    } catch (err) {
      toast.dismiss('demo-launch')
      toast.error(err?.response?.data?.message || 'Could not load demo workspace.')
    } finally {
      setDemoLoading(false)
    }
  }

  useEffect(() => {
    resetToDefaultFavicon()
    document.title = 'Clientmark — The Lead and Project CRM'

    const onScroll = () => setScrolled(window.scrollY > 15)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = ['Capabilities', 'Workflow', 'Pricing']

  return (
    <div className="lp2-root">
      {/* ─── Top Navigation ───────────────────────────────────────────────── */}
      <header ref={navRef} className={`lp2-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp2-nav-inner">
          <Link to="/" className="lp2-brand">
            <LogoMark size={28} />
            <span className="lp2-brand-name">Clientmark</span>
          </Link>

          <nav className="lp2-nav-links">
            {navLinks.map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} className="lp2-nav-link">
                {l}
              </a>
            ))}
          </nav>

          <div className="lp2-nav-actions">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="lp2-btn-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                border: '1px solid rgba(224, 94, 58, 0.4)',
                color: '#E05E3A',
                fontWeight: 600,
              }}
            >
              <span>⚡</span> {demoLoading ? 'Loading...' : 'Live Demo'}
            </button>
            <Link to="/login" className="lp2-btn-ghost">Sign in</Link>
            <Link to="/register" className="lp2-btn-cta">Start free trial</Link>
          </div>

          <button className="lp2-hamburger" aria-label="Open navigation menu" onClick={() => setMobileOpen(!mobileOpen)}>
            <span /><span /><span />
          </button>
        </div>

        {mobileOpen && (
          <div className="lp2-mobile-menu">
            {navLinks.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(' ', '-')}`}
                onClick={() => setMobileOpen(false)}
                className="lp2-mobile-link"
              >
                {l}
              </a>
            ))}
            <div className="lp2-mobile-actions">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={demoLoading}
                className="lp2-btn-ghost"
                style={{ textAlign: 'center', color: '#E05E3A', fontWeight: 600 }}
              >
                ⚡ {demoLoading ? 'Loading...' : 'Explore Live Demo'}
              </button>
              <Link to="/login" onClick={() => setMobileOpen(false)} className="lp2-btn-ghost" style={{ textAlign: 'center' }}>
                Sign in
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="lp2-btn-cta" style={{ textAlign: 'center' }}>
                Start free trial
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="lp2-hero">
        <div className="lp2-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-hero-badge"
          >
            <span className="lp2-badge-dot" />
            Lead Management & Project Delivery CRM
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-hero-h1"
          >
            The single system for sales leads<br />
            and <span className="lp2-hero-accent">project delivery.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-hero-sub"
          >
            Clientmark unifies inbound lead capture, telecaller follow-ups, direct WhatsApp
            messaging, and project handovers into one organized workspace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-hero-actions"
          >
            <Link to="/register" className="lp2-btn-hero-primary">
              Start Free Trial <IconArrowRight />
            </Link>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="lp2-btn-hero-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                borderColor: 'rgba(224, 94, 58, 0.4)',
                backgroundColor: 'rgba(224, 94, 58, 0.05)',
                color: '#111827',
                fontWeight: 600,
              }}
            >
              <span style={{ color: '#E05E3A' }}>⚡</span> {demoLoading ? 'Loading Demo...' : 'Explore Live Demo'}
            </button>
            <Link to="/login" className="lp2-btn-hero-ghost">
              Sign in
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.36 }}
            className="lp2-hero-trust"
          >
            <span className="lp2-trust-item">
              <span style={{ color: '#10B981' }}><IconCheck /></span> 14-day free trial
            </span>
            <span className="lp2-trust-item">
              <span style={{ color: '#10B981' }}><IconCheck /></span> No credit card required
            </span>
            <span className="lp2-trust-item">
              <span style={{ color: '#10B981' }}><IconCheck /></span> Setup in under 2 minutes
            </span>
          </motion.div>
        </div>

        {/* Mock Product Visual */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="lp2-hero-visual"
        >
          <div className="lp2-mock-wrap">
            <MockWorkspacePreview />
          </div>
        </motion.div>
      </section>

      {/* ─── Social Proof Strip ───────────────────────────────────────────── */}
      <section className="lp2-social-proof">
        <div className="lp2-container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-proof-inner"
          >
            <div className="lp2-proof-stat">
              <div className="lp2-proof-number">2,400+</div>
              <div className="lp2-proof-label">Teams onboarded</div>
            </div>
            <div className="lp2-proof-divider" />
            <div className="lp2-proof-stat">
              <div className="lp2-proof-number">99.9%</div>
              <div className="lp2-proof-label">Platform uptime</div>
            </div>
            <div className="lp2-proof-divider" />
            <div className="lp2-proof-stat">
              <div className="lp2-proof-number">1.2M+</div>
              <div className="lp2-proof-label">Leads managed</div>
            </div>
            <div className="lp2-proof-divider" />
            <div className="lp2-proof-stat">
              <div className="lp2-proof-number">14 days</div>
              <div className="lp2-proof-label">Free trial, no card</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Capabilities Section ─────────────────────────────────────────── */}
      <section id="capabilities" className="lp2-section">
        <div className="lp2-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-section-head"
          >
            <span className="lp2-eyebrow">Core Capabilities</span>
            <h2 className="lp2-section-title">Built around your sales and delivery pipeline</h2>
            <p className="lp2-section-desc">
              Track prospects through every step of the commercial cycle, from first phone call to delivered project.
            </p>
          </motion.div>

          <div className="lp2-features-grid">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="lp2-feature-card"
              >
                <div className="lp2-feature-icon">
                  {cap.icon}
                </div>
                <h3 className="lp2-feature-title">{cap.title}</h3>
                <p className="lp2-feature-desc">{cap.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <hr className="lp2-hairline" />

      {/* ─── Workflow Section ─────────────────────────────────────────────── */}
      <section id="workflow" className="lp2-section">
        <div className="lp2-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-section-head"
          >
            <span className="lp2-eyebrow">Operating Rhythm</span>
            <h2 className="lp2-section-title">From initial inquiry to delivered handover</h2>
            <p className="lp2-section-desc">
              A structured progression that keeps sales reps accountable and delivery teams informed.
            </p>
          </motion.div>

          <div className="lp2-steps">
            {[
              {
                num: '01',
                title: 'Set up your workspace & branches',
                desc: 'Register your company account, invite sales reps and telecallers, and map branch locations.',
              },
              {
                num: '02',
                title: 'Capture & advance sales leads',
                desc: 'Log lead requirements, assign telecallers, trigger WhatsApp follow-ups, and track status.',
              },
              {
                num: '03',
                title: 'Deliver milestones & report health',
                desc: 'Transition won deals into project milestones, monitor team metrics, and share status links.',
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.45, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="lp2-step"
              >
                <span className="lp2-step-num">{step.num}</span>
                <h3 className="lp2-step-title">{step.title}</h3>
                <p className="lp2-step-desc">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonial Section ──────────────────────────────────────────── */}
      <section className="lp2-testimonial-section">
        <div className="lp2-container">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-testimonial-card"
          >
            <div className="lp2-testimonial-quote-icon">"</div>
            <p className="lp2-testimonial-text">
              Clientmark replaced three separate tools for us — a spreadsheet for leads, WhatsApp groups for follow-ups, and a project tracker for delivery. Now everything flows through one workspace and our conversion rate jumped 34% in the first quarter.
            </p>
            <div className="lp2-testimonial-author">
              <div className="lp2-testimonial-avatar">R</div>
              <div className="lp2-testimonial-info">
                <div className="lp2-testimonial-name">Rajesh Kapoor</div>
                <div className="lp2-testimonial-role">Director of Sales, Vertex Digital Solutions</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <hr className="lp2-hairline" />

      {/* ─── Pricing Section ─────────────────────────────────────────────── */}
      <section id="pricing" className="lp2-section">
        <div className="lp2-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-section-head"
          >
            <span className="lp2-eyebrow">Pricing Plans</span>
            <h2 className="lp2-section-title">Predictable plans for growing teams</h2>
            <p className="lp2-section-desc">
              Transparent tiers with zero hidden fees. Scale as your sales volume and telecallers expand.
            </p>
          </motion.div>

          <div className="lp2-pricing-grid">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.plan}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className={`lp2-price-card ${plan.popular ? 'popular' : ''}`}
              >
                {plan.popular && <div className="lp2-popular-badge">Most Popular</div>}
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
                      <span style={{ color: plan.popular ? '#E05E3A' : '#10B981', flexShrink: 0, marginTop: 2 }}>
                        <IconCheck />
                      </span>
                      <span>{f}</span>
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

      {/* ─── Bottom CTA (Dark Banner) ─────────────────────────────────────── */}
      <section className="lp2-cta-section">
        <div className="lp2-container">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lp2-cta-inner"
          >
            <span className="lp2-eyebrow">Get Started</span>
            <h2 className="lp2-cta-title">
              Start organizing your leads<br />and delivery pipeline today.
            </h2>
            <p className="lp2-cta-sub">
              Create your company workspace in less than two minutes. 14-day free trial with no credit card required.
            </p>
            <div className="lp2-cta-actions">
              <Link to="/register" className="lp2-btn-cta-primary">
                Create an account <IconArrowRight />
              </Link>
              <Link to="/login" className="lp2-btn-cta-outline">
                Sign in to workspace
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
                <LogoMark size={24} />
                <span className="lp2-brand-name">Clientmark</span>
              </Link>
              <p className="lp2-footer-tagline">
                Lead tracking and project delivery software for sales and delivery teams.<br />
                clientmark.app
              </p>
            </div>

            <div className="lp2-footer-links-grid">
              <div>
                <div className="lp2-footer-col-title">Product</div>
                <a href="#capabilities" className="lp2-footer-link">Capabilities</a>
                <a href="#workflow" className="lp2-footer-link">Workflow</a>
                <a href="#pricing" className="lp2-footer-link">Pricing</a>
              </div>
              <div>
                <div className="lp2-footer-col-title">Access</div>
                <Link to="/login" className="lp2-footer-link">Sign In</Link>
                <Link to="/register" className="lp2-footer-link">Create Account</Link>
              </div>
            </div>
          </div>

          <div className="lp2-footer-bottom">
            <span>© {new Date().getFullYear()} Clientmark. All rights reserved.</span>
            <span>clientmark.app</span>
          </div>
        </div>
      </footer>

      {/* Floating AI Chatbot Assistant */}
      <ChatbotWidget />
    </div>
  )
}
