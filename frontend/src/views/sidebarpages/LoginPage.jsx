import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FaEyeSlash, FaEye } from 'react-icons/fa'
import Cookies from 'js-cookie'
import apiClient, { BASE_URL } from '../../api/axiosClient'
import { syncFaviconFromSettings } from '../../helpers/dynamicFavicon'
import toast from 'react-hot-toast'
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

const DownloadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const leftFeatures = [
  'Track leads from initial inquiry to closed deal',
  'Coordinate project delivery with milestones and tasks',
  'Send WhatsApp updates and reminders',
  'Role-based permissions for sales and delivery staff',
]

// ─── Component ─────────────────────────────────────────────────────────────────
const LoginPage = () => {
  const [user, setUser] = useState({ userName: '', password: '' })
  const [error, setError] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [siteSetting, setSiteSetting] = useState(null)

  const getSiteSetting = async () => {
    try {
      const response = await apiClient.get('/software-setting/get-site-setting')
      const data = response?.data?.data
      setSiteSetting(data)
      syncFaviconFromSettings(data)
    } catch (error) {}
  }

  useEffect(() => {
    getSiteSetting()
  }, [])

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const validate = () => {
    const newErrors = {}
    if (!user.userName.trim()) newErrors.userName = 'Username is required'
    if (!user.password) newErrors.password = 'Password is required'
    return newErrors
  }

  const handleLogin = async () => {
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setError(newErrors)
      return
    }

    setLoading(true)
    try {
      const response = await apiClient.post('/user/login-by-pass', user)
      Cookies.set('token', response.data.token, { expires: 365 * 20 })
      toast.success(response.data.message || 'Login successful')
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 900)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLogin()
    }
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShowInstallButton(false)
  }

  return (
    <div className="auth-root">
      {/* ── Left Brand Panel ───────────────────────────────────────────────── */}
      <div className="auth-left" aria-hidden="true">
        <div className="auth-left-top">
          <div className="auth-brand">
            {siteSetting?.mainLogo ? (
              <img
                src={`${BASE_URL}${siteSetting.mainLogo}`}
                alt={siteSetting?.projectName || 'Logo'}
                style={{ height: '32px', maxWidth: '160px', objectFit: 'contain' }}
              />
            ) : (
              <>
                <div className="auth-brand-mark">
                  <LogoMark />
                </div>
                <span className="auth-brand-name">{siteSetting?.projectName || 'Clientmark'}</span>
              </>
            )}
          </div>

          <h2 className="auth-left-headline">
            Lead tracking and project delivery workspace
          </h2>
          <p className="auth-left-sub">
            Track incoming leads, schedule follow-ups, send client updates, and manage team permissions.
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
          {/* Mobile brand — shown only on small screens */}
          <div className="auth-mobile-brand">
            {siteSetting?.mainLogo ? (
              <img
                src={`${BASE_URL}${siteSetting.mainLogo}`}
                alt={siteSetting?.projectName || 'Logo'}
                style={{ height: '28px', maxWidth: '140px', objectFit: 'contain' }}
              />
            ) : (
              <>
                <div className="auth-mobile-brand-mark">
                  <LogoMark />
                </div>
                <span className="auth-mobile-brand-name">{siteSetting?.projectName || 'Clientmark'}</span>
              </>
            )}
          </div>

          <div className="auth-form-header">
            <h1 className="auth-form-title">Sign in</h1>
            <p className="auth-form-sub">Enter your credentials to access your workspace</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleLogin() }} noValidate>
            {/* Username */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                className={`auth-input ${error.userName ? 'error' : ''}`}
                placeholder="Enter your username"
                autoComplete="username"
                value={user.userName}
                onChange={(e) => {
                  setUser({ ...user, userName: e.target.value.trim() })
                  setError({ ...error, userName: '' })
                }}
                onKeyDown={handleKeyDown}
              />
              {error.userName && <p className="auth-error-msg">{error.userName}</p>}
            </div>

            {/* Password */}
            <div className="auth-field">
              <div className="auth-links-row">
                <label className="auth-label" htmlFor="login-password" style={{ marginBottom: 0 }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: '13px', color: '#6B7280', textDecoration: 'none', fontWeight: '500', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => e.target.style.color = '#1A1F36'}
                  onMouseLeave={(e) => e.target.style.color = '#6B7280'}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-input ${error.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={user.password}
                  onChange={(e) => {
                    setUser({ ...user, password: e.target.value })
                    setError({ ...error, password: '' })
                  }}
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                </button>
              </div>
              {error.password && <p className="auth-error-msg">{error.password}</p>}
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
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="auth-links" style={{ marginTop: '20px' }}>
            Don't have an account?{' '}
            <Link to="/register">Start free trial</Link>
          </div>

          {/* PWA Install */}
          {showInstallButton && (
            <button
              type="button"
              className="auth-pwa-strip"
              onClick={handleInstallClick}
              aria-label="Install Clientmark app"
            >
              <DownloadIcon />
              <div>
                <div className="auth-pwa-text">Install the app</div>
                <div className="auth-pwa-sub">Add Clientmark to your home screen</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
