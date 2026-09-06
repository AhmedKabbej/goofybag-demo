import gsap from 'gsap'
import { q, qq, reduced } from './dom'
import { closeOverlay, openOverlay } from './overlay'

/* -------------------------------------------------------------------------
   Le procédé — douze heures, six étapes

   Une paillasse plutôt qu'un diaporama : fond quadrillé, relevés chiffrés,
   et des planches au trait qui se tracent devant vous, comme sorties d'une
   table traçante. Le texte reste au minimum — une ligne par étape, l'heure à
   laquelle elle a lieu, et rien d'autre.

   Les dessins sont écrits à la main, en un seul système : trait plein pour la
   matière, pointillé pour ce qui guide (axes, cotes, chemins de coupe), petit
   disque pour un point remarquable. Chaque tracé porte `pathLength="1"`, ce
   qui permet de le dérouler sans avoir à mesurer sa longueur réelle.
   ---------------------------------------------------------------------- */

type Step = {
  /** Heure de l'atelier, sur les douze que dure un sac. */
  hour: string
  /** Position sur la frise, de 0 à 1 — les étapes ne durent pas toutes autant. */
  at: number
  title: string
  line: string
  /** Le relevé de paillasse, en bas de planche. */
  note: string
  plate: string
  /** Le petit mouvement qui reste, une fois la planche tracée. Toutes n'en ont
      pas besoin : une épure de patron n'a aucune raison de bouger. */
  motion?: (svg: SVGSVGElement) => gsap.core.Tween | gsap.core.Timeline
}

/* La même pièce revient d'une planche à l'autre — un nuage à trois bosses, son
   anse d'une seule courbe. C'est elle qu'on suit des douze heures durant : le
   carnet ne change pas de sujet en cours de route. */
const CORPS =
  'M40 96a20 20 0 0 1 40 0 20 20 0 0 1 40 0 20 20 0 0 1 40 0v6c0 16-27 26-60 26s-60-10-60-26z'
/** Le fond, relevé point par point le long de la courbe : c'est là que ça se coud. */
const FOND = 'M46 100c6 18 28 26 54 26s48-8 54-26'
const POINTS =
  'M51.5 104.7l-5.1 3.2M55.4 109.5l-4.2 4.3M60.5 113.6l-3.3 5M66.7 117l-2.5 5.5M73.9 119.6l-1.7 5.8' +
  'M82 121.5l-1 5.9M90.7 122.6l-.5 6M109.3 122.6l.5 6M118 121.5l1 5.9M126.1 119.6l1.7 5.8' +
  'M133.3 117l2.5 5.5M139.5 113.6l3.3 5M144.6 109.5l4.2 4.3M148.5 104.7l5.1 3.2'

/** Un point qui court le long d'un tracé — la lame, l'aiguille. */
function courir(svg: SVGSVGElement, sel: string, seconds: number) {
  const guide = svg.querySelector<SVGPathElement>(sel)
  const bille = svg.querySelector<SVGCircleElement>('.run')
  if (!guide || !bille) return gsap.to({}, {})
  const len = guide.getTotalLength()
  const pos = { t: 0 }
  return gsap.to(pos, {
    t: 1,
    duration: seconds,
    ease: 'none',
    repeat: -1,
    onUpdate: () => {
      const pt = guide.getPointAtLength(pos.t * len)
      bille.setAttribute('cx', String(pt.x))
      bille.setAttribute('cy', String(pt.y))
    },
  })
}

