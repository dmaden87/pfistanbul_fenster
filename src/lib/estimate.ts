import type { CustomRequestLine } from '../types'
import { windowTypes } from '../data/catalog'

/**
 * Richtpreis für Sondermasse.
 *
 * Wir wollen einer Kundin sagen können, was ungefähr auf sie zukommt, statt
 * sie wie die Konkurrenz auf "Preis auf Anfrage" zu vertrösten. Grundlage ist
 * eine Mischrechnung aus den vier ausgemessenen Formaten: Deren Preise folgen
 * nicht der Fläche allein – jedes Netz kostet einen Sockel (Rahmen, Zuschnitt,
 * Fracht, Handarbeit), dazu kommt ein Betrag pro Quadratmeter Gewebe. Genau
 * diese beiden Zahlen werden hier aus dem Katalog zurückgerechnet.
 *
 * Damit bleibt der Rechner automatisch richtig, wenn sich die Preise ändern:
 * Es gibt keine zweite, von Hand gepflegte Preisliste.
 */

/** Aufschlag für die Unsicherheit einer Einzelanfertigung. */
const UNCERTAINTY = 0.1

/** Auf diesen Betrag wird aufgerundet – nie ab, damit die Offerte nicht teurer ausfällt als der Richtpreis. */
const ROUND_TO_CHF = 10

/**
 * Bis hierhin liegen wir im ausgemessenen Bereich (das grösste Format im
 * Sortiment misst knapp 2 m²). Darüber extrapoliert die Rechnung, und das
 * sagen wir auch.
 */
export const RELIABLE_AREA_M2 = 2.5

export interface PriceModel {
  /** Sockelbetrag pro Netz, unabhängig von der Grösse. */
  baseChf: number
  /** Zuschlag pro Quadratmeter. */
  perM2Chf: number
}

/**
 * Kleinste-Quadrate-Gerade durch die Katalogformate (Preis über Fläche).
 * Beide Werte werden bei null abgeschnitten: Ein negativer Quadratmeterpreis
 * würde bedeuten, dass ein grösseres Netz weniger kostet – das darf aus
 * fehlerhaften Katalogdaten nie herausfallen.
 */
function fitModel(): PriceModel {
  const points = windowTypes.map((type) => ({ a: type.areaM2, p: type.priceChf }))
  if (points.length === 0) return { baseChf: 0, perM2Chf: 0 }

  const meanA = points.reduce((sum, x) => sum + x.a, 0) / points.length
  const meanP = points.reduce((sum, x) => sum + x.p, 0) / points.length
  const sxy = points.reduce((sum, x) => sum + (x.a - meanA) * (x.p - meanP), 0)
  const sxx = points.reduce((sum, x) => sum + (x.a - meanA) ** 2, 0)

  const perM2Chf = sxx > 0 ? Math.max(0, sxy / sxx) : 0
  return { baseChf: Math.max(0, meanP - perM2Chf * meanA), perM2Chf }
}

export const priceModel = fitModel()

/** Aufrunden mit kleiner Toleranz, damit CHF 150.0000001 nicht auf 160 springt. */
function roundUpTo(value: number, step: number): number {
  return Math.ceil(value / step - 1e-9) * step
}

/** Geschätzter Preis für ein einzelnes Netz dieser Fläche, inklusive Unsicherheit und Rundung. */
export function estimateNetChf(areaM2: number): number {
  const raw = priceModel.baseChf + priceModel.perM2Chf * areaM2
  return roundUpTo(raw * (1 + UNCERTAINTY), ROUND_TO_CHF)
}

export interface EstimateLine {
  id: string
  widthCm: number
  heightCm: number
  quantity: number
  areaM2: number
  perNetChf: number
  totalChf: number
  /** Grösser als das, was wir ausgemessen haben – die Schätzung wird unschärfer. */
  oversized: boolean
}

export interface Estimate {
  lines: EstimateLine[]
  netCount: number
  totalChf: number
  /** Zeilen, die noch nicht vollständig ausgefüllt sind und deshalb fehlen. */
  pendingCount: number
  anyOversized: boolean
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
  const perNetChf = estimateNetChf(areaM2)

  return {
    id: item.id,
    widthCm,
    heightCm,
    quantity: Math.floor(quantity),
    areaM2,
    perNetChf,
    totalChf: perNetChf * Math.floor(quantity),
    oversized: areaM2 > RELIABLE_AREA_M2,
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
    anyOversized: lines.some((line) => line.oversized),
  }
}
