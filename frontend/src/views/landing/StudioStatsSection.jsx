import React from 'react'

export const StudioStatsSection = () => {
  const stats = [
    {
      num: '120k+',
      label: 'Leads Processed & Qualified',
      sub: 'Zero lead leaks with automated webhooks and round-robin dispatch.',
    },
    {
      num: '3.8m',
      label: 'Average First Callback',
      sub: 'Instant telecaller dial queues that turn warm inquiries into live deals.',
    },
    {
      num: '99.4%',
      label: 'Client Milestone SLA Rate',
      sub: 'Direct project delivery handoffs with transparent client portals.',
    },
    {
      num: '₹42Cr+',
      label: 'Pipeline Volume Managed',
      sub: 'Enterprise-grade multi-tenant data partitioning and security.',
    },
  ]

  return (
    <section
      style={{
        padding: '90px 0 100px',
        backgroundColor: '#F5F5F7',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className="cm-container" style={{ maxWidth: '1240px' }}>
        {/* Section Heading */}
        <div style={{ maxWidth: '800px', marginBottom: '56px' }}>
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
              <span className="reveal-word inline-block">The </span>
              <span className="reveal-word inline-block">numbers </span>
              <span className="reveal-word inline-block">behind </span>
            </span>
            <span style={{ color: '#6B6A66' }}>
              <span className="reveal-word inline-block">the </span>
              <span className="reveal-word inline-block">craft.</span>
            </span>
          </h2>
          <p style={{ fontSize: '16px', color: '#6B6A66', margin: 0 }}>
            Every interaction is measured to guarantee speed, consistency, and high-velocity conversion.
          </p>
        </div>

        {/* 4 Large Studio Stat Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
          }}
        >
          {stats.map((s, idx) => (
            <div key={idx} className="cm-stat-card">
              <div className="cm-stat-number">{s.num}</div>
              <h3
                style={{
                  fontFamily: 'var(--cm-font-heading, Poppins)',
                  fontSize: '17px',
                  fontWeight: 600,
                  color: '#161722',
                  margin: '16px 0 8px 0',
                }}
              >
                {s.label}
              </h3>
              <p style={{ fontSize: '13.5px', color: '#6B6A66', lineHeight: 1.6, margin: 0 }}>
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default StudioStatsSection
