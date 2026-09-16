import gsap from 'gsap'
import { euro, q, qq, reduced } from './dom'
import { colourOf, find, linePrice } from './products'
import { cart, renderCart } from './cart'
import { closeOverlay, openOverlay } from './overlay'
import { cardLength, digitsOf, groupDigits, kindOf, maskedNumber, NEUTRAL } from './card'
import { runGate } from './gate'

// le checkout avec la carte 3D qui se remplit en meme temps qu'on tape
// rien n'est envoye nulle part, c'est une demo (c'est ecrit au dessus du form)
// le reseau (visa/mc/amex) est devine avec les 1ers chiffres -> voir card.ts
// la carte se retourne qd on va dans le champ cryptogramme

export const pay = q<HTMLElement>('[data-pay]')!

// le reflet qui traverse la carte
function sweep(card: HTMLElement, seconds = 1.1): void {
  if (reduced) return
  gsap.fromTo(
    card,
    { '--mx': '-15%', '--my': '32%' },
    { '--mx': '115%', duration: seconds, ease: 'power2.inOut' },
  )
}

const payTotal = () =>
  Array.from(cart.values()).reduce((n, line) => {
    const p = find(line.slug)
    return p ? n + linePrice(p, line.size) * line.qty : n
  }, 0)

function payMarkup(total: number): string {
  const count = Array.from(cart.values()).reduce((n, l) => n + l.qty, 0)
  const lines = Array.from(cart.values()).flatMap((line) => {
    const p = find(line.slug)
    return p ? [{ line, p }] : []
  })
  return `
    <div class="pay__scrim" data-close-pay></div>
    <div class="pay__panel" role="dialog" aria-modal="true" aria-label="Paiement — démonstration">
      <div class="pay__top">
        <p class="label">Paiement · Démonstration</p>
        <button class="linklike" type="button" data-close-pay>Fermer</button>
      </div>

      <div class="pay__body">
        <div class="pay__aside">
        <div class="pay__stage" data-pay-stage>
          <div class="ccard" data-ccard>
            <div class="ccard__face ccard__face--front">
              <div class="ccard__sheen"></div>
              <div class="ccard__row">
                <span class="ccard__house">GoofyBag</span>
                <span class="ccard__id">
                  <svg class="ccard__ok" viewBox="0 0 16 16" aria-hidden="true">
                    <circle cx="8" cy="8" r="7" />
                    <path d="M4.6 8.3 6.9 10.6 11.4 5.6" />
                  </svg>
                  <span class="ccard__net" data-ccard-net></span>
                </span>
              </div>
              <div class="ccard__row ccard__row--mid">
                <svg class="ccard__chip" viewBox="0 0 44 34" aria-hidden="true">
                  <rect x="1" y="1" width="42" height="32" rx="5.5" />
                  <path d="M1 11.5h13M1 22.5h13M30 11.5h13M30 22.5h13M14 1v32M30 1v32M14 17h16" />
                </svg>
                <svg class="ccard__wave" viewBox="0 0 18 24" aria-hidden="true">
                  <path d="M2.5 3.5a13.5 13.5 0 0 1 0 17M7.6 6.6a8 8 0 0 1 0 10.8M12.7 9.8a3.4 3.4 0 0 1 0 4.4" />
                </svg>
                <span class="ccard__code" data-ccard-front-code hidden></span>
              </div>
              <p class="ccard__num" data-ccard-num></p>
              <div class="ccard__row ccard__row--foot">
                <div>
                  <span class="ccard__cap">Titulaire</span>
                  <p class="ccard__val" data-ccard-name>NOM PRÉNOM</p>
                </div>
                <div>
                  <span class="ccard__cap">Expire fin</span>
                  <p class="ccard__val" data-ccard-exp>MM/AA</p>
                </div>
              </div>
            </div>

            <div class="ccard__face ccard__face--back">
              <div class="ccard__sheen"></div>
              <div class="ccard__band"></div>
              <div class="ccard__sign">
                <span class="ccard__scribble"></span>
                <span class="ccard__cvc" data-ccard-cvc>•••</span>
              </div>
              <p class="ccard__fine">
                Carte de démonstration. Sans valeur, sans émetteur, sans provision.
              </p>
            </div>
          </div>
        </div>

          <ul class="pay__items">
            ${lines
              .map(
                ({ line, p }) => `
              <li class="pay__item">
                <span class="pay__item-media"><img src="${colourOf(p, line.colour).image}" alt="" /></span>
                <span class="pay__item-txt">
                  <span class="pay__item-name">${p.name}</span>
                  <span class="pay__item-meta">${line.colour} · ${line.size}${line.qty > 1 ? ` · ×${line.qty}` : ''}</span>
                </span>
                <span class="pay__item-price">${euro.format(linePrice(p, line.size) * line.qty)}</span>
              </li>`,
              )
              .join('')}
          </ul>
        </div>

        <form class="pay__form" data-pay-form novalidate autocomplete="off">
          <p class="pay__warn">
            Rien n'est encaissé et rien ne quitte cette page : ce tunnel est une
            maquette. N'entrez pas les chiffres d'une vraie carte —
            <button type="button" class="linklike" data-pay-demo>remplir un exemple</button>.
          </p>

          <label class="field" data-field="num">
            <span class="field__cap">Numéro de carte</span>
            <input data-pay-num type="text" inputmode="numeric" maxlength="24"
                   placeholder="0000 0000 0000 0000" aria-describedby="pay-err-num" />
            <span class="field__err" id="pay-err-num" data-err="num"></span>
          </label>

          <label class="field" data-field="name">
            <span class="field__cap">Titulaire</span>
            <input data-pay-name type="text" maxlength="26" placeholder="Prénom Nom"
                   aria-describedby="pay-err-name" />
            <span class="field__err" id="pay-err-name" data-err="name"></span>
          </label>

          <div class="pay__pair">
            <label class="field" data-field="exp">
              <span class="field__cap">Expiration</span>
              <input data-pay-exp type="text" inputmode="numeric" maxlength="5"
                     placeholder="MM/AA" aria-describedby="pay-err-exp" />
              <span class="field__err" id="pay-err-exp" data-err="exp"></span>
            </label>

            <label class="field" data-field="cvc">
              <span class="field__cap" data-cvc-cap>Cryptogramme</span>
              <input data-pay-cvc type="text" inputmode="numeric" maxlength="4"
                     placeholder="000" aria-describedby="pay-err-cvc" />
              <span class="field__err" id="pay-err-cvc" data-err="cvc"></span>
            </label>
          </div>

          <div class="pay__sum">
            <div class="pay__line">
              <span>${count} article${count > 1 ? 's' : ''}</span><span>${euro.format(total)}</span>
            </div>
            <div class="pay__line"><span>Livraison</span><span>Offerte</span></div>
            <div class="pay__line pay__line--tot">
              <span>Total</span><span>${euro.format(total)}</span>
            </div>
          </div>

          <button class="btn btn--block pay__go" type="submit" data-pay-go>
            <span class="pay__go-fill" data-pay-fill></span>
            <span class="pay__go-label" data-pay-label>Payer ${euro.format(total)}</span>
          </button>
        </form>
      </div>

      <div class="pay__done" data-pay-done hidden>
        <svg class="done__tick" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="30" />
          <path d="M19 33.5 28.5 43 45.5 23" />
        </svg>
        <h3 class="pay__done-title">Paiement accepté</h3>
        <p class="pay__done-meta" data-pay-ref></p>
        <p class="pay__done-note">
          Démonstration : aucune somme n'a été débitée, aucune commande n'a été passée.
        </p>
        <button class="btn" type="button" data-close-pay>Revenir à la collection</button>
      </div>
    </div>

    <div class="pay__gate" data-pay-gate>
      <div class="gate__bg" data-gate-bg></div>
      <div class="gate__flash" data-gate-flash></div>
      <div class="gate__head">
        <p class="label">GoofyBag · Terminal</p>
        <button class="linklike" type="button" data-close-pay>Annuler</button>
      </div>
      <div class="gate__stage" data-gate-stage>
        <svg class="gate__trace" viewBox="0 0 100 63" preserveAspectRatio="none" aria-hidden="true">
          <path d="M.5 12V.5H11 M89 .5H99.5V12 M99.5 51V62.5H89 M11 62.5H.5V51" />
        </svg>
      </div>
      <div class="gate__foot">
        <div class="gate__meter">
          <p class="gate__step" data-gate-step>Ouverture du canal</p>
          <div class="gate__rule"><span data-gate-fill></span></div>
          <div class="gate__tally">
            <p class="gate__count" data-gate-count>00</p>
            <svg class="gate__seal" data-gate-seal viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10.4" pathLength="1" />
              <path d="M7 12.4 10.4 15.8 17.2 8.8" pathLength="1" />
            </svg>
          </div>
        </div>
        <p class="gate__note">
          Démonstration. Rien n'est débité, rien n'est transmis — le terminal
          n'existe pas. <span data-gate-skip>Attrapez la carte pour la tourner,
          cliquez pour accélérer.</span>
        </p>
        <p class="gate__by"><span></span>Powered by GoofyBag<span></span></p>
      </div>
    </div>`
}

