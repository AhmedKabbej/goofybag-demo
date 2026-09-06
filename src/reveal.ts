import { qq } from './dom'

/* Ce qui entre dans l'écran monte d'un cran, une fois et pas deux. */

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return
      entry.target.classList.add('is-in')
      io.unobserve(entry.target)
    })
  },
  { rootMargin: '0px 0px -6% 0px', threshold: 0.06 },
)

export function observeReveals(): void {
  qq<HTMLElement>('.reveal:not(.is-in)').forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 80}ms`
    io.observe(el)
  })
}
