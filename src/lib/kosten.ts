import { kostenConfig } from '../data/kostenConfig'
import type { BestellPosition } from '../types'

/**
 * Was uns ein Netz kostet – die Gegenseite zu src/lib/estimate.ts.
 *
 * Dort wird der VERKAUFSPREIS aus dem Katalog zurueckgerechnet, nach Flaeche.
 * Hier geht es um den EINKAUF, und der folgt dem Umfang: Rahmen, Schiene und
 * der plissierte Gewebestreifen gehen nach laufendem Meter. Die Begruendung
 * samt Messwerten steht in src/data/kostenConfig.ts.
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

/** Umfang in Metern. Zwei mal Breite plus Hoehe – die Rahmenlaenge. */
export function umfangM(breiteCm: number, hoeheCm: number): number {
  return 2 * (breiteCm / 100 + hoeheCm / 100)
}

/** Was Bora fuer ein Netz dieser Groesse verlangt, in Euro. */
export function herstellungEur(breiteCm: number, hoeheCm: number): number {
  if (!(breiteCm > 0) || !(hoeheCm > 0)) return 0
  return runde2(kostenConfig.sockelEur + kostenConfig.proMeterEur * umfangM(breiteCm, hoeheCm))
}

/** Dasselbe in Franken, zum hinterlegten Kurs. */
export function herstellungChf(breiteCm: number, hoeheCm: number): number {
  return runde2(herstellungEur(breiteCm, hoeheCm) * kostenConfig.eurChf)
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
    summe += herstellungChf(p.breiteCm, p.hoeheCm) * p.menge
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
