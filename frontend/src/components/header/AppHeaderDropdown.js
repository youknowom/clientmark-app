import React from 'react'
import { User, LogOut, CreditCard } from 'lucide-react'
import { Menu, MenuItem, MenuSeparator } from '../ui/Menu'

/**
 * Clean Header Dropdown using Base UI Menu primitive.
 * Zero CoreUI dependencies.
 */
export const AppHeaderDropdown = ({ user, onLogout, onNavigate }) => {
  return (
    <Menu
      align="end"
      trigger={
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'var(--cm-brand-500)',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      }
    >
      <MenuItem icon={<User size={15} />} onClick={() => onNavigate?.('/user-profile')}>
        Profile
      </MenuItem>
      <MenuItem icon={<CreditCard size={15} />} onClick={() => onNavigate?.('/billing')}>
        Billing
      </MenuItem>
      <MenuSeparator />
      <MenuItem danger icon={<LogOut size={15} />} onClick={onLogout}>
        Log out
      </MenuItem>
    </Menu>
  )
}

export default AppHeaderDropdown
