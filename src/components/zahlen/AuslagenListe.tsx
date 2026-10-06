import { useState } from 'react'
import type { Auslage, AuslagenKategorie, Beteiligter } from '../../types'
import { beteiligte } from '../../data/kostenConfig'
import { formatChf } from '../../lib/format'
import { fuelle, useSprache } from '../admin/sprache'

/**
 * Die laufenden Betriebskosten: Werbung, Server, Material, Fahrten.
 *
 * Was zu einer Bestellung gehoert, steht dort als Kostenposten und nicht
 * hier – sonst stuende dasselbe Geld an zwei Stellen und die Marge waere
 * zweimal belastet.
 */

const KATEGORIEN: AuslagenKategorie[] =
  ['marketing', 'infrastruktur', 'material', 'werkzeug', 'fahrten', 'sonstiges']

const TRAEGER: Beteiligter[] = ['bora', 'ufuk', 'deniz']

const heute = () => new Date().toISOString().slice(0, 10)

interface Props {
  auslagen: Auslage[]
  onAnlegen: (a: Omit<Auslage, 'id' | 'erfasstAm'>) => Promise<void>
  onAendern: (id: string, teil: Partial<Auslage>) => Promise<void>
  onEntfernen: (id: string) => Promise<void>
}

export function AuslagenListe({ auslagen, onAnlegen, onAendern, onEntfernen }: Props) {
  const { t } = useSprache()
  const TITEL: Record<AuslagenKategorie, string> = {
    marketing: t.zMarketing,
    infrastruktur: t.zInfrastruktur,
    material: t.zMaterial,
    werkzeug: t.zWerkzeug,
    fahrten: t.zFahrten,
    sonstiges: t.zSonstiges,
  }
  const [am, setAm] = useState(heute())
  const [bezeichnung, setBezeichnung] = useState('')
  const [kategorie, setKategorie] = useState<AuslagenKategorie>('material')
  const [betragChf, setBetrag] = useState('')
  const [traeger, setTraeger] = useState<Beteiligter>('deniz')
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const anlegen = async () => {
    setSendet(true)
    setFehler(null)
    try {
      await onAnlegen({ am, bezeichnung, kategorie, betragChf: Number(betragChf), traeger })
      setBezeichnung('')
      setBetrag('')
    } catch (f) {
      setFehler(f instanceof Error ? f.message : t.zSpeichernSchiefgelaufen)
    }
    setSendet(false)
  }

  const summe = auslagen.reduce((s, a) => s + a.betragChf, 0)
  const offen = auslagen.filter((a) => !a.bezahlt).reduce((s, a) => s + a.betragChf, 0)

  return (
    <div className="zahlen__block">
      <h2>{t.zBetriebskostenTitel}</h2>
      <p className="zahlen__hinweis">
        {fuelle(t.zBetriebskostenSatz, {
          n: auslagen.length, summe: formatChf(summe), offen: formatChf(offen),
        })}
      </p>

      <form
        className="auslage__form"
        onSubmit={(e) => { e.preventDefault(); void anlegen() }}
      >
        <input className="input" type="date" value={am} onChange={(e) => setAm(e.target.value)} aria-label={t.zDatum} />
        <input
          className="input auslage__text"
          value={bezeichnung}
          placeholder={t.zWofuer}
          aria-label={t.zWofuer}
          onChange={(e) => setBezeichnung(e.target.value)}
        />
        <select className="input" value={kategorie} aria-label={t.zKategorie}
          onChange={(e) => setKategorie(e.target.value as AuslagenKategorie)}>
          {KATEGORIEN.map((k) => <option key={k} value={k}>{TITEL[k]}</option>)}
        </select>
        <input
          className="input auslage__betrag"
          type="number" step="0.05" min="0"
          value={betragChf}
          placeholder="CHF"
          aria-label={t.zBetrag}
          onChange={(e) => setBetrag(e.target.value)}
        />
        <select className="input" value={traeger} aria-label={t.zAusgelegtVon}
          onChange={(e) => setTraeger(e.target.value as Beteiligter)}>
          {TRAEGER.map((t) => <option key={t} value={t}>{beteiligte[t]}</option>)}
        </select>
        <button type="submit" className="btn btn--sm"
          disabled={sendet || !bezeichnung.trim() || !(Number(betragChf) > 0)}>
          {t.zEintragen}
        </button>
      </form>
      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      {auslagen.length > 0 && (
        <table className="zahlen__tabelle">
          <thead>
            <tr>
              <th>{t.zDatum}</th>
              <th>{t.zWofuer}</th>
              <th>{t.zKategorie}</th>
              <th className="zahlen__zahl">{t.zBetrag}</th>
              <th>{t.zAusgelegtVon}</th>
              <th>{t.zZurueckbezahlt}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {auslagen.map((a) => (
              <tr key={a.id}>
                <td data-titel={t.zDatum}>{a.am}</td>
                <td data-titel={t.zWofuer}>{a.bezeichnung}</td>
                <td data-titel={t.zKategorie}>{TITEL[a.kategorie]}</td>
                <td data-titel={t.zBetrag} className="zahlen__zahl">{formatChf(a.betragChf)}</td>
                <td data-titel={t.zAusgelegtVon}>{beteiligte[a.traeger]}</td>
                <td data-titel={t.zZurueckbezahlt}>
                  <input
                    type="checkbox"
                    checked={a.bezahlt === true}
                    onChange={(e) => void onAendern(a.id, { bezahlt: e.target.checked })}
                  />
                </td>
                <td>
                  <button type="button" className="btn btn--quiet btn--sm"
                    onClick={() => void onEntfernen(a.id)}>
                    {t.zLoeschen}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
