import { useState } from 'react'
import { CustomRequestForm } from '../forms/CustomRequestForm'
import { priceRange } from '../../data/catalog'
import { Beispielrechner, type Massuebernahme } from './Beispielrechner'
import './CustomRequest.css'

/**
 * Der Weg vom Richtwert zur Anfrage, in einem Abschnitt.
 *
 * ER LIEST SICH VON OBEN NACH UNTEN: zuerst die Spanne, damit niemand erst
 * rechnen muss, um zu wissen, ob er hier richtig ist. Dann vier Räume zum
 * Ausprobieren. Dann das Formular.
 *
 * HIER STANDEN FRÜHER drei Beispiele aus dem ausgemessenen Sortiment, als
 * feste Liste mit festen Preisen. Das war zweimal schief: Es waren die Preise
 * EINER Siedlung, angeschrieben als Beispiele fürs Sondermass – und man
 * konnte nichts damit tun. Jetzt sind es dieselben vier Räume, aber mit den
 * Massen der Besucherin und einem Knopf, der sie ins Formular trägt.
 */
export function CustomRequest() {
  const [vorgabe, setVorgabe] = useState<Massuebernahme | undefined>(undefined)

  return (
    <section className="section custom-request-section" id="anfrage">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Nach Ihrem Mass</span>
          <h2>Ihr Fenster rechnen wir Ihnen aus.</h2>
          <p className="section__lead">
            Sagen Sie uns, wie viele Netze Sie brauchen und wie gross sie sein sollen. Den Richtpreis sehen Sie sofort,
            noch bevor Sie die Anfrage abschicken – bei uns gibt es kein blindes «Preis auf Anfrage». Die feste Offerte
            kommt danach, ohne Vorauszahlung und ohne Verpflichtung.
          </p>
        </div>

        <div className="price-anchor price-anchor--einzeln">
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
        </div>

        <Beispielrechner onUebernehmen={setVorgabe} />

        <CustomRequestForm vorgabe={vorgabe} />
      </div>
    </section>
  )
}
