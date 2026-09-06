/* ---------------------------------------------------------------------------
   Aperçu 3D — le sac est reconstruit depuis sa propre photo.

   On ne redessine rien : on découpe la silhouette exacte du visuel (le fond
   uniforme des prises de vue s'enlève proprement, y compris le vide sous
   l'anse), on mesure en chaque point sa distance au bord, et on gonfle la
   forme selon cette distance. Le sac retrouve son volume — épais au centre,
   pincé sur les contours — et l'anse devient un vrai boudin.

   De face, l'objet EST la photo. Sur le bourrelet — en haut, en bas, à gauche,
   à droite — la photo ne peut plus servir : elle n'y dispose que de deux ou
   trois pixels pour couvrir un quart de tour, et s'y étirait en traînées. La
   matière y est donc rejouée : la trame est projetée dans l'espace du sac,
   par ses trois faces, si bien qu'elle garde partout la même échelle et
   contourne le bord sans se déchirer ; la couleur, elle, est reprise du corps
   du sac au même endroit. La photo et la matière se croisent selon l'angle de
   la surface — le sac est d'un seul tenant, sans couture ni raccord.
   ------------------------------------------------------------------------ */

import * as THREE from 'three'

export type BagShape = 'nuage' | 'marguerite' | 'galet' | 'croissant' | 'eclipse'

/* Dosage de la lumière au repos. La photo est déjà éclairée : de face, le rendu
   doit valoir la photo. Ces deux constantes sont réglées à la mesure — voir le
   contrôle de fidélité colorimétrique. Le curseur du viewer les fait varier
   autour de ce point, qui reste son milieu de course. */
const AMBIENT = 0.69
const ENV_LIGHT = 0.56

export type ViewerHandle = {
  /** Position du curseur dans la page, ramenée à [-1, 1]. */
  point: (nx: number, ny: number) => void
  resize: () => void
  dispose: () => void
  /** Fond de la prise de vue, à reporter derrière le canvas. */
  backdrop: string
  /** Course unique : lumière, reflet et éclat, de 0 (sourd) à 1 (éclatant). */
  setLight: (t: number) => void
}

/** Rendu de surface propre à chaque matière. L'épaisseur, elle, vient des cotes. */
const finish: Record<
  BagShape,
  {
    grain: number
    bump: number
    rough: number
    metal: number
    env: number
    glow: number
    /** Part de trame rappelée sur la face — nulle sur un nylon, franche sur du poil. */
    front: number
  }
> = {
  nuage: { grain: 3.2, bump: 2.6, rough: 0.99, metal: 0, env: 0.2, glow: 0.1, front: 0.3 },
  marguerite: { grain: 2.2, bump: 1.5, rough: 0.78, metal: 0, env: 0.3, glow: 0.14, front: 0.2 },
  galet: { grain: 3.6, bump: 2.4, rough: 0.96, metal: 0, env: 0.22, glow: 0.1, front: 0.28 },
  croissant: { grain: 1.8, bump: 1.2, rough: 0.36, metal: 0.5, env: 0.55, glow: 0.3, front: 0.06 },
  eclipse: { grain: 3.4, bump: 2.4, rough: 0.99, metal: 0, env: 0.08, glow: 0.08, front: 0.22 },
}

/**
 * « 28 × 20 × 10 cm » → demi-épaisseur du volume, rapportée à la hauteur.
 * Le sac gonfle donc exactement de ce que la fiche annonce : un modèle plat
 * reste plat, un modèle profond prend son volume.
 */
export function depthFromDims(dims: string): number {
  const [w, h, d] = (dims.match(/\d+(?:[.,]\d+)?/g) ?? []).map((v) => Number(v.replace(',', '.')))
  if (!w || !h || !d) return 0.42
  return Math.min(0.72, Math.max(0.18, d / h))
}

/* --- découpe de la silhouette --------------------------------------------- */

/** Le raster de travail : masque du sac et distance au bord, en pixels. */
type Field = {
  W: number
  H: number
  mask: Uint8Array
  dist: Float32Array
  /** Boîte englobante du sac dans ce raster. */
  x0: number
  y0: number
  x1: number
  y1: number
  /** Rapport largeur/hauteur de l'image d'origine. */
  ratio: number
  /** Le fond de la prise de vue, pour poser la découpe sur le même sol. */
  backdrop: string
}

const GRID = 600

