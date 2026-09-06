/* Les quelques outils que tout le module partage : chercher dans le document,
   écrire un prix, savoir si l'on doit s'abstenir d'animer. Rien de plus — une
   couche d'abstraction de plus ne rendrait aucun service ici. */

export const q = <T extends Element>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel)

export const qq = <T extends Element>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel))

export const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
})

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
