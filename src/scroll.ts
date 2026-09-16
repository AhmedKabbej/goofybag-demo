import gsap from 'gsap'
import Lenis from 'lenis'
import { reduced } from './dom'

// smooth scroll avec Lenis
// important : on branche Lenis sur le ticker GSAP sinon les 2 tournent sur des
// raf differents et les anims au scroll decalent

export const lenis = new Lenis({
  duration: 1.05,
  smoothWheel: !reduced,
  easing: (t: number) => 1 - Math.pow(1 - t, 3),
})

gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)
