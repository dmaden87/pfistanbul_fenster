/**
 * Zentrale Stellschrauben. Alles hier hat rechtliche oder kaufmännische
 * Konsequenzen.
 */
export const shopConfig = {
  /**
   * Normalbetrieb. Seit dem Live-Gang true: Die Hinweise auf den Aufbau sind
   * weg, der Abschluss ist verbindlich, und die Onlinezahlung steht offen.
   *
   * Wieder auf false setzen, wenn ihr für längere Zeit nicht liefern könnt –
   * dann nimmt die Seite Bestellungen weiterhin entgegen, sagt aber vor dem
   * Absenden deutlich, dass sich jemand persönlich meldet, und bietet keine
   * Onlinezahlung an. Das ist ehrlicher, als Bestellungen anzunehmen und
   * niemanden zu bedienen.
   */
  operational: true,

  /**
   * MwSt-Pflicht besteht in der Schweiz erst ab CHF 100'000 Jahresumsatz.
   * Wer nicht pflichtig ist, darf "inkl. MwSt." NICHT schreiben. Die
   * Einfuhrsteuer auf der Ware ist davon unabhängig und steckt im Preis.
   */
  vatRegistered: false,

  /**
   * Onlinezahlung über Stripe als zusätzliche Möglichkeit. Bezahlen bei der
   * Übergabe bleibt der vorgeschlagene Weg und ist vorausgewählt. Auf false
   * setzen, wenn nur noch bei Übergabe bezahlt werden soll – dann verschwindet
   * die Auswahl und der Hinweistext passt sich an.
   */
  onlinePayment: true,

  /**
   * Individuelle Zahlungslösung (Raten, späterer Termin) auf Anfrage. Wird
   * nicht automatisiert: Wer sich meldet, bekommt ein Gespräch, und wir
   * entscheiden von Fall zu Fall. Die Seite verspricht deshalb nirgends eine
   * Zusage – nur, dass wir eine Lösung suchen. Auf false setzen, wenn das
   * Angebot ruhen soll; dann verschwinden Abschnitt und Checkbox.
   *
   * Bewusst zinslos und ohne Gebühren: Ein Zahlungsaufschub, der nichts
   * kostet, ist etwas anderes als ein Konsumkredit. Sobald Zinsen oder
   * Gebühren dazukämen, wäre das Konsumkreditgesetz zu prüfen.
   */
  flexiblePayment: true,

  /**
   * Wie weit wir fahren. Das ist eine praktische Grenze, kein
   * Verkaufsargument: Wir liefern und montieren selbst, und am Anfang soll
   * das nicht durch die halbe Schweiz gehen. Entsprechend steht es nur dort
   * auf der Seite, wo es jemanden betrifft – beim Ausmessen, in der FAQ, im
   * Kleingedruckten und in den AGB. Die Positionierung ist eine andere: von
   * Freunden und Nachbarn fuer Freunde und Nachbarn.
   *
   * Wichtig fuer die Preisangabe: Im Liefergebiet ist die Lieferung
   * inbegriffen, ausserhalb kommt lieferpauschaleChf dazu und steht in der
   * Offerte. Den Satz dazu gibt es weiter unten als `lieferhinweis` - auf
   * der Seite steht er nirgends im Wortlaut, sonst laufen die Fassungen
   * wieder auseinander.
   */
  serviceArea: 'Kanton Zürich',

  /**
   * Jede Bestellung zusaetzlich als Mail schicken. Bewusst dauerhaft an:
   * Der Adminbereich ist die Arbeitsliste, die Mail ist die Sicherung. Zwei
   * unabhaengige Wege bedeuten, dass keine Bestellung verloren geht, wenn
   * einer davon ausfaellt.
   *
   * Unabhaengig von diesem Schalter: Laesst sich eine Bestellung nicht
   * speichern, geht die Mail in jedem Fall raus.
   */
  bestellungPerMail: true,

  /** Montage durch uns, Preis pro Fenster in CHF. Gilt auch in Sets. */
  montageChf: 15,

  /**
   * Lieferpauschale ausserhalb des Liefergebiets, in CHF. Im Kanton Zürich
   * liefern wir kostenlos; wer weiter weg wohnt, bekommt eine Offerte mit
   * dieser Pauschale. Bewusst nur in der Offerte und nicht im Warenkorb: Der
   * Warenkorb ist auf die ausgemessene Überbauung beschränkt, dort ist die
   * Lieferung immer inbegriffen.
   */
  lieferpauschaleChf: 80,

  /**
   * INTERN, bewusst nicht auf der Seite: Erst ab dieser Anzahl Netze trägt
   * eine Runde ihre Frachtkosten. Für Einzelanfragen wird im Offertprozess
   * entschieden, ob sie in eine laufende Runde passen oder einen höheren
   * Preis brauchen. Gegenüber der Kundschaft nennen wir keine Stückzahl,
   * sondern den Liefertermin mit der Bestätigung.
   */
  minimumBatchNets: 25,

  /** Freiwilliges Rückgaberecht auf Standardgrössen, in Tagen. */
  returnDays: 14,

  /** Zugesagte Garantie auf Rahmen, Gewebe und Mechanik, in Jahren. */
  warrantyYears: 2,

  /** Ort des Gerichtsstands, erscheint in den AGB. */
  jurisdiction: 'Greifensee ZH',
} as const

/**
 * Was die Lieferung kostet - EIN Satz, aus dem alle anderen entstehen.
 *
 * WARUM AN EINER STELLE: Diese Aussage stand bisher an sechs Orten im
 * Wortlaut, und sie war an vieren veraltet. Die Startseite versprach
 * "inklusive Lieferung", das Anfrageformular schrieb "im Pfisterhoelzli
 * enthalten, ausserhalb kommt die Anfahrt dazu", der Fuss "im uebrigen
 * Kanton Zuerich nach Absprache" - drei verschiedene Zusagen auf derselben
 * Seite, und der Kunde haette sich die freundlichste merken duerfen.
 *
 * Die Regel selbst steckt schon in shopConfig: Im serviceArea ist die
 * Lieferung inbegriffen, ausserhalb gilt lieferpauschaleChf, und die Offerte
 * weist sie aus (siehe admin/Offerte.tsx). Hier wird sie nur in Worte
 * gefasst. Wer das Liefergebiet aendert, aendert den Satz mit.
 */
export const lieferhinweis = `Lieferung im ${shopConfig.serviceArea} inbegriffen; ausserhalb weisen wir sie in der Offerte aus.`

/** Kurzform fuer Fusszeilen, wo kein ganzer Satz Platz hat. */
export const lieferhinweisKurz = `Lieferung im ${shopConfig.serviceArea} inbegriffen`

/** Preiszusatz, der zur MwSt-Situation passt. */
export const priceNote = shopConfig.vatRegistered
  ? 'Alle Preise in CHF inkl. MwSt.'
  : 'Alle Preise in CHF. Wir sind nicht mehrwertsteuerpflichtig, es kommt nichts dazu.'
