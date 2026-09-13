import React, { useContext } from 'react'
import { NavLink } from 'react-router-dom'

import { AuthContext } from '../../AuthContext' // adjust path
import { MdLeaderboard, MdOutlineDashboard } from 'react-icons/md'
import { FaUsersBetweenLines } from 'react-icons/fa6'
import { FaTasks, FaTicketAlt } from 'react-icons/fa'

import { hasPermission } from '../../helpers/hasPermission'
import { GiBigGear } from 'react-icons/gi'
import '../SidebarCss/Sidebar.css'

// ----------------------------
// FULL NAV CONFIG
// ----------------------------
const fullNavItems = [
  {
    name: 'Home',
    to: '/dashboard',
    icon: <MdOutlineDashboard size={20} />,
    permission: 'view:dashboard-master',
  },
  {
    name: 'Ticket',
    to: '/ticket-master',
    icon: <FaTicketAlt size={20} />,
    permission: 'view:ticket-master',
  },
  {
    name: 'Lead',
    to: '/lead-master',
    icon: <MdLeaderboard size={20} />,
    permission: 'view:lead-master',
  },
  
  {
    name: 'Users',
    to: '/user-master',
    icon: <FaUsersBetweenLines size={20} />,
    permission: 'view:user-master',
  },
  {
    name: 'Settings',
    to: '/setting-master',
    icon: <GiBigGear size={20} />,
    permission: 'view:setting-master',
  },
  {
    name: 'Reports',
    to: '/report-master',
    icon: <FaTasks size={20} />,
    permission: 'view:report-master',
  },
]

// FILTER FUNCTION

// Permission-based filtering
const filterNavItems = (items, user) =>
  items.filter((item) => {
    if (!item.permission) return true
    return hasPermission(user, item.permission)
  })

// MAIN COMPONENT
const MobileBottomSidebar = () => {
  const { userData } = useContext(AuthContext)

  const allowedNavItems = filterNavItems(fullNavItems, userData)

  return (
    <div
      className="mobile-bottom-sidebar pt-2"
      style={{
        bottom: '0',
        position: 'sticky',
        height: '60px',
        background: '#fff',
        borderTop: '1px solid #ddd',
      }}
    >
      <div className="nav single-nav d-flex justify-content-around align-items-center">
        {allowedNavItems.map((item, index) => (
          <NavLink key={index} to={item.to} className="bottom-nav-item">
            <div className="nav-icon">{item.icon}</div>
            <div className="nav-text">{item.name}</div>
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default MobileBottomSidebar
