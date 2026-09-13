import React, { useState, useRef, useEffect } from 'react'
import { Container, Form, Button, InputGroup, Spinner } from 'react-bootstrap'

import logo from '../../assets/images/bh_login_logo.jpg'
import apiClient, { BASE_URL } from '../../api/axiosClient'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import Cookies from 'js-cookie'
import '../sidebarCSS/login.css'

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

  const [siteSetting, setSiteSetting] = useState(null)

  const getSiteSetting = async () => {
    try {
      const response = await apiClient.get('/software-setting/get-site-setting')
      setSiteSetting(response?.data?.data)
    } catch (error) { }
  }

  useEffect(() => {
    getSiteSetting()
  }, [])

  let mainLogo = siteSetting?.mainLogo ? `${BASE_URL}${siteSetting?.mainLogo}` : logo

  // ================= TIMER =================
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

  // ================= SEND OTP =================
  const handleSendOtp = async (e) => {
    e.preventDefault()

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      return setError('Please enter email')
    }

    if (!emailRegex.test(trimmedEmail)) {
      return setError('Please enter valid email')
    }

    try {
      setLoading(true)
      setError('')

      const res = await apiClient.post('/user/send-mail-otp', {
        email: trimmedEmail,
      })

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

  // ================= OTP INPUT =================
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return

    const updatedOtp = [...otp]
    updatedOtp[index] = value.slice(-1)
    setOtp(updatedOtp)
    setOtpError('')

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Optional Auto Verify
    if (updatedOtp.join('').length === 4) {
      handleVerifyOtp(updatedOtp.join(''))
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      const splitOtp = pasted.split('')
      setOtp(splitOtp)
      inputRefs.current[3]?.focus()
      handleVerifyOtp(pasted)
    }
    e.preventDefault()
  }

  // ================= VERIFY OTP =================
  const handleVerifyOtp = async (otpValueParam) => {
    const otpValue = otpValueParam || otp.join('')

    if (otpValue.length < 4) {
      return setOtpError('Please enter all 4 digits')
    }

    try {
      setVerifyLoading(true)

      const res = await apiClient.post('/user/verity-email-otp', {
        email: email.trim(),
        otp: otpValue,
      })

      toast.success(res.data.message || 'OTP verified successfully')
      Cookies.set('token', res.data.token, { expires: 365 * 20 })

      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)
      // Navigate to reset password page here
    } catch (err) {

      setOtpError(err?.response?.data?.message || 'Invalid OTP')
    } finally {
      setVerifyLoading(false)
    }
  }

  // ================= RESEND =================
  const handleResend = async () => {
    if (!canResend) return

    try {
      setLoading(true)

      const res = await apiClient.post('/user/send-mail-otp', {
        email: email.trim(),
      })

      toast.success(res.data.message || 'OTP resent successfully')
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

  // ================= CHANGE EMAIL =================
  const handleChangeEmail = () => {
    clearInterval(timerRef.current)
    setStep('email')
    setOtp(['', '', '', ''])
    setOtpError('')
    setTimer(RESEND_TIMER)
  }

  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  return (
    <div className="min-vh-100 d-flex flex-column flex-md-row">
      <div className="leftDiv d-none d-md-flex justify-content-center align-items-center w-50 p-4">
        <img className="login-img" src={mainLogo} alt="Logo" />
      </div>

      <Container className="d-flex align-items-center justify-content-center w-100 bg-light">
        <div
          className="rightInnerDiv p-4 p-md-5 shadow bg-white rounded w-100"
          style={{ maxWidth: '500px' }}
        >
          {step === 'email' ? (
            <>
              <h4 className="fw-bold">Forgot Password</h4>
              <p className="text-muted">Enter your registered email.</p>

              <Form onSubmit={handleSendOtp}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                    />
                  </InputGroup>
                  {error && <small className="text-danger">{error}</small>}
                </Form.Group>

                <Button className="button w-100" type="submit" disabled={loading}>
                  {loading ? <Spinner size="sm" animation="border" /> : 'Send OTP'}
                </Button>

                <div className="text-center mt-3">
                  <Link to="/login">Back to Login</Link>
                </div>
              </Form>
            </>
          ) : (
            <>
              <h4 className="fw-bold">Verify OTP</h4>
              <p className="text-muted">
                OTP sent to <strong>{email}</strong>
              </p>

              <div className="d-flex justify-content-center gap-3 mb-3">
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
                    className="text-center fw-bold"
                    style={{
                      width: '56px',
                      height: '56px',
                      fontSize: '22px',
                      border: otpError ? '2px solid red' : '2px solid #dee2e6',
                      borderRadius: '10px',
                    }}
                  />
                ))}
              </div>

              {otpError && <p className="text-danger text-center">{otpError}</p>}

              <div className="text-center mb-3">
                {canResend ? (
                  <span onClick={handleResend} style={{ cursor: 'pointer', color: '#0d6efd' }}>
                    Resend OTP
                  </span>
                ) : (
                  <span className="text-muted">Resend in 00:{String(timer).padStart(2, '0')}</span>
                )}
              </div>

              <Button
                className="button w-100"
                disabled={verifyLoading}
                onClick={() => handleVerifyOtp()}
              >
                {verifyLoading ? <Spinner size="sm" animation="border" /> : 'Verify OTP'}
              </Button>

              <div className="text-center mt-3">
                <span onClick={handleChangeEmail} style={{ cursor: 'pointer', color: '#0d6efd' }}>
                  ← Change Email
                </span>
              </div>
            </>
          )}
        </div>
      </Container>
    </div>
  )
}

export default ForgotPass
