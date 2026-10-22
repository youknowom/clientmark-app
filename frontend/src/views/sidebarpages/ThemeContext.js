import React, { createContext, useContext, useState, useEffect } from 'react'
import apiClient from '../../api/axiosClient'

const ThemeContext = createContext()

const defaultTheme = {
  primaryColor: '#111827',
  secondaryColor: '#E05E3A',
  backgroundColor: '#FBFBF9',
  textColor: '#111827',
}

// Convert hex to HSL or darker tint for hover
function adjustHex(hex, percent) {
  if (!hex || typeof hex !== 'string') return hex
  let num = parseInt(hex.replace('#', ''), 16)
  if (isNaN(num)) return hex
  let amt = Math.round(2.55 * percent)
  let R = (num >> 16) + amt
  let B = ((num >> 8) & 0x00ff) + amt
  let G = (num & 0x0000ff) + amt
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
      (G < 255 ? (G < 1 ? 0 : G) : 255)
    )
      .toString(16)
      .slice(1)
  )
}

export const ThemeProvider = ({ children }) => {
  // Mode: default to 'dark' for luxury studio aesthetic
  const [mode, setMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('cm_theme_mode')
      if (savedMode === 'dark' || savedMode === 'light') return savedMode
    } catch (e) {}
    return 'dark'
  })

  // Tenant custom branding
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object' && parsed.primaryColor) {
          if (parsed.backgroundColor === '#0f172a') {
            parsed.backgroundColor = defaultTheme.backgroundColor
          }
          return parsed
        }
      }
    } catch (e) {
      localStorage.removeItem('theme')
    }
    return defaultTheme
  })

  // Fetch tenant theme once on startup
  const getMainTheme = async () => {
    try {
      const response = await apiClient.get('/software-setting/get-main-theme')
      const mainTheme = response?.data?.data?.mainTheme

      if (mainTheme) {
        const bg =
          mainTheme.backgroundColor === '#0f172a'
            ? defaultTheme.backgroundColor
            : mainTheme.backgroundColor || defaultTheme.backgroundColor

        const updatedTheme = {
          primaryColor: mainTheme.primaryColor || defaultTheme.primaryColor,
          secondaryColor: mainTheme.secondaryColor || defaultTheme.secondaryColor,
          backgroundColor: bg,
          textColor: mainTheme.textColor || defaultTheme.textColor,
        }

        setTheme(updatedTheme)
        localStorage.setItem('theme', JSON.stringify(updatedTheme))
      }
    } catch (error) {
      setTheme(defaultTheme)
    }
  }

  useEffect(() => {
    getMainTheme()
  }, [])

  // Sync mode with HTML data-theme attribute and dark class for Tailwind
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
    document.documentElement.style.colorScheme = mode
    if (mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    try {
      localStorage.setItem('cm_theme_mode', mode)
    } catch (e) {}
  }, [mode])

  // Sync dynamic CSS variables
  useEffect(() => {
    const root = document.documentElement

    // Legacy variables for backward compatibility
    root.style.setProperty('--primary-color', theme.primaryColor)
    root.style.setProperty('--secondary-color', theme.secondaryColor)
    root.style.setProperty('--background-color', theme.backgroundColor)
    root.style.setProperty('--text-color', theme.textColor)

    // Modern Clientmark design tokens
    const brandBase = theme.secondaryColor || '#E05E3A'
    const brandDarker = adjustHex(brandBase, -15)
    root.style.setProperty('--cm-brand-500', brandBase)
    root.style.setProperty('--cm-brand-600', brandDarker)
    root.style.setProperty('--cm-border-focus', brandBase)
    root.style.setProperty('--cm-primary', theme.primaryColor || '#111827')
    root.style.setProperty('--cm-accent', brandBase)
  }, [theme])

  const toggleMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const updateTheme = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', JSON.stringify(newTheme))
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateTheme,
        mode,
        setMode,
        toggleMode,
        isDark: mode === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

export default ThemeContext
