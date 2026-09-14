import { createContext, useState } from 'react'
import Cookies from 'js-cookie'
import { resetToDefaultFavicon } from './helpers/dynamicFavicon'

export const AuthContext = createContext(null)

const AuthProvider = ({ children }) => {
  const token = Cookies.get('token')
  const [userData, setUserData] = useState(null)
  const [siteSetting, setSiteSetting] = useState({})

  const logout = () => {
    Cookies.remove('token')
    sessionStorage.clear()
    try {
      localStorage.removeItem('cm_custom_favicon')
      localStorage.removeItem('cm_site_setting')
      localStorage.removeItem('bh_favicon_url')
      localStorage.removeItem('theme')
      localStorage.removeItem('adminDashboardView')
    } catch (e) {}
    resetToDefaultFavicon()
    setUserData(null)
    setSiteSetting({})
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
