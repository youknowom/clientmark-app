import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../../api/axiosClient'
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

const RESEND_TIMER = 60

const ForgotPass = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' | 'otp' | 'newPassword'
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 6-digit OTP
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resetToken, setResetToken] = useState('')

  // New password state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passError, setPassError] = useState('')
  const [passLoading, setPassLoading] = useState(false)

  const [timer, setTimer] = useState(RESEND_TIMER)
  const [canResend, setCanResend] = useState(false)

  const inputRefs = useRef([])
  const timerRef = useRef(null)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // ─── Timer ──────────────────────────────────────────────────────────────────
  const startTimer = () => {
    setTimer(RESEND_TIMER)
    setCanResend(false)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  // ─── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return setError('Please enter your email')
    if (!emailRegex.test(trimmed)) return setError('Please enter a valid email')

    setLoading(true)
    setError('')
    try {
      const res = await apiClient.post('/user/send-mail-otp', { email: trimmed })
      toast.success(res.data.message || 'Verification code sent')
      setStep('otp')
      startTimer()
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Something went wrong'
      toast.error(msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 2: OTP Input & Verification ────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const updated = [...otp]
    updated[index] = value.slice(-1)
    setOtp(updated)
    setOtpError('')
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (updated.join('').length === 6) handleVerifyOtp(updated.join(''))
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const split = pasted.split('')
      setOtp(split)
      inputRefs.current[5]?.focus()
      handleVerifyOtp(pasted)
    }
    e.preventDefault()
  }

  const handleVerifyOtp = async (otpValueParam) => {
    const otpValue = otpValueParam || otp.join('')
    if (otpValue.length < 6) return setOtpError('Please enter all 6 digits')

    setVerifyLoading(true)
    try {
      const res = await apiClient.post('/user/verify-email-otp', {
        email: email.trim(),
        otp: otpValue,
      })
      toast.success(res.data.message || 'Code verified')
      if (res.data.resetToken) {
        setResetToken(res.data.resetToken)
        setStep('newPassword')
      } else {
        setOtpError('Reset token missing. Please try again.')
      }
    } catch (err) {
      setOtpError(err?.response?.data?.message || 'Invalid or expired verification code')
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleResend = async () => {
    if (!canResend) return
    setLoading(true)
    try {
      const res = await apiClient.post('/user/send-mail-otp', { email: email.trim() })
      toast.success(res.data.message || 'Verification code resent')
      setOtp(['', '', '', '', '', ''])
      setOtpError('')
      startTimer()
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleChangeEmail = () => {
    clearInterval(timerRef.current)
    setStep('email')
    setOtp(['', '', '', '', '', ''])
    setOtpError('')
    setTimer(RESEND_TIMER)
  }

  // ─── Step 3: Reset Password ──────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setPassError('')

    if (!newPassword || newPassword.length < 8) {
      return setPassError('Password must be at least 8 characters long.')
    }
    if (newPassword !== confirmPassword) {
      return setPassError('Passwords do not match.')
    }

    setPassLoading(true)
    try {
      const res = await apiClient.post('/user/reset-password', {
        resetToken,
        newPassword,
      })
      toast.success(res.data.message || 'Password successfully updated!')
      setTimeout(() => {
        navigate('/login')
      }, 1000)
    } catch (err) {
      setPassError(err?.response?.data?.message || 'Failed to update password.')
    } finally {
      setPassLoading(false)
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
            Reset your account password
          </h2>
          <p className="auth-left-desc">
            Complete the secure 3-step verification to set a new password and protect your workspace.
          </p>

          <div className="auth-features">
            <div className="auth-feature-row">
              <div className="auth-feature-check"><CheckIcon /></div>
              <span>Platform-verified 6-digit cryptographic security</span>
            </div>
            <div className="auth-feature-row">
              <div className="auth-feature-check"><CheckIcon /></div>
              <span>Single-use purpose-bound authorization</span>
            </div>
            <div className="auth-feature-row">
              <div className="auth-feature-check"><CheckIcon /></div>
              <span>Instant session invalidation for stale logins</span>
            </div>
          </div>
        </div>

        <div className="auth-left-footer">
          <span>&copy; {new Date().getFullYear()} Clientmark. Enterprise grade multi-tenant CRM.</span>
        </div>
      </div>

      {/* ── Right Form Panel ──────────────────────────────────────────────── */}
      <div className="auth-right">
        <div className="auth-form-card">
          <div className="auth-mobile-brand">
            <div className="auth-mobile-brand-mark">
              <LogoMark />
            </div>
            <span className="auth-mobile-brand-name">Clientmark</span>
          </div>

          {step === 'email' && (
            <>
              <div className="auth-form-header">
                <h1 className="auth-form-title">Reset password</h1>
                <p className="auth-form-sub">Enter your registered email to receive a 6-digit verification code</p>
              </div>

              <form onSubmit={handleSendOtp} noValidate>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="fp-email">Email address</label>
                  <input
                    id="fp-email"
                    type="email"
                    className={`auth-input ${error ? 'error' : ''}`}
                    placeholder="Enter your email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                  />
                  {error && <p className="auth-error-msg">{error}</p>}
                </div>

                <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading}>
                  {loading ? (
                    <><span className="auth-spinner" aria-hidden="true" /> Sending code...</>
                  ) : 'Send verification code'}
                </button>
              </form>

              <div className="auth-links" style={{ marginTop: '20px' }}>
                <Link to="/login">← Back to sign in</Link>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="auth-form-header">
                <h1 className="auth-form-title">Enter verification code</h1>
                <p className="auth-form-sub">
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </p>
              </div>

              <div className="auth-otp-row" role="group" aria-label="OTP input" style={{ gap: '8px' }}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`auth-otp-input ${otpError ? 'otp-error' : ''}`}
                    aria-label={`OTP digit ${index + 1}`}
                    style={{ width: '42px', height: '48px', fontSize: '18px' }}
                  />
                ))}
              </div>

              {otpError && (
                <p className="auth-error-msg" style={{ textAlign: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                  {otpError}
                </p>
              )}

              <div style={{ textAlign: 'center', fontSize: '13.5px', marginBottom: '20px' }}>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A1F36', fontWeight: '600', fontSize: '13.5px', fontFamily: 'inherit' }}
                  >
                    Resend code
                  </button>
                ) : (
                  <span style={{ color: '#9CA3AF' }}>
                    Resend in 00:{String(timer).padStart(2, '0')}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="auth-submit"
                disabled={verifyLoading}
                onClick={() => handleVerifyOtp()}
                aria-busy={verifyLoading}
              >
                {verifyLoading ? (
                  <><span className="auth-spinner" aria-hidden="true" /> Verifying...</>
                ) : 'Verify code'}
              </button>

              <div className="auth-links" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A1F36', fontWeight: '600', fontSize: '13.5px', fontFamily: 'inherit' }}
                >
                  ← Use a different email
                </button>
              </div>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <div className="auth-form-header">
                <h1 className="auth-form-title">Set new password</h1>
                <p className="auth-form-sub">Please create a strong password with at least 8 characters</p>
              </div>

              <form onSubmit={handleResetPassword} noValidate>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="new-pass">New Password</label>
                  <input
                    id="new-pass"
                    type="password"
                    className={`auth-input ${passError ? 'error' : ''}`}
                    placeholder="Enter new password (min. 8 characters)"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPassError('') }}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="confirm-pass">Confirm New Password</label>
                  <input
                    id="confirm-pass"
                    type="password"
                    className={`auth-input ${passError ? 'error' : ''}`}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPassError('') }}
                  />
                  {passError && <p className="auth-error-msg">{passError}</p>}
                </div>

                <button type="submit" className="auth-submit" disabled={passLoading} aria-busy={passLoading}>
                  {passLoading ? (
                    <><span className="auth-spinner" aria-hidden="true" /> Updating password...</>
                  ) : 'Set new password & sign in'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPass
