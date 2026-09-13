import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiClient, { BASE_URL } from '../../api/axiosClient'
import toast from 'react-hot-toast'
import Cookies from 'js-cookie'
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

const RESEND_TIMER = 30

const ForgotPass = () => {
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [otp, setOtp] = useState(['', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)

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

  // ─── Send OTP ────────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return setError('Please enter your email')
    if (!emailRegex.test(trimmed)) return setError('Please enter a valid email')

    setLoading(true)
    setError('')
    try {
      const res = await apiClient.post('/user/send-mail-otp', { email: trimmed })
      toast.success(res.data.message || 'OTP sent successfully')
      setStep('otp')
      startTimer()
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ─── OTP Input ───────────────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const updated = [...otp]
    updated[index] = value.slice(-1)
    setOtp(updated)
    setOtpError('')
    if (value && index < 3) inputRefs.current[index + 1]?.focus()
    if (updated.join('').length === 4) handleVerifyOtp(updated.join(''))
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      const split = pasted.split('')
      setOtp(split)
      inputRefs.current[3]?.focus()
      handleVerifyOtp(pasted)
    }
    e.preventDefault()
  }

  // ─── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (otpValueParam) => {
    const otpValue = otpValueParam || otp.join('')
    if (otpValue.length < 4) return setOtpError('Please enter all 4 digits')

    setVerifyLoading(true)
    try {
      const res = await apiClient.post('/user/verity-email-otp', {
        email: email.trim(),
        otp: otpValue,
      })
      toast.success(res.data.message || 'OTP verified')
      Cookies.set('token', res.data.token, { expires: 365 * 20 })
      setTimeout(() => { window.location.href = '/dashboard' }, 900)
    } catch (err) {
      setOtpError(err?.response?.data?.message || 'Invalid OTP')
    } finally {
      setVerifyLoading(false)
    }
  }

  // ─── Resend ──────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!canResend) return
    setLoading(true)
    try {
      const res = await apiClient.post('/user/send-mail-otp', { email: email.trim() })
      toast.success(res.data.message || 'OTP resent')
      setOtp(['', '', '', ''])
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
    setOtp(['', '', '', ''])
    setOtpError('')
    setTimer(RESEND_TIMER)
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
          <p className="auth-left-sub">
            A verification code will be sent to your registered email address.
          </p>

          <ul className="auth-features-list">
            {[
              'Verification code sent to your email',
              'Valid for password recovery',
              'Account access restored immediately',
            ].map((feat) => (
              <li key={feat} className="auth-feature-item">
                <span className="auth-feature-dot"><CheckIcon /></span>
                <span className="auth-feature-text">{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="auth-left-bottom">
          <p className="auth-quote">
            If you no longer have access to your email, contact your organization admin.
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

          {step === 'email' ? (
            <>
              <div className="auth-form-header">
                <h1 className="auth-form-title">Reset password</h1>
                <p className="auth-form-sub">Enter your registered email to receive a verification code</p>
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
          ) : (
            <>
              <div className="auth-form-header">
                <h1 className="auth-form-title">Enter verification code</h1>
                <p className="auth-form-sub">
                  We sent a 4-digit code to <strong>{email}</strong>
                </p>
              </div>

              <div className="auth-otp-row" role="group" aria-label="OTP input">
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
        </div>
      </div>
    </div>
  )
}

export default ForgotPass
