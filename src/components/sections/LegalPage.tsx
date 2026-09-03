import { priceNote, shopConfig } from '../../data/shopConfig'
import { operator } from '../../data/operator'
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
        <strong>{operator.businessName}</strong>
      </p>
      {operator.people.map((person) => (
        <p key={person.name}>
          {person.name}
          <br />
          {person.street}
          <br />
          {person.zip} {person.city}
        </p>
      ))}
      <p>Schweiz</p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${operator.email}`}>{operator.email}</a>
        {operator.phone && (
          <>
            <br />
            Telefon: {operator.phone}
          </>
        )}
      </p>

      <h2>Mehrwertsteuer</h2>
      <p>
        {shopConfig.vatRegistered ? (
          <>
            UID / MWST-Nummer: <Placeholder>[Nummer eintragen]</Placeholder>
          </>
        ) : (
          'Wir sind nicht mehrwertsteuerpflichtig. Auf unsere Preise kommt keine Mehrwertsteuer dazu.'
        )}
      </p>

      <h2>Ablauf einer Bestellung</h2>
      <p>
        Der Bestellvorgang führt über vier Schritte: Netze wählen, Warenkorb prüfen, Adresse eingeben, Angaben prüfen
        und verbindlich bestellen. Auf der Prüfseite lassen sich alle Eingaben vor dem Absenden korrigieren. Nach dem
        Absenden bestätigen wir die Bestellung per E-Mail.
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
        Diese Website setzt keine Cookies, bindet keine Werbung ein und lädt auch die Schriften vom eigenen Server.
        Erhoben wird, was Sie selbst in ein Formular eintragen – dazu eine anonyme Zählung der Seitenaufrufe, damit wir
        wissen, ob unsere Seite überhaupt jemand findet.
      </p>

      <h2>Verantwortliche Stelle</h2>
      <p>
        {operator.businessName}, {operator.people.map((person) => person.name).join(' und ')},{' '}
        {operator.people[0].street}, {operator.people[0].zip} {operator.people[0].city}.
        <br />
        Kontakt: <a href={`mailto:${operator.email}`}>{operator.email}</a>
      </p>

      <h2>Welche Daten wir bearbeiten</h2>
      <p>
        Wenn Sie eine Bestellung aufgeben oder eine Anfrage senden, übermitteln Sie uns Name, E-Mail-Adresse,
        allenfalls Telefonnummer und Lieferadresse sowie Ihre Angaben zu Masse, Anzahl und Bemerkungen. Wir verwenden
        diese Angaben ausschliesslich, um Ihre Bestellung oder Anfrage zu bearbeiten.
      </p>

      <h2>Weitergabe an Dritte</h2>
      <p>
        Die Formularinhalte werden über den Dienst {operator.formService} an unsere Mailbox weitergeleitet. Betrieben
        wird er von {operator.formServiceCompany} mit Sitz in {operator.formServiceCountry}; die Server stehen in{' '}
        {operator.formServerCountry}. Ihre Angaben werden damit ins Ausland bekanntgegeben. Der Dienst verarbeitet die
        Daten ausschliesslich in unserem Auftrag. Darüber hinaus geben wir keine Daten an Dritte weiter und verkaufen
        keine Adressen.
      </p>

      <h2>Zahlung über Stripe</h2>
      <p>
        Wenn Sie die Onlinezahlung wählen, werden Sie zu Stripe weitergeleitet und geben Ihre Zahlungsdaten dort ein.
        Betrieben wird der Dienst von der Stripe, Inc. mit Sitz in den USA, für Europa durch die Stripe Payments Europe
        Ltd. in Irland. Wir übermitteln dabei die bestellten Artikel, den Betrag, Ihre Bestellreferenz und Ihre
        E-Mail-Adresse. Ihre Kartendaten sehen wir nie – sie erreichen unsere Website zu keinem Zeitpunkt. Wählen Sie
        die Zahlung bei der Übergabe, wird gar nichts an Stripe übermittelt.
      </p>

      <h2>Zählung der Seitenaufrufe</h2>
      <p>
        Wir verwenden Vercel Web Analytics, um zu sehen, wie viele Menschen die Seite besuchen und welche Abschnitte
        gelesen werden. Der Dienst setzt keine Cookies, legt kein Profil über Sie an und verfolgt Sie nicht auf andere
        Websites. Aus den Angaben Ihres Aufrufs bildet Vercel eine Kennung, die täglich wechselt und sich nicht einer
        Person zuordnen lässt. Betreiberin ist die Vercel Inc. in den USA, bei der diese Website auch gehostet wird;
        beim Aufruf fallen dort ausserdem die üblichen Server-Protokolle an.
      </p>

      <h2>Aufbewahrung</h2>
      <p>
        Bestellungen bewahren wir so lange auf, wie es die gesetzlichen Aufbewahrungsfristen verlangen. Anfragen, aus
        denen keine Bestellung wird, löschen wir spätestens nach {operator.inquiryRetentionMonths} Monaten.
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
        {priceNote} Die Lieferung innerhalb der Siedlung Am Pfisterhölzli ist kostenlos. Ausserhalb liefern und
        montieren wir im {shopConfig.serviceArea}; Lieferung und allfällige Anfahrt stehen in der Offerte, die Sie vor
        dem Vertragsabschluss erhalten.
      </p>

      <h2>3. Zahlung</h2>
      <p>
        Vorgesehen ist die Zahlung bei der Übergabe der Netze, in bar oder mit TWINT. Wahlweise können Sie die
        Bestellung gleich online begleichen; die Zahlung wickelt dann Stripe ab, und Ihre Kartendaten erreichen unsere
        Website zu keinem Zeitpunkt. Beide Wege kosten gleich viel: Es fallen keine Zuschläge an, und eine Anzahlung
        verlangen wir nie.
      </p>

      <h2>4. Lieferfrist</h2>
      <p>
        Jedes Netz wird auf Bestellung gefertigt. Den voraussichtlichen Liefertermin nennen wir Ihnen mit der
        Bestätigung und halten Sie auf dem Laufenden, wenn sich etwas verschiebt. Eine feste Frist ab Bestelleingang
        können wir deshalb nicht zusichern.
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
          Falls farbig markierte Stellen zu sehen sind: Das sind Angaben, die noch fehlen. Dieser Text ist sorgfältig
          erstellt, ersetzt aber keine Rechtsberatung.
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
