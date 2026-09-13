import { useEffect, useContext, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Cookies from 'js-cookie'
import apiClient from './api/axiosClient'
import { AuthContext } from './AuthContext'

const ProtectedRoute = ({ children }) => {
  const token = Cookies.get('token')
  const navigate = useNavigate()
  const { userData, setUserData } = useContext(AuthContext)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    const fetchUser = async () => {
      try {
        const res = await apiClient.get('/user/get-login-user-detail')
        setUserData(res.data.data)
      } catch (err) {
        setUserData(null)
        navigate('/login', { replace: true })
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [token])

  if (loading) return null

  if (!userData) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
