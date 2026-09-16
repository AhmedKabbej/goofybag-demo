import gsap from 'gsap'
import { euro, q, qq, reduced } from './dom'
import {
  colourOf,
  defaultColour,
  linePrice,
  products,
  sizeOf,
  type Product,
  type Selection,
} from './products'
import { closeOverlay, openOverlay, transition } from './overlay'

// la fiche produit. la couleur change l'image et la taille change le prix
// tout passe par syncPdp() on refait jamais le html sauf changement de modele

export const pdp = q<HTMLElement>('[data-pdp]')!

let current: Selection | null = null

function pdpMarkup({ p, colour, size }: Selection): string {
  const c = colourOf(p, colour)
  const n = products.indexOf(p) + 1
  const pad = (v: number) => String(v).padStart(2, '0')

  const foldMarkup = (title: string, body: string, open = false) => `
    <div class="fold">
      <button class="fold__head" type="button" data-fold aria-expanded="${open}">
        ${title}<span class="fold__sign">${open ? '−' : '+'}</span>
      </button>
      <div class="fold__body"${open ? '' : ' hidden'}>${body}</div>
    </div>`

  return `
    <div class="pdp__panel" data-lenis-prevent>
      <div class="pdp__top">
        <button class="linklike" type="button" data-close-pdp>Fermer</button>
        <div class="pdp__pager">
          <button type="button" data-model-step="-1" aria-label="Modèle précédent">←</button>
          <span class="pdp__count">${pad(n)} / ${pad(products.length)}</span>
          <button type="button" data-model-step="1" aria-label="Modèle suivant">→</button>
        </div>
      </div>

      <div class="pdp__head">
        <p class="label">${p.tag ?? 'Collection 01'}</p>
        <h2 class="pdp__title">${p.name}</h2>
        <p class="pdp__price" data-pdp-price>${euro.format(linePrice(p, size))}</p>
      </div>

      <div class="pdp__options">
        <div class="opt">
          <p class="opt__label">Couleur</p>
          <div class="opt__list">
            ${p.colours
              .map(
                (col) => `
              <button class="opt__choice" type="button" data-pick-colour="${col.name}"
                      aria-pressed="${col.name === c.name}">
                <span class="opt__swatch" style="background:${col.hex}"></span>${col.name}
              </button>`,
              )
              .join('')}
          </div>
        </div>

        <div class="opt">
          <p class="opt__label">Taille</p>
          <div class="opt__list">
            ${p.sizes
              .map(
                (s) => `
              <button class="opt__choice" type="button" data-pick-size="${s.name}"
                      aria-pressed="${s.name === size}">
                ${s.name}
                ${s.delta ? `<span class="opt__delta">${s.delta > 0 ? '+' : '−'}${euro.format(Math.abs(s.delta))}</span>` : ''}
              </button>`,
              )
              .join('')}
            <p class="opt__dims" data-pdp-dims>${sizeOf(p, size).dims}</p>
          </div>
        </div>
      </div>

      <div class="pdp__folds">
        ${foldMarkup('Description', `<p>${p.description}</p>`, true)}
        ${foldMarkup('Détails', `<ul>${p.details.map((d) => `<li>${d}</li>`).join('')}</ul>`)}
        ${foldMarkup(
          'Livraison',
          '<p>Expédition sous 48 h depuis Paris. Retours acceptés trente jours, port offert.</p>',
        )}
      </div>

      <button class="pdp__buy" type="button" data-add-pdp>
        <span>Ajouter au panier</span>
        <span data-pdp-buy-price>${euro.format(linePrice(p, size))}</span>
      </button>
    </div>

    <div class="pdp__media" data-pdp-media
         data-cursor-label="${p.name} · ${sizeOf(p, size).dims}">
      <img data-pdp-img src="${c.image}" alt="${p.name} — ${c.name}" />
      <button class="pdp__view3d" type="button" data-open-viewer>Aperçu 3D</button>
      <div class="pdp__nav">
        ${p.colours
          .map(
            (col) => `
          <button class="pdp__dot" type="button" data-pick-colour="${col.name}"
                  aria-pressed="${col.name === c.name}" aria-label="${col.name}" title="${col.name}">
            <img src="${col.image}" alt="" aria-hidden="true" />
          </button>`,
          )
          .join('')}
      </div>
    </div>`
}

