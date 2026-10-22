import React, { useState, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import {
  Users,
  FolderKanban,
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  PhoneCall,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '../../components/ui/Badge'

gsap.registerPlugin(useGSAP)

export const InteractiveMockup = () => {
  const [activeTab, setActiveTab] = useState('pipeline') // 'pipeline' | 'delivery' | 'portal'
  const [selectedLeadId, setSelectedLeadId] = useState(1)
  const tabContentRef = useRef(null)

  useGSAP(
    () => {
      if (!tabContentRef.current) return
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) return

      gsap.fromTo(
        tabContentRef.current,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out', clearProps: 'transform' },
      )
    },
    {
      scope: tabContentRef,
      dependencies: [activeTab],
      revertOnUpdate: true,
    },
  )

  const mockLeads = [
    {
      id: 1,
      name: 'TechCorp Pvt Ltd',
      contact: 'Arjun Mehta (VP Tech)',
      value: '₹3,40,000',
      rep: 'Priya S.',
      stage: 'Won',
      variant: 'success',
      score: '96/100',
      speed: '4m callback',
    },
    {
      id: 2,
      name: 'Apex Solutions',
      contact: 'Kavita Rao (Founder)',
      value: '₹1,85,000',
      rep: 'Rohan P.',
      stage: 'Negotiation',
      variant: 'warning',
      score: '84/100',
      speed: '12m callback',
    },
    {
      id: 3,
      name: 'Zenith Logistics Global',
      contact: 'Vikram Joshi (COO)',
      value: '₹5,20,000',
      rep: 'Sunita M.',
      stage: 'Proposal Sent',
      variant: 'info',
      score: '78/100',
      speed: '8m callback',
    },
    {
      id: 4,
      name: 'Omega Cloud Systems',
      contact: 'Rahul Nair (Director)',
      value: '₹2,60,000',
      rep: 'Priya S.',
      stage: 'Telecalling',
      variant: 'brand',
      score: '91/100',
      speed: '1m callback',
    },
  ]

  const mockMilestones = [
    { title: 'Discovery & UX Architecture', progress: 100, status: 'Completed', owner: 'Dev Lead' },
    { title: 'Core API & Database Setup', progress: 100, status: 'Completed', owner: 'Backend' },
    { title: 'Payment Gateways & Webhooks', progress: 85, status: 'In Review', owner: 'Fullstack' },
    { title: 'Client UAT & Signoff', progress: 40, status: 'In Progress', owner: 'PM' },
  ]

  return (
    <div
      className="cm-mockup-wrapper"
      style={{
        position: 'relative',
        borderRadius: '20px',
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 24px 60px -12px rgba(22, 23, 34, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        textAlign: 'left',
      }}
    >
      {/* Top Window Bar (Clean Chrome style) */}
      <div
        className="cm-flex cm-items-center cm-justify-between"
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          backgroundColor: '#F7F7FA',
        }}
      >
        {/* Window controls */}
        <div className="cm-flex cm-items-center cm-gap-2">
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 500,
              color: '#6B6A66',
              marginLeft: '10px',
              fontFamily: 'var(--cm-font-mono, monospace)',
            }}
          >
            clientmark.app/workspace/acme-agency
          </span>
        </div>

        {/* Tab switcher */}
        <div className="cm-flex cm-items-center cm-gap-1">
          {[
            { id: 'pipeline', label: '1. Lead Pipeline', icon: <Users size={13} /> },
            { id: 'delivery', label: '2. Project Milestones', icon: <FolderKanban size={13} /> },
            { id: 'portal', label: '3. Client Preview Portal', icon: <ExternalLink size={13} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '9999px',
                backgroundColor: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                color: activeTab === tab.id ? '#161722' : '#6B6A66',
                boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0, 0, 0, 0.08)' : 'none',
                border: activeTab === tab.id ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Mockup Body */}
      <div style={{ padding: '24px 28px', backgroundColor: '#FFFFFF' }}>
        {/* Live Metric Tickers */}
        <div
          className="cm-grid cm-grid-cols-4 cm-gap-3"
          style={{ marginBottom: '22px' }}
        >
          <div style={{ background: '#F8F8FA', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <div style={{ fontSize: '11px', color: '#6B6A66', fontWeight: 600, letterSpacing: '0.04em' }}>PIPELINE VALUE</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#161722', marginTop: '4px', fontFamily: 'var(--cm-font-heading)' }}>
              ₹13,05,000
            </div>
            <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
              +28% vs last month
            </div>
          </div>

          <div style={{ background: '#F8F8FA', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <div style={{ fontSize: '11px', color: '#6B6A66', fontWeight: 600, letterSpacing: '0.04em' }}>SPEED TO FIRST CALL</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#E05E3A', marginTop: '4px', fontFamily: 'var(--cm-font-heading)' }}>
              3.8 Minutes
            </div>
            <div style={{ fontSize: '11px', color: '#6B6A66', marginTop: '2px' }}>
              Target: &lt; 5 mins
            </div>
          </div>

          <div style={{ background: '#F8F8FA', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <div style={{ fontSize: '11px', color: '#6B6A66', fontWeight: 600, letterSpacing: '0.04em' }}>CONVERSION TO WON</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669', marginTop: '4px', fontFamily: 'var(--cm-font-heading)' }}>
              38.4%
            </div>
            <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px', fontWeight: 600 }}>
              Tier-1 Benchmark
            </div>
          </div>

          <div style={{ background: '#F8F8FA', padding: '14px 16px', borderRadius: '12px', border: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <div style={{ fontSize: '11px', color: '#6B6A66', fontWeight: 600, letterSpacing: '0.04em' }}>ON-TIME DELIVERY</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#161722', marginTop: '4px', fontFamily: 'var(--cm-font-heading)' }}>
              98.2%
            </div>
            <div style={{ fontSize: '11px', color: '#6B6A66', marginTop: '2px' }}>
              24 Active Milestones
            </div>
          </div>
        </div>

        {/* Tab Content Container with GSAP motion */}
        <div ref={tabContentRef}>
          {/* Tab 1: Lead Pipeline & Speed to Lead */}
          {activeTab === 'pipeline' && (
            <div>
            <div className="cm-flex cm-items-center cm-justify-between" style={{ marginBottom: '14px' }}>
              <div className="cm-flex cm-items-center cm-gap-2">
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: '#161722' }}>Priority Lead Queue</h4>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(224, 94, 58, 0.1)', color: '#E05E3A', fontWeight: 600 }}>
                  ● 4 Live Leads
                </span>
              </div>
              <div className="cm-flex cm-items-center cm-gap-2">
                <span style={{ fontSize: '11px', color: '#8D8D96' }}>Auto-assigned by Round Robin</span>
              </div>
            </div>

            <div style={{ border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', overflow: 'hidden' }}>
              {mockLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className="cm-flex cm-items-center cm-justify-between"
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                    backgroundColor: selectedLeadId === lead.id ? 'rgba(224, 94, 58, 0.04)' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease',
                  }}
                >
                  <div className="cm-flex cm-items-center cm-gap-3" style={{ flex: 1.5 }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        backgroundColor: '#F0F0F4',
                        color: '#161722',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      {lead.name.substring(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#161722' }}>
                        {lead.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#6B6A66' }}>
                        {lead.contact}
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#161722' }}>{lead.value}</div>
                    <div style={{ fontSize: '11px', color: '#8D8D96' }}>Deal Budget</div>
                  </div>

                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '12.5px', color: '#161722', fontWeight: 500 }}>{lead.rep}</div>
                    <div style={{ fontSize: '11px', color: '#8D8D96' }}>Assigned Rep</div>
                  </div>

                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: '#F0FDF4', color: '#15803D', fontWeight: 600 }}>
                      {lead.stage}
                    </span>
                  </div>

                  <div className="cm-flex cm-items-center cm-gap-2">
                    <button
                      type="button"
                      style={{
                        background: '#161722',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '5px 12px',
                        fontSize: '11.5px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <MessageSquare size={12} />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Project Milestones */}
        {activeTab === 'delivery' && (
          <div style={{ animation: 'cm-fade-in 200ms ease-out' }}>
            <div className="cm-flex cm-items-center cm-justify-between" style={{ marginBottom: '14px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: '#161722' }}>Active Deliverables & Milestones</h4>
                <div style={{ fontSize: '11.5px', color: '#6B6A66' }}>Connected to Won Contract #CM-2026-981</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mockMilestones.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    background: '#F8F8FA',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1.5 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#161722' }}>{m.title}</div>
                    <div style={{ fontSize: '11px', color: '#6B6A66', marginTop: '2px' }}>Assigned: {m.owner}</div>
                  </div>

                  <div style={{ flex: 1, padding: '0 16px' }}>
                    <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${m.progress}%`,
                          height: '100%',
                          background: m.progress === 100 ? '#10B981' : '#E05E3A',
                          borderRadius: '9999px',
                        }}
                      />
                    </div>
                  </div>

                  <span style={{ fontSize: '11px', fontWeight: 600, color: m.progress === 100 ? '#10B981' : '#E05E3A' }}>
                    {m.progress}% • {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Client Preview Portal */}
        {activeTab === 'portal' && (
          <div style={{ animation: 'cm-fade-in 200ms ease-out', padding: '10px 0' }}>
            <div style={{ background: '#F8F8FA', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#E05E3A', fontWeight: 700 }}>
                    Branded Live Client Portal
                  </span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '18px', color: '#161722', fontWeight: 600 }}>
                    Acme Agency ✕ TechCorp Delivery Hub
                  </h3>
                </div>
                <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: '9999px', fontWeight: 600 }}>
                  ● 3 of 4 Milestones Complete
                </span>
              </div>
              <p style={{ fontSize: '13.5px', color: '#6B6A66', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                Your clients receive a zero-login, secure URL to review milestone progress, download deliverables, and inspect invoice clearances in real time.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default InteractiveMockup
