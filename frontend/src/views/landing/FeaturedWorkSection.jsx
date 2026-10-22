import React, { useState } from 'react'

export const FeaturedWorkSection = () => {
  const [activeProject, setActiveProject] = useState(0)

  const projects = [
    {
      num: '01',
      title: 'GT-Five Sales Suite',
      category: 'Lead Pipeline',
      url: 'gtfive.clientmark.io',
      desc: 'A high-velocity telecaller and distribution system for a premium electrical switch brand across 12 regional distributor hubs.',
      mockupData: {
        stage: 'Proposal Sent',
        leadName: 'Rajesh Sharma (Apex Infra)',
        value: '₹14,50,000',
        rep: 'Priya K. (BDE)',
        nextFollowUp: 'Today, 4:30 PM (WhatsApp)',
        progress: 75,
      },
    },
    {
      num: '02',
      title: 'TradePilot Deliverables',
      category: 'AI Platform',
      url: 'tradepilot.clientmark.io',
      desc: 'Automated deal handover engine for an AI trading copilot team, synchronizing Pine Script delivery milestones with developer task boards.',
      mockupData: {
        stage: 'In Milestone Delivery',
        leadName: 'CryptoAlpha Fund Singapore',
        value: '₹32,00,000',
        rep: 'Sameer V. (Tech Lead)',
        nextFollowUp: 'Sprint Review on Friday',
        progress: 90,
      },
    },
    {
      num: '03',
      title: 'GoFast Courier CRM',
      category: 'Operations & Fleet',
      url: 'gofast.clientmark.io',
      desc: 'Intra-city corporate delivery dispatch CRM with live WhatsApp booking confirmations and automated invoicing pipelines.',
      mockupData: {
        stage: 'Active Contract',
        leadName: 'BlinkLogistics Pvt Ltd',
        value: '₹8,20,000 / mo',
        rep: 'Ankit R. (Operations)',
        nextFollowUp: 'Fleet SLA Audit tomorrow',
        progress: 60,
      },
    },
    {
      num: '04',
      title: 'Tamara Studios Booking',
      category: 'Studio Spaces',
      url: 'tamarastudios.clientmark.io',
      desc: 'Multi-studio hourly booking tracker and lead reservation funnel for audio, podcast, and video production spaces in Bangalore.',
      mockupData: {
        stage: 'Confirmed Booking',
        leadName: 'WaveSound Media Network',
        value: '₹4,75,000',
        rep: 'Sunita M. (Studio Lead)',
        nextFollowUp: 'Equipment Checklist Signoff',
        progress: 100,
      },
    },
    {
      num: '05',
      title: 'LawClk Legal Practice',
      category: 'Legal SaaS',
      url: 'lawclk.clientmark.io',
      desc: 'Boutique dispute advisory CRM managing confidential document vault links, retainer invoicing, and hearing calendar deadlines.',
      mockupData: {
        stage: 'Retainer Retained',
        leadName: 'Harbor Capital Partners',
        value: '₹18,00,000 / yr',
        rep: 'Vikram J. (Partner)',
        nextFollowUp: 'Quarterly Audit Review',
        progress: 85,
      },
    },
    {
      num: '06',
      title: 'Mirchi35 Cloud Kitchens',
      category: 'F&B Franchise',
      url: 'mirchi35.clientmark.io',
      desc: 'Franchise inquiry management system routing incoming area developer leads with automated P&L prospectus links.',
      mockupData: {
        stage: 'Location Scouted',
        leadName: 'Kalyani Food Ventures',
        value: '₹25,00,000',
        rep: 'Priya K. (Expansion)',
        nextFollowUp: 'Draft Franchise Agreement',
        progress: 70,
      },
    },
    {
      num: '07',
      title: 'AskVerb Voice Copilot',
      category: 'Voice AI Systems',
      url: 'askverb.clientmark.io',
      desc: 'Inbound telecaller AI assistant converting call logs into structured CRM tickets with automatic sentiment categorization.',
      mockupData: {
        stage: 'Integration Live',
        leadName: 'Nova Telecom Global',
        value: '₹12,40,000',
        rep: 'Dev Lead (API Ops)',
        nextFollowUp: 'SIP Trunking Benchmarks',
        progress: 95,
      },
    },
    {
      num: '08',
      title: 'eMenu Hospitality OS',
      category: 'Restaurant Tech',
      url: 'emenu.clientmark.io',
      desc: 'QR-table ordering CRM managing 400+ restaurant partner renewals, hardware shipments, and POS webhook syncs.',
      mockupData: {
        stage: 'Live Rollout',
        leadName: 'The Royal Bistro Chain',
        value: '₹6,80,000',
        rep: 'Rohan P. (Success)',
        nextFollowUp: 'Hardware Dispatch to 8 Units',
        progress: 80,
      },
    },
  ]

  const curr = projects[activeProject]

  return (
    <section
      id="work"
      style={{
        padding: '90px 0 110px',
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
              <span className="reveal-word inline-block">Featured </span>
            </span>
            <span style={{ color: '#6B6A66' }}>
              <span className="reveal-word inline-block">work.</span>
            </span>
          </h2>
          <p style={{ fontSize: '16px', color: '#6B6A66', margin: 0 }}>
            Real sales architectures and deliverable engines deployed for modern teams.
          </p>
        </div>

        {/* 2-Column Layout: Accordion List + Studio Browser Frame */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(320px, 460px) minmax(0, 1fr)',
            gap: '48px',
            alignItems: 'start',
          }}
          className="cm-work-grid"
        >
          {/* Left: Project List */}
          <div>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {projects.map((p, idx) => {
                const isActive = activeProject === idx
                return (
                  <li
                    key={p.num}
                    className={`cm-work-item ${isActive ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="cm-work-btn"
                      onClick={() => setActiveProject(idx)}
                    >
                      <span className="cm-work-num">{p.num}</span>
                      <span className="cm-work-name">{p.title}</span>
                      <span className="cm-work-tag">{p.category}</span>
                    </button>

                    {isActive && (
                      <div
                        style={{
                          padding: '0 0 18px 40px',
                          color: '#6B6A66',
                          fontSize: '13.5px',
                          lineHeight: 1.6,
                        }}
                      >
                        <p style={{ margin: 0 }}>{p.desc}</p>
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>

          {/* Right: Studio Browser Frame */}
          <div className="cm-browser-frame">
            <div className="cm-browser-header">
              <div className="cm-browser-dots">
                <span className="cm-browser-dot" style={{ background: '#EE6A5F' }} />
                <span className="cm-browser-dot" style={{ background: '#F5BD4F' }} />
                <span className="cm-browser-dot" style={{ background: '#61C454' }} />
              </div>

              <div className="cm-browser-url">
                <span>🔒</span>
                <span>{curr.url}</span>
              </div>

              <div style={{ width: '40px' }} />
            </div>

            {/* Inner Dashboard Live Surface */}
            <div style={{ padding: '32px', background: '#FFFFFF' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                  paddingBottom: '20px',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#E05E3A', fontWeight: 700 }}>
                    Active Client Record
                  </span>
                  <h4 style={{ margin: '4px 0 0', fontSize: '21px', color: '#161722', fontWeight: 600 }}>
                    {curr.mockupData.leadName}
                  </h4>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#6B6A66', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Contract Value
                  </span>
                  <div style={{ fontSize: '20px', color: '#161722', fontWeight: 700, fontFamily: 'var(--cm-font-heading)' }}>
                    {curr.mockupData.value}
                  </div>
                </div>
              </div>

              {/* Status Row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '14px',
                  marginBottom: '26px',
                }}
              >
                <div style={{ background: '#F8F8FA', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#6B6A66' }}>Stage</div>
                  <div style={{ fontSize: '13.5px', color: '#0284C7', fontWeight: 600, marginTop: '2px' }}>
                    {curr.mockupData.stage}
                  </div>
                </div>

                <div style={{ background: '#F8F8FA', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#6B6A66' }}>Owner</div>
                  <div style={{ fontSize: '13.5px', color: '#161722', fontWeight: 600, marginTop: '2px' }}>
                    {curr.mockupData.rep}
                  </div>
                </div>

                <div style={{ background: '#F8F8FA', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
                  <div style={{ fontSize: '11px', color: '#6B6A66' }}>Next Touchpoint</div>
                  <div style={{ fontSize: '13.5px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                    {curr.mockupData.nextFollowUp}
                  </div>
                </div>
              </div>

              {/* Progress & Milestone Overview */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '8px' }}>
                  <span style={{ color: '#6B6A66', fontWeight: 500 }}>Contract Handover Progress</span>
                  <span style={{ color: '#161722', fontWeight: 700 }}>{curr.mockupData.progress}%</span>
                </div>
                <div style={{ height: '8px', background: '#F0F0F3', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${curr.mockupData.progress}%`,
                      background: 'linear-gradient(90deg, #E05E3A 0%, #F59E0B 100%)',
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturedWorkSection
