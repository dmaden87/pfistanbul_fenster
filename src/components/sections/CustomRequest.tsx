import { useState } from 'react'
import { CustomRequestForm } from '../forms/CustomRequestForm'
import { priceRange } from '../../data/catalog'
import { preisHinweis } from '../../data/shopConfig'
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
interface CustomRequestProps {
  onSiedlungenClick: () => void
}

export function CustomRequest({ onSiedlungenClick }: CustomRequestProps) {
  const [vorgabe, setVorgabe] = useState<Massuebernahme | undefined>(undefined)

  return (
    <section className="section custom-request-section" id="anfrage">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Nach Ihrem Mass</span>
          <h2>Ihr Fenster rechnen wir Ihnen aus.</h2>
          {/*
            Der erste Satz hiess "Sagen Sie uns, wie viele Netze Sie brauchen
            und wie gross sie sein sollen" - genau das steht als Anleitung im
            Formular darunter. Auf dem Handy standen hier acht Zeilen zwischen
            dem Knopf, der "Preis sehen" verspricht, und der Zahl.
          */}
          <p className="section__lead">
            Den Richtpreis sehen Sie sofort, noch bevor Sie die Anfrage abschicken – bei uns gibt es kein blindes
            «Preis auf Anfrage». Die feste Offerte kommt danach, ohne Vorauszahlung und ohne Verpflichtung.
          </p>
        </div>

        <div className="price-anchor price-anchor--einzeln">
          <div className="price-anchor__range">
            <p className="price-anchor__label">Richtwert pro Fenster</p>
            <p className="price-anchor__value">
              CHF {priceRange.minChf}–{priceRange.maxChf}
            </p>
            <p className="price-anchor__hint">
              Für gängige Formate bis rund {priceRange.maxAreaM2} m²; grössere Flächen und Türen liegen darüber.{' '}
              {preisHinweis}
            </p>
          </div>
        </div>

        <Beispielrechner onUebernehmen={setVorgabe} />

        {/*
          DIE ABZWEIGUNG STEHT HIER und nicht mehr als zweiter Knopf im Hero.
          Oben war sie ein gleich breiter Knopf neben dem Hauptaufruf - zwei
          gleichwertige Wege, also wieder die Ordnung, die wir abgeraeumt
          haben. Hier trifft sie genau die Richtige: jemanden, der gerade sein
          Fenster ausgerechnet hat und dabei merkt, dass es jemand anders
          laengst gemessen hat.
        */}
        <p className="custom-request__abzweig">
          Wohnen Sie in einer Siedlung, die wir schon ausgemessen haben? Dann gibt es feste Preise und Sets für die
          ganze Wohnung – und Sie müssen gar nichts messen.{' '}
          <button type="button" className="btn btn--ghost" onClick={onSiedlungenClick}>
            Ausgemessene Siedlungen ansehen
          </button>
        </p>

        <CustomRequestForm vorgabe={vorgabe} />
      </div>
    </section>
  )
}
