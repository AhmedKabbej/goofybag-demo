import gsap from 'gsap'
import { q, qq, reduced } from './dom'

// formulaire generique reutilise par la page contact et la page partenaires
// on decrit juste les champs dans un FormSpec et le reste (markup, validation,
// ecran de confirmation) est commun
// rien n'est envoye nulle part c'est une demo

export type Field = {
  name: string
  cap: string
  type?: 'text' | 'email' | 'url'
  placeholder?: string
  /** pas obligatoire */
  optional?: boolean
  /** textarea au lieu d'un input */
  area?: boolean
  /** liste de choix en boutons. un seul a la fois */
  chips?: string[]
  /** demi largeur pour en mettre 2 sur la meme ligne */
  half?: boolean
}

const attrs = (f: Field) =>
  `name="${f.name}" ${f.optional ? '' : 'required'} placeholder="${f.placeholder ?? ''}" ` +
  `aria-describedby="err-${f.name}"`

function fieldMarkup(f: Field): string {
  if (f.chips) {
    return `
      <div class="field field--chips" data-field="${f.name}">
        <span class="field__cap">${f.cap}</span>
        <div class="chips" role="group" aria-label="${f.cap}">
          ${f.chips
            .map(
              (c, i) => `
            <button class="chip${i ? '' : ' is-on'}" type="button"
                    data-chip="${f.name}" data-value="${c}" aria-pressed="${i ? 'false' : 'true'}">
              ${c}
            </button>`,
            )
            .join('')}
        </div>
        <input type="hidden" name="${f.name}" value="${f.chips[0]}" />
        <span class="field__err" id="err-${f.name}"></span>
      </div>`
  }

  const control = f.area
    ? `<textarea rows="4" ${attrs(f)} maxlength="900"></textarea>`
    : `<input type="${f.type ?? 'text'}" ${attrs(f)} />`

  return `
    <label class="field${f.area ? ' field--area' : ''}${f.half ? ' field--half' : ''}" data-field="${f.name}">
      <span class="field__cap">${f.cap}${f.optional ? ' <i>facultatif</i>' : ''}</span>
      ${control}
      ${f.area ? '<span class="field__count" data-count>0 / 900</span>' : ''}
      <span class="field__err" id="err-${f.name}"></span>
    </label>`
}

export type FormSpec = {
  fields: Field[]
  submit: string
  /** le petit texte sous le bouton */
  fine: string
  done: { title: string; line: string; again: string }
}

// l'enveloppe affichee apres envoi. animee dans seal() plus bas
const SEAL = `
  <svg class="art seal" viewBox="0 0 180 130" aria-hidden="true">
    <rect class="k" x="14" y="26" width="152" height="88" pathLength="100" />
    <path class="k" d="M14 114 74 68M166 114 106 68" pathLength="100" />
    <path class="k seal__flap" d="M14 26 90 82 166 26" pathLength="100" />
    <g class="seal__stamp">
      <circle class="k" cx="90" cy="80" r="17" pathLength="100" />
      <circle class="d" cx="90" cy="80" r="12" />
      <path class="k" d="M96 74a8 8 0 1 0 0 12v-5h-4" pathLength="100" />
    </g>
  </svg>`

export function formMarkup(spec: FormSpec): string {
  return `
    <div class="form" data-form>
      <form class="form__body" novalidate autocomplete="off">
        ${spec.fields.map(fieldMarkup).join('')}
        <div class="form__send">
          <button class="btn" type="submit">${spec.submit}</button>
          <p class="form__fine">${spec.fine}</p>
        </div>
      </form>

      <div class="form__done" data-form-done hidden>
        ${SEAL}
        <h3 class="form__done-title">${spec.done.title}</h3>
        <p class="form__done-line">${spec.done.line}</p>
        <button class="linklike form__again" type="button" data-form-again>${spec.done.again}</button>
      </div>
    </div>`
}

const MAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

