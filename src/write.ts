import { bindForm, formMarkup, type FormSpec } from './form'
import type { Page } from './page'

// page contact
// le formulaire est genere par form.ts, ici on donne juste le SPEC
// a gauche : adresse horaires + un plan en svg + le bouton preview 3D

const SPEC: FormSpec = {
  fields: [
    { name: 'objet', cap: 'À quel sujet', chips: ['Une commande', 'Une réparation', 'La presse', 'Autre'] },
    { name: 'nom', cap: 'Votre nom', placeholder: 'Prénom et nom', half: true },
    { name: 'mail', cap: 'Votre e-mail', type: 'email', placeholder: 'vous@exemple.fr', half: true },
    { name: 'message', cap: 'Votre message', placeholder: 'Dites-nous tout — nous lisons vraiment.', area: true },
  ],
  submit: 'Envoyer',
  fine: 'Démonstration : rien ne quitte cette page. Aucune donnée n’est transmise ni conservée.',
  done: {
    title: 'Votre lettre est partie.',
    line: 'Nous répondons sous vingt-quatre heures ouvrées, de la main d’une personne — jamais d’un automate.',
    again: 'Écrire un autre message',
  },
}

// le plan du quartier fait a la main en svg. meme systeme de classes que le lab
// (.k plein / .d pointille / .p les ronds)
const PLAN = `
  <svg class="art plan" viewBox="0 0 260 180" aria-hidden="true">
    <path class="d" d="M0 48h260M0 140h260M86 0v180M176 0v180" />
    <path class="k" d="M20 0C36 44 10 96 28 180" pathLength="100" />
    <text class="plan__cap" x="36" y="104">Canal</text>
    <text class="plan__cap" x="96" y="40">Rue Saint-Maur</text>
    <path class="k" d="M98 64h66v56H98z" pathLength="100" />
    <path class="d" d="M124 120h14" />
    <circle class="k" cx="131" cy="92" r="9" pathLength="100" />
    <circle class="p" cx="131" cy="92" r="3.4" />
    <text class="plan__cap" x="98" y="134">Atelier</text>
    <path class="d" d="M192 66h50v38h-50zM192 156h50" />
  </svg>`

function markup(): string {
  return `
    <section class="page__hero">
      <p class="label reveal">Service — Nous écrire</p>
      <h1 class="page__title display reveal">Dites-nous.</h1>
      <p class="page__lede reveal">
        Une commande, une réparation, une idée, un reproche. Tout arrive au même
        endroit — une boîte que trois personnes relèvent, à Paris.
      </p>
    </section>

    <section class="page__sec write">
      <aside class="write__aside">
        <div class="write__block reveal">
          <p class="label">L'atelier</p>
          <p class="write__line">14 rue Saint-Maur<br />75011 Paris</p>
          <button class="write__demo" type="button" data-open-demo
                  data-cursor="lens" data-cursor-label="Survoler le quartier">
            <span class="write__demo-tick" aria-hidden="true"></span>
            Preview 3D
          </button>
        </div>
        <div class="write__block reveal">
          <p class="label">Sur rendez-vous</p>
          <p class="write__line">Du mardi au samedi<br />11 h — 19 h</p>
        </div>
        <div class="write__block reveal">
          <p class="label">Directement</p>
          <p class="write__line">
            <a class="write__mail" href="mailto:bonjour@goofybag.fr">bonjour@goofybag.fr</a><br />
            +33 1 84 80 00 26
          </p>
        </div>
        <figure class="write__plan reveal">${PLAN}</figure>
        <p class="write__note reveal">
          Réponse sous vingt-quatre heures ouvrées. Le samedi, comptez le lundi.
        </p>
      </aside>

      <div class="write__form reveal">${formMarkup(SPEC)}</div>
    </section>`
}

export const write: Page = {
  eyebrow: 'GoofyBag — Nous écrire',
  markup,
  mount(host) {
    bindForm(host, SPEC)
  },
}
