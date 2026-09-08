import { operator } from '../../data/operator'
import { priceNote } from '../../data/shopConfig'
import type { LegalKey } from '../../data/site'
import './Footer.css'

interface FooterProps {
  onOpenLegal: (page: LegalKey) => void
  onNavigate: (anchor: string) => void
  onOpenAdmin: () => void
}

export function Footer({ onOpenLegal, onNavigate, onOpenAdmin }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div className="site-footer__brand">
          <p className="site-footer__name">Pfistanbul Fenster</p>
          <p className="site-footer__claim">
            Insektenschutz-Plissee nach Mass. Von Freunden und Nachbarn für Freunde und Nachbarn.
          </p>
          {/* Bis hierhin fuehrte der Weg nur in eine Richtung: vom Profil auf
              die Seite. Der Rueckweg fehlte - fuer Menschen, die nach dem
              Flyer sehen wollen, wer dahintersteht, und fuer Suchmaschinen,
              die aus beiden Verweisen dieselbe Firma erkennen. */}
          <a className="site-footer__instagram" href={operator.instagram} rel="me noopener" target="_blank">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
            Auf Instagram
          </a>
        </div>

        <nav className="site-footer__col" aria-label="Sortiment">
          <h2>Sortiment</h2>
          <button type="button" onClick={() => onNavigate('aufbau')}>Aufbau</button>
          <button type="button" onClick={() => onNavigate('groessen')}>Überbauungen</button>
          <button type="button" onClick={() => onNavigate('anfrage')}>Sonderanfertigung</button>
        </nav>

        <nav className="site-footer__col" aria-label="Hilfe">
          <h2>Hilfe</h2>
          <button type="button" onClick={() => onNavigate('montage')}>Montage &amp; Messen</button>
          <button type="button" onClick={() => onNavigate('faq')}>Häufige Fragen</button>
          <button type="button" onClick={() => onNavigate('zahlung')}>Zahlung nach Absprache</button>
          <button type="button" onClick={() => onNavigate('anfrage')}>Kontakt</button>
        </nav>

        <nav className="site-footer__col" aria-label="Rechtliches">
          <h2>Rechtliches</h2>
          <button type="button" onClick={() => onOpenLegal('impressum')}>
            Impressum
          </button>
          <button type="button" onClick={() => onOpenLegal('datenschutz')}>
            Datenschutz
          </button>
          <button type="button" onClick={() => onOpenLegal('agb')}>
            AGB
          </button>
          {/* Zugang zur Arbeitsliste. Bewusst klein und unbeworben - es ist
              kein Angebot an Besucher, sondern unsere eigene Tuer. Geschuetzt
              ist der Bereich ohnehin auf dem Server, nicht durch das
              Verstecken dieses Knopfs. */}
          <button type="button" className="site-footer__admin" onClick={onOpenAdmin}>
            Admin
          </button>
        </nav>
      </div>

      <div className="shell site-footer__base">
        <p>© {new Date().getFullYear()} Pfistanbul Fenster</p>
        <p>
          {priceNote} · Lieferung im Pfisterhölzli kostenlos, im übrigen Kanton Zürich nach Absprache
        </p>
      </div>
    </footer>
  )
}
