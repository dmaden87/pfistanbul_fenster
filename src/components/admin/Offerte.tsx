import { useState } from 'react'
import type { Bestellung } from '../../types'
import { MECHANISMEN, NETZFARBEN, OEFFNUNGEN, RAHMENFARBEN } from '../../data/produktion'
import { operator } from '../../data/operator'
import { shopConfig } from '../../data/shopConfig'
import { formatChf } from '../../lib/format'
import { netzeAusBestellung } from '../../lib/bestellauftrag'
import { montageBetrag } from './hilfen'
import { useDokumentName, useSeitenformat } from './seitenformat'
import './Offerte.css'

/**
 * Die Offerte an die Kundschaft.
 *
 * Anderer Ton als das Blatt an den Produzenten: Hier sind wir in der Schweiz
 * und im Geschaeftsverkehr, also gesiezt, vollstaendig und formell. Es ist
 * ein Brief, kein Arbeitspapier.
 *
 * EIN TOTAL, so wie die Bestellung steht: Ist "Montage durch uns" gesetzt,
 * steht die Montage mit dem Betrag aus der Bestellung drin; sonst fehlt sie.
 * Was die Kundschaft will, wurde beim Klaeren besprochen – die Offerte
 * stellt keine Alternativen mehr nebeneinander, sie nennt den Preis.
 *
 * RABATT als eigener Posten mit seinem Wort ("Kennenlernrabatt"), wenn einer
 * gegeben wurde: Die Kundschaft soll sehen, was sie spart und warum.
 *
 * KEINE MEHRWERTSTEUER. Wir sind nicht pflichtig, und dann darf "inkl. MwSt."
 * nicht dastehen. Der Satz dazu steht ausdruecklich auf dem Blatt: Sonst
 * nimmt jemand an, sie komme noch dazu.
 *
 * MASSGRUNDLAGE. Die Zeile, wer gemessen hat, ist die wichtigste des ganzen
 * Dokuments. Ein Netz nach falschem Mass ist unbrauchbar, und wer es
 * aufgenommen hat, entscheidet, wer den Schaden traegt. Bei Sondermassen
 * messen wir selbst vor Ort – also stehen wir dafuer gerade, und das steht
 * so auf dem Blatt statt im Kleingedruckten.
 *
 * KEINE UNGEFAEHREN BEDINGUNGEN. Eine Offerte, die "nach Absprache" sagt,
 * ist keine. Deshalb ist die Lieferung eine Zahl: im Liefergebiet null, sonst
 * die Pauschale, und zwar als Posten in beiden Totalen.
 */

interface OfferteProps {
  bestellung: Bestellung
  onZurueck: () => void
}

/** Wie lange wir uns an die Offerte halten. */
const GUELTIG_TAGE = 30

/** Wohin geliefert wird. Entscheidet ueber die Lieferpauschale. */
type Lieferziel = 'gebiet' | 'schweiz'

