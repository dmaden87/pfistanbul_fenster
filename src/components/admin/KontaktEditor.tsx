import { useState } from 'react'
import type { Bestellung, BestellAenderung } from '../../types'
import { useSprache } from './sprache'

/**
 * Die Kontaktdaten einer Bestellung aendern - in jeder Phase.
 *
 * WARUM OHNE PHASENBEDINGUNG: Eine Adresse ist kein Zustand des Auftrags,
 * sondern eine Angabe ueber einen Menschen. Angaben sind falsch oder
 * veralten, und zwar unabhaengig davon, wie weit der Auftrag ist. Der
 * Tippfehler in der Mailadresse faellt auf, wenn die Offerte zurueckkommt;
 * die Hausnummer, wenn jemand vor dem falschen Haus steht; der Nachname,
 * wenn die Quittung gedruckt wird - also lange nach der Uebergabe. Jede
 * Phase, in der die Adresse einfriert, zwingt dazu, die richtige im Kopf
 * oder auf einem zweiten Zettel zu fuehren.
 *
 * ES GEHT NUR, WAS SICH GEAENDERT HAT, UEBER DIE LEITUNG. Der Server fuegt
 * feldweise zusammen, und wer nur den Namen berichtigt, soll nicht die
 * Adresse mitschicken - sonst ueberschreibt ein alter Formularstand die
 * Angaben, die inzwischen jemand anders nachgetragen hat.
 *
 * DIE BEMERKUNG FEHLT HIER MIT ABSICHT. Sie sind die Worte der Kundschaft
 * aus dem Bestellformular. Fuer eigene Gedanken gibt es die interne Notiz;
 * fremde Aussagen umzuschreiben ist etwas anderes als einen Tippfehler zu
 * berichtigen.
 */

type Feld = 'name' | 'email' | 'telefon' | 'strasse' | 'plz' | 'ort'

const FELDER: Feld[] = ['name', 'email', 'telefon', 'strasse', 'plz', 'ort']

interface KontaktEditorProps {
  bestellung: Bestellung
  onSpeichern: (aenderung: BestellAenderung) => Promise<void>
  onAbbrechen: () => void
}

export function KontaktEditor({ bestellung: b, onSpeichern, onAbbrechen }: KontaktEditorProps) {
  const { t } = useSprache()
  const [werte, setWerte] = useState<Record<Feld, string>>({
    name: b.kunde.name ?? '',
    email: b.kunde.email ?? '',
    telefon: b.kunde.telefon ?? '',
    strasse: b.kunde.strasse ?? '',
    plz: b.kunde.plz ?? '',
    ort: b.kunde.ort ?? '',
  })
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const beschriftung: Record<Feld, string> = {
    name: t.kontaktName,
    email: t.kontaktEmail,
    telefon: t.kontaktTelefon,
    strasse: t.kontaktStrasse,
    plz: t.kontaktPlz,
    ort: t.kontaktOrt,
  }

  const geaendert = FELDER.filter((f) => werte[f].trim() !== (b.kunde[f] ?? ''))

  /*
   * DIESELBEN ZWEI REGELN WIE AUF DEM SERVER, nur frueher. Der Server weist
   * beides ohnehin ab; hier steht es, bevor jemand speichert, damit der
   * Hinweis am Feld klebt statt als Fehlermeldung ueber der ganzen Liste.
   */
  const ohneNamen = werte.name.trim() === ''
  const ohneRueckweg = werte.email.trim() === '' && werte.telefon.trim() === ''

  const speichern = async () => {
    if (ohneNamen) return setFehler(t.kontaktOhneName)
    if (ohneRueckweg) return setFehler(t.kontaktOhneRueckweg)
    if (geaendert.length === 0) return onAbbrechen()
    setSendet(true)
    setFehler(null)
    try {
      await onSpeichern({
        kunde: Object.fromEntries(geaendert.map((f) => [f, werte[f].trim()])),
      })
      onAbbrechen()
    } catch {
      /* Die Meldung des Servers steht oben in der Liste; das Formular bleibt
         offen, damit das Getippte nicht verloren geht. */
      setSendet(false)
    }
  }

  return (
    <div className="admin__kontakt-editor">
      <p className="admin__kontakt-titel">{t.kontaktBearbeiten}</p>
      <div className="admin__kontakt-felder">
        {FELDER.map((f) => (
          <label className="field" key={f} htmlFor={`kontakt-${f}-${b.id}`}>
            <span className="field__label">{beschriftung[f]}</span>
            <input
              id={`kontakt-${f}-${b.id}`}
              className="input"
              value={werte[f]}
              inputMode={f === 'telefon' || f === 'plz' ? 'numeric' : undefined}
              type={f === 'email' ? 'email' : 'text'}
              onChange={(e) => setWerte((w) => ({ ...w, [f]: e.target.value }))}
            />
          </label>
        ))}
      </div>

      {fehler && <p className="admin__kontakt-fehler">{fehler}</p>}

      <div className="admin__karte-knoepfe">
        <button type="button" className="btn" onClick={speichern} disabled={sendet}>
          {sendet ? t.wirdGespeichert : t.speichern}
        </button>
        <button type="button" className="btn btn--quiet" onClick={onAbbrechen} disabled={sendet}>
          {t.abbrechen}
        </button>
      </div>
    </div>
  )
}
