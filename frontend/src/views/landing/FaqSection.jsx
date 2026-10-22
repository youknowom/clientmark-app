import React, { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

export const FaqSection = () => {
  const [openIdx, setOpenIdx] = useState(0)

  const faqs = [
    {
      q: 'What is Clientmark?',
      a: 'Clientmark is a unified CRM product built for agency founders, high-volume sales teams, and delivery managers. It connects lead intake, telecaller call logs, and WhatsApp communication directly into tracked project milestones without requiring multiple disconnected tools.',
    },
    {
      q: 'How does the WhatsApp automation work?',
      a: 'Clientmark integrates directly with WhatsApp messaging. You can trigger quotations, follow-up reminders, and meeting booking links directly from any lead card with 1 click, eliminating the need to type numbers manually on a phone.',
    },
    {
      q: 'Can our clients track their project without seeing internal chats?',
      a: 'Yes. Clientmark generates a branded, read-only preview URL for every project. Clients can view milestone percentages, completed deliverables, and next launch dates without ever seeing internal sales margin notes or telecaller logs.',
    },
    {
      q: 'How is data partitioned between different tenants and companies?',
      a: 'Every organization is isolated at the database level with strict multi-tenant boundaries. Telecallers and team members only ever access records belonging to their authenticated workspace.',
    },
    {
      q: 'Is there a setup fee or lock-in contract?',
      a: 'No. Every new organization starts with a 14-day free trial with full access. You can upgrade, downgrade, or cancel your subscription at any time directly from the billing settings page.',
    },
  ]

  return (
    <section
      id="faq"
      style={{
        padding: '90px 0 110px',
        backgroundColor: '#F5F5F7',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className="cm-container" style={{ maxWidth: '920px' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2
            style={{
              fontFamily: 'var(--cm-font-heading, Poppins)',
              fontSize: 'clamp(2.4rem, 4.5vw, 4rem)',
              fontWeight: 500,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              margin: '0 0 14px 0',
            }}
          >
            <span style={{ color: '#161722' }}>Frequently </span>
            <span style={{ color: '#6B6A66' }}>asked questions.</span>
          </h2>
          <p style={{ fontSize: '16px', color: '#6B6A66', margin: 0 }}>
            Everything you need to know about switching your team to Clientmark.
          </p>
        </div>

        {/* Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx
            return (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${isOpen ? 'rgba(0, 0, 0, 0.14)' : 'rgba(0, 0, 0, 0.06)'}`,
                  borderRadius: '16px',
                  padding: '24px 28px',
                  boxShadow: isOpen ? '0 8px 24px -4px rgba(22, 23, 34, 0.06)' : '0 1px 3px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'pointer',
                }}
                onClick={() => setOpenIdx(isOpen ? -1 : idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--cm-font-heading, Poppins)',
                      fontSize: '17.5px',
                      fontWeight: 600,
                      color: isOpen ? '#161722' : '#2D2E3E',
                      margin: 0,
                    }}
                  >
                    {faq.q}
                  </h3>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isOpen ? '#161722' : '#F0F0F3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isOpen ? '#FFFFFF' : '#161722',
                      flexShrink: 0,
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                  </div>
                </div>

                {isOpen && (
                  <p
                    style={{
                      fontSize: '14.5px',
                      color: '#6B6A66',
                      lineHeight: 1.65,
                      marginTop: '16px',
                      marginBottom: 0,
                    }}
                  >
                    {faq.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default FaqSection
