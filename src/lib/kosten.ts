import { kostenConfig } from '../data/kostenConfig'
import type { BestellPosition } from '../types'

/**
 * Was uns ein Netz kostet – die Gegenseite zu src/lib/estimate.ts.
 *
 * Dort wird der VERKAUFSPREIS gerechnet - aus diesen Kosten plus Marge.
 * Hier geht es um den EINKAUF, und der folgt seit Oktober 2026 der
 * Vereinbarung mit Bora: Flaeche mal Satz je Rahmendicke. Die Begruendung
 * und die Geschichte der abgeloesten Umfangformel stehen in
 * src/data/kostenConfig.ts.
 *
 * DIESE ZAHLEN SIND SCHAETZUNGEN. Sie belegen die Eingabefelder vor, damit
 * man nicht bei null anfaengt. Was tatsaechlich bezahlt wurde, traegt der
 * Mensch ein und ueberschreibt sie damit – wie beim Verkaufspreis im
 * Angebot. Eine Schaetzung, die sich als Tatsache ausgibt, ist in einer
 * Erfolgsrechnung das Schlimmste.
 */

function runde2(x: number): number {
  return Math.round(x * 100) / 100
}

/** Flaeche in Quadratmetern. */
export function flaecheM2(breiteCm: number, hoeheCm: number): number {
  return (breiteCm / 100) * (hoeheCm / 100)
}

/**
 * Umfang in Metern. Zwei mal Breite plus Hoehe – die Rahmenlaenge.
 *
 * GEHT NICHT MEHR IN DEN PREIS EIN. Bora rechnete erkennbar nach Umfang,
 * solange er Stueck fuer Stueck offerierte; seit der m2-Vereinbarung ist das
 * Geschichte. Die Funktion bleibt, weil das Mass fuer die Fertigung
 * weiterhin etwas aussagt - nur rechnet niemand mehr damit.
 */
export function umfangM(breiteCm: number, hoeheCm: number): number {
  return 2 * (breiteCm / 100 + hoeheCm / 100)
}

/** Der m2-Satz fuer eine Rahmendicke, in Euro. */
export function satzEur(rahmendicke?: string): number {
  if (rahmendicke && rahmendicke in kostenConfig.proM2Eur) return kostenConfig.proM2Eur[rahmendicke]
  /*
   * ALTEINTRAEGE TRAGEN FREIEN TEXT ("3-4 cm", "60 mm"). Sie mit dem
   * Normalsatz zu rechnen ist richtig: Es gab nur einen Rahmen, und das war
   * der gewoehnliche. Ein Fehler waere es, daraus null zu machen - dann
   * stuende ein Auftrag ohne Warenkosten in der Marge.
   */
  return kostenConfig.proM2StandardEur
}

/**
 * Was Bora fuer ein Netz dieser Groesse verlangt, in Euro.
 *
 * Flaeche mal Satz. Der Satz haengt an der Rahmendicke, das Gewebe kommt
 * als Faktor darauf - beides steht in src/data/kostenConfig.ts, samt der
 * Begruendung, warum hier nicht mehr der Umfang steht.
 */
export function herstellungEur(
  breiteCm: number,
  hoeheCm: number,
  rahmendicke?: string,
  netzart?: string,
): number {
  if (!(breiteCm > 0) || !(hoeheCm > 0)) return 0
  const faktor = netzart === 'engmaschig' ? kostenConfig.engmaschigFaktor : 1
  return runde2(flaecheM2(breiteCm, hoeheCm) * satzEur(rahmendicke) * faktor)
}

/** Dasselbe in Franken, zum hinterlegten Kurs. */
export function herstellungChf(
  breiteCm: number,
  hoeheCm: number,
  rahmendicke?: string,
  netzart?: string,
): number {
  return runde2(herstellungEur(breiteCm, hoeheCm, rahmendicke, netzart) * kostenConfig.eurChf)
}

/**
 * Was die Netze einer Bestellung zusammen kosten, in Franken.
 *
 * Katalognetze zaehlen gleich wie Sondermasse: Auch sie kommen von Bora und
 * kosten ihn Rahmen und Gewebe.
 *
 * FEHLEN DIE MASSE, LIEFERT DIE POSITION NICHTS. Bei Katalogzeilen aus der
 * Anfangszeit stehen sie nicht am Datensatz, und geraten waere schlimmer als
 * gefehlt: Eine erfundene Zahl sieht aus wie eine gemessene. Die Luecke
 * faellt in der Auswertung auf, die Erfindung nicht.
 */
export function herstellungFuer(positionen: BestellPosition[]): number {
  let summe = 0
  for (const p of positionen) {
    if (p.breiteCm === undefined || p.hoeheCm === undefined) continue
    summe += herstellungChf(p.breiteCm, p.hoeheCm, p.rahmendicke, p.netzart) * p.menge
  }
  return runde2(summe)
}

/**
 * Einfuhrsteuer auf dem Warenwert.
 *
 * Nur auf die Ware, nicht auf die Fracht und nicht auf unsere Montage. Wir
 * sind nicht mehrwertsteuerpflichtig, also gibt es keinen Vorsteuerabzug:
 * Die Steuer bleibt als Kosten stehen.
 */
export function einfuhrsteuerChf(warenwertChf: number): number {
  return runde2(warenwertChf * kostenConfig.einfuhrsteuer)
}

/**
 * Die Fracht fuer eine Anzahl Netze, in Franken.
 *
 * NACH STUECK, NICHT NACH GROESSE. Die Fracht faellt je Sendung an; was ein
 * einzelnes Netz daran traegt, laesst sich nur verteilen. Die Pauschale in
 * src/data/kostenConfig.ts ist der gemessene Schnitt einer echten Sendung
 * ueber verschiedene Groessen.
 */
export function frachtChf(netzZahl: number): number {
  if (!(netzZahl > 0)) return 0
  return runde2(netzZahl * kostenConfig.frachtProNetzChf)
}
