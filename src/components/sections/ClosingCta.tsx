import './ClosingCta.css'

interface ClosingCtaProps {
  onRequestClick: () => void
  onSiedlungenClick: () => void
}

export function ClosingCta({ onRequestClick, onSiedlungenClick }: ClosingCtaProps) {
  return (
    <section className="closing">
      <div className="shell">
        <div className="closing__box">
          <div className="closing__mesh" aria-hidden="true" />
          <div className="closing__content">
            <h2>Der nächste warme Abend kommt bestimmt.</h2>
            <p>
              Bis dahin hängt das Netz. Masse eingeben, Richtpreis sehen, unverbindlich anfragen – und wenn Ihre
              Siedlung schon ausgemessen ist, geht es noch schneller.
            </p>
            <div className="closing__actions">
              <button type="button" className="btn btn--lg closing__primary" onClick={onRequestClick}>
                Mein Fenster ausrechnen
              </button>
              <button type="button" className="btn btn--ghost btn--lg closing__secondary" onClick={onSiedlungenClick}>
                Ausgemessene Siedlungen
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
