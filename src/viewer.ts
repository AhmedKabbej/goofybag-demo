import gsap from 'gsap'
import { q, reduced } from './dom'
import { colourOf, sizeOf, type Selection } from './products'
import { closeOverlay, openOverlay } from './overlay'

/* -------------------------------------------------------------------------
   Aperçu 3D — la pièce est reconstruite, la souris la fait tourner
   ---------------------------------------------------------------------- */

export const viewer = q<HTMLElement>('[data-viewer]')!

let scene: import('./viewer3d').ViewerHandle | null = null
/** Jeton d'ouverture : une fiche fermée pendant le chargement n'affiche rien. */
let sceneToken = 0

/* La visée courante, dans les unités de `point` : l'abscisse fait le tour,
   l'ordonnée incline. On la tient ici parce que les deux gestes ne la
   fabriquent pas de la même façon — la souris l'écrit d'un coup, le doigt y
   ajoute sa course — et qu'il faut bien un endroit où l'un reprenne l'autre. */
const aim = { x: 0, y: 0 }

function aimAt(x: number, y: number): void {
  aim.x = x
  // Le tour est libre ; l'inclinaison, elle, se retient à ses butées.
  aim.y = Math.min(1, Math.max(-1, y))
  scene?.point(aim.x, aim.y)
}

/* La sélection lui est passée : l'aperçu n'a pas à savoir qu'une fiche produit
   existe, ni à aller y lire quoi que ce soit. */
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
    // La découpe se pose sur le même fond que la prise de vue.
    q<HTMLElement>('[data-viewer-stage]', viewer)?.style.setProperty('background', scene.backdrop)
    canvas.classList.add('is-ready')
    wireLume()
  } catch {
    // Sans WebGL — ou si la matière n'a pas pu être lue — on montre la photo.
    if (token !== sceneToken) return
    const stage = q<HTMLElement>('[data-viewer-stage]', viewer)
    if (stage) stage.innerHTML = `<img class="viewer__still" src="${c.image}" alt="${p.name} — ${c.name}" />`
  }
}

function dropScene(): void {
  scene?.dispose()
  scene = null
}

/* --- réglage de lumière ------------------------------------------------------
   Une seule course, à monter ou descendre : elle porte ensemble la lumière,
   la part de reflet et l'éclat des bords. Le réglage suit d'une pièce à
   l'autre — on ne le refait pas à chaque ouverture.
   ------------------------------------------------------------------------ */

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

/** Branche la course une fois la scène montée : avant, elle ne pilote rien. */
function wireLume(): void {
  const lume = q<HTMLElement>('[data-lume]', viewer)
  const track = q<HTMLElement>('[data-lume-track]', viewer)
  if (!lume || !track) return
  lume.hidden = false
  paintLume()

  // Le haut de la course vaut 1, le bas 0 : on fait monter la lumière.
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

/* L'abscisse du curseur balaie la rotation, l'ordonnée l'incline un peu.

   À la souris seulement : au doigt, un `pointermove` ne se produit qu'en
   cours de geste, et le sac sauterait à l'endroit touché dès le premier
   contact — un pouce posé au bord ferait faire un demi-tour à la pièce avant
   d'avoir bougé d'un pixel. La rotation au doigt est relative, plus bas. */
window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return
  if (viewer.hidden || !scene || lightDrag) return
  aimAt((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
})

/* --- rotation au doigt ----------------------------------------------------
   Le geste est relatif : on retient la visée qu'avait le sac au moment où le
   doigt s'est posé, et l'on y ajoute la course parcourue depuis. La largeur
   du cadre vaut un tour complet, sa hauteur toute l'inclinaison — la même
   échelle qu'à la souris, ramenée du format de la page à celui du cadre.
   ------------------------------------------------------------------------ */

let turnId: number | null = null
const grip = { x: 0, y: 0, aimX: 0, aimY: 0 }

function wireTurn(): void {
  const stage = q<HTMLElement>('[data-viewer-stage]', viewer)
  if (!stage) return

  stage.addEventListener('pointerdown', (e) => {
    // La souris a déjà la page entière ; la course de lumière a la sienne.
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

/** Ferme l'aperçu et libère la scène : rien ne tourne en arrière-plan. */
export function closeViewer(): void {
  sceneToken++
  lightDrag = false
  turnId = null
  dropScene()
  closeOverlay(viewer)
  viewer.innerHTML = ''
}
