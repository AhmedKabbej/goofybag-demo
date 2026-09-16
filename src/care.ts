import gsap from 'gsap'
import { q, qq, reduced } from './dom'
import type { Page } from './page'

// page entretien
// le gros morceau c'est le canvas en haut : un sac plein de poussiere qu'on
// nettoie a la souris. le reste c'est du contenu statique (matieres, symboles)

type Matter = {
  key: string
  name: string
  plate: string
  rules: string[]
  never: string
}

const MATTERS: Matter[] = [
  {
    key: 'cord',
    name: 'Velours côtelé',
    plate: `
      <path class="k" d="M24 30h152v80H24z" pathLength="100" />
      <path class="k" d="M38 30v80M52 30v80M66 30v80M80 30v80M94 30v80M108 30v80M122 30v80M136 30v80M150 30v80M164 30v80" pathLength="100" />
      <path class="d" d="M24 22h152M24 18v8M176 118v8M24 118v8M24 122h152" />
      <path class="d" d="M186 30v80M182 30h8M182 110h8" />
      <circle class="p" cx="59" cy="70" r="2.6" />
      <path class="d" d="M31 30v80M27 30h8M27 110h8" />`,
    rules: [
      'Un brossage dans le sens de la côte, jamais en travers : la côte se couche, elle ne se peigne pas.',
      'Une tache fraîche part à l’eau tiède et au doigt. Tamponnez, ne frottez pas.',
      'Laissez sécher à plat, loin d’un radiateur — la chaleur écrase le velours et il ne se relève plus.',
    ],
    never: 'Jamais de machine, jamais de sèche-cheveux.',
  },
  {
    key: 'quilt',
    name: 'Nylon matelassé',
    plate: `
      <path class="k" d="M24 30h152v80H24z" pathLength="100" />
      <path class="k" d="M24 70 64 30M24 110 104 30M64 110 144 30M104 110 176 38M144 110 176 78" pathLength="100" />
      <path class="k" d="M24 70 64 110M24 30 104 110M64 30 144 110M104 30 176 102M144 30 176 62" pathLength="100" />
      <circle class="p" cx="64" cy="70" r="2.4" />
      <circle class="p" cx="104" cy="70" r="2.4" />
      <circle class="p" cx="144" cy="70" r="2.4" />
      <path class="d" d="M24 22h152M24 18v8M176 18v8" />
      <path class="d" d="M186 30v80M182 30h8M182 110h8" />`,
    rules: [
      'Une éponge à peine humide suffit. Le nylon ne boit rien : ce qui reste dessus part en surface.',
      'Un savon neutre pour les marques tenaces, puis un passage à l’eau claire pour ne pas laisser d’auréole.',
      'Séchez tout de suite au chiffon sec : l’eau qui stagne dans une couture finit par la marquer.',
    ],
    never: 'Jamais de solvant ni d’alcool — ils mangent le déperlant.',
  },
  {
    key: 'fur',
    name: 'Fausse fourrure',
    plate: `
      <path class="k" d="M24 30h152v80H24z" pathLength="100" />
      <path class="k" d="M36 108c0-18 6-28 12-28s10 8 10 22" pathLength="100" />
      <path class="k" d="M60 106c0-22 6-32 13-32s11 10 11 26" pathLength="100" />
      <path class="k" d="M86 108c0-18 6-30 13-30s11 10 11 26" pathLength="100" />
      <path class="k" d="M112 106c0-22 6-32 13-32s11 10 11 26" pathLength="100" />
      <path class="k" d="M138 108c0-18 6-28 12-28s11 8 11 22" pathLength="100" />
      <path class="d" d="M24 62h152" />
      <path class="d" d="M186 30v80M182 30h8M182 110h8" />
      <circle class="p" cx="99" cy="78" r="2.4" />
      <path class="d" d="M24 122h152M24 118v8M176 118v8" />`,
    rules: [
      'Un peigne à dents larges, du haut vers le bas, une fois par saison. Le poil se démêle, il ne se lave pas.',
      'Une tache se prend au chiffon humide, poil par poil, puis se sèche à froid.',
      'Rangez-la sans rien poser dessus : un poil écrasé six mois ne revient pas.',
    ],
    never: 'Jamais d’eau chaude — le poil frise et ne se défrise plus.',
  },
]

