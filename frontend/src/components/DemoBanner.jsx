import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Cookies from 'js-cookie'

const DemoBanner = () => {
  const navigate = useNavigate()
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    const demoInSession = sessionStorage.getItem('isDemoMode') === 'true'
    const demoInCookie = Cookies.get('isDemoMode') === 'true'
    setIsDemo(demoInSession || demoInCookie)
  }, [])

  if (!isDemo) return null

  const handleExitDemo = () => {
    sessionStorage.removeItem('isDemoMode')
    Cookies.remove('isDemoMode')
    Cookies.remove('token')
    window.location.href = '/'
  }

  const handleStartTrial = () => {
    sessionStorage.removeItem('isDemoMode')
    Cookies.remove('isDemoMode')
    Cookies.remove('token')
    navigate('/register')
  }

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #111827 0%, #1F2937 60%, #E05E3A 160%)',
        color: '#FFFFFF',
        padding: '8px 16px',
        fontSize: '13px',
        borderBottom: '1px solid rgba(224, 94, 58, 0.4)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
        position: 'sticky',
        top: 0,
        zIndex: 1050,
      }}
    >
      <div className="container-lg d-flex flex-wrap justify-content-between align-items-center gap-2 p-0">
        <div className="d-flex align-items-center gap-2">
          <span
            style={{
              backgroundColor: '#E05E3A',
              color: '#FFFFFF',
              borderRadius: '4px',
              padding: '1px 6px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Live Demo
          </span>
          <span style={{ color: '#F3F4F6' }}>
            You are exploring the <strong>Acme Digital Agency</strong> sandbox with sample pipeline data.
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            onClick={handleStartTrial}
            style={{
              backgroundColor: '#E05E3A',
              border: 'none',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '12px',
              padding: '4px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C84D2B')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E05E3A')}
          >
            Start 14-Day Free Trial
          </button>
          <button
            type="button"
            onClick={handleExitDemo}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#F9FAFB',
              fontWeight: 500,
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)')}
          >
            Exit Demo
          </button>
        </div>
      </div>
    </div>
  )
}

export default DemoBanner
