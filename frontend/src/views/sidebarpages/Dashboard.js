import React, { useEffect, useContext, Suspense, memo, useState } from 'react'
import { Helmet } from 'react-helmet'
import { AuthContext } from '../../AuthContext'
import { Navigate } from 'react-router-dom'
import DeveloperDashboard from './DeveloperDashboard'
import TeleCallerDashboard from './TeleCallerDashboard'
import BDEDashboard from './BDEDashboard'

// Lazy imports
const AdminDashboard = React.lazy(() => import('./AdminDashboard'))

// Lightweight fallback
const SuspenseFallback = memo(() => (
  <div className="text-center p-5">
    <div className="spinner-border text-danger" role="status"></div>
  </div>
))

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

  // 🔐 Permission denied → redirect
  if (checked && notAllowed) {
    return <Navigate to="/pagenotfound" replace />
  }

  return (
    <>
      <Helmet>
        <title>BH - Home</title>
      </Helmet>

      <Suspense fallback={<SuspenseFallback />}>
        {DashboardComponent ? <DashboardComponent /> : <SuspenseFallback />}
      </Suspense>
    </>
  )
}

export default HomePage
