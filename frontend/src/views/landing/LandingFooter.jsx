import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClientmarkLogo } from '../../components/brand/ClientmarkLogo'
import { ArrowUpRight } from 'lucide-react'

export const LandingFooter = () => {
  return (
    <footer
      style={{
        backgroundColor: '#F5F5F7',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        padding: '80px 0 36px',
      }}
    >
      <div className="cm-container" style={{ maxWidth: '1240px' }}>
        {/* Main Footer Links Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '48px',
            marginBottom: '64px',
          }}
        >
          {/* Brand Info */}
          <div>
            <Link to="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '18px' }}>
              <ClientmarkLogo size={28} wordmarkColor="#161722" />
            </Link>
            <p style={{ fontSize: '14px', color: '#6B6A66', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              A product studio CRM designed for founders and teams who care how their sales and delivery pipeline feels.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#059669', fontWeight: 600 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Column: Capabilities */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8D8D96', marginBottom: '18px' }}>
              Capabilities
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <li><a href="#services" style={{ color: '#161722', textDecoration: 'none' }}>Lead Pipeline</a></li>
              <li><a href="#services" style={{ color: '#161722', textDecoration: 'none' }}>WhatsApp Outreach</a></li>
              <li><a href="#services" style={{ color: '#161722', textDecoration: 'none' }}>Deal-to-Milestone</a></li>
              <li><a href="#work" style={{ color: '#161722', textDecoration: 'none' }}>Featured Work</a></li>
            </ul>
          </div>

          {/* Column: Workspace Access */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8D8D96', marginBottom: '18px' }}>
              Access
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <li><Link to="/login" style={{ color: '#161722', textDecoration: 'none' }}>Sign in to Workspace</Link></li>
              <li><Link to="/register" style={{ color: '#161722', textDecoration: 'none' }}>Start 14-Day Free Trial</Link></li>
              <li><Link to="/forgot-password" style={{ color: '#161722', textDecoration: 'none' }}>Forgot Password</Link></li>
              <li><a href="#faq" style={{ color: '#161722', textDecoration: 'none' }}>Frequently Asked Questions</a></li>
            </ul>
          </div>

          {/* Column: Connect */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8D8D96', marginBottom: '18px' }}>
              Direct Contact
            </div>
            <p style={{ fontSize: '14px', color: '#6B6A66', margin: '0 0 16px 0', lineHeight: 1.6 }}>
              Have questions about enterprise custom deployments or multi-tenant setup?
            </p>
            <a
              href="mailto:contact@clientmark.app"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#E05E3A',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              contact@clientmark.app <ArrowUpRight size={14} />
            </a>
          </div>
        </div>

        {/* Bottom Baseline Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            paddingTop: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '13px',
            color: '#8D8D96',
          }}
        >
          <div>
            © {new Date().getFullYear()} Clientmark. All rights reserved.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span>Designed & built with intent.</span>
            <span style={{ color: '#161722', fontWeight: 500 }}>Clientmark Studio Experience</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default LandingFooter
