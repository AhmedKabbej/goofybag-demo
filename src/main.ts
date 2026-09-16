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

// point d'entree
// ici que du routing : un seul listener click et un seul keydown sur document
// je fais de la delegation partout pcq les panneaux refont leur innerHTML
// tout le temps dc avec des listeners directs faudrait rebrancher a chaque fois

const menu = q<HTMLElement>('[data-menu]')!

document.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return
  const t = e.target
  const hit = <T extends HTMLElement = HTMLElement>(sel: string) => t.closest<T>(sel)

  // ouverture / fermeture des panneaux
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

  // les pages service passent par le rideau (transition)
  if (hit('[data-close-page]')) return transition(closePage)
  const toPage = hit<HTMLElement>('[data-page]')?.dataset.page
  if (toPage) return transition(() => openPage(toPage))

  const sel = selection()
  if (hit('[data-open-viewer]')) return void (sel && openViewer(sel))

  // clic sur une pastille couleur dans la grille
  const cardDot = hit('[data-card-dot]')
  const card = hit('[data-slug]')
  if (cardDot?.dataset.cardDot && card) return setCardColour(card, cardDot.dataset.cardDot)

  // couleur / taille dans la fiche produit
  const pickColour = hit('[data-pick-colour]')
  if (pickColour?.dataset.pickColour) return setColour(pickColour.dataset.pickColour)

  const pickSize = hit('[data-pick-size]')
  if (pickSize?.dataset.pickSize) return setSize(pickSize.dataset.pickSize)

  const fold = hit('[data-fold]')
  if (fold) return toggleFold(fold)

  // fleches precedent / suivant dans la fiche
  const step = hit('[data-model-step]')
  if (step) return stepModel(Number(step.dataset.modelStep))

  // ajout au panier. soit depuis une carte soit depuis la fiche
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

  // les liens #ancre : on passe par lenis sinon le scroll natif casse le smooth
  const anchor = hit<HTMLAnchorElement>('a[href^="#"]')
  const href = anchor?.getAttribute('href') ?? ''
  if (!anchor || href === '#') return
  const target = q<HTMLElement>(href)
  if (!target) return
  e.preventDefault()
  lenis.scrollTo(target, { offset: -70 })
})

document.addEventListener('keydown', (e) => {
  // ordre important : les panneaux du dessus mangent la touche en premier
  // (dans le viewer on tourne le sac, dans le checkout on tape des chiffres
  // dc les raccourcis globaux doivent pas passer)
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

  // la demo s'ouvre par dessus la page contact dc elle doit passer avant
  // sinon echap ferme la page qui est dessous et la demo reste toute seule
  if (isOpen(demo)) {
    if (e.key === 'Escape') closeDemo()
    return
  }

  if (isOpen(page)) {
    if (e.key === 'Escape') transition(closePage)
    return
  }

  if (e.key === 'Escape') {
    // on teste selection() et pas isOpen(pdp) pcq pendant le rideau le
    // produit est deja selectionne mais le panneau pas encore affiche
    if (selection()) transition(closeProduct)
    ;[drawer, menu].forEach((el) => isOpen(el) && closeOverlay(el))
    return
  }

  // fleches gauche/droite = modele suivant sans fermer la fiche
  if (isOpen(pdp) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault()
    return stepModel(e.key === 'ArrowRight' ? 1 : -1)
  }

  // entree / espace sur une carte = ouvrir la fiche (accessibilite)
  if (e.key === 'Enter' || e.key === ' ') {
    const media = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-open-product]')
    if (!media) return
    e.preventDefault()
    const card = media.closest<HTMLElement>('[data-slug]')
    const p = find(card?.dataset.slug)
    if (p) openProduct(p, card?.dataset.colourName)
  }
})

// --- init ---

history.scrollRestoration = 'manual'

initCursor()
startOpening()
renderGrid()
renderLookbook()
renderCart()
setupMarquees()
playIntro()
