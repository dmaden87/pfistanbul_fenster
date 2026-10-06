import { useState } from 'react'
import type { Auslage, AuslagenKategorie, Beteiligter } from '../../types'
import { beteiligte } from '../../data/kostenConfig'
import { formatChf } from '../../lib/format'

/**
 * Die laufenden Betriebskosten: Werbung, Server, Material, Fahrten.
 *
 * Was zu einer Bestellung gehoert, steht dort als Kostenposten und nicht
 * hier – sonst stuende dasselbe Geld an zwei Stellen und die Marge waere
 * zweimal belastet.
 */

const KATEGORIEN: { wert: AuslagenKategorie; titel: string }[] = [
  { wert: 'marketing', titel: 'Marketing' },
  { wert: 'infrastruktur', titel: 'Infrastruktur' },
  { wert: 'material', titel: 'Material' },
  { wert: 'werkzeug', titel: 'Werkzeug' },
  { wert: 'fahrten', titel: 'Fahrten' },
  { wert: 'sonstiges', titel: 'Sonstiges' },
]

const TRAEGER: Beteiligter[] = ['bora', 'ufuk', 'deniz']

const heute = () => new Date().toISOString().slice(0, 10)

interface Props {
  auslagen: Auslage[]
  onAnlegen: (a: Omit<Auslage, 'id' | 'erfasstAm'>) => Promise<void>
  onAendern: (id: string, teil: Partial<Auslage>) => Promise<void>
  onEntfernen: (id: string) => Promise<void>
}

export function AuslagenListe({ auslagen, onAnlegen, onAendern, onEntfernen }: Props) {
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
      setFehler(f instanceof Error ? f.message : 'Das Speichern ging schief.')
    }
    setSendet(false)
  }

  const summe = auslagen.reduce((s, a) => s + a.betragChf, 0)
  const offen = auslagen.filter((a) => !a.bezahlt).reduce((s, a) => s + a.betragChf, 0)

  return (
    <div className="zahlen__block">
      <h2>Betriebskosten</h2>
      <p className="zahlen__hinweis">
        {auslagen.length} Einträge, zusammen {formatChf(summe)} – davon {formatChf(offen)} noch
        nicht zurückbezahlt.
      </p>

      <form
        className="auslage__form"
        onSubmit={(e) => { e.preventDefault(); void anlegen() }}
      >
        <input className="input" type="date" value={am} onChange={(e) => setAm(e.target.value)} aria-label="Datum" />
        <input
          className="input auslage__text"
          value={bezeichnung}
          placeholder="Wofür?"
          aria-label="Bezeichnung"
          onChange={(e) => setBezeichnung(e.target.value)}
        />
        <select className="input" value={kategorie} aria-label="Kategorie"
          onChange={(e) => setKategorie(e.target.value as AuslagenKategorie)}>
          {KATEGORIEN.map((k) => <option key={k.wert} value={k.wert}>{k.titel}</option>)}
        </select>
        <input
          className="input auslage__betrag"
          type="number" step="0.05" min="0"
          value={betragChf}
          placeholder="CHF"
          aria-label="Betrag"
          onChange={(e) => setBetrag(e.target.value)}
        />
        <select className="input" value={traeger} aria-label="Ausgelegt von"
          onChange={(e) => setTraeger(e.target.value as Beteiligter)}>
          {TRAEGER.map((t) => <option key={t} value={t}>{beteiligte[t]}</option>)}
        </select>
        <button type="submit" className="btn btn--sm"
          disabled={sendet || !bezeichnung.trim() || !(Number(betragChf) > 0)}>
          Eintragen
        </button>
      </form>
      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      {auslagen.length > 0 && (
        <table className="zahlen__tabelle">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Wofür</th>
              <th>Kategorie</th>
              <th className="zahlen__zahl">Betrag</th>
              <th>Ausgelegt von</th>
              <th>Zurückbezahlt</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {auslagen.map((a) => (
              <tr key={a.id}>
                <td data-titel="Datum">{a.am}</td>
                <td data-titel="Wofür">{a.bezeichnung}</td>
                <td data-titel="Kategorie">{KATEGORIEN.find((k) => k.wert === a.kategorie)?.titel}</td>
                <td data-titel="Betrag" className="zahlen__zahl">{formatChf(a.betragChf)}</td>
                <td data-titel="Ausgelegt von">{beteiligte[a.traeger]}</td>
                <td data-titel="Zurückbezahlt">
                  <input
                    type="checkbox"
                    checked={a.bezahlt === true}
                    onChange={(e) => void onAendern(a.id, { bezahlt: e.target.checked })}
                  />
                </td>
                <td>
                  <button type="button" className="btn btn--quiet btn--sm"
                    onClick={() => void onEntfernen(a.id)}>
                    löschen
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
