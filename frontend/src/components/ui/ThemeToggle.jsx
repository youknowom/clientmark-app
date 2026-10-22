import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../views/sidebarpages/ThemeContext'

export const ThemeToggle = ({ className = '', size = 'md' }) => {
  const { isDark, toggleMode } = useTheme()

  const buttonSize = size === 'sm' ? 32 : 36
  const iconSize = size === 'sm' ? 16 : 18

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`cm-btn-ghost ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${buttonSize}px`,
        height: `${buttonSize}px`,
        padding: 0,
        borderRadius: 'var(--cm-radius-full)',
        border: '1px solid var(--cm-border-subtle)',
        backgroundColor: 'var(--cm-bg-card)',
        color: 'var(--cm-text-primary)',
        cursor: 'pointer',
        transition: 'all var(--cm-duration-fast) var(--cm-ease-out)',
      }}
    >
      {isDark ? (
        <Sun
          size={iconSize}
          style={{
            color: '#F59E0B',
            transform: 'rotate(0deg)',
            transition: 'transform 300ms ease',
          }}
        />
      ) : (
        <Moon
          size={iconSize}
          style={{
            color: 'var(--cm-text-secondary)',
            transform: 'rotate(0deg)',
            transition: 'transform 300ms ease',
          }}
        />
      )}
    </button>
  )
}

export default ThemeToggle
