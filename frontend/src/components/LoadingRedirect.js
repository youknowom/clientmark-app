import React, { useEffect, useState, useContext } from 'react'
import { Navigate } from 'react-router-dom'
import Loader from './mycomponent/Loader' // fixed path
import { AuthContext } from '../AuthContext'

const LoadingRedirect = () => {
  const { token } = useContext(AuthContext)

  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRedirect(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  if (!shouldRedirect) return <Loader />

  return token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
}

export default LoadingRedirect
