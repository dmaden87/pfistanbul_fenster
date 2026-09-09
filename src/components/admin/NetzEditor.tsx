import { useState } from 'react'
import type { BestellPosition } from '../../types'
import { formatChf } from '../../lib/format'
import { positionenSumme } from './hilfen'

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
 */

interface Entwurf {
  menge: string
  bezeichnung: string
  breiteCm: string
  hoeheCm: string
  preisChf: string
}

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
}

function zuEntwurf(p: BestellPosition): Entwurf {
  return {
    menge: String(p.menge),
    bezeichnung: p.bezeichnung,
    breiteCm: p.breiteCm ? String(p.breiteCm) : '',
    hoeheCm: p.hoeheCm ? String(p.hoeheCm) : '',
    preisChf: String(p.preisChf),
  }
}

const LEER: Entwurf = { menge: '1', bezeichnung: '', breiteCm: '', hoeheCm: '', preisChf: '' }

function zahl(wert: string): number {
  const n = Number(wert.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function ausEntwurf(e: Entwurf): BestellPosition {
  const position: BestellPosition = {
    menge: Math.min(99, Math.max(1, Math.round(zahl(e.menge)) || 1)),
    bezeichnung: e.bezeichnung.trim(),
    // `detail` bleibt der Text fuer alles, was kein Mass ist. Sind Breite und
    // Hoehe gesetzt, zeigt die Liste ohnehin diese an.
    detail: '',
    preisChf: Math.round(zahl(e.preisChf) * 100) / 100,
  }
  const breite = Math.round(zahl(e.breiteCm))
  const hoehe = Math.round(zahl(e.hoeheCm))
  if (breite > 0) position.breiteCm = Math.min(600, breite)
  if (hoehe > 0) position.hoeheCm = Math.min(600, hoehe)
  return position
}

export function NetzEditor({
  positionen,
  montageChf,
  montageProNetz,
  onSpeichern,
  onAbbrechen,
  speichernText = 'Netze speichern',
  deaktiviert = false,
}: NetzEditorProps) {
  const [entwuerfe, setEntwuerfe] = useState<Entwurf[]>(() =>
    positionen.length > 0 ? positionen.map(zuEntwurf) : [{ ...LEER }],
  )
  const [montage, setMontage] = useState(String(montageChf))
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const aendere = (index: number, feld: keyof Entwurf, wert: string) => {
    setEntwuerfe((liste) => liste.map((e, i) => (i === index ? { ...e, [feld]: wert } : e)))
  }

  const netze = entwuerfe.map(ausEntwurf)
  const summeNetze = positionenSumme(netze)
  const summe = Math.round((summeNetze + zahl(montage)) * 100) / 100

  const speichern = async () => {
    const gefuellt = netze.filter((p) => p.bezeichnung || p.preisChf > 0 || p.breiteCm || p.hoeheCm)
    if (gefuellt.some((p) => !p.bezeichnung)) {
      setFehler('Jedes Netz braucht eine Bezeichnung – sonst weiss später niemand, welches Fenster gemeint ist.')
      return
    }
    setFehler(null)
    setSendet(true)
    try {
      await onSpeichern(gefuellt, Math.round(zahl(montage) * 100) / 100)
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Konnte nicht gespeichert werden.')
      setSendet(false)
    }
  }

  return (
    <div className="netze">
      <table className="netze__tabelle">
        <thead>
          <tr>
            <th className="netze__eng">Anz.</th>
            <th>Bezeichnung</th>
            <th className="netze__eng">Breite</th>
            <th className="netze__eng">Höhe</th>
            <th className="netze__eng">Preis</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {entwuerfe.map((e, i) => (
            <tr key={i}>
              <td>
                <input
                  className="input netze__feld"
                  inputMode="numeric"
                  aria-label={`Menge Netz ${i + 1}`}
                  value={e.menge}
                  onChange={(ev) => aendere(i, 'menge', ev.target.value)}
                />
              </td>
              <td>
                <input
                  className="input netze__feld"
                  aria-label={`Bezeichnung Netz ${i + 1}`}
                  placeholder="z. B. Schlafzimmer links"
                  value={e.bezeichnung}
                  onChange={(ev) => aendere(i, 'bezeichnung', ev.target.value)}
                />
              </td>
              <td>
                <input
                  className="input netze__feld"
                  inputMode="numeric"
                  aria-label={`Breite in cm, Netz ${i + 1}`}
                  placeholder="cm"
                  value={e.breiteCm}
                  onChange={(ev) => aendere(i, 'breiteCm', ev.target.value)}
                />
              </td>
              <td>
                <input
                  className="input netze__feld"
                  inputMode="numeric"
                  aria-label={`Höhe in cm, Netz ${i + 1}`}
                  placeholder="cm"
                  value={e.hoeheCm}
                  onChange={(ev) => aendere(i, 'hoeheCm', ev.target.value)}
                />
              </td>
              <td>
                <input
                  className="input netze__feld"
                  inputMode="decimal"
                  aria-label={`Preis pro Stück, Netz ${i + 1}`}
                  placeholder="CHF"
                  value={e.preisChf}
                  onChange={(ev) => aendere(i, 'preisChf', ev.target.value)}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="netze__weg"
                  aria-label={`Netz ${i + 1} entfernen`}
                  onClick={() => setEntwuerfe((liste) => liste.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" className="btn btn--quiet" onClick={() => setEntwuerfe((l) => [...l, { ...LEER }])}>
        Netz hinzufügen
      </button>

      <div className="netze__montage">
        <label className="field__label" htmlFor="netze-montage">
          Montage insgesamt (CHF)
        </label>
        <input
          id="netze-montage"
          className="input netze__feld"
          inputMode="decimal"
          value={montage}
          onChange={(e) => setMontage(e.target.value)}
        />
        <span className="netze__hinweis">
          {formatChf(montageProNetz)} pro Fenster. Leer lassen oder 0, wenn selbst montiert wird.
        </span>
      </div>

      <p className="netze__summe">
        <span>
          Netze {formatChf(summeNetze)}
          {zahl(montage) > 0 && ` · Montage ${formatChf(zahl(montage))}`}
        </span>
        <strong>{formatChf(summe)}</strong>
      </p>

      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      <div className="netze__schritte">
        <button type="button" className="btn" onClick={speichern} disabled={sendet || deaktiviert}>
          {sendet ? 'Wird gespeichert …' : speichernText}
        </button>
        <button type="button" className="btn btn--quiet" onClick={onAbbrechen} disabled={sendet}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}
