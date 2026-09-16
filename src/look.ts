import { q, qq, reduced } from './dom'
import { find, type Product } from './products'
import { lenis } from './scroll'
import { observeReveals } from './reveal'

// la section campagne : 2 images en decale
// une fait 4 colonnes l'autre 6 et elles sont pas a la meme hauteur. le reste
// (taille, matiere, prix) est dans la fiche produit on remet pas tout ici

type Look = {
  slug: string
  plate: string
  /** force du parallax en % de la hauteur de l'image.
      les 2 sont de signe oppose sinon elles glissent ensemble et on voit rien */
  depth: number
}

const LOOKS: Look[] = [
  { slug: 'le-nuage', plate: 'Pl. 01', depth: -9 },
  { slug: 'la-marguerite', plate: 'Pl. 02', depth: 7 },
]

function markup(look: Look, p: Product, i: number): string {
  const c = p.colours[0]
  const s = p.sizes[0]
  // on met les memes data-attr que sur une carte de la grille (data-slug +
  // data-open-product) comme ca le listener de main.ts marche direct, rien a ajouter
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

// --- le parallax ---
// l'image est plus haute que son cadre et bouge dedans qd on scroll
// attention : j'utilise translate et pas transform pcq le scale du hover
// est deja dans transform. si on met les 2 au meme endroit le dernier ecrase l'autre

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
      // t va de -1 (image en bas de l'ecran) a +1 (en haut). 0 = au milieu
      const t = (h / 2 - (r.top + r.height / 2)) / h
      // offsetHeight et pas r.height : r.height inclut le scale du hover dc
      // le parallax changerait de vitesse qd la souris passe dessus
      img.style.translate = `0 ${(t * depth * img.offsetHeight) / 100}px`
    }
  }

  paint()
  lenis.on('scroll', paint)
  window.addEventListener('resize', paint)
}
