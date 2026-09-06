import gsap from 'gsap'

/* -------------------------------------------------------------------------
   Curseur — un réticule d'instrument

   Le pointeur du système disparaît au profit d'un viseur : une croix précise
   qui ne retarde jamais sur la main, une lunette qui la rattrape avec un
   temps de retard, et une petite lecture chiffrée — la position du point,
   en pixels — comme sur un banc optique.

   Le viseur change d'état selon ce qu'il survole : il s'ouvre sur un lien,
   s'écarte en loupe sur une image, se barre d'une croix rouge sur une
   commande de fermeture, montre deux flèches là où l'on fait glisser, et
   s'efface au profit d'un trait vertical dans un champ de saisie.

   Rien de tout cela ne s'active sans une souris : au doigt, ou si le script
   ne tourne pas, le pointeur natif reste en place (la classe `has-cur`, posée
   d'ici, est la seule à masquer le curseur du système).
   ---------------------------------------------------------------------- */

type Mode = 'idle' | 'link' | 'lens' | 'still' | 'close' | 'drag' | 'text'

/** Ouverture de la lunette et légende, pour chaque état. */
const SPEC: Record<Mode, { scale: number; label: string }> = {
  idle: { scale: 0.6, label: '' },
  link: { scale: 1, label: 'Activer' },
  lens: { scale: 1.62, label: 'Observer' },
  /* Une image qui ne s'ouvre pas ne se propose pas : le viseur s'y referme, et
     ne dit que ce qu'il y a à savoir — le modèle, ses cotes. */
  still: { scale: 0.46, label: '' },
  close: { scale: 0.9, label: 'Fermer' },
  drag: { scale: 1.2, label: 'Glisser' },
  text: { scale: 0.6, label: 'Saisie' },
}

/* Ce qui se survole, et ce que le viseur en fait. L'ordre compte : la
   première règle qui répond l'emporte, du plus précis au plus général. */
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
  // La loupe ne va qu'à ce qui s'ouvre vraiment.
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
  // Pas de souris, pas de viseur : au doigt le pointeur natif reste seul maître.
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

  // La croix colle à la main ; la lunette la rattrape. C'est ce décalage,
  // et lui seul, qui donne l'impression d'un appareil que l'on déplace.
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

  /** Ce que le viseur doit devenir, à l'aplomb de ce point. */
  function read(target: EventTarget | null): void {
    const el = target instanceof Element ? target : null
    if (!el) return setMode('idle', SPEC.idle.label)

    // Une légende posée sur l'élément — ou sur son parent — l'emporte sur tout.
    const named = el.closest<HTMLElement>('[data-cursor], [data-cursor-label]')
    const rule = RULES.find((r) => el.closest(r.sel))

    // `data-cursor` impose l'état ; `data-cursor-label` ne change que le mot.
    const forced = named?.dataset.cursor as Mode | undefined
    const next = forced && forced in SPEC ? forced : (rule?.mode ?? 'idle')
    const caption = named?.dataset.cursorLabel ?? SPEC[next].label

    setMode(next, caption)
  }

  /** Rallumer l'instrument : la main est revenue sur la page. */
  const show = () => root.classList.add('is-on')

  // Dernier point connu : on en a besoin pour relire le survol sans mouvement.
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
      // Près d'un bord, la lecture bascule de l'autre côté du viseur.
      root.classList.toggle('is-edge-x', e.clientX > innerWidth - 170)
      root.classList.toggle('is-edge-y', e.clientY > innerHeight - 80)
      read(e.target)
      show()
    },
    { passive: true },
  )

  // Le survol peut changer sans que la main bouge : un panneau qui s'ouvre,
  // une carte qui se remplit. On relit alors sous le point resté immobile.
  const relire = () => {
    if (last.x >= 0) read(document.elementFromPoint(last.x, last.y))
  }
  window.addEventListener('scroll', relire, { passive: true })
  window.addEventListener('pointerup', () => requestAnimationFrame(relire))

  window.addEventListener('pointerdown', () => root.classList.add('is-down'))
  window.addEventListener('pointerup', () => root.classList.remove('is-down'))
  window.addEventListener('pointercancel', () => root.classList.remove('is-down'))
  window.addEventListener('blur', () => root.classList.remove('is-down'))

  // Sorti de la page, l'instrument s'éteint plutôt que de rester collé au bord.
  document.addEventListener('pointerleave', () => root.classList.remove('is-on'))
  document.addEventListener('pointerenter', () => root.classList.add('is-on'))
}