function silhouette(img: HTMLImageElement): Field {
  const ratio = img.naturalWidth / img.naturalHeight
  const W = ratio >= 1 ? GRID : Math.round(GRID * ratio)
  const H = ratio >= 1 ? Math.round(GRID / ratio) : GRID
  const n = W * H

  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, W, H)
  const px = ctx.getImageData(0, 0, W, H).data

  /* Le fond de ces prises de vue est lisse au point d'être sans grain : c'est
     lui, et non la couleur, qui sert de critère. Un sac ivoire sur fond clair
     ne se distingue presque pas en teinte — mais sa matière, si. */
  const lum = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    lum[i] = 0.2126 * px[j] + 0.7152 * px[j + 1] + 0.0722 * px[j + 2]
  }
  /* Tous les voisinages de cette passe sont pris en deux temps, une fois par
     axe : à cette finesse de trame, un noyau carré coûterait le carré de ce
     qu'il rapporte, et l'aperçu se ferait attendre. */
  const box = (src: Float32Array, r: number) => {
    const mid = new Float32Array(n)
    const out = new Float32Array(n)
    const k = 1 / (2 * r + 1)
    for (let y = 0; y < H; y++) {
      const row = y * W
      for (let x = 0; x < W; x++) {
        let acc = 0
        for (let d = -r; d <= r; d++) acc += src[row + Math.min(W - 1, Math.max(0, x + d))]
        mid[row + x] = acc * k
      }
    }
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        let acc = 0
        for (let d = -r; d <= r; d++) acc += mid[Math.min(H - 1, Math.max(0, y + d)) * W + x]
        out[y * W + x] = acc * k
      }
    }
    return out
  }
  const blur = box(lum, 1)
  const grad = new Float32Array(n)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const l = (xx: number, yy: number) =>
        blur[Math.min(H - 1, Math.max(0, yy)) * W + Math.min(W - 1, Math.max(0, xx))]
      grad[y * W + x] =
        Math.abs(l(x + 1, y) - l(x - 1, y)) + Math.abs(l(x, y + 1) - l(x, y - 1))
    }
  }
  // Énergie de texture : le gradient moyenné, qui sépare la matière du vide.
  const smoothed = box(grad, 4)
  const tex = new Float32Array(n)
  for (let i = 0; i < n; i++) tex[i] = smoothed[i] * 8

  const corner = (x: number, y: number) => {
    const i = (y * W + x) * 4
    return [px[i], px[i + 1], px[i + 2]]
  }
  const corners = [corner(1, 1), corner(W - 2, 1), corner(1, H - 2), corner(W - 2, H - 2)]
  const bg = [0, 1, 2].map((k) => {
    const v = corners.map((c) => c[k]).sort((a, b) => a - b)
    return (v[1] + v[2]) / 2
  })
  const d2 = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const j = i * 4
    d2[i] =
      Math.abs(px[j] - bg[0]) + Math.abs(px[j + 1] - bg[1]) + Math.abs(px[j + 2] - bg[2])
  }

  /* Semences : le bord de l'image, et tout fond franc où qu'il se trouve — le
     vide sous l'anse en est un. Le critère est érodé pour ne pas s'amorcer
     dans une fourrure claire, qui ressemble au fond mais n'est jamais lisse. */
  const seedable = new Uint8Array(n)
  for (let i = 0; i < n; i++) seedable[i] = grad[i] <= 1 && d2[i] <= 16 ? 1 : 0
  // Érosion 9 × 9, en deux sommes glissantes : la semence doit être au centre
  // d'un carré entièrement lisse, sans quoi elle s'amorce dans la matière.
  const runX = new Int32Array(n)
  for (let y = 0; y < H; y++) {
    const row = y * W
    for (let x = 4; x < W - 4; x++) {
      let c = 0
      for (let d = -4; d <= 4; d++) c += seedable[row + x + d]
      runX[row + x] = c
    }
  }
  const seed = new Uint8Array(n)
  for (let x = 4; x < W - 4; x++) {
    for (let y = 4; y < H - 4; y++) {
      let c = 0
      for (let d = -4; d <= 4; d++) c += runX[(y + d) * W + x]
      seed[y * W + x] = c === 81 ? 1 : 0
    }
  }

  const isBg = new Uint8Array(n)
  const queue: number[] = []
  for (let i = 0; i < n; i++) {
    const x = i % W
    const y = (i / W) | 0
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || seed[i]) {
      isBg[i] = 1
      queue.push(i)
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head]
    const j0 = i * 4
    const x = i % W
    const y = (i / W) | 0
    const step = (j: number) => {
      if (isBg[j] || grad[j] > 3) return
      const j1 = j * 4
      const diff =
        Math.abs(px[j1] - px[j0]) + Math.abs(px[j1 + 1] - px[j0 + 1]) + Math.abs(px[j1 + 2] - px[j0 + 2])
      if (diff > 14) return
      isBg[j] = 1
      queue.push(j)
    }
    if (x > 0) step(i - 1)
    if (x < W - 1) step(i + 1)
    if (y > 0) step(i - W)
    if (y < H - 1) step(i + W)
  }

  // L'ombre portée : lisse, et jamais loin du fond en teinte.
  for (let i = 0; i < n; i++) if (!isBg[i] && tex[i] < 14 && d2[i] < 70) isBg[i] = 1

  const mask = new Uint8Array(n)
  for (let i = 0; i < n; i++) mask[i] = isBg[i] ? 0 : 1

  // Ce qui reste de la galette d'ombre : des colonnes courtes, et en bas.
  let top = H
  let bot = 0
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue
    const y = (i / W) | 0
    if (y < top) top = y
    if (y > bot) bot = y
  }
  const mid = (top + bot) / 2
  const minRun = Math.max(8, Math.round(H * 0.052))
  for (let x = 0; x < W; x++) {
    let y = 0
    while (y < H) {
      if (!mask[y * W + x]) { y++; continue }
      const y0 = y
      while (y < H && mask[y * W + x]) y++
      if (y - y0 < minRun && y0 > mid) for (let k = y0; k < y; k++) mask[k * W + x] = 0
    }
  }

  // La plus grande pièce, et rien d'autre : les poussières partent avec.
  const seen = new Int32Array(n).fill(-1)
  const stack: number[] = []
  let best = -1
  let bestSize = 0
  let label = 0
  for (let s0 = 0; s0 < n; s0++) {
    if (!mask[s0] || seen[s0] >= 0) continue
    let size = 0
    seen[s0] = label
    stack.push(s0)
    while (stack.length) {
      const i = stack.pop()!
      size++
      const x = i % W
      const y = (i / W) | 0
      if (x > 0 && mask[i - 1] && seen[i - 1] < 0) { seen[i - 1] = label; stack.push(i - 1) }
      if (x < W - 1 && mask[i + 1] && seen[i + 1] < 0) { seen[i + 1] = label; stack.push(i + 1) }
      if (y > 0 && mask[i - W] && seen[i - W] < 0) { seen[i - W] = label; stack.push(i - W) }
      if (y < H - 1 && mask[i + W] && seen[i + W] < 0) { seen[i + W] = label; stack.push(i + W) }
    }
    if (size > bestSize) { bestSize = size; best = label }
    label++
  }

  for (let i = 0; i < n; i++) mask[i] = seen[i] === best ? 1 : 0

  // Fermeture douce : les micro-entailles du contour se referment.
  const dilate = (src: Uint8Array, want: number) => {
    const out = new Uint8Array(n)
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        let c = 0
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += src[(y + dy) * W + x + dx]
        out[y * W + x] = c >= want ? 1 : 0
      }
    }
    return out
  }
  const closed = dilate(dilate(dilate(mask, 1), 1), 9)
  mask.set(dilate(closed, 9))

  // La boîte englobante se relève après fermeture : c'est elle qui donne l'échelle.
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue
    const x = i % W
    const y = (i / W) | 0
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }

  // Distance au bord, en deux passes (chanfrein 3-4).
  const dist = new Float32Array(n)
  const BIG = 1e6
  for (let i = 0; i < n; i++) dist[i] = mask[i] ? BIG : 0
  const relax = (i: number, j: number, w: number) => {
    if (dist[j] + w < dist[i]) dist[i] = dist[j] + w
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (!mask[i]) continue
      if (x > 0) relax(i, i - 1, 3)
      if (y > 0) relax(i, i - W, 3)
      if (x > 0 && y > 0) relax(i, i - W - 1, 4)
      if (x < W - 1 && y > 0) relax(i, i - W + 1, 4)
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x
      if (!mask[i]) continue
      if (x < W - 1) relax(i, i + 1, 3)
      if (y < H - 1) relax(i, i + W, 3)
      if (x < W - 1 && y < H - 1) relax(i, i + W + 1, 4)
      if (x > 0 && y < H - 1) relax(i, i + W - 1, 4)
    }
  }
  for (let i = 0; i < n; i++) dist[i] /= 3

  const soft = Float32Array.from(dist)
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x
      if (!mask[i]) continue
      soft[i] = (dist[i] * 4 + dist[i - 1] + dist[i + 1] + dist[i - W] + dist[i + W]) / 8
    }
  }
  dist.set(soft)

  const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  const backdrop = `#${hex(bg[0])}${hex(bg[1])}${hex(bg[2])}`

  return { W, H, mask, dist, x0, y0, x1, y1, ratio, backdrop }
}

