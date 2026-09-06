import gsap from 'gsap'
import { q, reduced } from './dom'
import { lenis } from './scroll'

/* -------------------------------------------------------------------------
   Panneaux — menu, fiche, panier, aperçu, caisse

   Tous se comportent pareil : ils couvrent la page, ils arrêtent le
   défilement derrière eux, et ils le rendent quand le dernier se referme.
   C'est ce « dernier » qui compte : on tient donc la liste de ceux qui sont
   ouverts plutôt que d'énumérer quelque part tous ceux qui existent — sans
   quoi il faut penser à compléter cette énumération à chaque nouveau panneau,
   et le jour où on l'oublie, la page reste bloquée.
   ---------------------------------------------------------------------- */

const open = new Set<HTMLElement>()

/**
 * Ouvre un panneau. `fade` est à écarter pour tout panneau qui porte déjà son
 * entrée en CSS : le fondu relèverait son opacité au moment où l'animation de
 * feuille de style la tient encore à zéro, et la laisserait invisible.
 */
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

/* -------------------------------------------------------------------------
   Transition entre vues — un aplat balaie l'écran, la vue change derrière
   ---------------------------------------------------------------------- */

const curtain = q<HTMLElement>('[data-curtain]')!

/* Le changement de vue a lieu au milieu du balayage, pendant que l'aplat
   couvre l'écran — soit une demi-seconde après le geste. Tout ce qui arrive
   dans cet intervalle doit donc être retenu, pas ignoré :

   — un deuxième clic ne relance pas un second balayage par-dessus le premier,
     il remplace simplement ce qui sera montré au milieu ;
   — une échappée pendant l'ouverture n'est plus avalée : le panneau n'est pas
     encore ouvert, la fermeture ne trouvait rien à fermer et le clic partait
     dans le vide — la voici retenue au même titre, et c'est la grille qui
     revient.

   Ce qui arrive après le milieu, en revanche, est une navigation neuve : elle
   attend la fin et joue son propre balayage. */
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
