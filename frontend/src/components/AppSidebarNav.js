import React from 'react'
import { NavLink } from 'react-router-dom'

/**
 * Modern Clientmark Sidebar Nav List
 * Replaces CoreUI CSidebarNav with clean semantic NavLinks.
 */
export const AppSidebarNav = ({ items }) => {
  if (!items || !items.length) return null

  return (
    <nav className="cm-sidebar-nav" aria-label="Sidebar Navigation">
      {items.map((item, index) => (
        <NavLink
          key={item.to || index}
          to={item.to}
          className={({ isActive }) =>
            `cm-sidebar-link ${isActive ? 'active' : ''}`
          }
        >
          {item.icon}
          <span>{item.name}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default AppSidebarNav