/* --- la peau : photo détourée, puis prolongée --------------------------------
   Sur les deux ou trois pixels du contour, la photo est déjà mêlée au fond :
   posée telle quelle sur la maille, elle cerne le sac d'un liseré gris. On les
   remplace donc par la couleur du pixel de matière le plus proche, et l'on
   prolonge de la même manière au-delà de la découpe — la teinte ne s'arrête
   plus au bord, elle déborde. Une version très floue de cette image sert
   ensuite de couleur de fond au bourrelet.
   ------------------------------------------------------------------------ */

/** En deçà de cette distance au bord, le pixel n'est plus de la matière franche. */
const CLEAN = 3

function shrink(from: HTMLCanvasElement, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, w)
  c.height = Math.max(1, h)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(from, 0, 0, c.width, c.height)
  return c
}

function skin(
  img: HTMLImageElement,
  field: Field,
): { albedo: THREE.CanvasTexture; body: THREE.CanvasTexture } {
  const { W, H, mask, dist } = field
  const n = W * H

  /* Pour chaque pixel douteux, le pixel de matière franche le plus proche —
     transformée de distance qui charrie sa source (chanfrein 3-4). */
  const sx = new Int32Array(n).fill(-1)
  const sy = new Int32Array(n).fill(-1)
  const fd = new Float32Array(n)
  const BIG = 1e9
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (mask[i] && dist[i] >= CLEAN) {
        sx[i] = x
        sy[i] = y
        fd[i] = 0
      } else {
        fd[i] = BIG
      }
    }
  }
  const pull = (i: number, j: number, w: number) => {
    if (sx[j] < 0) return
    const c = fd[j] + w
    if (c < fd[i]) { fd[i] = c; sx[i] = sx[j]; sy[i] = sy[j] }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (x > 0) pull(i, i - 1, 3)
      if (y > 0) pull(i, i - W, 3)
      if (x > 0 && y > 0) pull(i, i - W - 1, 4)
      if (x < W - 1 && y > 0) pull(i, i - W + 1, 4)
    }
  }
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x
      if (x < W - 1) pull(i, i + 1, 3)
      if (y < H - 1) pull(i, i + W, 3)
      if (x < W - 1 && y < H - 1) pull(i, i + W + 1, 4)
      if (x > 0 && y < H - 1) pull(i, i + W - 1, 4)
    }
  }

  const AW = Math.max(64, Math.min(img.naturalWidth, 1024))
  const AH = Math.max(1, Math.round(AW / field.ratio))
  const cv = document.createElement('canvas')
  cv.width = AW
  cv.height = AH
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, AW, AH)

  const im = ctx.getImageData(0, 0, AW, AH)
  const src = new Uint8ClampedArray(im.data)
  const kx = W / AW
  const ky = H / AH
  for (let Y = 0; Y < AH; Y++) {
    const fy = Y * ky
    const cy = Math.min(H - 1, Math.round(fy))
    for (let X = 0; X < AW; X++) {
      const fx = X * kx
      const cx = Math.min(W - 1, Math.round(fx))
      const i = cy * W + cx
      if ((mask[i] && dist[i] >= CLEAN) || sx[i] < 0) continue
      // On garde la fraction de pixel : la reprise ne se voit pas en escalier.
      const ax = Math.min(AW - 1, Math.max(0, Math.round((sx[i] + fx - cx) / kx)))
      const ay = Math.min(AH - 1, Math.max(0, Math.round((sy[i] + fy - cy) / ky)))
      const s = (ay * AW + ax) * 4
      const d = (Y * AW + X) * 4
      im.data[d] = src[s]
      im.data[d + 1] = src[s + 1]
      im.data[d + 2] = src[s + 2]
      im.data[d + 3] = 255
    }
  }
  ctx.putImageData(im, 0, 0)

  const albedo = new THREE.CanvasTexture(cv)
  albedo.colorSpace = THREE.SRGBColorSpace
  albedo.anisotropy = 8

  /* La couleur du sac, débarrassée de tout détail : deux réductions
     successives, une remontée douce. C'est elle qui teinte le bourrelet. */
  const low = shrink(shrink(cv, Math.round(AW / 8), Math.round(AH / 8)), 56, Math.round(56 / field.ratio))
  const soft = shrink(shrink(low, 128, Math.round(128 / field.ratio)), 320, Math.round(320 / field.ratio))
  const body = new THREE.CanvasTexture(soft)
  body.colorSpace = THREE.SRGBColorSpace

  return { albedo, body }
}

