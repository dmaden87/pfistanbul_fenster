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
import { datum } from './hilfen'
import { fuelle, useSprache } from './sprache'
import type { LieferungAenderung } from '../../lib/lieferungApi'
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
   * Friert die Zeilen ein. Ab hier ist die Nummerierung verbindlich, denn
   * Bora bezieht seine Preise darauf.
   */
  const anfrageVersendet = async () => {
    const zeilen: LieferungZeile[] = auftrag.zeilen.map((z) => ({
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
    await schritt({ status: 'angefragt', zeilen })
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
    await schritt({
      zeilen,
      lieferkostenJePaket: jePaket,
      lieferkostenChf: zahl(frachtGesamt),
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
            <button type="button" className="btn" onClick={anfrageVersendet} disabled={sendet || auftrag.luecken.length > 0}>
              {t.dokumentErzeugen}
            </button>
            {auftrag.luecken.length > 0 && (
              <span className="lieferung__warnung">
                {fuelle(t.erstFehlenAngaben, { n: auftrag.luecken.length })}
              </span>
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
            <button type="button" className="btn" onClick={() => schritt({ status: 'preise' })} disabled={sendet}>
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
            onClick={() => schritt({ status: 'bestellt' })}
            disabled={sendet || rechnung.zeilenOhnePreis > 0}
          >
            {t.bestellungErteilen}
          </button>
        )}
        {lieferung.status === 'bestellt' && (
          <button type="button" className="btn" onClick={() => schritt({ status: 'geliefert' })} disabled={sendet}>
            {t.istAngekommen}
          </button>
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
