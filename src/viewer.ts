import gsap from 'gsap'
import { q, reduced } from './dom'
import { colourOf, sizeOf, type Selection } from './products'
import { closeOverlay, openOverlay } from './overlay'

// la vue 3D du sac. la souris le fait tourner
// tout le three.js est dans viewer3d.ts, ici c'est que l'UI autour

export const viewer = q<HTMLElement>('[data-viewer]')!

let scene: import('./viewer3d').ViewerHandle | null = null
// token pcq le chargement est async : si on ferme avant la fin faut pas
// afficher la scene qui arrive apres
let sceneToken = 0

// ou on vise. x = rotation, y = inclinaison. les 2 vont de -1 a 1
// on le garde ici pcq souris et doigt le calculent pas pareil (la souris ecrase
// la valeur, le doigt ajoute a partir de la derniere) dc faut un endroit commun
const aim = { x: 0, y: 0 }

function aimAt(x: number, y: number): void {
  aim.x = x
  // on clamp que le y. le x peut tourner a l'infini
  aim.y = Math.min(1, Math.max(-1, y))
  scene?.point(aim.x, aim.y)
}

// on passe la selection en param plutot que d'aller la chercher dans product.ts
// comme ca le viewer depend pas de la fiche
export async function openViewer(sel: Selection): Promise<void> {
  const { p, colour, size } = sel
  const c = colourOf(p, colour)
  const token = ++sceneToken
  aim.x = 0
  aim.y = 0

  viewer.innerHTML = `
    <div class="viewer__scrim" data-close-viewer></div>
    <div class="viewer__panel" role="dialog" aria-modal="true"
         aria-label="Aperçu 3D — ${p.name}, ${c.name}">
      <div class="viewer__top">
        <p class="label">Aperçu 3D — ${p.name} · ${c.name}</p>
        <button class="linklike" type="button" data-close-viewer>Fermer</button>
      </div>
      <div class="viewer__stage" data-viewer-stage
           data-cursor="drag" data-cursor-label="Rotation">
        <canvas data-viewer-canvas></canvas>
        <p class="viewer__wait" data-viewer-wait>Reconstruction de la matière…</p>
        <div class="lume" data-lume hidden>
          <span class="lume__cap">Lumière</span>
          <div class="lume__track" data-lume-track role="slider" tabindex="0"
               data-cursor="drag" data-cursor-label="Lumière"
               aria-label="Lumière, reflet et éclat du sac" aria-orientation="vertical"
               aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
            <span class="lume__fill" data-lume-fill></span>
            <span class="lume__knob" data-lume-knob></span>
          </div>
          <span class="lume__val" data-lume-val>50</span>
        </div>
      </div>
      <div class="viewer__foot">
        <span class="viewer__hint">
          <span class="viewer__hint--fine">Balayez la page à la souris pour tourner le sac</span>
          <span class="viewer__hint--coarse">Glissez le doigt pour tourner</span>
        </span>
        <span class="viewer__count">${c.name}</span>
      </div>
    </div>`

  openOverlay(viewer)
  wireTurn()
  if (!reduced) {
    gsap.from(q('.viewer__panel', viewer), { y: 18, duration: 0.5, ease: 'power3.out' })
  }

  const canvas = q<HTMLCanvasElement>('[data-viewer-canvas]', viewer)
  if (!canvas) return

  try {
    const { mountViewer } = await import('./viewer3d')
    if (token !== sceneToken) return
    scene = await mountViewer(canvas, {
      shape: p.shape,
      image: c.image,
      dims: sizeOf(p, size).dims,
      still: reduced,
      light: lightLevel,
    })
    if (token !== sceneToken) return dropScene()
    q<HTMLElement>('[data-viewer-wait]', viewer)?.remove()
    // on reprend la couleur de fond de la photo pour que ca se voie pas
    q<HTMLElement>('[data-viewer-stage]', viewer)?.style.setProperty('background', scene.backdrop)
    canvas.classList.add('is-ready')
    wireLume()
  } catch {
    // pas de webgl ou texture ko = on affiche juste la photo
    if (token !== sceneToken) return
    const stage = q<HTMLElement>('[data-viewer-stage]', viewer)
    if (stage) stage.innerHTML = `<img class="viewer__still" src="${c.image}" alt="${p.name} — ${c.name}" />`
  }
}

function dropScene(): void {
  scene?.dispose()
  scene = null
}

// --- le slider de lumiere ---
// un seul slider qui pilote la lumiere + les reflets + le contour
// la valeur est en dehors de openViewer dc elle est gardee entre 2 ouvertures

let lightLevel = 0.5
let lightDrag = false

