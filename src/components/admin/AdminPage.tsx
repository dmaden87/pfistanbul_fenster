import { useCallback, useEffect, useState } from 'react'
import type { AdminStatus, Bestellung, BestellAenderung, BestellPosition, Lieferung } from '../../types'
import { BLOCK_VON, SCHRITTE, nachSchritt, rundeFuer, type Arbeitsschritt, type Block } from '../../lib/arbeitsschritt'
import type { AdminTexte } from './sprache'
import { abmelden, adminStatus, aendereBestellung, anmelden, entferneBestellung, ladeBestellungen } from '../../lib/adminApi'
import { shopConfig } from '../../data/shopConfig'
import { BestellKarte } from './BestellKarte'
import { LieferungSeite } from './LieferungSeite'
import { Offerte } from './Offerte'
import {
  ladeLieferungen,
  lieferungAendern,
  lieferungAnlegen,
  lieferungEntfernen,
  type LieferungAenderung,
} from '../../lib/lieferungApi'
import { NeueBestellung } from './NeueBestellung'
import { SprachRahmen } from './SprachRahmen'
import { useSprache } from './sprache'
import './AdminPage.css'

interface AdminPageProps {
  onBack: () => void
}

function standTexte(t: AdminTexte): Record<Lieferung['status'], string> {
  return {
    entwurf: t.standEntwurf,
    angefragt: t.standAngefragt,
    preise: t.standPreise,
    bestellt: t.standBestellt,
    geliefert: t.standGeliefert,
  }
}

/**
 * Die Arbeitsliste, gegliedert nach WESSEN PROBLEM etwas gerade ist.
 *
 * Frueher standen hier vier Abschnitte nach Status – "neu", "Offerte",
 * "beim Lieferanten bestellt", "abgeschlossen". Das Problem war nicht die
 * Zahl, sondern dass sie zwei verschiedene Fragen vermischten: Wo steht der
 * Kunde, und wo steht die Ware? Eine Bestellung, fuer die gerade eine
 * Preisanfrage bei Bora lief, stand unverdrossen unter "neu eingegangen".
 *
 * Jetzt entscheidet `arbeitsschritt()`, und die Bloecke sagen, wer am Zug
 * ist. Der erste ist die Arbeitsliste; die beiden mittleren sind Wartezimmer
 * und deshalb zugeklappt. Wer nichts tun kann, soll auch nichts sehen
 * muessen – aber wissen, dass es laeuft.
 */
const BLOCK_FOLGE: Block[] = ['beiDir', 'beimLieferanten', 'beimKunden', 'archiv']

function blockTexte(t: AdminTexte): Record<Block, { titel: string; satz: string }> {
  return {
    beiDir: { titel: t.blockBeiDir, satz: t.blockBeiDirSatz },
    beimLieferanten: { titel: t.blockBeimLieferanten, satz: t.blockBeimLieferantenSatz },
    beimKunden: { titel: t.blockBeimKunden, satz: t.blockBeimKundenSatz },
    archiv: { titel: t.blockArchiv, satz: t.blockArchivSatz },
  }
}

