import React, { useState, useEffect } from 'react'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import BottomSidebar from '../views/sidebarpages/BottomSidebar'
import { toast } from 'react-hot-toast'
import { useLocation } from 'react-router-dom'

const DefaultLayout = () => {
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    toast.dismiss() // Dismiss all toasts on route change
  }, [location.pathname]) // Runs whenever the route changes

  // Detect mobile view based on window width
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767) // Define mobile as <= 767px
    }

    handleResize() // Check initially
    window.addEventListener('resize', handleResize) // Add resize listener
    return () => window.removeEventListener('resize', handleResize) // Clean up listener
  }, [])

  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <div className="body flex-grow-1 pb-4">
          <AppContent />
        </div>
        {isMobile && <BottomSidebar />}
      </div>
    </div>
  )
}

export default DefaultLayout
