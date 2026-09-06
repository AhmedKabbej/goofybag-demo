import gsap from 'gsap'
import { q, reduced } from './dom'

/* -------------------------------------------------------------------------
   Le seuil — la carte est lue avant que la caisse ne s'ouvre

   Le panneau de la caisse lui passe sa racine et ce qu'il faut faire une fois
   la carte remise : le seuil n'a pas à connaître la suite.
   ---------------------------------------------------------------------- */

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

  /* La carte ne quitte jamais sa case dans le formulaire : on la déplace à
     vue, par un décalage mesuré vers le cadre du seuil. Sa place reste donc
     tenue en dessous, et le retour n'est qu'un décalage ramené à zéro — pas
     de saut de mise en page, pas de seconde carte.

     Tout se mesure ici, une fois pour toutes. Lire la géométrie du document
     pendant que les choses bougent oblige le navigateur à tout recalculer sur
     le champ, au milieu de l'image en cours : c'était là, et nulle part
     ailleurs, que le mouvement accrochait. */
  const stageBox = stage.getBoundingClientRect()
  const home = card.getBoundingClientRect()
  const slotBox = slot.getBoundingClientRect()
  const homeAt = { x: home.left + home.width / 2, y: home.top + home.height / 2 }
  const slotAt = { x: slotBox.left + slotBox.width / 2, y: slotBox.top + slotBox.height / 2 }

  /* La case porte la perspective : le point de fuite doit donc suivre la carte,
     sans quoi elle se verrait de trois quarts au milieu de l'écran. */
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

  /* Le raccourci est branché plus bas, quand la marche existe ; il est déclaré
     ici parce que les gestes de la main, eux, sont posés avant. */
  let skip = () => {}

  /* Tout le mouvement de la carte tient dans une seule boucle, et une seule
     écriture par image. C'est la condition de la fluidité : à plusieurs
     animations concurrentes sur le même objet — la dérive, le survol, la
     prise en main, la respiration — chacune réécrivait la position de son
     côté et l'image sautait. Ici la boucle est seule à décider ; les tweens ne
     touchent qu'à ce qu'elle ne touche pas (l'opacité, le décalage, l'échelle). */
  const yaw = gsap.quickSetter(card, 'rotationY', 'deg')
  const pitch = gsap.quickSetter(card, 'rotationX', 'deg')
  const lift = gsap.quickSetter(card, 'yPercent')
  const deep = gsap.quickSetter(card, 'z', 'px')
  const glowX = gsap.quickSetter(card, '--mx')
  const glowY = gsap.quickSetter(card, '--my')

  const turn = {
    /** Angle courant et vitesse résiduelle, en degrés. */
    y: -22,
    spin: 0,
    /** Inclinaison, et sa cible : le survol la vise, la boucle l'y amène. */
    x: -24,
    aimX: 0,
    /** Décalage de lacet donné par la position du curseur, sans la prise. */
    hover: 0,
    aimHover: 0,
    /** Avancée de l'entrée, de 0 à 1. */
    into: reduced ? 1 : 0,
    beat: 0,
    /** Le point chaud, en pourcentage de la carte. */
    gx: 50,
    gy: 30,
    aimGx: 50,
    aimGy: 30,
    /** Pendant un balayage, la lumière ne suit plus la main. */
    swept: false,
  }

  let grabbed = false
  let frame = 0

  const tick = () => {
    frame = requestAnimationFrame(tick)

    if (!grabbed) {
      // Dérive lente, plus ce qui reste de l'élan qu'on lui a donné.
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

    // Entrée : elle vient du fond du plateau et se pose, en une seule courbe.
    const e = 1 - Math.pow(1 - turn.into, 4)
    yaw(turn.y + turn.hover)
    pitch(turn.x)
    deep(-520 * (1 - e))
    lift(16 * (1 - e) + Math.sin(turn.beat * 1.7) * -1.6 * e)
    glowX(`${turn.gx.toFixed(1)}%`)
    glowY(`${turn.gy.toFixed(1)}%`)
  }

  /** Un trait de lumière, sans laisser la main le contrarier en chemin. */
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

    /* Deux gestes, distincts. La main qui passe incline la carte, la décale un
       peu et déplace le point de lumière. La main qui l'attrape la fait tourner
       au doigt, et la lâche avec son élan. */
    let lastX = 0
    let travel = 0

    gate.addEventListener('pointerdown', (e) => {
      // On n'attrape pas la carte depuis une commande : « Annuler » doit rester
      // cliquable, or capturer le pointeur lui volerait son clic.
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
          // Un pouce de course pour un tiers de tour : la carte suit la main.
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
      // L'élan reste dans `spin` : la boucle le dépense toute seule.
      turn.hover = turn.aimHover
    }
    gate.addEventListener('pointerup', release)
    gate.addEventListener('pointercancel', release)

    gate.addEventListener('pointerleave', () => {
      if (grabbed) return
      turn.aimX = 0
      turn.aimHover = 0
    })

    // Un clic net accélère la formalité ; un geste de rotation, non.
    gate.addEventListener('click', (e) => {
      if ((e.target as Element).closest('[data-close-pay]')) return
      if (travel < 8) skip()
    })
  }

  let handed = false
  const hand = () => {
    if (handed) return
    handed = true
    // La boucle rend la main : à partir d'ici, la carte n'obéit qu'aux tweens.
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

    /* Trois temps, dans cet ordre et sans se recouvrir.

       Le vert s'éteint d'abord : le champ de lecture s'efface et l'antenne
       reprend sa couleur pendant que la carte se redresse. La carte rejoint
       ensuite sa case — sur le plateau encore noir, donc toute la transition
       est finie avant que la caisse ne commence à paraître. Le plateau ne se
       retire qu'en dernier, découvrant un formulaire où la carte est déjà
       posée : plus rien ne bouge quand il monte. */
    const trip = { k: 0 }
    gsap
      .timeline({ onComplete: land })
      // 1. tout ce qui est vert s'éteint — le cadre et la coche — et la carte
      //    se met d'aplomb pendant ce temps
      .to(
        [q('.gate__trace', pay), q('.gate__foot', pay)],
        { opacity: 0, duration: 0.3, ease: 'power2.in' },
        0.05,
      )
      .to(card, { rotationY: 0, rotationX: 0, yPercent: 0, z: 0, duration: 0.42, ease: 'power2.inOut' }, 0)
      .add(() => card.classList.add('is-flying'), 0)
      // 2. la carte gagne sa place, et le point de fuite avec elle
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
      // 3. et seulement alors, le plateau se retire
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

  /* Le dénouement. Le trait qui cerne la carte se referme, tout passe au vert,
     et le compte cède la place à une coche qui se dessine — la figure d'un
     paiement accepté, tenue en deux traits. */
  const accept = () => {
    /* Le dénouement se regarde : même si l'on a pressé le pas, la lecture
       reprend ici sa vitesse normale. C'est le seul moment de la séquence
       qu'on ne doit pas pouvoir manquer. */
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
    /* Le plateau reprend son souffle d'un cran. En opacité seulement : un
       filtre sur un aplat plein écran ferait repeindre toute la page. */
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
          // Le texte n'est réécrit qu'au changement d'entier : sinon c'est une
          // remise en page par image, pour un chiffre qui n'a pas bougé.
          const n = Math.round(march.v)
          if (n !== ticked) {
            ticked = n
            count.textContent = String(n).padStart(2, '0')
          }
          const i = Math.min(GATE_STEPS.length - 1, Math.floor(march.v / 27))
          if (step.textContent !== GATE_STEPS[i]) {
            step.textContent = GATE_STEPS[i]
            gsap.fromTo(step, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35 })
            /* Une lumière à deux paliers seulement, et courte : à chacun des
               quatre, les balayages se chevauchaient et la carte clignotait. */
            if (i === 1 || i === 2) flash(0.55)
          }
        },
      },
      0,
    )
    .add(accept)
    /* La coche met six dixièmes à se dessiner ; on la laisse ensuite exister
       une bonne seconde de plus. Trop courte, la pose et l'on ne voyait plus
       le vert du tout — c'est pourtant la seule récompense de l'attente. */
    .to({}, { duration: 1.7 })

  // Un clic net presse le pas — sans rien couper, tout se joue plus vite.
  skip = () => {
    if (run.timeScale() < 4) gsap.to(run, { timeScale: 4.5, duration: 0.3, ease: 'power2.in' })
  }
}
