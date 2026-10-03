import { Foto } from '../media/Foto'
import './ClosingCta.css'

interface ClosingCtaProps {
  onRequestClick: () => void
  onSiedlungenClick: () => void
}

export function ClosingCta({ onRequestClick, onSiedlungenClick }: ClosingCtaProps) {
  return (
    <section className="closing">
      <div className="shell">
        {/*
          Das Bild gehoert vor den Knopf und nicht hinter den Text: Es zeigt,
          wofuer der Knopf da ist – Wiese, Baum und Himmel durch das
          geschlossene Netz. Die Ueberschrift daneben sagt dasselbe in Worten.
        */}
        <figure className="closing__band">
          <Foto
            name="fenster-aussicht"
            alt="Blick aus einem Wohnungsfenster mit geschlossenem Insektenschutz-Plissee: Durch das Gewebe sind Baum, Wiese und blauer Himmel klar zu erkennen."
            sizes="(max-width: 80rem) 92vw, 72rem"
          />
          <figcaption>Zugezogen, und die Aussicht bleibt.</figcaption>
        </figure>

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
