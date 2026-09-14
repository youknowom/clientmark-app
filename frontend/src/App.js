import React, { Suspense, memo, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { resetToDefaultFavicon, applyTenantFavicon, STORAGE_KEY, LEGACY_STORAGE_KEY } from './helpers/dynamicFavicon'

import ProtectedRoute from './ProtectedRoute'
import AuthProvider from './AuthContext'
import { SocketProvider } from './SocketContext'
import { ThemeProvider } from './views/sidebarpages/ThemeContext'
import { Analytics } from '@vercel/analytics/react'

// Lazy load pages
const Landing = React.lazy(() => import('./views/sidebarpages/LandingPage'))
const Register = React.lazy(() => import('./views/sidebarpages/RegisterPage'))
const Login = React.lazy(() => import('./views/sidebarpages/LoginPage'))
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))
const ProjectPreview = React.lazy(() => import('./views/sidebarpages/ProjectPreview'))
const NotFound = React.lazy(() => import('./views/sidebarpages/NotFound'))
const ForgotPass = React.lazy(() => import('./views/sidebarpages/ForgotPass'))

import './scss/style.scss'

// Loading fallback — minimal, branded
const SuspenseFallback = memo(() => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#FAFAF8',
    }}
  >
    <div
      style={{
        width: '28px',
        height: '28px',
        border: '2.5px solid #E8E8E5',
        borderTopColor: '#1A1F36',
        borderRadius: '50%',
        animation: 'cm-global-spin 0.7s linear infinite',
      }}
    />
    <style>{`@keyframes cm-global-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
))
SuspenseFallback.displayName = 'SuspenseFallback'

// Favicon switcher:
// Landing page (/) ALWAYS shows the OG Clientmark favicon.
// Dashboards and app routes show the buyer's custom logo/favicon if configured.
const FaviconRouteSync = () => {
  const location = useLocation()

  useEffect(() => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/'
    if (pathname === '/') {
      resetToDefaultFavicon()
    } else {
      const saved =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(LEGACY_STORAGE_KEY)
      if (saved) {
        applyTenantFavicon(saved)
      } else {
        resetToDefaultFavicon()
      }
    }
  }, [location.pathname])

  return null
}

const App = () => {
  return (
    <>
      <BrowserRouter>
        <FaviconRouteSync />
        <ThemeProvider>
          <SocketProvider>
            <AuthProvider>
              <Routes>
                {/* Public Marketing Landing Page */}
                <Route
                  path="/"
                  element={
                    <Suspense fallback={<SuspenseFallback />}>
                      <Landing />
                    </Suspense>
                  }
                />

                {/* Public Registration Page */}
                <Route
                  path="/register"
                  element={
                    <Suspense fallback={<SuspenseFallback />}>
                      <Register />
                    </Suspense>
                  }
                />

                {/* Public Login Page */}
                <Route
                  path="/login"
                  element={
                    <Suspense fallback={<SuspenseFallback />}>
                      <Login />
                    </Suspense>
                  }
                />

                {/* Forgot Password */}
                <Route
                  path="/forgot-password"
                  element={
                    <Suspense fallback={<SuspenseFallback />}>
                      <ForgotPass />
                    </Suspense>
                  }
                />

                {/* Page Not Found */}
                <Route
                  path="/pagenotfound"
                  element={
                    <Suspense fallback={<SuspenseFallback />}>
                      <NotFound />
                    </Suspense>
                  }
                />

                {/* Project Preview — no sidebar/header */}
                <Route
                  path="/project-preview/:slug"
                  element={
                    <Suspense fallback={<SuspenseFallback />}>
                      <ProjectPreview />
                    </Suspense>
                  }
                />

                {/* All protected routes with DefaultLayout */}
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<SuspenseFallback />}>
                        <DefaultLayout />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AuthProvider>
          </SocketProvider>
        </ThemeProvider>
      </BrowserRouter>

      {/* Vercel Analytics */}
      <Analytics />

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: "'Inter', 'Noto Sans', sans-serif",
            fontSize: '13.5px',
            borderRadius: '8px',
            border: '1px solid #E8E8E5',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          },
          success: {
            iconTheme: { primary: '#16A34A', secondary: '#FFFFFF' },
          },
          error: {
            iconTheme: { primary: '#DC2626', secondary: '#FFFFFF' },
          },
        }}
      />
    </>
  )
}

export default App
