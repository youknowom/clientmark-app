import React, { useRef, useState, useContext, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CContainer, CHeader, CHeaderToggler } from '@coreui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import Cookies from 'js-cookie'
import { Button } from 'react-bootstrap'
import { HiArrowUturnLeft } from 'react-icons/hi2'
import { IoIosArrowDown } from 'react-icons/io'
import { FiLogOut } from 'react-icons/fi'
import { CgProfile } from 'react-icons/cg'
import { GiHamburgerMenu } from 'react-icons/gi'
import Dropdown from 'react-bootstrap/Dropdown'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min'
import { AuthContext } from '../AuthContext'
import NotificationPanel from '../views/sidebarpages/NotificationsPanel'
import { useSocket } from '../SocketContext'

const AppHeader = () => {
  const navigate = useNavigate()
  const socket = useSocket()
  const location = useLocation()
  const { userData } = useContext(AuthContext)
  const headerRef = useRef()
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const [isMobile, setIsMobile] = useState(false)

  const handleLogout = () => {
    Cookies.remove('token')
    localStorage.clear()
    navigate('/login')
  }

  React.useEffect(() => {
    const onScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }

    const handleResize = () => setIsMobile(window.innerWidth <= 767)

    handleResize()
    window.addEventListener('resize', handleResize)
    document.addEventListener('scroll', onScroll)

    return () => {
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <CHeader
      position="sticky"
      className="mb-0 p-0"
      ref={headerRef}
      style={{ boxShadow: 'rgba(0,0,0,0.1) 0px 2px 2px' }}
    >
      <CContainer className="px-4 d-flex justify-content-between align-items-center" fluid>
        {/* Left Side */}
        <div className="d-flex align-items-center">
          <CHeaderToggler
            onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
            style={{
              marginInlineStart: '-14px',
              borderRadius: '50%',
              background: '#f1f6f9',
            }}
          >
            <GiHamburgerMenu />
          </CHeaderToggler>

          {location.pathname !== '/dashboard' && (
            <Button
              onClick={() => navigate(-1)}
              className="d-md-flex align-items-center ms-2 p-1"
              style={{ backgroundColor: '#fff', border: 'none', color: '#000' }}
            >
              <HiArrowUturnLeft size={20} />
            </Button>
          )}
        </div>

        {/* Right Side */}
        <div className="d-flex align-items-center gap-3">
          {/* 👇 All notification logic now lives here */}
          <NotificationPanel />

          {/* Profile Dropdown */}
          <Dropdown align="end">
            <Dropdown.Toggle
              as="div"
              style={{
                background: 'transparent',
                border: 'none',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              {!isMobile && (
                <>
                  <span className="me-1">{userData?.fullName}</span>
                  <span className="text-muted" style={{ fontSize: '12px' }}>
                    ({userData?.roleId?.roleName})
                  </span>
                </>
              )}
              <IoIosArrowDown className="ms-1" />
            </Dropdown.Toggle>

            <Dropdown.Menu className="shadow">
              <Dropdown.Item onClick={() => navigate('/user-profile')}>
                <CgProfile className="me-2" /> Update Profile
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleLogout}>
                <FiLogOut className="me-2" /> Logout
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
