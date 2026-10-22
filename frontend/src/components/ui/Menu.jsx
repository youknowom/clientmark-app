import React from 'react'
import { Menu as BaseMenu } from '@base-ui/react'

/**
 * Modern Clientmark Menu (replaces Dropdown and CDropdown)
 * Built with @base-ui/react for accessible dropdown menus.
 */
export const Menu = ({
  trigger,
  children,
  open,
  onOpenChange,
  side = 'bottom',
  align = 'end',
  sideOffset = 6,
}) => {
  return (
    <BaseMenu.Root open={open} onOpenChange={onOpenChange}>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner side={side} align={align} sideOffset={sideOffset}>
          <BaseMenu.Popup className="cm-menu-popup">
            {children}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  )
}

export const MenuItem = ({
  children,
  onClick,
  danger = false,
  icon,
  className = '',
  disabled = false,
}) => (
  <BaseMenu.Item
    onClick={onClick}
    disabled={disabled}
    className={`cm-menu-item ${danger ? 'cm-menu-item-danger' : ''} ${className}`}
  >
    {icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>}
    <span style={{ flex: 1 }}>{children}</span>
  </BaseMenu.Item>
)

export const MenuSeparator = () => (
  <BaseMenu.Separator className="cm-menu-separator" />
)

Menu.Item = MenuItem
Menu.Separator = MenuSeparator

export default Menu
