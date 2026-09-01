import { activeUeberbauung, netSets, priceRange, windowTypes } from '../../data/catalog'
import { formatChf } from '../../lib/format'
import './TwoPaths.css'

interface TwoPathsProps {
  onStandardClick: () => void
  onCustomClick: () => void
}

export function TwoPaths({ onStandardClick, onCustomClick }: TwoPathsProps) {
  const cheapest = Math.min(...windowTypes.map((type) => type.priceChf))
  const dearest = Math.max(...windowTypes.map((type) => type.priceChf))
  const cheapestSet = Math.min(...netSets.map((set) => set.priceChf))

  return (
    <section className="section two-paths" id="wege">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Zwei Wege zum Netz</span>
          <h2>Ist Ihr Fenster schon ausgemessen?</h2>
          <p className="section__lead">
            Für Überbauungen, die wir kennen, gibt es feste Preise und Sets. Für alles andere fertigen wir nach Ihrem
            Mass. Gleiches Produkt, gleiche Qualität – nur der Weg dorthin ist ein anderer.
          </p>
        </div>

        <div className="two-paths__grid">
          <article className="path path--primary">
            <span className="pill">Ausgemessen · sofort bestellbar</span>
            <h3>{activeUeberbauung.name}</h3>
            <p>
              {activeUeberbauung.place}. Vier Fensterformate, die sich über alle Wohnungen wiederholen. Wir haben sie
              ausgemessen – Sie wählen das Set für Ihre Wohnung oder einzelne Netze und sehen den Preis sofort.
            </p>
            <ul className="path__list">
              <li>
                Einzelnes Netz {formatChf(cheapest)} bis {formatChf(dearest)}, ganze Wohnung ab{' '}
                {formatChf(cheapestSet)}
              </li>
              <li>Lieferung gratis an die Wohnungstür</li>
              <li>Passgarantie: passt es nicht, tauschen wir</li>
            </ul>
            <button type="button" className="btn btn--lg" onClick={onStandardClick}>
              Sortiment ansehen
            </button>
          </article>

          <article className="path path--primary">
            <span className="pill">Nach Ihrem Mass</span>
            <h3>Jedes andere Fenster</h3>
            <p>
              Eine andere Siedlung, ein Estrichfenster, eine verglaste Loggia: Sagen Sie uns Anzahl und Masse, wir
              fertigen es zu. Auf Wunsch kommen wir vorher zum Ausmessen vorbei.
            </p>
            <ul className="path__list">
              <li>
                Richtwert CHF {priceRange.minChf}–{priceRange.maxChf} pro Fenster für Formate bis rund{' '}
                {priceRange.maxAreaM2} m²
              </li>
              <li>Fester Preis mit der Offerte, innert 24 Stunden</li>
              <li>Unverbindlich, keine Anzahlung</li>
            </ul>
            <button type="button" className="btn btn--lg" onClick={onCustomClick}>
              Offerte anfordern
            </button>
          </article>
        </div>
      </div>
    </section>
  )
}
