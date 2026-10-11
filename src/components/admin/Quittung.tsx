import type { Bestellung } from '../../types'
import { operator } from '../../data/operator'
import { shopConfig } from '../../data/shopConfig'
import { formatChf } from '../../lib/format'
import { netzeAusBestellung } from '../../lib/bestellauftrag'
import { bezahltAm } from '../../lib/phasen'
import { quittungPosten, quittungZahlart } from './hilfen'
import { useDokumentName, useSeitenformat } from './seitenformat'
import './Quittung.css'

/**
 * Die Quittung ueber einen bezahlten Auftrag.
 *
 * SIE BESTAETIGT, SIE FORDERT NICHT. Eine Rechnung sagt "bitte zahlen", eine
 * Quittung sagt "erhalten". Deshalb gibt es sie nur zu einem Auftrag, der
 * uebergeben UND bezahlt ist - genau `abgeschlossen()`, dieselbe Bedingung
 * wie bei der Bitte um eine Bewertung. Ein Beleg ueber Geld, das noch nicht
 * da ist, waere eine Falschaussage, und zwar eine schriftliche.
 *
 * WOFUER SIE GEBRAUCHT WIRD: Wer bar oder mit Twint bei der Uebergabe zahlt,
 * hat sonst nichts in der Hand - keinen Kontoauszug, keine Belastung, nichts.
 * Fuer Mieterinnen, die den Insektenschutz bei der Verwaltung einreichen, und
 * fuer alle, die ihre Ausgaben ablegen, ist dieses Blatt der einzige Beleg.
 * Bei einer Onlinezahlung ist es eine Hoeflichkeit; bei Bargeld ist es die
 * Sache selbst.
 *
 * KEINE MEHRWERTSTEUER - und das steht da. Wir sind nicht pflichtig. Ein
 * Beleg, der dazu schweigt, laedt den Empfaenger dazu ein, selbst eine
 * Steuer herauszurechnen, die nie erhoben wurde. Wer das in einer
 * Buchhaltung tut, zieht Vorsteuer ab, die es nicht gibt. Darum derselbe
 * Satz wie auf der Offerte, ausdruecklich.
 *
 * DIE ZAHLEN KOMMEN AUS DEM AUFTRAG, nicht aus einer neuen Rechnung. Netze,
 * Anfahrt, Montage und Rabatt werden genauso gelesen wie in der Offerte
 * (montageFuerOfferte), damit Offerte und Quittung zum selben Auftrag nie
 * verschiedene Zahlen zeigen. Ein Kunde, der beide nebeneinander legt, muss
 * dasselbe sehen.
 *
 * KEINE NEUE NUMMERNFOLGE. Die Quittungsnummer ist die Auftragsreferenz: ein
 * Auftrag, eine Quittung. Ein fortlaufender Zaehler braeuchte einen Stand im
 * Speicher, der bei jedem Druck weitergeht - und zwei Ausdrucke desselben
 * Belegs truegen dann zwei Nummern. Das waere schlechter, nicht besser.
 *
 * KEIN INTERNER VERMERK AUFS BLATT. `zahlungKommentar` ist eine Notiz fuer
 * uns ("Rest kommt naechste Woche", "Schluessel bei der Nachbarin") und hat
 * auf einem Dokument, das aus dem Haus geht, nichts zu suchen.
 */

interface QuittungProps {
  bestellung: Bestellung
  onZurueck: () => void
}