const PDP_BLOCKS = '.pdp__top, .pdp__head, .pdp__options, .pdp__folds, .pdp__buy'

// l'entree de la fiche : les blocs montent en decale et l'image dezoome
function animatePdpIn(delay = 0.1): void {
  if (reduced) return
  gsap.from(qq(PDP_BLOCKS, pdp), {
    y: 16,
    opacity: 0,
    duration: 0.85,
    stagger: 0.07,
    ease: 'power3.out',
    delay,
  })
  gsap.from(q('.pdp__media img', pdp), { scale: 1.05, duration: 1.4, ease: 'power3.out' })
}

export function openProduct(p: Product, colour = defaultColour(p).name): void {
  // on set current TOUT DE SUITE et pas dans le callback du rideau
  // sinon si on fait echap pendant l'ouverture y'a rien a fermer et la fiche
  // s'ouvre qd meme apres coup
  current = { p, colour, size: p.sizes[0].name }
  transition(() => {
    if (!current) return
    pdp.innerHTML = pdpMarkup(current)
    // pas de fade ici, le rideau fait deja le boulot et les blocs ont leur
    // propre anim. avec le fade en plus ca restait a moitie transparent
    openOverlay(pdp, false)
    animatePdpIn()
  })
}

// change de modele sans fermer la fiche
function showModel(p: Product): void {
  if (!current || p === current.p) return
  const swap = () => {
    current = { p, colour: defaultColour(p).name, size: p.sizes[0].name }
    pdp.innerHTML = pdpMarkup(current)
    q<HTMLElement>('.pdp__panel', pdp)?.scrollTo({ top: 0 })
    animatePdpIn(0)
  }

  if (reduced) return swap()

  gsap.to(qq(`${PDP_BLOCKS}, .pdp__media img`, pdp), {
    opacity: 0,
    y: -10,
    duration: 0.3,
    stagger: 0.03,
    ease: 'power2.in',
    onComplete: swap,
  })
}

// modele suivant / precedent. ca boucle
export function stepModel(step: number): void {
  if (!current) return
  const i = products.indexOf(current.p)
  showModel(products[(i + step + products.length) % products.length])
}

// remet a jour l'image le prix et les boutons actifs. pas de re-render
export function syncPdp(): void {
  if (!current) return
  const { p, colour, size } = current
  const c = colourOf(p, colour)

  const img = q<HTMLImageElement>('[data-pdp-img]', pdp)
  if (img) {
    img.src = c.image
    img.alt = `${p.name} — ${c.name}`
  }

  const price = euro.format(linePrice(p, size))
  const priceEl = q<HTMLElement>('[data-pdp-price]', pdp)
  if (priceEl) priceEl.textContent = price
  const buyEl = q<HTMLElement>('[data-pdp-buy-price]', pdp)
  if (buyEl) buyEl.textContent = price

  const dimsEl = q<HTMLElement>('[data-pdp-dims]', pdp)
  if (dimsEl) dimsEl.textContent = sizeOf(p, size).dims


  qq<HTMLElement>('[data-pick-colour]', pdp).forEach((el) =>
    el.setAttribute('aria-pressed', String(el.dataset.pickColour === c.name)),
  )
  qq<HTMLElement>('[data-pick-size]', pdp).forEach((el) =>
    el.setAttribute('aria-pressed', String(el.dataset.pickSize === size)),
  )

  // le label du curseur custom, faut le remettre a jour aussi
  q<HTMLElement>('[data-pdp-media]', pdp)?.setAttribute(
    'data-cursor-label',
    `${p.name} · ${sizeOf(p, size).dims}`,
  )
}

// utilise par le viewer 3D et le panier
export const selection = (): Selection | null => current

export function setColour(name: string): void {
  if (!current) return
  current.colour = name
  syncPdp()
}

export function setSize(name: string): void {
  if (!current) return
  current.size = name
  syncPdp()
}

// bien remettre current a null (voir openProduct)
export function closeProduct(): void {
  current = null
  closeOverlay(pdp)
}
