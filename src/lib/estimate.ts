import type { CustomRequestLine } from '../types'
import { einfuhrsteuerChf, frachtChf, herstellungChf } from './kosten'

/**
 * Richtpreis für Sondermasse.
 *
 * Wir wollen einer Kundin sagen können, was ungefähr auf sie zukommt, statt
 * sie wie die Konkurrenz auf "Preis auf Anfrage" zu vertrösten. Grundlage
 * sind die vier ausgemessenen Formate: Aus ihren Preisen werden hier zwei
 * Zahlen zurückgerechnet – ein Sockel je Netz und ein Betrag pro Meter
 * Umfang. Damit bleibt der Rechner automatisch richtig, wenn sich die Preise
 * ändern: Es gibt keine zweite, von Hand gepflegte Preisliste.
 *
 * NACH UMFANG, NICHT NACH FLÄCHE – und das ist der Punkt.
 *
 * Hier stand jahrelang eine Rechnung über die Fläche, begründet mit "ein
 * Sockel plus ein Betrag pro Quadratmeter Gewebe". Diese Begründung ist
 * widerlegt. Bora stellt Rahmen, Schiene, Bürstendichtung und den
 * plissierten Gewebestreifen in Rechnung – alles Laufmeter. Das Gewebe
 * selbst ist das Billigste daran (siehe src/data/kostenConfig.ts, sieben
 * nachgerechnete Preise).
 *
 * Und unsere EIGENEN Katalogpreise sagen dasselbe:
 *
 *   erklärt durch    R²      mittlere Abweichung
 *   Fläche          0.89         CHF 3.02
 *   Umfang          0.99         CHF 1.09
 *
 * Am deutlichsten an der Balkontüre: Sie hat weniger Fläche als "Zimmer"
 * (1.73 gegen 1.958 m²) und kostet trotzdem mehr (155 gegen 150). Nach
 * Fläche ist das ein Widerspruch, nach Umfang stimmt es (5.80 gegen
 * 5.65 m). Die Preise waren von Hand gesetzt – die Hand hat nach Umfang
 * gerechnet, der Rechner nach Fläche.
 *
 * Praktisch heisst der Unterschied: Ein Flächenmodell verlangt für schmale
 * hohe Netze zu wenig – also für jede Türe und jedes Balkonfenster, das
 * Alltagsgeschäft – und für grosse quadratische zu viel. Es verschenkt
 * Marge, wo es oft vorkommt, und verschreckt, wo es selten vorkommt.
 *
 * `umfangM` kommt aus ./kosten und wird NICHT hier zweitgerechnet: Preis
 * und Kosten sollen denselben Umfang meinen, sonst laufen sie beim nächsten
 * Umbau auseinander.
 */

/**
 * Die Marge, die der Richtpreis tragen soll - MARGE VOM VERKAUFSPREIS.
 *
 * 75 Prozent Marge heissen: Die Kosten sind ein Viertel des Preises, der
 * Aufschlag also das Dreifache der Kosten. Nicht zu verwechseln mit "75
 * Prozent aufschlagen", was das 1.75-fache waere und rund 38 Prozent Marge
 * ergaebe. Genau diese Verwechslung stand einmal in der Vereinbarung.
 */
const MARGE_FAKTOR = 3

/**
 * Mehr als so viel Aufschlag nimmt kein Netz, egal wie gross.
 *
 * OHNE DECKEL MULTIPLIZIERT DIE MARGE DIE FLAECHE MIT. Ein Netz von
 * 250 x 250 cm kostet uns rund 205 Franken bis vor Ort; mal vier waeren das
 * ueber 800. Dafuer kauft niemand ein Insektenschutzgitter, und es waere
 * auch nicht verdient: Eine grosse Tuere macht uns nicht viermal so viel
 * Arbeit wie ein Badfenster, sie braucht nur mehr Material.
 *
 * Die Folge ist gewollt: Kleine Netze tragen ihre vollen 75 Prozent, bei
 * den grossen sinkt die Marge - auf 43 Prozent bei 250 x 250. Wer das
 * aendert, aendert die Preise auf der Startseite.
 */
const DECKEL_CHF = 150

/**
 * Auf diesen Betrag wird aufgerundet – nie ab, damit die Offerte nicht
 * teurer ausfällt als der genannte Richtpreis.
 */
const ROUND_TO_CHF = 5

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

/**
 * Der Richtpreis fuer ein Netz dieser Masse.
 *
 * DIE FORMEL, WIE SIE MIT DENIZ UND UFUK VEREINBART IST:
 *
 *   Netzkosten + Fracht und Zoll + min(3 x Gesamtkosten, 150)
 *
 * Der Aufschlag von drei mal den Kosten ist eine Marge von 75 Prozent -
 * Marge VOM VERKAUFSPREIS, nicht Aufschlag auf die Kosten. Das ist nicht
 * dasselbe und war die eine Stelle, an der die Vereinbarung mehrdeutig war:
 * "75 Prozent dazuschlagen" waere das 1.75-fache und ergaebe rund 38
 * Prozent Marge. Gemeint ist das Vierfache.
 *
 * DER DECKEL VON 150 FRANKEN IST DER ZWECK DER UEBUNG. Ohne ihn kostete ein
 * Netz von 250 x 250 ueber 800 Franken, weil die Marge die Flaeche
 * mitmultipliziert. Mit ihm traegt ein kleines Netz seine 75 Prozent, und
 * bei den grossen sinkt die Marge - auf 43 Prozent beim groessten. Das ist
 * gewollt: Eine Balkontuere soll bezahlbar bleiben, und sie kostet uns
 * nicht viermal so viel Arbeit wie ein Badfenster.
 *
 * WAS HIER NICHT MEHR STEHT: eine Gerade durch die Katalogpreise. Der
 * Rechner las die vier Siedlungsformate und rechnete einen Sockel und einen
 * Meterpreis daraus zurueck - erst ueber die Flaeche, dann ueber den Umfang.
 * Das war richtig, solange Boras Preise die einzige Quelle waren und
 * uneinheitlich. Seit es eine m2-Vereinbarung gibt, rechnet der Richtpreis
 * vorwaerts aus den Kosten statt rueckwaerts aus Preisen.
 *
 * DIE SIEDLUNGSPREISE BLEIBEN, WIE SIE SIND. Die vier Katalogformate tragen
 * ihre eigenen Preise und werden von dieser Funktion nicht beruehrt - sie
 * gilt fuer Sondermasse.
 */

function runde2(x: number): number {
  return Math.round(x * 100) / 100
}

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
  return roundUpTo(kosten + aufschlagChf(kosten), ROUND_TO_CHF)
}

/** Der Aufschlag auf die Selbstkosten: 75 Prozent Marge, gedeckelt. */
export function aufschlagChf(kostenChf: number): number {
  return Math.min(runde2(MARGE_FAKTOR * kostenChf), DECKEL_CHF)
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
