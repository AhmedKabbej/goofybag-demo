import gsap from 'gsap'
import { q, reduced } from './dom'
import { lenis } from './scroll'

// gere tous les panneaux (menu, fiche produit, panier, checkout...)
// ils bloquent tous le scroll derriere. on garde un Set des panneaux ouverts
// plutot qu'un booleen pcq sinon qd on en ferme un alors qu'un autre
// est encore ouvert le scroll revient trop tot

const open = new Set<HTMLElement>()

// fade=false si le panneau a deja son anim d'entree en CSS
// sinon gsap et le css se battent sur l'opacity et ca reste invisible
export function openOverlay(el: HTMLElement, fade = true): void {
  el.hidden = false
  open.add(el)
  document.body.classList.add('is-locked')
  lenis.stop()
  if (fade && !reduced) gsap.from(el, { opacity: 0, duration: 0.4, ease: 'power2.out' })
}

export function closeOverlay(el: HTMLElement): void {
  el.hidden = true
  open.delete(el)
  if (open.size) return
  document.body.classList.remove('is-locked')
  lenis.start()
}

export const isOpen = (el: HTMLElement) => open.has(el)

// le rideau qui balaie l'ecran qd on change de vue

const curtain = q<HTMLElement>('[data-curtain]')!

// le swap se fait au milieu du balayage dc ~0.5s apres le clic
// pendant ces 0.5s si on reclique on remplace juste le pending au lieu de
// relancer un 2e rideau par dessus. ca gere aussi le cas ou on fait echap
// pendant l'ouverture (avant ca le clic partait dans le vide)
let pending: (() => void) | null = null
let sweeping = false

function sweep(): void {
  sweeping = true
  gsap
    .timeline({
      onComplete: () => {
        sweeping = false
        if (pending) sweep()
      },
    })
    .set(curtain, { display: 'block', yPercent: 100 })
    .to(curtain, { yPercent: 0, duration: 0.5, ease: 'power3.inOut' })
    .add(() => {
      const swap = pending
      pending = null
      swap?.()
    })
    .to(curtain, { yPercent: -100, duration: 0.62, ease: 'power3.inOut' }, '+=0.06')
    .set(curtain, { display: 'none' })
}

export function transition(swap: () => void): void {
  if (reduced) {
    swap()
    return
  }
  pending = swap
  if (!sweeping) sweep()
}
