import { useState } from 'react'
import type { Bestellung, BestellAenderung } from '../../types'
import { auftragAufbauen } from '../../lib/bestellauftrag'
import { formatChf } from '../../lib/format'
import { positionDetail } from './hilfen'
import { useSprache } from './sprache'

/**
 * Boras Kosten fuer EINEN Auftrag, vom Talon abgetippt.
 *
 * Je Netz der Stueckpreis, dazu Fracht und – Wochen spaeter – der Zoll fuer
 * den ganzen Auftrag. Die Zeilennummern sind dieselben wie auf dem Talon
 * dieses Auftrags, damit sich Boras Antwort ohne Suchen abschreiben laesst.
 * Eine Position mit Menge 3 hat drei Zeilen auf dem Blatt und EINEN Preis
 * je Stueck hier.
 *
 * Gearbeitet wird auf einem Entwurf, gespeichert auf Knopfdruck: Boras
 * Antworten kommen nach und nach, und ein Zwischenstand muss folgenlos
 * sein – der Stand des Auftrags aendert sich hier nie.
 */

interface KostenEditorProps {
  bestellung: Bestellung
  /** Den Zoll gibt es erst, wenn die Ware unterwegs war. */
  mitZoll: boolean
  onSpeichern: (einkauf: NonNullable<BestellAenderung['einkauf']>) => Promise<void>
  onSchliessen: () => void
}

function zahl(wert: string): number | null {
  if (wert.trim() === '') return null
  const n = Number(wert.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

export function KostenEditor({ bestellung: b, mitZoll, onSpeichern, onSchliessen }: KostenEditorProps) {
  const { t } = useSprache()
  const [preise, setPreise] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      b.positionen.map((p, i) => [p.id ?? `#${i}`, typeof p.einkaufChf === 'number' ? String(p.einkaufChf) : '']),
    ),
  )
  const [fracht, setFracht] = useState(b.lieferkostenChf === undefined ? '' : String(b.lieferkostenChf))
  const [zoll, setZoll] = useState(b.zollChf === undefined ? '' : String(b.zollChf))
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const schluessel = (i: number) => b.positionen[i].id ?? `#${i}`
  // Welche Zeilennummern des Talons zu einer Position gehoeren.
  const zeilen = auftragAufbauen([b]).zeilen
  const nummern = (positionId: string) =>
    zeilen.filter((z) => z.herkunft?.positionId === positionId).map((z) => z.nummer)

  const speichern = async () => {
    setSendet(true)
    setFehler(null)
    try {
      const jePosition: Record<string, number | null> = {}
      b.positionen.forEach((p, i) => {
        if (!p.id) return
        jePosition[p.id] = zahl(preise[schluessel(i)] ?? '')
      })
      const einkauf: NonNullable<BestellAenderung['einkauf']> = { jePosition, lieferkostenChf: zahl(fracht) }
      if (mitZoll) einkauf.zollChf = zahl(zoll)
      await onSpeichern(einkauf)
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Fehler')
    } finally {
      setSendet(false)
    }
  }

  return (
    <div className="preise">
      <div className="preise__kopf">
        <h4>{t.kostenVonBora}</h4>
        <p className="admin__detail">{t.kostenVonBoraSatz}</p>
      </div>

      <table className="netze__tabelle preise__tabelle">
        <thead>
          <tr>
            <th className="preise__zahl">{t.zeileAufTalon}</th>
            <th>{t.netzSpalte}</th>
            <th className="preise__zahl">{t.einkaufJeStueck}</th>
          </tr>
        </thead>
        <tbody>
          {b.positionen.map((p, i) => (
            <tr key={schluessel(i)}>
              <td className="preise__zahl admin__detail">{p.id ? nummern(p.id).join(', ') : '—'}</td>
              <td>
                {p.menge}× {p.bezeichnung}
                {positionDetail(p) && <span className="admin__detail"> {positionDetail(p)}</span>}
                <span className="admin__detail"> · {formatChf(p.preisChf)}</span>
              </td>
              <td className="preise__zahl">
                <input
                  className="input netze__feld preise__feld"
                  inputMode="decimal"
                  aria-label={`${t.einkaufJeStueck} ${p.bezeichnung}`}
                  value={preise[schluessel(i)] ?? ''}
                  onChange={(e) => setPreise((alt) => ({ ...alt, [schluessel(i)]: e.target.value }))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="preise__werkzeug">
        <label className="admin__termin">
          <span>{t.frachtDiesenAuftrag}</span>
          <input
            className="input netze__feld preise__feld"
            inputMode="decimal"
            aria-label={t.frachtDiesenAuftrag}
            value={fracht}
            onChange={(e) => setFracht(e.target.value)}
          />
        </label>
        {mitZoll && (
          <label className="admin__termin">
            <span>{t.zollDiesenAuftrag}</span>
            <input
              className="input netze__feld preise__feld"
              inputMode="decimal"
              aria-label={t.zollDiesenAuftrag}
              value={zoll}
              onChange={(e) => setZoll(e.target.value)}
            />
          </label>
        )}
      </div>

      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      <div className="netze__schritte">
        <button type="button" className="btn" onClick={speichern} disabled={sendet}>
          {sendet ? t.wirdGespeichert : t.kostenSpeichern}
        </button>
        <button type="button" className="btn btn--quiet" onClick={onSchliessen} disabled={sendet}>
          {t.abbrechen}
        </button>
      </div>
    </div>
  )
}
