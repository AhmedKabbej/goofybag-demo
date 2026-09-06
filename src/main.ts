import './styles/index.css'

import { q } from './dom'
import { lenis } from './scroll'
import { defaultColour, find } from './products'
import { closeOverlay, isOpen, openOverlay, transition } from './overlay'
import { initCursor } from './cursor'
import { renderGrid, setCardColour } from './grid'
import { renderLookbook } from './look'
import {
  closeProduct,
  openProduct,
  pdp,
  selection,
  setColour,
  setSize,
  stepModel,
} from './product'
import { addToCart, drawer, renderCart, setQty } from './cart'
import { closeViewer, openViewer, viewer } from './viewer'
import { closePay, openPay, pay } from './pay'
import { closeLab, lab, openLab, stepLab } from './lab'
import { closePage, openPage, page } from './page'
import { closeDemo, demo, openDemo } from './demo'
import { playIntro, setupMarquees, toggleFold } from './chrome'
import { startOpening } from './opening'
import { closeMail, mail, openMail } from './mail'

/* -------------------------------------------------------------------------
   GoofyBag — point d'entrée

   Ce fichier ne fait que deux choses : router les gestes vers le module qui
   sait quoi en faire, et démarrer. Toute la logique vit à côté, un module par
   morceau de l'interface.

   Le routage est délégué, une seule fois, sur le document : les panneaux
   réécrivent leur contenu à volonté sans qu'aucun écouteur ne soit à
   rebrancher, et l'on lit ici, d'un seul tenant, ce que chaque geste déclenche.
   ---------------------------------------------------------------------- */

const menu = q<HTMLElement>('[data-menu]')!

document.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return
  const t = e.target
  const hit = <T extends HTMLElement = HTMLElement>(sel: string) => t.closest<T>(sel)

  // Ouvertures et fermetures de panneaux.
  if (hit('[data-open-menu]')) return openOverlay(menu)
  if (hit('[data-close-menu]')) closeOverlay(menu)
  if (hit('[data-open-cart]')) return openOverlay(drawer)
  if (hit('[data-close-cart]')) return closeOverlay(drawer)
  if (hit('[data-close-pdp]')) return transition(closeProduct)
  if (hit('[data-open-pay]')) return openPay()
  if (hit('[data-close-pay]')) return closePay()
  if (hit('[data-close-viewer]')) return closeViewer()
  if (hit('[data-open-mail]')) return openMail()
  if (hit('[data-close-mail]')) return closeMail()
  if (hit('[data-open-lab]')) return openLab()
  if (hit('[data-close-lab]')) return closeLab()
  if (hit('[data-open-demo]')) return openDemo()
  if (hit('[data-close-demo]')) return closeDemo()

  // Les pages de service : ce sont des vues, elles arrivent par le rideau.
  if (hit('[data-close-page]')) return transition(closePage)
  const toPage = hit<HTMLElement>('[data-page]')?.dataset.page
  if (toPage) return transition(() => openPage(toPage))

  const sel = selection()
  if (hit('[data-open-viewer]')) return void (sel && openViewer(sel))

  // Déclinaison choisie depuis une carte de la grille.
  const cardDot = hit('[data-card-dot]')
  const card = hit('[data-slug]')
  if (cardDot?.dataset.cardDot && card) return setCardColour(card, cardDot.dataset.cardDot)

  // Déclinaison ou taille choisie dans la fiche.
  const pickColour = hit('[data-pick-colour]')
  if (pickColour?.dataset.pickColour) return setColour(pickColour.dataset.pickColour)

  const pickSize = hit('[data-pick-size]')
  if (pickSize?.dataset.pickSize) return setSize(pickSize.dataset.pickSize)

  const fold = hit('[data-fold]')
  if (fold) return toggleFold(fold)

  // Navigation d'un modèle à l'autre depuis la fiche.
  const step = hit('[data-model-step]')
  if (step) return stepModel(Number(step.dataset.modelStep))

  // Mises au panier : depuis une carte, ou depuis la fiche ouverte.
  if (hit('[data-add]') && card?.dataset.slug) {
    const p = find(card.dataset.slug)
    if (p) addToCart(p.slug, card.dataset.colourName ?? defaultColour(p).name, p.sizes[0].name)
    return
  }

  if (hit('[data-add-pdp]') && sel) {
    closeProduct()
    addToCart(sel.p.slug, sel.colour, sel.size)
    return
  }

  const qty = hit('[data-qty]')
  if (qty?.dataset.key) return setQty(qty.dataset.key, Number(qty.dataset.qty))

  if (hit('[data-open-product]') && card?.dataset.slug) {
    const p = find(card.dataset.slug)
    if (p) openProduct(p, card.dataset.colourName)
    return
  }

  // Ancres internes : c'est Lenis qui défile, pas le navigateur.
  const anchor = hit<HTMLAnchorElement>('a[href^="#"]')
  const href = anchor?.getAttribute('href') ?? ''
  if (!anchor || href === '#') return
  const target = q<HTMLElement>(href)
  if (!target) return
  e.preventDefault()
  lenis.scrollTo(target, { offset: -70 })
})

document.addEventListener('keydown', (e) => {
  /* L'aperçu et la caisse captent tout tant qu'ils sont ouverts : on y tourne
     une pièce ou l'on y saisit des chiffres, les raccourcis n'y ont rien à faire. */
  if (isOpen(viewer)) {
    if (e.key === 'Escape') closeViewer()
    return
  }
  if (isOpen(pay)) {
    if (e.key === 'Escape') closePay()
    return
  }
  if (isOpen(mail)) {
    if (e.key === 'Escape') closeMail()
    return
  }
  if (isOpen(lab)) {
    if (e.key === 'Escape') closeLab()
    if (e.key === 'ArrowRight') stepLab(1)
    if (e.key === 'ArrowLeft') stepLab(-1)
    return
  }

  /* Le film se pose par-dessus la page « Nous écrire » : il capte l'échappée
     avant elle, sinon la page partirait sous lui. */
  if (isOpen(demo)) {
    if (e.key === 'Escape') closeDemo()
    return
  }

  if (isOpen(page)) {
    if (e.key === 'Escape') transition(closePage)
    return
  }

  if (e.key === 'Escape') {
    // `selection()` plutôt que le panneau : l'article peut être engagé sans
    // que la fiche soit encore apparue — l'échappée doit valoir aussi là.
    if (selection()) transition(closeProduct)
    ;[drawer, menu].forEach((el) => isOpen(el) && closeOverlay(el))
    return
  }

  // Flèches : on passe d'un modèle à l'autre sans quitter la fiche.
  if (isOpen(pdp) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault()
    return stepModel(e.key === 'ArrowRight' ? 1 : -1)
  }

  // Ouverture de la fiche au clavier depuis une carte.
  if (e.key === 'Enter' || e.key === ' ') {
    const media = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-open-product]')
    if (!media) return
    e.preventDefault()
    const card = media.closest<HTMLElement>('[data-slug]')
    const p = find(card?.dataset.slug)
    if (p) openProduct(p, card?.dataset.colourName)
  }
})

/* --- démarrage ----------------------------------------------------------- */

history.scrollRestoration = 'manual'

initCursor()
startOpening()
renderGrid()
renderLookbook()
renderCart()
setupMarquees()
playIntro()
