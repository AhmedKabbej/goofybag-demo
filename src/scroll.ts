import gsap from 'gsap'
import Lenis from 'lenis'
import { reduced } from './dom'

/* Le défilement du site passe par Lenis, cadencé par le ticker de GSAP : les
   deux horloges n'en font qu'une, sinon le défilement et les animations
   dérivent l'un par rapport à l'autre. Le module l'expose parce que les
   panneaux doivent pouvoir l'arrêter, et l'en-tête l'écouter. */

export const lenis = new Lenis({
  duration: 1.05,
  smoothWheel: !reduced,
  easing: (t: number) => 1 - Math.pow(1 - t, 3),
})

gsap.ticker.add((time) => lenis.raf(time * 1000))
gsap.ticker.lagSmoothing(0)
