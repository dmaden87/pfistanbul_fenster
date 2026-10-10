import { Fragment, useCallback, useEffect, useState } from 'react'
import type {
  Abrechnung, AdminStatus, Auslage, Bestellung, KostenArt, KostenPosten,
} from '../../types'
import {
  adminStatus, aendereAbrechnung, aendereAuslage, aendereBestellung, anmelden,
  entferneAbrechnung, entferneAuslage, ladeAbrechnungen, ladeAuslagen, ladeBestellungen,
  legeAbrechnungAn, legeAuslageAn,
} from '../../lib/adminApi'
import { beteiligte, kostenConfig } from '../../data/kostenConfig'
import { formatChf } from '../../lib/format'
import {
  abrechnungEntwurf, abrechnungZahlen, abschnitte, forecast, kennzahlen,
  naechsteAbrechnungsnummer, offeneEinnahmen, offeneForderungen, offeneSchulden,
  postenSchluessel, postenSummeFuer, warenkosten, zaehltPhase, zahlenFuer,
  type Periode,
} from '../../lib/pl'
import { AbrechnungBlatt } from './AbrechnungBlatt'
import { KostenEditor } from './KostenEditor'
import { AuslagenListe } from './AuslagenListe'
import { SprachRahmen } from '../admin/SprachRahmen'
import { SprachSchalter } from '../admin/SprachSchalter'
import { fuelle, useSprache } from '../admin/sprache'
import './ZahlenPage.css'

/**
 * Der Bereich "Zahlen": Erfolgsrechnung, Kosten, offene Posten.
 *
 * GETRENNT VOM ADMINBEREICH, mit Absicht. Dort steht das Verkaufs-CRM und
 * nennt nur Verkaufspreise und Erloese; hier stehen Einkauf, Marge und wer
 * wem was schuldet. Dieselbe Anmeldung, dieselben Daten – zwei Sichten, die
 * sich nicht ins Gehege kommen.
 *
 * Gerechnet wird bei jedem Laden neu aus den Bestellungen. Es gibt keinen
 * zweiten Datenbestand, der veralten koennte.
 */



interface Props {
  onBack: () => void
}

/**
 * Die aeussere Huelle setzt nur den Sprachrahmen – dieselbe Wahl wie im
 * Adminbereich, gespeichert an derselben Stelle. Die Maske steckt darin,
 * damit sie den Rahmen benutzen kann.
 */
export function ZahlenPage(props: Props) {
  return (
    <SprachRahmen>
      <ZahlenMaske {...props} />
    </SprachRahmen>
  )
}

