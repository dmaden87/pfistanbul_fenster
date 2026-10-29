import type { CustomRequestLine } from '../types'
import { einfuhrsteuerChf, frachtChf, herstellungChf } from './kosten'

/**
 * Richtpreis für Sondermasse.
 *
 * Wir wollen einer Kundin sagen können, was ungefähr auf sie zukommt, statt
 * sie wie die Konkurrenz auf "Preis auf Anfrage" zu vertrösten.
 *
 * ER RECHNET VORWÄRTS AUS DEN KOSTEN, nicht rückwärts aus Preisen:
 *
 *   Selbstkosten = Ware (Fläche × Boras m2-Satz) + Fracht + Einfuhrsteuer
 *   Richtpreis   = Sockel + Warenfaktor × Selbstkosten, aufgerundet auf
 *                  fünf Franken, mindestens der Mindestpreis
 *
 * So bleibt der Rechner richtig, wenn sich der Einkauf ändert: Es gibt
 * keine zweite, von Hand gepflegte Preisliste. Senkt Bora seinen Satz,
 * sinkt der Richtpreis mit – das ist gewollt und war Ende Oktober 2026 die
 * ausdrückliche Entscheidung, als der normale Rahmen von 30 auf 28 EUR/m²
 * fiel: Der Vorteil geht an die Kundschaft, nicht in die Marge.
 *
 * HIER STAND EINMAL EINE GERADE ÜBER DEN UMFANG, zurückgerechnet aus den
 * Katalogpreisen und sieben Angeboten von Bora. Sie war richtig, solange
 * Boras Preise die einzige Quelle waren und uneinheitlich. Seit es eine
 * m2-Vereinbarung gibt, beschriebe sie eine Preisliste, die es nicht mehr
 * gibt.
 *
 * DIE SIEDLUNGSPREISE BLEIBEN, WIE SIE SIND. Die vier Katalogformate tragen
 * ihre eigenen Preise und werden von dieser Funktion nicht berührt – sie
 * gilt für Sondermasse.
 */

/**
 * Der Sockel je Netz, unabhaengig von der Groesse.
 *
 * ER BEZAHLT, WAS NICHT MIT DER FLAECHE WAECHST: Ausmessen vor Ort, die
 * Fahrt dorthin, die Beratung, die Garantie auf das Mass. Ein kleines
 * Fenster macht davon genauso viel Arbeit wie ein grosses.
 *
 * Deniz' Anker, an denen diese Zahl haengt: 1 m² = 140, 1.5 = 160, 2 = 185,
 * 3 = 235 - gesetzt, als der normale Rahmen noch 30 EUR/m² kostete. Mit
 * Sockel 65 und Warenfaktor 1.6 traf die Rechnung damals alle vier auf den
 * Franken.
 *
 * SEIT BORAS SATZ AUF 28 LIEGT, TRIFFT SIE FUENF BIS ZEHN FRANKEN TIEFER:
 * 135 / 155 / 180 / 225. Der Faktor haette sich auf 1.68 heben lassen, dann
 * staenden die alten Preise wieder da und der guenstigere Einkauf bliebe
 * bei uns. Deniz hat anders entschieden: Er geht an die Kundschaft.
 *
 * Die Anker stehen hier trotzdem weiter, denn sie halten die FORM der
 * Geraden fest - ihr Abstand zueinander ist derselbe geblieben, die ganze
 * Linie ist nur um die ersparten zwei Euro je Quadratmeter gesunken.
 */
const SOCKEL_CHF = 65

/**
 * Womit die Selbstkosten multipliziert werden.
 *
 * HIER STANDEN EINMAL FAKTOR 3 UND EIN DECKEL VON 130 - eine Marge von 75
 * Prozent, gekappt. Die Form war falsch, und zwar an beiden Enden: Bis
 * 1 m² wuchs der Preis mit 100 Franken je m², danach brach der Zuwachs auf
 * 20 bis 30 ein. Die mittleren Formate sassen damit zu hoch auf dem Knick,
 * und ein Netz von 6 m² kostete nur das Doppelte von einem mit 1 m² -
 * obwohl sechsmal so viel Material drin steckt.
 *
 * Sockel plus Faktor ergibt stattdessen eine Gerade: rund 45 Franken je
 * Quadratmeter, ohne Knick und ohne Deckel. Die Marge faellt dabei von
 * selbst mit der Groesse (71 Prozent bei 0.8 m², 51 bei 5 m²), weil der
 * Sockel sich ueber mehr Flaeche verteilt. Das ist die
 * gewuenschte Richtung: Eine grosse Tuere soll bezahlbar bleiben, und sie
 * macht uns nicht sechsmal so viel Arbeit.
 *
 * KEIN DECKEL MEHR. Er war die Ursache des flachen oberen Endes. Wer eine
 * Obergrenze will, baut sie hier wieder ein - sie fehlt nicht aus
 * Versehen.
 */
