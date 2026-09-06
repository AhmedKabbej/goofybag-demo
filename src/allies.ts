import gsap from 'gsap'
import { q, qq, reduced } from './dom'
import { bindForm, formMarkup, type FormSpec } from './form'
import type { Page } from './page'

/* -------------------------------------------------------------------------
   Partenariats — la collection présentée à Cannes

   Une maison de cinq pièces ne fait pas une collection de festival toute
   seule : chaque printemps, nous en dessinons une avec une marque, et elle
   monte les marches. Cette page est le dépôt de dossier — ce que nous
   cherchons, comment cela se déroule, et le temps qu'il reste.

   Ce temps est la seule chose animée : un compte à rebours au dixième près
   n'aurait aucun sens, mais la seconde qui tombe, si — elle dit qu'une date
   est une date, et que les dossiers ferment vraiment.
   ---------------------------------------------------------------------- */

/** Clôture des dépôts. Le fuseau est écrit en clair : sans lui, la date
    glisse d'un visiteur à l'autre et le rebours ne veut plus rien dire. */
const DEADLINE = new Date('2027-01-15T23:59:59+01:00').getTime()

const STAGES: [string, string, string][] = [
  [
    'Janvier',
    'Le dépôt',
    'Vous nous écrivez. Un dossier tient en dix lignes et trois images — nous ne lisons pas les présentations de quarante pages.',
  ],
  [
    'Février',
    'La lecture',
    'Nous répondons à tout le monde, retenu ou non, avec les raisons. Six projets passent en second tour.',
  ],
  [
    'Mars — avril',
    "L'atelier commun",
    'Deux maisons, six semaines, une pièce. Nous travaillons rue Saint-Maur, à quatre mains, sur vos matières et nos formes.',
  ],
  [
    'Mai',
    'Cannes',
    'La pièce est présentée pendant le Festival, aux deux noms. Les droits restent partagés, la production revient à qui la veut.',
  ],
]

const WANTED: [string, string][] = [
  [
    'Une matière que nous ne savons pas travailler',
    "C'est la seule chose que nous cherchons vraiment. Un tissage, un tannage, un rebut industriel, une chute — ce qui nous oblige à réapprendre la coupe.",
  ],
  [
    'Une maison qui accepte de signer à deux',
    "La pièce porte les deux noms, à taille égale, sur l'étiquette comme sur le tapis. Les partenariats où l'un s'efface ne nous intéressent pas.",
  ],
  [
    'Un calendrier tenu',
    'Six semaines, pas huit. Une collection de festival se dessine vite ou ne se dessine pas — nous préférons le dire avant qu\'après.',
  ],
]

const SPEC: FormSpec = {
  fields: [
    {
      name: 'nature',
      cap: 'Nature du projet',
      chips: ['Collection capsule', 'Co-création', 'Licence', 'Événement'],
    },
    { name: 'marque', cap: 'La marque', placeholder: 'Nom de la maison', half: true },
    { name: 'contact', cap: 'Votre nom', placeholder: 'Prénom et nom', half: true },
    { name: 'mail', cap: 'E-mail', type: 'email', placeholder: 'vous@maison.com', half: true },
    { name: 'site', cap: 'Site ou dossier en ligne', placeholder: 'https://', optional: true, half: true },
    {
      name: 'projet',
      cap: 'Le projet en dix lignes',
      placeholder: "La matière, l'idée, ce que vous attendez de nous. Dix lignes suffisent.",
      area: true,
    },
  ],
  submit: 'Déposer le dossier',
  fine: 'Démonstration : rien ne quitte cette page. Aucune donnée n’est transmise ni conservée.',
  done: {
    title: 'Dossier reçu.',
    line: 'Nous lisons tout entre le 15 et le 31 janvier, et nous répondons à chaque maison — retenue ou non, avec les raisons.',
    again: 'Déposer un autre projet',
  },
}

const UNITS: [string, string][] = [
  ['j', 'jours'],
  ['h', 'heures'],
  ['m', 'minutes'],
  ['s', 'secondes'],
]

