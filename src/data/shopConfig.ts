/**
 * Zentrale Stellschrauben. Alles hier hat rechtliche oder kaufmännische
 * Konsequenzen.
 */
export const shopConfig = {
  /**
   * MwSt-Pflicht besteht in der Schweiz erst ab CHF 100'000 Jahresumsatz.
   * Wer nicht pflichtig ist, darf "inkl. MwSt." NICHT schreiben. Die
   * Einfuhrsteuer auf der Ware ist davon unabhängig und steckt im Preis.
   */
  vatRegistered: false,

  /**
   * Pollenschutz wird als Gewebe-Option mit Aufpreis auf Anfrage angeboten,
   * nicht als bestellbarer Artikel – Preis und Verfügbarkeit des Gewebes sind
   * laut Kostenkonzept noch offen. Wichtig bleibt: keine Prozentzahl zur
   * Rückhalterate, solange kein Datenblatt vorliegt. Die verbreiteten
   * "bis zu 99 %" sind Bestwerte der Hersteller bei schwachem Wind;
   * unabhängige Messungen liegen deutlich darunter, und Art. 13a UWG kehrt
   * die Beweislast um.
   */
  pollenEnabled: true,

  /** Montage durch uns, Preis pro Fenster in CHF. Gilt auch in Sets. */
  montageChf: 15,

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

/** Preiszusatz, der zur MwSt-Situation passt. */
export const priceNote = shopConfig.vatRegistered
  ? 'Alle Preise in CHF inkl. MwSt.'
  : 'Alle Preise in CHF. Wir sind nicht mehrwertsteuerpflichtig, es kommt nichts dazu.'
