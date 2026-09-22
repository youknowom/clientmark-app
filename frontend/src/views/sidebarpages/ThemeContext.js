import React, { createContext, useState, useEffect } from 'react'
import apiClient from '../../api/axiosClient'

const ThemeContext = createContext()

const defaultTheme = {
  primaryColor: '#111827',
  secondaryColor: '#E05E3A',
  backgroundColor: '#FBFBF9',
  textColor: '#111827',
}

export const ThemeProvider = ({ children }) => {

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

  // Fetch theme once
  const getMainTheme = async () => {
    try {
      const response = await apiClient.get('/software-setting/get-main-theme')
      const mainTheme = response?.data?.data?.mainTheme

      if (mainTheme) {
        const bg =
          mainTheme.backgroundColor === '#0f172a'
            ? defaultTheme.backgroundColor
            : (mainTheme.backgroundColor || defaultTheme.backgroundColor)

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

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', theme.primaryColor)
    document.documentElement.style.setProperty('--secondary-color', theme.secondaryColor)
    document.documentElement.style.setProperty('--background-color', theme.backgroundColor)
    document.documentElement.style.setProperty('--text-color', theme.textColor)
  }, [theme])

  const updateTheme = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', JSON.stringify(newTheme))
  }

  return (
    <ThemeContext.Provider value={{ theme, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContext
