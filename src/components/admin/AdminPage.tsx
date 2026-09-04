import { useCallback, useEffect, useState } from 'react'
import type { AdminStatus, Bestellung, BestellStatus } from '../../types'
import { abmelden, adminStatus, anmelden, entferneBestellung, ladeBestellungen, setzeStatus } from '../../lib/adminApi'
import { formatChf } from '../../lib/format'
import './AdminPage.css'

interface AdminPageProps {
  onBack: () => void
}

/** Die drei Sektionen der Arbeitsliste, in der Reihenfolge des Ablaufs. */
const SEKTIONEN: { status: BestellStatus[]; titel: string; erklaerung: string }[] = [
  {
    status: ['neu'],
    titel: 'Neu eingegangen',
    erklaerung: 'Noch nichts unternommen. Bestellungen weiterreichen, Anfragen beantworten oder absagen.',
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

const ART_TEXT: Record<Bestellung['art'], string> = {
  bestellung: 'Bestellung',
  anfrage: 'Anfrage Sondermass',
  zahlung: 'Anfrage Zahlung',
}

function datum(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '–'
    : d.toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

/**
 * Welche Schritte von hier aus möglich sind. Vorwärts ist der Normalfall,
 * zurück steht bewusst auch offen: Wer versehentlich klickt, soll das ohne
 * Umweg über die Datenbank geraderücken können.
 */
function schritte(b: Bestellung): { status: BestellStatus; text: string; art: 'haupt' | 'still' }[] {
  switch (b.status) {
    case 'neu':
      return [
        { status: 'bestellt', text: b.art === 'bestellung' ? 'Beim Lieferanten bestellt' : 'Angenommen, bestellt', art: 'haupt' },
        { status: 'geloescht', text: b.art === 'bestellung' ? 'Storniert' : 'Abgesagt', art: 'still' },
      ]
    case 'bestellt':
      return [
        { status: 'erledigt', text: 'Ausgeliefert, erledigt', art: 'haupt' },
        { status: 'neu', text: 'Zurück zu neu', art: 'still' },
        { status: 'geloescht', text: 'Doch storniert', art: 'still' },
      ]
    default:
      return [{ status: 'bestellt', text: 'Wieder öffnen', art: 'still' }]
  }
}

export function AdminPage({ onBack }: AdminPageProps) {
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([])
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [sendet, setSendet] = useState(false)
  // Welcher Eintrag gerade nach dem zweiten Klick fragt. Endgueltiges
  // Loeschen soll nicht aus Versehen passieren.
  const [loeschFrage, setLoeschFrage] = useState<string | null>(null)

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

  const handleLoeschen = async (id: string) => {
    setBestellungen((liste) => liste.filter((b) => b.id !== id))
    setLoeschFrage(null)
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

  return (
    <section className="section admin">
      <div className="shell">
        <div className="admin__kopf">
          <div>
            <h1>Bestellungen</h1>
            <p className="admin__zusammenfassung">
              {bestellungen.length} insgesamt, davon {offen} neu.
            </p>
          </div>
          <div className="admin__werkzeuge">
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
                    <li className={`admin__karte admin__karte--${b.status}`} key={b.id}>
                      <div className="admin__karte-kopf">
                        <span className={`admin__art admin__art--${b.art}`}>{ART_TEXT[b.art]}</span>
                        <span className="admin__referenz">{b.referenz || b.id}</span>
                        <span className="admin__datum">{datum(b.eingang)}</span>
                        {b.status === 'geloescht' && <span className="admin__marke">abgesagt</span>}
                        {b.status === 'erledigt' && <span className="admin__marke admin__marke--gut">erledigt</span>}
                      </div>

                      <div className="admin__karte-inhalt">
                        <div className="admin__kunde">
                          <strong>{b.kunde.name}</strong>
                          <a href={`mailto:${b.kunde.email}`}>{b.kunde.email}</a>
                          {b.kunde.telefon && <a href={`tel:${b.kunde.telefon}`}>{b.kunde.telefon}</a>}
                          {b.kunde.strasse && (
                            <span>
                              {b.kunde.strasse}
                              {b.kunde.plz || b.kunde.ort ? `, ${b.kunde.plz} ${b.kunde.ort}`.trimEnd() : ''}
                            </span>
                          )}
                        </div>

                        <div className="admin__positionen">
                          {b.positionen.length > 0 ? (
                            <table>
                              <tbody>
                                {b.positionen.map((p, i) => (
                                  <tr key={`${b.id}-${i}`}>
                                    <td>
                                      {p.menge}× {p.bezeichnung}
                                      {p.detail && <span className="admin__detail"> {p.detail}</span>}
                                    </td>
                                    <td className="admin__preis">{formatChf(p.preisChf * p.menge)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="admin__detail">Keine Positionen – reine Anfrage.</p>
                          )}

                          <p className="admin__summe">
                            <span>
                              {b.montage ? 'mit Montage' : 'Selbstmontage'} ·{' '}
                              {b.zahlung === 'online' ? 'online bezahlt' : 'zahlt bei Übergabe'}
                              {b.zahlungswunsch && ' · Ratenwunsch'}
                            </span>
                            <strong>{formatChf(b.summeChf)}</strong>
                          </p>
                        </div>
                      </div>

                      {b.kunde.bemerkung && <p className="admin__bemerkung">{b.kunde.bemerkung}</p>}

                      <div className="admin__schritte">
                        {schritte(b).map((s) => (
                          <button
                            key={s.status + s.text}
                            type="button"
                            className={s.art === 'haupt' ? 'btn' : 'btn btn--quiet'}
                            onClick={() => handleStatus(b.id, s.status)}
                          >
                            {s.text}
                          </button>
                        ))}

                        {/*
                          Endgueltiges Loeschen gibt es nur bei abgeschlossenen
                          Eintraegen und nur nach einer Rueckfrage. Es ist der
                          Weg, das Loeschversprechen aus der
                          Datenschutzerklaerung einzuloesen.
                        */}
                        {(b.status === 'erledigt' || b.status === 'geloescht') &&
                          (loeschFrage === b.id ? (
                            <span className="admin__loeschfrage">
                              Endgültig löschen?
                              <button type="button" className="btn btn--quiet admin__gefahr" onClick={() => handleLoeschen(b.id)}>
                                Ja, Daten entfernen
                              </button>
                              <button type="button" className="btn btn--quiet" onClick={() => setLoeschFrage(null)}>
                                Abbrechen
                              </button>
                            </span>
                          ) : (
                            <button type="button" className="btn btn--quiet admin__gefahr" onClick={() => setLoeschFrage(b.id)}>
                              Daten löschen
                            </button>
                          ))}
                      </div>
                    </li>
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