function ZahlenMaske({ onBack }: Props) {
  const { t } = useSprache()
  const PERIODEN: { wert: Periode; titel: string }[] = [
    { wert: 'ytd', titel: t.zJahrBisHeute },
    { wert: 'total', titel: t.zTotal },
  ]
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([])
  const [auslagen, setAuslagen] = useState<Auslage[]>([])
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [sendet, setSendet] = useState(false)
  const [periode, setPeriode] = useState<Periode>('ytd')
  const [offenerEditor, setOffenerEditor] = useState<string | null>(null)
  const [abrechnungen, setAbrechnungen] = useState<Abrechnung[]>([])
  /*
   * Die Auswahl liegt im Browser, nicht auf dem Server: Sie ist ein paar
   * Klicks lang und keine Tatsache. Erst "Abrechnen" macht daraus einen
   * Entwurf, und der steht dann fuer alle gleich da.
   */
  const [gewaehlteAuftraege, setGewaehlteAuftraege] = useState<string[]>([])
  const [gewaehltePosten, setGewaehltePosten] = useState<string[]>([])
  const [offeneHistorie, setOffeneHistorie] = useState<string | null>(null)

  /*
   * Die festen Kostenarten heissen hier, nicht in src/lib/pl.ts: Dort stuende
   * deutscher Text, der auch in der tuerkischen Ansicht deutsch bliebe.
   */
  const KOSTENTITEL: Record<KostenArt | 'auslage' | 'montage', string> = {
    herstellung: t.zHerstellung,
    lieferung: t.zLieferkosten,
    mwst: t.zEinfuhrsteuer,
    kargo: t.zKargoMwst,
    weiteres: t.zWeitereKosten,
    auslage: t.zBetriebskosten,
    montage: t.zMontageSchuld,
  }

  const laden = useCallback(async () => {
    setLaedt(true)
    try {
      const s = await adminStatus()
      setStatus(s)
      if (s.angemeldet) {
        const [b, a, ab] = await Promise.all([ladeBestellungen(), ladeAuslagen(), ladeAbrechnungen()])
        setBestellungen(b)
        setAuslagen(a)
        setAbrechnungen(ab)
      }
      setFehler(null)
    } catch (f) {
      /*
       * Den eigenen Satz setzt die Anzeige, nicht diese Funktion: Sonst
       * haengt `laden` an den Texten und wird bei jedem Sprachwechsel neu
       * gebaut – und mit ihr der useEffect, der sie aufruft.
       */
      setFehler(f instanceof Error ? f.message : 'laden')
    }
    setLaedt(false)
  }, [])

  useEffect(() => { void laden() }, [laden])

  const handleAnmelden = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendet(true)
    setFehler(null)
    try {
      await anmelden(passwort)
      setPasswort('')
      await laden()
    } catch (f) {
      setFehler(f instanceof Error ? f.message : t.zAnmeldungFehler)
    }
    setSendet(false)
  }

  if (laedt && !status) {
    return <section className="section zahlen"><div className="shell"><p>{t.laedt}</p></div></section>
  }

  if (!status?.angemeldet) {
    return (
      <section className="section zahlen">
        <div className="shell admin__schmal">
          <h1>{t.zahlenTitel}</h1>
          <form className="admin__anmeldung" onSubmit={handleAnmelden}>
            <div className="field">
              <label className="field__label" htmlFor="zahlen-passwort">{t.passwort}</label>
              <input id="zahlen-passwort" className="input" type="password"
                autoComplete="current-password" value={passwort}
                onChange={(e) => setPasswort(e.target.value)} />
            </div>
            {fehler && <p className="form-status form-status--error">{fehler === 'laden' ? t.zDatenFehler : fehler}</p>}
            <button type="submit" className="btn" disabled={sendet || passwort.length === 0}>
              {sendet ? t.wirdGeprueft : t.anmelden}
            </button>
          </form>
          <button type="button" className="btn btn--quiet" onClick={onBack}>{t.zurueckZurSeite}</button>
        </div>
      </section>
    )
  }

  /* --- Gerechnet wird hier, bei jedem Laden neu ---------------------------- */

  /*
   * ALLES AB DER ZUSAGE, auch das von Hand Ausgenommene. Sonst verschwaende
   * ein Auftrag beim Anklicken von "zaehlt mit" samt seinem Kaestchen, und
   * er liesse sich nie wieder hereinholen. Gerechnet wird trotzdem nur mit
   * den eingerechneten – das entscheidet `inRechnung` in der Auswertung,
   * nicht diese Liste.
   */
  const zeilen = bestellungen.filter(zaehltPhase).map((b) => ({ b, z: zahlenFuer(b) }))
  const gerechnet = zeilen.filter((x) => !x.b.ausserRechnung)
  const perioden = abschnitte(bestellungen, auslagen, periode)
  const k = kennzahlen(bestellungen, auslagen)
  const aussicht = forecast(bestellungen)
  const forderungen = offeneForderungen(bestellungen)
  const schulden = offeneSchulden(bestellungen, auslagen)
  const netzkosten = warenkosten(bestellungen)
  const entwurf = abrechnungen.find((a) => !a.erledigtAm)
  const erledigte = abrechnungen.filter((a) => a.erledigtAm)
  const einnahmen = offeneEinnahmen(bestellungen, abrechnungen)

  /* Sendungen: die Pakete, wie sie zu Bora gegangen sind. */
  const pakete = new Map<string, {
    anzahl: number; netze: number; erloes: number; kosten: number; geschaetzt: boolean
  }>()
  for (const { b, z } of gerechnet) {
    if (!b.paket) continue
    const p = pakete.get(b.paket) ?? { anzahl: 0, netze: 0, erloes: 0, kosten: 0, geschaetzt: false }
    p.anzahl += 1
    p.netze += z.netzZahl
    p.erloes += z.erloesChf
    p.kosten += z.kostenChf
    /* Ein einziger Auftrag ohne erfasste Kosten macht die ganze Sendung zur Schaetzung. */
    if (z.geschaetzt) p.geschaetzt = true
    pakete.set(b.paket, p)
  }

  /*
   * ABGERECHNET WIRD PRO AUFTRAG: Wer einen Auftrag ankreuzt, nimmt seine
   * Kosten mit - Netze, Kargo, Montage. Das Kaestchen daneben ist dann
   * gesetzt und gesperrt, damit man sieht, was mitgeht, und es nicht
   * versehentlich wieder herausnimmt.
   */
  const mitAuftrag = (p: { bestellungId?: string }) =>
    p.bestellungId !== undefined && gewaehlteAuftraege.includes(p.bestellungId)

  const waehleAuftrag = (id: string, an: boolean) =>
    setGewaehlteAuftraege((l) => (an ? [...l, id] : l.filter((x) => x !== id)))
  const waehlePosten = (schluessel: string, an: boolean) =>
    setGewaehltePosten((l) => (an ? [...l, schluessel] : l.filter((x) => x !== schluessel)))

  /**
   * Aus der Auswahl einen Entwurf machen.
   *
   * GERECHNET WIRD HIER UND MITGESCHICKT. Die Formel steht in src/lib/pl.ts,
   * und api/ darf von dort nicht importieren - der Server legt ab, was
   * ankommt. Die Zeilen gehen mit ihren Betraegen mit, damit der Beleg
   * spaeter nicht davon abhaengt, ob es den Auftrag noch gibt.
   */
  const abrechnen = async () => {
    const { auftraege, posten } = abrechnungEntwurf(
      einnahmen, schulden, gewaehlteAuftraege, gewaehltePosten,
    )
    setSendet(true)
    setFehler(null)
    try {
      const neu = await legeAbrechnungAn({
        nummer: naechsteAbrechnungsnummer(abrechnungen),
        auftraege,
        posten,
        ...abrechnungZahlen(auftraege, posten),
      })
      setAbrechnungen((l) => [neu, ...l])
      setGewaehlteAuftraege([])
      setGewaehltePosten([])
    } catch (f) {
      setFehler(f instanceof Error ? f.message : t.zSpeichernSchiefgelaufen)
    }
    setSendet(false)
  }

  /**
   * Den Entwurf abschliessen.
   *
   * ERST DIE POSTEN, DANN DER ABSCHLUSS. Geht zwischendurch etwas schief,
   * steht die Abrechnung noch offen und laesst sich noch einmal abschliessen
   * - ein paar Posten sind dann schon auf bezahlt, und das Wiederholen
   * setzt sie noch einmal auf denselben Wert. Umgekehrt waere der Beleg
   * fertig und die Auslagen stuenden weiter offen.
   */
  const erledigen = async (a: Abrechnung) => {
    setSendet(true)
    setFehler(null)
    try {
      for (const p of a.posten) {
        if (p.auslageId) {
          const neu = await aendereAuslage(p.auslageId, { bezahlt: true })
          setAuslagen((l) => l.map((x) => (x.id === p.auslageId ? neu : x)))
          continue
        }
        const b = bestellungen.find((x) => x.id === p.bestellungId)
        if (!b || p.art === 'auslage') continue
        const vorhanden = (b.kosten ?? []).some((k) => k.id === p.postenId)
        const kosten: KostenPosten[] = vorhanden
          ? (b.kosten ?? []).map((k) => (k.id === p.postenId ? { ...k, bezahlt: true } : k))
          : [
              ...(b.kosten ?? []),
              {
                id: p.postenId,
                art: p.art,
                betragChf: p.betragChf,
                traeger: p.traeger,
                bezahlt: true,
                erfasstAm: new Date().toISOString(),
              },
            ]
        await kostenSpeichern(b.id, kosten)
      }
      const fertig = await aendereAbrechnung(a.id, { erledigt: true })
      setAbrechnungen((l) => l.map((x) => (x.id === a.id ? fertig : x)))
    } catch (f) {
      setFehler(f instanceof Error ? f.message : t.zSpeichernSchiefgelaufen)
    }
    setSendet(false)
  }

  const verwerfen = async (a: Abrechnung) => {
    setSendet(true)
    setFehler(null)
    try {
      await entferneAbrechnung(a.id)
      setAbrechnungen((l) => l.filter((x) => x.id !== a.id))
    } catch (f) {
      setFehler(f instanceof Error ? f.message : t.zSpeichernSchiefgelaufen)
    }
    setSendet(false)
  }

  const kostenSpeichern = async (id: string, kosten: KostenPosten[]) => {
    const neu = await aendereBestellung(id, { kosten })
    setBestellungen((liste) => liste.map((b) => (b.id === id ? neu : b)))
  }

  /* Ein Haekchen bei "Wer uns was schuldet": Das Geld ist eingegangen. */
  const einkassiert = async (id: string, ja: boolean) => {
    const neu = await aendereBestellung(id, { bezahlt: ja })
    setBestellungen((liste) => liste.map((b) => (b.id === id ? neu : b)))
  }


  return (
    <section className="section zahlen">
      <div className="shell">
        <div className="zahlen__kopf">
          <h1>{t.zahlenTitel}</h1>
          <div className="zahlen__kopfknoepfe">
            <SprachSchalter />
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => void laden()}>
              {t.aktualisieren}
            </button>
            <button type="button" className="btn btn--quiet btn--sm" onClick={onBack}>{t.zurueck}</button>
          </div>
        </div>

        {status.demo === true && (
          <p className="zahlen__demo">{t.zahlenDemo}</p>
        )}
        {fehler && <p className="form-status form-status--error">{fehler === 'laden' ? t.zDatenFehler : fehler}</p>}

        {/* --- Kennzahlen ---------------------------------------------------- */}
        <div className="kennzahlen">
          <div className="kennzahl">
            <span className="kennzahl__titel">{t.zTotalErloes}</span>
            <strong className="kennzahl__wert">{formatChf(k.erloesChf)}</strong>
            <span className="kennzahl__zusatz">
              {t.zTotalErloesSatz}
            </span>
            <dl className="kennzahl__teile">
              <div title={t.zCashedHilfe}>
                <dt>{t.zCashed}</dt><dd>{formatChf(k.cashedChf)}</dd>
              </div>
              <div title={t.zDebitHilfe}>
                <dt>{t.zDebit}</dt><dd>{formatChf(k.debitChf)}</dd>
              </div>
              <div title={t.zInArbeitHilfe}>
                <dt>{t.zInArbeit}</dt><dd>{formatChf(k.inArbeitChf)}</dd>
              </div>
            </dl>
          </div>

          <div className="kennzahl">
            <span className="kennzahl__titel">{t.zBetriebsergebnis}</span>
            <strong className="kennzahl__wert">{formatChf(k.betriebsergebnisChf)}</strong>
            <span className="kennzahl__zusatz">
              {t.zBetriebsergebnisSatz}
            </span>
            <dl className="kennzahl__teile">
              <div><dt>{t.zRentabilitaet}</dt><dd>{k.rentabilitaet === null ? '–' : `${k.rentabilitaet} %`}</dd></div>
            </dl>
          </div>

          <div className="kennzahl">
            <span className="kennzahl__titel">{t.zErgebnisReal}</span>
            <strong className="kennzahl__wert">{formatChf(k.realErgebnisChf)}</strong>
            <span className="kennzahl__zusatz">
              {t.zErgebnisRealSatz}
            </span>
          </div>

          <div className="kennzahl">
            <span className="kennzahl__titel">{t.zTotalKosten}</span>
            <strong className="kennzahl__wert">{formatChf(k.kostenChf)}</strong>
            <span className="kennzahl__zusatz">
              {t.zWare} {formatChf(k.warenkostenChf)} · {t.zBetrieb} {formatChf(k.betriebskostenChf)}
            </span>
            <dl className="kennzahl__teile">
              <div title={t.zBezahltHilfe}>
                <dt>{t.zBezahlt}</dt><dd>{formatChf(k.bezahltKostenChf)}</dd>
              </div>
              <div title={t.zCreditHilfe}>
                <dt>{t.zCredit}</dt><dd>{formatChf(k.creditChf)}</dd>
              </div>
              <div title={t.zOhneBelegHilfe}>
                <dt>{t.zOhneBeleg}</dt><dd>{formatChf(k.ohneBelegChf)}</dd>
              </div>
            </dl>
          </div>

          <div className="kennzahl">
            <span className="kennzahl__titel">{t.zFunnel}</span>
            <strong className="kennzahl__wert">{formatChf(k.funnelChf)}</strong>
            <span className="kennzahl__zusatz">
              {fuelle(t.zFunnelSatz, { n: k.funnelAnzahl, m: k.funnelNetze })}
            </span>
            <dl className="kennzahl__teile">
              <div><dt>{t.zKosten}</dt><dd>{formatChf(k.funnelKostenChf)}</dd></div>
              <div><dt>{t.zMarge}</dt><dd>{formatChf(k.funnelMargeChf)}</dd></div>
            </dl>
          </div>

          {/*
            STUECK, NICHT FRANKEN. Alle anderen Kacheln zeigen Geld; wie viele
            Netze dahinterstehen, stand bisher nur in den Tabellen verstreut.
          */}
          <div className="kennzahl">
            <span className="kennzahl__titel">{t.zNetzeUndAuftraege}</span>
            <strong className="kennzahl__wert">{k.auftraegeNetze + k.funnelNetze}</strong>
            <span className="kennzahl__zusatz">
              {fuelle(t.zNetzeUndAuftraegeSatz, { auftraege: k.auftraegeAnzahl + k.funnelAnzahl })}
            </span>
            <dl className="kennzahl__teile">
              <div>
                <dt>{t.zFest}</dt>
                <dd>{fuelle(t.zStueckSatz, { a: k.auftraegeAnzahl, n: k.auftraegeNetze })}</dd>
              </div>
              <div>
                <dt>{t.zFunnel}</dt>
                <dd>{fuelle(t.zStueckSatzFunnel, { a: k.funnelAnzahl, n: k.funnelNetze })}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* --- Perioden ------------------------------------------------------ */}
        <div className="zahlen__block">
          <div className="zahlen__blockkopf">
            <h2>{t.zAuftraegeIst}</h2>
            <div className="zahlen__schalter">
              {PERIODEN.map((p) => (
                <button key={p.wert} type="button"
                  className={`btn btn--sm${periode === p.wert ? '' : ' btn--ghost'}`}
                  onClick={() => setPeriode(p.wert)}>
                  {p.titel}
                </button>
              ))}
            </div>
          </div>
          <div className="zahlen__rollen"><table className="zahlen__tabelle">
            <thead>
              <tr>
                <th>{t.zAbschnitt}</th>
                <th className="zahlen__zahl">{t.zAuftraege}</th>
                <th className="zahlen__zahl">{t.netzeMehrzahl}</th>
                <th className="zahlen__zahl">{t.zErloes}</th>
                <th className="zahlen__zahl">{t.zEinkassiert}</th>
                <th className="zahlen__zahl">{t.zOffen}</th>
                <th className="zahlen__zahl">{t.zInArbeit}</th>
                <th className="zahlen__zahl">{t.zWarenkosten}</th>
                <th className="zahlen__zahl">{t.zBetriebskosten}</th>
                <th className="zahlen__zahl">{t.zErgebnis}</th>
              </tr>
            </thead>
            <tbody>
              {perioden.map((a) => (
                <tr key={a.schluessel}>
                  <td data-titel={t.zAbschnitt}>
                    {periode === 'total'
                      ? t.zAbschnittTotal
                      : fuelle(t.zAbschnittJahr, { jahr: a.schluessel })}
                  </td>
                  <td data-titel={t.zAuftraege} className="zahlen__zahl">{a.anzahl}</td>
                  <td data-titel={t.netzeMehrzahl} className="zahlen__zahl">{a.netzZahl}</td>
                  <td data-titel={t.zErloes} className="zahlen__zahl">{formatChf(a.erloesChf)}</td>
                  <td data-titel={t.zEinkassiert} className="zahlen__zahl">{formatChf(a.einkassiertChf)}</td>
                  <td data-titel={t.zOffen} className="zahlen__zahl">{formatChf(a.offenChf)}</td>
                  <td data-titel={t.zInArbeit} className="zahlen__zahl">{formatChf(a.erwartetChf)}</td>
                  <td data-titel={t.zWarenkosten} className="zahlen__zahl">{formatChf(a.kostenChf)}</td>
                  <td data-titel={t.zBetriebskosten} className="zahlen__zahl">{formatChf(a.betriebskostenChf)}</td>
                  <td data-titel={t.zErgebnis} className="zahlen__zahl">
                    <strong>{formatChf(a.ergebnisChf)}</strong>
                  </td>
                </tr>
              ))}
              {perioden.length === 0 && (
                <tr><td colSpan={10}>{t.zKeineAuftraege}</td></tr>
              )}
            </tbody>
          </table></div>
          <p className="zahlen__hinweis">{t.zIstSatz}</p>
        </div>

        {/* --- Forecast ------------------------------------------------------ */}
        <div className="zahlen__block">
          <h2>{t.zFunnelTitel}</h2>
          <div className="zahlen__rollen"><table className="zahlen__tabelle">
            <thead>
              <tr>
                <th>{t.zStand}</th>
                <th className="zahlen__zahl">{t.zAnfragen}</th>
                <th className="zahlen__zahl">{t.netzeMehrzahl}</th>
                <th className="zahlen__zahl">{t.zErloesErwartet}</th>
                <th className="zahlen__zahl">{t.zKostenErwartet}</th>
                <th className="zahlen__zahl">{t.zMargeErwartet}</th>
              </tr>
            </thead>
            <tbody>
              {aussicht.map((f) => (
                <tr key={f.phase}>
                  <td data-titel={t.zStand}>{f.etikett}</td>
                  <td data-titel={t.zAnfragen} className="zahlen__zahl">{f.anzahl}</td>
                  <td data-titel={t.netzeMehrzahl} className="zahlen__zahl">{f.netzZahl}</td>
                  <td data-titel={t.zErloesErwartet} className="zahlen__zahl">{formatChf(f.erloesChf)}</td>
                  <td data-titel={t.zKostenErwartet} className="zahlen__zahl">{formatChf(f.kostenChf)}</td>
                  <td data-titel={t.zMargeErwartet} className="zahlen__zahl">
                    <strong>{formatChf(f.margeChf)}</strong>
                  </td>
                </tr>
              ))}
              {aussicht.length === 0
                ? <tr><td colSpan={6}>{t.zKeineAnfragen}</td></tr>
                : (
                  <tr className="zahlen__strich">
                    <td data-titel={t.zStand}><strong>{t.zZusammen}</strong></td>
                    <td data-titel={t.zAnfragen} className="zahlen__zahl">
                      <strong>{aussicht.reduce((s, f) => s + f.anzahl, 0)}</strong>
                    </td>
                    <td data-titel={t.netzeMehrzahl} className="zahlen__zahl">
                      <strong>{aussicht.reduce((s, f) => s + f.netzZahl, 0)}</strong>
                    </td>
                    <td data-titel={t.zErloesErwartet} className="zahlen__zahl">
                      <strong>{formatChf(aussicht.reduce((s, f) => s + f.erloesChf, 0))}</strong>
                    </td>
                    <td data-titel={t.zKostenErwartet} className="zahlen__zahl">
                      <strong>{formatChf(aussicht.reduce((s, f) => s + f.kostenChf, 0))}</strong>
                    </td>
                    <td data-titel={t.zMargeErwartet} className="zahlen__zahl">
                      <strong>{formatChf(aussicht.reduce((s, f) => s + f.margeChf, 0))}</strong>
                    </td>
                  </tr>
                )}
            </tbody>
          </table></div>
          <p className="zahlen__hinweis">{t.zFunnelHinweis}</p>
        </div>

        {/* --- Pro Bestellung ------------------------------------------------ */}
        <div className="zahlen__block">
          <h2>{t.zProAuftrag}</h2>
          <p className="zahlen__hinweis">
            {/*
              HIER WIRD NICHTS VERWALTET. Es gab einmal ein Kaestchen "zaehlt
              mit", das einen Auftrag aus den Zahlen nahm - damit liessen sich
              Auftraege an zwei Orten steuern, im Adminbereich und hier. Ein
              Auftrag, der nicht zaehlen soll, wird im Adminbereich abgesagt;
              dann faellt er hier von selbst heraus.
            */}
            {t.zProAuftragSatz}
          </p>
          <div className="zahlen__rollen"><table className="zahlen__tabelle">
            <thead>
              <tr>
                <th>{t.zAuftrag}</th>
                <th>{t.paketMarke}</th>
                <th className="zahlen__zahl">{t.netzeMehrzahl}</th>
                <th className="zahlen__zahl">{t.montageSumme}</th>
                <th className="zahlen__zahl">{t.anfahrtSumme}</th>
                <th className="zahlen__zahl">{t.rabattSumme}</th>
                <th className="zahlen__zahl">{t.zErloes}</th>
                <th className="zahlen__zahl">{t.zKosten}</th>
                <th className="zahlen__zahl">{t.zMarge}</th>
                <th>{t.zStand}</th>
                <th>{t.zKosten}</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map(({ b, z }) => (
                <tr key={b.id} className={b.ausserRechnung ? 'zahlen__ausgenommen' : undefined}>
                  <td data-titel={t.zAuftrag}>
                    {b.kunde.name}
                    <span className="zahlen__klein">{b.referenz}</span>
                  </td>
                  <td data-titel={t.paketMarke}>{b.paket ?? '–'}</td>
                  <td data-titel={t.netzeMehrzahl} className="zahlen__zahl">{formatChf(z.netzeChf)}</td>
                  <td data-titel={t.montageSumme} className="zahlen__zahl">{formatChf(z.montageChf)}</td>
                  <td data-titel={t.anfahrtSumme} className="zahlen__zahl">{formatChf(z.anfahrtChf)}</td>
                  <td data-titel={t.rabattSumme} className="zahlen__zahl">
                    {z.rabattChf > 0 ? `− ${formatChf(z.rabattChf)}` : '–'}
                  </td>
                  <td data-titel={t.zErloes} className="zahlen__zahl">{formatChf(z.erloesChf)}</td>
                  <td data-titel={t.zKosten} className="zahlen__zahl">
                    {formatChf(z.kostenChf)}
                    {z.geschaetzt && <span className="kosten__marke">{t.zGeschaetzt}</span>}
                  </td>
                  <td data-titel={t.zMarge} className="zahlen__zahl">
                    <strong>{formatChf(z.margeChf)}</strong>
                    {z.margeProzent !== null && <span className="zahlen__klein">{z.margeProzent} %</span>}
                  </td>
                  <td data-titel={t.zStand}>
                    {b.ausserRechnung
                      ? t.zStandNichtGerechnet
                      : z.einkassiert ? t.zStandEinkassiert
                      : z.realisiert ? t.zStandOffen : t.zStandErwartet}
                  </td>
                  <td data-titel={t.zKosten}>
                    <button type="button" className="btn btn--quiet btn--sm"
                      onClick={() => setOffenerEditor(offenerEditor === b.id ? null : b.id)}>
                      {offenerEditor === b.id ? t.zSchliessen : t.zBearbeiten}
                    </button>
                  </td>
                </tr>
              ))}
              {zeilen.length === 0 && <tr><td colSpan={10}>{t.zKeineAuftraege}</td></tr>}
            </tbody>
          </table></div>

          {offenerEditor && (() => {
            const b = bestellungen.find((x) => x.id === offenerEditor)
            if (!b) return null
            return (
              <div className="zahlen__editor">
                <h3>{t.zKosten} · {b.kunde.name} · {b.referenz}</h3>
                <KostenEditor
                  bestellung={b}
                  onSpeichern={(kosten) => kostenSpeichern(b.id, kosten)}
                  onSchliessen={() => setOffenerEditor(null)}
                />
              </div>
            )
          })()}
        </div>

        {/* --- Pro Sendung --------------------------------------------------- */}
        {pakete.size > 0 && (
          <div className="zahlen__block">
            <h2>{t.zProSendung}</h2>
            <div className="zahlen__rollen"><table className="zahlen__tabelle">
              <thead>
                <tr>
                  <th>{t.paketMarke}</th>
                  <th className="zahlen__zahl">{t.zAuftraege}</th>
                  <th className="zahlen__zahl">{t.netzeMehrzahl}</th>
                  <th className="zahlen__zahl">{t.zErloes}</th>
                  <th className="zahlen__zahl">{t.zKosten}</th>
                  <th className="zahlen__zahl">{t.zMarge}</th>
                  <th className="zahlen__zahl">{t.zJeNetz}</th>
                </tr>
              </thead>
              <tbody>
                {[...pakete.entries()].map(([name, p]) => (
                  <tr key={name}>
                    <td data-titel={t.paketMarke}>{name}</td>
                    <td data-titel={t.zAuftraege} className="zahlen__zahl">{p.anzahl}</td>
                    <td data-titel={t.netzeMehrzahl} className="zahlen__zahl">{p.netze}</td>
                    <td data-titel={t.zErloes} className="zahlen__zahl">{formatChf(p.erloes)}</td>
                    <td data-titel={t.zKosten} className="zahlen__zahl">
                      {formatChf(p.kosten)}
                      {p.geschaetzt && <span className="kosten__marke">{t.zGeschaetzt}</span>}
                    </td>
                    <td data-titel={t.zMarge} className="zahlen__zahl">
                      <strong>{formatChf(p.erloes - p.kosten)}</strong>
                      {p.erloes > 0 && (
                        <span className="zahlen__klein">
                          {Math.round(((p.erloes - p.kosten) / p.erloes) * 1000) / 10} %
                        </span>
                      )}
                    </td>
                    <td data-titel={t.zJeNetz} className="zahlen__zahl">
                      {p.netze > 0 ? formatChf((p.erloes - p.kosten) / p.netze) : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}

        {/* --- Betriebskosten ------------------------------------------------ */}
        <AuslagenListe
          auslagen={auslagen}
          netzkosten={netzkosten}
          onAnlegen={async (a) => { const neu = await legeAuslageAn(a); setAuslagen((l) => [neu, ...l]) }}
          onAendern={async (id, teil) => {
            const neu = await aendereAuslage(id, teil)
            setAuslagen((l) => l.map((x) => (x.id === id ? neu : x)))
          }}
          onEntfernen={async (id) => { await entferneAuslage(id); setAuslagen((l) => l.filter((x) => x.id !== id)) }}
        />

        {/* --- Offene Posten ------------------------------------------------- */}
        {/*
          ZWEI VERSCHIEDENE HAEKCHEN, und der Unterschied ist der ganze Umbau.

          Links heisst es "das Geld ist eingegangen". Der Auftrag faellt aus
          den Forderungen und taucht unten bei den Einnahmen auf, die sich
          abrechnen lassen.

          Rechts heisst es "nimm diese Auslage in die naechste Abrechnung".
          Frueher hiess es dort "ist zurueckbezahlt", und der Posten
          verschwand beim Anklicken - das war die Meldung ueber etwas, das
          schon geschehen war, und nicht der Weg, es zu tun. Zurueckbezahlt
          wird jetzt beim Abschluss der Abrechnung, und zwar fuer alles
          darin auf einmal.
        */}
        <div className="zahlen__block zahlen__zweispaltig">
          <div>
            <h2>{t.zSchuldetUns}</h2>
            {forderungen.length === 0 ? <p className="zahlen__hinweis">{t.zNichtsOffen}</p> : (
              <div className="zahlen__rollen"><table className="zahlen__tabelle">
                <thead>
                  <tr>
                    <th>{t.zAuftrag}</th>
                    <th>{t.zDatum}</th>
                    <th>{t.zGeliefert}</th>
                    <th className="zahlen__zahl">{t.zBetrag}</th>
                    <th>{t.zBezahltFrage}</th>
                  </tr>
                </thead>
                <tbody>
                  {forderungen.map((f) => (
                    <tr key={f.bestellungId}>
                      <td data-titel={t.zAuftrag}>{f.kunde}</td>
                      <td data-titel={t.zDatum}>{f.seit.slice(0, 10)}</td>
                      <td data-titel={t.zGeliefert}>{f.geliefert ? '✓' : '–'}</td>
                      <td data-titel={t.zBetrag} className="zahlen__zahl">{formatChf(f.betragChf)}</td>
                      <td data-titel={t.zBezahltFrage}>
                        <input type="checkbox" checked={false} aria-label={t.zBezahltFrage}
                          onChange={() => void einkassiert(f.bestellungId, true)} />
                      </td>
                    </tr>
                  ))}
                  <tr className="zahlen__strich">
                    <td colSpan={3}><strong>{t.zZusammen}</strong></td>
                    <td className="zahlen__zahl">
                      <strong>{formatChf(forderungen.reduce((x, f) => x + f.betragChf, 0))}</strong>
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table></div>
            )}
          </div>
          <div>
            <h2>{t.zSchuldenWir}</h2>
            <p className="zahlen__hinweis">{t.zMontageSchuldSatz}</p>
            {schulden.length === 0 ? <p className="zahlen__hinweis">{t.zNichtsOffen}</p> : (
              <div className="zahlen__rollen"><table className="zahlen__tabelle">
                <thead>
                  <tr>
                    <th>{t.zPosten}</th>
                    <th className="zahlen__zahl">{t.zBetrag}</th>
                    <th>{t.zAuswaehlen}</th>
                  </tr>
                </thead>
                <tbody>
                  {schulden.map((sch) => (
                    <Fragment key={sch.traeger}>
                      <tr className="zahlen__strich">
                        <td><strong>{beteiligte[sch.traeger]}</strong></td>
                        <td className="zahlen__zahl"><strong>{formatChf(sch.betragChf)}</strong></td>
                        <td />
                      </tr>
                      {sch.posten.map((p) => (
                        <tr key={p.postenId}>
                          <td data-titel={t.zPosten}>
                            {p.bezeichnung ?? KOSTENTITEL[p.art]}
                            {/*
                              KEINE MARKE AN DER MONTAGE. "nicht erfasst"
                              heisst "da fehlt noch ein Beleg" - bei der
                              Montage fehlt nichts: Sie ergibt sich aus dem
                              Auftrag und soll nirgends eingetippt werden.
                            */}
                            {!p.erfasst && p.art !== 'montage' && (
                              /*
                                KEINE MARKE AN DER MONTAGE. "nicht erfasst"
                                heisst "da fehlt noch ein Beleg" - bei der
                                Montage fehlt nichts: Sie steht im Auftrag.
                              */
                              <span className="kosten__marke">{t.zGerechnet}</span>
                            )}
                            <span className="zahlen__klein">
                              {p.kunde ? `${p.kunde} · ${p.am.slice(0, 10)}` : p.am.slice(0, 10)}
                            </span>
                          </td>
                          <td data-titel={t.zBetrag} className="zahlen__zahl">{formatChf(p.betragChf)}</td>
                          <td data-titel={t.zAuswaehlen}>
                            <input type="checkbox" aria-label={t.zAuswaehlen}
                              disabled={entwurf !== undefined || mitAuftrag(p)}
                              checked={mitAuftrag(p) || gewaehltePosten.includes(postenSchluessel(p))}
                              onChange={(e) => waehlePosten(postenSchluessel(p), e.target.checked)} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
        </div>

        {/* --- Abrechnung ---------------------------------------------------- */}
        <div className="zahlen__block">
          <h2>{t.zAbrechnung}</h2>

          {entwurf ? (
            <>
              <p className="zahlen__hinweis">
                <span className="kosten__marke">{t.zEntwurf}</span> {entwurf.nummer} · {t.zEntwurfSatz}
              </p>
              <AbrechnungBlatt abrechnung={entwurf} t={t} />
              <div className="zahlen__werkzeug">
                <button type="button" className="btn" disabled={sendet}
                  onClick={() => void erledigen(entwurf)}>
                  {sendet ? t.zWirdAbgeschlossen : t.zErledigtKnopf}
                </button>
                <button type="button" className="btn btn--quiet" disabled={sendet}
                  onClick={() => void verwerfen(entwurf)}>
                  {t.zVerwerfenKnopf}
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="zahlen__unterkopf">{t.zEinnahmen}</h3>
              <p className="zahlen__hinweis">{t.zEinnahmenSatz} {t.zProAuftragSatz2}</p>
              {einnahmen.length === 0 ? <p className="zahlen__hinweis">{t.zNichtsEinzunehmen}</p> : (
                <div className="zahlen__rollen"><table className="zahlen__tabelle">
                  <thead>
                    <tr>
                      <th>{t.zAuftrag}</th>
                      <th>{t.zDatum}</th>
                      <th className="zahlen__zahl">{t.zErloes}</th>
                      {/*
                        WAS MITGEHT, STEHT DANEBEN. Mit dem Auftrag werden
                        seine Kosten abgerechnet; ohne diese Spalte muesste
                        man sie sich aus der Liste rechts zusammensuchen.
                      */}
                      <th className="zahlen__zahl">{t.zKosten}</th>
                      <th className="zahlen__zahl">{t.zBleibt}</th>
                      <th>{t.zAuswaehlen}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {einnahmen.map((e) => (
                      <tr key={e.bestellungId}>
                        <td data-titel={t.zAuftrag}>
                          {e.kunde}
                          <span className="zahlen__klein">{e.referenz}</span>
                        </td>
                        <td data-titel={t.zDatum}>{e.am.slice(0, 10)}</td>
                        <td data-titel={t.zErloes} className="zahlen__zahl">{formatChf(e.erloesChf)}</td>
                        <td data-titel={t.zKosten} className="zahlen__zahl">
                          − {formatChf(postenSummeFuer(schulden, e.bestellungId))}
                        </td>
                        <td data-titel={t.zBleibt} className="zahlen__zahl">
                          <strong>
                            {formatChf(e.erloesChf - postenSummeFuer(schulden, e.bestellungId))}
                          </strong>
                        </td>
                        <td data-titel={t.zAuswaehlen}>
                          <input type="checkbox" aria-label={t.zAuswaehlen}
                            checked={gewaehlteAuftraege.includes(e.bestellungId)}
                            onChange={(ev) => waehleAuftrag(e.bestellungId, ev.target.checked)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              )}

              {gewaehlteAuftraege.length + gewaehltePosten.length === 0 ? (
                /*
                 * Der Satz steht nur da, wenn es ueberhaupt etwas zu waehlen
                 * gibt. Sonst las sich die Seite zweimal hintereinander wie
                 * eine Aufforderung ins Leere: "nichts da" und direkt
                 * darunter "waehle etwas aus".
                 */
                (einnahmen.length > 0 || schulden.length > 0) && (
                  <p className="zahlen__hinweis">{t.zAbrechnungLeer}</p>
                )
              ) : (
                <div className="zahlen__werkzeug">
                  <button type="button" className="btn" disabled={sendet} onClick={() => void abrechnen()}>
                    {t.zAbrechnenKnopf}
                  </button>
                  <span className="zahlen__hinweis">
                    {fuelle(t.zAbrechnenSatz, {
                      a: gewaehlteAuftraege.length,
                      p: abrechnungEntwurf(einnahmen, schulden, gewaehlteAuftraege, gewaehltePosten)
                        .posten.length,
                    })}
                  </span>
                </div>
              )}
            </>
          )}

          <p className="zahlen__hinweis">
            {fuelle(t.zVerteilungSatz, {
              kurs: kostenConfig.eurChf,
              steuer: (kostenConfig.einfuhrsteuer * 100).toFixed(1),
            })}
          </p>

          {/* --- Historie ---------------------------------------------------- */}
          <h3 className="zahlen__unterkopf">{t.zHistorie}</h3>
          {erledigte.length === 0 ? <p className="zahlen__hinweis">{t.zHistorieLeer}</p> : (
            <>
              <p className="zahlen__hinweis">{t.zHistorieSatz}</p>
              <ul className="abrechnung__liste">
                {erledigte.map((a) => (
                  <li key={a.id} className="abrechnung__eintrag">
                    <button type="button" className="abrechnung__kopf"
                      aria-expanded={offeneHistorie === a.id}
                      onClick={() => setOffeneHistorie(offeneHistorie === a.id ? null : a.id)}>
                      <span className="abrechnung__nummer">{a.nummer}</span>
                      <span className="zahlen__klein">
                        {t.zAbrechnungAm} {(a.erledigtAm ?? a.erstelltAm).slice(0, 10)} ·{' '}
                        {a.auftraege.length} {a.auftraege.length === 1 ? t.zAuftrag : t.zAuftraegeDarin} ·{' '}
                        {a.posten.length} {t.zPosten}
                      </span>
                      <span className="abrechnung__summe">{formatChf(a.erloesChf)}</span>
                      <span className="abrechnung__pfeil" aria-hidden="true">
                        {offeneHistorie === a.id ? t.zZuklappen : t.zAufklappen}
                      </span>
                    </button>
                    {offeneHistorie === a.id && (
                      <div className="abrechnung__inhalt">
                        {a.notiz && <p className="zahlen__hinweis">{a.notiz}</p>}
                        <AbrechnungBlatt abrechnung={a} t={t} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
