import { priceNote, shopConfig } from '../../data/shopConfig'
import './LegalPage.css'

export type LegalKey = 'impressum' | 'datenschutz' | 'agb'

interface LegalPageProps {
  page: LegalKey
  onBack: () => void
}

/**
 * ACHTUNG – VOM BETREIBER ZU ERGAENZEN:
 * Die mit [ ... ] markierten Stellen sind Platzhalter und muessen vor dem
 * Live-Gang durch echte Angaben ersetzt werden. Ohne vollstaendige
 * Anbieterkennzeichnung verstoesst eine Schweizer Verkaufsseite gegen
 * Art. 3 Abs. 1 lit. s UWG.
 */

const TITLES: Record<LegalKey, string> = {
  impressum: 'Impressum',
  datenschutz: 'Datenschutzerklärung',
  agb: 'Allgemeine Geschäftsbedingungen',
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return <mark className="legal__placeholder">{children}</mark>
}

function Impressum() {
  return (
    <>
      <h2>Verantwortlich für diese Website</h2>
      <p>
        <Placeholder>[Vollständiger Name oder Firma]</Placeholder>
        <br />
        <Placeholder>[Strasse und Hausnummer]</Placeholder>
        <br />
        <Placeholder>[PLZ und Ort]</Placeholder>
        <br />
        Schweiz
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <Placeholder>[öffentliche Kontaktadresse, z. B. info@pfistanbul-fenster.ch]</Placeholder>
        <br />
        Telefon: <Placeholder>[Telefonnummer]</Placeholder>
      </p>
      <p className="legal__note">
        <strong>Wichtig für den Betreiber:</strong> Art. 3 Abs. 1 lit. s UWG verlangt bei einem Onlineshop ausdrücklich
        die Kontaktadresse „einschliesslich derjenigen der elektronischen Post“. Eine E-Mail-Adresse muss also im
        Impressum als Text stehen – ein Kontaktformular genügt nicht. Die Lösung, die den Wunsch nach einer privaten
        Adresse damit vereinbart: eine Alias-Adresse anlegen, die auf das private Postfach weiterleitet. Diese Alias
        steht im Impressum, die private Adresse taucht nirgends auf.
      </p>

      <h2>Handelsregister und Mehrwertsteuer</h2>
      <p>
        UID / MWST-Nummer: <Placeholder>[falls vorhanden – sonst diesen Abschnitt streichen]</Placeholder>
      </p>
      <p className="legal__note">
        MWST-pflichtig wird man in der Schweiz erst ab CHF 100'000 Jahresumsatz. Wer nicht pflichtig ist, darf bei den
        Preisen nicht „inkl. MwSt.“ schreiben – dafür gibt es den Schalter <code>vatRegistered</code> in
        <code>src/data/shopConfig.ts</code>.
      </p>

      <h2>Ablauf einer Bestellung</h2>
      <p>
        Der Bestellvorgang führt über vier Schritte: Grösse wählen, Warenkorb prüfen, Adresse eingeben, Angaben prüfen
        und verbindlich bestellen. Auf der Prüfseite lassen sich alle Eingaben vor dem Absenden korrigieren. Nach dem
        Absenden bestätigen wir die Bestellung unverzüglich per E-Mail.
      </p>

      <h2>Haftung</h2>
      <p>
        Die Inhalte dieser Website wurden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität
        wird keine Gewähr übernommen. Für Inhalte externer Websites, auf die verlinkt wird, ist ausschliesslich deren
        Betreiber verantwortlich.
      </p>
    </>
  )
}

function Datenschutz() {
  return (
    <>
      <p className="legal__lead">
        Diese Website verwendet weder Analyse-Werkzeuge noch Werbe-Cookies und bindet keine externen Skripte ein, die
        Ihr Verhalten verfolgen. Erhoben wird nur, was Sie selbst in ein Formular eintragen.
      </p>

      <h2>Verantwortliche Stelle</h2>
      <p>
        <Placeholder>[Name und Adresse wie im Impressum]</Placeholder>
      </p>

      <h2>Welche Daten wir bearbeiten</h2>
      <p>
        Wenn Sie eine Bestellung aufgeben oder eine Anfrage senden, übermitteln Sie uns Name, E-Mail-Adresse, allenfalls
        Telefonnummer und Lieferadresse sowie die von Ihnen gemachten Angaben zu Grösse, Anzahl und Bemerkungen. Wir
        verwenden diese Angaben ausschliesslich, um Ihre Bestellung oder Anfrage zu bearbeiten.
      </p>

      <h2>Weitergabe an Dritte</h2>
      <p>
        Die Formularinhalte werden über den Dienst{' '}
        <Placeholder>[Name des eingesetzten Formulardienstes, z. B. Web3Forms]</Placeholder> mit Sitz in{' '}
        <Placeholder>[Staat]</Placeholder> an unsere Mailbox weitergeleitet. Dieser Dienst verarbeitet die Daten in
        unserem Auftrag. Darüber hinaus geben wir keine Daten an Dritte weiter und verkaufen keine Adressen.
      </p>
      <p className="legal__note">
        Art. 19 Abs. 2 lit. c und Abs. 4 DSG verlangen, dass Empfänger und – bei einem Dienst im Ausland – der Staat
        genannt werden. Beides bitte eintragen, sobald der Dienst feststeht.
      </p>

      <h2>Aufbewahrung</h2>
      <p>
        Bestellungen bewahren wir so lange auf, wie es die gesetzlichen Aufbewahrungsfristen verlangen. Anfragen, aus
        denen keine Bestellung wird, löschen wir spätestens nach{' '}
        <Placeholder>[z. B. zwölf Monaten]</Placeholder>.
      </p>

      <h2>Ihre Rechte</h2>
      <p>
        Nach dem revidierten Schweizer Datenschutzgesetz (revDSG) können Sie Auskunft über die zu Ihnen bearbeiteten
        Daten verlangen sowie deren Berichtigung oder Löschung. Eine kurze Nachricht an die oben genannte Adresse
        genügt.
      </p>

      <h2>Speicherung im Browser</h2>
      <p>
        Ihr Warenkorb wird lokal in Ihrem Browser gespeichert, damit er beim erneuten Aufruf noch da ist. Diese
        Information verlässt Ihr Gerät nicht und wird von uns nicht ausgelesen.
      </p>
    </>
  )
}

