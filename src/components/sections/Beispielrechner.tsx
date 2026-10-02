import { useState } from 'react'
import { raumbeispiele } from '../../data/beispiele'
import { RELIABLE_AREA_M2, estimateNetChf } from '../../lib/estimate'
import { formatChf } from '../../lib/format'
import { MAX_CM, MIN_CM } from '../../lib/validate'
import { PlisseeVisual } from './PlisseeVisual'
import './Beispielrechner.css'

export interface Massuebernahme {
  breiteCm: number
  hoeheCm: number
  raum: string
  /** Zählt hoch, damit zweimal dasselbe Fenster auch zweimal ankommt. */
  stand: number
}

interface BeispielrechnerProps {
  onUebernehmen: (mass: Massuebernahme) => void
}

interface Eingabe {
  breite: string
  hoehe: string
}

/**
 * Vier Räume zum Anfassen.
 *
 * WARUM ES DAS GIBT: Die vier Skizzen - Bad, Küche, Zimmer, Balkontüre -
 * waren das, was von der alten Startseite hängenblieb. Sie standen dort als
 * Sortiment mit festen Preisen, und das stimmte nur für eine ausgemessene
 * Siedlung. Jetzt stehen sie als Rechner: dieselben vier Räume, dieselben
 * Skizzen, aber die Masse gehören der Besucherin, nicht uns.
 *
 * Gerechnet wird mit estimateNetChf() - derselben Funktion wie im Formular
 * darunter. Was hier steht, steht dort wieder; eine eigene Rechnung an dieser
 * Stelle wäre eine zweite Wahrheit.
 *
 * DIE SKIZZE FOLGT DEN EINGEGEBENEN MASSEN. Tippt jemand ein liegendes
 * Fenster ein, liegt auch die Skizze. Das ist der Moment, in dem aus einer
 * Abbildung sein Fenster wird.
 */
export function Beispielrechner({ onUebernehmen }: BeispielrechnerProps) {
  const [eingaben, setEingaben] = useState<Record<string, Eingabe>>(() =>
    Object.fromEntries(
      raumbeispiele.map((b) => [b.id, { breite: String(b.breiteCm), hoehe: String(b.hoeheCm) }]),
    ),
  )
  const [stand, setStand] = useState(0)

  const aendern = (id: string, teil: Partial<Eingabe>) => {
    setEingaben((alle) => ({ ...alle, [id]: { ...alle[id], ...teil } }))
  }

  return (
    <div className="rechner">
      <div className="rechner__kopf">
        <h3>Vier Räume zum Ausprobieren</h3>
        <p>
          Die Masse sind nur ein Anfang – überschreiben Sie sie mit Ihren. Gemessen wird die Lichte, also die
          Öffnung von Leibung zu Leibung. Der Preis rechnet beim Tippen mit.
        </p>
      </div>

      <ul className="rechner__liste">
        {raumbeispiele.map((beispiel, i) => {
          const eingabe = eingaben[beispiel.id]
          const breite = Number(eingabe.breite)
          const hoehe = Number(eingabe.hoehe)
          const gueltig =
            Number.isFinite(breite) &&
            Number.isFinite(hoehe) &&
            breite >= MIN_CM &&
            breite <= MAX_CM &&
            hoehe >= MIN_CM &&
            hoehe <= MAX_CM
          const flaeche = gueltig ? (breite / 100) * (hoehe / 100) : 0
          const preis = gueltig ? estimateNetChf(flaeche) : null
          const gross = gueltig && flaeche > RELIABLE_AREA_M2

          return (
            <li className="rechner__karte" key={beispiel.id}>
              <div className="rechner__bild">
                <PlisseeVisual
                  direction={beispiel.oeffnung}
                  ratio={gueltig ? breite / hoehe : 1}
                  delayMs={i * 700}
                />
              </div>

              <div className="rechner__text">
                <h4>{beispiel.label}</h4>
                <p className="rechner__raum">{beispiel.raum}</p>
                <p className="rechner__oeffnung">{beispiel.oeffnungLabel}</p>

                <div className="rechner__masse">
                  <label>
                    <span>Breite</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={MIN_CM}
                      max={MAX_CM}
                      value={eingabe.breite}
                      onChange={(e) => aendern(beispiel.id, { breite: e.target.value })}
                    />
                    <span className="rechner__einheit">cm</span>
                  </label>
                  <label>
                    <span>Höhe</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={MIN_CM}
                      max={MAX_CM}
                      value={eingabe.hoehe}
                      onChange={(e) => aendern(beispiel.id, { hoehe: e.target.value })}
                    />
                    <span className="rechner__einheit">cm</span>
                  </label>
                </div>
              </div>

              <div className="rechner__fuss">
                {preis === null ? (
                  <p className="rechner__fehler" role="status">
                    Zwischen {MIN_CM} und {MAX_CM} cm, bitte
                  </p>
                ) : (
                  <>
                    <p className="rechner__preis">
                      <span aria-hidden="true">≈ </span>
                      {formatChf(preis)}
                      <span className="visually-hidden"> Richtpreis</span>
                    </p>
                    <p className="rechner__flaeche">
                      {flaeche.toFixed(2).replace('.', ',')} m²{gross ? ' · über unserem Erfahrungsbereich' : ''}
                    </p>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={preis === null}
                  onClick={() => {
                    const naechster = stand + 1
                    setStand(naechster)
                    onUebernehmen({ breiteCm: breite, hoeheCm: hoehe, raum: beispiel.raum, stand: naechster })
                  }}
                >
                  Masse übernehmen
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {/*
        KEINE ZUSAGE ZUR LIEFERUNG an dieser Stelle. Das Formular zwei
        Abschnitte weiter unten sagt, dass ausserhalb der Siedlung die Anfahrt
        dazukommt; stuende hier "inklusive Lieferung", widerspraechen sich zwei
        Saetze auf derselben Seite, und der Kunde haette den freundlicheren
        gelesen.
      */}
      <p className="rechner__hinweis">
        Richtpreise pro Netz, ohne Montage. Sie entstehen aus denselben Zahlen wie unsere ausgemessenen Fenster –
        was Lieferung und Anfahrt kosten, steht in der Offerte, und erst die unterschreiben Sie.
      </p>
    </div>
  )
}
