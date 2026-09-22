import React, { useRef, useState, useContext, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CContainer, CHeader, CHeaderToggler } from '@coreui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import Cookies from 'js-cookie'
import { HiArrowUturnLeft } from 'react-icons/hi2'
import { FiLogOut, FiUser, FiChevronDown, FiCreditCard } from 'react-icons/fi'
import { AuthContext } from '../AuthContext'
import NotificationPanel from '../views/sidebarpages/NotificationsPanel'
import { useSocket } from '../SocketContext'
import SetupGuide from './SetupGuide'
import OnboardingWizard from './OnboardingWizard'
import '../views/sidebarCSS/setupGuide.css'

// ─── Sidebar toggle icon ───────────────────────────────────────────────────────
const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

const AppHeader = () => {
  const navigate = useNavigate()
  const socket = useSocket()
  const location = useLocation()
  const { userData } = useContext(AuthContext)
  const headerRef = useRef()
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const [isMobile, setIsMobile] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showSetupDrawer, setShowSetupDrawer] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const dropdownRef = useRef()

  const handleLogout = () => {
    Cookies.remove('token')
    localStorage.clear()
    navigate('/login')
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false)
  }, [location.pathname])

  return (
    <CHeader
      position="sticky"
      className="mb-0 p-0"
      ref={headerRef}
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E8E8E5',
        boxShadow: 'none',
        zIndex: 1030,
      }}
    >
      <CContainer className="px-3 d-flex justify-content-between align-items-center" fluid style={{ height: '56px' }}>
        {/* ── Left side ───────────────────────────────────────────────────── */}
        <div className="d-flex align-items-center gap-2">
          {/* Sidebar toggle */}
          <button
            onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
            aria-label="Toggle sidebar"
            style={{
              background: 'none',
              border: '1px solid #E8E8E5',
              borderRadius: '7px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#6B7280',
              transition: 'border-color 0.15s, color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1A1F36'
              e.currentTarget.style.color = '#1A1F36'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E8E8E5'
              e.currentTarget.style.color = '#6B7280'
            }}
          >
            <MenuIcon />
          </button>

          {/* Back button — shown on non-dashboard pages */}
          {location.pathname !== '/dashboard' && (
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              style={{
                background: 'none',
                border: '1px solid #E8E8E5',
                borderRadius: '7px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6B7280',
                transition: 'border-color 0.15s, color 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1A1F36'
                e.currentTarget.style.color = '#1A1F36'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E8E8E5'
                e.currentTarget.style.color = '#6B7280'
              }}
            >
              <HiArrowUturnLeft size={15} />
            </button>
          )}
        </div>

        {/* ── Right side ──────────────────────────────────────────────────── */}
        <div className="d-flex align-items-center gap-2">
          {/* HubSpot-style Setup Guide Button */}
          <button
            className="hubspot-header-badge-btn"
            onClick={() => setShowSetupDrawer(true)}
            title="Open Setup Guide"
          >
            <span className="hubspot-header-badge-dot" />
            <span className="d-none d-sm-inline">Setup Guide</span>
          </button>

          {/* Notifications */}
          <NotificationPanel />

          {/* Profile dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label="User menu"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: dropdownOpen ? '#F5F5F3' : 'none',
                border: '1px solid',
                borderColor: dropdownOpen ? '#D0D0CC' : '#E8E8E5',
                borderRadius: '8px',
                padding: '5px 10px 5px 8px',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                height: '34px',
              }}
              onMouseEnter={(e) => {
                if (!dropdownOpen) e.currentTarget.style.background = '#F8F8F6'
              }}
              onMouseLeave={(e) => {
                if (!dropdownOpen) e.currentTarget.style.background = 'none'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '22px', height: '22px',
                borderRadius: '50%',
                background: 'var(--primary-color, #1A1F36)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', fontSize: '10px', fontWeight: '700',
                flexShrink: 0,
              }}>
                {userData?.fullName?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {!isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F0F0F', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                    {userData?.fullName || 'User'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                    {userData?.roleId?.roleName || ''}
                  </span>
                </div>
              )}

              <FiChevronDown
                size={12}
                style={{
                  color: '#9CA3AF',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  flexShrink: 0,
                }}
              />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  minWidth: '180px',
                  background: '#FFFFFF',
                  border: '1px solid #E8E8E5',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                  padding: '4px',
                  zIndex: 9999,
                }}
                role="menu"
              >
                <button
                  role="menuitem"
                  onClick={() => { navigate('/user-profile'); setDropdownOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '9px',
                    width: '100%', padding: '8px 10px',
                    background: 'none', border: 'none', borderRadius: '7px',
                    cursor: 'pointer', fontSize: '13.5px', color: '#374151',
                    fontFamily: 'inherit', fontWeight: '500',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <FiUser size={14} style={{ color: '#9CA3AF' }} />
                  Update Profile
                </button>

                <button
                  role="menuitem"
                  onClick={() => { navigate('/billing'); setDropdownOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '9px',
                    width: '100%', padding: '8px 10px',
                    background: 'none', border: 'none', borderRadius: '7px',
                    cursor: 'pointer', fontSize: '13.5px', color: '#374151',
                    fontFamily: 'inherit', fontWeight: '500',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F3'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <FiCreditCard size={14} style={{ color: '#9CA3AF' }} />
                  Billing & Plans
                </button>

                <div style={{ height: '1px', background: '#F0F0ED', margin: '4px 0' }} />

                <button
                  role="menuitem"
                  onClick={handleLogout}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '9px',
                    width: '100%', padding: '8px 10px',
                    background: 'none', border: 'none', borderRadius: '7px',
                    cursor: 'pointer', fontSize: '13.5px', color: '#DC2626',
                    fontFamily: 'inherit', fontWeight: '500',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#FEF2F2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <FiLogOut size={14} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </CContainer>

      {/* HubSpot-style Slide-out Setup Guide Drawer */}
      <SetupGuide
        mode="drawer"
        isOpen={showSetupDrawer}
        onClose={() => setShowSetupDrawer(false)}
        onLaunchWizard={() => {
          setShowSetupDrawer(false)
          setShowWizard(true)
        }}
      />

      <OnboardingWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={() => setShowWizard(false)}
      />
    </CHeader>
  )
}

export default AppHeader
