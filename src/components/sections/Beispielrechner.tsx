import { useEffect, useRef, useState } from 'react'
import { raumbeispiele } from '../../data/beispiele'
import { RELIABLE_AREA_M2, estimateNetChf } from '../../lib/estimate'
import { formatChf } from '../../lib/format'
import { lieferhinweis } from '../../data/shopConfig'
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

interface Gerechnet {
  breite: number
  hoehe: number
  gueltig: boolean
  flaecheM2: number
  preisChf: number | null
  uebergross: boolean
}

/*
 * Grenzen fuers Seitenverhaeltnis der Skizze. Die Rechnung laesst 20 bis 300
 * cm je Seite zu, also bis 15:1 - eine solche Skizze waere ein Strich und
 * wuerde aus ihrem Rahmen laufen. Die Zahl darunter stimmt weiterhin; nur das
 * Bild hoert bei einem Verhaeltnis auf, das noch wie ein Fenster aussieht.
 */
const RATIO_MIN = 0.3
const RATIO_MAX = 3.2

/**
 * Das Seitenverhaeltnis der Buehne, in der die Skizze steht. Gespiegelt aus
 * Beispielrechner.css (.rechner__bild) - dort steht, warum es feststeht.
 * Breitere Fenster richten sich an der Breite aus, hoehere an der Hoehe.
 */
const BUEHNE_RATIO = 4 / 3

function rechnen(eingabe: Eingabe): Gerechnet {
  const breite = Number(eingabe.breite)
  const hoehe = Number(eingabe.hoehe)
  const gueltig =
    Number.isFinite(breite) &&
    Number.isFinite(hoehe) &&
    breite >= MIN_CM &&
    breite <= MAX_CM &&
    hoehe >= MIN_CM &&
    hoehe <= MAX_CM

  const flaecheM2 = gueltig ? (breite / 100) * (hoehe / 100) : 0
  return {
    breite,
    hoehe,
    gueltig,
    flaecheM2,
    preisChf: gueltig ? estimateNetChf(flaecheM2) : null,
    uebergross: gueltig && flaecheM2 > RELIABLE_AREA_M2,
  }
}

