import { Navigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from './AuthContext'
import { hasPermission } from './helpers/hasPermission'

const PermissionRoute = ({ permission, children }) => {
  const { userData } = useContext(AuthContext)

  // If no permission required for this route, allow access
  if (!permission) return children

  if (!hasPermission(userData, permission)) {
    return <Navigate to="/pagenotfound" replace />
  }

  return children
}

export default PermissionRoute
