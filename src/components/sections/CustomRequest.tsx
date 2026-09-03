import { CustomRequestForm } from '../forms/CustomRequestForm'
import { priceRange } from '../../data/catalog'
import { windowTypes } from '../../data/catalog'
import { formatChf, formatSize } from '../../lib/format'
import './CustomRequest.css'

export function CustomRequest() {
  return (
    <section className="section custom-request-section" id="anfrage">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Nach Ihrem Mass</span>
          <h2>Jedes andere Fenster rechnen wir Ihnen aus.</h2>
          <p className="section__lead">
            Sagen Sie uns, wie viele Netze Sie brauchen und wie gross sie sein sollen. Den Richtpreis sehen Sie sofort,
            noch bevor Sie die Anfrage abschicken – bei uns gibt es kein blindes «Preis auf Anfrage». Die feste Offerte
            kommt danach, ohne Vorauszahlung und ohne Verpflichtung.
          </p>
        </div>

        <div className="price-anchor">
          <div className="price-anchor__range">
            <p className="price-anchor__label">Richtwert pro Fenster</p>
            <p className="price-anchor__value">
              CHF {priceRange.minChf}–{priceRange.maxChf}
            </p>
            <p className="price-anchor__hint">
              Für gängige Formate bis rund {priceRange.maxAreaM2} m², inklusive Lieferung, ohne Montage. Grössere
              Flächen und Türen liegen darüber. Den festen Preis nennen wir in der Offerte.
            </p>
          </div>

          <div className="price-anchor__examples">
            <p className="price-anchor__label">Drei Beispiele aus dem ausgemessenen Sortiment</p>
            <ul>
              {windowTypes.slice(0, 3).map((type) => (
                <li key={type.id}>
                  <span>{type.label}</span>
                  <span className="price-anchor__size">{formatSize(type.widthCm, type.heightCm)}</span>
                  <span className="price-anchor__price">{formatChf(type.priceChf)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <CustomRequestForm />
      </div>
    </section>
  )
}
