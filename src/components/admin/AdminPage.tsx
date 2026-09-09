import { useCallback, useEffect, useState } from 'react'
import type { AdminStatus, Bestellung, BestellAenderung, BestellStatus } from '../../types'
import { abmelden, adminStatus, aendereBestellung, anmelden, entferneBestellung, ladeBestellungen, setzeStatus } from '../../lib/adminApi'
import { shopConfig } from '../../data/shopConfig'
import { BestellKarte } from './BestellKarte'
import { NeueBestellung } from './NeueBestellung'
import './AdminPage.css'

interface AdminPageProps {
  onBack: () => void
}

/** Die Abschnitte der Arbeitsliste, in der Reihenfolge des Ablaufs. */
const SEKTIONEN: { status: BestellStatus[]; titel: string; erklaerung: string }[] = [
  {
    status: ['neu'],
    titel: 'Neu eingegangen',
    erklaerung: 'Noch nichts unternommen. Weiterreichen, offerieren oder absagen.',
  },
  {
    status: ['offerte'],
    titel: 'Offerte',
    erklaerung:
      'Ausmessen und offerieren. Die beiden Haken sagen, wie weit es ist – und seit wann die Offerte draussen ist.',
  },
  {
    status: ['bestellt'],
    titel: 'Beim Lieferanten bestellt',
    erklaerung: 'Läuft. Sobald wir ausgeliefert haben, hier abschliessen.',
  },
  {
    status: ['erledigt', 'geloescht'],
    titel: 'Abgeschlossen',
    erklaerung: 'Ausgeliefert oder abgesagt. Bleibt zum Nachschlagen stehen.',
  },
]

