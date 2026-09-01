import { priceNote } from '../../data/shopConfig'
import './Footer.css'

interface FooterProps {
  onOpenLegal: (page: 'impressum' | 'datenschutz' | 'agb') => void
  onNavigate: (anchor: string) => void
}

export function Footer({ onOpenLegal, onNavigate }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div className="site-footer__brand">
          <p className="site-footer__name">Pfistanbul Fenster</p>
          <p className="site-footer__claim">
            Insektenschutz aus der Nachbarschaft – gebaut für die Fenster im Pfisterhölzli in Greifensee.
          </p>
        </div>

        <nav className="site-footer__col" aria-label="Sortiment">
          <h2>Sortiment</h2>
          <button type="button" onClick={() => onNavigate('gewebe')}>Gewebe</button>
          <button type="button" onClick={() => onNavigate('groessen')}>Sortiment Pfisterhölzli</button>
          <button type="button" onClick={() => onNavigate('anfrage')}>Sonderanfertigung</button>
        </nav>

        <nav className="site-footer__col" aria-label="Hilfe">
          <h2>Hilfe</h2>
          <button type="button" onClick={() => onNavigate('montage')}>Montage &amp; Messen</button>
          <button type="button" onClick={() => onNavigate('faq')}>Häufige Fragen</button>
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
        </nav>
      </div>

      <div className="shell site-footer__base">
        <p>© {new Date().getFullYear()} Pfistanbul Fenster</p>
        <p>{priceNote} · Lieferung im Pfisterhölzli kostenlos</p>
      </div>
    </footer>
  )
}
