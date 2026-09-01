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
        E-Mail: <Placeholder>[Kontaktadresse für Kundinnen und Kunden]</Placeholder>
        <br />
        Telefon: <Placeholder>[Telefonnummer]</Placeholder>
      </p>
      <p className="legal__note">
        Hinweis für den Betreiber: Das Bestellformular leitet Nachrichten über einen Formulardienst weiter, damit die
        private Mailadresse nicht im Quelltext steht. Für das Impressum ist eine erreichbare Kontaktadresse gesetzlich
        vorgeschrieben – dafür eignet sich eine separate Adresse, die öffentlich sein darf.
      </p>

      <h2>Handelsregister und Mehrwertsteuer</h2>
      <p>
        UID / MWST-Nummer: <Placeholder>[falls vorhanden – sonst diesen Abschnitt streichen]</Placeholder>
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
        <Placeholder>[Name des eingesetzten Formulardienstes, z. B. Web3Forms]</Placeholder> an unsere Mailbox
        weitergeleitet. Dieser Dienst verarbeitet die Daten in unserem Auftrag. Darüber hinaus geben wir keine Daten an
        Dritte weiter und verkaufen keine Adressen.
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
        Alle Preise verstehen sich in Schweizer Franken inklusive Mehrwertsteuer. Die Lieferung innerhalb der Siedlung
        Am Pfisterhölzli ist kostenlos; für Lieferungen ausserhalb vereinbaren wir die Konditionen vorgängig.
      </p>

      <h2>3. Zahlung</h2>
      <p>
        Bezahlt wird bei der Übergabe oder per Rechnung innerhalb von{' '}
        <Placeholder>[z. B. 14 Tagen]</Placeholder>. Über diese Website werden keine Zahlungen abgewickelt und keine
        Zahlungsdaten erhoben.
      </p>

      <h2>4. Lieferfrist</h2>
      <p>
        Standardgrössen liefern wir in der Regel innerhalb von{' '}
        <Placeholder>[z. B. fünf Werktagen]</Placeholder>, Sonderanfertigungen innerhalb von{' '}
        <Placeholder>[z. B. zwei Wochen]</Placeholder> ab Zusage. Angegebene Fristen sind Richtwerte; verzögert sich
        etwas, informieren wir Sie.
      </p>

      <h2>5. Rückgabe und Umtausch</h2>
      <p>
        Im Schweizer Fernabsatz besteht kein gesetzliches Widerrufsrecht. Wir gewähren freiwillig ein Rückgaberecht von{' '}
        <Placeholder>[z. B. 14 Tagen]</Placeholder> auf unbeschädigte Standardgrössen. Sonderanfertigungen sind vom
        Rückgaberecht ausgenommen – ausser die Masse stimmen aufgrund eines Fehlers auf unserer Seite nicht.
      </p>

      <h2>6. Gewährleistung</h2>
      <p>
        Es gelten die gesetzlichen Bestimmungen des Schweizerischen Obligationenrechts. Auf Material- und
        Verarbeitungsfehler gewähren wir <Placeholder>[z. B. zwei Jahre]</Placeholder> Garantie.
      </p>

      <h2>7. Anwendbares Recht und Gerichtsstand</h2>
      <p>
        Es gilt Schweizer Recht. Gerichtsstand ist <Placeholder>[Ort]</Placeholder>, soweit nicht zwingende
        Bestimmungen etwas anderes vorsehen.
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