// les symboles d'entretien refaits en svg
const SIGNS: [string, string][] = [
  [
    'Ne pas laver',
    `<path class="k" d="M8 24h44v20a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8z" pathLength="100" />
     <path class="k" d="M8 24c2-10 8-14 14-11" pathLength="100" />
     <path class="k" d="M12 12 48 48M48 12 12 48" pathLength="100" />`,
  ],
  [
    'Ne pas javelliser',
    `<path class="k" d="M30 10 52 50H8z" pathLength="100" />
     <path class="k" d="M12 12 48 48M48 12 12 48" pathLength="100" />`,
  ],
  [
    'Ne pas sécher en tambour',
    `<path class="k" d="M8 14h44v32H8z" pathLength="100" />
     <circle class="k" cx="30" cy="30" r="13" pathLength="100" />
     <path class="k" d="M12 12 48 48M48 12 12 48" pathLength="100" />`,
  ],
  [
    'Nettoyage à sec, doux',
    `<circle class="k" cx="30" cy="30" r="21" pathLength="100" />
     <path class="k" d="M36 22a11 11 0 1 0 0 16" pathLength="100" />
     <path class="d" d="M8 50h44" />`,
  ],
  [
    'Ne pas repasser',
    `<path class="k" d="M8 42h44c0-16-10-24-22-24S8 26 8 42z" pathLength="100" />
     <path class="d" d="M4 46h52" />
     <path class="k" d="M12 12 48 48M48 12 12 48" pathLength="100" />`,
  ],
]

const FOLDS: [string, string][] = [
  [
    'Comment le ranger ?',
    "Debout, garni de son papier de soie, dans sa housse en coton — jamais dans un sac plastique, qui retient l'humidité et finit par tacher. Une étagère lui suffit ; un cintre lui déforme l'anse.",
  ],
  [
    'Il a pris la pluie.',
    "Videz-le, ouvrez-le, laissez-le sécher à température de pièce, loin de toute source de chaleur. Le velours se rebrosse une fois sec, le nylon n'a besoin de rien. Ne le séchez jamais au sèche-cheveux.",
  ],
  [
    'Une tache de gras.',
    "Saupoudrez de terre de Sommières, laissez agir une nuit entière, brossez au matin. C'est lent, c'est la seule méthode qui ne laisse pas d'auréole — et c'est celle que nous employons à l'atelier.",
  ],
  [
    'La garantie, concrètement.',
    "À vie, sur la fabrication : coutures, anse, fermeture, doublure. Nous réparons d'abord, nous remplaçons ensuite. L'usure normale d'une matière n'entre pas dans la garantie, mais nous la reprenons au tarif de l'atelier — souvent bien moins qu'on ne l'imagine.",
  ],
]

// --- le canvas a nettoyer ---

// grille 34x24 pour savoir ou on a deja nettoye. BRUSH = rayon du pinceau en px
const CELLS_X = 34
const CELLS_Y = 24
const BRUSH = 46

let root: HTMLElement | null = null
let cleaned: Uint8Array = new Uint8Array(CELLS_X * CELLS_Y)
let ctx: CanvasRenderingContext2D | null = null
let done = false
let detach: (() => void)[] = []

