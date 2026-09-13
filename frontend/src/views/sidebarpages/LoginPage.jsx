import React, { useEffect, useState } from 'react'
import { Container, Form, Button, InputGroup } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.min.css'
import { FaEyeSlash, FaEye } from 'react-icons/fa'
import logo from '../../assets/images/bh_login_logo.jpg'
import Cookies from 'js-cookie'
import AndriodImg from '../../assets/images/download-app.png'
import apiClient, { BASE_URL } from '../../api/axiosClient'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import '../sidebarCSS/login.css'

const LoginPage = () => {
  const [user, setUser] = useState({
    userName: '',
    password: '',
  })
  const [error, setError] = useState({})

  const [showPassword, setShowPassword] = useState(false)
  const togglePasswordVisibility = () => setShowPassword((prev) => !prev)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [siteSetting, setSiteSetting] = useState(null)

  const getSiteSetting = async () => {
    try {
      const response = await apiClient.get('/software-setting/get-site-setting')
      const data = response?.data?.data
      setSiteSetting(data)

      // Update browser tab favicon on login page too
      if (data?.favicon) {
        const faviconUrl = `${BASE_URL}${data.favicon}`
        let link = document.querySelector("link[rel='shortcut icon']")
        if (!link) {
          link = document.createElement('link')
          link.rel = 'shortcut icon'
          document.head.appendChild(link)
        }
        link.href = faviconUrl
        localStorage.setItem('bh_favicon_url', faviconUrl)
      }
    } catch (error) {}
  }

  useEffect(() => {
    getSiteSetting()
  }, [])

  let mainLogo = siteSetting?.mainLogo ? `${BASE_URL}${siteSetting?.mainLogo}` : logo

  //handleLogin
  const handleLogin = async () => {
    try {
      let newErrors = {}
      if (!user.userName) newErrors.userName = 'Please enter user name'
      if (!user.password) newErrors.password = 'Please enter password'

      if (Object.keys(newErrors).length > 0) {
        setError(newErrors)
        return
      }

      const response = await apiClient.post('/user/login-by-pass', user)
      Cookies.set('token', response.data.token, { expires: 365 * 20 })

      toast.success(response.data.message || 'Login Success')

      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)
    } catch (error) {
      toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLogin()
    }
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()

    const choiceResult = await deferredPrompt.userChoice
    if (choiceResult.outcome === 'accepted') {
    } else {
    }

    setDeferredPrompt(null)
    setShowInstallButton(false)
  }
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  return (
    <div className="min-vh-100 d-flex flex-column flex-md-row">
      {/* Left side for desktop view */}
      <div className="leftDiv d-none d-md-flex justify-content-center align-items-center w-50 p-4">
        <img className="login-img" src={mainLogo} alt="BigHost CRM" />
      </div>

      {/* Right side for form */}
      <Container className="d-flex align-items-center justify-content-center w-100 bg-light">
        <div
          className="rightInnerDiv p-4 p-md-5 shadow bg-white rounded w-100"
          style={{ maxWidth: '500px' }}
        >
          <h4 className="fw-bold mb-0">Login</h4>
          <p className="text-muted">Welcome back! Log in to your CRM portal.</p>

          <Form>
            <Form.Group controlId="formMobileNumber" className="mb-3">
              <Form.Label>Enter Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter username"
                name="username"
                value={user.userName}
                onChange={(e) => {
                  setUser({ ...user, userName: e.target.value.trim() })
                  setError({ ...error, userName: '' })
                }}
                onKeyPress={handleKeyPress}
              />
              {error.userName && (
                <span style={{ color: 'red', fontSize: '12px' }}>{error.userName}</span>
              )}
            </Form.Group>

            <Form.Group controlId="password" className="mb-2">
              <Form.Label>Enter Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  name="password"
                  value={user.password}
                  onChange={(e) => {
                    setUser({ ...user, password: e.target.value.trim() })
                    setError({ ...error, password: '' })
                  }}
                  onKeyPress={handleKeyPress}
                />
                <InputGroup.Text onClick={togglePasswordVisibility} style={{ cursor: 'pointer' }}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </InputGroup.Text>
              </InputGroup>
              {error.password && (
                <span style={{ color: 'red', fontSize: '12px' }}>{error.password}</span>
              )}
            </Form.Group>

            <div className="d-grid gap-2">
              <Button className="button" onClick={handleLogin}>
                Login
              </Button>
            </div>

            <div className="text-center mt-3">
              <span>Forgot Password? </span>
              <Link to="/forgot-password" className="text-primary fw-bold me-3">
                Click Here
              </Link>
            </div>

            <div className="text-center mt-2">
              <span className="text-muted">Don't have an account? </span>
              <Link to="/register" className="text-primary fw-bold">
                Register Free Trial
              </Link>
            </div>

            <hr />
          </Form>

          {showInstallButton && (
            <div className="text-center mt-2">
              <img
                src={AndriodImg}
                alt=""
                loading="lazy"
                style={{
                  width: '70px',
                  marginRight: '0px',
                  zIndex: '1000',
                  position: 'relative',
                }}
              />
              <Button
                variant="dark"
                onClick={handleInstallClick}
                className="mt-2 fw-semibold"
                style={{
                  padding: '6px 10px',
                  marginLeft: '-30px',
                  zIndex: '-1',
                  paddingLeft: '20px',
                  fontSize: '14px',
                  lineHeight: '13px',
                }}
              >
                Download the <br />
                <span style={{ fontSize: '14px', fontWeight: '700', marginTop: '10px' }}>
                  App Now!
                </span>
              </Button>
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

export default LoginPage
