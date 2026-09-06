import gsap from 'gsap'
import { q, qq, reduced } from './dom'
import type { Page } from './page'

/* -------------------------------------------------------------------------
   Livraison & retours — la route, en cinq arrêts

   Un relevé plutôt qu'une page d'aide : la route est tracée à la cote, le
   camion la parcourt vraiment, et ce qui est derrière lui est encré tandis
   que ce qui reste à faire demeure pointillé. On peut le laisser rouler seul
   ou l'envoyer à un arrêt d'un clic — dans les deux cas, il y va, il ne s'y
   téléporte pas : c'est ce trajet qui dit la durée mieux qu'un chiffre.

   Le dessin suit le même système que la paillasse de l'atelier — plein pour
   la matière, pointillé pour ce qui guide, disque plein pour un point relevé.
   ---------------------------------------------------------------------- */

type Stop = {
  /** Position sur la route, de 0 à 1. */
  at: number
  day: string
  title: string
  line: string
}

const STOPS: Stop[] = [
  {
    at: 0.09,
    day: 'Jour 0',
    title: "L'atelier",
    line: "Votre sac est fini, pesé, numéroté. Son numéro est gravé sous la fermeture — c'est le vôtre, et il ne changera plus.",
  },
  {
    at: 0.3,
    day: 'Jour 0',
    title: "L'emballage",
    line: 'Boîte en carton recyclé, ruban de coton, papier de soie. Aucun plastique n\'entre dans le colis, pas même le bordereau.',
  },
  {
    at: 0.5,
    day: 'Jour 1',
    title: 'Le départ',
    line: 'Remis au transporteur avant seize heures. Le numéro de suivi part vers votre boîte dans la minute qui suit.',
  },
  {
    at: 0.71,
    day: 'Jour 2',
    title: 'La route',
    line: 'Le colis voyage assuré à sa valeur pleine. Vous pouvez changer le lieu de livraison tant qu\'il n\'est pas en tournée.',
  },
  {
    at: 0.93,
    day: 'Jour 3',
    title: 'Chez vous',
    line: 'Remis en main propre contre signature, ou déposé là où vous l\'avez demandé. Gardez la boîte : elle sert au retour.',
  },
]

type Zone = {
  key: string
  name: string
  rows: [string, string][]
}

const ZONES: Zone[] = [
  {
    key: 'fr',
    name: 'France',
    rows: [
      ['Délai', '2 à 3 jours ouvrés'],
      ['Frais de port', 'Offerte, sans minimum'],
      ['Acheminement', 'Colissimo — remise contre signature'],
      ['Retour', 'Offert sous 30 jours'],
    ],
  },
  {
    key: 'eu',
    name: 'Europe',
    rows: [
      ['Délai', '3 à 5 jours ouvrés'],
      ['Frais de port', 'Offerte dès 180 € — sinon 12 €'],
      ['Acheminement', 'DHL Express — suivi à la minute'],
      ['Retour', 'Offert sous 30 jours'],
    ],
  },
  {
    key: 'ww',
    name: 'Reste du monde',
    rows: [
      ['Délai', '5 à 8 jours ouvrés'],
      ['Frais de port', '24 € — droits et taxes inclus'],
      ['Acheminement', 'DHL Express — dédouanement à notre charge'],
      ['Retour', '24 €, déduits du remboursement'],
    ],
  },
  {
    key: 'pa',
    name: "Retrait à l'atelier",
    rows: [
      ['Délai', 'Sous 24 heures'],
      ['Frais de port', 'Aucun'],
      ['Acheminement', '14 rue Saint-Maur, Paris XI — sur rendez-vous'],
      ['Retour', 'Échange immédiat sur place'],
    ],
  },
]

const FAQ: [string, string][] = [
  [
    'Puis-je changer mon adresse ?',
    "Tant que le colis n'est pas parti en tournée, oui : répondez simplement à l'e-mail de confirmation, nous nous en occupons. Une fois en tournée, c'est au transporteur que la demande revient — le lien de suivi vous y mène en un clic.",
  ],
  [
    "Et si le sac ne me plaît pas ?",
    "Vous avez trente jours, à compter de la réception, pour nous le renvoyer. Il doit revenir dans l'état où il est parti, avec sa boîte. Le remboursement part le jour où nous le recevons, sur le moyen de paiement d'origine.",
  ],
  [
    'Livrez-vous en point relais ?',
    "Oui, en France et en Belgique. Le choix se fait à l'étape du paiement, après l'adresse. Le colis y reste à votre disposition quatorze jours.",
  ],
  [
    'Douanes, droits, taxes ?',
    "Hors Union européenne, les droits et taxes sont déjà réglés par nos soins et compris dans les 24 € : vous ne recevrez jamais de facture à la livraison.",
  ],
]