/* --- gonflage ------------------------------------------------------------- */

/**
 * La silhouette devient un coussin : plat au centre, pincé sur le contour.
 * Le profil est un quart de cercle — c'est ce qui donne aux bords cette
 * rondeur de matelassé plutôt qu'une tranche coupée net.
 *
 * En sort aussi la mesure du monde : la hauteur de l'image, en unités de la
 * maille. C'est elle qui accorde la trame projetée à celle de la face.
 */
function inflate(field: Field, depth: number): { geometry: THREE.BufferGeometry; unit: number } {
  const { W, H, mask, dist } = field
  const bw = field.x1 - field.x0
  const bh = field.y1 - field.y0

  // Rayon d'arrondi : au-delà, l'épaisseur est constante.
  const R = Math.max(6, Math.min(bw, bh) * 0.17)
  const scale = 2 / bh
  const cx = (field.x0 + field.x1) / 2
  const cy = (field.y0 + field.y1) / 2

  /* Le profil du bourrelet. Un quart de cercle serait la forme juste — mais sa
     tangente est verticale au contour : toute l'épaisseur du sac s'y prenait
     entre deux pixels de la trame, soit un seul rang de facettes pour une
     paroi qui, vue par la tranche, couvre le quart de la pièce. C'est ce rang
     étiré qui ouvrait au milieu du sac cette bande claire, comme si les deux
     moitiés ne se rejoignaient pas. Le quart de sinus monte au même sommet
     mais part d'une pente finie : la paroi se répartit sur une vingtaine de
     rangs, et le milieu se referme. On garde l'épaule pleine du coussin —
     à mi-rayon, l'épaisseur vaut déjà les six septièmes de la cote. */
  const TAN = Math.tanh(2.6)
  const zAt = (d: number) => {
    const t = Math.min(1, Math.max(0, d - 1) / R)
    return (Math.tanh(2.6 * t) / TAN) * depth
  }

  /* Le dernier anneau de pixels doit valoir zéro, et c'est lui qu'il faut
     désigner, pas une distance : le champ est lissé, si bien qu'aucun pixel du
     bord ne tombe exactement sur la valeur attendue. Les deux nappes
     s'arrêtaient donc à quelques centièmes l'une de l'autre — une fente ouverte
     tout autour du sac. De face on ne la voyait pas ; par la tranche, on voyait
     le fond au travers, en un trait clair du haut en bas. On épingle ici la
     couture : tout pixel qui touche le vide est ramené à plat, et les deux
     nappes s'y rejoignent sur le même sommet. */
  const rim = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (!mask[i]) continue
      if (
        x === 0 || y === 0 || x === W - 1 || y === H - 1 ||
        !mask[i - 1] || !mask[i + 1] || !mask[i - W] || !mask[i + W]
      ) rim[i] = 1
    }
  }

  /* Deux nappes symétriques, avant et arrière. Sur le contour l'épaisseur est
     nulle : les deux y partagent le même sommet, la coque est donc close et
     sans arête vive — sans quoi une ligne brillante court le long du bord. */
  const front = new Int32Array(W * H).fill(-1)
  const back = new Int32Array(W * H).fill(-1)
  const pos: number[] = []
  const uv: number[] = []
  const edge: number[] = []
  let n = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (!mask[i]) continue
      const wx = (x - cx) * scale
      const wy = -(y - cy) * scale
      const z = rim[i] ? 0 : zAt(dist[i])
      const u = x / (W - 1)
      const v = 1 - y / (H - 1)
      // Fermeture du contour : un rien d'ombre là où la matière se pince.
      const e = Math.min(1, dist[i] / R)

      front[i] = n++
      pos.push(wx, wy, z)
      uv.push(u, v)
      edge.push(e)
      if (z === 0) {
        back[i] = front[i]
      } else {
        back[i] = n++
        pos.push(wx, wy, -z)
        uv.push(u, v)
        edge.push(e)
      }
    }
  }

  const tri: number[] = []
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const i = y * W + x
      if (!mask[i] || !mask[i + 1] || !mask[i + W] || !mask[i + W + 1]) continue
      const a = front[i], b = front[i + 1], c = front[i + W], d = front[i + W + 1]
      const A = back[i], B = back[i + 1], C = back[i + W], D = back[i + W + 1]
      tri.push(a, c, b, b, c, d)
      tri.push(A, B, C, B, D, C)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1))
  g.setIndex(tri)
  g.computeVertexNormals()
  g.computeBoundingBox()
  return { geometry: g, unit: H * scale }
}

