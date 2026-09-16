import gsap from 'gsap'
import { q, reduced } from './dom'

// l'ecran de "lecture de la carte" avant le formulaire de paiement
// pay.ts nous passe sa racine + un callback onDone, on sait pas ce qui vient apres

const GATE_STEPS = [
  'Ouverture du canal',
  'Chiffrement de la session',
  'Vérification du terminal',
  'Prêt',
]

export function runGate(pay: HTMLElement, onDone: () => void): void {
  const gate = q<HTMLElement>('[data-pay-gate]', pay)
  const slot = q<HTMLElement>('[data-gate-stage]', pay)
  const stage = q<HTMLElement>('[data-pay-stage]', pay)
  const card = q<HTMLElement>('[data-ccard]', pay)
  if (!gate || !slot || !stage || !card) return onDone()

  // la carte reste dans le DOM du form, on la deplace juste avec un translate
  // du coup sa place est gardee en dessous et pour revenir on remet x/y a 0
  // pas de saut de layout et pas 2 cartes a synchroniser
  //
  // on mesure TOUT ici une bonne fois. si on lit le layout pdt que ca bouge le
  // navigateur recalcule tout au milieu de la frame = ca saccade
  const stageBox = stage.getBoundingClientRect()
  const home = card.getBoundingClientRect()
  const slotBox = slot.getBoundingClientRect()
  const homeAt = { x: home.left + home.width / 2, y: home.top + home.height / 2 }
  const slotAt = { x: slotBox.left + slotBox.width / 2, y: slotBox.top + slotBox.height / 2 }

  // la perspective est sur le parent dc le point de fuite doit suivre la carte
  // sinon elle est vue de 3/4 qd elle est au milieu de l'ecran
  const eye = { x: slotAt.x - stageBox.left, y: slotAt.y - stageBox.top }
  const aimEye = () => {
    stage.style.perspectiveOrigin = `${eye.x.toFixed(1)}px ${eye.y.toFixed(1)}px`
  }
  aimEye()

  card.classList.add('is-gate')
  stage.classList.add('is-gate')
  gsap.set(card, {
    x: slotAt.x - homeAt.x,
    y: slotAt.y - homeAt.y,
    scale: slotBox.width / home.width,
  })

  // defini plus bas (faut la timeline) mais declare ici pcq les listeners
  // sont poses avant
  let skip = () => {}

  // TOUT le mouvement passe par un seul rAF et une seule ecriture par frame
  // avant javais 4 anims gsap en //  (rotation auto, survol, drag, respiration)
  // et elles s'ecrasaient entre elles = ca sautait
  // mtn la boucle est seule a toucher rotation/z/yPercent, les tweens touchent
  // que le reste (opacity, x, y, scale)
  const yaw = gsap.quickSetter(card, 'rotationY', 'deg')
  const pitch = gsap.quickSetter(card, 'rotationX', 'deg')
  const lift = gsap.quickSetter(card, 'yPercent')
  const deep = gsap.quickSetter(card, 'z', 'px')
  const glowX = gsap.quickSetter(card, '--mx')
  const glowY = gsap.quickSetter(card, '--my')

  const turn = {
    /** angle actuel + ce qui reste d'elan apres un drag */
    y: -22,
    spin: 0,
    /** inclinaison. aimX = la cible, la boucle y va en lerp */
    x: -24,
    aimX: 0,
    /** decalage donne par le survol (hors drag) */
    hover: 0,
    aimHover: 0,
    /** progression de l'entree, 0 -> 1 */
    into: reduced ? 1 : 0,
    beat: 0,
    /** position du reflet en % */
    gx: 50,
    gy: 30,
    aimGx: 50,
    aimGy: 30,
    /** pdt un flash le reflet suit plus la souris */
    swept: false,
  }

  let grabbed = false
  let frame = 0

  const tick = () => {
    frame = requestAnimationFrame(tick)

    if (!grabbed) {
      // rotation lente en continu + l'elan qui retombe petit a petit
      turn.y += 0.14 + turn.spin
      turn.spin *= 0.94
      turn.hover += (turn.aimHover - turn.hover) * 0.08
    }
    turn.x += (turn.aimX - turn.x) * 0.08
    turn.into = Math.min(1, turn.into + 0.014)
    turn.beat += 0.016

    if (!turn.swept) {
      turn.gx += (turn.aimGx - turn.gx) * 0.12
      turn.gy += (turn.aimGy - turn.gy) * 0.12
    }

    // ease out quart fait a la main pour l'entree (elle vient du fond)
    const e = 1 - Math.pow(1 - turn.into, 4)
    yaw(turn.y + turn.hover)
    pitch(turn.x)
    deep(-520 * (1 - e))
    lift(16 * (1 - e) + Math.sin(turn.beat * 1.7) * -1.6 * e)
    glowX(`${turn.gx.toFixed(1)}%`)
    glowY(`${turn.gy.toFixed(1)}%`)
  }

  // le reflet qui traverse. on coupe le suivi souris pdt ce temps la
  const flash = (seconds = 1) => {
    turn.swept = true
    turn.gy = 34
    gsap.fromTo(
      turn,
      { gx: -15 },
      {
        gx: 115,
        duration: seconds,
        ease: 'power2.inOut',
        overwrite: true,
        onComplete: () => { turn.swept = false },
      },
    )
  }

  if (!reduced) {
    gsap.set(card, { rotationY: turn.y, rotationX: turn.x })
    gsap.from(card, { opacity: 0, duration: 0.7, ease: 'power2.out' })
    tick()
    gsap.delayedCall(0.4, () => flash(1.1))

    // 2 gestes differents : le survol incline la carte + bouge le reflet,
    // le drag la fait tourner et la relache avec de l'elan
    let lastX = 0
    let travel = 0

    gate.addEventListener('pointerdown', (e) => {
      // si on part d'un bouton on drag pas, sinon le setPointerCapture
      // bouffe le clic et "annuler" marche plus
      if ((e.target as Element).closest('button, a')) return
      grabbed = true
      travel = 0
      turn.spin = 0
      lastX = e.clientX
      gate.setPointerCapture(e.pointerId)
      gate.classList.add('is-grab')
    })

    gate.addEventListener(
      'pointermove',
      (e) => {
        const nx = (e.clientX - slotBox.left) / slotBox.width - 0.5
        const ny = (e.clientY - slotBox.top) / slotBox.height - 0.5
        turn.aimGx = (nx + 0.5) * 100
        turn.aimGy = (ny + 0.5) * 100

        if (grabbed) {
          const dx = e.clientX - lastX
          lastX = e.clientX
          travel += Math.abs(dx)
          // 0.9 deg par px, trouve a l'oeil
          turn.y += dx * 0.9
          turn.spin = dx * 0.34
          return
        }
        turn.aimX = -ny * 15
        turn.aimHover = nx * 34
      },
      { passive: true },
    )

    const release = (e: PointerEvent) => {
      if (!grabbed) return
      grabbed = false
      gate.classList.remove('is-grab')
      if (gate.hasPointerCapture(e.pointerId)) gate.releasePointerCapture(e.pointerId)
      // on touche pas a spin, la boucle le fait retomber toute seule
      turn.hover = turn.aimHover
    }
    gate.addEventListener('pointerup', release)
    gate.addEventListener('pointercancel', release)

    gate.addEventListener('pointerleave', () => {
      if (grabbed) return
      turn.aimX = 0
      turn.aimHover = 0
    })

    // si on a bouge de moins de 8px c'etait un clic pas un drag -> on accelere
    gate.addEventListener('click', (e) => {
      if ((e.target as Element).closest('[data-close-pay]')) return
      if (travel < 8) skip()
    })
  }

  let handed = false
  const hand = () => {
    if (handed) return
    handed = true
    // on coupe le rAF ici, apres ca c'est gsap qui pilote la carte
    cancelAnimationFrame(frame)
    gsap.killTweensOf(turn)
    const land = () => {
      gsap.set(card, { clearProps: 'x,y,scale,rotateY,rotateX' })
      card.classList.remove('is-gate', 'is-read', 'is-flying')
      stage.classList.remove('is-gate')
      stage.style.perspectiveOrigin = ''
      gate.remove()
      onDone()
    }
    if (reduced) return land()

    // 3 temps qui se chevauchent pas :
    // 1. le vert s'eteint pdt que la carte se redresse
    // 2. la carte rejoint sa place (le fond est encore noir dc on voit rien derriere)
    // 3. le fond disparait et le form est deja en place
    const trip = { k: 0 }
    gsap
      .timeline({ onComplete: land })
      // 1
      .to(
        [q('.gate__trace', pay), q('.gate__foot', pay)],
        { opacity: 0, duration: 0.3, ease: 'power2.in' },
        0.05,
      )
      .to(card, { rotationY: 0, rotationX: 0, yPercent: 0, z: 0, duration: 0.42, ease: 'power2.inOut' }, 0)
      .add(() => card.classList.add('is-flying'), 0)
      // 2
      .to(card, { x: 0, y: 0, scale: 1, duration: 0.72, ease: 'power3.inOut' }, 0.38)
      .to(
        trip,
        {
          k: 1,
          duration: 0.72,
          ease: 'power3.inOut',
          onUpdate: () => {
            eye.x = slotAt.x + (homeAt.x - slotAt.x) * trip.k - stageBox.left
            eye.y = slotAt.y + (homeAt.y - slotAt.y) * trip.k - stageBox.top
            aimEye()
          },
        },
        0.38,
      )
      // 3
      .to(
        [q('[data-gate-bg]', pay), q('.gate__head', pay), q('.gate__stage', pay)],
        { opacity: 0, duration: 0.46, ease: 'power2.inOut' },
        1.16,
      )
  }

  const step = q<HTMLElement>('[data-gate-step]', pay)!
  const count = q<HTMLElement>('[data-gate-count]', pay)!
  const fill = q<HTMLElement>('[data-gate-fill]', pay)!

  if (reduced) {
    step.textContent = 'Liaison établie'
    count.textContent = '100'
    fill.style.transform = 'scaleX(1)'
    gate.classList.add('is-ok')
    hand()
    return
  }

  const seal = q<SVGSVGElement>('[data-gate-seal]', pay)

  // la fin : le contour se ferme, tout passe au vert et le compteur laisse
  // la place a la coche
  const accept = () => {
    // on remet timeScale a 1 meme si l'user avait accelere. c'est le seul
    // moment qu'il faut pas rater
    gsap.killTweensOf(run)
    run.timeScale(1)
    gate.classList.add('is-ok')
    card.classList.add('is-read')
    step.textContent = 'Liaison établie'
    gsap.fromTo(step, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35 })
    flash(0.9)
    gsap.to(count, { opacity: 0, y: -8, duration: 0.3, ease: 'power2.in' })
    if (seal) {
      gsap.fromTo(seal, { opacity: 0, scale: 0.72 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' })
      gsap.fromTo(
        seal.querySelector('circle'),
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' },
      )
      gsap.fromTo(
        seal.querySelector('path'),
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.32, delay: 0.28, ease: 'power2.out' },
      )
    }
    // petit flash. en opacity only, un filter sur un plein ecran repeint tout
    gsap.fromTo(
      q('[data-gate-flash]', pay),
      { opacity: 0 },
      { opacity: 0.09, duration: 0.14, yoyo: true, repeat: 1, ease: 'power2.out' },
    )
  }

  const march = { v: 0 }
  let ticked = -1
  const READ = 2.1
  const run = gsap.timeline({ onComplete: hand })
  run
    .to(fill, { scaleX: 1, duration: READ, ease: 'power1.inOut' }, 0)
    .to(
      march,
      {
        v: 100,
        duration: READ,
        ease: 'power1.inOut',
        onUpdate: () => {
          // on ecrit que si l'entier change sinon c'est un reflow par frame
          // pour un chiffre qui a pas bouge
          const n = Math.round(march.v)
          if (n !== ticked) {
            ticked = n
            count.textContent = String(n).padStart(2, '0')
          }
          const i = Math.min(GATE_STEPS.length - 1, Math.floor(march.v / 27))
          if (step.textContent !== GATE_STEPS[i]) {
            step.textContent = GATE_STEPS[i]
            gsap.fromTo(step, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35 })
            // flash que sur 2 etapes sur 4. avec les 4 ils se chevauchaient
            // et la carte clignotait
            if (i === 1 || i === 2) flash(0.55)
          }
        },
      },
      0,
    )
    .add(accept)
    // 1.7s : 0.6 pour dessiner la coche + ~1s pour la laisser affichee
    // en dessous on voit meme pas le vert passer
    .to({}, { duration: 1.7 })

  // on coupe rien, on accelere juste la timeline
  skip = () => {
    if (run.timeScale() < 4) gsap.to(run, { timeScale: 4.5, duration: 0.3, ease: 'power2.in' })
  }
}
