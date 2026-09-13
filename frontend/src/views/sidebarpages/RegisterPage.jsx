import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import axiosClient from '../../api/axiosClient'
import '../sidebarCSS/login.css'

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const LogoMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
    <path d="M12 2L2 7l10 5 10-5-10-5zm0 7L2 14l10 5 10-5-10-5z" />
  </svg>
)

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 4L6.5 11l-4-4" />
  </svg>
)

const leftFeatures = [
  'Configure company workspace with branch locations',
  'Track leads from initial call to closed deal',
  'Manage project delivery with milestone tracking',
  'Role-specific activity and conversion reports',
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
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Enter a valid email'
    if (!formData.userName.trim()) newErrors.userName = 'Username is required'
    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 6) newErrors.password = 'Minimum 6 characters'
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
        toast.success('Account created. Redirecting to sign in...')
        if (response.data?.token) {
          sessionStorage.setItem('token', response.data.token)
        }
        setTimeout(() => navigate('/login'), 1500)
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
      {/* ── Left Brand Panel ───────────────────────────────────────────────── */}
      <div className="auth-left" aria-hidden="true">
        <div className="auth-left-top">
          <div className="auth-brand">
            <div className="auth-brand-mark">
              <LogoMark />
            </div>
            <span className="auth-brand-name">Clientmark</span>
          </div>

          <h2 className="auth-left-headline">
            Set up your CRM workspace
          </h2>
          <p className="auth-left-sub">
            14-day trial for your sales and delivery team. No credit card required.
          </p>

          <ul className="auth-features-list">
            {leftFeatures.map((feat) => (
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
            Clientmark connects lead management directly with project delivery.
          </p>
        </div>
      </div>

      {/* ── Right Form Panel ──────────────────────────────────────────────── */}
      <div className="auth-right">
        <div className="auth-form-box">
          {/* Mobile brand */}
          <div className="auth-mobile-brand">
            <div className="auth-mobile-brand-mark">
              <LogoMark />
            </div>
            <span className="auth-mobile-brand-name">Clientmark</span>
          </div>

          <div className="auth-form-header">
            <h1 className="auth-form-title">Create account</h1>
            <p className="auth-form-sub">Set up your company workspace to start tracking leads and projects</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Company Name */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-company">Company / Organization name *</label>
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

            {/* Email + Phone */}
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-email">Work email *</label>
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
                <label className="auth-label" htmlFor="reg-phone">Phone number</label>
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

            {/* Username */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-username">Admin username *</label>
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

            {/* Passwords */}
            <div className="auth-row">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-password">Password *</label>
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
                <label className="auth-label" htmlFor="reg-confirm">Confirm password *</label>
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

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="auth-spinner" aria-hidden="true" />
                  Creating account...
                </>
              ) : 'Create account & start trial'}
            </button>
          </form>

          <div className="auth-links" style={{ marginTop: '20px' }}>
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
