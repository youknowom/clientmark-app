import React, { useState, useEffect, useRef } from 'react'
import Cookies from 'js-cookie'
import { toast } from 'react-hot-toast'
import apiClient from '../../api/axiosClient'
import { resetToDefaultFavicon } from '../../helpers/dynamicFavicon'

import { LandingNavbar } from './LandingNavbar'
import { HeroSection } from './HeroSection'
import { FeatureBentoGrid } from './FeatureBentoGrid'
import { FeaturedWorkSection } from './FeaturedWorkSection'
import { PrinciplesSection } from './PrinciplesSection'
import { StudioStatsSection } from './StudioStatsSection'
import { PricingSection } from './PricingSection'
import { FaqSection } from './FaqSection'
import { PreFooterCta } from './PreFooterCta'
import { LandingFooter } from './LandingFooter'
import { ClientmarkCopilot } from '../../components/brand/ClientmarkCopilot'

import '../../styles/clientmark-landing.css'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const landingRef = useRef(null)

  // Demo Login Handler — launches pre-seeded interactive sandbox
  const handleDemoLogin = async () => {
    try {
      setDemoLoading(true)
      toast.loading('Launching Acme Agency demo sandbox...', { id: 'demo-launch' })
      const res = await apiClient.post('/tenant/demo-login')
      toast.dismiss('demo-launch')

      if (res.data?.success && res.data?.token) {
        Cookies.set('token', res.data.token, {
          expires: 7,
          sameSite: 'Lax',
          secure: window.location.protocol === 'https:',
        })
        Cookies.set('isDemoMode', 'true', {
          expires: 7,
          sameSite: 'Lax',
          secure: window.location.protocol === 'https:',
        })
        sessionStorage.setItem('isDemoMode', 'true')
        toast.success('Welcome to the Live Demo Sandbox!')
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 400)
      } else {
        toast.error(res.data?.message || 'Failed to start demo workspace.')
      }
    } catch (err) {
      toast.dismiss('demo-launch')
      toast.error(err?.response?.data?.message || 'Could not launch demo workspace.')
    } finally {
      setDemoLoading(false)
    }
  }

  useEffect(() => {
    resetToDefaultFavicon()
    document.title = 'Clientmark: CRM, WhatsApp Pipelines & Project Delivery'

    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ─── Extensive GSAP ScrollTrigger & Micro-Interaction Engine using useGSAP ───
  useGSAP(
    () => {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) return

      // 1. Kinetic Word-Split Staggers for All Major Section Headlines
      const headings = landingRef.current?.querySelectorAll('[data-reveal="words"]') || []
      headings.forEach((heading) => {
        const words = heading.querySelectorAll('.reveal-word')
        if (words.length > 0) {
          gsap.fromTo(
            words,
            { y: 30, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.65,
              stagger: 0.05,
              ease: 'power3.out',
              clearProps: 'transform',
              scrollTrigger: {
                trigger: heading,
                start: 'top 85%',
                toggleActions: 'play none none none',
              },
            },
          )
        }
      })

      // 2. Bento Grid Cards Staggered Reveal
      const bentoCards = landingRef.current?.querySelectorAll('#services .cm-card-3d') || []
      if (bentoCards.length > 0) {
        gsap.fromTo(
          bentoCards,
          { y: 35, autoAlpha: 0, scale: 0.98 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power2.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: '#services',
              start: 'top 75%',
              toggleActions: 'play none none none',
            },
          },
        )
      }

      // 3. Studio Stats Numeric Cards Entrance
      const statCards = landingRef.current?.querySelectorAll('.cm-stat-card') || []
      if (statCards.length > 0) {
        gsap.fromTo(
          statCards,
          { y: 30, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.55,
            stagger: 0.08,
            ease: 'power2.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: statCards[0],
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          },
        )
      }

      // 4. Pricing Cards Entrance
      const pricingCards = landingRef.current?.querySelectorAll('#pricing .cm-card-3d') || []
      if (pricingCards.length > 0) {
        gsap.fromTo(
          pricingCards,
          { y: 30, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power2.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: '#pricing',
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          },
        )
      }
    },
    {
      scope: landingRef,
      dependencies: [],
      revertOnUpdate: true,
    },
  )

  return (
    <div
      ref={landingRef}
      style={{
        backgroundColor: '#F5F5F7',
        color: '#161722',
        minHeight: '100vh',
        fontFamily: "var(--cm-font, 'Poppins', sans-serif)",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 1. Floating Pill Navigation */}
      <LandingNavbar
        scrolled={scrolled}
        onDemoClick={handleDemoLogin}
        demoLoading={demoLoading}
      />

      {/* 2. Hero Section with Kinetic Dynamic Word & Live Browser Mockup */}
      <HeroSection
        onDemoClick={handleDemoLogin}
        demoLoading={demoLoading}
      />

      {/* 3. What We Build — 6-Card Studio Bento Subsystems */}
      <FeatureBentoGrid />

      {/* 5. Featured Work — Studio Project Accordion with Browser Canvas */}
      <FeaturedWorkSection />

      {/* 6. The Principles — Horizontal Scroll Pin Carousel */}
      <PrinciplesSection />

      {/* 7. The Numbers Behind the Craft */}
      <StudioStatsSection />

      {/* 8. Transparent Investment / Pricing Matrix */}
      <PricingSection />

      {/* 10. Frequently Asked Questions */}
      <FaqSection />

      {/* 11. Pre-Footer High-Impact Studio CTA */}
      <PreFooterCta
        onDemoClick={handleDemoLogin}
        demoLoading={demoLoading}
      />

      {/* 12. Studio Footer with Baseline Bar */}
      <LandingFooter />

      {/* 13. Floating Copilot Bot */}
      <ClientmarkCopilot />
    </div>
  )
}
