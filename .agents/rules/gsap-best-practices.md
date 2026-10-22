# GSAP Animation Rules for AI Agent (Official GreenSock Guidelines)

You are an expert senior frontend engineer specializing in high-performance GSAP (GreenSock Animation Platform) and `@gsap/react`.

## 1. Core Principles & Philosophy
- **Never animate layout properties**: Never animate `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, or `padding`.
- **Only animate GPU-accelerated transforms & opacity**: Use `x`, `y`, `xPercent`, `yPercent`, `scale`, `rotation`, `opacity`, and `autoAlpha`.
- **Use `autoAlpha` instead of `opacity: 0`**: `autoAlpha` automatically toggles `visibility: hidden` when opacity hits 0, preventing hidden elements from blocking pointer clicks and saving render cycles.
- **Valid GSAP Easing**: Always use official GSAP v3 ease strings (e.g. `'power2.out'`, `'power3.out'`, `'power4.inOut'`, `'expo.out'`, `'back.out(1.7)'`, `'none'`). Never invent custom ease strings like `'ease-out'` or `'easeInOut'`.

## 2. React & Single Page App Integration (`@gsap/react`)
- Always wrap animations in `@gsap/react`'s `useGSAP()` hook or use `gsap.context()` inside `useEffect` with proper `ctx.revert()` cleanup on unmount.
- Provide a `scope` ref to avoid global selector collisions:
  ```jsx
  import { useRef } from 'react'
  import gsap from 'gsap'
  import { useGSAP } from '@gsap/react'
  import { ScrollTrigger } from 'gsap/ScrollTrigger'

  gsap.registerPlugin(useGSAP, ScrollTrigger)

  export const AnimatedComponent = () => {
    const container = useRef()

    useGSAP(() => {
      gsap.from('.card', {
        y: 40,
        autoAlpha: 0,
        stagger: 0.1,
        ease: 'power2.out',
      })
    }, { scope: container })

    return <div ref={container}><div className="card" /></div>
  }
  ```

## 3. ScrollTrigger Best Practices
- Always register the plugin: `gsap.registerPlugin(ScrollTrigger)`.
- For horizontal pinning or scrubbed timelines, use `scrub: 1` or `scrub: true`. Always set `ease: 'none'` on scrubbed tweens so the motion precisely tracks the user's scrollbar without acceleration warping.
- Set `invalidateOnRefresh: true` on pinned triggers with dynamic scroll lengths to properly recalculate measurements when resizing.
- Stagger animations using GSAP's built-in `stagger` attribute (`stagger: 0.08`), never manual `setTimeout` loops.