// avant le form ya un ecran de chargement ou la carte est en grand (gate.ts)
// c'est le MEME element qui se deplace ensuite en haut du form, pas 2 cartes
// le form est reconstruit a chaque ouverture
export function openPay(): void {
  const total = payTotal()
  if (total <= 0) return

  pay.innerHTML = payMarkup(total)
  openOverlay(pay)
  wirePay()
  runGate(pay, () => {
    if (!reduced) {
      gsap.from(qq('.pay__form > *', pay), {
        y: 18,
        opacity: 0,
        duration: 0.6,
        stagger: 0.06,
        ease: 'power3.out',
      })
      gsap.from(q('.pay__top', pay), { opacity: 0, duration: 0.5, ease: 'power2.out' })
    }
    q<HTMLInputElement>('[data-pay-num]', pay)?.focus({ preventScroll: true })
  })
}

export function closePay(): void {
  closeOverlay(pay)
  pay.innerHTML = ''
}

function wirePay(): void {
  const stage = q<HTMLElement>('[data-pay-stage]', pay)!
  const card = q<HTMLElement>('[data-ccard]', pay)!
  const form = q<HTMLFormElement>('[data-pay-form]', pay)!
  const num = q<HTMLInputElement>('[data-pay-num]', pay)!
  const name = q<HTMLInputElement>('[data-pay-name]', pay)!
  const exp = q<HTMLInputElement>('[data-pay-exp]', pay)!
  const cvc = q<HTMLInputElement>('[data-pay-cvc]', pay)!

  const numOut = q<HTMLElement>('[data-ccard-num]', pay)!
  const netOut = q<HTMLElement>('[data-ccard-net]', pay)!
  const nameOut = q<HTMLElement>('[data-ccard-name]', pay)!
  const expOut = q<HTMLElement>('[data-ccard-exp]', pay)!
  const cvcOut = q<HTMLElement>('[data-ccard-cvc]', pay)!
  const frontCode = q<HTMLElement>('[data-ccard-front-code]', pay)!

  let kind = NEUTRAL
  let shown: string[] = []
  let busy = false

  // qd tout est ok la carte passe au vert. un vert sombre pas un vert fluo
  const OK_TINT = '#16291d'
  const tint = () => card.style.setProperty('--card-tint', card.classList.contains('is-ok') ? OK_TINT : kind.tint)

  // un span par chiffre et on remplace QUE ceux qui changent
  // si on refait tout l'innerHTML a chaque frappe la ligne entiere re-anime
  const paintNumber = (text: string) => {
    const chars = [...text]
    if (numOut.childElementCount !== chars.length) {
      numOut.innerHTML = chars.map(() => '<span></span>').join('')
      shown = []
    }
    chars.forEach((c, i) => {
      if (shown[i] === c) return
      const el = numOut.children[i] as HTMLElement
      el.textContent = c === ' ' ? ' ' : c
      el.classList.toggle('is-set', c !== '•' && c !== ' ')
      if (!reduced && shown.length) {
        gsap.fromTo(el, { yPercent: 55, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.3, ease: 'power3.out' })
      }
    })
    shown = chars
  }

  const syncKind = () => {
    const next = kindOf(digitsOf(num.value))
    if (next === kind) return
    kind = next
    tint()
    netOut.textContent = kind.name
    netOut.dataset.net = kind.name.toLowerCase().split(' ')[0]
    cvc.maxLength = kind.cvc
    cvc.placeholder = '0'.repeat(kind.cvc)
    num.maxLength = cardLength(kind) + kind.groups.length - 1
    const cap = q<HTMLElement>('[data-cvc-cap]', pay)
    if (cap) cap.textContent = kind.frontCode ? 'Code (face avant)' : 'Cryptogramme'
    frontCode.hidden = !kind.frontCode
    if (!reduced) gsap.fromTo(netOut, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
  }

  const paint = () => {
    syncKind()
    const digits = digitsOf(num.value).slice(0, cardLength(kind))
    num.value = groupDigits(digits, kind)
    paintNumber(maskedNumber(digits, kind))
    nameOut.textContent = name.value.trim() ? name.value.trim().toUpperCase() : 'NOM PRÉNOM'
    expOut.textContent = exp.value || 'MM/AA'
    const code = digitsOf(cvc.value) || '•'.repeat(kind.cvc)
    cvcOut.textContent = code
    frontCode.textContent = code

    const wasOk = card.classList.contains('is-ok')
    const isOk = faults().length === 0
    if (wasOk !== isOk) {
      card.classList.toggle('is-ok', isOk)
      tint()
      if (isOk && !reduced) sweep(card)
    }
  }

  num.addEventListener('input', paint)
  name.addEventListener('input', paint)
  cvc.addEventListener('input', () => {
    cvc.value = digitsOf(cvc.value).slice(0, kind.cvc)
    paint()
  })

  // la date se formate toute seule : le / s'ajoute et le mois est clampe a 12
  exp.addEventListener('input', () => {
    let d = digitsOf(exp.value).slice(0, 4)
    if (d.length === 1 && Number(d) > 1) d = `0${d}`
    if (d.length >= 2) {
      const m = Math.min(12, Math.max(1, Number(d.slice(0, 2))))
      d = String(m).padStart(2, '0') + d.slice(2)
    }
    exp.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
    paint()
  })

  // la carte s'incline avec la souris
  // quickTo (cree 1 seule fois) et pas gsap.to a chaque move sinon ca saccade
  const turnY = reduced ? null : gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' })
  const turnX = reduced ? null : gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' })
  let tilt = 0
  let flipped = false

  const aim = () => {
    if (turnY) turnY(tilt + (flipped ? 180 : 0))
    else gsap.set(card, { rotationY: flipped ? 180 : 0 })
  }

  // le flip est fait en js et pas avec une classe css
  // pcq le survol ecrit deja rotationY en inline dc le css passerait jamais
  // (resultat la carte se retournait qu'au 1er mouvement de souris)
  const face = (back: boolean) => {
    if (busy) return
    flipped = back && !kind.frontCode
    card.classList.toggle('is-back', flipped)
    aim()
  }
  cvc.addEventListener('focus', () => face(true))
  cvc.addEventListener('blur', () => face(false))

  if (!reduced) {
    // on mesure au pointerenter et au resize, surtout pas a chaque move
    // (getBoundingClientRect pdt une anim = reflow a chaque frame)
    let box = stage.getBoundingClientRect()
    const remeasure = () => { box = stage.getBoundingClientRect() }
    stage.addEventListener('pointerenter', remeasure)
    window.addEventListener('resize', remeasure)

    stage.addEventListener(
      'pointermove',
      (e) => {
        const nx = (e.clientX - box.left) / box.width - 0.5
        const ny = (e.clientY - box.top) / box.height - 0.5
        card.style.setProperty('--mx', `${(nx + 0.5) * 100}%`)
        card.style.setProperty('--my', `${(ny + 0.5) * 100}%`)
        tilt = nx * 24
        aim()
        turnX?.(-ny * 15)
      },
      { passive: true },
    )
    stage.addEventListener('pointerleave', () => {
      card.style.setProperty('--mx', '50%')
      card.style.setProperty('--my', '30%')
      tilt = 0
      aim()
      turnX?.(0)
    })
  }

  // cartes de test. a chaque clic on passe a la suivante pour voir les 3 reseaux
  const SAMPLES = [
    { num: '4242 4242 4242 4242', name: 'Camille Dubreuil', exp: '04/29', cvc: '123' },
    { num: '5555 5555 5555 4444', name: 'Inès Fabre', exp: '11/28', cvc: '456' },
    { num: '3782 822463 10005', name: 'Noé Marchand', exp: '07/30', cvc: '1234' },
  ]
  let sample = -1

  q<HTMLElement>('[data-pay-demo]', pay)?.addEventListener('click', () => {
    sample = (sample + 1) % SAMPLES.length
    const s = SAMPLES[sample]
    num.value = s.num
    name.value = s.name
    exp.value = s.exp
    cvc.value = s.cvc
    paint()
    clearErrors()
  })

  // liste les erreurs sans rien afficher. sert aussi pour la couleur de la carte
  const faults = (): [string, string][] => {
    const out: [string, string][] = []
    const digits = digitsOf(num.value)
    // on check que la longueur, pas Luhn
    // c'est une demo dc faut que n'importe quels chiffres passent
    if (digits.length !== cardLength(kind)) out.push(['num', `Il faut ${cardLength(kind)} chiffres.`])
    if (name.value.trim().length < 2) out.push(['name', 'Indiquez le nom porté sur la carte.'])
    const [mm, yy] = exp.value.split('/')
    const now = new Date()
    const month = Number(mm)
    const year = 2000 + Number(yy)
    if (!mm || !yy || yy.length < 2 || month < 1 || month > 12) {
      out.push(['exp', 'Mois et année, au format MM/AA.'])
    } else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      out.push(['exp', 'Cette carte a expiré.'])
    }
    if (digitsOf(cvc.value).length !== kind.cvc) out.push(['cvc', `${kind.cvc} chiffres.`])
    return out
  }

  const setError = (key: string, msg: string) => {
    const field = q<HTMLElement>(`[data-field="${key}"]`, pay)
    const out = q<HTMLElement>(`[data-err="${key}"]`, pay)
    if (!field || !out) return
    field.classList.add('is-bad')
    out.textContent = msg
    if (!reduced) gsap.fromTo(field, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.35)' })
  }

  const clearErrors = () => {
    qq<HTMLElement>('.field', pay).forEach((f) => f.classList.remove('is-bad'))
    qq<HTMLElement>('[data-err]', pay).forEach((e) => (e.textContent = ''))
  }

  // affiche les erreurs et dit si on peut valider
  const check = (): boolean => {
    clearErrors()
    const bad = faults()
    bad.forEach(([key, msg]) => setError(key, msg))
    return bad.length === 0
  }

  // le faux paiement : reflet sur la carte + le bouton qui se remplit, puis le recu
  const settle = () => {
    const done = q<HTMLElement>('[data-pay-done]', pay)!
    const body = q<HTMLElement>('.pay__body', pay)!
    const ref = q<HTMLElement>('[data-pay-ref]', pay)!
    const amount = euro.format(payTotal())
    const stamp = `GB-${String(Date.now()).slice(-6)}`
    ref.textContent = `${amount} · Référence ${stamp}`

    body.hidden = true
    done.hidden = false
    cart.clear()
    renderCart()
    if (reduced) return
    gsap.from(done, { opacity: 0, y: 14, duration: 0.5, ease: 'power2.out' })
    gsap.fromTo(
      q('.done__tick circle', pay),
      { strokeDasharray: 190, strokeDashoffset: 190 },
      { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' },
    )
    gsap.fromTo(
      q('.done__tick path', pay),
      { strokeDasharray: 46, strokeDashoffset: 46 },
      { strokeDashoffset: 0, duration: 0.45, delay: 0.5, ease: 'power2.out' },
    )
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (busy || !check()) return
    // on remet la carte de face AVANT busy=true, apres ca plus rien la bouge
    face(false)
    busy = true
    const label = q<HTMLElement>('[data-pay-label]', pay)!
    const fill = q<HTMLElement>('[data-pay-fill]', pay)!
    const go = q<HTMLButtonElement>('[data-pay-go]', pay)!
    go.disabled = true
    label.textContent = 'Autorisation…'
    sweep(card, 1.3)

    if (reduced) {
      settle()
      return
    }

    gsap
      .timeline({ onComplete: settle })
      .to(fill, { scaleX: 1, duration: 1.35, ease: 'power2.inOut' }, 0)
      .to(card, { rotateY: 0, rotateX: 0, duration: 0.6, ease: 'power3.out' }, 0)
      .to(card, { y: -10, duration: 0.5, ease: 'power2.out' }, 0.15)
      .to(card, { y: 0, duration: 0.7, ease: 'power2.inOut' }, 0.85)
      .add(() => (label.textContent = 'Autorisée'), 1.2)
  })

  paint()
}