function paintLume(): void {
  const pct = `${Math.round(lightLevel * 100)}%`
  q<HTMLElement>('[data-lume-fill]', viewer)?.style.setProperty('height', pct)
  q<HTMLElement>('[data-lume-knob]', viewer)?.style.setProperty('bottom', pct)
  const val = q<HTMLElement>('[data-lume-val]', viewer)
  if (val) val.textContent = String(Math.round(lightLevel * 100))
  q<HTMLElement>('[data-lume-track]', viewer)?.setAttribute(
    'aria-valuenow',
    String(Math.round(lightLevel * 100)),
  )
}

function setLight(v: number): void {
  lightLevel = Math.min(1, Math.max(0, v))
  scene?.setLight(lightLevel)
  paintLume()
}

// a appeler QUE qd la scene est prete, sinon le slider pilote rien
function wireLume(): void {
  const lume = q<HTMLElement>('[data-lume]', viewer)
  const track = q<HTMLElement>('[data-lume-track]', viewer)
  if (!lume || !track) return
  lume.hidden = false
  paintLume()

  // le 1- pcq en css le y part du haut mais nous on veut 1 en haut
  const from = (clientY: number) => {
    const r = track.getBoundingClientRect()
    setLight(1 - (clientY - r.top) / (r.height || 1))
  }

  track.addEventListener('pointerdown', (e) => {
    lightDrag = true
    track.setPointerCapture(e.pointerId)
    track.focus()
    from(e.clientY)
    e.preventDefault()
  })
  track.addEventListener('pointermove', (e) => {
    if (lightDrag) from(e.clientY)
  })
  const drop = (e: PointerEvent) => {
    lightDrag = false
    if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId)
  }
  track.addEventListener('pointerup', drop)
  track.addEventListener('pointercancel', drop)

  track.addEventListener('keydown', (e) => {
    const step =
      e.key === 'ArrowUp' || e.key === 'ArrowRight'
        ? 0.05
        : e.key === 'ArrowDown' || e.key === 'ArrowLeft'
          ? -0.05
          : e.key === 'PageUp'
            ? 0.2
            : e.key === 'PageDown'
              ? -0.2
              : 0
    if (step) {
      setLight(lightLevel + step)
      e.preventDefault()
      return
    }
    if (e.key === 'Home' || e.key === 'End') {
      setLight(e.key === 'Home' ? 1 : 0)
      e.preventDefault()
    }
  })
}

// souris uniquement
// au doigt on peut pas faire ca : le pointermove arrive qu'une fois qu'on touche
// dc le sac ferait un demi tour d'un coup des qu'on pose le pouce sur le bord
// pour le tactile c'est en relatif, voir plus bas
window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return
  if (viewer.hidden || !scene || lightDrag) return
  aimAt((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
})

// --- rotation au doigt ---
// en relatif : on memorise la visee au pointerdown et on ajoute le delta
// la largeur du cadre = un tour complet (meme ratio qu'a la souris mais
// ramene a la taille du cadre au lieu de la page)

let turnId: number | null = null
const grip = { x: 0, y: 0, aimX: 0, aimY: 0 }

function wireTurn(): void {
  const stage = q<HTMLElement>('[data-viewer-stage]', viewer)
  if (!stage) return

  stage.addEventListener('pointerdown', (e) => {
    // la souris est deja geree au dessus, et on touche pas si on est sur le slider
    if (e.pointerType === 'mouse') return
    if ((e.target as Element).closest('[data-lume]')) return
    turnId = e.pointerId
    stage.setPointerCapture(e.pointerId)
    grip.x = e.clientX
    grip.y = e.clientY
    grip.aimX = aim.x
    grip.aimY = aim.y
    e.preventDefault()
  })

  stage.addEventListener('pointermove', (e) => {
    if (e.pointerId !== turnId) return
    const r = stage.getBoundingClientRect()
    aimAt(
      grip.aimX + ((e.clientX - grip.x) / (r.width || 1)) * 2,
      grip.aimY + ((e.clientY - grip.y) / (r.height || 1)) * 2,
    )
    e.preventDefault()
  })

  const drop = (e: PointerEvent) => {
    if (e.pointerId !== turnId) return
    turnId = null
    if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId)
  }
  stage.addEventListener('pointerup', drop)
  stage.addEventListener('pointercancel', drop)
}

window.addEventListener('resize', () => scene?.resize())

// faut bien dispose() sinon le canvas continue de tourner en fond
export function closeViewer(): void {
  sceneToken++
  lightDrag = false
  turnId = null
  dropScene()
  closeOverlay(viewer)
  viewer.innerHTML = ''
}
