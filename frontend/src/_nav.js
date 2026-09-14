import React, { useContext } from 'react'
import { AuthContext } from './AuthContext'
import { CNavItem } from '@coreui/react'
import {
  FiHome,
  FiInbox,
  FiFolder,
  FiUsers,
  FiBarChart2,
  FiSettings,
} from 'react-icons/fi'
import { hasPermission } from './helpers/hasPermission'

// Clean, consistent SaaS navigation icons (Feather family)
const fullNavItems = [
  {
    component: CNavItem,
    name: 'Home',
    to: '/dashboard',
    icon: <FiHome className="nav-icon" />,
    permission: 'view:dashboard-master',
  },
  {
    component: CNavItem,
    name: 'Leads',
    to: '/lead-master',
    icon: <FiInbox className="nav-icon" />,
    permission: 'view:lead-master',
  },
  {
    component: CNavItem,
    name: 'Projects',
    to: '/project-master',
    icon: <FiFolder className="nav-icon" />,
    permission: 'view:project-master',
  },
  {
    component: CNavItem,
    name: 'Users',
    to: '/user-master',
    icon: <FiUsers className="nav-icon" />,
    permission: 'view:user-master',
  },
  {
    component: CNavItem,
    name: 'Reports',
    to: '/report-master',
    icon: <FiBarChart2 className="nav-icon" />,
    permission: 'view:report-master',
  },
  {
    component: CNavItem,
    name: 'Settings',
    to: '/setting-master',
    icon: <FiSettings className="nav-icon" />,
    permission: 'view:setting-master',
  },
]

// Permission-based filtering
const filterNavItems = (items, user) =>
  items.filter((item) => {
    if (!item.permission) return true
    return hasPermission(user, item.permission)
  })

const useNavItems = () => {
  const { userData } = useContext(AuthContext)
  return filterNavItems(fullNavItems, userData)
}

export default useNavItems
