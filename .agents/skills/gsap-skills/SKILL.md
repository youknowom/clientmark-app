---
name: gsap-skills
description: Official GSAP AI skills and best practices for creating smooth GreenSock animations, ScrollTrigger scroll-driven experiences, timelines, and @gsap/react integrations.
---

# Official GSAP AI Skill

Use this skill whenever building or refining GSAP animations, ScrollTrigger interactions, or motion design in React or Single Page Apps.

## Core Rules & Guardrails

1. **Transform Performance**:
   - Always animate GPU transforms: `x`, `y`, `xPercent`, `yPercent`, `scale`, `rotation`, and `autoAlpha`.
   - Never animate layout properties: `width`, `height`, `top`, `left`, `margin`, `padding`.
   - Always use `autoAlpha` instead of `opacity: 0` for element entrances and exits to eliminate pointer blocking and unnecessary layout repaints.

2. **React Lifecycle & Memory Cleanup**:
   - Always register `@gsap/react` and `ScrollTrigger`:
     ```javascript
     import gsap from 'gsap'
     import { ScrollTrigger } from 'gsap/ScrollTrigger'
     import { useGSAP } from '@gsap/react'

     gsap.registerPlugin(ScrollTrigger, useGSAP)
     ```
   - Always scope GSAP animations to a component ref:
     ```jsx
     const containerRef = useRef()
     useGSAP(() => {
       // All selectors here are automatically scoped to containerRef
     }, { scope: containerRef })
     ```
   - In standard `useEffect`, always clean up with `ctx.revert()` or `ScrollTrigger.getAll().forEach(t => t.kill())`.

3. **ScrollTrigger Pinning & Scrubbing**:
   - On scrubbed timelines or pinning, set `scrub: 1` or `scrub: true`.
   - Always apply `ease: 'none'` on scrubbed tweens so motion is 1:1 linked with user wheel movement.
   - Use `invalidateOnRefresh: true` on pinned horizontal carousels or dynamically measured sections.
   - For staggered reveals on scroll, use `stagger: 0.1` on the GSAP tween.
