import { useState } from 'react'
import type { Beteiligter, Bestellung, KostenArt, KostenPosten } from '../../types'
import { beteiligte } from '../../data/kostenConfig'
import { formatChf } from '../../lib/format'
import { kostenBetrag, kostenStart, kostenZumSpeichern, KOSTEN_TRAEGER, weitererKostenposten } from '../../lib/kostenentwurf'
import { zahlenFuer } from '../../lib/pl'
import { fuelle, useSprache } from '../admin/sprache'
import './KostenEditor.css'

/**
 * Die Kosten einer Bestellung erfassen.
 *
 * DIE FELDER SIND VORBELEGT, ABER NICHT GESETZT. Was hier steht, bevor
 * jemand tippt, ist die Schaetzung aus der Formel – daneben steht, dass sie
 * eine ist. Erst das Speichern macht daraus eine Zahl, auf die sich die
 * Erfolgsrechnung beruft. Solange niemand gespeichert hat, rechnet die
 * Auswertung zwar mit denselben Werten, markiert die Bestellung aber als
 * geschaetzt – und das soll man sehen koennen.
 */

interface Props {
  bestellung: Bestellung
  onSpeichern: (kosten: KostenPosten[]) => Promise<void>
  onSchliessen: () => void
}

export function KostenEditor({ bestellung, onSpeichern, onSchliessen }: Props) {
  const { t } = useSprache()
  const TITEL: Record<KostenArt, string> = {
    herstellung: t.zHerstellung,
    lieferung: t.zLieferkosten,
    mwst: t.zEinfuhrsteuer,
    kargo: t.zKargoMwst,
    montage: t.zMontageSchuld,
    weiteres: t.zWeitereKosten,
  }

  /*
   * Fehlt ein fester Posten, wird er mit dem Vorschlag angelegt – aber mit
   * `neu: true` gemerkt. Die Oberflaeche zeigt daneben "geschaetzt", damit
   * niemand eine Zahl fuer gemessen haelt, die nur gerechnet ist.
   */
  /*
   * DER ZUSTAND TRAEGT DEN GETIPPTEN TEXT, nicht nur die Zahl.
   *
   * Das Feld war ein `type="number"`, und ein solches Feld nimmt den
   * Schweizer Tausender-Apostroph gar nicht erst an - der Browser liefert
   * einen leeren Wert zurueck. Wer "12'345.67" tippte, speicherte nichts.
   *
   * Jetzt ist es ein Textfeld, und solange jemand tippt, bleibt stehen, was
   * er geschrieben hat. Gerechnet wird mit betragAusText(); erst beim
   * Speichern wird daraus eine Zahl.
   */
  // Vorbelegung: src/lib/kostenentwurf.ts, `kostenStart`.
  const [posten, setPosten] = useState(() => kostenStart(bestellung))
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const aendere = (id: string, teil: Partial<KostenPosten & { betragText: string }>) =>
    setPosten((liste) => liste.map((k) => (k.id === id ? { ...k, ...teil } : k)))

  const betrag = kostenBetrag
  const summe = posten.reduce((s, k) => s + betrag(k), 0)
  const z = zahlenFuer(bestellung)

  const speichern = async () => {
    setSendet(true)
    setFehler(null)
    try {
      /*
       * Leere Zeilen fliegen raus: Ein Posten ueber null Franken ist keiner.
       * Die Herstellung bleibt auch bei null stehen – dort ist die Null eine
       * Aussage ("kostet uns nichts") und keine leere Zeile.
       *
       * `neu` ist nur eine Markierung fuer die Anzeige und gehoert nicht in
       * den Datensatz; deshalb wird jeder Posten neu aufgebaut statt kopiert.
       */
      await onSpeichern(kostenZumSpeichern(posten))
      onSchliessen()
    } catch (f) {
      setFehler(f instanceof Error ? f.message : t.zSpeichernSchiefgelaufen)
      setSendet(false)
    }
  }

  return (
    <div className="kosten">
      <table className="kosten__tabelle">
        <thead>
          <tr>
            <th>{t.zPostenSpalte}</th>
            <th>{t.zBetrag}</th>
            <th>{t.zAusgelegtVon}</th>
            <th>{t.zZurueckbezahlt}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {posten.map((k) => (
            <tr key={k.id}>
              <td data-titel={t.zPostenSpalte}>
                {k.art === 'weiteres' ? (
                  <input
                    className="input kosten__text"
                    value={k.bezeichnung ?? ''}
                    placeholder={t.zWofuer}
                    onChange={(e) => aendere(k.id, { bezeichnung: e.target.value })}
                  />
                ) : (
                  <>
                    {TITEL[k.art]}
                    {k.neu && <span className="kosten__marke">{t.zGeschaetzt}</span>}
                  </>
                )}
              </td>
              <td data-titel={t.zBetrag}>
                <input
                  className="input kosten__betrag"
                  inputMode="decimal"
                  placeholder="12'345.67"
                  value={k.betragText}
                  onChange={(e) => aendere(k.id, { betragText: e.target.value })}
                />
              </td>
              <td data-titel={t.zAusgelegtVon}>
                <select
                  className="input kosten__wer"
                  value={k.traeger}
                  onChange={(e) => aendere(k.id, { traeger: e.target.value as Beteiligter })}
                >
                  {KOSTEN_TRAEGER.map((t) => <option key={t} value={t}>{beteiligte[t]}</option>)}
                </select>
              </td>
              <td data-titel={t.zZurueckbezahlt}>
                <input
                  type="checkbox"
                  checked={k.bezahlt === true}
                  onChange={(e) => aendere(k.id, { bezahlt: e.target.checked })}
                />
              </td>
              <td>
                {k.art === 'weiteres' && (
                  <button type="button" className="btn btn--quiet btn--sm"
                    onClick={() => setPosten((l) => l.filter((x) => x.id !== k.id))}>
                    {t.zWeg}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="kosten__fuss">
        <button type="button" className="btn btn--ghost btn--sm"
          onClick={() => setPosten((l) => [...l, weitererKostenposten()])}>
          {t.zWeitereKosten}
        </button>
        <p className="kosten__summe">
          {fuelle(t.zKostenZusammenzug, {
            kosten: formatChf(summe),
            erloes: formatChf(z.erloesChf),
            marge: formatChf(z.erloesChf - summe),
          })}
        </p>
      </div>

      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      <div className="kosten__knoepfe">
        <button type="button" className="btn btn--sm" disabled={sendet} onClick={speichern}>
          {sendet ? t.zWirdGespeichert : t.zKostenSpeichern}
        </button>
        <button type="button" className="btn btn--quiet btn--sm" onClick={onSchliessen}>
          {t.abbrechen}
        </button>
      </div>
    </div>
  )
}
