import './ClosingCta.css'

interface ClosingCtaProps {
  onShopClick: () => void
  onRequestClick: () => void
}

export function ClosingCta({ onShopClick, onRequestClick }: ClosingCtaProps) {
  return (
    <section className="closing">
      <div className="shell">
        <div className="closing__box">
          <div className="closing__mesh" aria-hidden="true" />
          <div className="closing__content">
            <h2>Der nächste warme Abend kommt bestimmt.</h2>
            <p>
              Bis dahin hängt das Netz. Standardgrössen sind sofort bestellbar, alles andere rechnen wir Ihnen
              unverbindlich aus.
            </p>
            <div className="closing__actions">
              <button type="button" className="btn btn--lg closing__primary" onClick={onShopClick}>
                Grösse aussuchen
              </button>
              <button type="button" className="btn btn--ghost btn--lg closing__secondary" onClick={onRequestClick}>
                Sondermass anfragen
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