function markup(): string {
  return `
    <section class="page__hero allies__hero">
      <p class="label reveal">Maison — Partenariats</p>
      <h1 class="page__title display reveal">Une collection,<br />à deux noms.</h1>
      <p class="page__lede reveal">
        Chaque printemps, GoofyBag dessine une pièce avec une autre maison, et la
        présente pendant le Festival de Cannes. Pour l'édition Printemps 2027, les
        dossiers sont ouverts.
      </p>

      <div class="clock reveal" data-clock role="timer" aria-live="off">
        <p class="clock__cap">Dépôts clos le 15 janvier 2027</p>
        <div class="clock__row">
          ${UNITS.map(
            ([k, name]) => `
            <div class="clock__cell">
              <span class="clock__num" data-clock-${k}>--</span>
              <span class="clock__unit">${name}</span>
            </div>`,
          ).join('')}
        </div>
      </div>
    </section>

    <section class="page__sec">
      <div class="page__sec-head reveal">
        <h2 class="page__h2">Comment cela se passe</h2>
        <p class="page__sec-note">Quatre mois, du dossier aux marches</p>
      </div>
      <ol class="stages">
        ${STAGES.map(
          ([when, title, line], i) => `
          <li class="stages__item reveal">
            <span class="stages__num">${String(i + 1).padStart(2, '0')}</span>
            <p class="stages__when">${when}</p>
            <h3 class="stages__title">${title}</h3>
            <p class="stages__line">${line}</p>
          </li>`,
        ).join('')}
      </ol>
    </section>

    <section class="page__sec">
      <div class="page__sec-head reveal">
        <h2 class="page__h2">Ce que nous cherchons</h2>
        <p class="page__sec-note">Et, en creux, ce que nous ne cherchons pas</p>
      </div>
      <div class="wanted">
        ${WANTED.map(
          ([t, b]) => `
          <div class="wanted__item reveal">
            <h3 class="wanted__title">${t}</h3>
            <p class="wanted__line">${b}</p>
          </div>`,
        ).join('')}
      </div>
    </section>

    <section class="page__sec allies__deposit">
      <div class="page__sec-head reveal">
        <h2 class="page__h2">Déposer un dossier</h2>
        <p class="page__sec-note">Dix lignes, un lien, rien de plus</p>
      </div>
      <div class="allies__form reveal">${formMarkup(SPEC)}</div>
    </section>`
}

let root: HTMLElement | null = null
let beat: ReturnType<typeof setInterval> | undefined

/** Une seconde de moins. Les chiffres ne changent que s'ils changent. */
function tick(): void {
  if (!root) return
  const left = Math.max(0, DEADLINE - Date.now())
  const s = Math.floor(left / 1000)
  const value: Record<string, number> = {
    j: Math.floor(s / 86400),
    h: Math.floor(s / 3600) % 24,
    m: Math.floor(s / 60) % 60,
    s: s % 60,
  }

  UNITS.forEach(([k]) => {
    const el = q<HTMLElement>(`[data-clock-${k}]`, root!)
    if (!el) return
    const next = String(value[k]).padStart(k === 'j' ? 3 : 2, '0')
    if (el.textContent === next) return
    el.textContent = next
    // Un pouls sur le chiffre qui tombe, pas sur les quatre : c'est ce qui
    // fait qu'on voit la seconde passer sans que la ligne entière clignote.
    if (!reduced) gsap.fromTo(el, { opacity: 0.3, y: -4 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power3.out' })
  })
}

export const allies: Page = {
  eyebrow: 'GoofyBag — Partenariats',
  markup,
  mount(host) {
    root = host
    bindForm(host, SPEC)
    tick()
    beat = setInterval(tick, 1000)
    if (!reduced) {
      gsap.from(qq<HTMLElement>('.clock__cell', host), {
        y: 18,
        opacity: 0,
        duration: 0.7,
        stagger: 0.07,
        ease: 'power3.out',
        delay: 0.35,
      })
    }
  },
  unmount() {
    clearInterval(beat)
    beat = undefined
    root = null
  },
}
