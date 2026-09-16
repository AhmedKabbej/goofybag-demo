import gsap from 'gsap'
import { q, qq, reduced } from './dom'
import { closeOverlay, openOverlay } from './overlay'

// la preview 3D du quartier. c'est juste une video en boucle
// la demo est pas de nous (Makio64 / Garrett Johnson / Cesium) d'ou l'ecran
// de credits au debut. il a une duree mini sinon on a pas le temps de lire
// la barre attend les 2 : le temps mini ET la video prete

export const demo = q<HTMLElement>('[data-demo]')!

const FILM = '/LocGoofyBag.mp4'
const SITE = 'https://cinematic-zoom.vercel.app/'

// duree mini de l'ecran de chargement. meme si la video est deja la on attend
// un peu sinon ca flashe
const HOLD = 7.4

// le titre affiche pendant le chargement
const TITLE = 'Cinematic Zoom'

// les credits. attention la grille css fait 3 colonnes fixes dc chaque ligne
// doit avoir son lead. si on en laisse un vide tout le reste se decale
const CREDITS: { lead: string; name: string }[] = [
  { lead: 'Demo by', name: 'Makio64' },
  { lead: '3D-Tiles-Renderer by', name: 'Garrett Johnson' },
  { lead: '3D Tiles via', name: 'Cesium' },
]

const line = (c: { lead: string; name: string }, i: number) => `
  <li class="demo__credit" role="listitem" data-demo-credit>
    <span class="demo__credit-no">${String(i + 1).padStart(2, '0')}</span>
    <span class="demo__credit-lead">${c.lead}</span>
    <span class="demo__credit-name">${c.name}</span>
  </li>`

function markup(): string {
  return `
    <div class="demo__scrim" data-close-demo></div>
    <div class="demo__panel is-loading" role="dialog" aria-modal="true"
         aria-label="Preview 3D — le 14 rue Saint-Maur vu du ciel">
      <header class="demo__top">
        <p class="label">Preview 3D — 14 rue Saint-Maur, Paris XI</p>
        <button class="linklike" type="button" data-close-demo>Fermer</button>
      </header>

      <div class="demo__stage">
        <video class="demo__film" data-demo-film
               playsinline muted loop preload="auto"
               disablepictureinpicture controlslist="nodownload noplaybackrate"
               aria-label="Survol du 14 rue Saint-Maur, Paris XI">
          <source src="${FILM}" type="video/mp4" />
        </video>

        <div class="demo__load" data-demo-load>
          <header class="demo__load-head" data-demo-fade>
            <p class="demo__powered">Powered by</p>
            <p class="demo__title display">${TITLE}</p>
          </header>
          <ol class="demo__credits" role="list">${CREDITS.map(line).join('')}</ol>
          <a class="demo__link" data-demo-fade href="${SITE}"
             target="_blank" rel="noopener noreferrer"
             data-cursor="link" data-cursor-label="Ouvrir la démonstration">
            cinematic-zoom.vercel.app
          </a>
          <div class="demo__load-foot" data-demo-fade>
            <div class="demo__rule"><span data-demo-rule></span></div>
            <span class="demo__pct" data-demo-pct>00</span>
          </div>
        </div>
      </div>

      <footer class="demo__foot">
        <p class="demo__note">
          Démonstration tierce — Makio64, Garrett Johnson, Cesium. Le film montre
          le quartier de l'atelier ; il n'est pas de notre fait.
        </p>
      </footer>
    </div>`
}

// les anims du chargement. faut les kill a la fermeture
let intro: gsap.core.Timeline | null = null
// compteur d'ouverture. si on ferme pendant le chargement le vieux token
// devient obsolete et on lance pas la video
let token = 0

export function openDemo(): void {
  const mine = ++token
  demo.innerHTML = markup()
  openOverlay(demo)

  const film = q<HTMLVideoElement>('[data-demo-film]', demo)!
  const load = q<HTMLElement>('[data-demo-load]', demo)!
  const rule = q<HTMLElement>('[data-demo-rule]', demo)!
  const pct = q<HTMLElement>('[data-demo-pct]', demo)!

  const roll = () => {
    load.remove()
    q<HTMLElement>('.demo__panel', demo)?.classList.remove('is-loading')
    void film.play().catch(() => {})
  }

  // load() explicite, sinon preload est juste une suggestion et le navigateur
  // peut rien telecharger du tout
  film.load()

  const ready = new Promise<void>((resolve) => {
    if (film.readyState >= 3) return resolve()
    const done = () => resolve()
    film.addEventListener('canplaythrough', done, { once: true })
    film.addEventListener('canplay', done, { once: true })
    // timeout au cas ou le reseau rame, on bloque pas l'user indefiniment
    film.addEventListener('error', done, { once: true })
  })

  const held = new Promise<void>((resolve) => {
    if (reduced) {
      // en reduced motion la barre saute direct a 100 mais on garde le delai
      rule.style.transform = 'scaleX(0.92)'
      pct.textContent = '92'
      window.setTimeout(resolve, HOLD * 1000)
      return
    }

    intro = gsap.timeline({ onComplete: () => resolve() })

    intro
      .from(qq<HTMLElement>('[data-demo-fade]', demo), {
        opacity: 0,
        duration: 0.5,
        stagger: 0.12,
        ease: 'power2.out',
      })
      .from(
        qq<HTMLElement>('[data-demo-credit]', demo),
        { opacity: 0, y: 14, duration: 0.62, stagger: 0.42, ease: 'power3.out' },
        0.24,
      )
      // on monte que jusqu'a 90%, les 10 derniers % c'est qd la video est prete
      .fromTo(
        rule,
        { scaleX: 0 },
        { scaleX: 0.92, duration: HOLD, ease: 'none', onUpdate: () => paint(rule, pct) },
        0,
      )
  })

  void Promise.all([ready, held]).then(() => {
    if (mine !== token) return
    if (reduced) {
      paintTo(rule, pct, 1)
      roll()
      return
    }
    gsap
      .timeline()
      .to(rule, { scaleX: 1, duration: 0.42, ease: 'power2.inOut', onUpdate: () => paint(rule, pct) })
      .to(load, { opacity: 0, duration: 0.5, ease: 'power2.inOut' }, '-=0.1')
      .add(() => {
        if (mine !== token) return
        roll()
      })
      .from(film, { opacity: 0, duration: 0.7, ease: 'power2.out' })
  })
}

// le % affiche est lu depuis la barre. comme ca pas de desync entre les deux
function paint(rule: HTMLElement, pct: HTMLElement): void {
  const v = (gsap.getProperty(rule, 'scaleX') as number) ?? 0
  pct.textContent = String(Math.round(v * 100)).padStart(2, '0')
}

function paintTo(rule: HTMLElement, pct: HTMLElement, v: number): void {
  rule.style.transform = `scaleX(${v})`
  pct.textContent = String(Math.round(v * 100)).padStart(2, '0')
}

export function closeDemo(): void {
  token++
  intro?.kill()
  intro = null
  // on vide le src au lieu de juste pause() sinon la video reste en memoire
  const film = q<HTMLVideoElement>('[data-demo-film]', demo)
  if (film) {
    film.pause()
    film.removeAttribute('src')
    film.load()
  }
  closeOverlay(demo)
  demo.innerHTML = ''
}
