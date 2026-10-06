import { useState } from 'react'
import type { Beteiligter, Bestellung, KostenArt, KostenPosten } from '../../types'
import { beteiligte } from '../../data/kostenConfig'
import { einfuhrsteuerChf, herstellungFuer } from '../../lib/kosten'
import { formatChf } from '../../lib/format'
import { zahlenFuer } from '../../lib/pl'
import { fuelle, useSprache } from '../admin/sprache'

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

const ARTEN: KostenArt[] = ['herstellung', 'lieferung', 'mwst']

const TRAEGER: Beteiligter[] = ['bora', 'ufuk', 'deniz']

interface Props {
  bestellung: Bestellung
  onSpeichern: (kosten: KostenPosten[]) => Promise<void>
  onSchliessen: () => void
}

function neueId(): string {
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function KostenEditor({ bestellung, onSpeichern, onSchliessen }: Props) {
  const { t } = useSprache()
  const TITEL: Record<KostenArt, string> = {
    herstellung: t.zHerstellung,
    lieferung: t.zLieferkosten,
    mwst: t.zEinfuhrsteuer,
    weiteres: t.zWeitereKosten,
  }
  const geschaetzteHerstellung = herstellungFuer(bestellung.positionen)
  const vorhanden = bestellung.kosten ?? []

  /*
   * Fehlt ein fester Posten, wird er mit dem Vorschlag angelegt – aber mit
   * `neu: true` gemerkt. Die Oberflaeche zeigt daneben "geschaetzt", damit
   * niemand eine Zahl fuer gemessen haelt, die nur gerechnet ist.
   */
  const start: (KostenPosten & { neu?: boolean })[] = []
  for (const art of ARTEN) {
    const treffer = vorhanden.filter((k) => k.art === art)
    if (treffer.length > 0) { start.push(...treffer); continue }
    const betrag = art === 'herstellung' ? geschaetzteHerstellung
      : art === 'mwst' ? einfuhrsteuerChf(geschaetzteHerstellung)
      : 0
    start.push({ id: neueId(), art, betragChf: betrag, traeger: 'bora', erfasstAm: '', neu: true })
  }
  start.push(...vorhanden.filter((k) => k.art === 'weiteres'))

  const [posten, setPosten] = useState(start)
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const aendere = (id: string, teil: Partial<KostenPosten>) =>
    setPosten((liste) => liste.map((k) => (k.id === id ? { ...k, ...teil } : k)))

  const summe = posten.reduce((s, k) => s + (Number(k.betragChf) || 0), 0)
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
      await onSpeichern(posten
        .filter((k) => Number(k.betragChf) > 0 || k.art === 'herstellung')
        .map((k) => ({
          id: k.id,
          art: k.art,
          ...(k.bezeichnung ? { bezeichnung: k.bezeichnung } : {}),
          betragChf: Number(k.betragChf) || 0,
          traeger: k.traeger,
          ...(k.bezahlt ? { bezahlt: true } : {}),
          ...(k.am ? { am: k.am } : {}),
          erfasstAm: k.erfasstAm,
        })))
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
                  type="number"
                  step="0.05"
                  min="0"
                  value={k.betragChf}
                  onChange={(e) => aendere(k.id, { betragChf: Number(e.target.value) })}
                />
              </td>
              <td data-titel={t.zAusgelegtVon}>
                <select
                  className="input kosten__wer"
                  value={k.traeger}
                  onChange={(e) => aendere(k.id, { traeger: e.target.value as Beteiligter })}
                >
                  {TRAEGER.map((t) => <option key={t} value={t}>{beteiligte[t]}</option>)}
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
          onClick={() => setPosten((l) => [...l,
            { id: neueId(), art: 'weiteres', bezeichnung: '', betragChf: 0, traeger: 'deniz', erfasstAm: '' }])}>
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