function datum(d: Date): string {
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function Offerte({ bestellung: b, onZurueck }: OfferteProps) {
  useSeitenformat('hoch', 14)
  useDokumentName(`pfistanbul_offerte_${(b.referenz || b.id).replace(/[^A-Za-z0-9-]/g, '') || 'entwurf'}`)

  /*
   * Von Hand gewaehlt und nicht aus der Postleitzahl geraten: Die Zuercher
   * Postleitzahlen sind nicht zusammenhaengend (8200 ist Schaffhausen), und
   * eine falsch geratene Pauschale steht in einem verbindlichen Angebot.
   */
  const [ziel, setZiel] = useState<Lieferziel>('gebiet')

  const netze = netzeAusBestellung(b)
  const anzahl = netze.reduce((summe, n) => summe + n.menge, 0)
  const runde2 = (x: number) => Math.round(x * 100) / 100
  const netzeChf = runde2(netze.reduce((summe, n) => summe + n.preisChf * n.menge, 0))
  const rabattChf = b.rabattChf ?? 0
  const lieferungChf = ziel === 'schweiz' ? shopConfig.lieferpauschaleChf : 0
  /*
   * Die Montage kommt aus der Bestellung: der Haken und der Betrag
   * "Montage insgesamt". Fehlt der Betrag trotz Haken, gilt der Ansatz je
   * Netz – sonst stuende "Montage durch uns" mit null Franken da.
   */
  const mitMontage = b.montage
  const montageChf = mitMontage ? montageBetrag(b) || anzahl * shopConfig.montageChf : 0
  const totalChf = runde2(netzeChf - rabattChf + lieferungChf + montageChf)
  const heute = new Date()
  const bis = new Date(heute.getTime() + GUELTIG_TAGE * 86_400_000)
  const ausgemessen = b.ausgemessenAm ? new Date(b.ausgemessenAm) : null

  /*
   * Die Ausfuehrung steht bei jeder Position gleich – Rahmen weiss, Gewebe
   * grau, Akkordeon. Sechsmal dasselbe zu drucken kostet eine Spalte und pro
   * Zeile eine zweite Textzeile; die Offerte lief damit auf zwei Seiten.
   * Sind alle Positionen gleich, steht die Ausfuehrung einmal ueber der
   * Tabelle. Weichen sie voneinander ab, bleibt die Spalte – dann ist die
   * Wiederholung keine.
   */
  const bauart = (n: (typeof netze)[number]) =>
    [
      n.rahmenfarbe && `Rahmen ${RAHMENFARBEN[n.rahmenfarbe].deutsch}`,
      n.netzfarbe && `Gewebe ${NETZFARBEN[n.netzfarbe].deutsch}`,
      n.mechanismus && MECHANISMEN[n.mechanismus].deutsch,
    ]
      .filter(Boolean)
      .join(' · ')
  const gemeinsam = netze.length > 0 && netze.every((n) => bauart(n) === bauart(netze[0])) ? bauart(netze[0]) : null

  /** Die Posten des Totals. Der Rabatt steht zuletzt, direkt ueber dem Total – er zieht von allem ab. */
  const posten = [
    { text: `${anzahl} Plissees nach Mass`, betrag: formatChf(netzeChf) },
    {
      text: ziel === 'schweiz' ? 'Lieferung, Pauschale übrige Schweiz' : `Lieferung im ${shopConfig.serviceArea}`,
      betrag: ziel === 'schweiz' ? formatChf(lieferungChf) : 'kostenlos',
    },
    ...(mitMontage ? [{ text: 'Montage durch uns', betrag: formatChf(montageChf) }] : []),
    ...(rabattChf > 0 ? [{ text: b.rabattText || 'Rabatt', betrag: `−${formatChf(rabattChf)}` }] : []),
  ].map((zeile, i) => (
    <div className="offerte__total-zeile" key={i}>
      <span>{zeile.text}</span>
      <span>{zeile.betrag}</span>
    </div>
  ))

  return (
    <>
      <div className="auftrag__steuerung">
        <div className="auftrag__schritte">
          <label className="auftrag__wahl">
            Lieferung
            <select value={ziel} onChange={(e) => setZiel(e.target.value as Lieferziel)}>
              <option value="gebiet">{shopConfig.serviceArea} – kostenlos</option>
              <option value="schweiz">
                Übrige Schweiz – Pauschale {formatChf(shopConfig.lieferpauschaleChf)}
              </option>
            </select>
          </label>
          <button type="button" className="btn" onClick={() => window.print()}>
            Drucken / als PDF sichern
          </button>
          <button type="button" className="btn btn--quiet" onClick={onZurueck}>
            Zurück
          </button>
        </div>
      </div>

      <article className="offerte" data-druckblatt>
        <header className="offerte__kopf">
          <div className="offerte__absender">
            <p className="offerte__firma">{operator.businessName}</p>
            <p>{operator.people[0].name}</p>
            <p>{operator.people[0].street}</p>
            <p>
              {operator.people[0].zip} {operator.people[0].city}
            </p>
            <p>{operator.email}</p>
          </div>
          <address className="offerte__empfaenger">
            <p>{b.kunde.name}</p>
            {b.kunde.strasse && <p>{b.kunde.strasse}</p>}
            {(b.kunde.plz || b.kunde.ort) && (
              <p>
                {b.kunde.plz} {b.kunde.ort}
              </p>
            )}
          </address>
        </header>

        <div className="offerte__titelzeile">
          <h1>Offerte</h1>
          <dl className="offerte__eckdaten">
            <div>
              <dt>Offerte Nr.</dt>
              <dd>{b.referenz || b.id}</dd>
            </div>
            <div>
              <dt>Datum</dt>
              <dd>{datum(heute)}</dd>
            </div>
            <div>
              <dt>Gültig bis</dt>
              <dd>{datum(bis)}</dd>
            </div>
          </dl>
        </div>

        <p className="offerte__anrede">
          Guten Tag {b.kunde.name}, gerne unterbreiten wir Ihnen die folgende Offerte für Insektenschutz-Plissees nach
          Mass.
          {gemeinsam && (
            <>
              {' '}
              Alle Positionen in der Ausführung <strong>{gemeinsam}</strong>.
            </>
          )}
        </p>

        <table className="offerte__tabelle">
          <thead>
            <tr>
              <th className="offerte__pos">Pos.</th>
              <th>Fenster</th>
              <th className="offerte__mass-spalte">Masse</th>
              <th>{gemeinsam ? 'Öffnung von innen' : 'Ausführung'}</th>
              <th className="offerte__zahl">Anz.</th>
              <th className="offerte__zahl">Einzelpreis</th>
              <th className="offerte__zahl">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {netze.map((n, i) => (
              <tr key={i}>
                <td className="offerte__pos">{i + 1}</td>
                <td>
                  <strong>{n.bezeichnung}</strong>
                </td>
                <td className="offerte__mass-spalte">
                  {n.breiteCm && n.hoeheCm ? `${n.breiteCm} × ${n.hoeheCm} cm` : '—'}
                </td>
                <td className="offerte__ausfuehrung">
                  {gemeinsam
                    ? n.oeffnung
                      ? OEFFNUNGEN[n.oeffnung].deutsch
                      : '—'
                    : [bauart(n), n.oeffnung && OEFFNUNGEN[n.oeffnung].deutsch].filter(Boolean).join(' · ')}
                </td>
                <td className="offerte__zahl">{n.menge}</td>
                <td className="offerte__zahl">{formatChf(n.preisChf)}</td>
                <td className="offerte__zahl">{formatChf(n.preisChf * n.menge)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Ein Total, so wie die Bestellung steht – mit oder ohne Montage. */}
        <section className="offerte__totale">
          <div className="offerte__total offerte__total--montage">
            {posten}
            <div className="offerte__total-zeile offerte__total-zeile--stark">
              <span>{mitMontage ? 'Total inklusive Montage' : 'Total'}</span>
              <span>{formatChf(totalChf)}</span>
            </div>
          </div>
        </section>

        <p className="offerte__steuer">
          Alle Beträge in Schweizer Franken. Wir sind nicht mehrwertsteuerpflichtig – es kommt nichts dazu.
        </p>

        <section className="offerte__bedingungen">
          <h2>Bedingungen</h2>
          <dl>
            <div>
              <dt>Masse</dt>
              <dd>
                {ausgemessen ? (
                  <>
                    Die oben aufgeführten Masse stammen aus unserem Aufmass vom {datum(ausgemessen)} bei Ihnen vor Ort.
                    Dafür stehen wir gerade: Passt ein Netz wegen eines Massfehlers auf unserer Seite nicht, ersetzen
                    wir es kostenlos.
                  </>
                ) : (
                  <>
                    Vor der Fertigung messen wir bei Ihnen vor Ort aus. Ergibt das andere Masse als oben, erhalten Sie
                    vorher eine angepasste Offerte. Für unser Aufmass stehen wir gerade: Passt ein Netz wegen eines
                    Massfehlers auf unserer Seite nicht, ersetzen wir es kostenlos.
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Lieferung</dt>
              <dd>
                {ziel === 'schweiz' ? (
                  <>
                    In die übrige Schweiz zur Pauschale von {formatChf(shopConfig.lieferpauschaleChf)}, oben
                    eingerechnet.
                  </>
                ) : (
                  <>Im {shopConfig.serviceArea} kostenlos, oben eingerechnet.</>
                )}{' '}
                Jedes Netz wird auf Bestellung gefertigt; den Liefertermin nennen wir Ihnen mit der
                Auftragsbestätigung.
              </dd>
            </div>
            <div>
              <dt>Zahlung</dt>
              <dd>Bei der Übergabe, bar oder mit TWINT. Auf Wunsch besprechen wir eine andere Lösung.</dd>
            </div>
            <div>
              <dt>Rückgabe</dt>
              <dd>
                Sondermasse sind Einzelanfertigungen und von der Rückgabe ausgenommen – ausser die Masse stimmen wegen
                eines Fehlers auf unserer Seite nicht. Auf Netzen aus dem Standardsortiment gewähren wir freiwillig{' '}
                {shopConfig.returnDays} Tage ab Erhalt, unbenutzt und unbeschädigt.
              </dd>
            </div>
            <div>
              <dt>Garantie</dt>
              <dd>
                {shopConfig.warrantyYears} Jahre auf Rahmen, Gewebe und Mechanik, dazu die gesetzliche
                Sachgewährleistung. Diese Offerte gilt bis zum {datum(bis)}; im Übrigen gelten unsere AGB.
              </dd>
            </div>
          </dl>
        </section>

        <p className="offerte__schluss">
          Für Fragen sind wir gerne da. Ihre Zusage genügt uns formlos per E-Mail an {operator.email} oder per
          Nachricht – wir bestätigen Ihnen den Auftrag danach schriftlich.
        </p>

        <p className="offerte__gruss">
          Freundliche Grüsse
          <br />
          {operator.people[0].name} · {operator.businessName}
        </p>
      </article>
    </>
  )
}
