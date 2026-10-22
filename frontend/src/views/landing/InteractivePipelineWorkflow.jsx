import React, { useState } from 'react'
import { ArrowRight, PhoneIncoming, FileCheck2, Rocket, CheckCircle } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'

export const InteractivePipelineWorkflow = () => {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      num: '01',
      title: 'Inquiry & Rapid Telecall',
      highlight: 'Speed-to-Lead in < 5 Mins',
      desc: 'Leads enter Clientmark via webhooks, forms, or APIs. Round-robin immediately alerts the telecaller on shift. With 1 click, reps dial the prospect and log call outcomes with zero manual note sprawl.',
      icon: <PhoneIncoming size={24} />,
      kpi: '4.2x higher lead qualification rate',
    },
    {
      num: '02',
      title: 'WhatsApp Follow-Up & Won Deal',
      highlight: 'Close Without Leaving CRM',
      desc: 'Send verified WhatsApp message templates with quotations and meeting links. Real-time stage tracking advances the lead through Proposal, Follow-up, and finally into Closed-Won.',
      icon: <FileCheck2 size={24} />,
      kpi: '68% faster proposal signoffs',
    },
    {
      num: '03',
      title: 'Instant Handover & Milestones',
      highlight: 'Zero Data Re-Entry',
      desc: 'Winning a deal automatically generates the client project. Scope of work, deliverables, deadlines, and assigned developers are immediately aligned. Share the live preview link with the client.',
      icon: <Rocket size={24} />,
      kpi: '100% handover accuracy',
    },
  ]

  return (
    <section id="workflow" style={{ padding: '90px 0', backgroundColor: 'var(--cm-bg-subtle)' }}>
      <div className="cm-container">
        {/* Section Heading */}
        <div style={{ textAlign: 'center', maxWidth: '740px', margin: '0 auto 50px' }}>
          <Badge variant="brand" style={{ marginBottom: '12px' }}>The Clientmark Loop</Badge>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              color: 'var(--cm-text-primary)',
              margin: '0 0 16px 0',
            }}
          >
            From the first phone ring to the final project deliverable.
          </h2>
          <p style={{ fontSize: 'var(--cm-text-md)', color: 'var(--cm-text-secondary)', lineHeight: 1.6 }}>
            Most agencies lose clients during the chaotic handoff between sales reps and project managers. Clientmark makes that handover instant and automated.
          </p>
        </div>

        {/* 3 Steps Cards */}
        <div className="cm-grid cm-grid-cols-3 cm-gap-6">
          {steps.map((s, idx) => (
            <Card
              key={idx}
              onClick={() => setActiveStep(idx)}
              interactive
              style={{
                padding: '32px 28px',
                borderRadius: 'var(--cm-radius-xl)',
                backgroundColor: 'var(--cm-bg-card)',
                border: activeStep === idx ? '2px solid var(--cm-brand-500)' : '1px solid var(--cm-border-default)',
                boxShadow: activeStep === idx ? 'var(--cm-shadow-md)' : 'var(--cm-shadow-xs)',
                position: 'relative',
              }}
            >
              <div className="cm-flex cm-items-center cm-justify-between" style={{ marginBottom: '20px' }}>
                <span
                  style={{
                    fontFamily: 'var(--cm-font-heading)',
                    fontSize: '28px',
                    fontWeight: 800,
                    color: activeStep === idx ? 'var(--cm-brand-500)' : 'var(--cm-text-muted)',
                  }}
                >
                  {s.num}
                </span>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--cm-radius-md)',
                    backgroundColor: activeStep === idx ? 'var(--cm-brand-50)' : 'var(--cm-bg-subtle)',
                    color: activeStep === idx ? 'var(--cm-brand-500)' : 'var(--cm-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {s.icon}
                </div>
              </div>

              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--cm-brand-500)',
                  marginBottom: '6px',
                }}
              >
                {s.highlight}
              </div>

              <h3
                style={{
                  fontSize: 'var(--cm-text-xl)',
                  fontWeight: 700,
                  color: 'var(--cm-text-primary)',
                  marginBottom: '12px',
                }}
              >
                {s.title}
              </h3>

              <p
                style={{
                  fontSize: 'var(--cm-text-sm)',
                  color: 'var(--cm-text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '20px',
                }}
              >
                {s.desc}
              </p>

              <div
                className="cm-flex cm-items-center cm-gap-2"
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--cm-bg-subtle)',
                  borderRadius: 'var(--cm-radius-md)',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--cm-success-600)',
                }}
              >
                <CheckCircle size={15} />
                <span>{s.kpi}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export default InteractivePipelineWorkflow
