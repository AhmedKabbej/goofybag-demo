import gsap from 'gsap'
import { q, qq, reduced } from './dom'
import { lenis } from './scroll'
import { observeReveals } from './reveal'

/* -------------------------------------------------------------------------
   Le décor de la page : l'en-tête qui se rétracte, le millésime du pied de
   page, les dépliants de la fiche, les rubans défilants, et l'ouverture.
   ---------------------------------------------------------------------- */

const header = q<HTMLElement>('#header')!
lenis.on('scroll', ({ scroll }: { scroll: number }) =>
  header.classList.toggle('is-stuck', scroll > 24),
)

q<HTMLFormElement>('[data-newsletter]')?.addEventListener('submit', (e) => {
  e.preventDefault()
  ;(e.currentTarget as HTMLFormElement).reset()
  const note = q<HTMLElement>('[data-newsletter-note]')
  if (note) note.hidden = false
})

const year = q<HTMLElement>('[data-year]')
if (year) year.textContent = String(new Date().getFullYear())

/** Déplie ou replie un bloc, en animant sa hauteur. */
export function toggleFold(head: HTMLElement): void {
  const body = head.nextElementSibling as HTMLElement | null
  if (!body) return

  const open = head.getAttribute('aria-expanded') === 'true'
  head.setAttribute('aria-expanded', String(!open))
  const sign = q<HTMLElement>('.fold__sign', head)
  if (sign) sign.textContent = open ? '+' : '−'

  if (reduced) {
    body.hidden = open
    return
  }

  gsap.killTweensOf(body)
  if (open) {
    gsap.to(body, {
      height: 0,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.inOut',
      onComplete: () => {
        body.hidden = true
        gsap.set(body, { clearProps: 'height,opacity' })
      },
    })
    return
  }

  body.hidden = false
  gsap.from(body, {
    height: 0,
    opacity: 0,
    duration: 0.5,
    ease: 'power2.out',
    // La hauteur revient à `auto` : le bloc suivra un changement de largeur.
    onComplete: () => gsap.set(body, { clearProps: 'height' }),
  })
}

/* -------------------------------------------------------------------------
   Rubans défilants — assez de copies pour couvrir deux écrans, vitesse en px/s
   ---------------------------------------------------------------------- */

export function setupMarquees(): void {
  qq<HTMLElement>('[data-marquee]').forEach((track) => {
    const first = track.firstElementChild
    if (!first) return

    const model = first.cloneNode(true) as HTMLElement
    const speed = Number(track.dataset.speed ?? 60)

    const build = () => {
      gsap.killTweensOf(track)
      track.replaceChildren(model.cloneNode(true))

      const unit = (track.firstElementChild as HTMLElement).getBoundingClientRect().width
      if (!unit) return

      // Nombre pair de copies : le décalage de 50 % tombe alors pile sur une
      // copie entière, la boucle est invisible même sur un écran très large.
      let copies = Math.max(2, Math.ceil((window.innerWidth * 2) / unit))
      if (copies % 2) copies += 1
      for (let i = 1; i < copies; i++) track.appendChild(model.cloneNode(true))

      gsap.set(track, { xPercent: 0 })
      if (reduced) return
      gsap.to(track, {
        xPercent: -50,
        duration: (unit * copies) / 2 / speed,
        ease: 'none',
        repeat: -1,
      })
    }

    build()
    // Les largeurs changent une fois les polices chargées, puis au redimensionnement.
    document.fonts?.ready.then(build)

    let pending: ReturnType<typeof setTimeout> | undefined
    window.addEventListener('resize', () => {
      clearTimeout(pending)
      pending = setTimeout(build, 180)
    })
  })
}

/* -------------------------------------------------------------------------
   Intro d'ouverture — le nom, un filet qui se trace, puis le rideau se lève
   ---------------------------------------------------------------------- */

const counter = { v: 0 }

export function playIntro(): void {
  const intro = q<HTMLElement>('[data-intro]')
  if (!intro) return observeReveals()

  if (reduced) {
    intro.remove()
    observeReveals()
    return
  }

  lenis.stop()

  // L'intro ne doit jamais rester en travers : dans un onglet en arrière-plan,
  // requestAnimationFrame est suspendu et la timeline se figerait, scroll bloqué.
  // Ce garde-fou la termine d'office, quoi qu'il arrive.
  let done = false
  const finish = () => {
    if (done) return
    done = true
    intro.remove()
    lenis.start()
    observeReveals()
  }

  gsap
    .timeline({ onComplete: finish })
    .from('.intro__mark', { yPercent: 28, opacity: 0, duration: 1, ease: 'power3.out' })
    .from(
      '.intro__meta span',
      { y: 10, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' },
      '-=0.65',
    )
    .to('[data-intro-rule]', { scaleX: 1, duration: 1.4, ease: 'power2.inOut' }, '-=0.5')
    .to(
      counter,
      {
        v: 100,
        duration: 1.4,
        ease: 'power2.inOut',
        onUpdate: () => {
          const el = q<HTMLElement>('[data-intro-count]')
          if (el) el.textContent = String(Math.round(counter.v)).padStart(2, '0')
        },
      },
      '<',
    )
    .to(intro, { yPercent: -100, duration: 0.9, ease: 'power3.inOut' }, '+=0.15')
    .add(observeReveals, '<0.2')

  setTimeout(finish, 6000)
}
