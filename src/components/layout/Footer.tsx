import './Footer.css'

interface FooterProps {
  onOpenLegal: (page: 'impressum' | 'datenschutz' | 'agb') => void
}

export function Footer({ onOpenLegal }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div className="site-footer__brand">
          <p className="site-footer__name">Pfistanbul Fenster</p>
          <p className="site-footer__claim">
            Insektenschutz aus der Nachbarschaft – gebaut für die Fenster im Pfisterhölzli, Volketswil.
          </p>
        </div>

        <nav className="site-footer__col" aria-label="Sortiment">
          <h2>Sortiment</h2>
          <a href="#sortiment">Bauarten</a>
          <a href="#groessen">Grössen &amp; Preise</a>
          <a href="#anfrage">Sonderanfertigung</a>
        </nav>

        <nav className="site-footer__col" aria-label="Hilfe">
          <h2>Hilfe</h2>
          <a href="#montage">Montage &amp; Messen</a>
          <a href="#faq">Häufige Fragen</a>
          <a href="#anfrage">Kontakt</a>
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
        <p>Preise in CHF inkl. MwSt. · Lieferung im Pfisterhölzli kostenlos</p>
      </div>
    </footer>
  )
}
