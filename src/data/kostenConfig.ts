import type { Beteiligter } from '../types'

/**
 * Was uns ein Netz kostet, und wie der Gewinn aufgeteilt wird.
 *
 * GETRENNT VON shopConfig, und das mit Absicht: Dort stehen die Zahlen, die
 * die Kundschaft sieht. Hier stehen die, die nur uns etwas angehen. Ein
 * Versehen beim Bearbeiten soll nicht aus einer Einkaufszahl eine
 * Verkaufszahl machen.
 */

/**
 * BORA RECHNET NACH QUADRATMETERN - SEIT OKTOBER 2026 AUSDRUECKLICH.
 *
 * Davor standen hier sieben aus echten Angeboten zurueckgerechnete Preise
 * und eine Gerade ueber den UMFANG, die sie auf 0.37 EUR genau traf. Diese
 * Formel ist Geschichte, und nicht weil sie schlecht war: Weil Boras Preise
 * uneinheitlich waren - der Satz je Quadratmeter schwankte zwischen 17.90
 * und 35.81 -, haben wir uns mit ihm auf einen festen m2-Preis geeinigt.
 * Eine Formel, die alte Angebote genau trifft, beschreibt damit eine
 * Preisliste, die es nicht mehr gibt.
 *
 *   1.5er Rahmen (schmal)    35 EUR/m2
 *   2.8er Rahmen (normal)    30 EUR/m2
 *
 * DIE SIEBEN MESSPUNKTE STEHEN NICHT MEHR IM TEST. Sie zu behalten hiesse,
 * die Formel gegen eine Vereinbarung zu pruefen, die abgeloest wurde - der
 * Test waere rot, obwohl alles stimmt. Was jetzt geprueft wird, ist die
 * Vereinbarung selbst: Flaeche mal Satz, und der Aufschlag fuer den
 * schmalen Rahmen.
 *
 * WAS NOCH FEHLT: der Aufschlag fuer engmaschiges Gewebe. Bora nennt ihn
 * naechste Woche; bis dahin rechnen beide Gewebe gleich, und das steht
 * unten als eigene Zahl, damit es eine Zeile ist und keine Suche.
 *
 * DIESE ZAHLEN BEWEGEN AUCH DEN VERKAUFSPREIS. src/lib/estimate.ts rechnet
 * den Richtpreis aus diesen Kosten; wird der Einkauf teurer, steigt er mit,
 * statt still Marge zu verlieren - und wer hier etwas aendert, aendert mit,
 * was auf der Startseite steht.
 */
export const kostenConfig = {
  /**
   * Was Bora je Quadratmeter verlangt, nach Rahmendicke.
   *
   * Der schmale 1.5er ist aufwendiger zu fertigen und kostet entsprechend
   * mehr. Die Schluessel sind dieselben wie in RAHMENDICKEN - wer dort
   * einen hinzufuegt, muss hier einen Preis nennen, sonst rechnet das
   * Netz mit dem Normalsatz weiter, als waere nichts gewesen.
   */
  proM2Eur: { '1.5': 35, '2.8': 30 } as Record<string, number>,

  /** Der Satz, wenn eine Rahmendicke nicht in der Tabelle steht – Alteintraege. */
  proM2StandardEur: 30,

  /**
   * Aufschlag auf den m2-Preis fuer engmaschiges Gewebe, als Faktor.
   *
   * NOCH UNBEKANNT, deshalb 1: Bora nennt den Betrag naechste Woche. Bis
   * dahin rechnen beide Gewebe gleich, und das ist ehrlicher als eine
   * geratene Zahl - eine Schaetzung, die sich als Preis ausgibt, ist in
   * einer Marge das Schlimmste.
   */
  engmaschigFaktor: 1,

  /**
   * Umrechnung Euro in Franken. EINE ZAHL, VON HAND GEPFLEGT.
   *
   * Bewusst kein Kurs je Sendung und keine Historie: Bora stellt in Euro,
   * wir rechnen in Franken, und der Kurs schwankt weniger als die Preise.
   * Wer ihn anpasst, aendert damit rueckwirkend alle Kostenschaetzungen –
   * nicht aber die Betraege, die in einer Bestellung bereits eingetragen
   * sind. Die stehen in Franken und bleiben stehen.
   */
  eurChf: 0.95,

  /**
   * Einfuhrsteuer auf dem Warenwert, als Anteil.
   *
   * Wir sind nicht mehrwertsteuerpflichtig (unter 100 000 Franken Umsatz),
   * also gibt es keinen Vorsteuerabzug: Diese Steuer ist schlicht Kosten.
   * Sie faellt auf die Ware an, nicht auf Fracht und nicht auf unsere
   * Montage.
   */
  einfuhrsteuer: 0.081,

  /**
   * Fracht je Netz in Franken.
   *
   * EINE PAUSCHALE, UND SIE IST EINE. Deniz' Angabe aus den Abrechnungen:
   * rund 13 Franken je Netz im Schnitt ueber verschiedene Groessen. Zuerst
   * standen hier 12 - die Zahl stammte aus einer einzelnen Sendung, die
   * jetzige aus mehreren. Ein grosses Paket kostet mehr, ein kleines weniger - weil die
   * Fracht je SENDUNG anfaellt und nicht je Netz, laesst sich der Anteil
   * eines einzelnen Netzes ohnehin nur verteilen, nicht messen.
   *
   * Was dieser Wert bewegt: Mit ihm stehen Boras Frachtkosten in der Liste
   * "Wem wir was schulden" und in der Marge. Ohne ihn fehlten sie ganz, und
   * die Marge sah um rund acht Prozentpunkte besser aus, als sie ist.
   *
   * Kommt eine Rechnung mit dem echten Betrag, wird er am Auftrag erfasst
   * und schlaegt diese Pauschale - wie ueberall sonst auch.
   */
  frachtProNetzChf: 13,
} as const

export const beteiligte: Record<Beteiligter, string> = {
  bora: 'Bora',
  ufuk: 'Ufuk',
  deniz: 'Deniz',
}

/**
 * WER DIE KOSTEN EINES AUFTRAGS AUSLEGT, solange nichts anderes erfasst ist.
 *
 * Bora kauft die Netze ein, bezahlt die Fracht und streckt beim Zoll vor –
 * also stehen diese drei Posten zunaechst bei ihm offen. Erfasst jemand
 * einen Posten von Hand, gilt, was dort steht.
 */
export const standardTraeger = {
  herstellung: 'bora',
  lieferung: 'bora',
  mwst: 'bora',
} as const

/**
 * Wie der Gewinn verteilt wird – ZWEI TOEPFE.
 *
 * Die Ware kauft Bora ein, also ist er daran beteiligt. Montage und Anfahrt
 * sind die Arbeit von Ufuk und Deniz; wer hinfaehrt und schraubt, teilt den
 * Ertrag unter sich auf. Deshalb zwei Verteilschluessel statt einem.
 *
 * Die laufenden Betriebskosten (Marketing, Infrastruktur) mindern den
 * Warentopf: Sie tragen das Geschaeft als Ganzes, und Bora traegt als
 * Partner mit. Soll er davon verschont bleiben, gehoert `betriebskosten`
 * unten auf 'montage' umgestellt – eine Zeile.
 */
export const verteilung = {
  ware: { bora: 0.2, ufuk: 0.4, deniz: 0.4 },
  montage: { bora: 0, ufuk: 0.5, deniz: 0.5 },
  /** Aus welchem Topf die Betriebskosten bezahlt werden. */
  betriebskosten: 'ware' as 'ware' | 'montage',
} as const
