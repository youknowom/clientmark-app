import React from 'react'
import { Link } from 'react-router-dom'
import '../sidebarCSS/landing.css'
import logo from '../../assets/brand/logo.png'

const LandingPage = () => {
  return (
    <div className="landing-wrapper">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark nav-glass fixed-top py-3">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <img src={logo} alt="Logo" height="36" className="bg-white rounded p-1" />
            <span className="fw-bold fs-4 text-white">CRM SaaS</span>
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#landingNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="landingNav">
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0 me-4">
              <li className="nav-item">
                <a className="nav-link text-light fs-6" href="#features">Features</a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-light fs-6" href="#how-it-works">How It Works</a>
              </li>
              <li className="nav-item">
                <a className="nav-link text-light fs-6" href="#pricing">Pricing</a>
              </li>
            </ul>
            <div className="d-flex gap-2">
              <Link to="/login" className="btn btn-outline-light px-4 py-2 fw-semibold">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary px-4 py-2 fw-semibold">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="landing-hero text-center" style={{ paddingTop: '140px' }}>
        <div className="container">
          <div className="badge bg-primary bg-opacity-25 text-primary-light px-3 py-2 rounded-pill mb-4 fs-6 border border-primary border-opacity-25">
            🚀 All-in-One Multi-Tenant CRM Platform
          </div>
          <h1 className="hero-title mb-4">
            Grow Your Business Faster with <br />
            <span className="hero-gradient-text">Smart Lead & Project Management</span>
          </h1>
          <p className="hero-subtitle mb-5">
            Empower your team with real-time lead tracking, project timelines, automated WhatsApp messaging, and detailed performance analytics — built for modern growth teams.
          </p>
          <div className="d-flex justify-content-center gap-3 mb-5">
            <Link to="/register" className="btn btn-primary btn-lg px-5 py-3 fw-bold rounded-pill shadow-lg fs-5">
              Get Started Free (14-Day Trial)
            </Link>
            <a href="#features" className="btn btn-outline-light btn-lg px-5 py-3 fw-bold rounded-pill fs-5">
              Explore Features
            </a>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-5 bg-light">
        <div className="container py-5">
          <div className="text-center mb-5">
            <h2 className="fw-bold fs-1 text-dark mb-3">Everything You Need to Scale</h2>
            <p className="text-muted fs-5">Designed to streamline your entire sales and delivery lifecycle</p>
          </div>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="feature-icon-box">🎯</div>
                <h4 className="fw-bold text-dark mb-3">Lead Management</h4>
                <p className="text-muted">
                  Capture, assign, and track leads through dynamic stages. Never miss a follow-up with real-time notifications.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="feature-icon-box">📁</div>
                <h4 className="fw-bold text-dark mb-3">Project Deliverables</h4>
                <p className="text-muted">
                  Track project statuses, client feedback, milestones, and client-facing preview links effortlessly.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="feature-icon-box">💬</div>
                <h4 className="fw-bold text-dark mb-3">WhatsApp Automation</h4>
                <p className="text-muted">
                  Integrated WhatsApp messaging and automated OTP follow-ups to connect with leads instantly.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="feature-icon-box">🔐</div>
                <h4 className="fw-bold text-dark mb-3">Role-Based Access (RBAC)</h4>
                <p className="text-muted">
                  Granular permission management for Admins, BDEs, Telecallers, and Developers per company.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="feature-icon-box">📊</div>
                <h4 className="fw-bold text-dark mb-3">Analytics & Reports</h4>
                <p className="text-muted">
                  Comprehensive reports on lead conversions, team performance, telecaller call logs, and revenue.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="feature-card h-100">
                <div className="feature-icon-box">🏢</div>
                <h4 className="fw-bold text-dark mb-3">Multi-Branch Support</h4>
                <p className="text-muted">
                  Manage multiple office branches under one organization with branch-level filtering and access controls.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-5">
        <div className="container py-5">
          <div className="text-center mb-5">
            <h2 className="fw-bold fs-1 text-dark mb-3">Simple, Transparent Pricing</h2>
            <p className="text-muted fs-5">Choose the plan that fits your business needs</p>
          </div>

          <div className="row g-4 justify-content-center">
            {/* Free */}
            <div className="col-lg-3 col-md-6">
              <div className="pricing-card text-center h-100">
                <h3 className="fw-bold text-dark mb-2">Free</h3>
                <p className="text-muted mb-4">For individuals & tiny teams</p>
                <div className="pricing-price mb-4">₹0 <span>/ mo</span></div>
                <ul className="list-unstyled text-start mb-4 fs-6">
                  <li className="mb-2">✓ Up to 3 Users</li>
                  <li className="mb-2">✓ Up to 100 Leads</li>
                  <li className="mb-2">✓ 1 Branch</li>
                  <li className="mb-2">✓ Basic Lead Tracking</li>
                </ul>
                <Link to="/register" className="btn btn-outline-primary w-100 fw-bold py-2">Get Started</Link>
              </div>
            </div>

            {/* Starter */}
            <div className="col-lg-3 col-md-6">
              <div className="pricing-card text-center h-100">
                <h3 className="fw-bold text-dark mb-2">Starter</h3>
                <p className="text-muted mb-4">For growing small businesses</p>
                <div className="pricing-price mb-4">₹999 <span>/ mo</span></div>
                <ul className="list-unstyled text-start mb-4 fs-6">
                  <li className="mb-2">✓ Up to 10 Users</li>
                  <li className="mb-2">✓ Up to 1,000 Leads</li>
                  <li className="mb-2">✓ 2 Branches</li>
                  <li className="mb-2">✓ WhatsApp Integration</li>
                </ul>
                <Link to="/register" className="btn btn-outline-primary w-100 fw-bold py-2">Start Free Trial</Link>
              </div>
            </div>

            {/* Professional */}
            <div className="col-lg-3 col-md-6">
              <div className="pricing-card popular text-center h-100">
                <div className="pricing-badge">Most Popular</div>
                <h3 className="fw-bold text-dark mb-2">Professional</h3>
                <p className="text-muted mb-4">For fast-growing companies</p>
                <div className="pricing-price mb-4">₹2,499 <span>/ mo</span></div>
                <ul className="list-unstyled text-start mb-4 fs-6">
                  <li className="mb-2">✓ Up to 25 Users</li>
                  <li className="mb-2">✓ Up to 10,000 Leads</li>
                  <li className="mb-2">✓ 5 Branches</li>
                  <li className="mb-2">✓ Full Reports & WhatsApp</li>
                </ul>
                <Link to="/register" className="btn btn-primary w-100 fw-bold py-2">Start Free Trial</Link>
              </div>
            </div>

            {/* Enterprise */}
            <div className="col-lg-3 col-md-6">
              <div className="pricing-card text-center h-100">
                <h3 className="fw-bold text-dark mb-2">Enterprise</h3>
                <p className="text-muted mb-4">For large-scale operations</p>
                <div className="pricing-price mb-4">₹4,999 <span>/ mo</span></div>
                <ul className="list-unstyled text-start mb-4 fs-6">
                  <li className="mb-2">✓ Unlimited Users</li>
                  <li className="mb-2">✓ Unlimited Leads</li>
                  <li className="mb-2">✓ Unlimited Branches</li>
                  <li className="mb-2">✓ Priority 24/7 Support</li>
                </ul>
                <Link to="/register" className="btn btn-outline-primary w-100 fw-bold py-2">Contact Us</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-light py-5">
        <div className="container text-center">
          <p className="mb-2 text-muted">© {new Date().getFullYear()} CRM SaaS. All rights reserved.</p>
          <div className="d-flex justify-content-center gap-4 text-muted">
            <a href="#features" className="text-muted text-decoration-none">Features</a>
            <a href="#pricing" className="text-muted text-decoration-none">Pricing</a>
            <Link to="/login" className="text-muted text-decoration-none">Sign In</Link>
            <Link to="/register" className="text-muted text-decoration-none">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
