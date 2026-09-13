import { createContext, useState } from 'react'
import Cookies from 'js-cookie'

export const AuthContext = createContext(null)

const AuthProvider = ({ children }) => {
  const token = Cookies.get('token')
  const [userData, setUserData] = useState(null)
  const [siteSetting, setSiteSetting] = useState({})

  const logout = () => {
    Cookies.remove('token')
    setUserData(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider
      value={{ token, userData, setUserData, logout, siteSetting, setSiteSetting }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
