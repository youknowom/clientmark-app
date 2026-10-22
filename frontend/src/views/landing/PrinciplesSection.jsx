import React, { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export const PrinciplesSection = () => {
  const sectionRef = useRef(null)
  const trackRef = useRef(null)

  const principles = [
    {
      num: '01',
      title: 'Not another agency.',
      sub: 'A product team obsessed with craft.',
      bg: '#161722', // Signature dark contrast anchor card
      titleColor: '#FFFFFF',
      subColor: '#A1A1AA',
      accent: '#E05E3A',
      border: '1px solid #161722',
    },
    {
      num: '02',
      title: 'Intelligence with intent.',
      sub: 'Never AI for the sake of AI.',
      bg: '#FFFFFF',
      titleColor: '#161722',
      subColor: '#6B6A66',
      accent: '#F59E0B',
      border: '1px solid rgba(0, 0, 0, 0.08)',
    },
    {
      num: '03',
      title: 'Built for tomorrow.',
      sub: 'Strong foundations endure.',
      bg: '#FFFFFF',
      titleColor: '#161722',
      subColor: '#6B6A66',
      accent: '#6366F1',
      border: '1px solid rgba(0, 0, 0, 0.08)',
    },
    {
      num: '04',
      title: 'Beauty follows purpose.',
      sub: 'Nothing unnecessary.',
      bg: '#FFFFFF',
      titleColor: '#161722',
      subColor: '#6B6A66',
      accent: '#10B981',
      border: '1px solid rgba(0, 0, 0, 0.08)',
    },
    {
      num: '05',
      title: 'We build relationships.',
      sub: 'Not one-off, disposable projects.',
      bg: '#FFFFFF',
      titleColor: '#161722',
      subColor: '#6B6A66',
      accent: '#EC4899',
      border: '1px solid rgba(0, 0, 0, 0.08)',
    },
  ]

  useGSAP(
    () => {
      const section = sectionRef.current
      const track = trackRef.current
      if (!section || !track) return

      // Official GSAP matchMedia handles mobile & prefers-reduced-motion gracefully
      const mm = gsap.matchMedia()

      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        // Pinning enabled on desktop / tablet
        const getScrollAmount = () => -(track.scrollWidth - window.innerWidth + 80)

        gsap.to(track, {
          x: getScrollAmount,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${Math.max(track.scrollWidth - window.innerWidth + 300, 600)}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        })
      })

      mm.add('(max-width: 767px)', () => {
        // On mobile devices, allow fluid touch horizontal swipe without intrusive scroll pinning
        gsap.set(track, { clearProps: 'transform' })
      })
    },
    {
      scope: sectionRef,
      dependencies: [],
      revertOnUpdate: true,
    },
  )

  return (
    <section
      ref={sectionRef}
      id="principles"
      style={{
        backgroundColor: '#F5F5F7',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 0',
      }}
    >
      <div className="cm-container" style={{ maxWidth: '1240px', width: '100%', marginBottom: '40px' }}>
        {/* Section Heading */}
        <div style={{ maxWidth: '780px' }}>
          <h2
            data-reveal="words"
            style={{
              fontFamily: 'var(--cm-font-heading, Poppins)',
              fontSize: 'clamp(2.5rem, 5vw, 4.4rem)',
              fontWeight: 500,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              margin: '0 0 16px 0',
            }}
          >
            <span style={{ color: '#161722' }}>
              <span className="reveal-word inline-block">The </span>
              <span className="reveal-word inline-block">Clientmark </span>
            </span>
            <span style={{ color: '#6B6A66' }}>
              <span className="reveal-word inline-block">Principles.</span>
            </span>
          </h2>
          <p style={{ fontSize: '16px', color: '#6B6A66', margin: 0 }}>
            Five unbreakable convictions governing our architecture, engineering, and product philosophy.
          </p>
        </div>
      </div>

      {/* GSAP Pinned Horizontal Scroll Track */}
      <div
        style={{
          width: '100%',
          overflow: 'hidden',
          paddingLeft: 'max(24px, calc((100vw - 1240px) / 2))',
        }}
      >
        <div
          ref={trackRef}
          style={{
            display: 'inline-flex',
            gap: '24px',
            willChange: 'transform',
            paddingRight: '60px',
            paddingBottom: '20px',
          }}
        >
          {principles.map((p) => (
            <div
              key={p.num}
              className="cm-principle-card"
              style={{
                width: '380px',
                flexShrink: 0,
                background: p.bg,
                border: p.border,
                borderRadius: '24px',
                padding: '40px 34px',
                minHeight: '390px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 12px 36px -6px rgba(22, 23, 34, 0.08)',
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: 'var(--cm-font-mono, monospace)',
                    fontSize: '12px',
                    color: p.accent,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                  }}
                >
                  PRINCIPLE {p.num}
                </span>

                <h3
                  style={{
                    fontFamily: 'var(--cm-font-heading, Poppins)',
                    fontSize: '29px',
                    fontWeight: 600,
                    lineHeight: 1.2,
                    color: p.titleColor,
                    letterSpacing: '-0.03em',
                    margin: '20px 0 12px',
                  }}
                >
                  {p.title}
                </h3>

                <p
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    color: p.subColor,
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {p.sub}
                </p>
              </div>

              {/* Bottom decorative bar */}
              <div
                style={{
                  width: '42px',
                  height: '3.5px',
                  background: p.accent,
                  borderRadius: '9999px',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PrinciplesSection
