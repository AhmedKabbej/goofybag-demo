import gsap from 'gsap'
import { q, reduced } from './dom'
import { closeOverlay, openOverlay } from './overlay'

// popup qui montre le mail de bienvenue
// le html du mail est dans public/journal/bienvenue.html et on le charge dans
// une iframe. comme ca c'est le vrai fichier qu'on voit pas une copie

const mail = q<HTMLElement>('[data-mail]')!

export function openMail(): void {
  mail.innerHTML = `
    <div class="mail__scrim" data-close-mail></div>
    <div class="mail__panel" role="dialog" aria-modal="true" aria-label="Message de bienvenue">
      <header class="mail__top">
        <div class="mail__from">
          <p class="mail__who">GoofyBag <span>&lt;journal@goofybag.fr&gt;</span></p>
          <p class="mail__subject">Bienvenue au journal — Édition 01</p>
        </div>
        <button class="linklike" type="button" data-close-mail>Fermer</button>
      </header>
      <div class="mail__meta">
        <span>À vous</span><span>Aujourd'hui</span><span class="hide-sm">Boîte de réception</span>
      </div>
      <iframe class="mail__frame" src="/journal/bienvenue.html" title="Message de bienvenue"
              loading="lazy"></iframe>
    </div>`

  openOverlay(mail)
  if (!reduced) {
    gsap.from(q('.mail__panel', mail), { y: 20, duration: 0.5, ease: 'power3.out' })
  }
}

export function closeMail(): void {
  closeOverlay(mail)
  mail.innerHTML = ''
}

export { mail }
