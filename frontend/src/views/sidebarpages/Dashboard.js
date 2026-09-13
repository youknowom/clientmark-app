import React, { useEffect, useContext, Suspense, memo, useState } from 'react'
import { Helmet } from 'react-helmet'
import { AuthContext } from '../../AuthContext'
import { Navigate } from 'react-router-dom'
import DeveloperDashboard from './DeveloperDashboard'
import TeleCallerDashboard from './TeleCallerDashboard'
import BDEDashboard from './BDEDashboard'

// Lazy imports
const AdminDashboard = React.lazy(() => import('./AdminDashboard'))

// Loading fallback
const SuspenseFallback = memo(() => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 20px',
      flexDirection: 'column',
      gap: '14px',
    }}
  >
    <div
      style={{
        width: '28px',
        height: '28px',
        border: '2.5px solid #E8E8E5',
        borderTopColor: 'var(--primary-color, #1A1F36)',
        borderRadius: '50%',
        animation: 'cm-spin 0.7s linear infinite',
      }}
    />
    <style>{`@keyframes cm-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
))
SuspenseFallback.displayName = 'SuspenseFallback'

const HomePage = () => {
  const { userData } = useContext(AuthContext)
  const [DashboardComponent, setDashboardComponent] = useState(null)
  const [checked, setChecked] = useState(false)
  const [notAllowed, setNotAllowed] = useState(false)

  useEffect(() => {
    if (!userData) return
    if (userData.roleId.roleName === 'Admin') {
      setDashboardComponent(() => AdminDashboard)
    } else if (userData.roleId.roleName === 'TeleCaller') {
      setDashboardComponent(() => TeleCallerDashboard)
    } else if (userData.roleId.roleName === 'Developer') {
      setDashboardComponent(() => DeveloperDashboard)
    } else if (userData.roleId.roleName === 'BDE') {
      setDashboardComponent(() => BDEDashboard)
    } else {
      setNotAllowed(true)
    }
    setChecked(true)
  }, [userData])

  if (checked && notAllowed) {
    return <Navigate to="/pagenotfound" replace />
  }

  return (
    <>
      <Helmet>
        <title>Dashboard — Clientmark</title>
      </Helmet>

      <Suspense fallback={<SuspenseFallback />}>
        {DashboardComponent ? <DashboardComponent /> : <SuspenseFallback />}
      </Suspense>
    </>
  )
}

export default HomePage
