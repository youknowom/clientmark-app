import React, { useRef, useState, useContext, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CContainer, CHeader, CHeaderToggler } from '@coreui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import Cookies from 'js-cookie'
import { HiArrowUturnLeft } from 'react-icons/hi2'
import { FiLogOut, FiUser, FiChevronDown } from 'react-icons/fi'
import { AuthContext } from '../AuthContext'
import NotificationPanel from '../views/sidebarpages/NotificationsPanel'
import { useSocket } from '../SocketContext'

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
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
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
              background: '#FFFFFF',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#4B5563',
              transition: 'border-color 0.15s, color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#111827'
              e.currentTarget.style.color = '#111827'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'
              e.currentTarget.style.color = '#4B5563'
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
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '8px',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#4B5563',
                transition: 'border-color 0.15s, color 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#111827'
                e.currentTarget.style.color = '#111827'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'
                e.currentTarget.style.color = '#4B5563'
              }}
            >
              <HiArrowUturnLeft size={15} />
            </button>
          )}
        </div>

        {/* ── Right side ──────────────────────────────────────────────────── */}
        <div className="d-flex align-items-center gap-2">
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
                background: dropdownOpen ? '#F4F4F1' : '#FFFFFF',
                border: '1px solid',
                borderColor: dropdownOpen ? '#111827' : 'rgba(0, 0, 0, 0.08)',
                borderRadius: '9999px',
                padding: '4px 12px 4px 6px',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                height: '34px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
              }}
              onMouseEnter={(e) => {
                if (!dropdownOpen) e.currentTarget.style.background = '#F4F4F1'
              }}
              onMouseLeave={(e) => {
                if (!dropdownOpen) e.currentTarget.style.background = '#FFFFFF'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '24px', height: '24px',
                borderRadius: '50%',
                background: '#111827',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', fontSize: '10px', fontWeight: '700',
                flexShrink: 0,
              }}>
                {userData?.fullName?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {!isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                    {userData?.fullName || 'User'}
                  </span>
                  <span style={{ fontSize: '10.5px', color: '#6B7280', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
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
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
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
                    cursor: 'pointer', fontSize: '13px', color: '#374151',
                    fontFamily: 'inherit', fontWeight: '500',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F5F5F2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <FiUser size={14} style={{ color: '#9CA3AF' }} />
                  Update Profile
                </button>

                <div style={{ height: '1px', background: 'rgba(0, 0, 0, 0.06)', margin: '4px 0' }} />

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
    </CHeader>
  )
}

export default AppHeader