// renvoie le message d'erreur ou '' si c'est bon
function fault(f: Field, value: string): string {
  const v = value.trim()
  if (!v) return f.optional ? '' : 'Ce champ est requis.'
  if (f.type === 'email' && !MAIL.test(v)) return "Cette adresse n'a pas l'air d'en être une."
  if (f.area && v.length < 12) return 'Quelques mots de plus, pour comprendre.'
  return ''
}

export function bindForm(root: HTMLElement, spec: FormSpec): void {
  const wrap = q<HTMLElement>('[data-form]', root)
  if (!wrap) return
  const form = q<HTMLFormElement>('form', wrap)!
  const done = q<HTMLElement>('[data-form-done]', wrap)!

  // les chips : une seule active a la fois. la valeur est recopiee dans un input
  // hidden comme ca on recupere tout d'un coup avec FormData
  qq<HTMLElement>('[data-chip]', wrap).forEach((chip) => {
    chip.addEventListener('click', () => {
      const group = chip.parentElement!
      qq<HTMLElement>('[data-chip]', group).forEach((c) => {
        c.classList.toggle('is-on', c === chip)
        c.setAttribute('aria-pressed', String(c === chip))
      })
      const hidden = q<HTMLInputElement>(`input[type="hidden"][name="${chip.dataset.chip}"]`, wrap)
      if (hidden) hidden.value = chip.dataset.value ?? ''
    })
  })

  const counter = q<HTMLTextAreaElement>('textarea', wrap)
  const count = q<HTMLElement>('[data-count]', wrap)
  counter?.addEventListener('input', () => {
    if (count) count.textContent = `${counter.value.length} / 900`
  })

  // des que l'user retape dans un champ en erreur on enleve le message
  form.addEventListener('input', (e) => {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('.field')
    if (!cell?.classList.contains('is-bad')) return
    cell.classList.remove('is-bad')
    q<HTMLElement>('.field__err', cell)!.textContent = ''
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const data = new FormData(form)
    let first: HTMLElement | undefined

    for (const f of spec.fields) {
      const cell = q<HTMLElement>(`[data-field="${f.name}"]`, wrap)!
      const msg = f.chips ? '' : fault(f, String(data.get(f.name) ?? ''))
      cell.classList.toggle('is-bad', Boolean(msg))
      q<HTMLElement>('.field__err', cell)!.textContent = msg
      if (msg && !first) first = cell
    }

    if (first) {
      q<HTMLElement>('input, textarea', first)?.focus()
      if (!reduced) gsap.fromTo(first, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
      return
    }

    form.hidden = true
    done.hidden = false
    seal(done)
  })

  q<HTMLElement>('[data-form-again]', wrap)?.addEventListener('click', () => {
    form.reset()
    if (count) count.textContent = '0 / 900'
    done.hidden = true
    form.hidden = false
    if (!reduced) gsap.from(form, { opacity: 0, y: 10, duration: 0.5, ease: 'power3.out' })
  })
}

// l'anim de l'enveloppe qui se ferme
function seal(done: HTMLElement): void {
  const bloc = qq<HTMLElement>('.form__done-title, .form__done-line, .form__again', done)
  if (reduced) return

  const flap = q<SVGElement>('.seal__flap', done)!
  const stamp = q<SVGElement>('.seal__stamp', done)!
  // on sort le rabat et le tampon du reste pour les animer apres l'enveloppe
  const shell = qq<SVGElement>('.seal .k, .seal .d', done).filter(
    (el) => el !== flap && !stamp.contains(el),
  )

  gsap
    .timeline()
    .fromTo(shell, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.7, stagger: 0.12, ease: 'power2.inOut' }, 0)
    .fromTo(flap, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, 0.5)
    .fromTo(
      stamp,
      { scale: 2, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.2)', transformOrigin: '50% 50%' },
      1,
    )
    .fromTo(bloc, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 1.2)
}
