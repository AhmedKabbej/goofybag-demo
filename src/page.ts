import { q } from './dom'
import { closeOverlay, openOverlay } from './overlay'
import { observeReveals } from './reveal'
import { ship } from './ship'
import { care } from './care'
import { write } from './write'
import { allies } from './allies'

/* -------------------------------------------------------------------------
   Les pages de service — livraison, entretien, correspondance, partenariats

   Ce sont des vues, pas des panneaux : elles remplacent la page plutôt que de
   se poser dessus, et l'on y arrive par le rideau, comme pour la fiche
   produit. La coquille est commune — un bandeau, une zone qui défile — et
   chaque page ne fournit que trois choses : son fil d'ariane, son contenu, et
   de quoi se rebrancher puis se débrancher.

   Ce dernier point est ce qui justifie le registre : un camion qui roule, un
   compte à rebours qui bat, un chiffon que l'on passe — tout cela tourne tant
   que la page est là, et doit s'arrêter net quand elle s'en va. Sans un
   endroit unique où le dire, il resterait toujours une horloge à traîner.
   ---------------------------------------------------------------------- */

export type Page = {
  /** Le fil d'ariane, en haut à gauche du bandeau. */
  eyebrow: string
  markup: () => string
  /** Branche ce qui vit — écouteurs, boucles, horloges. */
  mount?: (root: HTMLElement) => void
  /** Débranche tout ce que `mount` a lancé. Appelé à coup sûr. */
  unmount?: () => void
}

const PAGES: Record<string, Page> = { ship, care, write, allies }

export const page = q<HTMLElement>('[data-page-host]')!

let current: Page | null = null

export function openPage(key: string): void {
  const next = PAGES[key]
  if (!next) return

  // Une page peut en appeler une autre (« Nous écrire » depuis l'entretien) :
  // on démonte la précédente avant d'écraser son balisage, sinon son horloge
  // continuerait de battre sur des nœuds qui n'existent plus.
  current?.unmount?.()
  current = next

  page.innerHTML = `
    <header class="page__top">
      <p class="label">${next.eyebrow}</p>
      <button class="linklike" type="button" data-close-page>Fermer</button>
    </header>
    <div class="page__scroll" data-page-scroll data-lenis-prevent>
      ${next.markup()}
    </div>`

  openOverlay(page, false)
  q<HTMLElement>('[data-page-scroll]', page)!.scrollTop = 0
  next.mount?.(page)

  /* Les apparitions se déclenchent pendant que le rideau couvre encore
     l'écran : le temps qu'il se lève, le haut de la page est déjà monté. */
  observeReveals()
}

export function closePage(): void {
  current?.unmount?.()
  current = null
  closeOverlay(page)
  page.innerHTML = ''
}
