import { euro, q } from './dom'
import { colourOf, find, linePrice } from './products'
import { openOverlay } from './overlay'

/* -------------------------------------------------------------------------
   Panier — une ligne par couple couleur / taille
   ---------------------------------------------------------------------- */

export type Line = { slug: string; colour: string; size: string; qty: number }

export const cart = new Map<string, Line>()
export const drawer = q<HTMLElement>('[data-cart]')!
const cartBody = q<HTMLElement>('[data-cart-body]')!
const cartTotal = q<HTMLElement>('[data-cart-total]')!
const cartCount = q<HTMLElement>('[data-cart-count]')!

const keyOf = (slug: string, colour: string, size: string) => `${slug}|${colour}|${size}`

export function addToCart(slug: string, colour: string, size: string): void {
  const key = keyOf(slug, colour, size)
  const line = cart.get(key)
  if (line) line.qty += 1
  else cart.set(key, { slug, colour, size, qty: 1 })
  renderCart()
  openOverlay(drawer)
}

export function setQty(key: string, step: number): void {
  const line = cart.get(key)
  if (!line) return
  line.qty += step
  if (line.qty <= 0) cart.delete(key)
  renderCart()
}

export function renderCart(): void {
  const lines = Array.from(cart.entries()).flatMap(([key, line]) => {
    const p = find(line.slug)
    return p ? [{ key, line, p }] : []
  })

  cartCount.textContent = String(lines.reduce((n, l) => n + l.line.qty, 0))
  cartTotal.textContent = euro.format(
    lines.reduce((n, { p, line }) => n + linePrice(p, line.size) * line.qty, 0),
  )

  cartBody.innerHTML = lines.length
    ? lines
        .map(
          ({ key, line, p }) => `
          <div class="line">
            <div class="line__media"><img src="${colourOf(p, line.colour).image}" alt="" /></div>
            <div>
              <h4 class="line__name">${p.name}</h4>
              <p class="line__colour">${line.colour} · ${line.size}</p>
              <div class="line__qty">
                <button type="button" data-qty="-1" data-key="${key}" aria-label="Retirer un exemplaire">−</button>
                <span>${line.qty}</span>
                <button type="button" data-qty="1" data-key="${key}" aria-label="Ajouter un exemplaire">+</button>
              </div>
            </div>
            <span class="line__price">${euro.format(linePrice(p, line.size) * line.qty)}</span>
          </div>`,
        )
        .join('')
    : '<p class="drawer__empty">Votre panier est vide</p>'
}
