import React from 'react'
import { Switch as BaseSwitch } from '@base-ui/react'

/**
 * Modern Clientmark Switch (replaces CFormSwitch)
 * Built with @base-ui/react for accessible toggle switches.
 */
export const Switch = ({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  label,
  className = '',
  id,
}) => {
  return (
    <label
      htmlFor={id}
      className={`cm-flex cm-items-center cm-gap-2 ${className}`}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' }}
    >
      <BaseSwitch.Root
        id={id}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="cm-switch-root"
      >
        <BaseSwitch.Thumb className="cm-switch-thumb" />
      </BaseSwitch.Root>
      {label && (
        <span
          style={{
            fontSize: 'var(--cm-text-sm)',
            fontWeight: 'var(--cm-weight-medium)',
            color: 'var(--cm-text-primary)',
          }}
        >
          {label}
        </span>
      )}
    </label>
  )
}

export default Switch
