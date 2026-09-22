import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import apiClient from '../api/axiosClient'
import '../views/sidebarCSS/onboarding.css'

const ROLES = [
  { id: 'founder', label: 'Business Owner / Founder', desc: 'Overseeing all business development and operations' },
  { id: 'sales_manager', label: 'Sales Manager / Team Lead', desc: 'Managing telecallers, BDEs, and deal pipelines' },
  { id: 'bde', label: 'Business Development Executive (BDE)', desc: 'Prospecting, converting, and closing leads' },
  { id: 'operations', label: 'Operations / Delivery Manager', desc: 'Managing client projects, timelines, and deliverables' },
  { id: 'developer', label: 'Developer / Technical Lead', desc: 'Executing project tasks and milestone deliverables' },
]

const TEAM_SIZES = [
  { id: '1', label: 'Just me (Solo entrepreneur)' },
  { id: '2-5', label: '2 – 5 team members' },
  { id: '6-15', label: '6 – 15 team members' },
  { id: '16-50', label: '16 – 50 team members' },
  { id: '50+', label: '50+ team members (Enterprise)' },
]

const USE_CASES = [
  { id: 'leads', label: 'Lead Capture & Sales Pipeline', desc: 'Track prospects from initial inquiry to closed won' },
  { id: 'telecalling', label: 'Telecaller & Call Tracking', desc: 'Assign calls, dial clients, and record notes' },
  { id: 'projects', label: 'Project Delivery & Milestones', desc: 'Manage project stages, tasks, and client share links' },
  { id: 'whatsapp', label: 'WhatsApp Client Updates', desc: 'Automated follow-ups, OTP verifications, and notifications' },
  { id: 'reporting', label: 'Team Analytics & Reports', desc: 'Conversion rates, caller metrics, and revenue velocity' },
]

const INDUSTRIES = [
  'IT Services / Software Development',
  'Digital Marketing / SEO Agency',
  'Real Estate & Construction',
  'Education & EdTech',
  'E-Commerce & Retail',
  'Healthcare & Life Sciences',
  'Financial Services & Consulting',
  'Other Business Services',
]

const CURRENT_TOOLS = [
  'Spreadsheets (Excel / Google Sheets)',
  'Another CRM (HubSpot, Zoho, Salesforce)',
  'Pen & paper / WhatsApp groups',
  'Nothing yet — starting fresh',
]

const COLOR_PRESETS = [
  { hex: '#E05E3A', name: 'Terracotta Orange' },
  { hex: '#6366F1', name: 'Royal Indigo' },
  { hex: '#059669', name: 'Emerald' },
  { hex: '#0284C7', name: 'Ocean Blue' },
  { hex: '#7C3AED', name: 'Violet' },
  { hex: '#1E293B', name: 'Midnight Slate' },
]

