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
 * BORA RECHNET NACH UMFANG, NICHT NACH FLAECHE.
 *
 * Aus sieben echten Preisen zurueckgerechnet (Oktober 2026). Die Zahlen
 * sprechen deutlich:
 *
 *   Modell                    R²      mittlere Abweichung   groesste
 *   nur Flaeche              -0.14          6.66 EUR         8.76 EUR
 *   Sockel + Flaeche          0.93          1.26 EUR         3.97 EUR
 *   Sockel + Umfang           1.00          0.36 EUR         0.69 EUR
 *
 * In der Kreuzpruefung (jedes Netz einmal weglassen und vorhersagen) liegt
 * das Umfangsmodell bei 0.54 EUR Fehler, das Flaechenmodell bei 1.72 EUR.
 *
 * DIE ROHE GERADE LAEUFT AUF 1.74 + 6.36, hier stehen 1.60 + 6.40. Der
 * Unterschied betraegt auf dem schlechtesten Punkt 0.07 EUR und liegt damit
 * weit unter dem, was Bora selbst rundet – er nennt ganze Euro. Die
 * glatteren Zahlen nachzufuehren hiesse, jede Kostenschaetzung im ganzen
 * Werkzeug um Rappen zu verschieben, ohne dass irgendetwas genauer wuerde.
 * Wandert die Gerade einmal weiter, faellt es in bau/kosten-test.mjs auf:
 * Dort ist eine Toleranz von 1.00 EUR hinterlegt.
 *
 * Das passt zur Sache: Rahmen, Schiene, Buerstendichtung und der plissierte
 * Gewebestreifen gehen nach laufendem Meter. Das Gewebe selbst ist das
 * Billigste daran. Wer nach Flaeche rechnet, setzt bei schmalen hohen Netzen
 * – also bei jeder Tuere – zu wenig Kosten an und sieht die Marge dort
 * besser, als sie ist.
 *
 * Die sieben Messpunkte stehen in bau/kosten-test.mjs und pruefen diese
 * Formel bei jedem Durchlauf nach. Kommen neue Preise von Bora, gehoeren sie
 * dort hinein, und die Formel wird neu gerechnet.
 *
 * DIESE ZAHLEN BEWEGEN AUCH DEN VERKAUFSPREIS. Seit der Richtpreis in
 * src/lib/estimate.ts eine Mindestmarge von 75 Prozent tragen muss, zieht er
 * bei grossen Netzen an diesen Kosten. Wird der Einkauf teurer, steigt der
 * Richtpreis fuer grosse Netze von selbst mit, statt still Marge zu
 * verlieren – und wer hier etwas aendert, aendert mit, was auf der
 * Startseite steht.
 *
 * WAS DIESEN SIEBEN FEHLT, IST DIE GROESSE. Sie decken 3.20 bis 6.22 Meter
 * Umfang ab – ein Netz von 250 x 250 cm hat zehn Meter. Alles darueber ist
 * Hochrechnung, beim Einkauf wie beim Verkaufspreis in src/lib/estimate.ts.
 * Ein einziger echter Preis fuer ein grosses Netz waere hier mehr wert als
 * drei weitere mittlere.
 */
export const kostenConfig = {
  /** Sockelbetrag je Netz in Euro, unabhaengig von der Groesse. */
  sockelEur: 1.6,
  /** Zuschlag je Meter Umfang in Euro. Umfang = 2 x (Breite + Hoehe). */
  proMeterEur: 6.4,

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
