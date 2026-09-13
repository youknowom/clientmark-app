import React, { Suspense, memo } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import ProtectedRoute from './ProtectedRoute'
import AuthProvider from './AuthContext'
import { SocketProvider } from './SocketContext'

// Lazy load pages
const Landing = React.lazy(() => import('./views/sidebarpages/LandingPage'))
const Register = React.lazy(() => import('./views/sidebarpages/RegisterPage'))
const Login = React.lazy(() => import('./views/sidebarpages/LoginPage'))
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))
const ProjectPreview = React.lazy(() => import('./views/sidebarpages/ProjectPreview'))
const NotFound = React.lazy(() => import('./views/sidebarpages/NotFound'))
const ForgotPass = React.lazy(() => import('./views/sidebarpages/ForgotPass'))

import './scss/style.scss'

// Lightweight fallback
const SuspenseFallback = memo(() => (
  <div className="text-center p-5">
    <div className="spinner-border text-primary" role="status"></div>
  </div>
))

const App = () => {
  return (
    <>
      <BrowserRouter>
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

              {/* Project Preview without sidebar/header */}
              <Route
                path="/project-preview/:slug"
                element={
                  <Suspense fallback={<SuspenseFallback />}>
                    <ProjectPreview />
                  </Suspense>
                }
              />

              {/* All other protected routes with DefaultLayout */}
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
      </BrowserRouter>

      {/* Toast Notification */}
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
    </>
  )
}

export default App
