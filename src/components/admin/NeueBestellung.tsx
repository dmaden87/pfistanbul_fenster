import { useState } from 'react'
import type { BestellArt, BestellPosition, BestellQuelle } from '../../types'
import { erfasseBestellung } from '../../lib/adminApi'
import { QUELLEN, QUELLE_TEXT } from './hilfen'
import { NetzEditor } from './NetzEditor'

/**
 * Eine Bestellung von Hand erfassen.
 *
 * Gebraucht, weil laengst nicht alles ueber das Formular hereinkommt: Ein
 * Teil kommt ueber WhatsApp, ein Teil ueber Instagram, ein Teil beim
 * Vorbeigehen. Landet das nicht in derselben Liste, gibt es zwei Wahrheiten
 * – die Liste und den Kopf – und die zweite verliert.
 *
 * Deshalb steht die Quelle als Pflichtangabe da: Sie ist die einzige
 * Auswertung, die spaeter sagt, welcher Kanal wirklich Bestellungen bringt.
 */

interface NeueBestellungProps {
  montageProNetz: number
  onFertig: () => void
  onAbbrechen: () => void
}

const ARTEN: { wert: BestellArt; text: string }[] = [
  { wert: 'bestellung', text: 'Bestellung' },
  { wert: 'anfrage', text: 'Anfrage Sondermass' },
]

export function NeueBestellung({ montageProNetz, onFertig, onAbbrechen }: NeueBestellungProps) {
  const [art, setArt] = useState<BestellArt>('bestellung')
  const [quelle, setQuelle] = useState<BestellQuelle>('whatsapp')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [strasse, setStrasse] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [bemerkung, setBemerkung] = useState('')
  const [notiz, setNotiz] = useState('')
  const [montage, setMontage] = useState(false)

  // Ein Rueckweg genuegt: Wer ueber WhatsApp bestellt, hat oft keine
  // E-Mail-Adresse hinterlegt, und die Bestellung deswegen nicht aufzunehmen
  // waere albern. Der Server prueft dasselbe noch einmal.
  const bereit = name.trim().length > 0 && (email.trim().length > 0 || telefon.trim().length > 0)

  const anlegen = async (positionen: BestellPosition[], montageChf: number) => {
    await erfasseBestellung({
      art,
      quelle,
      // Ohne Warenkorb gibt es keine Referenz von der Seite. Das Kuerzel sagt,
      // woher der Eintrag kommt, und ist im Gespraech mit der Kundschaft
      // brauchbar: "Ihre Bestellung H-4K2P".
      referenz: `H-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      status: 'neu',
      kunde: { name, email, telefon, strasse, plz, ort, bemerkung },
      positionen,
      montage,
      montageChf,
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      notiz,
    })
    onFertig()
  }

  return (
    <section className="admin__erfassen">
      <h2>Bestellung von Hand erfassen</h2>
      <p className="admin__erfassen-satz">
        Für alles, was nicht über das Formular kommt. Landet in derselben Liste wie die Bestellungen von der Seite.
      </p>

      <div className="admin__erfassen-reihe">
        <div className="field">
          <label className="field__label" htmlFor="neu-art">
            Art
          </label>
          <select id="neu-art" className="input" value={art} onChange={(e) => setArt(e.target.value as BestellArt)}>
            {ARTEN.map((a) => (
              <option key={a.wert} value={a.wert}>
                {a.text}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="neu-quelle">
            Kam über
          </label>
          <select
            id="neu-quelle"
            className="input"
            value={quelle}
            onChange={(e) => setQuelle(e.target.value as BestellQuelle)}
          >
            {QUELLEN.map((q) => (
              <option key={q} value={q}>
                {QUELLE_TEXT[q]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin__erfassen-reihe">
        <div className="field">
          <label className="field__label" htmlFor="neu-name">
            Name
          </label>
          <input id="neu-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="neu-telefon">
            Telefon
          </label>
          <input id="neu-telefon" className="input" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="neu-email">
            E-Mail
          </label>
          <input id="neu-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="admin__erfassen-reihe">
        <div className="field">
          <label className="field__label" htmlFor="neu-strasse">
            Strasse
          </label>
          <input id="neu-strasse" className="input" value={strasse} onChange={(e) => setStrasse(e.target.value)} />
        </div>
        <div className="field field--eng">
          <label className="field__label" htmlFor="neu-plz">
            PLZ
          </label>
          <input id="neu-plz" className="input" value={plz} onChange={(e) => setPlz(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="neu-ort">
            Ort
          </label>
          <input id="neu-ort" className="input" value={ort} onChange={(e) => setOrt(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="neu-bemerkung">
          Bemerkung der Kundschaft
        </label>
        <textarea
          id="neu-bemerkung"
          className="input"
          rows={2}
          value={bemerkung}
          onChange={(e) => setBemerkung(e.target.value)}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="neu-notiz">
          Interne Notiz
        </label>
        <textarea id="neu-notiz" className="input" rows={2} value={notiz} onChange={(e) => setNotiz(e.target.value)} />
      </div>

      <label className="admin__haken">
        <input type="checkbox" checked={montage} onChange={(e) => setMontage(e.target.checked)} />
        <span>Montage durch uns</span>
      </label>

      {!bereit && (
        <p className="admin__erfassen-hinweis">
          Es fehlt der Name und ein Rückweg – E-Mail oder Telefonnummer, eines von beidem genügt.
        </p>
      )}

      <NetzEditor
        positionen={[]}
        montageChf={0}
        montageProNetz={montageProNetz}
        speichernText="Bestellung anlegen"
        deaktiviert={!bereit}
        onSpeichern={anlegen}
        onAbbrechen={onAbbrechen}
      />
    </section>
  )
}
