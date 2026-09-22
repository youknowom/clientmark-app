import React, { useState, useEffect } from 'react'
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
  const [isMobile, setIsMobile] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    toast.dismiss() // Dismiss all toasts on route change
  }, [location.pathname]) // Runs whenever the route changes

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
        <DemoBanner />
        <AppHeader />
        <div className="body flex-grow-1 pb-4">
          <AppContent />
        </div>
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
