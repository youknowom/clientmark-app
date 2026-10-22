import React, { useContext } from 'react'
import { AuthContext } from './AuthContext'
import {
  LayoutDashboard,
  UserCheck,
  FolderKanban,
  Users2,
  BarChart3,
  CreditCard,
  Settings2,
} from 'lucide-react'
import { hasPermission } from './helpers/hasPermission'

// Clean, consistent, tree-shakeable Lucide navigation icons
export const fullNavItems = [
  {
    name: 'Home',
    to: '/dashboard',
    icon: <LayoutDashboard size={19} className="nav-icon" />,
    permission: 'view:dashboard-master',
  },
  {
    name: 'Leads',
    to: '/lead-master',
    icon: <UserCheck size={19} className="nav-icon" />,
    permission: 'view:lead-master',
  },
  {
    name: 'Projects',
    to: '/project-master',
    icon: <FolderKanban size={19} className="nav-icon" />,
    permission: 'view:project-master',
  },
  {
    name: 'Users',
    to: '/user-master',
    icon: <Users2 size={19} className="nav-icon" />,
    permission: 'view:user-master',
  },
  {
    name: 'Reports',
    to: '/report-master',
    icon: <BarChart3 size={19} className="nav-icon" />,
    permission: 'view:report-master',
  },
  {
    name: 'Billing',
    to: '/billing',
    icon: <CreditCard size={19} className="nav-icon" />,
  },
  {
    name: 'Settings',
    to: '/setting-master',
    icon: <Settings2 size={19} className="nav-icon" />,
    permission: 'view:setting-master',
  },
]

// Permission-based filtering
export const filterNavItems = (items, user) =>
  items.filter((item) => {
    if (!item.permission) return true
    return hasPermission(user, item.permission)
  })

export const useNavItems = () => {
  const { userData } = useContext(AuthContext)
  return filterNavItems(fullNavItems, userData)
}

export default useNavItems
