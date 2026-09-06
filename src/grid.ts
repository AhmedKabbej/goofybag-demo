import { euro, q, qq } from './dom'
import { defaultColour, find, products, type Product } from './products'
import { observeReveals } from './reveal'

/* -------------------------------------------------------------------------
   Grille produits — la carte montre la déclinaison suivante au survol
   ---------------------------------------------------------------------- */

function cardMarkup(p: Product): string {
  const c = defaultColour(p)
  const next = p.colours[1] ?? c
  return `
    <article class="card reveal" data-slug="${p.slug}" data-colour-name="${c.name}">
      <div class="card__media" data-open-product role="button" tabindex="0"
           aria-label="Voir ${p.name}, ${c.name}">
        ${p.tag ? `<span class="card__tag">${p.tag}</span>` : ''}
        <img data-card-img src="${c.image}" alt="${p.name} — ${c.name}" loading="lazy" />
        <img class="card__img--alt" data-card-img-alt src="${next.image}" alt="" aria-hidden="true" loading="lazy" />
        <button class="card__add" type="button" data-add>Ajouter au panier</button>
      </div>
      <div class="card__info">
        <h3 class="card__name">${p.name}</h3>
        <p class="card__price">${euro.format(p.price)}</p>
        <p class="card__colour" data-card-colour>${c.name}</p>
        <div class="card__dots">
          ${p.colours
            .map(
              (col, i) => `
            <button class="card__dot" type="button" data-card-dot="${col.name}"
                    aria-pressed="${i === 0}" title="${col.name}"
                    aria-label="${p.name} en ${col.name}">
              <span style="background:${col.hex}"></span>
            </button>`,
            )
            .join('')}
        </div>
      </div>
    </article>`
}

export function renderGrid(): void {
  const grid = q<HTMLElement>('[data-grid]')
  if (!grid) return
  grid.innerHTML = products.map(cardMarkup).join('')
  observeReveals()
}

/** Change la déclinaison affichée sur une carte, sans ouvrir la fiche. */
export function setCardColour(card: HTMLElement, name: string): void {
  const p = find(card.dataset.slug)
  if (!p) return
  const i = p.colours.findIndex((c) => c.name === name)
  if (i < 0) return

  const c = p.colours[i]
  const next = p.colours[(i + 1) % p.colours.length]
  card.dataset.colourName = c.name

  const img = q<HTMLImageElement>('[data-card-img]', card)
  const alt = q<HTMLImageElement>('[data-card-img-alt]', card)
  if (img) {
    img.src = c.image
    img.alt = `${p.name} — ${c.name}`
  }
  if (alt) alt.src = next.image

  const caption = q<HTMLElement>('[data-card-colour]', card)
  if (caption) caption.textContent = c.name

  q<HTMLElement>('[data-open-product]', card)?.setAttribute(
    'aria-label',
    `Voir ${p.name}, ${c.name}`,
  )

  qq<HTMLElement>('[data-card-dot]', card).forEach((dot) =>
    dot.setAttribute('aria-pressed', String(dot.dataset.cardDot === c.name)),
  )
}