export function AdminPage({ onBack }: AdminPageProps) {
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([])
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [sendet, setSendet] = useState(false)
  const [erfassen, setErfassen] = useState(false)

  const laden = useCallback(async () => {
    setFehler(null)
    try {
      setBestellungen(await ladeBestellungen())
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Die Liste konnte nicht geladen werden.')
    }
  }, [])

  useEffect(() => {
    let aktiv = true
    adminStatus()
      .then(async (s) => {
        if (!aktiv) return
        setStatus(s)
        if (s.angemeldet) await laden()
      })
      .catch((f) => aktiv && setFehler(f instanceof Error ? f.message : 'Der Server antwortet nicht.'))
      .finally(() => aktiv && setLaedt(false))
    return () => {
      aktiv = false
    }
  }, [laden])

  const handleAnmelden = async (event: React.FormEvent) => {
    event.preventDefault()
    setSendet(true)
    setFehler(null)
    try {
      await anmelden(passwort)
      setPasswort('')
      setStatus((s) => (s ? { ...s, angemeldet: true } : s))
      await laden()
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Anmeldung fehlgeschlagen.')
    } finally {
      setSendet(false)
    }
  }

  const handleStatus = async (id: string, neu: BestellStatus) => {
    // Erst lokal umstellen, damit der Klick sofort etwas tut; bei einem Fehler
    // wird die Liste ohnehin frisch geladen.
    setBestellungen((liste) => liste.map((b) => (b.id === id ? { ...b, status: neu } : b)))
    try {
      await setzeStatus(id, neu)
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Der Status konnte nicht geändert werden.')
      await laden()
    }
  }

  /**
   * Aendert eine Bestellung und uebernimmt die Antwort des Servers, statt den
   * lokalen Stand fortzuschreiben. Der Server rechnet die Summe neu, sobald
   * Netze oder Montage angefasst werden; wer hier selbst weiterrechnete,
   * bekaeme frueher oder spaeter eine andere Zahl als die Datenbank.
   */
  const handleAendern = async (id: string, aenderung: BestellAenderung) => {
    try {
      const neuerStand = await aendereBestellung(id, aenderung)
      setBestellungen((liste) => liste.map((b) => (b.id === id ? neuerStand : b)))
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Die Änderung konnte nicht gespeichert werden.')
      await laden()
      throw f
    }
  }

  const handleLoeschen = async (id: string) => {
    setBestellungen((liste) => liste.filter((b) => b.id !== id))
    try {
      await entferneBestellung(id)
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Der Eintrag konnte nicht gelöscht werden.')
      await laden()
    }
  }

  if (laedt) {
    return (
      <section className="section admin">
        <div className="shell">
          <p className="admin__laedt">Wird geladen …</p>
        </div>
      </section>
    )
  }

  if (status && !status.eingerichtet) {
    return (
      <section className="section admin">
        <div className="shell admin__schmal">
          <h1>Adminbereich</h1>
          <p className="admin__hinweis">Der Bereich ist noch nicht fertig eingerichtet:</p>
          <ul className="admin__liste">
            {!status.speicher && (
              <li>
                <strong>Es fehlt der Speicher.</strong> In Vercel unter <em>Storage</em> ein Upstash-Redis anlegen und
                mit diesem Projekt verbinden. Die Zugangsdaten setzt Vercel danach selbst.
              </li>
            )}
            {!status.passwort && (
              <li>
                <strong>Es fehlt das Passwort.</strong> In Vercel die Umgebungsvariable <code>ADMIN_PASSWORT</code>{' '}
                anlegen – mindestens acht Zeichen, ohne <code>VITE_</code> davor, damit sie nicht im Browser landet.
              </li>
            )}
            <li>Nach beidem einmal neu deployen.</li>
          </ul>
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            Zurück zur Seite
          </button>
        </div>
      </section>
    )
  }

  if (!status?.angemeldet) {
    return (
      <section className="section admin">
        <div className="shell admin__schmal">
          <h1>Adminbereich</h1>
          <form className="admin__anmeldung" onSubmit={handleAnmelden}>
            <div className="field">
              <label className="field__label" htmlFor="admin-passwort">
                Passwort
              </label>
              <input
                id="admin-passwort"
                className="input"
                type="password"
                autoComplete="current-password"
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
              />
            </div>
            {fehler && <p className="form-status form-status--error">{fehler}</p>}
            <button type="submit" className="btn" disabled={sendet || passwort.length === 0}>
              {sendet ? 'Wird geprüft …' : 'Anmelden'}
            </button>
          </form>
          <button type="button" className="btn btn--quiet" onClick={onBack}>
            Zurück zur Seite
          </button>
        </div>
      </section>
    )
  }

  const offen = bestellungen.filter((b) => b.status === 'neu').length
  const inOfferte = bestellungen.filter((b) => b.status === 'offerte').length

  return (
    <section className="section admin">
      <div className="shell">
        <div className="admin__kopf">
          <div>
            <h1>Bestellungen</h1>
            <p className="admin__zusammenfassung">
              {bestellungen.length} insgesamt, davon {offen} neu und {inOfferte} in Offerte.
            </p>
          </div>
          <div className="admin__werkzeuge">
            <button type="button" className="btn" onClick={() => setErfassen((e) => !e)}>
              {erfassen ? 'Erfassen schliessen' : 'Bestellung erfassen'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={laden}>
              Aktualisieren
            </button>
            <button
              type="button"
              className="btn btn--quiet"
              onClick={async () => {
                await abmelden()
                setStatus((s) => (s ? { ...s, angemeldet: false } : s))
                setBestellungen([])
              }}
            >
              Abmelden
            </button>
            <button type="button" className="btn btn--quiet" onClick={onBack}>
              Zur Seite
            </button>
          </div>
        </div>

        {fehler && <p className="form-status form-status--error">{fehler}</p>}

        {erfassen && (
          <NeueBestellung
            montageProNetz={shopConfig.montageChf}
            onAbbrechen={() => setErfassen(false)}
            onFertig={async () => {
              setErfassen(false)
              await laden()
            }}
          />
        )}

        {SEKTIONEN.map((sektion) => {
          const treffer = bestellungen.filter((b) => sektion.status.includes(b.status))
          return (
            <section className="admin__sektion" key={sektion.titel}>
              <div className="admin__sektion-kopf">
                <h2>
                  {sektion.titel} <span className="admin__zahl">{treffer.length}</span>
                </h2>
                <p>{sektion.erklaerung}</p>
              </div>

              {treffer.length === 0 ? (
                <p className="admin__leer">Nichts hier.</p>
              ) : (
                <ul className="admin__karten">
                  {treffer.map((b) => (
                    <BestellKarte
                      key={b.id}
                      bestellung={b}
                      montageProNetz={shopConfig.montageChf}
                      onStatus={handleStatus}
                      onAendern={handleAendern}
                      onLoeschen={handleLoeschen}
                    />
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