const WARENFAKTOR = 1.6

/**
 * Auf diesen Betrag wird aufgerundet – nie ab, damit die Offerte nicht
 * teurer ausfällt als der genannte Richtpreis.
 */
const ROUND_TO_CHF = 5

/**
 * Unter diesen Betrag faellt kein Netz, egal wie klein.
 *
 * WARUM ES IHN BRAUCHT: Ein Netz von 50 x 70 cm kostet uns 24 Franken und
 * traegt mit der Marge einen Preis von 100. Dafuer faehrt niemand zweimal
 * hin - einmal zum Ausmessen, einmal zum Montieren. Diese Fahrten stehen in
 * keinem der Betraege: Die Montage ist ein eigener Posten im Angebot, und
 * das Ausmessen verrechnen wir gar nicht.
 *
 * Der Betrag ist derselbe, der als unteres Ende auf der Startseite steht
 * (priceRange.minChf). Das ist Absicht und kein Zufall: Was wir ankuendigen,
 * soll auch die Untergrenze dessen sein, was herauskommt - sonst steht auf
 * der Seite eine Zahl, die der Rechner gleich darauf unterbietet.
 *
 * Deniz' Beobachtung dazu: Grosse Fenster sind der Normalfall, kleine fast
 * nicht vorhanden. Der Mindestpreis trifft also selten - und wenn, dann den
 * Auftrag, der sich sonst nicht lohnt.
 */
const MINDESTPREIS_CHF = 125

/*
 * HIER STAND RELIABLE_AREA_M2 = 2.5, und daran hingen zwei Merker: `oversized`
 * je Element und `anyOversized` ueber die ganze Schaetzung. Beide fuetterten
 * nur einen Satz - "groesser als alles, was wir bisher ausgemessen haben,
 * dort ist die Schaetzung ungenauer". Er ist raus: Er verwirrt, ohne dem
 * Kunden zu sagen, was er damit anfangen soll, und steht ausgerechnet neben
 * der Zahl, die er gerade wissen wollte.
 *
 * DIE EINSCHRAENKUNG IST DAMIT NICHT WEG. Sie steht einmal und ruhig beim
 * Richtwert: "Fuer gaengige Formate bis rund 2 m²; groessere Flaechen und
 * Tueren liegen darueber" (priceRange.maxAreaM2). Das ist dieselbe Aussage,
 * nur als Angabe statt als Warnung - und sie gilt, bevor jemand tippt,
 * statt ihn mitten im Rechnen zu erschrecken.
 *
 * UND ES GIBT KEINEN SONDERFALL FUER GROSSE NETZE. Die vier Katalogformate
 * decken 3.9 bis 5.8 Meter Umfang ab, Boras sieben Preise 3.2 bis 6.2 - wer
 * 250 x 250 cm eintippt (10 Meter), bekommt eine Hochrechnung, keine
 * Messung. Trotzdem bekommt er eine Zahl: Ein Rechner, der ausgerechnet dort
 * schweigt, wo jemand am meisten wissen will, ist dort nutzlos. Die
 * Sicherheitsmarge ist genau dafuer da. Kommen groessere Netze mit echten
 * Preisen dazu, gehoeren sie in den Katalog und in
 * bau/kosten-test.mjs - dann wird aus der Hochrechnung eine Rechnung.
 */

function runde2(x: number): number {
  return Math.round(x * 100) / 100
}

/**
 * Die Zahlen der Preisformel, zum Anzeigen.
 *
 * WER DIE FORMEL AUFSCHREIBT, SCHREIBT SIE AB - und dann laeuft sie
 * auseinander. Das Preisblatt fuer Bora und Ufuk nennt Sockel und Faktor im
 * Klartext; stuenden sie dort als getippte Zahlen, zeigte es nach der
 * naechsten Anpassung eine Formel, nach der niemand mehr rechnet. Genau so
 * ist die beworbene Spanne einmal auf 100 bis 200 stehengeblieben.
 */
export const preisFormel = {
  sockelChf: SOCKEL_CHF,
  warenfaktor: WARENFAKTOR,
  mindestpreisChf: MINDESTPREIS_CHF,
  rundungChf: ROUND_TO_CHF,
} as const

/** Aufrunden mit kleiner Toleranz, damit CHF 150.0000001 nicht auf 155 springt. */
function roundUpTo(value: number, step: number): number {
  return Math.ceil(value / step - 1e-9) * step
}

/**
 * Was ein Netz dieser Masse uns kostet, bis es vor Ort liegt: Ware, Fracht
 * und Einfuhrsteuer. Ohne Montage - die steht im Angebot als eigener Posten.
 */
