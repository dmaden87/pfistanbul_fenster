import { useState } from 'react'
import type { AustrittsGrund, Bestellung, BestellPosition, Lieferung, LieferungStatus, LieferungZeile } from '../../types'
import type { AdminTexte } from './sprache'
import { auftragAufbauen, pakete } from '../../lib/bestellauftrag'
import { RundenTabelle } from './RundenTabelle'
import { RundenBestellungen } from './RundenBestellungen'
import { rechne } from '../../lib/lieferung'
import { formatChf } from '../../lib/format'
import { shopConfig } from '../../data/shopConfig'
import { Bestellauftrag } from './Bestellauftrag'
import { datum, tag } from './hilfen'
import { fuelle, useSprache } from './sprache'
import type { LieferungAenderung } from '../../lib/lieferungApi'
import { kennungFuer } from '../../lib/bestellauftrag'
import { ohneEinkauf } from '../../lib/phasen'
import './LieferungSeite.css'

/**
 * Eine Lieferrunde von der Anfrage bis zur Lieferung.
 *
 * Der Lebenslauf eines einzigen Dokuments:
 *
 *   entwurf → angefragt → preise → bestellt → geliefert
 *
 * Der wichtige Uebergang ist der erste. Beim Versand der Anfrage werden die
 * Zeilen EINGEFROREN: Bora traegt die Preise mit Bezug auf die laufende
 * Nummer ein, und wuerde jemand danach ein Netz aendern oder ergaenzen,
 * landeten seine Preise am falschen Netz. Bis dahin laesst sich alles noch
 * korrigieren, danach nichts mehr.
 *
 * JEDER STANDWECHSEL IST EIN RUNDENKLICK MIT KAESTCHEN. Ein Klick listet
 * alle Bestellungen der Runde auf, alle angekreuzt; wer nicht mitgehen soll,
 * wird abgewaehlt. Die Gewaehlten ruecken in ihre naechste Phase, die
 * anderen bleiben – wo genau, sagt der Satz ueber der Liste. So entscheidet
 * der Betreiber je Bestellung, ohne je Bestellung klicken zu muessen.
 */

interface LieferungSeiteProps {
  lieferung: Lieferung
  /** Alle Bestellungen; die der Runde werden hier herausgesucht. */
  bestellungen: Bestellung[]
  onAendern: (id: string, aenderung: LieferungAenderung) => Promise<void>
  onVerwerfen: (id: string) => Promise<void>
  /** Schreibt geaenderte Netze zurueck in die Bestellung. */
  onPositionen: (bestellungId: string, positionen: BestellPosition[]) => Promise<void>
  onZurueck: () => void
}

function staende(t: AdminTexte): Record<LieferungStatus, { titel: string; satz: string }> {
  return {
    entwurf: { titel: t.standEntwurf, satz: t.standEntwurfSatz },
    angefragt: { titel: t.standAngefragt, satz: t.standAngefragtSatz },
    preise: { titel: t.standPreise, satz: t.standPreiseSatz },
    bestellt: { titel: t.standBestellt, satz: t.standBestelltSatz },
    geliefert: { titel: t.standGeliefert, satz: t.standGeliefertSatz },
  }
}

