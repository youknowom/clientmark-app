import React from 'react'
import {
  Kanban,
  MessageSquare,
  FolderSync,
  PhoneCall,
  ShieldCheck,
  Globe,
  ArrowUpRight,
} from 'lucide-react'

export const FeatureBentoGrid = () => {
  const services = [
    {
      num: '01',
      title: 'Lead Pipeline Architecture',
      desc: 'Capture, route and qualify inquiries across webhooks, ads, and spreadsheets with zero manual note sprawl.',
      icon: <Kanban size={26} color="#E05E3A" />,
      tag: 'Pipeline',
    },
    {
      num: '02',
      title: 'WhatsApp Automation Systems',
      desc: 'Send verified quotations, meeting links, and updates directly from lead cards using automated templates.',
      icon: <MessageSquare size={26} color="#10B981" />,
      tag: 'Outreach',
    },
    {
      num: '03',
      title: '1-Click Deal to Delivery',
      desc: 'When contracts close, automatically spin up structured project boards with defined milestones and assignments.',
      icon: <FolderSync size={26} color="#6366F1" />,
      tag: 'Handover',
    },
    {
      num: '04',
      title: 'Telecaller Quotas & Dials',
      desc: 'Single-click dialing, call logs, automated follow-up cadences, and daily quota meters driving real accountability.',
      icon: <PhoneCall size={26} color="#EC4899" />,
      tag: 'Productivity',
    },
    {
      num: '05',
      title: 'Granular RBAC Security',
      desc: 'Strict multi-tier data partitioning: Telecallers, BDEs, and Developers only access their allocated surfaces.',
      icon: <ShieldCheck size={26} color="#06B6D4" />,
      tag: 'Security',
    },
    {
      num: '06',
      title: 'Branded Milestone Portals',
      desc: 'Live, read-only preview URLs for clients to review deliverable status in real time with custom branding.',
      icon: <Globe size={26} color="#F97316" />,
      tag: 'Portals',
    },
  ]

  return (
    <section
      id="services"
      style={{
        padding: '90px 0 100px',
        backgroundColor: '#F5F5F7',
      }}
    >
      <div className="cm-container" style={{ maxWidth: '1200px' }}>
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
              <span className="reveal-word inline-block">What </span>
              <span className="reveal-word inline-block">we </span>
            </span>
            <span style={{ color: '#6B6A66' }}>
              <span className="reveal-word inline-block">build.</span>
            </span>
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: '#6B6A66',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Six core CRM subsystems engineered for teams who refuse to drop leads or miss project deadlines.
          </p>
        </div>

        {/* 6-Card Studio Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {services.map((item) => (
            <div
              key={item.num}
              className="cm-card-3d"
              style={{
                padding: '34px 30px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '270px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '28px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: '#F5F5F7',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--cm-font-mono, monospace)',
                      fontSize: '12.5px',
                      color: '#8D8D96',
                      letterSpacing: '0.05em',
                      fontWeight: 600,
                    }}
                  >
                    {item.num}
                  </span>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--cm-font-heading, Poppins)',
                    fontSize: '21px',
                    fontWeight: 600,
                    color: '#161722',
                    margin: '0 0 12px 0',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {item.title}
                </h3>

                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: '#6B6A66',
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </div>

              {/* Card Footer Tag */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '20px',
                  borderTop: '1px solid rgba(0, 0, 0, 0.06)',
                  marginTop: '24px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#8D8D96',
                    fontWeight: 600,
                  }}
                >
                  {item.tag}
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12.5px',
                    color: '#161722',
                    fontWeight: 500,
                  }}
                >
                  <span>Explore</span>
                  <ArrowUpRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeatureBentoGrid
