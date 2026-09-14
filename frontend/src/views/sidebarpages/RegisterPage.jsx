import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import axiosClient from '../../api/axiosClient'
import '../sidebarCSS/login.css'

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const LogoMark = ({ size = 20, color = 'white' }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill={color === 'white' ? '#E05E3A' : '#111827'} />
    <path d="M8 10h16M8 16h11M8 22h14" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="24" cy="22" r="2.8" fill={color === 'white' ? '#E05E3A' : '#111827'} stroke="white" strokeWidth="1.6" />
  </svg>
)

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 4L6.5 11l-4-4" />
  </svg>
)

const architectureHighlights = [
  'Isolated company workspace with dedicated tenant data partitioning',
  'Lead pipeline with telecaller assignment and WhatsApp follow-ups',
  'Project delivery milestones with client status sharing',
  'Granular role-based permissions (Admin, BDE, Telecaller, Developer)',
]

// ─── Component ─────────────────────────────────────────────────────────────────
const RegisterPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    userName: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required'
    if (!formData.email.trim()) newErrors.email = 'Work email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Enter a valid email address'
    if (!formData.userName.trim()) newErrors.userName = 'Admin username is required'
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 6) newErrors.password = 'Minimum 6 characters required'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const response = await axiosClient.post('/tenant/register', {
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
        userName: formData.userName,
        password: formData.password,
      })

      if (response.data?.token || response.data?.success) {
        toast.success('Workspace created. Redirecting to sign in...')
        if (response.data?.token) {
          sessionStorage.setItem('token', response.data.token)
        }
        setTimeout(() => navigate('/login'), 1200)
      } else {
        toast.error(response.data?.message || 'Registration failed.')
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-root">
      {/* ── Left Architectural Panel ────────────────────────────────────────── */}
      <div className="auth-left" aria-hidden="true">
        <div className="auth-left-top">
          <Link to="/" className="auth-brand">
            <div className="auth-brand-mark">
              <LogoMark size={20} color="white" />
            </div>
            <span className="auth-brand-name">Clientmark</span>
          </Link>

          <span className="auth-left-eyebrow">Enterprise CRM Workspace</span>
          <h2 className="auth-left-headline">
            The single system for sales leads & project delivery.
          </h2>
          <p className="auth-left-sub">
            Set up your organization's workspace in minutes. Includes a 14-day full feature trial with no credit card required.
          </p>

          <ul className="auth-features-list">
            {architectureHighlights.map((feat) => (
              <li key={feat} className="auth-feature-item">
                <span className="auth-feature-dot">
                  <CheckIcon />
                </span>
                <span className="auth-feature-text">{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-left-bottom">
          <p className="auth-quote">
            Direct WhatsApp integration, telecaller activity logs, and multi-branch management built into one disciplined workspace.
          </p>
        </div>
      </div>

      {/* ── Right Form Panel ───────────────────────────────────────────────── */}
      <div className="auth-right">
        <div className="auth-form-box">
          {/* Mobile brand header */}
          <div className="auth-mobile-brand">
            <div className="auth-mobile-brand-mark">
              <LogoMark size={20} color="white" />
            </div>
            <span className="auth-mobile-brand-name">Clientmark</span>
          </div>

          <div className="auth-form-header">
            <span className="auth-form-eyebrow">Workspace Setup</span>
            <h1 className="auth-form-title">Create your account</h1>
            <p className="auth-form-sub">
              Set up your company workspace to start tracking leads and coordinating delivery.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Company Name */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-company">
                Company / Organization name *
              </label>
              <input
                id="reg-company"
                type="text"
                name="companyName"
                className={`auth-input ${errors.companyName ? 'error' : ''}`}
                placeholder="e.g. Acme Innovations"
                autoComplete="organization"
                value={formData.companyName}
                onChange={handleChange}
              />
              {errors.companyName && <p className="auth-error-msg">{errors.companyName}</p>}
            </div>

            {/* Work Email + Phone */}
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-email">
                  Work email *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  className={`auth-input ${errors.email ? 'error' : ''}`}
                  placeholder="admin@company.com"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <p className="auth-error-msg">{errors.email}</p>}
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-phone">
                  Phone number
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  name="phone"
                  className="auth-input"
                  placeholder="+91 9876543210"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <hr className="auth-divider" />

            {/* Admin Username */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-username">
                Admin username *
              </label>
              <input
                id="reg-username"
                type="text"
                name="userName"
                className={`auth-input ${errors.userName ? 'error' : ''}`}
                placeholder="admin"
                autoComplete="username"
                value={formData.userName}
                onChange={handleChange}
              />
              {errors.userName && <p className="auth-error-msg">{errors.userName}</p>}
            </div>

            {/* Password + Confirm Password */}
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-password">
                  Password *
                </label>
                <input
                  id="reg-password"
                  type="password"
                  name="password"
                  className={`auth-input ${errors.password ? 'error' : ''}`}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                />
                {errors.password && <p className="auth-error-msg">{errors.password}</p>}
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-confirm">
                  Confirm password *
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  name="confirmPassword"
                  className={`auth-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && <p className="auth-error-msg">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" />
                  Creating workspace...
                </>
              ) : (
                'Create account & start trial'
              )}
            </button>
          </form>

          <div className="auth-links">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
