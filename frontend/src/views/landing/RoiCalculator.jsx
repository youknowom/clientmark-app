import React, { useState } from 'react'
import { Calculator, TrendingUp, Clock, DollarSign } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

export const RoiCalculator = () => {
  const [leadsPerMonth, setLeadsPerMonth] = useState(600)
  const [dealValue, setDealValue] = useState(50000)
  const [teamSize, setTeamSize] = useState(5)

  // Calculations
  const conversionBoostPercent = 0.18 // 18% improvement with sub-5m speed to lead
  const baselineWonDeals = Math.round(leadsPerMonth * 0.08)
  const boostedWonDeals = Math.round(leadsPerMonth * (0.08 * (1 + conversionBoostPercent)))
  const extraDeals = boostedWonDeals - baselineWonDeals
  const extraRevenue = extraDeals * dealValue
  const hoursSaved = teamSize * 16 // 16 hours saved per rep per month

  return (
    <section id="roi" style={{ padding: '90px 0', backgroundColor: 'var(--cm-bg-canvas)' }}>
      <div className="cm-container">
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 50px' }}>
          <Badge variant="brand" style={{ marginBottom: '12px' }}>Interactive ROI Estimator</Badge>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              color: 'var(--cm-text-primary)',
              margin: '0 0 16px 0',
            }}
          >
            Calculate how much revenue speed-to-lead unlocks for your team.
          </h2>
          <p style={{ fontSize: 'var(--cm-text-md)', color: 'var(--cm-text-secondary)', lineHeight: 1.6 }}>
            Adjust the sliders below based on your current lead volume and average deal size.
          </p>
        </div>

        <div className="cm-grid cm-grid-cols-2 cm-gap-8" style={{ alignItems: 'center' }}>
          {/* Sliders Card */}
          <Card
            style={{
              padding: '36px',
              borderRadius: 'var(--cm-radius-xl)',
              backgroundColor: 'var(--cm-bg-card)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
              Your Agency Parameters
            </h3>

            {/* Slider 1: Monthly Leads */}
            <div style={{ marginBottom: '24px' }}>
              <div className="cm-flex cm-items-center cm-justify-between" style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cm-text-secondary)' }}>
                  Monthly Inbound Leads
                </label>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--cm-brand-500)' }}>
                  {leadsPerMonth.toLocaleString()} leads
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={leadsPerMonth}
                onChange={(e) => setLeadsPerMonth(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cm-brand-500)', cursor: 'pointer' }}
              />
            </div>

            {/* Slider 2: Average Deal Value */}
            <div style={{ marginBottom: '24px' }}>
              <div className="cm-flex cm-items-center cm-justify-between" style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cm-text-secondary)' }}>
                  Average Deal Value (₹)
                </label>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--cm-brand-500)' }}>
                  ₹{dealValue.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="500000"
                step="5000"
                value={dealValue}
                onChange={(e) => setDealValue(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cm-brand-500)', cursor: 'pointer' }}
              />
            </div>

            {/* Slider 3: Team Size */}
            <div style={{ marginBottom: '10px' }}>
              <div className="cm-flex cm-items-center cm-justify-between" style={{ marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cm-text-secondary)' }}>
                  Telecallers & BDEs
                </label>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--cm-brand-500)' }}>
                  {teamSize} Reps
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="40"
                step="1"
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cm-brand-500)', cursor: 'pointer' }}
              />
            </div>
          </Card>

          {/* Results Summary Card */}
          <div
            style={{
              padding: '36px',
              borderRadius: 'var(--cm-radius-xl)',
              background: 'linear-gradient(135deg, var(--cm-slate-900) 0%, #1E293B 100%)',
              color: '#FFFFFF',
              boxShadow: 'var(--cm-shadow-xl)',
            }}
          >
            <div className="cm-flex cm-items-center cm-gap-2" style={{ marginBottom: '20px' }}>
              <TrendingUp size={20} color="var(--cm-brand-500)" />
              <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cm-brand-300)' }}>
                Estimated Monthly Impact
              </span>
            </div>

            {/* Metric 1: Revenue Gain */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: '#94A3B8' }}>Projected Additional Revenue / Month</div>
              <div
                style={{
                  fontFamily: 'var(--cm-font-heading)',
                  fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-0.03em',
                  marginTop: '4px',
                }}
              >
                +₹{extraRevenue.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
                Based on +{extraDeals} extra won deals from rapid 5-min callbacks
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />

            {/* Metric 2: Hours Saved */}
            <div className="cm-grid cm-grid-cols-2 cm-gap-4">
              <div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Admin Hours Saved</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {hoursSaved} hrs/mo
                </div>
                <div style={{ fontSize: '11px', color: '#CBD5E1' }}>No double entry</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Expected ROI Multiple</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--cm-brand-300)', marginTop: '2px' }}>
                  {Math.max(12, Math.round(extraRevenue / 2999))}x
                </div>
                <div style={{ fontSize: '11px', color: '#CBD5E1' }}>Vs Professional Plan</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default RoiCalculator