/** Titel und erklaerender Satz je Abschnitt. Ohne Satz bleibt er weg. */
function schrittTexte(t: AdminTexte): Record<Arbeitsschritt, { titel: string; satz?: string }> {
  return {
    neu: { titel: t.schrittNeuTitel, satz: t.schrittNeuSatz },
    offerteRechnen: { titel: t.schrittOfferteRechnenTitel, satz: t.schrittOfferteRechnenSatz },
    bereitZuBestellen: { titel: t.schrittBereitTitel, satz: t.schrittBereitSatz },
    ausliefern: { titel: t.schrittAusliefernTitel, satz: t.schrittAusliefernSatz },
    zahlungOffen: { titel: t.schrittZahlungOffenTitel, satz: t.schrittZahlungOffenSatz },
    anfrageLaeuft: { titel: t.schrittAnfrageLaeuftTitel },
    beimLieferanten: { titel: t.schrittBeimLieferantenTitel },
    offerteDraussen: { titel: t.schrittOfferteDraussenTitel },
    abgeschlossen: { titel: t.schrittAbgeschlossenTitel },
    abgesagt: { titel: t.schrittAbgesagtTitel },
  }
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
  // Welche Bestellungen in die naechste Lieferrunde gehen. Die Runde wird von
  // Hand zusammengestellt und nicht aus dem Status abgeleitet: Der Auftrag
  // entsteht, BEVOR etwas als "beim Lieferanten bestellt" gilt.
  const [runde, setRunde] = useState<string[]>([])
  const [lieferungen, setLieferungen] = useState<Lieferung[]>([])
  /** Welche Lieferrunde gerade offen ist. */
  const [offeneRunde, setOffeneRunde] = useState<string | null>(null)
  /** Welche Bestellung gerade als Offerte angezeigt wird. */
  const [offeneOfferte, setOffeneOfferte] = useState<string | null>(null)
  /*
   * Die Wartezimmer starten zugeklappt: Dort ist nichts zu tun, und der Platz
   * gehoert der Arbeitsliste. Das Archiv ebenso.
   */
  const [zugeklappt, setZugeklappt] = useState<Block[]>(['beimLieferanten', 'beimKunden', 'archiv'])
  const { sprache, setzeSprache, t } = useSprache()

  const laden = useCallback(async () => {
    setFehler(null)
    try {
      // Beides zusammen, und nicht nacheinander: Ohne die Runden weiss die
      // Uebersicht nicht, wo die Ware steht – `arbeitsschritt()` braucht
      // beide Seiten, sonst stuenden alle Bestellungen kurz an der falschen
      // Stelle.
      const [b, l] = await Promise.all([ladeBestellungen(), ladeLieferungen()])
      setBestellungen(b)
      setLieferungen(l)
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

  /*
   * Einmal gruppieren, nicht einmal je Abschnitt. Die Zuordnung liest die
   * Runden mit, und das je Karte zu wiederholen waere bei zehn Runden zehnmal
   * dieselbe Suche.
   */
  const gruppen = nachSchritt(bestellungen, lieferungen)
  const zuTun = (['neu', 'offerteRechnen', 'bereitZuBestellen', 'ausliefern', 'zahlungOffen'] as const).reduce(
    (n, sch) => n + gruppen.get(sch)!.length,
    0,
  )
  const gewaehlte = bestellungen.filter((b) => runde.includes(b.id))

  const waehle = (id: string, an: boolean) =>
    setRunde((liste) => (an ? [...liste, id] : liste.filter((x) => x !== id)))

  const handleLieferung = async (id: string, aenderung: LieferungAenderung) => {
    const { lieferung, einkauf, ohneZusage } = await lieferungAendern(id, aenderung)
    setLieferungen((liste) => liste.map((l) => (l.id === id ? lieferung : l)))
    /*
     * Nachgeladen wird nur, wenn der Server wirklich Bestellungen angefasst
     * hat: beim Herausnehmen, beim Aussortieren ohne Zusage und wenn Boras
     * Preise zurueckgeschrieben wurden. Ein blosser Statuswechsel der Runde
     * aendert keine Bestellung mehr – die Uebersicht liest den Stand der
     * Ware direkt aus der Runde, die hier gerade neu gesetzt wurde.
     */
    if (aenderung.entfernen || (einkauf ?? 0) > 0 || (ohneZusage?.length ?? 0) > 0) {
      setBestellungen(await ladeBestellungen())
    }
  }

  /**
   * Verwirft eine Runde. Die Bestellungen bleiben, wo sie sind – auch ihr
   * Status. Eine Ruecknahme koennte einen Stand ueberschreiben, den jemand
   * inzwischen von Hand gesetzt hat.
   */
  const handleVerwerfen = async (id: string) => {
    await lieferungEntfernen(id)
    setLieferungen((liste) => liste.filter((l) => l.id !== id))
    setOffeneRunde(null)
  }

  /** Schreibt geaenderte Netze aus der Rundentabelle in die Bestellung. */
  const handlePositionen = async (bestellungId: string, positionen: BestellPosition[]) => {
    const neuerStand = await aendereBestellung(bestellungId, { positionen })
    setBestellungen((liste) => liste.map((b) => (b.id === bestellungId ? neuerStand : b)))
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

  const offeneLieferung = offeneRunde ? lieferungen.find((l) => l.id === offeneRunde) : undefined
  if (offeneLieferung) {
    // Bewusst ohne die Klasse "admin": Deren Ueberschriftenregel ist genauso
    // spezifisch wie die des Blatts und wird spaeter geladen – der Auftrag
    // bekaeme die Anzeigeschrift der Webseite. Der Produzent liest Zahlen,
    // dafuer ist eine Serifenschrift die falsche Wahl.
    return (
      <section className="section">
        <div className="shell">
          <LieferungSeite
            lieferung={offeneLieferung}
            bestellungen={bestellungen}
            onAendern={handleLieferung}
            onVerwerfen={handleVerwerfen}
            onPositionen={handlePositionen}
            onZurueck={() => setOffeneRunde(null)}
          />
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
            <button type="button" className="btn btn--quiet" onClick={onBack}>
              {t.zurSeite}
            </button>
          </div>
        </div>

        {fehler && <p className="form-status form-status--error">{fehler}</p>}

        {/*
          Die Leiste erscheint erst, wenn etwas gewaehlt ist. Sie steht oben
          und nicht unten: Wer eine Runde zusammenstellt, klickt durch die
          Liste und will danach nicht ans Seitenende scrollen.
        */}
        {gewaehlte.length > 0 && (
          <div className="admin__runde">
            <span>
              <strong>{gewaehlte.length}</strong> {gewaehlte.length === 1 ? t.bestellung : t.bestellungen}{' '}
              {t.fuerLieferrundeGewaehlt}
            </span>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                try {
                  const neue = await lieferungAnlegen(gewaehlte.map((b) => b.id))
                  setLieferungen((liste) => [neue, ...liste])
                  setRunde([])
                  setOffeneRunde(neue.id)
                } catch (f) {
                  setFehler(f instanceof Error ? f.message : 'Die Lieferrunde konnte nicht angelegt werden.')
                }
              }}
            >
              {t.lieferrundeAnlegen}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setRunde([])}>
              {t.auswahlAufheben}
            </button>
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

        {/*
          Die Runden stehen oben, aber klein. Sie sind Werkzeug und nicht
          Tagesgeschaeft: Der erste Bildschirm gehoert der Arbeitsliste. Der
          erklaerende Satz faellt weg, sobald Runden da sind – dann erklaeren
          sich die Zeilen selbst.
        */}
        {lieferungen.length > 0 && (
          <section className="admin__runden-block">
            <h2>
              {t.lieferrunden} <span className="admin__zahl">{lieferungen.length}</span>
            </h2>
            <ul className="admin__runden">
              {lieferungen.map((l) => (
                <li key={l.id}>
                  <button type="button" className="admin__runde-knopf" onClick={() => setOffeneRunde(l.id)}>
                    <span className="admin__runde-nummer">{l.nummer}</span>
                    <span className={`admin__runde-stand admin__runde-stand--${l.status}`}>{standTexte(t)[l.status]}</span>
                    <span className="admin__detail">
                      {l.bestellungIds.length} {l.bestellungIds.length === 1 ? t.bestellung : t.bestellungen}
                      {l.zeilen.length > 0 && ` · ${l.zeilen.length} ${t.plissees}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {BLOCK_FOLGE.map((block) => {
          const schritte = SCHRITTE.filter((sch) => BLOCK_VON[sch] === block)
          const anzahl = schritte.reduce((n, sch) => n + gruppen.get(sch)!.length, 0)
          const texte = blockTexte(t)[block]
          const zu = zugeklappt.includes(block)

          return (
            <section className={`admin__block admin__block--${block}`} key={block}>
              <button
                type="button"
                className="admin__block-kopf"
                aria-expanded={!zu}
                onClick={() =>
                  setZugeklappt((liste) => (zu ? liste.filter((x) => x !== block) : [...liste, block]))
                }
              >
                <h2>
                  {texte.titel} <span className="admin__zahl">{anzahl}</span>
                </h2>
                <p>{texte.satz}</p>
              </button>

              {!zu &&
                schritte.map((sch) => {
                  const treffer = gruppen.get(sch)!
                  // Leere Abschnitte innerhalb eines Blocks bleiben weg. Eine
                  // Ueberschrift ueber nichts ist nur Weg zum naechsten.
                  if (treffer.length === 0) return null
                  const st = schrittTexte(t)[sch]
                  return (
                    <div className="admin__sektion" key={sch}>
                      <div className="admin__sektion-kopf">
                        <h3>
                          {st.titel} <span className="admin__zahl">{treffer.length}</span>
                        </h3>
                        {st.satz && <p>{st.satz}</p>}
                      </div>
                      <ul className="admin__karten">
                        {treffer.map((b) => (
                          <BestellKarte
                            key={b.id}
                            bestellung={b}
                            schritt={sch}
                            runde={rundeFuer(b, lieferungen)}
                            montageProNetz={shopConfig.montageChf}
                            onAendern={handleAendern}
                            onLoeschen={handleLoeschen}
                            onOfferte={setOffeneOfferte}
                            gewaehlt={runde.includes(b.id)}
                            // Abgeschlossenes gehoert in keine Runde mehr.
                            onWahl={block === 'archiv' ? undefined : waehle}
                          />
                        ))}
                      </ul>
                    </div>
                  )
                })}

              {!zu && anzahl === 0 && <p className="admin__leer">{t.nichtsHier}</p>}
            </section>
          )
        })}
      </div>
    </section>
  )
}
