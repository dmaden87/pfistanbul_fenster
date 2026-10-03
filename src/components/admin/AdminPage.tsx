import { useCallback, useEffect, useState } from 'react'
import type { AdminStatus, Bestellung, BestellAenderung } from '../../types'
import { ABSCHNITTE, nachAbschnitt, type Abschnitt } from '../../lib/phasen'
import type { AdminTexte } from './sprache'
import {
  abmelden,
  adminStatus,
  aendereBestellung,
  anmelden,
  demoZuruecksetzen,
  entferneBestellung,
  ladeBestellungen,
} from '../../lib/adminApi'
import { shopConfig } from '../../data/shopConfig'
import { BestellKarte } from './BestellKarte'
import { Bestellauftrag } from './Bestellauftrag'
import { Offerte } from './Offerte'
import { NeueBestellung } from './NeueBestellung'
import { SprachRahmen } from './SprachRahmen'
import { useSprache } from './sprache'
import './AdminPage.css'

interface AdminPageProps {
  onBack: () => void
}

/**
 * Die Uebersicht folgt dem Workflow des Betreibers: die Phasen in seiner
 * Reihenfolge, dazu das Archiv. Jede Bestellung steht in genau einem
 * Abschnitt, und zwar in dem, den ihr `status` nennt. Nichts wird mehr
 * abgeleitet – jede Bewegung ist ein Klick, auf der Karte oder auf der
 * Runde.
 *
 * Der vorige Aufbau gruppierte nach "wer ist dran" (bei dir, bei Bora, beim
 * Kunden). Das war fuer den einen Menschen, der hier arbeitet,
 * unuebersichtlich: Er denkt in seinem Ablauf je Bestellung.
 */
function abschnittTexte(t: AdminTexte): Record<Abschnitt, { titel: string; satz: string }> {
  return {
    neu: { titel: t.phaseNeu, satz: t.phaseNeuSatz },
    klaerung: { titel: t.phaseKlaerung, satz: t.phaseKlaerungSatz },
    offerte: { titel: t.phaseOfferte, satz: t.phaseOfferteSatz },
    zusage: { titel: t.phaseZusage, satz: t.phaseZusageSatz },
    bestellen: { titel: t.phaseBestellen, satz: t.phaseBestellenSatz },
    bora: { titel: t.phaseBora, satz: t.phaseBoraSatz },
    ausliefern: { titel: t.phaseAusliefern, satz: t.phaseAusliefernSatz },
    archiv: { titel: t.phaseArchiv, satz: t.phaseArchivSatz },
  }
}

/**
 * Nur im Backlog "Bereit zum Bestellen" gibt es ein Kaestchen: Dort lassen
 * sich mehrere zugesagte Auftraege zu einem Paket zusammenfuehren – ein
 * Etikett, ein gemeinsamer Bestelltalon, eine Sendung. Sonst wird jeder
 * Auftrag fuer sich gefuehrt.
 *
 * Genau deshalb ist der Backlog eine eigene Phase: Gebuendelt wird, was noch
 * nicht bei Bora liegt. Was dort liegt, laesst sich nicht mehr buendeln.
 */
const MIT_KAESTCHEN: readonly Abschnitt[] = ['bestellen']

