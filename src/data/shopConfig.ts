/**
 * Zentrale Stellschrauben. Alles hier hat rechtliche oder kaufmännische
 * Konsequenzen – die Werte sind Vorschläge, keine Zusagen.
 */
export const shopConfig = {
  /**
   * MwSt-Pflicht besteht in der Schweiz erst ab CHF 100'000 Jahresumsatz.
   * Wer nicht pflichtig ist, darf "inkl. MwSt." NICHT schreiben.
   */
  vatRegistered: true,

  /**
   * Pollenschutz bleibt gesperrt, bis Handelsname, Maschenweite und
   * Herstellerdatenblatt des tatsächlich verbauten Gewebes vorliegen.
   * Ein normales Insektenschutzgewebe hält keine Pollen zurück – Pollen sind
   * rund sechzigmal kleiner als die Masche. Ohne zertifiziertes Gewebe wäre
   * jede Pollenaussage nach UWG angreifbar, und die Beweislast läge bei uns.
   * Sobald das Datenblatt da ist: auf true setzen, dann erscheinen die
   * Gewebe-Option, der Vorteilstext und die Tabellenzeile automatisch.
   */
  pollenEnabled: false,

  /** Freiwilliges Rückgaberecht auf Standardgrössen, in Tagen. */
  returnDays: 14,

  /** Zugesagte Garantie auf Rahmen, Gewebe und Mechanik, in Jahren. */
  warrantyYears: 2,

  /** Zugesagte Lieferfrist für Standardgrössen, in Werktagen. */
  deliveryWorkdays: 5,

  /** Zugesagte Produktionszeit für Sonderanfertigungen, in Wochen. */
  customWeeks: 2,

  /** Ort des Gerichtsstands, erscheint in den AGB. */
  jurisdiction: 'Greifensee ZH',
} as const

/** Preiszusatz, der zur MwSt-Situation passt. */
export const priceNote = shopConfig.vatRegistered
  ? 'Alle Preise in CHF inkl. MwSt.'
  : 'Alle Preise in CHF. Wir sind nicht mehrwertsteuerpflichtig, es fällt keine MwSt. an.'
