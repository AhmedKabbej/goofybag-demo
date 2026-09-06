/* -------------------------------------------------------------------------
   La carte, en tant que suite de chiffres

   Ce que le réseau impose (longueur, découpe, taille du cryptogramme), la
   teinte qui va avec, et la clé de Luhn. Rien ici ne touche au document :
   ce sont des fonctions pures, qu'on peut lire — et vérifier — seules.
   ---------------------------------------------------------------------- */

export type Kind = {
  name: string
  groups: number[]
  cvc: number
  /** L'américaine porte son cryptogramme sur la face, pas au dos. */
  frontCode: boolean
  tint: string
}

const KINDS: { test: RegExp; kind: Kind }[] = [
  {
    test: /^3[47]/,
    kind: { name: 'American Express', groups: [4, 6, 5], cvc: 4, frontCode: true, tint: '#12211f' },
  },
  {
    test: /^(5[1-5]|2[2-7])/,
    kind: { name: 'Mastercard', groups: [4, 4, 4, 4], cvc: 3, frontCode: false, tint: '#241a17' },
  },
  {
    test: /^4/,
    kind: { name: 'Visa', groups: [4, 4, 4, 4], cvc: 3, frontCode: false, tint: '#141b2c' },
  },
  {
    test: /^6(?:011|5)/,
    kind: { name: 'Discover', groups: [4, 4, 4, 4], cvc: 3, frontCode: false, tint: '#2a1e14' },
  },
]

export const NEUTRAL: Kind = { name: '', groups: [4, 4, 4, 4], cvc: 3, frontCode: false, tint: '#17171a' }

export const kindOf = (digits: string): Kind =>
  KINDS.find((k) => k.test.test(digits))?.kind ?? NEUTRAL

export const digitsOf = (v: string) => v.replace(/\D+/g, '')

export const cardLength = (k: Kind) => k.groups.reduce((n, g) => n + g, 0)

/** Découpe la saisie selon le réseau : 4-4-4-4, ou 4-6-5 pour l'américaine. */
export function groupDigits(digits: string, k: Kind): string {
  const out: string[] = []
  let at = 0
  for (const g of k.groups) {
    if (at >= digits.length) break
    out.push(digits.slice(at, at + g))
    at += g
  }
  return out.join(' ')
}

/** Le numéro tel qu'il se lit sur la carte : ce qui est tapé, puis des points. */
export function maskedNumber(digits: string, k: Kind): string {
  const full = digits.padEnd(cardLength(k), '•')
  const out: string[] = []
  let at = 0
  for (const g of k.groups) {
    out.push(full.slice(at, at + g))
    at += g
  }
  return out.join('  ')
}
