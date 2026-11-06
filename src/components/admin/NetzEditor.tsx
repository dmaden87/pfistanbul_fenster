import { useState } from 'react'
import type { BestellPosition, OpeningDirection } from '../../types'
import {
  MECHANISMEN,
  NETZARTEN,
  NETZFARBEN,
  OEFFNUNGEN,
  RAHMENDICKEN,
  RAHMENFARBEN,
  RAHMENFARBEN_WAHL,
  type Mechanismus,
  type Netzart,
  type Netzfarbe,
  type Rahmenfarbe,
} from '../../data/produktion'
import { formatChf, formatSize } from '../../lib/format'
import { netSets, netsInSet, windowTypes } from '../../data/catalog'
import { positionenSumme } from './hilfen'
import { fuelle, useSprache } from './sprache'
import {
  ausKatalog,
  betragAusFeld,
  katalogWert,
  leer,
  netzeMitPreis,
  netzeZumSpeichern,
  zuEntwurf,
  type Entwurf,
} from '../../lib/netzentwurf'

/**
 * Die Netze einer Bestellung bearbeiten: ergaenzen, aendern, entfernen.
 *
 * Gearbeitet wird auf einem Entwurf, gespeichert wird auf Knopfdruck. Der
 * naheliegende Weg – jede Eingabe sofort zum Server – waere hier falsch:
 * Wer eine Breite von 120 auf 130 aendert, tippt zwischendurch "13", und
 * eine Bestellung mit 13 cm Breite darf keine Sekunde in der Tabelle stehen.
 * Ausserdem gibt es so ein Abbrechen, das wirklich abbricht.
 *
 * Alle Felder sind Text und nicht Zahl, obwohl Zahlen herauskommen. Ein
 * `number`-Zustand kann das leere Feld nicht darstellen: Wer die Menge
 * loeschen will, um sie neu zu tippen, bekaeme sofort eine 0 zurueck.
 *
 * Die zweite Zeile je Netz ist das, was der Produzent braucht. Sie steht hier
 * und nicht erst im Bestellauftrag, weil sie am Fenster erhoben wird – wer
 * beim Ausmessen steht, soll sie gleich eintragen koennen.
 *
 * DEN PREIS TIPPT HIER NIEMAND MEHR. Bei Katalogware stand er immer im
 * Katalog; beim Sondermass rechnet ihn der Rechner aus den Massen – derselbe,
 * der der Kundschaft auf der Seite ihren Richtpreis zeigt. Er steht hier nur
 * noch als Zahl daneben und laeuft mit, sobald ein Mass sich aendert oder ein
 * Netz dazukommt.
 *
 * Der Grund ist nicht Bequemlichkeit, sondern Zustaendigkeit: Der
 * Verkaufspreis wird im Angebot festgelegt, von Hand und mit dem Vorschlag
 * daneben. Ein zweites Preisfeld in der Klaerung heisst, dass derselbe Betrag
 * an zwei Stellen entsteht – und dann gewinnt die Stelle, an der zuletzt
 * jemand gespeichert hat.
 *
 * WAS EINMAL FESTGELEGT IST, BLEIBT. Wer im Angebot 185 statt 160 verlangt
 * hat und danach hier noch eine Bezeichnung korrigiert, findet die 185
 * wieder. Nur wenn sich die MASSE aendern, wird neu gerechnet: Dann ist es ein
 * anderes Netz, und der alte Preis gehoerte zu einem Fenster, das es so nicht
 * gibt.
 */

