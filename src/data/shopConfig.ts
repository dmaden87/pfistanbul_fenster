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
   * Pollenschutz bleibt gesperrt, bis Preis und Verfügbarkeit des Gewebes
   * geklärt sind (offener Punkt im Kostenkonzept). Ein normales
   * Insektenschutzgewebe hält keine Pollen zurück – ohne zertifiziertes
   * Gewebe wäre jede Pollenaussage nach UWG angreifbar.
   */
  pollenEnabled: false,

  /** Montage durch uns, Preis pro Fenster in CHF. Gilt auch in Sets. */
  montageChf: 15,

  /**
   * Produziert wird in Sammelbestellungen. Erst ab dieser Anzahl Netze
   * trägt eine Runde ihre Frachtkosten – darunter wird nicht ausgelöst.
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