function Agb() {
  return (
    <>
      <p className="legal__lead">
        Diese Bedingungen gelten für alle Bestellungen über diese Website. Sie sind bewusst kurz gehalten – bei
        Unklarheiten gilt, was wir Ihnen schriftlich bestätigt haben.
      </p>

      <h2>1. Vertragsabschluss</h2>
      <p>
        Die Darstellung der Produkte ist kein verbindliches Angebot. Mit dem Absenden des Bestellformulars geben Sie ein
        Angebot ab. Der Vertrag kommt zustande, sobald wir die Bestellung schriftlich bestätigen. Bei Sonderanfertigungen
        erhalten Sie zuerst eine Offerte; der Vertrag kommt erst mit Ihrer Zusage zustande.
      </p>

      <h2>2. Preise</h2>
      <p>
        {priceNote} Die Lieferung innerhalb der Siedlung Am Pfisterhölzli ist kostenlos; für Lieferungen ausserhalb
        vereinbaren wir die Konditionen vorgängig.
      </p>

      <h2>3. Zahlung</h2>
      <p>
        Bezahlt wird bei der Übergabe oder per Rechnung innerhalb von{' '}
        <Placeholder>[z. B. 30 Tagen]</Placeholder>. Über diese Website werden keine Zahlungen abgewickelt und keine
        Zahlungsdaten erhoben. Die Zahlung bei Übergabe ist kostenlos und ohne Zuschlag.
      </p>

      <h2>4. Lieferfrist</h2>
      <p>
        Wir fertigen in Sammelbestellungen. Sobald {shopConfig.minimumBatchNets} Netze zusammengekommen sind, geht
        die Runde in Produktion; den voraussichtlichen Liefertermin nennen wir Ihnen bei der Bestätigung und halten Sie
        auf dem Laufenden, wenn sich etwas verschiebt. Eine feste Frist ab Bestelleingang können wir deshalb nicht
        zusichern.
      </p>

      <h2>5. Rückgabe und Umtausch</h2>
      <p>
        Bei Bestellungen über das Internet besteht nach Schweizer Recht kein gesetzliches Widerrufs- oder
        Rückgaberecht. Wir gewähren Ihnen freiwillig ein Rückgaberecht von {shopConfig.returnDays} Tagen ab Erhalt auf
        Netze aus dem Standardsortiment in unbenutztem und unbeschädigtem Zustand. Sondermasse sind davon
        ausgenommen, weil sie nicht weiterverkauft werden können – ausser die Masse stimmen aufgrund eines Fehlers auf
        unserer Seite nicht.
      </p>

      <h2>6. Widerrufsrecht bei Terminen bei Ihnen zu Hause</h2>
      <p>
        Kommt ein Vertrag über mehr als CHF 100 bei Ihnen in der Wohnung zustande – etwa direkt im Anschluss an einen
        Ausmesstermin –, haben Sie nach Art. 40a ff. OR ein Widerrufsrecht von 14 Tagen. Dieses Recht entfällt, wenn
        Sie den Termin ausdrücklich selbst gewünscht haben. Wir weisen Sie in diesem Fall vor Ort darauf hin.
      </p>

      <h2>7. Gewährleistung</h2>
      <p>
        Für Mängel gilt die gesetzliche Sachgewährleistung nach Art. 197 ff. OR; die Ansprüche verjähren zwei Jahre
        nach Ablieferung (Art. 210 OR). Darüber hinaus geben wir {shopConfig.warrantyYears} Jahre Garantie auf Rahmen,
        Gewebe und Mechanik.
      </p>

      <h2>8. Anwendbares Recht und Gerichtsstand</h2>
      <p>
        Es gilt Schweizer Recht. Gerichtsstand ist {shopConfig.jurisdiction}, soweit nicht zwingende Bestimmungen
        etwas anderes vorsehen.
      </p>
    </>
  )
}

export function LegalPage({ page, onBack }: LegalPageProps) {
  return (
    <section className="section legal">
      <div className="shell shell--narrow">
        <button type="button" className="btn btn--quiet legal__back" onClick={onBack}>
          ← Zurück zum Shop
        </button>

        <h1>{TITLES[page]}</h1>

        <p className="legal__warning">
          <strong>Entwurf.</strong> Die farbig markierten Stellen sind Platzhalter und müssen vor dem Live-Gang durch
          echte Angaben ersetzt werden. Dieser Text ersetzt keine Rechtsberatung.
        </p>

        <div className="legal__body">
          {page === 'impressum' && <Impressum />}
          {page === 'datenschutz' && <Datenschutz />}
          {page === 'agb' && <Agb />}
        </div>
      </div>
    </section>
  )
}