/** Das naechste freie Paket-Etikett: P-<Jahr>-<laufende Nummer>. */
function naechstesPaket(bestellungen: Bestellung[]): string {
  const jahr = new Date().getFullYear()
  const praefix = `P-${jahr}-`
  const hoechste = bestellungen
    .map((b) => b.paket ?? '')
    .filter((p) => p.startsWith(praefix))
    .map((p) => Number(p.slice(praefix.length)))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${praefix}${String(hoechste + 1).padStart(2, '0')}`
}

/** Was gerade als Talon offen ist: welche Auftraege, als Anfrage oder Bestellung. */
interface OffenesBlatt {
  ids: string[]
  art: 'anfrage' | 'bestellung'
  nummer: string
}

/**
 * Der Adminbereich. Die aeussere Huelle setzt nur den Sprachrahmen; die
 * Maske selbst steckt in AdminMaske, damit sie den Rahmen benutzen kann.
 */
export function AdminPage(props: AdminPageProps) {
  return (
    <SprachRahmen>
      <AdminMaske {...props} />
    </SprachRahmen>
  )
}

function AdminMaske({ onBack }: AdminPageProps) {
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([])
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [sendet, setSendet] = useState(false)
  const [erfassen, setErfassen] = useState(false)
  /** Welche Auftraege fuers naechste Paket angekreuzt sind. */
  const [auswahl, setAuswahl] = useState<string[]>([])
  /** Welcher Talon gerade offen ist. */
  const [blatt, setBlatt] = useState<OffenesBlatt | null>(null)
  /** Welche Bestellung gerade als Offerte angezeigt wird. */
  const [offeneOfferte, setOffeneOfferte] = useState<string | null>(null)
  /* Nur das Archiv startet zugeklappt: Die Phasen sind die Arbeit. */
  const [zugeklappt, setZugeklappt] = useState<Abschnitt[]>(['archiv'])
  const { sprache, setzeSprache, t } = useSprache()

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
          <p className="admin__laedt">{t.laedt}</p>
        </div>
      </section>
    )
  }

  if (status && !status.eingerichtet) {
    return (
      <section className="section admin">
        <div className="shell admin__schmal">
          <h1>{t.adminbereich}</h1>
          <p className="admin__hinweis">{t.nochNichtEingerichtet}</p>
          <ul className="admin__liste">
            {!status.speicher && (
              <li>
                <strong>{t.speicherFehlt}</strong> {t.speicherFehltSatz}
              </li>
            )}
            {!status.passwort && (
              <li>
                <strong>{t.passwortFehlt}</strong> {t.passwortFehltSatz}
              </li>
            )}
            <li>{t.neuDeployen}</li>
          </ul>
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            {t.zurueckZurSeite}
          </button>
        </div>
      </section>
    )
  }

  if (!status?.angemeldet) {
    return (
      <section className="section admin">
        <div className="shell admin__schmal">
          <h1>{t.adminbereich}</h1>
          <form className="admin__anmeldung" onSubmit={handleAnmelden}>
            <div className="field">
              <label className="field__label" htmlFor="admin-passwort">
                {t.passwort}
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
              {sendet ? t.wirdGeprueft : t.anmelden}
            </button>
          </form>
          <button type="button" className="btn btn--quiet" onClick={onBack}>
            {t.zurueckZurSeite}
          </button>
        </div>
      </section>
    )
  }

  const demo = status.demo === true
  const gruppen = nachAbschnitt(bestellungen)
  const zuTun = bestellungen.length - gruppen.get('archiv')!.length
  const gewaehlte = bestellungen.filter((b) => auswahl.includes(b.id))

  const waehle = (id: string, an: boolean) =>
    setAuswahl((liste) => (an ? [...liste, id] : liste.filter((x) => x !== id)))

  /** Die Auftraege, die mit diesem dasselbe Paket-Etikett tragen (ihn selbst eingeschlossen). */
  const paketVon = (b: Bestellung): Bestellung[] =>
    b.paket ? bestellungen.filter((x) => x.paket === b.paket) : [b]

  /**
   * Zusammenfuehren: Alle Gewaehlten bekommen dasselbe Etikett, dann geht
   * der gemeinsame Bestelltalon auf. Das Etikett ist der ganze Zustand –
   * es gibt kein Paket ausser den Auftraegen, die es tragen.
   */
  const zusammenfuehren = async () => {
    const etikett = naechstesPaket(bestellungen)
    try {
      /*
       * Nur Auftraege ohne Paket. Das Kaestchen gibt es fuer die anderen
       * gar nicht; der Riegel steht hier ein zweites Mal, weil eine Auswahl
       * eine Weile im Zustand liegen kann – etwa wenn inzwischen ein anderes
       * Fenster denselben Auftrag gebuendelt hat.
       */
      const frisch = gewaehlte.filter((x) => !x.paket)
      for (const b of frisch) await handleAendern(b.id, { paket: etikett })
      setAuswahl([])
      // Auf den Talon kommt, was das Etikett wirklich bekommen hat.
      setBlatt({ ids: frisch.map((b) => b.id), art: 'bestellung', nummer: etikett })
    } catch {
      // handleAendern hat den Fehler schon angezeigt und neu geladen.
    }
  }

  const offerte = offeneOfferte ? bestellungen.find((b) => b.id === offeneOfferte) : undefined
  if (offerte) {
    return (
      <section className="section">
        <div className="shell">
          <Offerte bestellung={offerte} onZurueck={() => setOffeneOfferte(null)} />
        </div>
      </section>
    )
  }

  if (blatt) {
    // Bewusst ohne die Klasse "admin": Deren Ueberschriftenregel ist genauso
    // spezifisch wie die des Blatts und wird spaeter geladen – der Talon
    // bekaeme die Anzeigeschrift der Webseite.
    const drauf = bestellungen.filter((b) => blatt.ids.includes(b.id))
    return (
      <section className="section">
        <div className="shell">
          <Bestellauftrag bestellungen={drauf} art={blatt.art} nummer={blatt.nummer} onZurueck={() => setBlatt(null)} />
        </div>
      </section>
    )
  }

  return (
    <section className="section admin">
      <div className="shell">
        <div className="admin__kopf">
          <div>
            <h1>{t.bestellungen}</h1>
            <p className="admin__zusammenfassung">
              {bestellungen.length} {t.insgesamt} · {zuTun} {t.zuTun}
            </p>
          </div>
          <div className="admin__werkzeuge">
            {/*
              Der Sprachschalter steht ganz vorn und nicht in einem Menue:
              Ufuk soll ihn beim ersten Blick finden, nicht suchen. Die Wahl
              bleibt ueber Besuche hinweg gespeichert.
            */}
            <div className="admin__sprache" role="group" aria-label={t.sprache}>
              <button
                type="button"
                className={sprache === 'deutsch' ? 'admin__sprache-knopf admin__sprache-knopf--an' : 'admin__sprache-knopf'}
                aria-pressed={sprache === 'deutsch'}
                onClick={() => setzeSprache('deutsch')}
              >
                DE
              </button>
              <button
                type="button"
                className={sprache === 'tuerkisch' ? 'admin__sprache-knopf admin__sprache-knopf--an' : 'admin__sprache-knopf'}
                aria-pressed={sprache === 'tuerkisch'}
                onClick={() => setzeSprache('tuerkisch')}
              >
                TR
              </button>
            </div>
            <button type="button" className="btn" onClick={() => setErfassen((e) => !e)}>
              {erfassen ? t.erfassenSchliessen : t.bestellungErfassen}
            </button>
            <button type="button" className="btn btn--ghost" onClick={laden}>
              {t.aktualisieren}
            </button>
            {!demo && (
              <button
                type="button"
                className="btn btn--quiet"
                onClick={async () => {
                  await abmelden()
                  setStatus((s) => (s ? { ...s, angemeldet: false } : s))
                  setBestellungen([])
                }}
              >
                {t.abmelden}
              </button>
            )}
            <button type="button" className="btn btn--quiet" onClick={onBack}>
              {t.zurSeite}
            </button>
          </div>
        </div>

        {fehler && <p className="form-status form-status--error">{fehler}</p>}

        {/*
          Der Balken der Testumgebung. Er steht ueber der Liste und nicht in
          einer Ecke: Wer hier arbeitet, soll keinen Moment glauben, er sehe
          echte Bestellungen – und umgekehrt soll auf der echten Seite nie
          dieser Balken stehen koennen. Die Bedingung dafuer trifft allein der
          Server, siehe api/_demo.ts.
        */}
        {demo && (
          <div className="admin__demo">
            <div>
              <strong>{t.demoTitel}</strong>
              <p className="admin__detail">{t.demoSatz}</p>
            </div>
            <button
              type="button"
              className="btn btn--quiet"
              onClick={async () => {
                try {
                  await demoZuruecksetzen()
                  await laden()
                } catch (f) {
                  setFehler(f instanceof Error ? f.message : 'Die Beispieldaten liessen sich nicht zurücksetzen.')
                }
              }}
            >
              {t.demoZuruecksetzen}
            </button>
          </div>
        )}

        {/*
          Die Leiste erscheint erst, wenn etwas gewaehlt ist. Sie steht oben
          und nicht unten: Wer eine Runde zusammenstellt, klickt durch die
          Liste und will danach nicht ans Seitenende scrollen.
        */}
        {gewaehlte.length > 0 && (
          <div className="admin__runde">
            <span>
              <strong>{gewaehlte.length}</strong> {gewaehlte.length === 1 ? t.bestellung : t.bestellungen} {t.fuerPaketGewaehlt}
            </span>
            <button type="button" className="btn" onClick={zusammenfuehren}>
              {t.zumPaketZusammenfuehren}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setAuswahl([])}>
              {t.auswahlAufheben}
            </button>
            <span className="admin__detail">{t.paketSatz}</span>
          </div>
        )}

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

        {ABSCHNITTE.map((abschnitt) => {
          const treffer = gruppen.get(abschnitt)!
          const texte = abschnittTexte(t)[abschnitt]
          const zu = zugeklappt.includes(abschnitt)
          const nummer = abschnitt === 'archiv' ? null : ABSCHNITTE.indexOf(abschnitt) + 1

          return (
            <section className={`admin__block admin__block--${abschnitt}`} key={abschnitt}>
              <button
                type="button"
                className="admin__block-kopf"
                aria-expanded={!zu}
                onClick={() =>
                  setZugeklappt((liste) => (zu ? liste.filter((x) => x !== abschnitt) : [...liste, abschnitt]))
                }
              >
                <h2>
                  {nummer !== null && <span className="admin__phase-nummer">{nummer}</span>}
                  {texte.titel} <span className="admin__zahl">{treffer.length}</span>
                </h2>
                <p>{texte.satz}</p>
              </button>

              {!zu && treffer.length > 0 && (
                <ul className="admin__karten">
                  {treffer.map((b) => (
                    <BestellKarte
                      key={b.id}
                      bestellung={b}
                      abschnitt={abschnitt}
                      paket={paketVon(b)}
                      montageProNetz={shopConfig.montageChf}
                      onAendern={handleAendern}
                      onLoeschen={handleLoeschen}
                      onOfferte={setOffeneOfferte}
                      onBlatt={(ids, art, nummer) => setBlatt({ ids, art, nummer })}
                      gewaehlt={auswahl.includes(b.id)}
                      /*
                        Kein Kaestchen, wenn der Auftrag schon ein Paket
                        traegt: Ein zweites Zusammenfuehren schriebe ihm ein
                        neues Etikett und riss ihn damit still aus dem alten
                        Paket heraus – die anderen Auftraege blieben unter der
                        alten Kennung zurueck, und auf zwei Talons stuenden
                        Netze, die in derselben Kiste liegen. Wer umpacken
                        will, nimmt ihn erst aus dem Paket.
                      */
                      onWahl={MIT_KAESTCHEN.includes(abschnitt) && !b.paket ? waehle : undefined}
                    />
                  ))}
                </ul>
              )}

              {!zu && treffer.length === 0 && <p className="admin__leer">{t.nichtsHier}</p>}
            </section>
          )
        })}
      </div>
    </section>
  )
}