// redessine la poussiere et remet le compteur a 0. appele au resize aussi
function dust(): void {
  const canvas = q<HTMLCanvasElement>('[data-dust]', root ?? document)
  if (!canvas) return

  const box = canvas.getBoundingClientRect()
  if (!box.width) return
  const dpr = Math.min(2, devicePixelRatio || 1)
  canvas.width = Math.round(box.width * dpr)
  canvas.height = Math.round(box.height * dpr)

  ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalCompositeOperation = 'source-over'

  // d'abord un aplat puis 900 petits ronds par dessus pour le grain
  // sans le grain on dirait qu'on nettoie une vitre
  ctx.fillStyle = 'rgba(232, 231, 227, 0.94)'
  ctx.fillRect(0, 0, box.width, box.height)
  ctx.fillStyle = 'rgba(120, 118, 110, 0.16)'
  for (let i = 0; i < 900; i++) {
    const r = Math.random() * 2.4 + 0.4
    ctx.beginPath()
    ctx.arc(Math.random() * box.width, Math.random() * box.height, r, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalCompositeOperation = 'destination-out'
  cleaned = new Uint8Array(CELLS_X * CELLS_Y)
  done = false
  setPercent(0)
  q<HTMLElement>('[data-care-say]', root ?? document)?.classList.remove('is-done')
}

function setPercent(n: number): void {
  const el = q<HTMLElement>('[data-care-pct]', root ?? document)
  if (el) el.textContent = `${n} %`
}

// efface autour du curseur et recalcule le %
function wipe(canvas: HTMLCanvasElement, e: PointerEvent): void {
  if (!ctx || done) return
  const box = canvas.getBoundingClientRect()
  const x = e.clientX - box.left
  const y = e.clientY - box.top

  const grad = ctx.createRadialGradient(x, y, 0, x, y, BRUSH)
  grad.addColorStop(0, 'rgba(0,0,0,1)')
  grad.addColorStop(0.55, 'rgba(0,0,0,0.75)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, BRUSH, 0, Math.PI * 2)
  ctx.fill()

  // on relit PAS les pixels du canvas pour compter (getImageData a chaque move
  // = injouable) on coche juste les cases de la grille
  const cw = box.width / CELLS_X
  const ch = box.height / CELLS_Y
  const r = BRUSH * 0.6
  for (let gy = Math.floor((y - r) / ch); gy <= Math.floor((y + r) / ch); gy++) {
    for (let gx = Math.floor((x - r) / cw); gx <= Math.floor((x + r) / cw); gx++) {
      if (gx < 0 || gy < 0 || gx >= CELLS_X || gy >= CELLS_Y) continue
      cleaned[gy * CELLS_X + gx] = 1
    }
  }

  let n = 0
  for (let i = 0; i < cleaned.length; i++) n += cleaned[i]
  const pct = Math.round((n / cleaned.length) * 100)
  setPercent(pct)

  // a 88% on considere que c'est fini. aller chercher les derniers coins
  // c'est relou pour rien
  if (pct < 88) return
  done = true
  setPercent(100)
  const say = q<HTMLElement>('[data-care-say]', root ?? document)
  say?.classList.add('is-done')
  if (!reduced) gsap.to(canvas, { opacity: 0, duration: 0.7, ease: 'power2.out' })
  else canvas.style.opacity = '0'
}

// --- le markup ---

function markup(): string {
  return `
    <section class="page__hero">
      <p class="label reveal">Service — Entretien</p>
      <h1 class="page__title display reveal">Un sac<br />ne s'use pas.</h1>
      <p class="page__lede reveal">
        Il se patine. Ce qui suit ne sert qu'à l'accompagner : trois gestes par
        matière, cinq symboles, et un atelier qui reprend le vôtre à vie.
      </p>
    </section>

    <section class="page__sec">
      <div class="page__sec-head reveal">
        <h2 class="page__h2">Le geste</h2>
        <p class="page__sec-note">Passez la main sur le sac — un chiffon sec, sans appuyer</p>
      </div>

      <div class="care__wipe reveal">
        <figure class="care__swatch" data-swatch>
          <img src="/bag3.png" alt="Le Galet, sauge et écru" />
          <canvas class="care__dust" data-dust></canvas>
        </figure>
        <div class="care__say" data-care-say>
          <p class="care__pct" data-care-pct>0 %</p>
          <div class="care__swap">
            <p class="care__say-a">Le voile part au chiffon sec. Rien d'autre n'est nécessaire.</p>
            <p class="care__say-b">Propre. C'est tout ce qu'un sac demande, une fois par mois.</p>
          </div>
          <button class="linklike care__reset" type="button" data-care-reset>Recommencer</button>
        </div>
      </div>
    </section>

    <section class="page__sec">
      <div class="page__sec-head reveal">
        <h2 class="page__h2">Les trois matières</h2>
        <p class="page__sec-note">Chacune demande son geste</p>
      </div>

      <div class="matters reveal">
        <div class="matters__tabs" role="tablist" aria-label="Matière">
          ${MATTERS.map(
            (m, i) => `
            <button class="matters__tab${i ? '' : ' is-on'}" type="button" role="tab"
                    aria-selected="${i ? 'false' : 'true'}" data-matter="${m.key}">${m.name}</button>`,
          ).join('')}
        </div>

        <figure class="matters__plate">
          <svg class="art matters__svg" viewBox="0 0 200 140" aria-hidden="true"></svg>
        </figure>

        <div class="matters__text">
          <ol class="matters__rules" data-matter-rules></ol>
          <p class="matters__never" data-matter-never></p>
        </div>
      </div>
    </section>

    <section class="page__sec">
      <div class="page__sec-head reveal">
        <h2 class="page__h2">Les symboles</h2>
        <p class="page__sec-note">Ceux qui figurent sous la doublure</p>
      </div>
      <ul class="signs reveal">
        ${SIGNS.map(
          ([cap, art]) => `
          <li class="signs__item">
            <svg class="art signs__svg" viewBox="0 0 60 60" aria-hidden="true">${art}</svg>
            <span>${cap}</span>
          </li>`,
        ).join('')}
      </ul>
    </section>

    <section class="page__sec">
      <div class="page__sec-head reveal">
        <h2 class="page__h2">Le reste</h2>
      </div>
      <div class="page__folds reveal">
        ${FOLDS.map(
          ([t, b]) => `
          <div class="fold">
            <button class="fold__head" type="button" data-fold aria-expanded="false">
              ${t}<span class="fold__sign">+</span>
            </button>
            <div class="fold__body" hidden><p>${b}</p></div>
          </div>`,
        ).join('')}
      </div>
    </section>

    <section class="page__cta">
      <p class="label reveal">Une réparation, une reprise, un doute</p>
      <button class="page__cta-link reveal" type="button" data-page="write">Écrire à l'atelier</button>
    </section>`
}

// change de matiere : on redessine le svg et on remonte les regles
function pickMatter(key: string): void {
  if (!root) return
  const m = MATTERS.find((x) => x.key === key) ?? MATTERS[0]
  const svg = q<SVGSVGElement>('.matters__svg', root)!
  const rules = q<HTMLElement>('[data-matter-rules]', root)!

  qq<HTMLElement>('[data-matter]', root).forEach((b) => {
    const on = b.dataset.matter === key
    b.classList.toggle('is-on', on)
    b.setAttribute('aria-selected', String(on))
  })

  svg.innerHTML = m.plate
  rules.innerHTML = m.rules
    .map((r, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><p>${r}</p></li>`).join('')
  q<HTMLElement>('[data-matter-never]', root)!.textContent = m.never

  if (reduced) return
  const strokes = qq<SVGElement>('.k', svg)
  gsap
    .timeline()
    .fromTo(strokes, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.8, stagger: 0.05, ease: 'power2.inOut' }, 0)
    .fromTo(qq<SVGElement>('.d, .p', svg), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.35)
    .fromTo(rules.children, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.07, ease: 'power3.out' }, 0.1)
}

export const care: Page = {
  eyebrow: 'GoofyBag — Entretien',
  markup,
  mount(host) {
    root = host
    qq<HTMLElement>('[data-matter]', host).forEach((b) =>
      b.addEventListener('click', () => pickMatter(b.dataset.matter!)),
    )
    pickMatter(MATTERS[0].key)

    const canvas = q<HTMLCanvasElement>('[data-dust]', host)!
    const move = (e: PointerEvent) => wipe(canvas, e)
    // a la souris le survol suffit, au doigt faut appuyer
    // dc on teste pressure/buttons que pour le tactile
    const touchMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') e.preventDefault()
      if (e.pointerType === 'mouse' || e.pressure > 0 || e.buttons) wipe(canvas, e)
    }
    canvas.addEventListener('pointermove', touchMove, { passive: false })
    canvas.addEventListener('pointerdown', move)
    const reset = () => dust()
    q<HTMLElement>('[data-care-reset]', host)?.addEventListener('click', reset)
    window.addEventListener('resize', reset)

    detach = [
      () => canvas.removeEventListener('pointermove', touchMove),
      () => canvas.removeEventListener('pointerdown', move),
      () => window.removeEventListener('resize', reset),
    ]

    // double rAF : faut attendre que le layout soit fait sinon getBoundingClientRect
    // renvoie 0 et le canvas est vide
    requestAnimationFrame(() => requestAnimationFrame(dust))
  },
  unmount() {
    detach.forEach((off) => off())
    detach = []
    ctx = null
    root = null
    done = false
  },
}
