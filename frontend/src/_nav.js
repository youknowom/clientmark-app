import React, { useContext } from 'react'
import { AuthContext } from './AuthContext'
import { CNavItem } from '@coreui/react'
import { MdLeaderboard, MdOutlineDashboard } from 'react-icons/md'
import { FaTasks } from 'react-icons/fa'
import { FaUsersBetweenLines } from 'react-icons/fa6'
import { hasPermission } from './helpers/hasPermission'
import { GiBigGear } from 'react-icons/gi'
import { SiEsotericsoftware } from "react-icons/si";

// Full nav config
const fullNavItems = [
  {
    component: CNavItem,
    name: 'Home',
    to: '/dashboard',
    icon: <MdOutlineDashboard className="nav-icon" />,
    permission: 'view:dashboard-master',
  },

  {
    component: CNavItem,
    name: 'Lead',
    to: '/lead-master',
    icon: <MdLeaderboard className="nav-icon" />,
    permission: 'view:lead-master',
  },
    {
    component: CNavItem,
    name: 'Project',
    to: '/project-master',
    icon: <SiEsotericsoftware className="nav-icon" />,
    permission: 'view:project-master',
  },
  {
    component: CNavItem,
    name: 'Users',
    to: '/user-master',
    icon: <FaUsersBetweenLines className="nav-icon" />,
    permission: 'view:user-master',
  },
  {
    component: CNavItem,
    name: 'Reports',
    to: '/report-master',
    icon: <FaTasks className="nav-icon" />,
    permission: 'view:report-master',
  },
  {
    component: CNavItem,
    name: 'Settings',
    to: '/setting-master',
    icon: <GiBigGear className="nav-icon" />,
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