function zahl(wert: string): number | undefined {
  if (wert.trim() === '') return undefined
  const n = Number(wert.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined
}

export function LieferungSeite({
  lieferung,
  bestellungen,
  onAendern,
  onVerwerfen,
  onPositionen,
  onZurueck,
}: LieferungSeiteProps) {
  const [zeigeDokument, setZeigeDokument] = useState(false)
  // Verwerfen fragt nach. Ab "angefragt" haengen eingefrorene Zeilen und
  // moeglicherweise Boras Preise daran – das soll kein Fehlklick treffen.
  const [verwerfenFrage, setVerwerfenFrage] = useState(false)
  const { t, ort } = useSprache()
  const [fehler, setFehler] = useState<string | null>(null)
  const [sendet, setSendet] = useState(false)

  const dabei = bestellungen.filter((b) => lieferung.bestellungIds.includes(b.id))
  const eingefroren = lieferung.zeilen.length > 0
  const auftrag = eingefroren ? { zeilen: [], luecken: [] } : auftragAufbauen(dabei, lieferung)

  // Entwuerfe fuer die Preiserfassung, damit Tippen nicht sofort speichert.
  const [preise, setPreise] = useState<Record<number, string>>(() =>
    Object.fromEntries(lieferung.zeilen.map((z) => [z.nummer, z.einkaufChf === undefined ? '' : String(z.einkaufChf)])),
  )
  const [fracht, setFracht] = useState<Record<string, string>>(() => {
    const roh = lieferung.lieferkostenJePaket ?? {}
    return Object.fromEntries(Object.entries(roh).map(([k, v]) => [k, String(v)]))
  })
  const [frachtGesamt, setFrachtGesamt] = useState(
    lieferung.lieferkostenChf === undefined ? '' : String(lieferung.lieferkostenChf),
  )
  const [termin, setTermin] = useState(lieferung.termin ?? '')
  const [zoll, setZoll] = useState<Record<string, string>>(() => {
    const roh = lieferung.zollJePaket ?? {}
    return Object.fromEntries(Object.entries(roh).map(([k, v]) => [k, String(v)]))
  })
  /** Der offene Rundenklick: welcher Stand, und wer geht mit. */
  const [klick, setKlick] = useState<{ stand: LieferungStatus; mit: string[] } | null>(null)
  const [zurueckgeblieben, setZurueckgeblieben] = useState<number | null>(null)

  const rechnung = rechne(lieferung, bestellungen)
  const paketliste = pakete(
    eingefroren
      ? lieferung.zeilen.map((z) => ({ ...z, menge: 1 }) as never)
      : (auftrag.zeilen as never),
  )

  const schritt = async (aenderung: LieferungAenderung, meldung?: string) => {
    setSendet(true)
    setFehler(null)
    try {
      await onAendern(lieferung.id, aenderung)
      if (meldung) setFehler(null)
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Fehler')
    } finally {
      setSendet(false)
    }
  }

  /**
   * Die Zeilen zum Einfrieren. Ab hier ist die Nummerierung verbindlich,
   * denn Bora bezieht seine Preise darauf.
   */
  const eingefroreneZeilen = (): LieferungZeile[] =>
    auftrag.zeilen.map((z) => ({
      nummer: z.nummer,
      kennung: z.kennung,
      /*
       * Die Herkunft MUSS mit. Sie ist der Faden zurueck zur Bestellung, und
       * ohne sie landen Boras Preise nirgends: Die Runde wuesste dann zwar,
       * dass Zeile 7 vierzig Franken kostet, aber nicht mehr, zu welchem
       * Netz welcher Bestellung Zeile 7 gehoert.
       */
      herkunft: z.herkunft,
      bezeichnung: z.bezeichnung,
      breiteCm: z.breiteCm,
      hoeheCm: z.hoeheCm,
      rahmendicke: z.rahmendicke,
      rahmenfarbe: z.rahmenfarbe,
      netzfarbe: z.netzfarbe,
      mechanismus: z.mechanismus,
      oeffnung: z.oeffnung,
    }))

  /**
   * Alle Netze aller Bestellungen tragen schon Einkaufspreise – aus einer
   * frueheren Runde. Dann ist die Anfrage an Bora ueberfluessig: Die Runde
   * wird direkt zur Bestellrunde und steht auf "Preise erhalten".
   */
  const preiseSchonDa = dabei.length > 0 && dabei.every((b) => b.positionen.length > 0 && ohneEinkauf(b) === 0)

  /**
   * Alle zugesagt: eine Bestellrunde. Dann gibt es nichts mehr anzufragen –
   * der erste Klick friert ein UND bestellt, das Blatt ist von Anfang an
   * die verbindliche Bestellung. Boras Einkaufspreise koennen fehlen (der
   * Kunde hat auf die Offerte hin zugesagt, nicht auf Boras Antwort); sie
   * werden nachgetragen, sobald sie da sind.
   */
  const alleZugesagt = dabei.length > 0 && dabei.every((b) => b.zusageAm)

  /** Oeffnet den Rundenklick: alle Bestellungen der Runde, alle angekreuzt. */
  const klickOeffnen = (stand: LieferungStatus) => {
    setZurueckgeblieben(null)
    // Beim verbindlichen Bestellen sind die ohne Zusage von vornherein
    // abgewaehlt – der Vorschlag, nicht die Entscheidung.
    const mit = stand === 'bestellt' ? dabei.filter((b) => b.zusageAm).map((b) => b.id) : dabei.map((b) => b.id)
    setKlick({ stand, mit })
  }

  /** Fuehrt den offenen Rundenklick aus. */
  const klickAusfuehren = async () => {
    if (!klick) return
    const aenderung: LieferungAenderung = { status: klick.stand, mitnehmen: klick.mit }
    // Der erste Klick friert die Zeilen ein – nur die der Mitgehenden.
    if (lieferung.status === 'entwurf') {
      const geht = new Set(klick.mit)
      aenderung.zeilen = eingefroreneZeilen().filter((z) => !z.herkunft || geht.has(z.herkunft.bestellungId))
    }
    setSendet(true)
    setFehler(null)
    try {
      await onAendern(lieferung.id, aenderung)
      setZurueckgeblieben(dabei.length - klick.mit.length)
      setKlick(null)
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Fehler')
    } finally {
      setSendet(false)
    }
  }

  const klickSatz = (stand: LieferungStatus): string => {
    switch (stand) {
      case 'angefragt':
        return t.klickAngefragtSatz
      case 'preise':
        return t.klickPreiseSatz
      case 'bestellt':
        return t.klickBestelltSatz
      case 'geliefert':
        return t.klickGeliefertSatz
      default:
        return ''
    }
  }

  /*
   * Speichern ist NUR speichern.
   *
   * Frueher setzte dieser Knopf die Runde auf "Preise erhalten" – auch wenn
   * erst einer von sechs Preisen dastand. Der Stand log dann, und die
   * Bestellung sprang in den naechsten Abschnitt, obwohl fuenf Kosten
   * fehlten. Boras Antworten kommen aber nach und nach, und ein
   * Zwischenstand zu speichern muss folgenlos sein.
   *
   * Weitergesetzt wird ausdruecklich, mit einem eigenen Knopf, und der gibt
   * es erst, wenn wirklich jede Zeile einen Preis hat.
   */
  const preiseSpeichern = async () => {
    const zeilen = lieferung.zeilen.map((z) => ({ ...z, einkaufChf: zahl(preise[z.nummer] ?? '') }))
    const jePaket: Record<string, number> = {}
    for (const [kennung, wert] of Object.entries(fracht)) {
      const betrag = zahl(wert)
      if (betrag !== undefined) jePaket[kennung] = betrag
    }
    const zollJePaket: Record<string, number> = {}
    for (const [kennung, wert] of Object.entries(zoll)) {
      const betrag = zahl(wert)
      if (betrag !== undefined) zollJePaket[kennung] = betrag
    }
    await schritt({
      zeilen,
      lieferkostenJePaket: jePaket,
      lieferkostenChf: zahl(frachtGesamt),
      zollJePaket,
      termin: termin || undefined,
    })
  }

  if (zeigeDokument) {
    return <Bestellauftrag lieferung={lieferung} bestellungen={dabei} onZurueck={() => setZeigeDokument(false)} />
  }

  const stand = staende(t)[lieferung.status]

  return (
    <div className="lieferung">
      <div className="admin__kopf">
        <div>
          <h1>{lieferung.nummer}</h1>
          <p className="admin__zusammenfassung">
            <strong>{stand.titel}</strong> · {stand.satz}
          </p>
          <p className="admin__zusammenfassung">
            {dabei.length} {dabei.length === 1 ? t.bestellung : t.bestellungen} ·{' '}
            {eingefroren ? lieferung.zeilen.length : auftrag.zeilen.length} {t.plissees} · {t.angelegt}{' '}
            {datum(lieferung.erstellt, ort)}
          </p>
        </div>
        <div className="admin__werkzeuge">
          <button type="button" className="btn btn--ghost" onClick={() => setZeigeDokument(true)}>
            {t.dokumentAnzeigen}
          </button>
          <button type="button" className="btn btn--quiet" onClick={onZurueck}>
            {t.zurueckZurListe}
          </button>
        </div>
      </div>

      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      {/* --- Die Schritte des Lebenslaufs --------------------------------- */}
      <div className="lieferung__schritte">
        {lieferung.status === 'entwurf' && (
          <>
            <button
              type="button"
              className="btn"
              onClick={() => klickOeffnen(alleZugesagt ? 'bestellt' : preiseSchonDa ? 'preise' : 'angefragt')}
              disabled={sendet || auftrag.luecken.length > 0 || dabei.length === 0}
            >
              {alleZugesagt ? t.bestellungAnBora : preiseSchonDa ? t.bestellrundeEinfrieren : t.dokumentErzeugen}
            </button>
            {alleZugesagt && !preiseSchonDa && (
              <button
                type="button"
                className="btn btn--quiet"
                onClick={() => klickOeffnen('angefragt')}
                disabled={sendet || auftrag.luecken.length > 0}
              >
                {t.nurPreiseAnfragen}
              </button>
            )}
            {auftrag.luecken.length > 0 && (
              <span className="lieferung__warnung">
                {fuelle(t.erstFehlenAngaben, { n: auftrag.luecken.length })}
              </span>
            )}
            {auftrag.luecken.length === 0 && alleZugesagt && (
              <span className="admin__zusammenfassung">{t.bestellungAnBoraSatz}</span>
            )}
            {auftrag.luecken.length === 0 && !alleZugesagt && preiseSchonDa && (
              <span className="admin__zusammenfassung">{t.bestellrundeEinfrierenSatz}</span>
            )}
          </>
        )}
        {/*
          Der Uebergang nach "Preise erhalten" ist eine Aussage ueber die
          Vollstaendigkeit, deshalb gibt es ihn erst, wenn sie stimmt. Fehlt
          noch etwas, steht statt des Knopfes, wie viel.
        */}
        {lieferung.status === 'angefragt' &&
          (rechnung.zeilenOhnePreis === 0 && lieferung.zeilen.length > 0 ? (
            <button type="button" className="btn" onClick={() => klickOeffnen('preise')} disabled={sendet}>
              {t.allePreiseDa}
            </button>
          ) : (
            <span className="lieferung__warnung">
              {fuelle(t.nochOhnePreis, {
                offen: rechnung.zeilenOhnePreis,
                alle: lieferung.zeilen.length,
              })}
            </span>
          ))}
        {lieferung.status === 'preise' && (
          <button
            type="button"
            className="btn"
            onClick={() => klickOeffnen('bestellt')}
            disabled={sendet || (rechnung.zeilenOhnePreis > 0 && !alleZugesagt)}
          >
            {t.bestellungErteilen}
          </button>
        )}
        {lieferung.status === 'bestellt' && (
          <>
            <button type="button" className="btn" onClick={() => klickOeffnen('geliefert')} disabled={sendet}>
              {t.istAngekommen}
            </button>
            {/*
              "Unterwegs" ist kein Stand der Runde, sondern ein Stempel:
              Bora hat verschickt. Die Bestellungen bleiben in "Bestellen",
              aber der Betreiber weiss, dass er bald Ware auspackt.
            */}
            {lieferung.versandAm ? (
              <>
                <span className="admin__marke admin__marke--gut">
                  {t.unterwegs} {tag(lieferung.versandAm, ort)}
                </span>
                <button type="button" className="btn btn--quiet" onClick={() => schritt({ versandAm: false })} disabled={sendet}>
                  {t.knopfUnterwegsZurueck}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn--ghost" onClick={() => schritt({ versandAm: true })} disabled={sendet}>
                {t.knopfUnterwegs}
              </button>
            )}
          </>
        )}
        {lieferung.status === 'geliefert' && (
          /*
           * Nachlieferung: Wer beim "Ist angekommen" abgewaehlt wurde, steht
           * noch in der Runde und wartet. Derselbe Klick nochmals holt sie
           * nach, sobald die Ware da ist.
           */
          dabei.some((b) => b.wareFehltSeit) && (
            <button type="button" className="btn" onClick={() => klickOeffnen('geliefert')} disabled={sendet}>
              {t.knopfNachlieferungDa}
            </button>
          )
        )}
        {lieferung.status !== 'entwurf' && lieferung.status !== 'geliefert' && (
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => schritt({ status: 'angefragt' })}
            disabled={sendet}
          >
            {t.zurueckZuAnfrage}
          </button>
        )}

        {/*
          Verwerfen. Es gibt es in jedem Zustand: Der haeufigste Fall ist ein
          Entwurf, dem Angaben fehlen, aber auch spaeter kann eine Runde
          hinfaellig werden. Die Rueckfrage sagt jeweils, was dabei verloren
          geht – bei einem Entwurf nichts, spaeter die eingefrorenen Zeilen
          und die Preise.
        */}
        {verwerfenFrage ? (
          <span className="lieferung__verwerfen">
            {lieferung.status === 'entwurf'
              ? t.verwerfenEntwurf
              : fuelle(t.verwerfenSpaeter, { n: lieferung.zeilen.length })}
            <button
              type="button"
              className="btn btn--quiet admin__gefahr"
              disabled={sendet}
              onClick={async () => {
                setSendet(true)
                setFehler(null)
                try {
                  await onVerwerfen(lieferung.id)
                } catch (f) {
                  setFehler(f instanceof Error ? f.message : 'Die Runde konnte nicht verworfen werden.')
                  setSendet(false)
                  setVerwerfenFrage(false)
                }
              }}
            >
              {t.jaVerwerfen}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setVerwerfenFrage(false)}>
              {t.abbrechen}
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn--quiet admin__gefahr"
            onClick={() => setVerwerfenFrage(true)}
            disabled={sendet}
          >
            {t.lieferrundeVerwerfen}
          </button>
        )}
      </div>

      {zurueckgeblieben !== null && zurueckgeblieben > 0 && (
        <p className="lieferung__warnung">{fuelle(t.zurueckgebliebenSatz, { n: zurueckgeblieben })}</p>
      )}

      {/* --- Der Rundenklick: wer geht mit? ------------------------------- */}
      {klick && (
        <section className="lieferung__block lieferung__klick">
          <h2>{t.klickWerGehtMit}</h2>
          <p className="admin__zusammenfassung">{klickSatz(klick.stand)}</p>
          <ul className="runden-best">
            {dabei.map((b) => (
              <li key={b.id} className="runden-best__zeile">
                <label className="admin__haken">
                  <input
                    type="checkbox"
                    checked={klick.mit.includes(b.id)}
                    onChange={(e) =>
                      setKlick((k) =>
                        k && { ...k, mit: e.target.checked ? [...k.mit, b.id] : k.mit.filter((x) => x !== b.id) },
                      )
                    }
                  />
                  <span className="runden-best__kennung">{kennungFuer(b)}</span>
                </label>
                <span className="runden-best__name">{b.kunde.name}</span>
                {klick.stand === 'bestellt' && !b.zusageAm && (
                  <span className="admin__marke admin__marke--warnung">{t.ohneZusageMarke}</span>
                )}
                {klick.stand === 'geliefert' && b.wareFehltSeit && (
                  <span className="admin__marke admin__marke--warnung">{t.wareFehltMarke}</span>
                )}
                <span className="runden-best__preis">{formatChf(b.summeChf)}</span>
              </li>
            ))}
          </ul>
          <div className="lieferung__schritte">
            <button type="button" className="btn" onClick={klickAusfuehren} disabled={sendet || klick.mit.length === 0}>
              {klick.mit.length === 0 ? t.klickKeine : fuelle(t.klickBestaetigen, { n: klick.mit.length })}
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setKlick(null)} disabled={sendet}>
              {t.abbrechen}
            </button>
          </div>
        </section>
      )}

      {/*
        Wer ist ueberhaupt dabei? Die Frage steht vor den Netzzeilen, denn
        entschieden wird je Bestellung – eine Bestellung ist immer ganz drin
        oder ganz draussen.
      */}
      <RundenBestellungen
        lieferung={lieferung}
        bestellungen={bestellungen}
        aenderbar={lieferung.status !== 'geliefert'}
        onEntfernen={async (bestellungId: string, grund: AustrittsGrund) => {
          await schritt({ entfernen: { bestellungId, grund } })
        }}
      />

      {/*
        Im Entwurf: die Zeilen kontrollieren, bevor der Auftrag rausgeht.
        Danach nicht mehr – ab dem Versand stehen sie fest, weil Boras Preise
        sich auf die Nummern beziehen.
      */}
      {lieferung.status === 'entwurf' && (
        <RundenTabelle
          lieferung={lieferung}
          bestellungen={bestellungen}
          onBestellungAendern={onPositionen}
          onLieferungAendern={(aenderung) => onAendern(lieferung.id, aenderung)}
        />
      )}

      {/* --- Preise eintragen --------------------------------------------- */}
      {eingefroren && lieferung.status !== 'entwurf' && (
        <section className="lieferung__block">
          <h2>{t.preiseVomProduzenten}</h2>
          <p className="admin__zusammenfassung">{t.zeilennummernSatz}</p>

          <table className="lieferung__tabelle">
            <thead>
              <tr>
                <th className="lieferung__eng">{t.nummerKurz}</th>
                <th>{t.paket}</th>
                <th>{t.fenster}</th>
                <th className="lieferung__eng">{t.masse}</th>
                <th className="lieferung__eng">{t.einkauf}</th>
              </tr>
            </thead>
            <tbody>
              {lieferung.zeilen.map((z) => (
                <tr key={z.nummer}>
                  <td className="lieferung__zahl">{z.nummer}</td>
                  <td className="lieferung__kennung">{z.kennung}</td>
                  <td>{z.bezeichnung}</td>
                  <td className="lieferung__zahl">
                    {z.breiteCm && z.hoeheCm ? `${z.breiteCm} × ${z.hoeheCm}` : '—'}
                  </td>
                  <td>
                    <input
                      className="input lieferung__feld"
                      inputMode="decimal"
                      aria-label={`${t.einkauf} ${z.nummer}`}
                      value={preise[z.nummer] ?? ''}
                      onChange={(e) => setPreise((p) => ({ ...p, [z.nummer]: e.target.value }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="lieferung__untertitel">{t.lieferkosten}</h3>
          <div className="lieferung__fracht">
            {paketliste.map((p) => (
              <label className="lieferung__frachtfeld" key={p.kennung}>
                <span>{p.kennung}</span>
                <input
                  className="input lieferung__feld"
                  inputMode="decimal"
                  value={fracht[p.kennung] ?? ''}
                  onChange={(e) => setFracht((f) => ({ ...f, [p.kennung]: e.target.value }))}
                />
              </label>
            ))}
            <label className="lieferung__frachtfeld">
              <span>{t.ganzeLieferung}</span>
              <input
                className="input lieferung__feld"
                inputMode="decimal"
                value={frachtGesamt}
                onChange={(e) => setFrachtGesamt(e.target.value)}
              />
            </label>
          </div>
          <p className="admin__zusammenfassung">{t.ganzeLieferungGilt}</p>

          {/*
            Zoll, Einfuhrsteuer, Gebuehren: erst ab "bestellt", denn vorher
            gibt es keinen Bescheid. Ein Feld je Paket, alles zusammengerechnet.
          */}
          {(lieferung.status === 'bestellt' || lieferung.status === 'geliefert') && (
            <>
              <h3 className="lieferung__untertitel">{t.zollJePaket}</h3>
              <p className="admin__zusammenfassung">{t.zollJePaketSatz}</p>
              <div className="lieferung__fracht">
                {paketliste.map((p) => (
                  <label className="lieferung__frachtfeld" key={`zoll-${p.kennung}`}>
                    <span>{p.kennung}</span>
                    <input
                      className="input lieferung__feld"
                      inputMode="decimal"
                      aria-label={`${t.zoll} ${p.kennung}`}
                      value={zoll[p.kennung] ?? ''}
                      onChange={(e) => setZoll((z) => ({ ...z, [p.kennung]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
            </>
          )}

          {/*
            Eigener Abschnitt und nicht in der Reihe der Kostenfelder: Ein
            Textfeld, das zwischen Betraegen steht, wird fuer einen Betrag
            gehalten – beim Ausprobieren ist genau das passiert.
          */}
          <h3 className="lieferung__untertitel">{t.liefertermin}</h3>
          <label className="lieferung__termin">
            <span>{t.lieferterminSatz}</span>
            <input
              className="input"
              value={termin}
              onChange={(e) => setTermin(e.target.value)}
              placeholder="z. B. Ende Oktober 2026"
            />
          </label>

          <p className="admin__zusammenfassung">{t.preiseSpeichernSatz}</p>
          <button type="button" className="btn" onClick={preiseSpeichern} disabled={sendet}>
            {sendet ? t.wirdGespeichert : t.preiseSpeichern}
          </button>
        </section>
      )}

      {/* --- Was die Runde kostet und einbringt --------------------------- */}
      {eingefroren && rechnung.einkaufChf > 0 && (
        <section className="lieferung__block">
          <h2>{t.rechnungDerRunde}</h2>

          {rechnung.zeilenOhnePreis > 0 && (
            <p className="lieferung__warnung">
              {fuelle(t.zeilenOhnePreis, { n: rechnung.zeilenOhnePreis, gesamt: rechnung.netze })}
            </p>
          )}
          {rechnung.lieferkostenDoppelt && (
            <p className="lieferung__warnung">{t.lieferkostenDoppelt}</p>
          )}

          <dl className="lieferung__zahlen">
            <div>
              <dt>{t.einkauf}</dt>
              <dd>{formatChf(rechnung.einkaufChf)}</dd>
            </div>
            <div>
              <dt>{t.lieferkosten}</dt>
              <dd>{formatChf(rechnung.lieferkostenChf)}</dd>
            </div>
            <div className="lieferung__zahlen-stark">
              <dt>{t.einsatz}</dt>
              <dd>{formatChf(rechnung.einsatzChf)}</dd>
            </div>
            <div>
              <dt>{t.warenerloes}</dt>
              <dd>{formatChf(rechnung.warenerloesChf)}</dd>
            </div>
            <div className={rechnung.margeChf >= 0 ? 'lieferung__zahlen-stark' : 'lieferung__zahlen-schlecht'}>
              <dt>{t.marge}</dt>
              <dd>
                {formatChf(rechnung.margeChf)}
                {rechnung.margeProzent !== null && <span className="admin__detail"> · {rechnung.margeProzent} %</span>}
              </dd>
            </div>
            {rechnung.einsatzJeNetzChf !== null && (
              <div>
                <dt>{t.einsatzJeNetz}</dt>
                <dd>{formatChf(rechnung.einsatzJeNetzChf)}</dd>
              </div>
            )}
          </dl>

          {/*
            Die Zahl, fuer die minimumBatchNets in shopConfig steht: ab wann
            eine Runde ihre Fracht traegt. Bisher eine Schaetzung, jetzt eine
            Rechnung.
          */}
          <p className="admin__zusammenfassung">
            {fuelle(t.mindestmenge, { n: shopConfig.minimumBatchNets, ist: rechnung.netze })}
          </p>
        </section>
      )}
    </div>
  )
}