/* --- le décor, en traits ------------------------------------------------- */

const ROAD_Y = 190

/** Le camion, dessiné pare-chocs à l'origine, la caisse derrière lui, roues
    posées sur zéro. La hauteur est portée par le groupe intérieur : le groupe
    extérieur ne sert qu'au déplacement, et GSAP y écrit sa matrice sans avoir
    à retenir où était la chaussée. */
const TRUCK = `
  <g data-truck>
   <g transform="translate(0 ${ROAD_Y})">
    <g data-speed class="ship__speed">
      <path class="d" d="M-186 -80h26M-200 -58h34M-182 -36h22" />
    </g>
    <path class="k" d="M-152 -96h96v68h-96z" pathLength="100" />
    <path class="k" d="M-56 -72h30l26 30v14h-56z" pathLength="100" />
    <path class="d" d="M-50 -66h22l17 21h-39z" />
    <path class="k" d="M-152 -28h152" pathLength="100" />
    <path class="d" d="M-142 -86h74v48h-74z" />
    <path class="d" d="M-104 -96v68" />
    <circle class="p" cx="-99" cy="-58" r="2.4" />
    <g class="ship__wheel" data-wheel>
      <circle class="k" cx="-124" cy="-14" r="14" pathLength="100" />
      <path class="d" d="M-124 -25v22M-135 -14h22" />
    </g>
    <g class="ship__wheel" data-wheel>
      <circle class="k" cx="-26" cy="-14" r="14" pathLength="100" />
      <path class="d" d="M-26 -25v22M-37 -14h22" />
    </g>
   </g>
  </g>`

/** Le colis déposé, ruban compris — il n'apparaît qu'au dernier arrêt. */
const PARCEL = `
  <g data-parcel transform="translate(${(STOPS[4].at * 1000 + 46).toFixed(0)} ${ROAD_Y})" opacity="0">
    <path class="k" d="M-17 -32h34v32h-34z" pathLength="100" />
    <path class="d" d="M0 -32v32M-17 -17h34" />
    <path class="k" d="M-9 -32c-7-9 2-16 9-7 7-9 16-2 9 7" pathLength="100" />
  </g>`

function scene(): string {
  const dots = STOPS.map(
    (s, i) =>
      `<circle class="ship__dot" data-dot="${i}" cx="${(s.at * 1000).toFixed(0)}" cy="${ROAD_Y}" r="4.5" />`,
  ).join('')

  const ticks = STOPS.map(
    (s) => `<path class="d" d="M${(s.at * 1000).toFixed(0)} ${ROAD_Y}v26" />`,
  ).join('')

  return `
    <svg class="art ship__svg" viewBox="0 0 1000 250" aria-hidden="true">
      <path class="d" d="M90 58h330M612 58h318" />
      <path class="d" d="M90 50v16M930 50v16" />
      <text class="ship__cote" x="516" y="63">Paris — chez vous</text>

      <path class="d" d="M0 ${ROAD_Y}h1000" />
      <path class="k ship__done" data-done d="M0 ${ROAD_Y}h1000" pathLength="100" />
      ${ticks}
      ${PARCEL}
      ${TRUCK}
      ${dots}
    </svg>`
}

/* --- assemblage de la page ----------------------------------------------- */