const STEPS: Step[] = [
  {
    hour: '00 h 00',
    at: 0,
    title: 'Le patron',
    line: "Tracé à main levée, une seule fois. On ne le corrige pas : c'est lui qui donne au sac son défaut.",
    note: 'Papier kraft 120 g · tracé au crayon gras · aucune symétrie',
    plate: `
      <rect class="d" x="20" y="14" width="160" height="116" />
      <path class="d" d="M100 130V40" />
      <path class="d" d="M64 54a48 48 0 0 1 72 0" />
      <circle class="p" cx="100" cy="40" r="2.8" />
      <path class="k" d="${CORPS}" />
      <path class="k" d="M80 91v10M120 91v10" />
      <path class="d" d="M40 137h120M40 133v8M160 133v8" />
      <path class="d" d="M36 137l7-3.5M36 137l7 3.5M164 137l-7-3.5M164 137l-7 3.5" />`,
  },
  {
    hour: '01 h 40',
    at: 0.17,
    title: 'La coupe',
    line: 'Trois épaisseurs, un seul geste. Les crans sont posés avant, jamais après.',
    note: 'Velours côtelé · 3 plis · ciseaux 25 cm · perte 8 %',
    plate: `
      <g class="d" transform="translate(8 10)"><path d="${CORPS}" /></g>
      <g class="d" transform="translate(4 5)"><path d="${CORPS}" /></g>
      <path class="k" d="${CORPS}" />
      <g transform="translate(100 104) scale(1.1) translate(-100 -104)">
        <path class="d coupe" d="${CORPS}" />
      </g>
      <path class="k" d="M80 91v10M120 91v10M100 118v12" />
      <circle class="run p" cx="0" cy="0" r="3.2" />`,
    motion: (svg) => courir(svg, '.coupe', 6),
  },
  {
    hour: '04 h 10',
    at: 0.35,
    title: 'Le rembourrage',
    line: 'Chaque boudin est garni isolément, à la main, puis fermé. Aucun ne pèse comme son voisin.',
    note: 'Ouate de polyester · 340 g au total · 9 chambres',
    plate: `
      <path class="k" d="${CORPS}" />
      <path class="k" d="M60 79v40M80 76v45M100 76v47M120 76v45M140 79v40" />
      <g class="fleche">
        <path class="d" d="M50 34v18M70 28v18M100 24v18M130 28v18M150 34v18" />
        <path class="d" d="M46 48l4 5 4-5M66 42l4 5 4-5M96 38l4 5 4-5M126 42l4 5 4-5M146 48l4 5 4-5" />
      </g>
      <circle class="p" cx="70" cy="99" r="2.4" />
      <circle class="p" cx="100" cy="103" r="2.4" />
      <circle class="p" cx="130" cy="99" r="2.4" />`,
    motion: (svg) =>
      gsap.to(svg.querySelectorAll('.fleche path'), {
        y: 6,
        opacity: 0.45,
        duration: 1.4,
        ease: 'sine.inOut',
        stagger: { each: 0.08, yoyo: true, repeat: -1 },
        yoyo: true,
        repeat: -1,
      }),
  },
  {
    hour: '07 h 00',
    at: 0.56,
    title: "L'assemblage",
    line: 'Les volumes sont cousus sur la courbe, un à un. La couture suit le galbe, elle ne le contraint pas.',
    note: 'Fil polyester ciré · 4 points au centimètre · couture rabattue',
    plate: `
      <path class="d" d="${CORPS}" />
      <path class="k couture" d="${FOND}" />
      <path class="k" d="${POINTS}" />
      <path class="k" d="M150 40 130 66" />
      <circle class="k" cx="151.5" cy="38" r="2.4" />
      <path class="d" d="M130 66c-2 22-12 38-28 46" />
      <circle class="run p" cx="0" cy="0" r="3" />`,
    motion: (svg) => courir(svg, '.couture', 4.5),
  },
  {
    hour: '09 h 40',
    at: 0.78,
    title: "L'anse",
    line: "Moulée d'une seule pièce, sans couture apparente. On la pose en dernier, quand le corps a pris sa forme.",
    note: 'Âme rigide gainée · section 18 mm · une seule pièce',
    plate: `
      <path class="d" d="${CORPS}" />
      <g class="anse">
        <path class="k" d="M70 104V76a30 30 0 0 1 60 0v28" />
        <path class="k" d="M84 104V76a16 16 0 0 1 32 0v28" />
      </g>
      <path class="d" d="M100 32v14" />
      <circle class="p" cx="100" cy="32" r="2.8" />
      <path class="d" d="M128 66 154 52" />
      <circle class="k" cx="166" cy="48" r="11" />
      <circle class="d" cx="166" cy="48" r="5" />
      <path class="d" d="M155 48h22M166 37v22" />
      <path class="d" d="M150 70h32M150 66v8M182 66v8" />`,
    motion: (svg) =>
      gsap.to(svg.querySelector('.anse'), {
        rotate: 1.6,
        transformOrigin: '100px 104px',
        duration: 2.6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      }),
  },
  {
    hour: '11 h 20',
    at: 1,
    title: 'Le contrôle',
    line: "Pesé, numéroté, garanti à vie. Un sac ne se remplace pas — il revient à l'atelier.",
    note: 'Pesée à ± 2 g · numéro gravé sous la fermeture · garantie illimitée',
    plate: `
      <path class="k" d="M56 58a44 44 0 0 1 88 0" />
      <path class="d" d="M65 52l-6-5M83 40l-4-6M100 36v-7M117 40l4-6M135 52l6-5" />
      <path class="k aiguille" d="M100 58 122 38" />
      <circle class="p" cx="100" cy="58" r="3" />
      <path class="k" d="M34 130h132" />
      <path class="d" d="M52 130v8M148 130v8" />
      <g transform="translate(100 130) scale(.46) translate(-100 -128)">
        <path class="k" d="${CORPS}" />
        <path class="k" d="M70 104V76a30 30 0 0 1 60 0v28" />
      </g>
      <path class="d" d="M22 98h34v14H22z" />
      <path class="d" d="M28 105h6M38 105h12" />
      <path class="d" d="M56 105h18" />`,
    motion: (svg) =>
      gsap.fromTo(
        svg.querySelector('.aiguille'),
        { rotate: -9, transformOrigin: '100px 52px' },
        {
          rotate: 0,
          duration: 2.4,
          ease: 'elastic.out(1, 0.28)',
          repeat: -1,
          repeatDelay: 1.6,
        },
      ),
  },
]