interface NetzEditorProps {
  positionen: BestellPosition[]
  montageChf: number
  /** Nur zur Anzeige: Was die Montage pro Netz kostet. */
  montageProNetz: number
  onSpeichern: (positionen: BestellPosition[], montageChf: number) => Promise<void>
  onAbbrechen: () => void
  /** Beschriftung des Knopfs. Beim Anlegen heisst er anders als beim Aendern. */
  speichernText?: string
  /** Gruende ausserhalb der Netze, die das Speichern noch verhindern. */
  deaktiviert?: boolean
  /**
   * Katalogware: Jedes Netz ist ein Katalogprodukt aus dem Dropdown. Masse,
   * Bauart und Preis kommen aus dem Katalog und sind hier nicht aenderbar –
   * sonst hiesse "Bestellung" nur noch, dass jemand die Felder anders fuellt.
   */
  katalog?: boolean
}

export function NetzEditor({
  positionen,
  montageChf,
  montageProNetz,
  onSpeichern,
  onAbbrechen,
  speichernText,
  deaktiviert = false,
  katalog = false,
}: NetzEditorProps) {
  const { t, sprache } = useSprache()
  const [entwuerfe, setEntwuerfe] = useState<Entwurf[]>(() =>
    positionen.length > 0 ? positionen.map(zuEntwurf) : [leer()],
  )
  const [montage, setMontage] = useState(String(montageChf))
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const aendere = (index: number, teil: Partial<Entwurf>) => {
    setEntwuerfe((liste) => liste.map((e, i) => (i === index ? { ...e, ...teil } : e)))
  }

  // Preisregel und Richtpreis: src/lib/netzentwurf.ts, `netzeMitPreis`.
  const netze = netzeMitPreis(entwuerfe, positionen, katalog)
  const summeNetze = positionenSumme(netze)
  const summe = Math.round((summeNetze + betragAusFeld(montage)) * 100) / 100

  const speichern = async () => {
    const pruefung = netzeZumSpeichern(netze, katalog)
    if (pruefung.fehler) {
      setFehler(t[pruefung.fehler])
      return
    }
    const gefuellt = pruefung.netze
    setFehler(null)
    setSendet(true)
    try {
      await onSpeichern(gefuellt, betragAusFeld(montage))
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Fehler')
      setSendet(false)
    }
  }

  return (
    <div className="netze">
      {katalog ? (
        <p className="netze__hinweis">{t.katalogSatz}</p>
      ) : (
        <p className="netze__hinweis">{t.preisGerechnetSatz}</p>
      )}
      {entwuerfe.map((e, i) => (
        <fieldset className="netz" key={i}>
          <legend className="netz__nummer">
            {t.netzNummer} {i + 1}
            {e.setId && <span className="netz__quelle">{t.setAusKatalog}</span>}
          </legend>

          {katalog && (
            <div className="netz__reihe">
              <label className="netz__feld netz__feld--breit">
                <span>{t.katalogprodukt}</span>
                <select
                  className={katalogWert(e) ? 'input' : 'input netz__fehlt'}
                  aria-label={`${t.katalogprodukt} ${i + 1}`}
                  value={katalogWert(e)}
                  onChange={(ev) => setEntwuerfe((liste) => liste.map((x, j) => (j === i ? ausKatalog(ev.target.value, x) : x)))}
                >
                  <option value="">{t.bitteWaehlen}</option>
                  <optgroup label={t.einzelneNetze}>
                    {windowTypes.map((typ) => (
                      <option key={typ.id} value={`typ:${typ.id}`}>
                        {typ.label} · {formatSize(typ.widthCm, typ.heightCm)} · {formatChf(typ.priceChf)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t.setsGruppe}>
                    {netSets.map((set) => (
                      <option key={set.id} value={`set:${set.id}`}>
                        {set.label} · {netsInSet(set)} {t.netzeMehrzahl} · {formatChf(set.priceChf)}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
            </div>
          )}

          <div className="netz__reihe">
            <label className="netz__feld netz__feld--winzig">
              <span>{t.anzahlKurz}</span>
              <input className="input" inputMode="numeric" value={e.menge} onChange={(ev) => aendere(i, { menge: ev.target.value })} />
            </label>
            <label className="netz__feld netz__feld--breit">
              <span>{t.bezeichnungRaum}</span>
              <input
                className="input"
                placeholder="z. B. Schlafzimmer Süd"
                value={e.bezeichnung}
                onChange={(ev) => aendere(i, { bezeichnung: ev.target.value })}
              />
            </label>
            <label className="netz__feld netz__feld--klein">
              <span>{t.breiteCm}</span>
              <input className="input" inputMode="decimal" placeholder="128.6" value={e.breiteCm} disabled={katalog} onChange={(ev) => aendere(i, { breiteCm: ev.target.value })} />
            </label>
            <label className="netz__feld netz__feld--klein">
              <span>{t.hoeheCm}</span>
              <input className="input" inputMode="decimal" placeholder="182.5" value={e.hoeheCm} disabled={katalog} onChange={(ev) => aendere(i, { hoeheCm: ev.target.value })} />
            </label>
            {/*
              Katalogware zeigt ihren Katalogpreis im gesperrten Feld.
              Sondermass zeigt, was der Rechner sagt – und was gespeichert
              wird, falls im Angebot noch nichts festgelegt wurde.
            */}
            {katalog ? (
              <label className="netz__feld netz__feld--klein">
                <span>{t.preisChf}</span>
                <input className="input" inputMode="decimal" value={e.preisChf} disabled onChange={() => {}} />
              </label>
            ) : (
              <div className="netz__feld netz__feld--klein">
                <span>{t.preisGerechnet}</span>
                <output className="netz__gerechnet">
                  {netze[i].preisChf > 0 ? formatChf(netze[i].preisChf) : '—'}
                </output>
              </div>
            )}
          </div>

          {/* Was der Produzent braucht. Er kennt unser Sortiment nicht. */}
          <div className="netz__reihe netz__reihe--produktion">
            <label className="netz__feld netz__feld--klein">
              <span>{t.rahmendicke}</span>
              {/*
                EINE WAHL, KEIN FREITEXT: Die Dicke geht in den Einkaufspreis
                ein, und "ca. 2-3" laesst sich nicht multiplizieren.
                Ein Altwert, der zu keiner der beiden passt, steht als
                eigene Zeile da - verschwiegen wuerde er stillschweigend
                durch 2.8 ersetzt, und das waere eine erfundene Angabe.
              */}
              <select className="input" value={e.rahmendicke} disabled={katalog}
                onChange={(ev) => aendere(i, { rahmendicke: ev.target.value })}>
                {!(e.rahmendicke in RAHMENDICKEN) && (
                  <option value={e.rahmendicke}>
                    {e.rahmendicke === '' ? t.bitteWaehlen : `${e.rahmendicke} ${t.altwert}`}
                  </option>
                )}
                {Object.entries(RAHMENDICKEN).map(([wert, b]) => (
                  <option key={wert} value={wert}>
                    {b[sprache]}
                  </option>
                ))}
              </select>
            </label>
            <label className="netz__feld netz__feld--klein">
              <span>{t.rahmen}</span>
              <select className="input" value={e.rahmenfarbe} disabled={katalog} onChange={(ev) => aendere(i, { rahmenfarbe: ev.target.value as Rahmenfarbe })}>
                {/* Eine Farbe, die nicht mehr im Angebot ist, bleibt am Altauftrag sichtbar. */}
                {!RAHMENFARBEN_WAHL.includes(e.rahmenfarbe) && (
                  <option value={e.rahmenfarbe}>
                    {RAHMENFARBEN[e.rahmenfarbe][sprache]} {t.altwert}
                  </option>
                )}
                {RAHMENFARBEN_WAHL.map((wert) => (
                  <option key={wert} value={wert}>
                    {RAHMENFARBEN[wert][sprache]}
                  </option>
                ))}
              </select>
            </label>
            <label className="netz__feld netz__feld--klein">
              <span>{t.netzSpalte}</span>
              <select className="input" value={e.netzfarbe} disabled={katalog} onChange={(ev) => aendere(i, { netzfarbe: ev.target.value as Netzfarbe })}>
                {Object.entries(NETZFARBEN).map(([wert, b]) => (
                  <option key={wert} value={wert}>
                    {b[sprache]}
                  </option>
                ))}
              </select>
            </label>
            <label className="netz__feld">
              <span>{t.netzart}</span>
              <select className="input" value={e.netzart} disabled={katalog}
                onChange={(ev) => aendere(i, { netzart: ev.target.value as Netzart })}>
                {Object.entries(NETZARTEN).map(([wert, b]) => (
                  <option key={wert} value={wert}>
                    {b[sprache]}
                  </option>
                ))}
              </select>
            </label>
            <label className="netz__feld netz__feld--klein">
              <span>{t.mechanismus}</span>
              <select className="input" value={e.mechanismus} disabled={katalog} onChange={(ev) => aendere(i, { mechanismus: ev.target.value as Mechanismus })}>
                {Object.entries(MECHANISMEN).map(([wert, b]) => (
                  <option key={wert} value={wert}>
                    {b[sprache]}
                  </option>
                ))}
              </select>
            </label>
            <label className="netz__feld netz__feld--breit">
              <span>{t.oeffnungVonInnen}</span>
              <select
                className={e.oeffnung || katalog ? 'input' : 'input netz__fehlt'}
                value={e.oeffnung}
                disabled={katalog}
                onChange={(ev) => aendere(i, { oeffnung: ev.target.value as OpeningDirection | '' })}
              >
                <option value="">{t.nochOffen}</option>
                {Object.entries(OEFFNUNGEN).map(([wert, b]) => (
                  <option key={wert} value={wert}>
                    {b[sprache]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/*
            Das Entfernen steht als BESCHRIFTETER Knopf am Fuss des Blocks und
            nicht mehr als blankes Kreuz in der Eingabezeile. Dort rutschte es
            beim Umbruch unter das Preisfeld und sah aus wie ein leeres
            Kaestchen - der Betrieb hielt das Entfernen fuer nicht vorhanden
            und rief deswegen an. Eine Funktion, die niemand findet, gibt es
            nicht.
          */}
          <div className="netz__fuss">
            <button
              type="button"
              className="netze__weg"
              aria-label={`${t.netzNummer} ${i + 1} ${t.netzEntfernen}`}
              onClick={() => setEntwuerfe((liste) => liste.filter((_, j) => j !== i))}
            >
              <span aria-hidden="true">×</span> {t.netzWegKnopf}
            </button>
          </div>
        </fieldset>
      ))}

      <button type="button" className="btn btn--quiet" onClick={() => setEntwuerfe((l) => [...l, leer()])}>
        {t.netzHinzufuegen}
      </button>

      <div className="netze__montage">
        <label className="field__label" htmlFor="netze-montage">
          {t.montageInsgesamt}
        </label>
        <input
          id="netze-montage"
          className="input netze__feld"
          inputMode="decimal"
          value={montage}
          onChange={(e) => setMontage(e.target.value)}
        />
        <span className="netze__hinweis">{fuelle(t.montageProFenster, { preis: formatChf(montageProNetz) })}</span>
      </div>

      <p className="netze__summe">
        <span>
          {t.netzeSumme} {formatChf(summeNetze)}
          {betragAusFeld(montage) > 0 && ` · ${t.montageSumme} ${formatChf(betragAusFeld(montage))}`}
        </span>
        <strong>{formatChf(summe)}</strong>
      </p>

      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      <div className="netze__schritte">
        <button type="button" className="btn" onClick={speichern} disabled={sendet || deaktiviert}>
          {sendet ? t.wirdGespeichert : (speichernText ?? t.netzeSpeichern)}
        </button>
        <button type="button" className="btn btn--quiet" onClick={onAbbrechen} disabled={sendet}>
          {t.abbrechen}
        </button>
      </div>
    </div>
  )
}