function markup(): string {
  return `
    <section class="page__hero">
      <p class="label reveal">Service — Livraison &amp; retours</p>
      <h1 class="page__title display reveal">Elle part<br />le jour même.</h1>
      <p class="page__lede reveal">
        Un sac quitte l'atelier le jour où il est fini. Voici la route qu'il prend,
        arrêt par arrêt, et ce qui se passe si vous changez d'avis.
      </p>
      <ul class="page__stats reveal">
        <li><b>Offerte</b><span>France &amp; Europe</span></li>
        <li><b>2 à 8 j</b><span>selon la destination</span></li>
        <li><b>30 jours</b><span>pour changer d'avis</span></li>
      </ul>
    </section>

    <section class="page__sec">
      <div class="page__sec-head reveal">
        <h2 class="page__h2">La route</h2>
        <p class="page__sec-note">Cinq arrêts — cliquez pour y envoyer le camion</p>
      </div>

      <div class="ship__scene reveal">
        <div class="ship__frame">
          ${scene()}
          <div class="ship__stops">
            ${STOPS.map(
              (s, i) => `
              <button class="ship__stop" type="button" data-go="${i}"
                      style="left:${(s.at * 100).toFixed(1)}%">
                <span class="ship__stop-num">${String(i + 1).padStart(2, '0')}</span>
                <span class="ship__stop-name">${s.title}</span>
              </button>`,
            ).join('')}
          </div>
        </div>
      </div>

      <div class="ship__now">
        <p class="ship__day" data-day></p>
        <h3 class="ship__title" data-title></h3>
        <p class="ship__line" data-line></p>
      </div>
    </section>

    <section class="page__sec">
      <div class="page__sec-head reveal">
        <h2 class="page__h2">Où l'envoyons-nous ?</h2>
        <p class="page__sec-note">Tarifs et délais, sans petites lignes</p>
      </div>

      <div class="zones reveal">
        <div class="zones__tabs" role="tablist" aria-label="Destination">
          ${ZONES.map(
            (z, i) => `
            <button class="zones__tab${i ? '' : ' is-on'}" type="button" role="tab"
                    aria-selected="${i ? 'false' : 'true'}" data-zone="${z.key}">${z.name}</button>`,
          ).join('')}
        </div>
        <dl class="zones__facts" data-facts></dl>
      </div>
    </section>

    <section class="page__sec">
      <div class="returns">
        <div class="returns__mark reveal">
          <span class="returns__num">30</span>
          <span class="returns__cap">jours</span>
        </div>
        <div class="returns__text">
          <h2 class="page__h2 reveal">Le retour, sans un mot d'explication.</h2>
          <p class="page__lede reveal">
            Nous ne demandons pas pourquoi. Un sac qui ne trouve pas sa place n'a rien
            à justifier — il revient, et c'est tout.
          </p>
          <ol class="returns__steps">
            <li class="reveal"><span>01</span><p>Dites-le nous depuis votre e-mail de commande. Une étiquette prépayée vous revient dans l'heure.</p></li>
            <li class="reveal"><span>02</span><p>Remettez le sac dans sa boîte, collez l'étiquette, déposez le colis. Rien d'autre à imprimer.</p></li>
            <li class="reveal"><span>03</span><p>Le remboursement part le jour de la réception à l'atelier. Comptez deux à cinq jours pour le voir arriver.</p></li>
          </ol>
        </div>
      </div>
    </section>

    <section class="page__sec">
      <div class="page__sec-head reveal">
        <h2 class="page__h2">Le reste</h2>
      </div>
      <div class="page__folds reveal">
        ${FAQ.map(
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
      <p class="label reveal">Une question qui n'est pas là ?</p>
      <button class="page__cta-link reveal" type="button" data-page="write">Nous écrire</button>
    </section>`
}

/* --- la conduite ---------------------------------------------------------- */

const WHEEL_R = 14
const DWELL = 3.6

let root: HTMLElement | null = null
let run: gsap.core.Timeline | null = null
let index = 0