const lab = q<HTMLElement>('[data-lab]')!

/** Temps de pose, une fois la planche tracée. Le tracé prend une seconde et
    demie : une étape dure donc six secondes et demie en tout, de quoi lire la
    ligne sans se sentir pressé. */
const DWELL = 5.1

let step = 0
let run: gsap.core.Timeline | null = null
/** Le mouvement qui tourne en fond, une fois la planche posée. */
let loop: gsap.core.Tween | gsap.core.Timeline | null = null

function markup(): string {
  return `
    <div class="lab__grid" aria-hidden="true"></div>

    <header class="lab__top">
      <p class="label">Le procédé — douze heures pour un sac</p>
      <button class="linklike" type="button" data-close-lab>Fermer</button>
    </header>

    <div class="lab__body">
      <figure class="lab__plate" data-lab-plate>
        <svg viewBox="0 0 200 140" aria-hidden="true"></svg>
        <figcaption class="lab__note" data-lab-note></figcaption>
      </figure>

      <div class="lab__text">
        <p class="lab__index"><span data-lab-num>01</span><i>/ ${String(STEPS.length).padStart(2, '0')}</i></p>
        <p class="lab__hour" data-lab-hour></p>
        <h2 class="lab__title" data-lab-title></h2>
        <p class="lab__line" data-lab-line></p>
      </div>
    </div>

    <footer class="lab__foot">
      <div class="lab__rail" data-lab-rail>
        <span class="lab__rail-fill" data-lab-fill></span>
        ${STEPS.map(
          (s, i) => `
          <button class="lab__stop" type="button" data-lab-go="${i}"
                  style="left:${(s.at * 100).toFixed(1)}%" aria-label="${s.title}">
            <span></span>
          </button>`,
        ).join('')}
      </div>
      <div class="lab__scale">
        <span>00 h</span><span>Atelier Paris XI</span><span>12 h</span>
      </div>
    </footer>`
}