/* --- matière -------------------------------------------------------------- */

/**
 * Carte de relief tirée d'un seul carré de matière, prélevé au point le plus
 * profond du sac — là où il n'y a que du poil, de la côte ou du nylon.
 *
 * Surtout pas l'image entière : ses contours se retrouveraient gravés dans la
 * surface et se répéteraient à chaque tuile, comme autant de fausses coutures.
 *
 * Le carré est rendu raccordable sans miroir. Un miroir serait plus simple,
 * mais il plante dans la matière un axe de symétrie : la fourrure s'y répond
 * d'un côté à l'autre et, dès qu'on tourne la pièce, un moirage en chevrons
 * remonte le long de cet axe. On croise donc la matière avec elle-même,
 * décalée d'une demi-tuile, sous des poids périodiques — le raccord est franc
 * aux quatre bords, et il ne reste aucune symétrie pour accrocher l'œil.
 */
function grainNormal(
  img: HTMLImageElement,
  field: Field,
  gain: number,
): { relief: THREE.CanvasTexture; albedo: THREE.CanvasTexture; mean: THREE.Vector3 } {
  // Le disque inscrit le plus large : c'est de la matière pure, sans contour.
  let deep = 0
  let di = 0
  for (let i = 0; i < field.W * field.H; i++) {
    if (field.dist[i] > deep) { deep = field.dist[i]; di = i }
  }
  const k = img.naturalWidth / field.W
  const side = Math.max(24, Math.round(deep * 0.8 * k))
  const px = Math.round(((di % field.W) - deep * 0.4) * k)
  const py = Math.round((((di / field.W) | 0) - deep * 0.4) * k)

  const M = 512
  const half = M / 2
  const patch = document.createElement('canvas')
  patch.width = patch.height = M
  const pctx = patch.getContext('2d', { willReadFrequently: true })!
  pctx.drawImage(img, px, py, side, side, 0, 0, M, M)
  const src = pctx.getImageData(0, 0, M, M).data

  let mr = 0, mg = 0, mb = 0
  for (let i = 0; i < M * M; i++) {
    const j = i * 4
    mr += src[j]; mg += src[j + 1]; mb += src[j + 2]
  }
  const inv = 1 / (M * M)
  const mean = [mr * inv, mg * inv, mb * inv]

  /* Le tissage. Sur les bords de la tuile, le poids du carré d'origine tombe
     à zéro et c'est la copie décalée d'une demi-tuile qui prend tout : de part
     et d'autre du raccord, on lit alors deux colonnes voisines de la même
     matière — la tuile se referme sur elle-même sans couture. Au milieu, où
     l'on croise les quatre copies, on rend au contraste ce que le mélange lui
     a pris. */
  const cv = document.createElement('canvas')
  cv.width = cv.height = M
  const ctx = cv.getContext('2d', { willReadFrequently: true })!
  const woven = ctx.createImageData(M, M)
  const cos = new Float32Array(M)
  for (let x = 0; x < M; x++) cos[x] = 0.5 - 0.5 * Math.cos((2 * Math.PI * x) / M)
  for (let y = 0; y < M; y++) {
    const cy = cos[y]
    const ry = ((y + half) % M) * M
    for (let x = 0; x < M; x++) {
      const cx = cos[x]
      const rx = (x + half) % M
      const w = [cx * cy, (1 - cx) * cy, cx * (1 - cy), (1 - cx) * (1 - cy)]
      const at = [y * M + x, y * M + rx, ry + x, ry + rx]
      const norm = Math.sqrt(w[0] * w[0] + w[1] * w[1] + w[2] * w[2] + w[3] * w[3])
      const o = (y * M + x) * 4
      for (let c = 0; c < 3; c++) {
        let v = 0
        for (let t = 0; t < 4; t++) v += w[t] * src[at[t] * 4 + c]
        woven.data[o + c] = mean[c] + (v - mean[c]) / norm
      }
      woven.data[o + 3] = 255
    }
  }
  ctx.putImageData(woven, 0, 0)

  // La tuile en couleur, telle quelle : c'est elle qui habille le bourrelet.
  const albedo = new THREE.CanvasTexture(cv)
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping
  albedo.colorSpace = THREE.SRGBColorSpace
  albedo.anisotropy = 8

  const lum = new Float32Array(M * M)
  for (let i = 0; i < M * M; i++) {
    const j = i * 4
    lum[i] = (0.2126 * woven.data[j] + 0.7152 * woven.data[j + 1] + 0.0722 * woven.data[j + 2]) / 255
  }
  // Passe-haut : la luminance moins sa moyenne locale, en deux passes et en
  // repliant les bords — la tuile doit rester raccordable jusque dans le relief.
  const R = 3
  const K = 1 / (2 * R + 1)
  const midp = new Float32Array(M * M)
  const low = new Float32Array(M * M)
  for (let y = 0; y < M; y++) {
    const row = y * M
    for (let x = 0; x < M; x++) {
      let acc = 0
      for (let d = -R; d <= R; d++) acc += lum[row + ((((x + d) % M) + M) % M)]
      midp[row + x] = acc * K
    }
  }
  for (let x = 0; x < M; x++) {
    for (let y = 0; y < M; y++) {
      let acc = 0
      for (let d = -R; d <= R; d++) acc += midp[((((y + d) % M) + M) % M) * M + x]
      low[y * M + x] = acc * K
    }
  }
  const hi = new Float32Array(M * M)
  for (let i = 0; i < M * M; i++) hi[i] = lum[i] - low[i]

  const relief = document.createElement('canvas')
  relief.width = relief.height = M
  const rctx = relief.getContext('2d')!
  const out = rctx.createImageData(M, M)
  const at = (x: number, y: number) => hi[(((y % M) + M) % M) * M + (((x % M) + M) % M)]
  for (let y = 0; y < M; y++) {
    for (let x = 0; x < M; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * gain * 24
      const dy = (at(x, y + 1) - at(x, y - 1)) * gain * 24
      const len = Math.hypot(dx, dy, 1)
      const i = (y * M + x) * 4
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255
      out.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      out.data[i + 2] = (1 / len) * 0.5 * 255 + 127
      out.data[i + 3] = 255
    }
  }
  rctx.putImageData(out, 0, 0)

  const bump = new THREE.CanvasTexture(relief)
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping
  bump.anisotropy = 8

  // La moyenne de la tuile : on n'en gardera que la modulation, pas la teinte.
  return {
    relief: bump,
    albedo,
    mean: new THREE.Vector3(mean[0] / 255, mean[1] / 255, mean[2] / 255),
  }
}

