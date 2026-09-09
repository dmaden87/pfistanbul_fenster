import { useState } from 'react'
import type { Bestellung, BestellPosition, Lieferung, LieferungStatus, LieferungZeile } from '../../types'
import { auftragAufbauen, pakete } from '../../lib/bestellauftrag'
import { RundenTabelle } from './RundenTabelle'
import { rechne } from '../../lib/lieferung'
import { formatChf } from '../../lib/format'
import { shopConfig } from '../../data/shopConfig'
import { Bestellauftrag } from './Bestellauftrag'
import { datum } from './hilfen'
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
  onAendern: (id: string, aenderung: Partial<Lieferung>) => Promise<void>
  onVerwerfen: (id: string) => Promise<void>
  /** Schreibt geaenderte Netze zurueck in die Bestellung. */
  onPositionen: (bestellungId: string, positionen: BestellPosition[]) => Promise<void>
  onZurueck: () => void
}

const STAND: Record<LieferungStatus, { titel: string; satz: string }> = {
  entwurf: {
    titel: 'Entwurf',
    satz: 'Noch nichts verschickt. Solange kann an den Netzen der Bestellungen geändert werden.',
  },
  angefragt: {
    titel: 'Anfrage versendet',
    satz: 'Bei Bora. Die Zeilen sind eingefroren – seine Preise beziehen sich auf die Nummern.',
  },
  preise: {
    titel: 'Preise erhalten',
    satz: 'Preise eintragen und die Marge prüfen. Danach als Bestellung erteilen.',
  },
  bestellt: { titel: 'Bestellt', satz: 'Beim Produzenten in Fertigung.' },
  geliefert: { titel: 'Geliefert', satz: 'Angekommen. Bleibt zum Nachschlagen stehen.' },
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

  const schritt = async (aenderung: Partial<Lieferung>, meldung?: string) => {
    setSendet(true)
    setFehler(null)
    try {
      await onAendern(lieferung.id, aenderung)
      if (meldung) setFehler(null)
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Der Schritt konnte nicht gespeichert werden.')
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

  const preiseSpeichern = async () => {
    const zeilen = lieferung.zeilen.map((z) => ({ ...z, einkaufChf: zahl(preise[z.nummer] ?? '') }))
    const jePaket: Record<string, number> = {}
    for (const [kennung, wert] of Object.entries(fracht)) {
      const betrag = zahl(wert)
      if (betrag !== undefined) jePaket[kennung] = betrag
    }
    await schritt({
      status: 'preise',
      zeilen,
      lieferkostenJePaket: jePaket,
      lieferkostenChf: zahl(frachtGesamt),
      termin: termin || undefined,
    })
  }

  if (zeigeDokument) {
    return <Bestellauftrag lieferung={lieferung} bestellungen={dabei} onZurueck={() => setZeigeDokument(false)} />
  }

  const stand = STAND[lieferung.status]

  return (
    <div className="lieferung">
      <div className="admin__kopf">
        <div>
          <h1>{lieferung.nummer}</h1>
          <p className="admin__zusammenfassung">
            <strong>{stand.titel}</strong> · {stand.satz}
          </p>
          <p className="admin__zusammenfassung">
            {dabei.length} {dabei.length === 1 ? 'Bestellung' : 'Bestellungen'} ·{' '}
            {eingefroren ? lieferung.zeilen.length : auftrag.zeilen.length} Plissees · angelegt{' '}
            {datum(lieferung.erstellt)}
          </p>
        </div>
        <div className="admin__werkzeuge">
          <button type="button" className="btn btn--ghost" onClick={() => setZeigeDokument(true)}>
            Dokument anzeigen
          </button>
          <button type="button" className="btn btn--quiet" onClick={onZurueck}>
            Zurück zur Liste
          </button>
        </div>
      </div>

      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      {/* --- Die Schritte des Lebenslaufs --------------------------------- */}
      <div className="lieferung__schritte">
        {lieferung.status === 'entwurf' && (
          <>
            <button type="button" className="btn" onClick={anfrageVersendet} disabled={sendet || auftrag.luecken.length > 0}>
              Dokument erzeugen und Zeilen einfrieren
            </button>
            {auftrag.luecken.length > 0 && (
              <span className="lieferung__warnung">
                Erst fehlen noch Angaben ({auftrag.luecken.length}). Im Dokument steht, welche.
              </span>
            )}
          </>
        )}
        {lieferung.status === 'angefragt' && (
          <button type="button" className="btn" onClick={() => schritt({ status: 'preise' })} disabled={sendet}>
            Antwort da – Preise eintragen
          </button>
        )}
        {lieferung.status === 'preise' && (
          <button
            type="button"
            className="btn"
            onClick={() => schritt({ status: 'bestellt' })}
            disabled={sendet || rechnung.zeilenOhnePreis > 0}
          >
            Bestellung erteilen
          </button>
        )}
        {lieferung.status === 'bestellt' && (
          <button type="button" className="btn" onClick={() => schritt({ status: 'geliefert' })} disabled={sendet}>
            Ist angekommen
          </button>
        )}
        {lieferung.status !== 'entwurf' && lieferung.status !== 'geliefert' && (
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => schritt({ status: 'angefragt' })}
            disabled={sendet}
          >
            Zurück zu „Anfrage versendet"
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
              ? 'Verwerfen? Die Bestellungen bleiben, nur die Runde verschwindet.'
              : `Verwerfen? Die ${lieferung.zeilen.length} eingefrorenen Zeilen und die eingetragenen Preise sind dann weg. Die Bestellungen behalten den Status, den sie jetzt haben.`}
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
              Ja, verwerfen
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => setVerwerfenFrage(false)}>
              Abbrechen
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn btn--quiet admin__gefahr"
            onClick={() => setVerwerfenFrage(true)}
            disabled={sendet}
          >
            Lieferrunde verwerfen
          </button>
        )}
      </div>

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
          <h2>Preise vom Produzenten</h2>
          <p className="admin__zusammenfassung">
            Die Zeilennummern sind dieselben wie auf dem Dokument, das Bora ausgefüllt zurückschickt.
          </p>

          <table className="lieferung__tabelle">
            <thead>
              <tr>
                <th className="lieferung__eng">Nr.</th>
                <th>Paket</th>
                <th>Fenster</th>
                <th className="lieferung__eng">Masse</th>
                <th className="lieferung__eng">Einkauf</th>
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
                      aria-label={`Einkaufspreis Zeile ${z.nummer}`}
                      value={preise[z.nummer] ?? ''}
                      onChange={(e) => setPreise((p) => ({ ...p, [z.nummer]: e.target.value }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="lieferung__untertitel">Lieferkosten</h3>
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
              <span>Ganze Lieferung</span>
              <input
                className="input lieferung__feld"
                inputMode="decimal"
                value={frachtGesamt}
                onChange={(e) => setFrachtGesamt(e.target.value)}
              />
            </label>
          </div>
          <p className="admin__zusammenfassung">
            Steht bei „Ganze Lieferung" ein Betrag, gilt dieser – die Einzelbeträge dienen dann nur der Übersicht.
          </p>

          {/*
            Eigener Abschnitt und nicht in der Reihe der Kostenfelder: Ein
            Textfeld, das zwischen Betraegen steht, wird fuer einen Betrag
            gehalten – beim Ausprobieren ist genau das passiert.
          */}
          <h3 className="lieferung__untertitel">Liefertermin</h3>
          <label className="lieferung__termin">
            <span>Was der Produzent nennt – später unser erwarteter Termin</span>
            <input
              className="input"
              value={termin}
              onChange={(e) => setTermin(e.target.value)}
              placeholder="z. B. Ende Oktober 2026"
            />
          </label>

          <button type="button" className="btn" onClick={preiseSpeichern} disabled={sendet}>
            {sendet ? 'Wird gespeichert …' : 'Preise speichern'}
          </button>
        </section>
      )}

      {/* --- Was die Runde kostet und einbringt --------------------------- */}
      {eingefroren && rechnung.einkaufChf > 0 && (
        <section className="lieferung__block">
          <h2>Rechnung der Runde</h2>

          {rechnung.zeilenOhnePreis > 0 && (
            <p className="lieferung__warnung">
              {rechnung.zeilenOhnePreis} von {rechnung.netze} Zeilen haben noch keinen Preis – die Zahlen unten sind
              deshalb unvollständig.
            </p>
          )}
          {rechnung.lieferkostenDoppelt && (
            <p className="lieferung__warnung">
              Es steht sowohl je Paket als auch für die ganze Lieferung ein Betrag da. Gerechnet wird mit dem
              Gesamtbetrag – bitte bei Bora nachfragen, was gilt.
            </p>
          )}

          <dl className="lieferung__zahlen">
            <div>
              <dt>Einkauf</dt>
              <dd>{formatChf(rechnung.einkaufChf)}</dd>
            </div>
            <div>
              <dt>Lieferkosten</dt>
              <dd>{formatChf(rechnung.lieferkostenChf)}</dd>
            </div>
            <div className="lieferung__zahlen-stark">
              <dt>Einsatz</dt>
              <dd>{formatChf(rechnung.einsatzChf)}</dd>
            </div>
            <div>
              <dt>Warenerlös (ohne Montage)</dt>
              <dd>{formatChf(rechnung.warenerloesChf)}</dd>
            </div>
            <div className={rechnung.margeChf >= 0 ? 'lieferung__zahlen-stark' : 'lieferung__zahlen-schlecht'}>
              <dt>Marge</dt>
              <dd>
                {formatChf(rechnung.margeChf)}
                {rechnung.margeProzent !== null && <span className="admin__detail"> · {rechnung.margeProzent} %</span>}
              </dd>
            </div>
            {rechnung.einsatzJeNetzChf !== null && (
              <div>
                <dt>Einsatz je Netz</dt>
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
            Angesetzt sind {shopConfig.minimumBatchNets} Netze, ab denen eine Runde ihre Fracht trägt. Diese Runde
            hat {rechnung.netze}.
          </p>
        </section>
      )}
    </div>
  )
}