function datum(d: Date): string {
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function Quittung({ bestellung: b, onZurueck }: QuittungProps) {
  useSeitenformat('hoch', 14)
  useDokumentName(`pfistanbul_quittung_${(b.referenz || b.id).replace(/[^A-Za-z0-9-]/g, '') || 'beleg'}`)

  const netze = netzeAusBestellung(b)
  /* Die Betraege kommen aus quittungPosten() - siehe dort, warum nicht hier. */
  const { netze: anzahl, netzeChf, rabattChf, mitAnfahrt, anfahrtChf, montageChf, totalChf } =
    quittungPosten(b, shopConfig.montageChf)
  const mitMontage = montageChf > 0

  /*
   * DAS DATUM DER ZAHLUNG, NICHT DAS VON HEUTE. Eine Quittung haelt fest,
   * wann das Geld geflossen ist. Wer sie ein halbes Jahr spaeter noch einmal
   * ausdruckt, soll denselben Beleg bekommen und nicht einen neuen.
   */
  const bezahlt = bezahltAm(b)
  const bezahltDatum = bezahlt ? new Date(bezahlt) : null
  const geliefert = b.ausgeliefertAm ? new Date(b.ausgeliefertAm) : null

  const zahlart = quittungZahlart(b)

  const posten = [
    { text: `${anzahl} ${anzahl === 1 ? 'Plissee' : 'Plissees'} nach Mass`, betrag: formatChf(netzeChf) },
    ...(mitAnfahrt
      ? [
          {
            text: anfahrtChf > 0 ? 'Anfahrt, Pauschale übrige Schweiz' : `Anfahrt im ${shopConfig.serviceArea}`,
            betrag: anfahrtChf > 0 ? formatChf(anfahrtChf) : 'kostenlos',
          },
        ]
      : []),
    ...(mitMontage ? [{ text: 'Montage durch uns', betrag: formatChf(montageChf) }] : []),
    ...(rabattChf > 0 ? [{ text: b.rabattText || 'Rabatt', betrag: `−${formatChf(rabattChf)}` }] : []),
  ].map((zeile, i) => (
    <div className="quittung__total-zeile" key={i}>
      <span>{zeile.text}</span>
      <span>{zeile.betrag}</span>
    </div>
  ))

  return (
    <>
      <div className="auftrag__steuerung">
        <div className="auftrag__schritte">
          <button type="button" className="btn" onClick={() => window.print()}>
            Drucken / als PDF sichern
          </button>
          <button type="button" className="btn btn--quiet" onClick={onZurueck}>
            Zurück
          </button>
        </div>
      </div>

      <article className="quittung" data-druckblatt>
        <header className="quittung__kopf">
          <div className="quittung__absender">
            <p className="quittung__firma">{operator.businessName}</p>
            <p>{operator.people[0].street.replace(/ \d+$/, '')}</p>
            <p>
              {operator.people[0].zip} {operator.people[0].city}
            </p>
            <p>{operator.email}</p>
          </div>
          <address className="quittung__empfaenger">
            <p>{b.kunde.name}</p>
            {b.kunde.strasse && <p>{b.kunde.strasse}</p>}
            {(b.kunde.plz || b.kunde.ort) && (
              <p>
                {b.kunde.plz} {b.kunde.ort}
              </p>
            )}
          </address>
        </header>

        <div className="quittung__titelzeile">
          <h1>Quittung</h1>
          <dl className="quittung__eckdaten">
            <div>
              <dt>Quittung Nr.</dt>
              <dd>{b.referenz || b.id}</dd>
            </div>
            <div>
              <dt>Bezahlt am</dt>
              <dd>{bezahltDatum ? datum(bezahltDatum) : '—'}</dd>
            </div>
            {geliefert && (
              <div>
                <dt>Montiert am</dt>
                <dd>{datum(geliefert)}</dd>
              </div>
            )}
          </dl>
        </div>

        <p className="quittung__anrede">
          Guten Tag {b.kunde.name}, besten Dank für Ihren Auftrag und Ihre Zahlung. Wir bestätigen Ihnen hiermit den
          Erhalt des unten aufgeführten Betrags für die folgenden Insektenschutz-Plissees nach Mass.
        </p>

        <table className="quittung__tabelle">
          <thead>
            <tr>
              <th className="quittung__pos">Pos.</th>
              <th>Fenster</th>
              <th className="quittung__mass-spalte">Masse</th>
              <th className="quittung__zahl">Anz.</th>
              <th className="quittung__zahl">Einzelpreis</th>
              <th className="quittung__zahl">Betrag</th>
            </tr>
          </thead>
          <tbody>
            {netze.map((n, i) => (
              <tr key={i}>
                <td className="quittung__pos">{i + 1}</td>
                <td>
                  <strong>{n.bezeichnung}</strong>
                </td>
                <td className="quittung__mass-spalte">
                  {n.breiteCm && n.hoeheCm ? `${n.breiteCm} × ${n.hoeheCm} cm` : '—'}
                </td>
                <td className="quittung__zahl">{n.menge}</td>
                <td className="quittung__zahl">{formatChf(n.preisChf)}</td>
                <td className="quittung__zahl">{formatChf(n.preisChf * n.menge)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="quittung__totale">
          <div className="quittung__total">
            {posten}
            <div className="quittung__total-zeile quittung__total-zeile--stark">
              <span>Betrag dankend erhalten</span>
              <span>{formatChf(totalChf)}</span>
            </div>
          </div>
        </section>

        <p className="quittung__steuer">
          Alle Beträge in Schweizer Franken. Wir sind nicht mehrwertsteuerpflichtig – im Betrag ist keine
          Mehrwertsteuer enthalten, und es kommt nichts dazu.
        </p>

        <section className="quittung__zahlung">
          <h2>Zahlung</h2>
          <p>
            {zahlart}
            {bezahltDatum ? ` am ${datum(bezahltDatum)}` : ''}. Diese Quittung gilt als Beleg über den vollständig
            beglichenen Betrag; es ist nichts mehr offen.
          </p>
        </section>

        <footer className="quittung__fuss">
          <p className="quittung__dank">
            Danke, dass Sie uns beauftragt haben. Sind Sie zufrieden? Dann freuen wir uns sehr über eine kurze
            Bewertung auf <strong>{operator.reviewUrl.replace('https://', '')}</strong> – das dauert eine Minute und
            hilft uns mehr als alles andere.
          </p>
          <p className="quittung__signatur">
            {operator.businessName} · {operator.people[0].zip} {operator.people[0].city}
          </p>
        </footer>
      </article>
    </>
  )
}
