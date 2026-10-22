import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import BottomSidebar from '../views/sidebarpages/BottomSidebar'
import DemoBanner from '../components/DemoBanner'
import OnboardingWizard from '../components/OnboardingWizard'
import ChatbotWidget from '../components/ChatbotWidget'
import apiClient from '../api/axiosClient'
import Cookies from 'js-cookie'
import { toast } from 'react-hot-toast'
import { useLocation } from 'react-router-dom'

const DefaultLayout = () => {
  const location = useLocation()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const [isMobile, setIsMobile] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    toast.dismiss() // Dismiss all toasts on route change
  }, [location.pathname])

  // Check if workspace needs onboarding questionnaire
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const token = Cookies.get('token')
        if (!token) return
        const res = await apiClient.get('/onboarding/status')
        if (res.data?.success && res.data?.shouldShowOnboarding) {
          setShowOnboarding(true)
        }
      } catch (err) {
        // Silently skip if status check fails
      }
    }
    checkOnboarding()
  }, [])

  // Detect mobile view based on window width
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="cm-app-shell">
      {/* Modern Sidebar */}
      <AppSidebar />

      {/* Main App Content Shell */}
      <div className={`cm-main-wrapper ${!sidebarShow ? 'cm-sidebar-collapsed' : ''}`}>
        <DemoBanner />
        <AppHeader />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <AppContent />
        </main>
        <AppFooter />
        {isMobile && <BottomSidebar />}
      </div>

      {/* Smart Onboarding Questionnaire Wizard */}
      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => setShowOnboarding(false)}
      />

      {/* AI Chatbot Assistant Widget */}
      <ChatbotWidget />
    </div>
  )
}

export default DefaultLayout