export function selbstkostenChf(
  breiteCm: number,
  hoeheCm: number,
  rahmendicke?: string,
  netzart?: string,
): number {
  const ware = herstellungChf(breiteCm, hoeheCm, rahmendicke, netzart)
  if (ware <= 0) return 0
  return runde2(ware + frachtChf(1) + einfuhrsteuerChf(ware))
}

/**
 * Der Richtpreis fuer ein einzelnes Netz, aufgerundet auf fuenf Franken.
 *
 * Aufgerundet und nie ab: Die Offerte soll nicht teurer ausfallen als der
 * Richtpreis, den die Kundschaft auf der Seite gesehen hat.
 */
export function estimateNetChf(
  breiteCm: number,
  hoeheCm: number,
  rahmendicke?: string,
  netzart?: string,
): number {
  const kosten = selbstkostenChf(breiteCm, hoeheCm, rahmendicke, netzart)
  if (kosten <= 0) return 0
  const gerechnet = SOCKEL_CHF + runde2(WARENFAKTOR * kosten)
  return roundUpTo(Math.max(gerechnet, MINDESTPREIS_CHF), ROUND_TO_CHF)
}

/**
 * Was ueber den Selbstkosten liegt - der Deckungsbeitrag eines Netzes.
 *
 * Nicht zum Rechnen, sondern zum Hinsehen: Die Oberflaeche zeigt damit, was
 * ein Netz einbringt, ohne dass jemand zwei Zahlen voneinander abziehen
 * muss. Der Mindestpreis geht mit ein, denn bei einem kleinen Netz ist er
 * es, der den Beitrag bestimmt.
 */
export function aufschlagChf(kostenChf: number): number {
  const preis = Math.max(SOCKEL_CHF + runde2(WARENFAKTOR * kostenChf), MINDESTPREIS_CHF)
  return runde2(preis - kostenChf)
}

/**
 * Die Marge, die ein Richtpreis dieser Groesse traegt, in Prozent.
 *
 * Nur zum Hinsehen - gerechnet wird mit den Betraegen. Sie faellt mit der
 * Groesse, sobald der Deckel greift, und das soll man sehen koennen.
 */
export function margeProzent(breiteCm: number, hoeheCm: number, rahmendicke?: string, netzart?: string): number | null {
  const kosten = selbstkostenChf(breiteCm, hoeheCm, rahmendicke, netzart)
  const preis = estimateNetChf(breiteCm, hoeheCm, rahmendicke, netzart)
  if (!(preis > 0)) return null
  return Math.round((100 * (preis - kosten)) / preis)
}

export interface EstimateLine {
  id: string
  widthCm: number
  heightCm: number
  quantity: number
  areaM2: number
  perNetChf: number
  totalChf: number
}

export interface Estimate {
  lines: EstimateLine[]
  netCount: number
  totalChf: number
  /** Zeilen, die noch nicht vollständig ausgefüllt sind und deshalb fehlen. */
  pendingCount: number
}

/** Grenzen wie in der Formularprüfung – was dort nicht durchgeht, wird auch nicht geschätzt. */
const MIN_CM = 20
const MAX_CM = 300
const MAX_QUANTITY = 50

function parseLine(item: CustomRequestLine): EstimateLine | null {
  const widthCm = Number(item.widthCm)
  const heightCm = Number(item.heightCm)
  const quantity = item.quantity.trim() === '' ? 1 : Number(item.quantity)

  const valid =
    Number.isFinite(widthCm) &&
    Number.isFinite(heightCm) &&
    Number.isFinite(quantity) &&
    widthCm >= MIN_CM &&
    widthCm <= MAX_CM &&
    heightCm >= MIN_CM &&
    heightCm <= MAX_CM &&
    quantity >= 1 &&
    quantity <= MAX_QUANTITY
  if (!valid) return null

  const areaM2 = (widthCm / 100) * (heightCm / 100)
  const perNetChf = estimateNetChf(widthCm, heightCm)

  return {
    id: item.id,
    widthCm,
    heightCm,
    quantity: Math.floor(quantity),
    areaM2,
    perNetChf,
    totalChf: perNetChf * Math.floor(quantity),
  }
}

/**
 * Richtpreis über alle vollständig ausgefüllten Elemente. `null`, solange
 * noch nichts Brauchbares dasteht – dann zeigt das Formular gar keine Zahl.
 */
export function estimateCustomRequest(items: CustomRequestLine[]): Estimate | null {
  const lines: EstimateLine[] = []
  let pendingCount = 0

  for (const item of items) {
    const line = parseLine(item)
    if (line) lines.push(line)
    else pendingCount += 1
  }

  if (lines.length === 0) return null

  return {
    lines,
    netCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    totalChf: lines.reduce((sum, line) => sum + line.totalChf, 0),
    pendingCount,
  }
}
