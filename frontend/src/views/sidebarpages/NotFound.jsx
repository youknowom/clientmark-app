import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', 'Noto Sans', -apple-system, sans-serif",
        backgroundColor: '#FAFAF8',
        padding: '24px',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '440px' }}>
        {/* Brand mark */}
        <div
          style={{
            width: '48px',
            height: '48px',
            background: '#1A1F36',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L2 7l10 5 10-5-10-5zm0 7L2 14l10 5 10-5-10-5z" />
          </svg>
        </div>

        {/* 404 number */}
        <div
          style={{
            fontSize: '5rem',
            fontWeight: '900',
            color: '#E8E8E5',
            lineHeight: 1,
            letterSpacing: '-0.05em',
            marginBottom: '16px',
            fontFeatureSettings: '"tnum"',
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#0F0F0F',
            letterSpacing: '-0.02em',
            marginBottom: '10px',
          }}
        >
          Page not found
        </h1>

        <p
          style={{
            fontSize: '14.5px',
            color: '#6B7280',
            lineHeight: 1.65,
            marginBottom: '32px',
          }}
        >
          The page you're looking for doesn't exist or may have been moved.
          Check the URL or go back to the dashboard.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '9px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              background: '#FFFFFF',
              border: '1px solid #E8E8E5',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1A1F36'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E8E8E5'}
          >
            ← Go back
          </button>

          <Link
            to="/dashboard"
            style={{
              padding: '9px 20px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#FFFFFF',
              background: '#1A1F36',
              border: '1px solid #1A1F36',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#2D3561'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#1A1F36'}
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
