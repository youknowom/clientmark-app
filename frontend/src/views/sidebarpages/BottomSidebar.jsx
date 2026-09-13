import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import { AuthContext } from '../../AuthContext'
import { MdLeaderboard, MdOutlineDashboard } from 'react-icons/md'
import { FaUsersBetweenLines } from 'react-icons/fa6'
import { FaTasks } from 'react-icons/fa'
import { hasPermission } from '../../helpers/hasPermission'
import { GiBigGear } from 'react-icons/gi'
import { SiEsotericsoftware } from 'react-icons/si'
import '../sidebarCSS/Sidebar.css'

// ─── Nav items — matches sidebar _nav.js (without non-existent ticket route) ──
const fullNavItems = [
  {
    name: 'Dashboard',
    to: '/dashboard',
    icon: <MdOutlineDashboard size={20} />,
    permission: 'view:dashboard-master',
  },
  {
    name: 'Leads',
    to: '/lead-master',
    icon: <MdLeaderboard size={20} />,
    permission: 'view:lead-master',
  },
  {
    name: 'Projects',
    to: '/project-master',
    icon: <SiEsotericsoftware size={20} />,
    permission: 'view:project-master',
  },
  {
    name: 'Users',
    to: '/user-master',
    icon: <FaUsersBetweenLines size={20} />,
    permission: 'view:user-master',
  },
  {
    name: 'Reports',
    to: '/report-master',
    icon: <FaTasks size={20} />,
    permission: 'view:report-master',
  },
  {
    name: 'Settings',
    to: '/setting-master',
    icon: <GiBigGear size={20} />,
    permission: 'view:setting-master',
  },
]

const filterNavItems = (items, user) =>
  items.filter((item) => !item.permission || hasPermission(user, item.permission))

const MobileBottomSidebar = () => {
  const { userData } = useContext(AuthContext)
  const allowedNavItems = filterNavItems(fullNavItems, userData)

  return (
    <div className="mobile-bottom-sidebar" role="navigation" aria-label="Mobile navigation">
      <div className="nav single-nav d-flex justify-content-around align-items-center">
        {allowedNavItems.map((item) => (
          <NavLink key={item.to} to={item.to} className="bottom-nav-item">
            <div className="nav-icon">{item.icon}</div>
            <div className="nav-text">{item.name}</div>
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default MobileBottomSidebar