/** Pose une étape : la planche se retrace, le texte se relève. */
function show(i: number, instant = false): void {
  step = (i + STEPS.length) % STEPS.length
  const s = STEPS[step]
  const svg = q<SVGSVGElement>('[data-lab-plate] svg', lab)!
  const fill = q<HTMLElement>('[data-lab-fill]', lab)!

  svg.innerHTML = s.plate
  q<HTMLElement>('[data-lab-num]', lab)!.textContent = String(step + 1).padStart(2, '0')
  q<HTMLElement>('[data-lab-hour]', lab)!.textContent = s.hour
  q<HTMLElement>('[data-lab-title]', lab)!.textContent = s.title
  q<HTMLElement>('[data-lab-line]', lab)!.textContent = s.line
  q<HTMLElement>('[data-lab-note]', lab)!.textContent = s.note
  qq<HTMLElement>('[data-lab-go]', lab).forEach((b, k) =>
    b.classList.toggle('is-on', k <= step),
  )

  run?.kill()
  loop?.kill()
  loop = null
  if (reduced || instant) {
    gsap.set(fill, { scaleX: s.at })
    return
  }

  /* La planche se construit dans l'ordre où on la dessinerait : les guides
     d'abord — axes, cotes, épures —, la matière ensuite, qui se déroule trait
     par trait, et les points remarquables pour finir.

     Le déroulé passe par `pathLength` : chaque tracé est normalisé à 1, on
     peut donc l'ouvrir d'un tiret unique sans avoir à mesurer sa longueur
     réelle. Les guides, eux, sont déjà en pointillé — leur tiret est pris, ils
     paraissent donc en fondu. */
  const guides = Array.from(svg.querySelectorAll<SVGElement>('.d'))
  const matiere = Array.from(svg.querySelectorAll<SVGElement>('.k'))
  const points = Array.from(svg.querySelectorAll<SVGElement>('.p'))
  matiere.forEach((el) => el.setAttribute('pathLength', '1'))
  const bloc = qq<HTMLElement>(
    '[data-lab-num], [data-lab-hour], [data-lab-title], [data-lab-line]',
    lab,
  )

  run = gsap
    .timeline({ onComplete: () => show(step + 1) })
    .fromTo(guides, { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.035 }, 0)
    .fromTo(
      matiere,
      { strokeDasharray: 1, strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 0.85, stagger: 0.1, ease: 'power2.inOut' },
      0.2,
    )
    .fromTo(
      points,
      { scale: 0, transformOrigin: '50% 50%' },
      { scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(2.2)' },
      0.9,
    )
    .fromTo(
      bloc,
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.07, ease: 'power3.out' },
      0.15,
    )
    .to(fill, { scaleX: s.at, duration: 0.7, ease: 'power2.inOut' }, 0)
    // Le petit mouvement prend le relais quand le trait est posé, pas avant.
    .add(() => { loop = s.motion?.(svg) ?? null })
    .to({}, { duration: DWELL })
}

export function openLab(): void {
  lab.innerHTML = markup()
  /* Sans fondu : la feuille a déjà son entrée en CSS. Un fondu par-dessus la
     saisirait à l'instant où elle est encore à zéro et l'y laisserait — c'est
     la même raison qui l'écarte pour la fiche produit. */
  openOverlay(lab, false)
  qq<HTMLElement>('[data-lab-go]', lab).forEach((b) =>
    b.addEventListener('click', () => show(Number(b.dataset.labGo))),
  )
  show(0)
}

export function closeLab(): void {
  run?.kill()
  loop?.kill()
  run = null
  loop = null
  closeOverlay(lab)
  lab.innerHTML = ''
}

/** Étape voisine, à la main : le défilement automatique reprend derrière. */
export function stepLab(dir: number): void {
  show(step + dir)
}

export { lab }
