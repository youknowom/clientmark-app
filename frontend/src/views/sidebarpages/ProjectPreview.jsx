import React, { useEffect, useState, useContext, useRef } from 'react'
import { Spinner } from 'react-bootstrap'
import DOMPurify from 'dompurify'
import { useParams, useNavigate } from 'react-router-dom'
import { AuthContext } from '../../AuthContext'
import apiClient, { BASE_URL } from '../../api/axiosClient'
import toast from 'react-hot-toast'
import {
  FaClock,
  FaCheckCircle,
  FaWhatsapp,
  FaLock,
  FaPaperclip,
  FaTimes,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaLayerGroup,
  FaCode,
  FaProjectDiagram,
  FaFlag,
  FaUsers,
} from 'react-icons/fa'
import { MdCall, MdVerified } from 'react-icons/md'
import '../sidebarCSS/comStyle.css'

const OTP_SESSION_KEY = (slug) => `project_otp_verified_${slug}`
const OTP_EXPIRY_HOURS = 1

// ─── OTP Modal ────────────────────────────────────────────────────────────────
const OtpModal = ({ mobile, slug, onVerified }) => {
  const [otp, setOtp] = useState(['', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [timer, setTimer] = useState(0)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef([])
  const timerRef = useRef(null)

  const RESEND_SECONDS = 30

  const startTimer = () => {
    setTimer(RESEND_SECONDS)
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

  const handleSendOtp = async () => {
    setSending(true)
    try {
      await apiClient.post(`/project/send-whatsapp-otp`, { slug, mobileNo: mobile })
      toast.success('Verification code sent to your WhatsApp.')
      setOtpSent(true)
      startTimer()
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP')
    } finally {
      setSending(false)
    }
  }

  const handleResend = async () => {
    if (!canResend) return
    setOtp(['', '', '', ''])
    setOtpError('')
    await handleSendOtp()
  }

  const verifyOtp = async (otpValue) => {
    setVerifying(true)
    try {
      await apiClient.post(`/project/verify-whatsapp-otp`, {
        slug,
        otp: otpValue,
        mobileNo: mobile,
      })
      // Save to localStorage with expiry
      const expiry = Date.now() + OTP_EXPIRY_HOURS * 60 * 60 * 1000
      localStorage.setItem(OTP_SESSION_KEY(slug), JSON.stringify({ verified: true, expiry }))
      toast.success('Access verified.')
      onVerified()
    } catch (err) {
      setOtpError(err?.response?.data?.message || 'Invalid OTP. Please try again.')
      setOtp(['', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } finally {
      setVerifying(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    setOtpError('')

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit on last digit
    if (value && index === 3) {
      const full = newOtp.join('')
      if (full.length === 4) verifyOtp(full)
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      const arr = pasted.split('')
      setOtp(arr)
      setOtpError('')
      inputRefs.current[3]?.focus()
      verifyOtp(pasted)
    }
    e.preventDefault()
  }

  const MobileNumber = mobile || ''

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Modal Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: '20px',
            padding: '40px 36px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <h5 className="text-center fw-bold mb-1">Access Verification</h5>
          <p className="text-center text-muted" style={{ fontSize: '14px' }}>
            This project preview requires verification to access.
          </p>

          <hr />

          {!otpSent ? (
            <>
              {/* Show mobile */}
              <div
                className="d-flex align-items-center gap-3 p-3 rounded-3 mb-4"
                style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
              >
                <FaWhatsapp size={28} color="#25D366" />
                <div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>Registered Mobile</div>
                  <div className="fw-semibold" style={{ letterSpacing: '2px' }}>
                    {MobileNumber}
                  </div>
                </div>
              </div>

              <p className="text-muted text-center" style={{ fontSize: '13px' }}>
                A 4-digit verification code will be sent to this WhatsApp number.
              </p>

              <button
                onClick={handleSendOtp}
                disabled={sending}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: sending
                    ? '#6c757d'
                    : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'opacity 0.2s',
                }}
              >
                {sending ? (
                  <Spinner size="sm" animation="border" />
                ) : (
                  <>
                    <FaWhatsapp size={18} /> Send OTP via WhatsApp
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <p className="text-center text-muted mb-3" style={{ fontSize: '13px' }}>
                Enter the 4-digit OTP sent to{' '}
                <strong style={{ color: '#0d6efd' }}>{MobileNumber}</strong>
              </p>

              {/* OTP Boxes */}
              <div className="d-flex justify-content-center gap-3 mb-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    disabled={verifying}
                    style={{
                      width: '60px',
                      height: '60px',
                      fontSize: '26px',
                      textAlign: 'center',
                      border: otpError ? '2px solid #dc3545' : '2px solid #dee2e6',
                      borderRadius: '12px',
                      outline: 'none',
                      fontWeight: 'bold',
                      transition: 'all 0.2s',
                      background: verifying ? '#f8f9fa' : '#fff',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#0d6efd')}
                    onBlur={(e) => (e.target.style.borderColor = otpError ? '#dc3545' : '#dee2e6')}
                  />
                ))}
              </div>

              {verifying && (
                <div className="text-center mb-2">
                  <Spinner size="sm" animation="border" className="text-primary" />
                  <span className="ms-2 text-muted" style={{ fontSize: '13px' }}>
                    Verifying...
                  </span>
                </div>
              )}

              {otpError && (
                <p className="text-center text-danger mb-2" style={{ fontSize: '13px' }}>
                  {otpError}
                </p>
              )}

              {/* Timer / Resend */}
              <div className="text-center mt-3">
                {canResend ? (
                  <span style={{ fontSize: '13px' }}>
                    Didn't receive it?{' '}
                    <span
                      onClick={handleResend}
                      style={{ color: '#0d6efd', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Resend OTP
                    </span>
                  </span>
                ) : (
                  <span className="text-muted" style={{ fontSize: '13px' }}>
                    Resend in{' '}
                    <strong style={{ color: '#0d6efd' }}>
                      00:{String(timer).padStart(2, '0')}
                    </strong>
                  </span>
                )}
              </div>
            </>
          )}

          {/* Lock badge */}
          <div className="d-flex align-items-center justify-content-center gap-1 mt-4">
            <FaLock size={11} color="#adb5bd" />
            <span style={{ fontSize: '11px', color: '#adb5bd' }}>
              Access valid for {OTP_EXPIRY_HOURS} hour
            </span>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Attachment Lightbox ─────────────────────────────────────────────────────
const AttachmentLightbox = ({ image, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!image) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '16px',
          right: '20px',
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: '50%',
          width: '38px',
          height: '38px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#fff',
          zIndex: 2001,
          backdropFilter: 'blur(4px)',
        }}
      >
        <FaTimes size={18} />
      </button>

      {/* Image — natural aspect ratio, max constrained */}
      <img
        src={image}
        alt="Attachment"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '92vw',
          maxHeight: '90vh',
          width: 'auto',
          height: 'auto',
          borderRadius: '10px',
          boxShadow: '0 16px 60px rgba(0,0,0,0.7)',
          display: 'block',
        }}
      />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
const ProjectPreview = () => {
  const { token, userData } = useContext(AuthContext)
  const { slug } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [posts, setPosts] = useState([])
  const [selectedPhase, setSelectedPhase] = useState(null)
  const [lightboxImg, setLightboxImg] = useState(null)

  // Site settings & theme
  const defaultTheme = {
    primaryColor: '#1e3a5f',
    secondaryColor: '#2563eb',
    backgroundColor: '#f1f5f9',
    textColor: '#1e293b',
  }
  const [site, setSite] = useState({
    mainLogo: '',
    projectName: '',
    phone: '',
    companyWhatsapp: '',
  })
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('theme')
      return saved ? JSON.parse(saved) : defaultTheme
    } catch {
      return defaultTheme
    }
  })

  // OTP gate
  const [showOtp, setShowOtp] = useState(false)
  const [accessGranted, setAccessGranted] = useState(false)

  // Check if logged-in user (admin/dev) — skip OTP
  const isLoggedIn = !!(token && userData?._id)

  // Check localStorage session
  const checkLocalSession = () => {
    try {
      if (token) return true
      const raw = localStorage.getItem(OTP_SESSION_KEY(slug))
      if (!raw) return false
      const { verified, expiry } = JSON.parse(raw)
      if (verified && expiry && Date.now() < expiry) return true
      localStorage.removeItem(OTP_SESSION_KEY(slug)) // expired
      return false
    } catch {
      return false
    }
  }

  useEffect(() => {
    if (!slug) {
      toast.error('Invalid project link.')
      navigate('/all-project')
      return
    }

    if (isLoggedIn || checkLocalSession()) {
      setAccessGranted(true)
    } else {
      setShowOtp(true)
    }

    getProjectDetails()
    getProjectTimeline()

    // Fetch site settings (logo, company contact)
    apiClient
      .get('/software-setting/get-site-setting')
      .then((res) => {
        const d = res?.data?.data
        if (d)
          setSite({
            mainLogo: d.mainLogo || '',
            projectName: d.projectName || '',
            phone: d.phone || '',
            companyWhatsapp: d.companyWhatsapp || '',
          })
      })
      .catch(() => {})

    // Fetch theme
    apiClient
      .get('/software-setting/get-main-theme')
      .then((res) => {
        const t = res?.data?.data?.mainTheme
        if (t) {
          const updated = {
            primaryColor: t.primaryColor || defaultTheme.primaryColor,
            secondaryColor: t.secondaryColor || defaultTheme.secondaryColor,
            backgroundColor: t.backgroundColor || defaultTheme.backgroundColor,
            textColor: t.textColor || defaultTheme.textColor,
          }
          setTheme(updated)
        }
      })
      .catch(() => {})
  }, [slug])

  const getProjectDetails = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get(`/project/get-project-by-slug`, {
        params: { slug },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setProject(response.data.data)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to fetch project details.')
      navigate(-1)
    } finally {
      setIsLoading(false)
    }
  }

  const mapTimelinePost = (item) => {
    const createdAt = item?.createdAt ? new Date(item.createdAt) : null
    const updatedAt = item?.updatedAt ? new Date(item.updatedAt) : null
    const edited = updatedAt && createdAt && updatedAt > createdAt
    const roleName = item?.addById?.roleId?.roleName || ''
    const isAdmin = roleName.toLowerCase().includes('admin')
    return {
      id: item?._id,
      module: item?.moduleName || '',
      phase: item?.phase || '',
      isAdmin,
      developer: { name: item?.addById?.fullName || item?.addById?.name || 'Developer' },
      content: item?.description || '',
      images: Array.isArray(item?.attachements)
        ? item.attachements.map((img) => (img?.startsWith('http') ? img : `${BASE_URL}${img}`))
        : [],
      createdAt,
      updatedAt,
      edited,
    }
  }

  const getProjectTimeline = async () => {
    try {
      const response = await apiClient.get(`/project/get-timeline-by-slug`, {
        params: { slug },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = Array.isArray(response?.data?.data) ? response.data.data : []
      setPosts(data.map(mapTimelinePost))
    } catch (error) {
      // If 400 returned (no posts yet) or any network error — safe fallback
      setPosts([])
    }
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return ''
    const diff = (Date.now() - date) / 60000
    if (diff < 1) return 'Just now'
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const phases = project?.PhaseDetails || project?.phaseDetails || project?.phases || []

  const getDeveloperName = (dev) => {
    if (!dev) return ''
    if (typeof dev === 'string') return dev
    return dev.fullName || dev.name || ''
  }
  const getDeveloperNames = (devArray) => {
    if (!Array.isArray(devArray)) return ''
    return devArray.map(getDeveloperName).filter(Boolean).join(', ')
  }

  if (isLoading) {
    return (
      <div className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    )
  }

  if (!project) return <div>No project data found.</div>

  // Only render preview content if access is granted
  if (!accessGranted) {
    // Show OTP modal only
    return (
      <OtpModal
        mobile={project?.mobileNo || ''}
        slug={slug}
        onVerified={() => {
          setAccessGranted(true)
          setShowOtp(false)
        }}
      />
    )
  }

  const filteredPosts = selectedPhase
    ? posts.filter((p) => p.phase?.trim() === selectedPhase?.trim())
    : posts

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // Status colours — kept in sync with AllProject.jsx statusDD
  const statusColor = {
    'Not assigned': { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
    Assigned: { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
    Hold: { bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
    'In Progress': { bg: '#cffafe', color: '#164e63', border: '#67e8f9' },
    Testing: { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
    'Client Review': { bg: '#ffedd5', color: '#9a3412', border: '#fdba74' },
    Completed: { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  }

  const priorityColor = {
    High: { bg: '#fee2e2', color: '#991b1b' },
    Medium: { bg: '#fef3c7', color: '#92400e' },
    Low: { bg: '#d1fae5', color: '#065f46' },
  }

  const getSC = (map, key, fallback = { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' }) =>
    map[key] || fallback

  const completedPhases = phases.filter((ph) => {
    const pn = ph.PhaseName || ph.phaseName || ph.name || ''
    return ph.PhaseStatus === 'Completed' || posts.some((p) => p.phase?.trim() === pn?.trim())
  }).length

  const totalDays = phases.reduce((acc, ph) => acc + (parseInt(ph.PhaseDays || ph.days) || 0), 0)

  return (
    <div
      style={{
        background: theme.backgroundColor || '#f1f5f9',
        minHeight: '100vh',
        padding: '24px 12px 48px',
      }}
    >
      <style>{`
        .inv-doc {
          max-width: 960px;
          margin: 0 auto;
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.10);
          overflow: hidden;
        }
        .inv-header {
          background: linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%);
          padding: 14px 32px;
          color: #fff;
        }
        .inv-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          min-height: 52px;
        }
        .inv-brand { display: flex; align-items: center; gap: 12px; }
        .inv-brand-icon {
          width: 42px; height: 42px; background: rgba(255,255,255,0.18);
          border-radius: 10px; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .inv-brand-logo {
          height: 42px; max-width: 130px; object-fit: contain;
          border-radius: 8px; background: #fff;
          padding: 5px 8px; flex-shrink: 0;
          box-shadow: 0 1px 6px rgba(0,0,0,0.15);
        }
        .inv-brand-name { font-size: 17px; font-weight: 700; letter-spacing: 0.2px; line-height: 1.2; }
        .inv-brand-sub { font-size: 11px; opacity: 0.7; margin-top: 2px; }
        .inv-contact-row {
          display: flex; flex-direction: row; gap: 8px; align-items: center;
          flex-wrap: wrap; justify-content: flex-end;
        }
        .inv-contact-link {
          font-size: 12px; font-weight: 600; color: #fff;
          display: inline-flex; align-items: center; gap: 6px;
          text-decoration: none;
          padding: 5px 13px; border-radius: 100px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.25);
          transition: all 0.18s;
          white-space: nowrap;
          line-height: 1;
        }
        .inv-contact-link:hover {
          background: rgba(255,255,255,0.28);
          color: #fff; text-decoration: none;
        }
        .inv-contact-link.wa {
          background: rgba(37,211,102,0.25);
          border-color: rgba(37,211,102,0.5);
        }
        .inv-contact-link.wa:hover {
          background: rgba(37,211,102,0.42);
        }
        .inv-title-block { text-align: right; }
        .inv-title-label {
          font-size: 11px; font-weight: 600; letter-spacing: 2px;
          text-transform: uppercase; opacity: 0.65;
        }
        .inv-title-name { font-size: 24px; font-weight: 800; margin-top: 4px; line-height: 1.2; }
        .inv-title-id {
          font-size: 12px; opacity: 0.65; margin-top: 4px;
          font-family: monospace; letter-spacing: 1px;
        }
        .inv-status-bar {
          display: flex; flex-wrap: wrap; gap: 10px;
          padding: 16px 40px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .inv-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 14px; border-radius: 100px;
          font-size: 12px; font-weight: 600; border: 1px solid transparent;
        }
        .inv-body { padding: 32px 40px; }
        .inv-section-title {
          font-size: 11px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; color: #94a3b8;
          margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
        }
        .inv-section-title::after {
          content: ''; flex: 1; height: 1px; background: #e2e8f0;
        }
        .inv-info-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;
          margin-bottom: 28px;
        }
        .inv-info-pane { padding: 20px 24px; }
        .inv-info-pane:first-child { border-right: 1px solid #e2e8f0; }
        .inv-info-pane-title {
          font-size: 12px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; color: #64748b; margin-bottom: 14px;
        }
        .inv-field { margin-bottom: 12px; }
        .inv-field-label {
          font-size: 11px; color: #94a3b8; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px;
        }
        .inv-field-value {
          font-size: 14px; color: #1e293b; font-weight: 500;
          display: flex; align-items: center; gap: 6px;
        }
        .inv-field-value svg { color: #94a3b8; flex-shrink: 0; }
        .inv-desc-box {
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 10px; padding: 16px; font-size: 14px;
          color: #334155; line-height: 1.7; margin-bottom: 28px;
        }
        .inv-phases-table {
          width: 100%; border-collapse: separate; border-spacing: 0;
          border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;
          margin-bottom: 28px; font-size: 13px;
        }
        .inv-phases-table thead tr th {
          background: #f8fafc; padding: 10px 14px;
          text-align: left; font-size: 11px; font-weight: 700;
          letter-spacing: 1px; text-transform: uppercase; color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }
        .inv-phases-table tbody tr td {
          padding: 12px 14px; vertical-align: middle;
          border-bottom: 1px solid #f1f5f9; color: #334155;
        }
        .inv-phases-table tbody tr:last-child td { border-bottom: none; }
        .inv-phases-table tbody tr:hover td { background: #f8fafc; }
        .inv-phase-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 100px;
          font-size: 11px; font-weight: 600;
        }
        .inv-phase-num {
          width: 26px; height: 26px; border-radius: 50%;
          background: ${theme.primaryColor}; color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .inv-progress-wrap {
          background: #e2e8f0; border-radius: 100px;
          height: 6px; width: 100%; overflow: hidden;
        }
        .inv-progress-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg, ${theme.secondaryColor}, #10b981);
          transition: width 0.6s ease;
        }
        .inv-team-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 12px; margin-bottom: 28px;
        }
        .inv-team-card {
          border: 1px solid #e2e8f0; border-radius: 10px;
          padding: 14px 16px; background: #f8fafc;
        }
        .inv-team-card-label {
          font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: #94a3b8; margin-bottom: 5px;
        }
        .inv-team-card-value { font-size: 14px; font-weight: 600; color: #1e293b; }
        .inv-timeline-item {
          display: flex; gap: 14px; margin-bottom: 20px;
        }
        .inv-timeline-dot-wrap {
          display: flex; flex-direction: column; align-items: center;
          flex-shrink: 0;
        }
        .inv-timeline-dot {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor});
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 14px; font-weight: 700; flex-shrink: 0;
        }
        .inv-timeline-line {
          flex: 1; width: 2px; background: #e2e8f0;
          margin-top: 6px; min-height: 20px;
        }
        .inv-timeline-card {
          flex: 1; border: 1px solid #e2e8f0; border-radius: 12px;
          overflow: hidden; transition: box-shadow 0.2s;
        }
        .inv-timeline-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .inv-timeline-card-head {
          padding: 10px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
        }
        .inv-timeline-card-body { padding: 14px 16px; font-size: 13.5px; color: #334155; }
        .inv-attach-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 12px; border-radius: 100px;
          font-size: 12px; font-weight: 500;
          background: #eff6ff; border: 1px solid #bfdbfe;
          color: ${theme.secondaryColor}; cursor: pointer; transition: all 0.15s;
        }
        .inv-attach-btn:hover {
          background: #dbeafe; box-shadow: 0 2px 8px rgba(37,99,235,0.18);
        }
        .inv-phase-filter {
          display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;
        }
        .inv-filter-chip {
          padding: 5px 14px; border-radius: 100px; cursor: pointer;
          font-size: 12px; font-weight: 600; border: 1.5px solid #cbd5e1;
          background: #fff; color: #475569; transition: all 0.15s;
        }
        .inv-filter-chip:hover, .inv-filter-chip.active {
          background: ${theme.primaryColor}; color: #fff; border-color: ${theme.primaryColor};
        }
        .inv-footer {
          padding: 18px 40px; background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 10px;
        }
        .inv-footer-txt { font-size: 12px; color: #94a3b8; }
        @media (max-width: 640px) {
          .inv-header { padding: 12px 16px; }
          .inv-brand-name { font-size: 14px; }
          .inv-brand-logo { height: 34px; }
          .inv-contact-row { justify-content: flex-start; }
          .inv-contact-link { font-size: 11px; padding: 4px 10px; }
          .inv-title-name { font-size: 18px; }
          .inv-status-bar { padding: 12px 20px; }
          .inv-body { padding: 20px 20px; }
          .inv-info-grid { grid-template-columns: 1fr; }
          .inv-info-pane:first-child { border-right: none; border-bottom: 1px solid #e2e8f0; }
          .inv-footer { padding: 14px 20px; }
        }
      `}</style>

      <div className="inv-doc">
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <div className="inv-header">
          <div className="inv-header-inner">
            {/* Left: Company Logo + Name */}
            <div className="inv-brand">
              {site.mainLogo ? (
                <img
                  src={`${BASE_URL}${site.mainLogo}`}
                  alt={site.projectName || 'Logo'}
                  className="inv-brand-logo"
                />
              ) : (
                <div className="inv-brand-icon">
                  <FaProjectDiagram size={22} color="#fff" />
                </div>
              )}
              <div>
                <div className="inv-brand-name">{site.projectName || 'Project Preview'}</div>
                <div className="inv-brand-sub">Official Project Report</div>
              </div>
            </div>

            {/* Right: clickable phone & WhatsApp side by side */}
            <div className="inv-contact-row">
              {site.phone && (
                <a
                  href={`tel:${site.phone.replace(/\s/g, '')}`}
                  className="inv-contact-link"
                  title="Call us"
                >
                  <MdCall size={13} /> {site.phone}
                </a>
              )}
              {site.companyWhatsapp && (
                <a
                  href={`https://wa.me/${site.companyWhatsapp.replace(/[^\d]/g, '')}`}
                  className="inv-contact-link wa"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Chat on WhatsApp"
                >
                  <FaWhatsapp size={13} /> {site.companyWhatsapp}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── STATUS BAR ─────────────────────────────────────────── */}
        <div className="inv-status-bar">
          {project.ProjectStatus &&
            (() => {
              const sc = getSC(statusColor, project.ProjectStatus)
              return (
                <span
                  className="inv-pill"
                  style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}
                >
                  <FaCheckCircle size={11} /> {project.ProjectStatus}
                </span>
              )
            })()}
          {project.ProjectType && (
            <span
              className="inv-pill"
              style={{ background: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd' }}
            >
              <FaCode size={10} /> {project.ProjectType}
            </span>
          )}
          {project.ProjectStartDate && (
            <span
              className="inv-pill"
              style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}
            >
              <FaCalendarAlt size={10} /> Start: {formatDate(project.ProjectStartDate)}
            </span>
          )}
          {project.ProjectEndDate && (
            <span
              className="inv-pill"
              style={{ background: '#fef9c3', color: '#713f12', borderColor: '#fde047' }}
            >
              <FaCalendarAlt size={10} /> Due: {formatDate(project.ProjectEndDate)}
            </span>
          )}
          {phases.length > 0 && (
            <span
              className="inv-pill"
              style={{ background: '#f5f3ff', color: '#5b21b6', borderColor: '#ddd6fe' }}
            >
              <FaLayerGroup size={10} /> {completedPhases}/{phases.length} Phases Done
            </span>
          )}
        </div>

        {/* ── BODY ───────────────────────────────────────────────── */}
        <div className="inv-body">
          {/* ── CLIENT & PROJECT INFO ──────────────────────────────── */}
          <div className="inv-section-title">
            <span>Project &amp; Client Information</span>
          </div>
          <div className="inv-info-grid">
            {/* Left — Project */}
            <div className="inv-info-pane">
              <div className="inv-info-pane-title">Project Details</div>

              {project.ProjectName && (
                <div className="inv-field" style={{ marginBottom: 14 }}>
                  <div className="inv-field-label">Project Name</div>
                  <div className="inv-field-value">{project.ProjectName}</div>
                </div>
              )}

              {project.ProjectDescription && (
                <div className="inv-field">
                  <div className="inv-field-label">Description</div>
                  <div
                    style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.7, marginTop: 4 }}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(project.ProjectDescription),
                    }}
                  />
                </div>
              )}
            </div>
            {/* Right — Client */}
            <div className="inv-info-pane">
              <div className="inv-info-pane-title">Client Details</div>
              {project.ClientName && (
                <div className="inv-field">
                  <div className="inv-field-label">Name</div>
                  <div className="inv-field-value">
                    <FaUser size={12} /> {project.ClientName}
                  </div>
                </div>
              )}
              {project.email && (
                <div className="inv-field">
                  <div className="inv-field-label">Email</div>
                  <div className="inv-field-value">
                    <FaEnvelope size={12} />
                    <a
                      href={`mailto:${project.email}`}
                      style={{ color: 'black', textDecoration: 'none' }}
                    >
                      {project.email}
                    </a>
                  </div>
                </div>
              )}
              {project.mobileNo && (
                <div className="inv-field">
                  <div className="inv-field-label">Phone</div>
                  <div className="inv-field-value">
                    <MdCall size={12} /> {project.mobileNo}
                  </div>
                </div>
              )}
              {(project.city || project.state || project.country) && (
                <div className="inv-field">
                  <div className="inv-field-label">Location</div>
                  <div className="inv-field-value">
                    {[project.city, project.state, project.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}
              {project.address && (
                <div className="inv-field">
                  <div className="inv-field-label">Address</div>
                  <div className="inv-field-value" style={{ fontSize: '13px' }}>
                    {project.address}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── TEAM ──────────────────────────────────────────────── */}
          {(project.AssignedProjectManager ||
            getDeveloperNames(project.AssignedDevelopers || []).length > 0) && (
            <>
              <div className="inv-section-title">
                <span>Team</span>
              </div>
              <div className="inv-team-grid" style={{ marginBottom: '28px' }}>
                {project.AssignedProjectManager && (
                  <div className="inv-team-card">
                    <div className="inv-team-card-label">
                      <FaUser size={9} style={{ marginRight: 4 }} />
                      Project Manager
                    </div>
                    <div className="inv-team-card-value">{project.AssignedProjectManager}</div>
                  </div>
                )}
                {getDeveloperNames(project.AssignedDevelopers || []) && (
                  <div className="inv-team-card">
                    <div className="inv-team-card-label">
                      <FaUsers size={9} style={{ marginRight: 4 }} />
                      Developers
                    </div>
                    <div className="inv-team-card-value" style={{ fontSize: '13px' }}>
                      {getDeveloperNames(project.AssignedDevelopers || [])}
                    </div>
                  </div>
                )}
                {totalDays > 0 && (
                  <div className="inv-team-card">
                    <div className="inv-team-card-label">
                      <FaClock size={9} style={{ marginRight: 4 }} />
                      Total Phase Days
                    </div>
                    <div className="inv-team-card-value">{totalDays} days</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PHASES ────────────────────────────────────────────── */}
          {phases.length > 0 && (
            <>
              <div className="inv-section-title">
                <span>Project Phases</span>
              </div>

              {/* Progress overview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div className="inv-progress-wrap" style={{ flex: 1 }}>
                  <div
                    className="inv-progress-fill"
                    style={{
                      width: `${phases.length ? (completedPhases / phases.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {phases.length ? Math.round((completedPhases / phases.length) * 100) : 0}%
                  complete
                </span>
              </div>

              <div style={{ overflowX: 'auto', borderRadius: 12, marginBottom: 28 }}>
                <table className="inv-phases-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Phase Name</th>
                      <th>Description</th>
                      <th style={{ width: 80 }}>Days</th>
                      <th style={{ width: 120 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phases.map((phase, idx) => {
                      const phaseName =
                        phase.PhaseName || phase.phaseName || phase.name || `Phase ${idx + 1}`
                      const hasPosts =
                        phase.PhaseStatus === 'Completed' ||
                        posts.some((p) => p.phase?.trim() === phaseName?.trim())
                      const isSelected = selectedPhase === phaseName
                      return (
                        <tr
                          key={phase._id || idx}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? '#eff6ff' : undefined,
                          }}
                          onClick={() => setSelectedPhase(isSelected ? null : phaseName)}
                        >
                          <td>
                            <div
                              className="inv-phase-num"
                              style={{
                                background: hasPosts
                                  ? 'linear-gradient(135deg,#10b981,#059669)'
                                  : theme.primaryColor,
                              }}
                            >
                              {hasPosts ? <FaCheckCircle size={11} color="#fff" /> : idx + 1}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{phaseName}</span>
                            {isSelected && (
                              <span
                                style={{
                                  fontSize: 10,
                                  marginLeft: 6,
                                  color: theme.secondaryColor,
                                  fontWeight: 700,
                                }}
                              >
                                ▶
                              </span>
                            )}
                          </td>
                          <td style={{ color: '#64748b' }}>
                            {phase.PhaseDescription || phase.description || '—'}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>
                              {phase.PhaseDays || phase.days || '—'}
                            </span>
                          </td>
                          <td>
                            <span
                              className="inv-phase-badge"
                              style={
                                hasPosts
                                  ? { background: '#d1fae5', color: '#065f46' }
                                  : { background: '#f1f5f9', color: '#64748b' }
                              }
                            >
                              {hasPosts ? <FaCheckCircle size={10} /> : <FaClock size={10} />}
                              {phase.PhaseStatus === 'Completed'
                                ? 'Completed'
                                : hasPosts
                                  ? 'Updates Added'
                                  : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── TIMELINE ──────────────────────────────────────────── */}
          <div className="inv-section-title">
            <span>Developer Progress Updates</span>
          </div>

          {/* Phase filter chips */}
          {phases.length > 0 && (
            <div className="inv-phase-filter">
              <button
                className={`inv-filter-chip${!selectedPhase ? ' active' : ''}`}
                onClick={() => setSelectedPhase(null)}
              >
                All Updates
              </button>
              {phases.map((ph, idx) => {
                const pn = ph.PhaseName || ph.phaseName || ph.name || `Phase ${idx + 1}`
                return (
                  <button
                    key={idx}
                    className={`inv-filter-chip${selectedPhase === pn ? ' active' : ''}`}
                    onClick={() => setSelectedPhase(selectedPhase === pn ? null : pn)}
                  >
                    {pn}
                  </button>
                )
              })}
            </div>
          )}

          {filteredPosts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 20px',
                color: '#94a3b8',
                background: '#f8fafc',
                borderRadius: 12,
                border: '1px dashed #cbd5e1',
                marginBottom: 28,
              }}
            >
              <FaLayerGroup size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No updates posted yet.</p>
            </div>
          ) : (
            <div style={{ marginBottom: 28 }}>
              {filteredPosts.map((post, postIdx) => (
                <div className="inv-timeline-item" key={post.id}>
                  <div className="inv-timeline-dot-wrap">
                    <div className="inv-timeline-dot">
                      {post.developer.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    {postIdx < filteredPosts.length - 1 && <div className="inv-timeline-line" />}
                  </div>
                  <div className="inv-timeline-card">
                    <div className="inv-timeline-card-head">
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: '#1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {post.developer.name}
                        {post.isAdmin && <MdVerified size={14} color="#2563eb" title="Admin" />}
                      </span>
                      {post.phase && (
                        <span
                          className="inv-phase-badge"
                          style={{ background: '#eff6ff', color: theme.secondaryColor }}
                        >
                          <FaLayerGroup size={9} /> {post.phase}
                        </span>
                      )}
                      {post.module && (
                        <span
                          className="inv-phase-badge"
                          style={{ background: '#f0fdf4', color: '#15803d' }}
                        >
                          <FaCode size={9} /> {post.module}
                        </span>
                      )}
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: 11,
                          color: '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <FaClock size={10} />
                        {formatTimeAgo(post.edited ? post.updatedAt : post.createdAt)}
                        {post.edited && (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}> · Edited</span>
                        )}
                      </span>
                    </div>
                    <div className="inv-timeline-card-body">
                      <div
                        style={{ lineHeight: 1.7 }}
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
                      />
                      {post.images.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                          {post.images.map((img, idx) => (
                            <button
                              key={idx}
                              className="inv-attach-btn"
                              onClick={() => setLightboxImg(img)}
                            >
                              <FaPaperclip size={11} />
                              Attachment {post.images.length > 1 ? idx + 1 : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────── */}
        <div className="inv-footer">
          <span className="inv-footer-txt">
            Project ID: <strong>{project.ProjectId || project.slug || '—'}</strong>
          </span>
          <span className="inv-footer-txt">
            Generated on{' '}
            {new Date().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Attachment Lightbox */}
      {lightboxImg && (
        <AttachmentLightbox image={lightboxImg} onClose={() => setLightboxImg(null)} />
      )}
    </div>
  )
}

export default ProjectPreview
