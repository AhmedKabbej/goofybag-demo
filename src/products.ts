import type { BagShape } from './viewer3d'

export type Colour = { name: string; hex: string; image: string }
/** delta = ce qu'on ajoute au prix de base (le prix de base c'est la taille S) */
export type Size = { name: string; dims: string; delta: number }

export type Product = {
  slug: string
  name: string
  /** sert a construire le sac dans la vue 3D */
  shape: BagShape
  /** prix taille S. pour les autres voir linePrice() */
  price: number
  tag?: string
  /** la 1ere couleur est celle affichee par defaut */
  colours: Colour[]
  sizes: Size[]
  description: string
  details: string[]
}

export const products: Product[] = [
  {
    slug: 'le-nuage',
    shape: 'nuage',
    name: 'Le Nuage',
    price: 1290,
    tag: 'Édition 01',
    colours: [
      { name: 'Lilas', hex: '#c3a4dd', image: '/bag1.webp' },
      { name: 'Bleu Ciel', hex: '#9fc2ea', image: '/bag1color2.webp' },
      { name: "Vert d'Eau", hex: '#a9d3a8', image: '/bag1color3.webp' },
    ],
    sizes: [
      { name: 'S', dims: '28 × 20 × 10 cm', delta: 0 },
      { name: 'XL', dims: '40 × 29 × 15 cm', delta: 240 },
    ],
    description:
      "Six bosses, aucune symétrie. Le patron a été tracé à main levée, une seule fois, et nous n'avons jamais cherché à le corriger. Ni armature ni doublure rigide : le nuage s'écrase quand on le pose, se regonfle quand on le reprend. Trois cent quarante grammes — on oublie qu'on le porte.",
    details: [
      'Fausse fourrure à poil long, doublure satin',
      "Anse rigide gainée, d'une seule pièce",
      'Trois déclinaisons teintes en pièce',
      'Fabriqué à Paris',
    ],
  },
  {
    slug: 'la-marguerite',
    shape: 'marguerite',
    name: 'La Marguerite',
    price: 1390,
    colours: [
      { name: 'Beurre & Corail', hex: '#f2d071', image: '/bag2.webp' },
      { name: 'Lilas & Mandarine', hex: '#c0a6e2', image: '/bag2color2.webp' },
      { name: 'Rose & Pistache', hex: '#f78bbe', image: '/bag2color3.webp' },
    ],
    sizes: [
      { name: 'S', dims: '26 × 24 × 8 cm', delta: 0 },
      { name: 'XL', dims: '38 × 36 × 13 cm', delta: 260 },
    ],
    description:
      "Huit pétales matelassés et un cœur contrasté. La fleur n'est pas un imprimé, c'est la découpe même du sac : chaque pétale est un volume, rembourré séparément, cousu aux autres par la pointe. Se porte à la main, jamais à l'épaule — une marguerite ne s'écrase pas.",
    details: [
      'Nylon matelassé bicolore',
      'Huit pétales rembourrés un à un',
      'Fermeture aimantée dissimulée',
      'Pétales, feuilles et cœur assortis par déclinaison',
      'Fabriqué au Portugal',
    ],
  },
  {
    slug: 'le-galet',
    shape: 'galet',
    name: 'Le Galet',
    price: 1490,
    tag: 'Nouveau',
    colours: [
      { name: 'Sauge & Écru', hex: '#9db594', image: '/bag3.webp' },
      { name: 'Corail & Écru', hex: '#ee9c84', image: '/bag3color2.webp' },
      { name: 'Citron & Bleu', hex: '#eccd6f', image: '/bag3color3.webp' },
    ],
    sizes: [
      { name: 'S', dims: '30 × 21 × 11 cm', delta: 0 },
      { name: 'XL', dims: '44 × 30 × 17 cm', delta: 280 },
    ],
    description:
      "Deux galets qui se chevauchent, en velours à grosses côtes. La ligne qui sépare les deux teintes est coupée à la main, sans gabarit : elle ne tombe jamais deux fois au même endroit. Le sac n'a ni base ni sommet — posé, il choisit lui-même de quel côté s'appuyer.",
    details: [
      'Velours côtelé de coton, grosses côtes',
      'Coupe bicolore tracée à la main',
      'Anse ronde, doublure assortie',
      'Fabriqué à Paris',
    ],
  },
  {
    slug: 'le-croissant',
    shape: 'croissant',
    name: 'Le Croissant',
    price: 1890,
    tag: 'Édition limitée',
    colours: [
      { name: 'Bleu Glacier', hex: '#a4d5e2', image: '/bag4.webp' },
      { name: 'Fuchsia Métal', hex: '#d94d8c', image: '/bag4color2.webp' },
      { name: 'Améthyste Métal', hex: '#9159c9', image: '/bag4color3.webp' },
    ],
    sizes: [
      { name: 'S', dims: '29 × 22 × 10 cm', delta: 0 },
      { name: 'XL', dims: '42 × 33 × 16 cm', delta: 320 },
    ],
    description:
      "Neuf segments gonflés, enroulés jusqu'à fermer la boucle, dans un nylon métallisé qui prend la couleur de la pièce où vous entrez. La plus longue à fabriquer de la collection : chaque boudin est rembourré isolément, puis assemblé sur la courbe. Quarante exemplaires par déclinaison, numérotés sous la fermeture.",
    details: [
      'Nylon enduit métallisé',
      'Neuf segments rembourrés séparément',
      'Édition de 40 par teinte, numérotée',
      'Fabriqué à Paris',
    ],
  },
  {
    slug: 'l-eclipse',
    shape: 'eclipse',
    name: "L'Éclipse",
    price: 1690,
    tag: 'Édition Noir & Blanc',
    colours: [
      { name: 'Encre', hex: '#131313', image: '/specialbBagBlack.webp' },
      { name: 'Craie', hex: '#ece7e0', image: '/specialbBagWhite.webp' },
    ],
    sizes: [
      { name: 'S', dims: '27 × 22 × 11 cm', delta: 0 },
      { name: 'XL', dims: '39 × 31 × 16 cm', delta: 300 },
    ],
    description:
      "Il a fallu retirer la couleur pour voir la forme. L'Éclipse est né d'un bain raté : une pièce trempée deux fois, ressortie si noire qu'elle ne renvoyait plus rien — ni les coutures, ni les creux, ni le relief du poil. Juste une silhouette posée sur la table. Nous avons gardé l'erreur, puis nous avons voulu son contraire : le même moule, la même anse d'une seule courbe, mais dans une fibre laissée à sa teinte d'origine, sans blanchiment, avec son fond crème. Encre avale la lumière, Craie la rend. Deux fois le même sac, jamais le même objet. Ni logo, ni ferrure, pas même un rivet : à ce stade, ce serait de trop.",
    details: [
      'Fausse fourrure à poil court',
      'Anse ronde moulée, sans couture apparente',
      'Doublure coton assortie, une poche plate',
      'Aucun marquage extérieur',
      'Encre teint en masse ; Craie non blanchi, il se patine',
      'Fabriqué à Paris',
    ],
  },
]

/** ce qui est selectionne a un instant T */
export type Selection = { p: Product; colour: string; size: string }

// --- petits helpers pour taper dans le catalogue ---

export const find = (slug: string | undefined): Product | undefined =>
  products.find((p) => p.slug === slug)

// la couleur par defaut = la premiere
export const defaultColour = (p: Product) => p.colours[0]

export const colourOf = (p: Product, name: string) =>
  p.colours.find((c) => c.name === name) ?? defaultColour(p)

export const sizeOf = (p: Product, name: string) =>
  p.sizes.find((s) => s.name === name) ?? p.sizes[0]

// prix final = prix de base + le delta de la taille
export const linePrice = (p: Product, size: string) => p.price + sizeOf(p, size).delta