/* --- scène ---------------------------------------------------------------- */

/**
 * Le fond du studio : un gris de cyclo, plus clair au zénith. Il ne fait pas
 * l'éclairage — il donne l'assise sur laquelle les boîtes à lumière tranchent.
 */
function dome(): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = 4
  cv.height = 128
  const ctx = cv.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 128)
  g.addColorStop(0, '#f0efec')
  g.addColorStop(0.42, '#dcdad5')
  g.addColorStop(0.74, '#b8b6b0')
  g.addColorStop(1, '#98968f')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 4, 128)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.mapping = THREE.EquirectangularReflectionMapping
  return t
}

export async function mountViewer(
  canvas: HTMLCanvasElement,
  opts: { shape: BagShape; image: string; dims: string; still: boolean; light?: number },
): Promise<ViewerHandle> {
  const spec = finish[opts.shape]

  const img = new Image()
  img.decoding = 'async'
  img.src = opts.image
  await img.decode()

  const field = silhouette(img)
  const { geometry, unit } = inflate(field, depthFromDims(opts.dims))
  const { albedo: map, body } = skin(img, field)

  const grain = grainNormal(img, field, spec.bump)
  const normalMap = grain.relief
  normalMap.repeat.set(spec.grain, spec.grain)
  /* Pas de la trame projetée, accordé à celui de la face : le grain garde la
     même taille qu'on regarde le sac de face ou par la tranche. */
  const tri = spec.grain / unit

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  /* Filtrage anisotrope au maximum : vue de biais, une face du sac s'écrase
     sur quelques pixels de large. Sans lui, la fourrure s'y met à grouiller. */
  const aniso = renderer.capabilities.getMaxAnisotropy()
  map.anisotropy = aniso
  body.anisotropy = aniso
  normalMap.anisotropy = aniso
  grain.albedo.anisotropy = aniso
  // Aucun mappage tonal : les pixels de la photo doivent ressortir tels quels.
  renderer.toneMapping = THREE.NoToneMapping

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100)
  camera.position.set(0, 0, 8)

  /* Le plateau. Deux boîtes à lumière hautes et étroites, plantées de part et
     d'autre de la pièce et légèrement en avant : ce sont elles qui tracent sur
     le sac les deux bandes de lumière verticales d'une nature morte de studio.
     Au-dessus, une boîte large qui pose le volume ; derrière, un retour qui
     détache la silhouette du fond ; au sol, un réflecteur qui rouvre le bas.
     Aucun projecteur ponctuel : tout est en surface, donc aucune ombre dure. */
  const studio = new THREE.Scene()
  const sky = dome()
  studio.background = sky
  const panel = (w: number, h: number, c: number, i: number, at: [number, number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: c }),
    )
    m.material.color.multiplyScalar(i)
    m.position.set(...at)
    m.lookAt(0, 0, 0)
    studio.add(m)
  }
  // Les deux boîtes latérales : la gauche mène, la droite déboîte.
  panel(3.2, 11, 0xfffdf7, 6.4, [-6.6, 0.6, 3.4])
  panel(3.2, 11, 0xf9fbff, 4.8, [6.6, 0.6, 3.4])
  // Nappe zénithale, retour arrière, réflecteur de sol.
  panel(11, 4.5, 0xfffefb, 3.4, [-0.6, 6.4, 2.2])
  panel(9, 9, 0xffffff, 2.0, [-1.2, 2.2, -7.2])
  panel(9, 3.6, 0xfff7ee, 1.15, [0, -5.2, 3.4])

  const env = new THREE.PMREMGenerator(renderer)
  const envMap = env.fromScene(studio, 0.035).texture
  scene.environment = envMap

  /* La photo porte déjà son éclairage de studio. Le budget lumineux est donc
     dosé pour valoir exactement 1 sur une face tournée vers l'objectif :
     de face, le rendu est la photo, au pixel près. C'est en tournant que
     l'appoint et le contre-jour se mettent à sculpter. La lampe d'ambiance
     est hémisphérique : le haut du sac reçoit un rien de plus que le bas. */
  const fill = new THREE.HemisphereLight(0xffffff, 0xe7e2d8, AMBIENT)
  scene.add(fill)
  scene.environmentIntensity = ENV_LIGHT
  scene.environmentRotation.set(0, 0.35, 0)

  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: spec.rough,
    metalness: spec.metal,
    envMapIntensity: spec.env,
    side: THREE.DoubleSide,
  })

  /* De face, la photo. Sur le bourrelet, elle serait étirée en traînées : on
     lui substitue la matière — la trame projetée depuis les trois faces du sac,
     et la couleur du corps prise au même endroit. Projetée ainsi, la trame ne
     se déforme nulle part et contourne le bord sans se déchirer : elle garde
     partout la même échelle, et le sac reste d'un seul tenant sur un tour
     complet. */
  let uniforms: Record<string, THREE.IUniform> | null = null
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSide = { value: grain.albedo }
    shader.uniforms.uSideMean = { value: grain.mean }
    shader.uniforms.uBody = { value: body }
    shader.uniforms.uTri = { value: tri }
    shader.uniforms.uFront = { value: spec.front }
    shader.uniforms.uEdgeAO = { value: 0.18 }
    shader.uniforms.uGlow = { value: 0 }
    uniforms = shader.uniforms

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aEdge;\nvarying vec3 vObjN;\nvarying vec3 vObjP;\nvarying float vEdge;',
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nvObjN = normal;\nvObjP = position;\nvEdge = aEdge;',
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vObjN;
         varying vec3 vObjP;
         varying float vEdge;
         uniform sampler2D uSide;
         uniform sampler2D uBody;
         uniform vec3 uSideMean;
         uniform float uTri;
         uniform float uFront;
         uniform float uEdgeAO;
         uniform float uGlow;`,
      )
      /* Deux mesures décident de ce qu'on montre. L'angle de la surface dans le
         sac : au-delà du galbe, la photo n'a plus rien à dire. Et l'angle de
         vue : une face qui fuit vers le fond ne rend plus que des traînées,
         quand bien même c'est une face. Partout ailleurs, la photo intacte. */
      .replace(
        '#include <map_fragment>',
        `vec3 nObj = normalize(vObjN);
         float toward = abs(dot(normalize(vNormal), normalize(vViewPosition)));
         float away = 1.0 - toward;
         /* Une face qui fuit s'écrase sur quelques pixels : on la lit dans un
            niveau plus grossier de la photo, sans quoi elle se met à fourmiller. */
         diffuseColor *= texture2D(map, vMapUv, 2.4 * away * away);
         float facing = smoothstep(0.10, 0.48, abs(nObj.z)) * smoothstep(0.10, 0.38, toward);
         vec3 triW = pow(abs(nObj), vec3(4.0));
         triW /= max(triW.x + triW.y + triW.z, 1e-4);
         vec3 triP = vObjP * uTri;
         vec3 tile = (texture2D(uSide, triP.zy).rgb * triW.x
                    + texture2D(uSide, triP.xz).rgb * triW.y
                    + texture2D(uSide, triP.xy).rgb * triW.z) / max(uSideMean, vec3(0.02));
         vec3 flank = texture2D(uBody, vMapUv).rgb * clamp(tile, 0.68, 1.42);
         vec3 shot = diffuseColor.rgb * mix(vec3(1.0), clamp(tile, 0.86, 1.16), uFront);
         diffuseColor.rgb = mix(flank, shot, facing) * (1.0 - uEdgeAO * (1.0 - vEdge));`,
      )
      /* Le pincement du contour n'est pas une surface : c'est l'arête où les
         deux nappes se rejoignent. Vue par la tranche, elle prenait la lumière
         des panneaux et traçait un fil blanc tout le long du sac. On l'y rend
         mate, sourde et sans relief — comme une couture serrée. */
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         float seam = smoothstep(0.02, 0.32, vEdge);
         roughnessFactor = mix(1.0, roughnessFactor, seam);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
         metalnessFactor *= smoothstep(0.02, 0.32, vEdge);`,
      )
      /* Le relief suit le même partage. Projeté depuis les trois faces du sac,
         il garde son échelle en contournant le bord — là où la carte à plat
         n'avait que deux pixels à étirer sur tout un quart de tour. */
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         vec3 weft = texture2D(normalMap, triP.zy).xyz * triW.x
                   + texture2D(normalMap, triP.xz).xyz * triW.y
                   + texture2D(normalMap, triP.xy).xyz * triW.z;
         weft = weft * 2.0 - 1.0;
         weft.xy *= normalScale;
         normal = normalize(mix(normalize(tbn * weft), normal, facing));
         normal = normalize(mix(nonPerturbedNormal, normal, seam));`,
      )
      .replace(
        '#include <opaque_fragment>',
        `float halo = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0);
         outgoingLight += uGlow * halo * mix(vec3(1.0), diffuseColor.rgb, 0.65);
         // Un rien d'ombre sur la couture : la matière s'y pince, elle s'y assourdit.
         outgoingLight *= mix(0.62, 1.0, smoothstep(0.0, 0.16, vEdge));
         #include <opaque_fragment>`,
      )
  }

  const bag = new THREE.Mesh(geometry, material)
  const pivot = new THREE.Group()
  pivot.add(bag)
  scene.add(pivot)

  const box = geometry.boundingBox!
  bag.position.sub(box.getCenter(new THREE.Vector3()))
  const span = box.getSize(new THREE.Vector3())
  const norm = 2 / Math.max(span.x, span.y)
  pivot.scale.setScalar(norm)

  /* Encombrement réel sur un tour complet, mesuré axe par axe plutôt qu'en
     sphère : la pièce ne tourne qu'autour de la verticale, et s'incline à
     peine. En largeur elle balaie donc sa diagonale, en hauteur elle ne
     bouge presque pas — la sphère englobante réservait pour rien un tiers
     du cadre, et le sac flottait au milieu du vide. */
  const TILT = 0.3
  const halfW = (Math.hypot(span.x, span.z) / 2) * norm
  const halfH = ((span.y * Math.cos(TILT) + span.z * Math.sin(TILT)) / 2) * norm

  const target = { x: 0, y: 0 }
  const now = { x: 0, y: 0 }
  let raf = 0

  const draw = () => renderer.render(scene, camera)
  const frame = () => {
    raf = requestAnimationFrame(frame)
    now.x += (target.x - now.x) * 0.08
    now.y += (target.y - now.y) * 0.08
    pivot.rotation.y = now.x
    pivot.rotation.x = now.y
    draw()
  }

  /* Une seule course pour trois réglages qui vont toujours ensemble : la
     quantité de lumière, la part de reflet, et l'éclat sur les bords. À
     mi-course, c'est l'éclairage d'origine — celui qui rend la photo. */
  const setLight = (t: number) => {
    const v = Math.min(1, Math.max(0, t))
    const k = 0.55 + 0.9 * v
    fill.intensity = AMBIENT * k
    scene.environmentIntensity = ENV_LIGHT * k
    material.envMapIntensity = spec.env * (0.4 + 1.2 * v)
    if (uniforms) uniforms.uGlow.value = Math.max(0, v - 0.34) * spec.glow
    if (opts.still) draw()
  }

  const resize = () => {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const half = Math.tan((camera.fov / 2) * (Math.PI / 180))
    // Une marge de rien du tout : le sac tient le cadre.
    camera.position.z = Math.max((halfH * 1.04) / half, (halfW * 1.04) / (half * camera.aspect))
    camera.updateProjectionMatrix()
    draw()
  }

  resize()
  // Première image : les uniformes n'existent qu'une fois le programme compilé.
  draw()
  setLight(opts.light ?? 0.5)
  if (!opts.still) frame()

  return {
    backdrop: field.backdrop,
    setLight,
    point: (nx, ny) => {
      // Tour complet : d'un bord à l'autre de la page, le sac fait ses 360°.
      target.x = nx * Math.PI
      target.y = ny * 0.3
      if (opts.still) {
        pivot.rotation.set(target.y, target.x, 0)
        draw()
      }
    },
    resize,
    dispose: () => {
      cancelAnimationFrame(raf)
      geometry.dispose()
      material.dispose()
      map.dispose()
      body.dispose()
      normalMap.dispose()
      grain.albedo.dispose()
      sky.dispose()
      env.dispose()
      renderer.dispose()
    },
  }
}
