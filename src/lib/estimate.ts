import type { CustomRequestLine } from '../types'
import { windowTypes } from '../data/catalog'
import { einfuhrsteuerChf, herstellungChf, umfangM } from './kosten'

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

/** Aufschlag für die Unsicherheit einer Einzelanfertigung. */
const UNCERTAINTY = 0.05

/**
 * Die Marge, die ein Richtpreis mindestens tragen muss.
 *
 * WARUM ES SIE BRAUCHT, obwohl die Katalogformel vernünftige Preise liefert:
 * Die Formel folgt dem Umfang, die Kosten auch – aber nicht im gleichen
 * Verhältnis. Der Sockel im Verkaufspreis (rund 80 Franken für Ausmessen,
 * Fahren, Beraten, Garantie) wiegt bei einem kleinen Netz schwer und bei
 * einem grossen fast nichts, während die Kosten stur weiterlaufen. Darum
 * dünnt die Marge nach oben aus: Bei 300 × 300 cm waren es noch 67 Prozent.
 *
 * Also eine zweite Linie: Der Richtpreis ist das HÖHERE aus Katalogformel
 * und dem, was diese Marge verlangt. Unterhalb von rund sechs Metern Umfang
 * trägt die Formel von allein, dort ändert sich nichts; darüber übernimmt
 * die Marge.
 *
 * DAMIT HÄNGT DER VERKAUFSPREIS AN BORAS EINKAUFSPREIS, und das ist
 * beabsichtigt: Wird der Einkauf teurer, zieht der Richtpreis für grosse
 * Netze von selbst nach, statt still Marge zu verlieren. Wer
 * src/data/kostenConfig.ts anfasst, bewegt damit auch das, was auf der
 * Startseite steht.
 *
 * Gerechnet wird gegen Herstellung und Einfuhrsteuer. Die Fracht steckt
 * nicht darin – sie fällt je Sendung an, nicht je Netz, und liesse sich nur
 * raten. Die wahre Marge liegt also etwas unter diesem Wert; was wirklich
 * herauskommt, steht im Bereich "Zahlen" pro Auftrag und pro Sendung.
 */
const MIN_MARGE = 0.75

/**
 * Auf diesen Betrag wird aufgerundet – nie ab, damit die Offerte nicht
 * teurer ausfällt als der genannte Richtpreis.
 *
 * FÜNF STATT ZEHN, seit die Rechnung nach Umfang geht. Zehner-Schritte waren
 * grob genug, dass zwei spürbar verschiedene Fenster denselben Preis
 * bekamen; der feinere Schritt gibt die Rechnung wieder, statt sie
 * einzuebnen.
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

export interface PriceModel {
  /** Sockelbetrag pro Netz, unabhängig von der Grösse. */
  baseChf: number
  /** Zuschlag pro Meter Umfang. */
  proMeterChf: number
}

/**
 * Kleinste-Quadrate-Gerade durch die Katalogformate (Preis über Umfang).
 * Beide Werte werden bei null abgeschnitten: Ein negativer Meterpreis würde
 * bedeuten, dass ein grösseres Netz weniger kostet – das darf aus
 * fehlerhaften Katalogdaten nie herausfallen.
 */
function fitModel(): PriceModel {
  const points = windowTypes.map((type) => ({
    u: umfangM(type.widthCm, type.heightCm),
    p: type.priceChf,
  }))
  if (points.length === 0) return { baseChf: 0, proMeterChf: 0 }

  const meanU = points.reduce((sum, x) => sum + x.u, 0) / points.length
  const meanP = points.reduce((sum, x) => sum + x.p, 0) / points.length
  const sxy = points.reduce((sum, x) => sum + (x.u - meanU) * (x.p - meanP), 0)
  const sxx = points.reduce((sum, x) => sum + (x.u - meanU) ** 2, 0)

  const proMeterChf = sxx > 0 ? Math.max(0, sxy / sxx) : 0
  return { baseChf: Math.max(0, meanP - proMeterChf * meanU), proMeterChf }
}

export const priceModel = fitModel()

/** Aufrunden mit kleiner Toleranz, damit CHF 150.0000001 nicht auf 155 springt. */
function roundUpTo(value: number, step: number): number {
  return Math.ceil(value / step - 1e-9) * step
}

/**
 * Geschätzter Preis für ein einzelnes Netz dieser Masse, inklusive
 * Sicherheitsmarge und Rundung.
 *
 * NIMMT MASSE, NICHT FLÄCHE. Die Fläche allein reicht nicht mehr: 30 × 300
 * und 95 × 95 haben beide 0.9 m², aber 6.6 gegen 3.8 Meter Umfang – und
 * damit verschiedene Preise, so wie sie auch verschieden viel kosten.
 */
export function estimateNetChf(breiteCm: number, hoeheCm: number): number {
  const ausKatalog =
    (priceModel.baseChf + priceModel.proMeterChf * umfangM(breiteCm, hoeheCm)) * (1 + UNCERTAINTY)
  return roundUpTo(Math.max(ausKatalog, margenGrenze(breiteCm, hoeheCm)), ROUND_TO_CHF)
}

/**
 * Der tiefste Preis, der MIN_MARGE noch trägt.
 *
 * Marge heisst hier Marge vom Verkaufspreis, nicht Aufschlag auf die Kosten:
 * 75 Prozent Marge sind das Vierfache der Kosten, nicht das 1.75-fache.
 */
export function margenGrenze(breiteCm: number, hoeheCm: number): number {
  const ware = herstellungChf(breiteCm, hoeheCm)
  return (ware + einfuhrsteuerChf(ware)) / (1 - MIN_MARGE)
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
