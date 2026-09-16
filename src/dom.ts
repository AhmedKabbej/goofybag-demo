// les 3-4 helpers utilises partout. pas la peine d'en faire une lib

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
