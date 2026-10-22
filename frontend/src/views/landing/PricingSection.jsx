import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Check } from 'lucide-react'

export const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(true)

  const plans = [
    {
      name: 'Starter',
      badge: 'Evaluation',
      desc: 'For solo founders and boutique agencies organizing their initial pipeline.',
      price: '₹0',
      period: 'forever free',
      features: [
        '3 team member seats',
        'Up to 150 leads / month',
        'Lead Kanban & table views',
        '1 branch location',
        'Community email support',
      ],
      cta: 'Get Started Free',
      popular: false,
    },
    {
      name: 'Studio Growth',
      badge: 'Most Popular',
      desc: 'For growing sales teams closing high-value deals with instant WhatsApp outreach.',
      price: isAnnual ? '₹1,199' : '₹1,499',
      period: '/ month',
      features: [
        '15 team member seats',
        'Up to 5,000 leads / month',
        'WhatsApp direct messaging integration',
        '1-click deal to project milestone handover',
        'Telecaller call logs & daily quotas',
        '3 branch locations',
      ],
      cta: 'Start 14-Day Free Trial',
      popular: true,
    },
    {
      name: 'Scale Enterprise',
      badge: 'Large Operations',
      desc: 'The complete enterprise operating system for multi-branch organizations.',
      price: isAnnual ? '₹2,399' : '₹2,999',
      period: '/ month',
      features: [
        '40 team member seats',
        'Up to 25,000 leads / month',
        'Intelligent round-robin lead distribution',
        'Granular RBAC role permissions engine',
        'Branded client milestone preview portals',
        '10 branch locations',
        'Priority 24/7 Slack & WhatsApp support',
      ],
      cta: 'Start 14-Day Free Trial',
      popular: false,
    },
  ]

  return (
    <section
      id="pricing"
      style={{
        padding: '90px 0 110px',
        backgroundColor: '#F5F5F7',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className="cm-container" style={{ maxWidth: '1240px' }}>
        {/* Section Heading */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px auto' }}>
          <h2
            data-reveal="words"
            style={{
              fontFamily: 'var(--cm-font-heading, Poppins)',
              fontSize: 'clamp(2.5rem, 5vw, 4.4rem)',
              fontWeight: 500,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              margin: '0 0 16px 0',
            }}
          >
            <span style={{ color: '#161722' }}>
              <span className="reveal-word inline-block">Transparent </span>
              <span className="reveal-word inline-block">investment.</span>
            </span>
          </h2>
          <p style={{ fontSize: '16px', color: '#6B6A66', margin: '0 0 28px 0' }}>
            Predictable SaaS subscriptions designed for boutique studios and scaling enterprises.
          </p>

          {/* Billing Interval Toggle Pill */}
          <div
            style={{
              display: 'inline-flex',
              padding: '4px',
              borderRadius: '9999px',
              background: '#FFFFFF',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsAnnual(false)}
              style={{
                fontFamily: 'var(--cm-font, Poppins)',
                fontSize: '13px',
                fontWeight: !isAnnual ? 600 : 400,
                color: !isAnnual ? '#161722' : '#6B6A66',
                background: !isAnnual ? '#F0F0F4' : 'none',
                border: 'none',
                padding: '7px 18px',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Monthly billing
            </button>
            <button
              type="button"
              onClick={() => setIsAnnual(true)}
              style={{
                fontFamily: 'var(--cm-font, Poppins)',
                fontSize: '13px',
                fontWeight: isAnnual ? 600 : 400,
                color: !isAnnual ? '#161722' : '#6B6A66',
                background: isAnnual ? '#F0F0F4' : 'none',
                border: 'none',
                padding: '7px 18px',
                borderRadius: '9999px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Annual billing (Save 20%)
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {plans.map((p) => {
            return (
              <div
                key={p.name}
                className="cm-card-3d"
                style={{
                  padding: '38px 34px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  backgroundColor: '#FFFFFF',
                  border: p.popular ? '2px solid #E05E3A' : '1px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: p.popular ? '0 16px 40px -4px rgba(224, 94, 58, 0.16)' : '0 8px 30px -4px rgba(22, 23, 34, 0.05)',
                  position: 'relative',
                }}
              >
                {p.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '18px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: 'rgba(224, 94, 58, 0.12)',
                      color: '#E05E3A',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {p.badge}
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--cm-font-heading, Poppins)',
                        fontSize: '22px',
                        fontWeight: 600,
                        color: '#161722',
                      }}
                    >
                      {p.name}
                    </span>
                  </div>

                  <p style={{ fontSize: '14px', color: '#6B6A66', lineHeight: 1.5, margin: '0 0 24px 0', minHeight: '42px' }}>
                    {p.desc}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '28px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--cm-font-heading, Poppins)',
                        fontSize: '44px',
                        fontWeight: 700,
                        color: '#161722',
                        letterSpacing: '-0.04em',
                        lineHeight: 1,
                      }}
                    >
                      {p.price}
                    </span>
                    <span style={{ fontSize: '13px', color: '#8D8D96' }}>{p.period}</span>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.06)', paddingTop: '24px', marginBottom: '32px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {p.features.map((feat, fIdx) => (
                        <li key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: '#161722' }}>
                          <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: p.popular ? 'rgba(224, 94, 58, 0.14)' : '#F0F0F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Check size={11} color={p.popular ? '#E05E3A' : '#161722'} strokeWidth={3} />
                          </span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Link to="/register" style={{ textDecoration: 'none' }}>
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '9999px',
                      background: p.popular ? '#161722' : '#FFFFFF',
                      color: p.popular ? '#FFFFFF' : '#161722',
                      border: p.popular ? 'none' : '1px solid rgba(0, 0, 0, 0.12)',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: p.popular ? '0 8px 24px -6px rgba(22, 23, 34, 0.4)' : '0 1px 4px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <span>{p.cta}</span>
                    <ArrowUpRight size={15} />
                  </button>
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default PricingSection
