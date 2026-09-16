import gsap from 'gsap'
import { euro, q, qq, reduced } from './dom'
import { linePrice, products } from './products'
import { lenis } from './scroll'

// le hero : les 5 sacs qui defilent toutes les 4s
// les images sont compressees (300ko les 5 au lieu de 8Mo) et seule la 1ere
// est chargee avec la page, les autres arrivent apres en idle

const VISUELS = ['bag1', 'bag2', 'bag3', 'bag4', 'bag5']
const TOUR = 4

const opening = q<HTMLElement>('[data-opening]')
const stage = q<HTMLElement>('[data-opening-stage]')

let at = 0
let cycle: gsap.core.Tween | null = null

function paint(i: number): void {
  const p = products[i]
  const c = p.colours[0]
  q<HTMLElement>('[data-opening-name]')!.textContent = p.name
  q<HTMLElement>('[data-opening-colour]')!.textContent = c.name
  q<HTMLElement>('[data-opening-price]')!.textContent = euro.format(linePrice(p, p.sizes[0].name))
  // on met le slug sur la scene comme sur une carte de la grille
  // du coup le clic ouvre la fiche sans code en plus
  stage!.dataset.slug = p.slug
  stage!.dataset.colourName = c.name
  qq<HTMLElement>('[data-opening-rail] span').forEach((el, k) =>
    el.classList.toggle('is-on', k === i),
  )
}

function show(i: number): void {
  const from = qq<HTMLElement>('.opening__shot', stage!)[at]
  const to = qq<HTMLElement>('.opening__shot', stage!)[i]
  at = i
  paint(i)
  if (reduced) {
    from?.classList.remove('is-on')
    to.classList.add('is-on')
    return
  }
  gsap.to(from, { opacity: 0, scale: 0.965, duration: 0.9, ease: 'power2.inOut' })
  from?.classList.remove('is-on')
  to.classList.add('is-on')
  gsap.fromTo(
    to,
    { opacity: 0, scale: 1.045 },
    { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' },
  )
}

export function startOpening(): void {
  if (!opening || !stage) return

  stage.innerHTML = products
    .map(
      (p, i) => `
      <img class="opening__shot${i === 0 ? ' is-on' : ''}" alt="${p.name}"
           ${i === 0 ? `src="/ouverture/${VISUELS[i]}.webp" fetchpriority="high"` : `data-src="/ouverture/${VISUELS[i]}.webp"`}
           decoding="async" />`,
    )
    .join('')

  q<HTMLElement>('[data-opening-rail]')!.innerHTML = products
    .map((_, i) => `<span${i === 0 ? ' class="is-on"' : ''}></span>`)
    .join('')

  paint(0)

  // on charge les 4 autres images une fois que la page est affichee
  const suite = () =>
    qq<HTMLImageElement>('img[data-src]', stage).forEach((img) => {
      img.src = img.dataset.src!
      img.removeAttribute('data-src')
    })
  if ('requestIdleCallback' in window) requestIdleCallback(suite, { timeout: 2500 })
  else setTimeout(suite, 1200)

  // le carrousel tourne que si le hero est visible. sinon on kill
  // (ca sert a rien d'animer qd l'user est plus bas dans la page)
  const relais = () => {
    cycle?.kill()
    cycle = gsap.delayedCall(TOUR, () => {
      show((at + 1) % products.length)
      relais()
    })
  }
  new IntersectionObserver(
    ([e]) => (e.isIntersecting ? relais() : cycle?.kill()),
    { threshold: 0.25 },
  ).observe(opening)

  q<HTMLElement>('[data-opening-rail]')!.addEventListener('click', (e) => {
    const dots = qq<HTMLElement>('[data-opening-rail] span')
    const i = dots.indexOf(e.target as HTMLElement)
    if (i >= 0 && i !== at) {
      show(i)
      relais()
    }
  })

  q<HTMLElement>('[data-opening-next]')?.addEventListener('click', () =>
    lenis.scrollTo(opening.offsetHeight, { duration: 1.1 }),
  )

  // le sac suit un peu la souris. quickTo et pas gsap.to sinon on cree un tween
  // a chaque pointermove et ca rame
  if (reduced) return
  const drift = { x: gsap.quickTo(stage, 'x', { duration: 1.1, ease: 'power3' }),
                  y: gsap.quickTo(stage, 'y', { duration: 1.1, ease: 'power3' }) }
  opening.addEventListener(
    'pointermove',
    (e) => {
      const r = opening.getBoundingClientRect()
      drift.x(((e.clientX - r.left) / r.width - 0.5) * 26)
      drift.y(((e.clientY - r.top) / r.height - 0.5) * 16)
    },
    { passive: true },
  )
  opening.addEventListener('pointerleave', () => {
    drift.x(0)
    drift.y(0)
  })
}
