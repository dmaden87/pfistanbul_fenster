import { useState } from 'react'
import type { BestellArt, BestellPosition, BestellQuelle } from '../../types'
import { erfasseBestellung } from '../../lib/adminApi'
import { QUELLEN, quelleText } from './hilfen'
import { NetzEditor } from './NetzEditor'
import { useSprache } from './sprache'

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
  const { t } = useSprache()
  const arten: { wert: BestellArt; text: string }[] = [
    { wert: 'bestellung', text: t.artBestellung },
    { wert: 'anfrage', text: t.artAnfrage },
  ]

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
      <h2>{t.vonHandErfassen}</h2>
      <p className="admin__erfassen-satz">{t.vonHandSatz}</p>

      <div className="admin__erfassen-reihe">
        <div className="field">
          <label className="field__label" htmlFor="neu-art">
            {t.art}
          </label>
          <select id="neu-art" className="input" value={art} onChange={(e) => setArt(e.target.value as BestellArt)}>
            {arten.map((a) => (
              <option key={a.wert} value={a.wert}>
                {a.text}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="neu-quelle">
            {t.kamUeber}
          </label>
          <select
            id="neu-quelle"
            className="input"
            value={quelle}
            onChange={(e) => setQuelle(e.target.value as BestellQuelle)}
          >
            {QUELLEN.map((q) => (
              <option key={q} value={q}>
                {quelleText(q, t)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin__erfassen-reihe">
        <div className="field">
          <label className="field__label" htmlFor="neu-name">
            {t.name}
          </label>
          <input id="neu-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="neu-telefon">
            {t.telefon}
          </label>
          <input id="neu-telefon" className="input" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="neu-email">
            {t.email}
          </label>
          <input id="neu-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="admin__erfassen-reihe">
        <div className="field">
          <label className="field__label" htmlFor="neu-strasse">
            {t.strasse}
          </label>
          <input id="neu-strasse" className="input" value={strasse} onChange={(e) => setStrasse(e.target.value)} />
        </div>
        <div className="field field--eng">
          <label className="field__label" htmlFor="neu-plz">
            {t.plz}
          </label>
          <input id="neu-plz" className="input" value={plz} onChange={(e) => setPlz(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="neu-ort">
            {t.ort}
          </label>
          <input id="neu-ort" className="input" value={ort} onChange={(e) => setOrt(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="neu-bemerkung">
          {t.bemerkungKundschaft}
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
          {t.interneNotiz}
        </label>
        <textarea id="neu-notiz" className="input" rows={2} value={notiz} onChange={(e) => setNotiz(e.target.value)} />
      </div>

      <label className="admin__haken">
        <input type="checkbox" checked={montage} onChange={(e) => setMontage(e.target.checked)} />
        <span>{t.montageDurchUns}</span>
      </label>

      {!bereit && (
        <p className="admin__erfassen-hinweis">{t.fehltNameRueckweg}</p>
      )}

      <NetzEditor
        positionen={[]}
        montageChf={0}
        montageProNetz={montageProNetz}
        speichernText={t.bestellungAnlegen}
        deaktiviert={!bereit}
        onSpeichern={anlegen}
        onAbbrechen={onAbbrechen}
      />
    </section>
  )
}
