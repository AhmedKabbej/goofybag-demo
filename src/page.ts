import { q } from './dom'
import { closeOverlay, openOverlay } from './overlay'
import { observeReveals } from './reveal'
import { ship } from './ship'
import { care } from './care'
import { write } from './write'
import { allies } from './allies'

// mini router pour les pages service (livraison, entretien, contact, partenaires)
// chaque page donne son markup + un mount/unmount
// le unmount est obligatoire des qu'ya une anim en boucle sinon ca continue
// de tourner dans le vide apres la fermeture

export type Page = {
  /** le petit texte en haut a gauche */
  eyebrow: string
  markup: () => string
  /** listeners + anims. appele apres l'insertion du html */
  mount?: (root: HTMLElement) => void
  /** faut tout kill ici. tjrs appele */
  unmount?: () => void
}

const PAGES: Record<string, Page> = { ship, care, write, allies }

export const page = q<HTMLElement>('[data-page-host]')!

let current: Page | null = null

export function openPage(key: string): void {
  const next = PAGES[key]
  if (!next) return

  // une page peut en ouvrir une autre direct (bouton "nous ecrire" depuis entretien)
  // dc on unmount l'ancienne AVANT d'ecraser le html
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

  // on lance les reveals mtn, le rideau cache encore l'ecran
  // comme ca qd il se leve le haut de page est deja en place
  observeReveals()
}

export function closePage(): void {
  current?.unmount?.()
  current = null
  closeOverlay(page)
  page.innerHTML = ''
}
