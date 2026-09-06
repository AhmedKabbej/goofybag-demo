import gsap from 'gsap'
import { q, qq, reduced } from './dom'
import { closeOverlay, openOverlay } from './overlay'

/* -------------------------------------------------------------------------
   Preview 3D — le quartier de l'atelier, vu du ciel

   Une démonstration n'est pas de nous : elle est de Makio64, elle s'appuie
   sur le rendu de tuiles de Garrett Johnson et sur les données de Cesium.
   Le panneau le dit avant de montrer quoi que ce soit — c'est la raison
   d'être de l'écran d'attente, et la raison pour laquelle il tient un temps
   plancher : des crédits qui passent trop vite ne sont pas des crédits.

   La barre monte donc sur ce temps-là, sans jamais toucher son bout : elle
   attend que le film soit prêt pour le faire. Le premier des deux qui traîne
   commande, et l'on ne se retrouve ni devant un écran noir, ni devant des
   noms illisibles.

   Ensuite le film tourne en boucle, sans contrôleur : ce n'est pas un lecteur
   qu'on manœuvre, c'est un plan qu'on regarde. Il ne s'arrête qu'à la
   fermeture — et il s'arrête alors pour de bon, source coupée.
   ---------------------------------------------------------------------- */

export const demo = q<HTMLElement>('[data-demo]')!

const FILM = '/LocGoofyBag.mp4'
const SITE = 'https://cinematic-zoom.vercel.app/'

/** Le temps plancher de l'écran d'attente, en secondes — de quoi lire. */
const HOLD = 7.4

/** Le nom de la démonstration, qui tient le haut de l'écran à lui seul. */
const TITLE = 'Cinematic Zoom'

/* Ce qui est dû, et à qui. Le premier mot mène, le nom porte.

   Chaque ligne porte un intitulé, et ce n'est pas un hasard : la grille des
   crédits compte trois colonnes fixes, et une cellule qu'on masquerait
   décalerait d'un cran tout ce qui suit. Une ligne sans intitulé n'aurait
   donc pas sa place ici — c'est un titre, et elle est montée en titre. */
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

/** Ce qui tourne pendant l'attente — à couper net à la fermeture. */
let intro: gsap.core.Timeline | null = null
/** Jeton d'ouverture : un panneau refermé pendant l'attente ne lance rien. */
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

  /* Le film est chargé pour de bon : sans cette demande, `preload` reste un
     vœu et le passage à l'image se ferait sur une vidéo encore vide. */
  film.load()

  const ready = new Promise<void>((resolve) => {
    if (film.readyState >= 3) return resolve()
    const done = () => resolve()
    film.addEventListener('canplaythrough', done, { once: true })
    film.addEventListener('canplay', done, { once: true })
    // Un réseau qui bute ne doit pas retenir le panneau indéfiniment.
    film.addEventListener('error', done, { once: true })
  })

  const held = new Promise<void>((resolve) => {
    if (reduced) {
      // Sans animation, la barre saute — mais le temps de lecture, lui, reste.
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
      /* La barre ne va qu'aux neuf dixièmes : le dernier reste au film. */
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

/** La lecture chiffrée suit la barre — une seule source, pas deux horloges. */
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
  /* Le film est vidé, pas seulement mis en pause : une vidéo de cette taille
     laissée en mémoire continuerait de peser sur l'onglet. */
  const film = q<HTMLVideoElement>('[data-demo-film]', demo)
  if (film) {
    film.pause()
    film.removeAttribute('src')
    film.load()
  }
  closeOverlay(demo)
  demo.innerHTML = ''
}
