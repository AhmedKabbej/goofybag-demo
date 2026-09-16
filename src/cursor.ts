import gsap from 'gsap'

// curseur custom
// 2 elements : la croix qui suit la souris pile poil et le cercle qui suit
// avec du retard. le cercle change de taille selon ce qu'on survole
// uniquement sur desktop avec une souris. c'est ce fichier qui ajoute la classe
// has-cur dc si le js plante on garde le curseur normal

type Mode = 'idle' | 'link' | 'lens' | 'still' | 'close' | 'drag' | 'text'

// taille du cercle + texte affiche pour chaque etat
const SPEC: Record<Mode, { scale: number; label: string }> = {
  idle: { scale: 0.6, label: '' },
  link: { scale: 1, label: 'Activer' },
  lens: { scale: 1.62, label: 'Observer' },
  // still = image pas cliquable dc pas de label, on reduit juste le cercle
  still: { scale: 0.46, label: '' },
  close: { scale: 0.9, label: 'Fermer' },
  drag: { scale: 1.2, label: 'Glisser' },
  text: { scale: 0.6, label: 'Saisie' },
}

// l'ordre compte : on prend la 1ere qui match dc du plus precis au plus large
const RULES: { mode: Mode; sel: string }[] = [
  {
    mode: 'close',
    sel: [
      '[data-close-menu]',
      '[data-close-cart]',
      '[data-close-pdp]',
      '[data-close-pay]',
      '[data-close-viewer]',
      '[data-close-page]',
      '[data-close-demo]',
      '.drawer__scrim',
      '.viewer__scrim',
      '.demo__scrim',
      '.pay__scrim',
      '.menu__close',
    ].join(','),
  },
  { mode: 'text', sel: 'input:not([type="button"]):not([type="submit"]), textarea' },
  { mode: 'drag', sel: '.viewer__stage, [data-lume-track], .lume' },
  // la loupe que sur les trucs qui s'ouvrent vraiment
  {
    mode: 'lens',
    sel: ['[data-open-product]', '[data-open-viewer]', '[data-open-demo]', '.card__media', '.partners__link'].join(','),
  },
  {
    mode: 'still',
    sel: ['.pdp__media', '.hero__media', '.editorial__media', '.lookbook figure'].join(','),
  },
  { mode: 'link', sel: 'a, button, select, summary, label, [role="button"], [role="slider"], [tabindex]' },
]

const MARKUP = `
  <div class="cur__lag">
    <svg class="cur__glyph" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <clipPath id="cur-clip"><circle cx="32" cy="32" r="13" /></clipPath>
      </defs>
      <circle class="cur__dish" cx="32" cy="32" r="27" />
      <circle class="cur__lens" cx="32" cy="32" r="13" />
      <g class="cur__ticks">
        <path d="M32 15.5v5M32 43.5v5M15.5 32h5M43.5 32h5" />
      </g>
      <g class="cur__scan" clip-path="url(#cur-clip)">
        <path d="M19 32h26" />
      </g>
      <path class="cur__x" d="M25 25l14 14M39 25l-14 14" />
      <g class="cur__arrows">
        <path d="M24 28l-5 4 5 4M40 28l5 4-5 4" />
      </g>
    </svg>
    <div class="cur__hud">
      <span class="cur__label" data-cur-label></span>
      <span class="cur__coord" data-cur-coord></span>
    </div>
  </div>
  <div class="cur__pin">
    <span class="cur__cross"></span>
    <span class="cur__beam"></span>
  </div>`

const pad = (n: number) => String(Math.max(0, Math.round(n))).padStart(4, '0')