/**
 * Ein Beispiel zum Anfassen, vier zur Auswahl.
 *
 * WARUM ES DAS GIBT: Die vier Skizzen - Bad, Küche, Zimmer, Balkontüre -
 * waren das, was von der alten Startseite hängenblieb. Sie standen dort als
 * Sortiment mit festen Preisen, und das stimmte nur für eine ausgemessene
 * Siedlung. Jetzt stehen sie als Rechner: dieselben vier Räume, dieselben
 * Skizzen, aber die Masse gehören der Besucherin, nicht uns.
 *
 * WARUM EINER STATT VIER: Vier gleichwertige Karten nebeneinander lesen sich
 * als Sortiment - "wähl eines aus" -, und genau das ist die Ordnung, die wir
 * abgeräumt haben. Niemand misst vier Fenster gleichzeitig. Links die Auswahl,
 * rechts ein grosses Beispiel: Das sagt "such das, was deinem am nächsten
 * kommt, und tipp deine Zahlen rein".
 *
 * DIE BALKEN TRAGEN IHREN PREIS MIT. Sonst ginge beim Umbau das Einzige
 * verloren, was das Nebeneinander konnte - der Vergleich auf einen Blick.
 *
 * ALLE VIER BEISPIELE STEHEN IM HTML, die nicht gewählten mit `hidden`. Wer
 * ohne Javascript ankommt - ein Crawler, ein Textbrowser, jemand mit
 * blockierten Skripten -, findet damit alle vier Räume samt Zahlen und nicht
 * einen einzigen. Deshalb wird hier auch nichts bedingt gerendert.
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
  const [gewaehlt, setGewaehlt] = useState(raumbeispiele[0].id)
  const [stand, setStand] = useState(0)
  const [uebernommen, setUebernommen] = useState<string | null>(null)
  const balken = useRef<(HTMLButtonElement | null)[]>([])
  const quittung = useRef<number | undefined>(undefined)

  /* Bestaetigung, die von selbst wieder geht. Der Timer wird beim Abbau
     abgeraeumt, sonst setzt er Zustand auf einem Bauteil, das es nicht mehr
     gibt. */
  useEffect(() => () => window.clearTimeout(quittung.current), [])

  const melden = (id: string) => {
    setUebernommen(id)
    window.clearTimeout(quittung.current)
    quittung.current = window.setTimeout(() => setUebernommen(null), 4000)
  }

  const aendern = (id: string, teil: Partial<Eingabe>) => {
    setEingaben((alle) => ({ ...alle, [id]: { ...alle[id], ...teil } }))
  }

  /*
   * Pfeiltasten im Balkenstapel. Ein Reiterwerk, das nur mit der Maus
   * bedienbar ist, ist für Tastatur und Screenreader eine Sackgasse: Die
   * nicht gewählten Reiter liegen bewusst ausserhalb der Tabulatorfolge,
   * also muss etwas anderes zwischen ihnen wechseln.
   */
  const taste = (event: React.KeyboardEvent, i: number) => {
    const schritt =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : event.key === 'Home'
            ? -i
            : event.key === 'End'
              ? raumbeispiele.length - 1 - i
              : 0
    if (schritt === 0) return
    event.preventDefault()
    const ziel = (i + schritt + raumbeispiele.length) % raumbeispiele.length
    setGewaehlt(raumbeispiele[ziel].id)
    balken.current[ziel]?.focus()
  }

  return (
    <div className="rechner">
      <div className="rechner__kopf">
        <h3>Rechnen Sie an einem Beispiel</h3>
        <p>
          Vier Arten, wie ein Netz aufgeht – der Raum dahinter ist nur das Beispiel, bei dem man sie am ehesten
          antrifft. Wählen Sie, was Ihrem Fenster am nächsten kommt, und überschreiben Sie die Masse mit Ihren.
          Gemessen wird die Lichte, also die Öffnung von Leibung zu Leibung. Der Preis rechnet beim Tippen mit.
        </p>
      </div>

      <div className="rechner__buehne">
        <div className="rechner__wahl" role="tablist" aria-orientation="vertical" aria-label="Beispiel wählen">
          {raumbeispiele.map((beispiel, i) => {
            const aktiv = beispiel.id === gewaehlt
            return (
              <button
                key={beispiel.id}
                type="button"
                role="tab"
                id={`rechner-balken-${beispiel.id}`}
                aria-selected={aktiv}
                aria-controls={`rechner-feld-${beispiel.id}`}
                tabIndex={aktiv ? 0 : -1}
                ref={(el) => {
                  balken.current[i] = el
                }}
                className={`rechner__balken${aktiv ? ' is-aktiv' : ''}`}
                onClick={() => setGewaehlt(beispiel.id)}
                onKeyDown={(e) => taste(e, i)}
              >
                <span className="rechner__balken-name">{beispiel.bauart}</span>
                <span className="rechner__balken-bsp">Beispiel: {beispiel.raumKurz}</span>
              </button>
            )
          })}
        </div>

        {raumbeispiele.map((beispiel, i) => {
          const eingabe = eingaben[beispiel.id]
          const zahlen = rechnen(eingabe)
          const aktiv = beispiel.id === gewaehlt
          const verhaeltnis = zahlen.gueltig
            ? Math.min(RATIO_MAX, Math.max(RATIO_MIN, zahlen.breite / zahlen.hoehe))
            : 1

          return (
            <div
              key={beispiel.id}
              role="tabpanel"
              id={`rechner-feld-${beispiel.id}`}
              aria-labelledby={`rechner-balken-${beispiel.id}`}
              hidden={!aktiv}
              className="rechner__held"
            >
              <div className={`rechner__bild rechner__bild--${verhaeltnis >= BUEHNE_RATIO ? 'breit' : 'hoch'}`}>
                <PlisseeVisual direction={beispiel.oeffnung} ratio={verhaeltnis} delayMs={i * 300} />
              </div>

              <div className="rechner__text">
                <h4>{beispiel.bauart}</h4>
                {/* Nicht nochmals "Beispiel: Badfenster" - das steht im Balken
                    daneben. Hier steht, wo die Bauart sonst noch vorkommt. */}
                <p className="rechner__raum">Typisch für {beispiel.raum}</p>
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

                <div className="rechner__ergebnis">
                  {zahlen.preisChf === null ? (
                    <p className="rechner__fehler" role="status">
                      Zwischen {MIN_CM} und {MAX_CM} cm, bitte
                    </p>
                  ) : (
                    <>
                      <p className="rechner__preis">
                        <span aria-hidden="true">≈ </span>
                        {formatChf(zahlen.preisChf)}
                        <span className="visually-hidden"> Richtpreis</span>
                      </p>
                      <p className="rechner__flaeche">
                        {zahlen.flaecheM2.toFixed(2).replace('.', ',')} m²
                        {zahlen.uebergross ? ' · über unserem Erfahrungsbereich' : ''}
                      </p>
                    </>
                  )}
                  {/*
                    DER KNOPF SAGT, WOHIN. "Masse übernehmen" stand hier
                    zuerst und liess offen, wohin sie übernommen werden - dass
                    eine Bildschirmhöhe weiter unten eine Anfrage steht,
                    musste man raten. Jetzt steht es auf dem Knopf, und die
                    Rückmeldung danach sagt, dass es angekommen ist: Der
                    Zuwachs passiert ausserhalb des Sichtfelds, also muss er
                    hier bestätigt werden.
                  */}
                  <button
                    type="button"
                    className={`btn${uebernommen === beispiel.id ? ' btn--done' : ''}`}
                    disabled={zahlen.preisChf === null}
                    onClick={() => {
                      const naechster = stand + 1
                      setStand(naechster)
                      melden(beispiel.id)
                      onUebernehmen({
                        breiteCm: zahlen.breite,
                        hoeheCm: zahlen.hoehe,
                        raum: beispiel.raum,
                        stand: naechster,
                      })
                    }}
                  >
                    {uebernommen === beispiel.id ? 'Steht in der Anfrage ✓' : 'Zur Anfrage unten hinzufügen'}
                  </button>
                  <p className="rechner__quittung" role="status">
                    {uebernommen === beispiel.id
                      ? 'Sie können weitere Fenster dazunehmen.'
                      : ''}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Der Liefersatz kommt aus shopConfig und steht hier nicht im
          Wortlaut - siehe die Begruendung dort. */}
      <p className="rechner__hinweis">
        Richtpreise pro Netz, ohne Montage. Sie entstehen aus denselben Zahlen wie unsere ausgemessenen Fenster –
        den festen Preis nennen wir in der Offerte, und erst die unterschreiben Sie. {lieferhinweis}
      </p>
    </div>
  )
}
