import { q, qq, reduced } from './dom'
import { find, type Product } from './products'
import { lenis } from './scroll'
import { observeReveals } from './reveal'

/* -------------------------------------------------------------------------
   Campagne — un diptyque décalé

   Deux pièces, jamais de la même taille ni à la même hauteur : c'est le
   décalage qui fait la campagne. Posées côte à côte et à égalité, elles se
   neutralisaient — deux carrés gris, deux légendes, rien à lire.

   Ce qu'on y gagne tient en trois choses : un rapport de grandeur franc
   (quatre colonnes contre six), une planche qui descend pendant que l'autre
   reste haute, et le glissement qui creuse ce décalage au fil de la page.

   La légende, elle, se tait. Une campagne n'est pas une fiche produit : le
   numéro de planche, le nom, la teinte, et rien d'autre — les cotes, la
   matière et le prix attendent dans la fiche, à un clic de là. Ce qui reste
   se lit d'un coup d'œil, sans quitter l'image des yeux.
   ---------------------------------------------------------------------- */

type Look = {
  slug: string
  /** Le numéro de planche, comme sur une épreuve. */
  plate: string
  /** L'ampleur du glissement, en pourcents de la hauteur de l'image.
      Les deux vont en sens contraire : c'est ce qui écarte les planches
      pendant qu'on descend, au lieu de les faire glisser de conserve. */
  depth: number
}

const LOOKS: Look[] = [
  { slug: 'le-nuage', plate: 'Pl. 01', depth: -9 },
  { slug: 'la-marguerite', plate: 'Pl. 02', depth: 7 },
]

function markup(look: Look, p: Product, i: number): string {
  const c = p.colours[0]
  const s = p.sizes[0]
  /* La planche porte `data-slug` et le visuel `data-open-product` : c'est
     exactement ce que le routage attend déjà d'une carte de la grille, et il
     n'y a rien à y ajouter pour que la fiche s'ouvre — au clic comme au
     clavier. */
  return `
    <figure class="look look--${i === 0 ? 'a' : 'b'} reveal"
            data-slug="${p.slug}" data-colour-name="${c.name}">
      <div class="look__media" data-open-product role="button" tabindex="0"
           aria-label="Voir ${p.name}, ${c.name}"
           data-cursor-label="${p.name} · ${s.dims}">
        <img data-look-img data-depth="${look.depth}"
             src="${c.image}" alt="${p.name} — ${c.name}" loading="lazy" />
      </div>
      <figcaption class="look__cap">
        <p class="look__line">
          <span class="look__plate">${look.plate}</span>
          <span class="look__colour">${c.name}</span>
        </p>
        <h3 class="look__name display">${p.name}</h3>
      </figcaption>
    </figure>`
}

export function renderLookbook(): void {
  const host = q<HTMLElement>('[data-lookbook]')
  if (!host) return

  const shown = LOOKS.map((l) => ({ l, p: find(l.slug) })).filter(
    (x): x is { l: Look; p: Product } => Boolean(x.p),
  )
  host.innerHTML = shown.map(({ l, p }, i) => markup(l, p, i)).join('')

  observeReveals()
  driftOn()
}

/* --- le glissement -------------------------------------------------------
   L'image est plus haute que son cadre, et se déplace dedans au fil du
   défilement : les deux planches ne vont ni du même côté ni à la même
   vitesse, ce qui creuse le décalage au lieu de le figer. Rien ne dépasse —
   c'est le débord de l'image qui absorbe la course.

   La course est écrite dans `translate`, et non dans `transform` : le survol
   rapproche l'image d'un `scale` qui vit, lui, dans `transform`. Les deux
   propriétés se composent sans se marcher dessus — écrites au même endroit,
   la dernière à passer effacerait l'autre.
   ------------------------------------------------------------------------ */

let drifting = false

function driftOn(): void {
  if (reduced || drifting) return

  const set = qq<HTMLImageElement>('[data-look-img]').map((img) => ({
    img,
    depth: Number(img.dataset.depth ?? 0),
  }))
  if (!set.length) return
  drifting = true

  const paint = () => {
    const h = window.innerHeight
    for (const { img, depth } of set) {
      const r = img.getBoundingClientRect()
      if (r.bottom < 0 || r.top > h) continue
      // −1 quand la planche entre par le bas, +1 quand elle sort par le haut.
      const t = (h / 2 - (r.top + r.height / 2)) / h
      // `offsetHeight` plutôt que la mesure du rectangle : celle-ci porte déjà
      // l'agrandissement du survol, et la course s'en trouverait modulée.
      img.style.translate = `0 ${(t * depth * img.offsetHeight) / 100}px`
    }
  }

  paint()
  lenis.on('scroll', paint)
  window.addEventListener('resize', paint)
}