/** Envoie le camion à l'arrêt demandé, puis laisse la suite venir seule. */
function drive(i: number, instant = false): void {
  if (!root) return
  index = (i + STOPS.length) % STOPS.length
  const s = STOPS[index]
  const target = s.at * 1000

  const truck = q<SVGGElement>('[data-truck]', root)!
  const done = q<SVGPathElement>('[data-done]', root)!
  const parcel = q<SVGGElement>('[data-parcel]', root)!
  const wheels = qq<SVGGElement>('[data-wheel]', root)
  const speed = q<SVGGElement>('[data-speed]', root)!

  /* Sous 760 px la scène déborde et se fait glisser : elle doit alors suivre
     le camion d'elle-même, faute de quoi il roule hors du cadre et l'on ne
     voit plus que la route. */
  const frame = q<HTMLElement>('.ship__frame', root)!
  const over = frame.scrollWidth - frame.clientWidth
  if (over > 0) {
    const left = (target / 1000) * frame.scrollWidth - frame.clientWidth / 2
    frame.scrollTo({
      left: Math.min(over, Math.max(0, left)),
      behavior: reduced || instant ? 'auto' : 'smooth',
    })
  }

  q<HTMLElement>('[data-day]', root)!.textContent = s.day
  q<HTMLElement>('[data-title]', root)!.textContent = s.title
  q<HTMLElement>('[data-line]', root)!.textContent = s.line
  qq<SVGCircleElement>('[data-dot]', root).forEach((d, k) =>
    d.classList.toggle('is-on', k <= index),
  )
  qq<HTMLElement>('[data-go]', root).forEach((b, k) => b.classList.toggle('is-on', k === index))

  run?.kill()

  if (reduced || instant) {
    gsap.set(truck, { x: target })
    gsap.set(done, { strokeDashoffset: 100 - s.at * 100 })
    gsap.set(parcel, { opacity: index === STOPS.length - 1 ? 1 : 0 })
    return
  }

  const from = Number(gsap.getProperty(truck, 'x')) || 0
  const span = target - from
  // La distance parcourue règle tout : la durée du trajet, et le nombre de
  // tours que font les roues. Une roue qui patine trahit le décor.
  const travel = Math.min(2.2, Math.max(0.5, Math.abs(span) / 420))
  const turns = (span / (2 * Math.PI * WHEEL_R)) * 360

  run = gsap
    .timeline({ onComplete: () => drive(index + 1) })
    .to(truck, { x: target, duration: travel, ease: 'power2.inOut' }, 0)
    /* Le centre est dit en toutes lettres : sans lui, GSAP prend le coin de la
       boîte du groupe et la roue part se poser à côté du camion. */
    .to(
      wheels,
      { rotation: `+=${turns}`, transformOrigin: '50% 50%', duration: travel, ease: 'power2.inOut' },
      0,
    )
    // Un tressaut de suspension, deux fois pendant le trajet, jamais à l'arrêt.
    .to(truck, { y: -2, duration: travel / 4, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)
    .set(truck, { y: 0 }, travel)
    .to(speed, { opacity: span > 0 ? 1 : 0.35, duration: 0.25 }, 0)
    .to(speed, { opacity: 0, duration: 0.3 }, travel - 0.3)
    .to(done, { strokeDashoffset: 100 - s.at * 100, duration: travel, ease: 'power2.inOut' }, 0)
    .to(parcel, { opacity: index === STOPS.length - 1 ? 1 : 0, duration: 0.45 }, travel - 0.2)
    .fromTo(
      qq<HTMLElement>('[data-day], [data-title], [data-line]', root),
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.07, ease: 'power3.out' },
      0.1,
    )
    .to({}, { duration: DWELL })
}

/** Change de destination : les quatre lignes se relèvent l'une après l'autre. */
function pickZone(key: string): void {
  if (!root) return
  const zone = ZONES.find((z) => z.key === key) ?? ZONES[0]
  const facts = q<HTMLElement>('[data-facts]', root)!

  qq<HTMLElement>('[data-zone]', root).forEach((b) => {
    const on = b.dataset.zone === key
    b.classList.toggle('is-on', on)
    b.setAttribute('aria-selected', String(on))
  })

  facts.innerHTML = zone.rows
    .map(([k, v]) => `<div class="zones__row"><dt>${k}</dt><dd>${v}</dd></div>`)
    .join('')

  if (reduced) return
  gsap.from(facts.children, {
    y: 16,
    opacity: 0,
    duration: 0.55,
    stagger: 0.06,
    ease: 'power3.out',
  })
}

export const ship: Page = {
  eyebrow: 'GoofyBag — Livraison &amp; retours',
  markup,
  mount(host) {
    root = host
    qq<HTMLElement>('[data-go]', host).forEach((b) =>
      b.addEventListener('click', () => drive(Number(b.dataset.go))),
    )
    qq<HTMLElement>('[data-zone]', host).forEach((b) =>
      b.addEventListener('click', () => pickZone(b.dataset.zone!)),
    )
    pickZone(ZONES[0].key)
    drive(0, true)
    // Le camion attend d'être vu : lancer la boucle sous le rideau ferait
    // arriver le colis avant que la page ne soit là.
    gsap.delayedCall(0.9, () => root && drive(1))
  },
  unmount() {
    run?.kill()
    run = null
    index = 0
    root = null
  },
}
