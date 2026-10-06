import { useCallback, useEffect, useState } from 'react'
import type { AdminStatus, Auslage, Bestellung, KostenPosten } from '../../types'
import {
  adminStatus, aendereAuslage, aendereBestellung, anmelden,
  entferneAuslage, ladeAuslagen, ladeBestellungen, legeAuslageAn,
} from '../../lib/adminApi'
import { beteiligte, kostenConfig } from '../../data/kostenConfig'
import { formatChf } from '../../lib/format'
import {
  abschnitte, aufteilung, forecast, kennzahlen, offeneForderungen, offeneSchulden,
  zaehltPhase, zahlenFuer, type Periode,
} from '../../lib/pl'
import { KostenEditor } from './KostenEditor'
import { AuslagenListe } from './AuslagenListe'
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

const PERIODEN: { wert: Periode; titel: string }[] = [
  { wert: 'monat', titel: 'Monat' },
  { wert: 'quartal', titel: 'Quartal' },
  { wert: 'ytd', titel: 'Jahr bis heute' },
]

interface Props {
  onBack: () => void
}

export function ZahlenPage({ onBack }: Props) {
  const [status, setStatus] = useState<AdminStatus | null>(null)
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([])
  const [auslagen, setAuslagen] = useState<Auslage[]>([])
  const [passwort, setPasswort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [sendet, setSendet] = useState(false)
  const [periode, setPeriode] = useState<Periode>('monat')
  const [offenerEditor, setOffenerEditor] = useState<string | null>(null)

  const laden = useCallback(async () => {
    setLaedt(true)
    try {
      const s = await adminStatus()
      setStatus(s)
      if (s.angemeldet) {
        const [b, a] = await Promise.all([ladeBestellungen(), ladeAuslagen()])
        setBestellungen(b)
        setAuslagen(a)
      }
      setFehler(null)
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Die Daten liessen sich nicht laden.')
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
      setFehler(f instanceof Error ? f.message : 'Die Anmeldung ging schief.')
    }
    setSendet(false)
  }

  if (laedt && !status) {
    return <section className="section zahlen"><div className="shell"><p>Wird geladen …</p></div></section>
  }

  if (!status?.angemeldet) {
    return (
      <section className="section zahlen">
        <div className="shell admin__schmal">
          <h1>Zahlen</h1>
          <form className="admin__anmeldung" onSubmit={handleAnmelden}>
            <div className="field">
              <label className="field__label" htmlFor="zahlen-passwort">Passwort</label>
              <input id="zahlen-passwort" className="input" type="password"
                autoComplete="current-password" value={passwort}
                onChange={(e) => setPasswort(e.target.value)} />
            </div>
            {fehler && <p className="form-status form-status--error">{fehler}</p>}
            <button type="submit" className="btn" disabled={sendet || passwort.length === 0}>
              {sendet ? 'Wird geprüft …' : 'Anmelden'}
            </button>
          </form>
          <button type="button" className="btn btn--quiet" onClick={onBack}>Zurück zur Seite</button>
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
  const teilung = aufteilung(bestellungen, auslagen)

  /* Sendungen: die Pakete, wie sie zu Bora gegangen sind. */
  const pakete = new Map<string, { anzahl: number; netze: number; erloes: number; kosten: number }>()
  for (const { b, z } of gerechnet) {
    if (!b.paket) continue
    const p = pakete.get(b.paket) ?? { anzahl: 0, netze: 0, erloes: 0, kosten: 0 }
    p.anzahl += 1
    p.netze += z.netzZahl
    p.erloes += z.erloesChf
    p.kosten += z.kostenChf
    pakete.set(b.paket, p)
  }

  const kostenSpeichern = async (id: string, kosten: KostenPosten[]) => {
    const neu = await aendereBestellung(id, { kosten })
    setBestellungen((liste) => liste.map((b) => (b.id === id ? neu : b)))
  }

  const ausserRechnung = async (id: string, an: boolean) => {
    const neu = await aendereBestellung(id, { ausserRechnung: an })
    setBestellungen((liste) => liste.map((b) => (b.id === id ? neu : b)))
  }

  return (
    <section className="section zahlen">
      <div className="shell">
        <div className="zahlen__kopf">
          <h1>Zahlen</h1>
          <div className="zahlen__kopfknoepfe">
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => void laden()}>
              Neu laden
            </button>
            <button type="button" className="btn btn--quiet btn--sm" onClick={onBack}>Zurück</button>
          </div>
        </div>

        {status.demo === true && (
          <p className="zahlen__demo">Testumgebung – Beispieldaten, keine Anmeldung nötig.</p>
        )}
        {fehler && <p className="form-status form-status--error">{fehler}</p>}

        {/* --- Kennzahlen ---------------------------------------------------- */}
        <div className="kennzahlen">
          <div className="kennzahl">
            <span className="kennzahl__titel">Total Erlös</span>
            <strong className="kennzahl__wert">{formatChf(k.erloesChf)}</strong>
            <span className="kennzahl__zusatz">
              alle festen Aufträge zum Verkaufspreis – ab der Zusage der Kundschaft
            </span>
            <dl className="kennzahl__teile">
              <div><dt>Cashed</dt><dd>{formatChf(k.cashedChf)}</dd></div>
              <div><dt>Debit</dt><dd>{formatChf(k.debitChf)}</dd></div>
              <div><dt>In Arbeit</dt><dd>{formatChf(k.inArbeitChf)}</dd></div>
            </dl>
          </div>

          <div className="kennzahl">
            <span className="kennzahl__titel">Betriebsergebnis</span>
            <strong className="kennzahl__wert">{formatChf(k.betriebsergebnisChf)}</strong>
            <span className="kennzahl__zusatz">
              Erlöse aller festen Aufträge minus Waren- und Betriebskosten
            </span>
            <dl className="kennzahl__teile">
              <div><dt>Rentabilität</dt><dd>{k.rentabilitaet === null ? '–' : `${k.rentabilitaet} %`}</dd></div>
            </dl>
          </div>

          <div className="kennzahl">
            <span className="kennzahl__titel">Betriebsergebnis real</span>
            <strong className="kennzahl__wert">{formatChf(k.realErgebnisChf)}</strong>
            <span className="kennzahl__zusatz">
              nur was geflossen ist: einkassiert gegen bezahlte Rechnungen
            </span>
          </div>

          <div className="kennzahl">
            <span className="kennzahl__titel">Total Kosten</span>
            <strong className="kennzahl__wert">{formatChf(k.kostenChf)}</strong>
            <span className="kennzahl__zusatz">Ware und Betrieb, bezahlt wie offen</span>
            <dl className="kennzahl__teile">
              <div><dt>Credit</dt><dd>{formatChf(k.creditChf)}</dd></div>
            </dl>
          </div>

          <div className="kennzahl">
            <span className="kennzahl__titel">Funnel</span>
            <strong className="kennzahl__wert">{formatChf(k.funnelChf)}</strong>
            <span className="kennzahl__zusatz">
              {k.funnelAnzahl} Anfragen · {k.funnelNetze} Netze, noch nicht zugesagt
            </span>
            <dl className="kennzahl__teile">
              <div><dt>Kosten</dt><dd>{formatChf(k.funnelKostenChf)}</dd></div>
              <div><dt>Marge</dt><dd>{formatChf(k.funnelMargeChf)}</dd></div>
            </dl>
          </div>
        </div>

        {/* --- Perioden ------------------------------------------------------ */}
        <div className="zahlen__block">
          <div className="zahlen__blockkopf">
            <h2>Erfolgsrechnung · Ist</h2>
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
                <th>Abschnitt</th>
                <th className="zahlen__zahl">Aufträge</th>
                <th className="zahlen__zahl">Netze</th>
                <th className="zahlen__zahl">Erlös</th>
                <th className="zahlen__zahl">davon einkassiert</th>
                <th className="zahlen__zahl">davon offen</th>
                <th className="zahlen__zahl">davon in Arbeit</th>
                <th className="zahlen__zahl">Warenkosten</th>
                <th className="zahlen__zahl">Betriebskosten</th>
                <th className="zahlen__zahl">Ergebnis</th>
              </tr>
            </thead>
            <tbody>
              {perioden.map((a) => (
                <tr key={a.schluessel}>
                  <td data-titel="Abschnitt">
                    {a.etikett}
                    {a.geschaetzt && <span className="kosten__marke">teils geschätzt</span>}
                  </td>
                  <td data-titel="Aufträge" className="zahlen__zahl">{a.anzahl}</td>
                  <td data-titel="Netze" className="zahlen__zahl">{a.netzZahl}</td>
                  <td data-titel="Erlös" className="zahlen__zahl">{formatChf(a.erloesChf)}</td>
                  <td data-titel="davon einkassiert" className="zahlen__zahl">{formatChf(a.einkassiertChf)}</td>
                  <td data-titel="davon offen" className="zahlen__zahl">{formatChf(a.offenChf)}</td>
                  <td data-titel="davon in Arbeit" className="zahlen__zahl">{formatChf(a.erwartetChf)}</td>
                  <td data-titel="Warenkosten" className="zahlen__zahl">{formatChf(a.kostenChf)}</td>
                  <td data-titel="Betriebskosten" className="zahlen__zahl">{formatChf(a.betriebskostenChf)}</td>
                  <td data-titel="Ergebnis" className="zahlen__zahl">
                    <strong>{formatChf(a.ergebnisChf)}</strong>
                  </td>
                </tr>
              ))}
              {perioden.length === 0 && (
                <tr><td colSpan={10}>Noch keine festen Aufträge.</td></tr>
              )}
            </tbody>
          </table></div>
          <p className="zahlen__hinweis">
            Hier stehen <strong>alle festen Aufträge</strong> – ab dem Moment, in dem die
            Kundschaft zugesagt hat. Der Erlös zählt im Monat der Auslieferung, bei noch nicht
            Geliefertem im Monat der Zusage. Die drei Spalten danach sagen, wie weit jeder ist,
            und ergeben zusammen wieder den Erlös: <strong>einkassiert</strong> ist auf dem
            Konto, <strong>offen</strong> sind die Debitoren (geliefert, noch nicht bezahlt),
            <strong>in Arbeit</strong> ist zugesagt und noch nicht geliefert.
          </p>
        </div>

        {/* --- Forecast ------------------------------------------------------ */}
        <div className="zahlen__block">
          <h2>Forecast · der Funnel</h2>
          <div className="zahlen__rollen"><table className="zahlen__tabelle">
            <thead>
              <tr>
                <th>Stand</th>
                <th className="zahlen__zahl">Anfragen</th>
                <th className="zahlen__zahl">Netze</th>
                <th className="zahlen__zahl">Erlös erwartet</th>
                <th className="zahlen__zahl">Kosten erwartet</th>
                <th className="zahlen__zahl">Marge erwartet</th>
              </tr>
            </thead>
            <tbody>
              {aussicht.map((f) => (
                <tr key={f.phase}>
                  <td data-titel="Stand">
                    {f.etikett}
                    {f.geschaetzt && <span className="kosten__marke">Kosten geschätzt</span>}
                  </td>
                  <td data-titel="Anfragen" className="zahlen__zahl">{f.anzahl}</td>
                  <td data-titel="Netze" className="zahlen__zahl">{f.netzZahl}</td>
                  <td data-titel="Erlös erwartet" className="zahlen__zahl">{formatChf(f.erloesChf)}</td>
                  <td data-titel="Kosten erwartet" className="zahlen__zahl">{formatChf(f.kostenChf)}</td>
                  <td data-titel="Marge erwartet" className="zahlen__zahl">
                    <strong>{formatChf(f.margeChf)}</strong>
                  </td>
                </tr>
              ))}
              {aussicht.length === 0
                ? <tr><td colSpan={6}>Keine offenen Anfragen.</td></tr>
                : (
                  <tr className="zahlen__strich">
                    <td data-titel="Stand"><strong>Zusammen</strong></td>
                    <td data-titel="Anfragen" className="zahlen__zahl">
                      <strong>{aussicht.reduce((s, f) => s + f.anzahl, 0)}</strong>
                    </td>
                    <td data-titel="Netze" className="zahlen__zahl">
                      <strong>{aussicht.reduce((s, f) => s + f.netzZahl, 0)}</strong>
                    </td>
                    <td data-titel="Erlös erwartet" className="zahlen__zahl">
                      <strong>{formatChf(aussicht.reduce((s, f) => s + f.erloesChf, 0))}</strong>
                    </td>
                    <td data-titel="Kosten erwartet" className="zahlen__zahl">
                      <strong>{formatChf(aussicht.reduce((s, f) => s + f.kostenChf, 0))}</strong>
                    </td>
                    <td data-titel="Marge erwartet" className="zahlen__zahl">
                      <strong>{formatChf(aussicht.reduce((s, f) => s + f.margeChf, 0))}</strong>
                    </td>
                  </tr>
                )}
            </tbody>
          </table></div>
          <p className="zahlen__hinweis">
            Alles <strong>vor</strong> der Zusage: von der frischen Anfrage bis zum Warten auf
            das Ja. Geordnet nach Nähe und nicht nach Monat – wann daraus etwas wird, und ob
            überhaupt, weiss heute niemand. Die Preise sind Vorschläge, die Kosten gerechnet.
            Nichts davon ist Ertrag, und deshalb geht diese Tabelle nie in eine Summe mit der
            Erfolgsrechnung ein.
          </p>
        </div>

        {/* --- Pro Bestellung ------------------------------------------------ */}
        <div className="zahlen__block">
          <h2>Pro Auftrag</h2>
          <div className="zahlen__rollen"><table className="zahlen__tabelle">
            <thead>
              <tr>
                <th>Auftrag</th>
                <th>Paket</th>
                <th className="zahlen__zahl">Netze</th>
                <th className="zahlen__zahl">Montage</th>
                <th className="zahlen__zahl">Anfahrt</th>
                <th className="zahlen__zahl">Rabatt</th>
                <th className="zahlen__zahl">Erlös</th>
                <th className="zahlen__zahl">Kosten</th>
                <th className="zahlen__zahl">Marge</th>
                <th>Stand</th>
                <th>Kosten</th>
                <th>Rechnung</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map(({ b, z }) => (
                <tr key={b.id} className={b.ausserRechnung ? 'zahlen__ausgenommen' : undefined}>
                  <td data-titel="Auftrag">
                    {b.kunde.name}
                    <span className="zahlen__klein">{b.referenz}</span>
                  </td>
                  <td data-titel="Paket">{b.paket ?? '–'}</td>
                  <td data-titel="Netze" className="zahlen__zahl">{formatChf(z.netzeChf)}</td>
                  <td data-titel="Montage" className="zahlen__zahl">{formatChf(z.montageChf)}</td>
                  <td data-titel="Anfahrt" className="zahlen__zahl">{formatChf(z.anfahrtChf)}</td>
                  <td data-titel="Rabatt" className="zahlen__zahl">
                    {z.rabattChf > 0 ? `− ${formatChf(z.rabattChf)}` : '–'}
                  </td>
                  <td data-titel="Erlös" className="zahlen__zahl">{formatChf(z.erloesChf)}</td>
                  <td data-titel="Kosten" className="zahlen__zahl">
                    {formatChf(z.kostenChf)}
                    {z.geschaetzt && <span className="kosten__marke">geschätzt</span>}
                  </td>
                  <td data-titel="Marge" className="zahlen__zahl">
                    <strong>{formatChf(z.margeChf)}</strong>
                    {z.margeProzent !== null && <span className="zahlen__klein">{z.margeProzent} %</span>}
                  </td>
                  <td data-titel="Stand">
                    {b.ausserRechnung
                      ? 'nicht gerechnet'
                      : z.einkassiert ? 'einkassiert' : z.realisiert ? 'offen' : 'erwartet'}
                  </td>
                  <td data-titel="Kosten">
                    <button type="button" className="btn btn--quiet btn--sm"
                      onClick={() => setOffenerEditor(offenerEditor === b.id ? null : b.id)}>
                      {offenerEditor === b.id ? 'schliessen' : 'bearbeiten'}
                    </button>
                  </td>
                  {/*
                    Das Kaestchen ist umgedreht: Angehakt heisst "zaehlt mit".
                    Gespeichert wird das Gegenteil (`ausserRechnung`), aber
                    niemand liest eine Verneinung gern - "raus" neben "Kosten"
                    las sich ausserdem wie "Kosten raus".
                  */}
                  <td data-titel="Rechnung">
                    <label className="zahlen__aus" title="Nimmt den Auftrag aus allen Zahlen – gelöscht wird nichts.">
                      <input type="checkbox" checked={b.ausserRechnung !== true}
                        onChange={(e) => void ausserRechnung(b.id, !e.target.checked)} />
                      <span>zählt mit</span>
                    </label>
                  </td>
                </tr>
              ))}
              {zeilen.length === 0 && <tr><td colSpan={11}>Noch keine Aufträge in der Rechnung.</td></tr>}
            </tbody>
          </table></div>

          {offenerEditor && (() => {
            const b = bestellungen.find((x) => x.id === offenerEditor)
            if (!b) return null
            return (
              <div className="zahlen__editor">
                <h3>Kosten · {b.kunde.name} · {b.referenz}</h3>
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
            <h2>Pro Sendung</h2>
            <div className="zahlen__rollen"><table className="zahlen__tabelle">
              <thead>
                <tr>
                  <th>Paket</th>
                  <th className="zahlen__zahl">Aufträge</th>
                  <th className="zahlen__zahl">Netze</th>
                  <th className="zahlen__zahl">Erlös</th>
                  <th className="zahlen__zahl">Kosten</th>
                  <th className="zahlen__zahl">Marge</th>
                  <th className="zahlen__zahl">je Netz</th>
                </tr>
              </thead>
              <tbody>
                {[...pakete.entries()].map(([name, p]) => (
                  <tr key={name}>
                    <td data-titel="Paket">{name}</td>
                    <td data-titel="Aufträge" className="zahlen__zahl">{p.anzahl}</td>
                    <td data-titel="Netze" className="zahlen__zahl">{p.netze}</td>
                    <td data-titel="Erlös" className="zahlen__zahl">{formatChf(p.erloes)}</td>
                    <td data-titel="Kosten" className="zahlen__zahl">{formatChf(p.kosten)}</td>
                    <td data-titel="Marge" className="zahlen__zahl">
                      <strong>{formatChf(p.erloes - p.kosten)}</strong>
                      {p.erloes > 0 && (
                        <span className="zahlen__klein">
                          {Math.round(((p.erloes - p.kosten) / p.erloes) * 1000) / 10} %
                        </span>
                      )}
                    </td>
                    <td data-titel="je Netz" className="zahlen__zahl">
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
          onAnlegen={async (a) => { const neu = await legeAuslageAn(a); setAuslagen((l) => [neu, ...l]) }}
          onAendern={async (id, teil) => {
            const neu = await aendereAuslage(id, teil)
            setAuslagen((l) => l.map((x) => (x.id === id ? neu : x)))
          }}
          onEntfernen={async (id) => { await entferneAuslage(id); setAuslagen((l) => l.filter((x) => x.id !== id)) }}
        />

        {/* --- Offene Posten ------------------------------------------------- */}
        <div className="zahlen__block zahlen__zweispaltig">
          <div>
            <h2>Wer uns was schuldet</h2>
            {forderungen.length === 0 ? <p className="zahlen__hinweis">Nichts offen.</p> : (
              <div className="zahlen__rollen"><table className="zahlen__tabelle">
                <thead><tr><th>Auftrag</th><th>Geliefert</th><th className="zahlen__zahl">Betrag</th></tr></thead>
                <tbody>
                  {forderungen.map((f) => (
                    <tr key={f.bestellungId}>
                      <td data-titel="Auftrag">{f.kunde}</td>
                      <td data-titel="Geliefert">{f.seit.slice(0, 10)}</td>
                      <td data-titel="Betrag" className="zahlen__zahl">{formatChf(f.betragChf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
          <div>
            <h2>Wem wir was schulden</h2>
            {schulden.length === 0 ? <p className="zahlen__hinweis">Nichts offen.</p> : (
              <div className="zahlen__rollen"><table className="zahlen__tabelle">
                <thead><tr><th>Wer</th><th className="zahlen__zahl">Posten</th><th className="zahlen__zahl">Betrag</th></tr></thead>
                <tbody>
                  {schulden.map((s) => (
                    <tr key={s.traeger}>
                      <td data-titel="Wer">{beteiligte[s.traeger]}</td>
                      <td data-titel="Posten" className="zahlen__zahl">{s.posten.length}</td>
                      <td data-titel="Betrag" className="zahlen__zahl">{formatChf(s.betragChf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </div>
        </div>

        {/* --- Abrechnung ---------------------------------------------------- */}
        <div className="zahlen__block">
          <h2>Abrechnung, wenn man heute abrechnen würde</h2>
          <div className="zahlen__rollen"><table className="zahlen__tabelle zahlen__tabelle--schmal">
            <tbody>
              <tr>
                <td>Einkassiert, aus der Ware</td>
                <td className="zahlen__zahl">{formatChf(teilung.warenerloesChf)}</td>
              </tr>
              <tr>
                <td>Einkassiert, aus Montage und Anfahrt</td>
                <td className="zahlen__zahl">{formatChf(teilung.montageerloesChf)}</td>
              </tr>
              <tr>
                <td>Warenkosten dieser Aufträge</td>
                <td className="zahlen__zahl">− {formatChf(teilung.warenkostenChf)}</td>
              </tr>
              <tr>
                <td>Betriebskosten</td>
                <td className="zahlen__zahl">− {formatChf(teilung.betriebskostenChf)}</td>
              </tr>
              <tr className="zahlen__strich">
                <td>Topf Ware</td>
                <td className="zahlen__zahl">{formatChf(teilung.warengewinnChf)}</td>
              </tr>
              <tr>
                <td>Topf Montage und Anfahrt</td>
                <td className="zahlen__zahl">{formatChf(teilung.montagegewinnChf)}</td>
              </tr>
              {(['bora', 'ufuk', 'deniz'] as const).map((wer) => (
                <tr key={wer} className={wer === 'bora' ? 'zahlen__strich' : undefined}>
                  <td><strong>{beteiligte[wer]}</strong></td>
                  <td className="zahlen__zahl"><strong>{formatChf(teilung.anteile[wer])}</strong></td>
                </tr>
              ))}
            </tbody>
          </table></div>
          {teilung.verteilbarChf === 0 && (
            <p className="zahlen__hinweis">
              <strong>Noch nichts zu verteilen.</strong> Die Kosten sind grösser als das, was
              bisher eingegangen ist – ein Topf im Minus wird nicht ausgeschüttet.
            </p>
          )}
          {teilung.rueckzahlungChf > 0 && (
            <p className="zahlen__hinweis">
              Zuerst gehen {formatChf(teilung.rueckzahlungChf)} an die zurück, die sie ausgelegt
              haben – siehe „Wem wir was schulden“.
            </p>
          )}
          <p className="zahlen__hinweis">
            Verteilt wird nur, was wirklich eingegangen ist. Die Ware geht 20 / 40 / 40 an Bora,
            Ufuk und Deniz, Montage und Anfahrt zur Hälfte an Ufuk und Deniz. Kurs{' '}
            {kostenConfig.eurChf} CHF/EUR, Einfuhrsteuer{' '}
            {(kostenConfig.einfuhrsteuer * 100).toFixed(1)} % auf dem Warenwert.
          </p>
        </div>
      </div>
    </section>
  )
}