export function initCursor(): void {
  // pas de souris (mobile / tablette) = on fait rien du tout
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  const root = document.createElement('div')
  root.className = 'cur is-idle'
  root.setAttribute('aria-hidden', 'true')
  root.innerHTML = MARKUP
  document.body.appendChild(root)
  document.documentElement.classList.add('has-cur')

  const lag = root.querySelector<HTMLElement>('.cur__lag')!
  const pin = root.querySelector<HTMLElement>('.cur__pin')!
  const glyph = root.querySelector<SVGSVGElement>('.cur__glyph')!
  const label = root.querySelector<HTMLElement>('[data-cur-label]')!
  const coord = root.querySelector<HTMLElement>('[data-cur-coord]')!

  gsap.set([lag, pin], { xPercent: -50, yPercent: -50, x: -100, y: -100 })
  gsap.set(glyph, { scale: SPEC.idle.scale })

  // quickSetter pour la croix (instantane) et quickTo pour le cercle (retard)
  // c'est ce decalage qui fait tout l'effet
  const pinX = gsap.quickSetter(pin, 'x', 'px')
  const pinY = gsap.quickSetter(pin, 'y', 'px')
  const lagX = reduced ? pinX : gsap.quickTo(lag, 'x', { duration: 0.42, ease: 'power3' })
  const lagY = reduced ? pinY : gsap.quickTo(lag, 'y', { duration: 0.42, ease: 'power3' })

  let mode: Mode = 'idle'
  let text = ''

  function setMode(next: Mode, caption: string): void {
    if (next === mode && caption === text) return
    if (next !== mode) {
      root.classList.remove(`is-${mode}`)
      root.classList.add(`is-${next}`)
      gsap.to(glyph, {
        scale: SPEC[next].scale,
        duration: reduced ? 0 : 0.45,
        ease: 'power3.out',
        overwrite: true,
      })
      mode = next
    }
    text = caption
    label.textContent = caption
  }

  // regarde ce qu'ya sous la souris et met le bon etat
  function read(target: EventTarget | null): void {
    const el = target instanceof Element ? target : null
    if (!el) return setMode('idle', SPEC.idle.label)

    // un data-cursor sur l'element (ou un parent) passe avant les regles
    const named = el.closest<HTMLElement>('[data-cursor], [data-cursor-label]')
    const rule = RULES.find((r) => el.closest(r.sel))

    // data-cursor = l'etat / data-cursor-label = juste le texte
    const forced = named?.dataset.cursor as Mode | undefined
    const next = forced && forced in SPEC ? forced : (rule?.mode ?? 'idle')
    const caption = named?.dataset.cursorLabel ?? SPEC[next].label

    setMode(next, caption)
  }

  // rallume le curseur qd la souris revient
  const show = () => root.classList.add('is-on')

  // on garde la derniere position pour pouvoir relire sans mouvement (voir plus bas)
  const last = { x: -1, y: -1 }

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return
      last.x = e.clientX
      last.y = e.clientY
      pinX(e.clientX)
      pinY(e.clientY)
      lagX(e.clientX)
      lagY(e.clientY)
      coord.textContent = `x ${pad(e.clientX)} · y ${pad(e.clientY)}`
      // proche du bord droit / bas on fait passer le texte de l'autre cote
      root.classList.toggle('is-edge-x', e.clientX > innerWidth - 170)
      root.classList.toggle('is-edge-y', e.clientY > innerHeight - 80)
      read(e.target)
      show()
    },
    { passive: true },
  )

  // ce qu'ya sous la souris peut changer sans que la souris bouge
  // (scroll, panneau qui s'ouvre...) dc on relit avec elementFromPoint
  const relire = () => {
    if (last.x >= 0) read(document.elementFromPoint(last.x, last.y))
  }
  window.addEventListener('scroll', relire, { passive: true })
  window.addEventListener('pointerup', () => requestAnimationFrame(relire))

  window.addEventListener('pointerdown', () => root.classList.add('is-down'))
  window.addEventListener('pointerup', () => root.classList.remove('is-down'))
  window.addEventListener('pointercancel', () => root.classList.remove('is-down'))
  window.addEventListener('blur', () => root.classList.remove('is-down'))

  // si la souris sort de la page on cache le curseur sinon il reste colle au bord
  document.addEventListener('pointerleave', () => root.classList.remove('is-on'))
  document.addEventListener('pointerenter', () => root.classList.add('is-on'))
}