const OnboardingWizard = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 6
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    ownerRole: 'Business Owner / Founder',
    teamSize: '2 – 5 team members',
    primaryUseCases: ['Lead Capture & Sales Pipeline', 'WhatsApp Client Updates'],
    industry: 'IT Services / Software Development',
    currentTools: 'Spreadsheets (Excel / Google Sheets)',
    brandColor: '#E05E3A',
  })

  if (!isOpen) return null

  const toggleUseCase = (label) => {
    setFormData((prev) => {
      const exists = prev.primaryUseCases.includes(label)
      if (exists) {
        return {
          ...prev,
          primaryUseCases: prev.primaryUseCases.filter((item) => item !== label),
        }
      } else {
        return {
          ...prev,
          primaryUseCases: [...prev.primaryUseCases, label],
        }
      }
    })
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    } else {
      submitOnboarding()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSkip = async () => {
    try {
      await apiClient.post('/onboarding/skip')
      toast.success('You can customize settings anytime from the sidebar!')
      onClose()
      if (onComplete) onComplete()
    } catch {
      onClose()
    }
  }

  const submitOnboarding = async () => {
    setSaving(true)
    try {
      await apiClient.post('/onboarding/complete', formData)
      toast.success('Workspace customized! Welcome to Clientmark.')
      onClose()
      if (onComplete) onComplete(formData)
    } catch {
      toast.error('Failed to save preferences, but your workspace is ready.')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100

  return (
    <div className="onboarding-overlay">
      <motion.div
        className="onboarding-card"
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* ── Top Header ────────────────────────────────────────────── */}
        <div className="onboarding-header">
          <div className="onboarding-brand">
            <div className="onboarding-brand-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zm0 7L2 14l10 5 10-5-10-5z" />
              </svg>
            </div>
            <span className="onboarding-brand-text">Clientmark Setup</span>
          </div>
          <button className="onboarding-skip-btn" onClick={handleSkip}>
            Skip for now
          </button>
        </div>

        {/* ── Progress Bar ──────────────────────────────────────────── */}
        <div className="onboarding-progress-bar-wrap">
          <div
            className="onboarding-progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* ── Body Step Content ─────────────────────────────────────── */}
        <div className="onboarding-body">
          <span className="onboarding-step-indicator">
            Step {currentStep} of {totalSteps}
          </span>

          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="onboarding-step-title">What best describes your role?</h2>
                <p className="onboarding-step-sub">
                  We will tailor your workspace views, dashboard metrics, and shortcuts to your role.
                </p>
                <div className="onboarding-options-grid">
                  {ROLES.map((role) => {
                    const isSelected = formData.ownerRole === role.label
                    return (
                      <div
                        key={role.id}
                        className={`onboarding-option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setFormData((p) => ({ ...p, ownerRole: role.label }))}
                      >
                        <div className="onboarding-radio-circle">
                          {isSelected && <div className="onboarding-radio-inner" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="onboarding-option-label">{role.label}</div>
                          <div className="onboarding-option-desc">{role.desc}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="onboarding-step-title">How many people are on your team?</h2>
                <p className="onboarding-step-sub">
                  Helps us recommend the best user seats, branches, and allocation workflow.
                </p>
                <div className="onboarding-options-grid">
                  {TEAM_SIZES.map((size) => {
                    const isSelected = formData.teamSize === size.label
                    return (
                      <div
                        key={size.id}
                        className={`onboarding-option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setFormData((p) => ({ ...p, teamSize: size.label }))}
                      >
                        <div className="onboarding-radio-circle">
                          {isSelected && <div className="onboarding-radio-inner" />}
                        </div>
                        <div className="onboarding-option-label">{size.label}</div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="onboarding-step-title">What will you primarily use Clientmark for?</h2>
                <p className="onboarding-step-sub">
                  Select all that apply. You can enable or disable modules at any time.
                </p>
                <div className="onboarding-options-grid">
                  {USE_CASES.map((uc) => {
                    const isSelected = formData.primaryUseCases.includes(uc.label)
                    return (
                      <div
                        key={uc.id}
                        className={`onboarding-option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleUseCase(uc.label)}
                      >
                        <div className="onboarding-checkbox-box">
                          {isSelected && (
                            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M13.5 4L6.5 11l-4-4" />
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="onboarding-option-label">{uc.label}</div>
                          <div className="onboarding-option-desc">{uc.desc}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="onboarding-step-title">Which industry are you in?</h2>
                <p className="onboarding-step-sub">
                  We optimize lead status labels and project templates for your industry.
                </p>
                <div className="onboarding-options-grid">
                  {INDUSTRIES.map((ind) => {
                    const isSelected = formData.industry === ind
                    return (
                      <div
                        key={ind}
                        className={`onboarding-option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setFormData((p) => ({ ...p, industry: ind }))}
                      >
                        <div className="onboarding-radio-circle">
                          {isSelected && <div className="onboarding-radio-inner" />}
                        </div>
                        <div className="onboarding-option-label">{ind}</div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="onboarding-step-title">What do you currently use?</h2>
                <p className="onboarding-step-sub">
                  We provide one-click Excel/CSV importers for seamless lead migration.
                </p>
                <div className="onboarding-options-grid">
                  {CURRENT_TOOLS.map((tool) => {
                    const isSelected = formData.currentTools === tool
                    return (
                      <div
                        key={tool}
                        className={`onboarding-option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setFormData((p) => ({ ...p, currentTools: tool }))}
                      >
                        <div className="onboarding-radio-circle">
                          {isSelected && <div className="onboarding-radio-inner" />}
                        </div>
                        <div className="onboarding-option-label">{tool}</div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="onboarding-step-title">Choose your workspace brand theme</h2>
                <p className="onboarding-step-sub">
                  Select your primary accent color. It will be used for buttons, active navigation, and dashboard indicators.
                </p>
                <div className="onboarding-color-palette">
                  {COLOR_PRESETS.map((color) => {
                    const isSelected = formData.brandColor === color.hex
                    return (
                      <div
                        key={color.hex}
                        className={`onboarding-color-swatch ${isSelected ? 'selected' : ''}`}
                        style={{ backgroundColor: color.hex }}
                        onClick={() => setFormData((p) => ({ ...p, brandColor: color.hex }))}
                        title={color.name}
                      >
                        {isSelected && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M13.5 4L6.5 11l-4-4" />
                          </svg>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop: '16px', padding: '16px', background: '#FAFAF8', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.5' }}>
                    Tip: You can also upload your custom company logo and custom favicon anytime under <strong>Settings → Site Setting</strong>.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer Navigation Controls ────────────────────────────── */}
        <div className="onboarding-footer">
          {currentStep > 1 ? (
            <button className="onboarding-back-btn" onClick={handleBack} disabled={saving}>
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            className="onboarding-next-btn"
            onClick={handleNext}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : currentStep === totalSteps
              ? 'Finish Setup'
              : 'Continue →'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default OnboardingWizard
