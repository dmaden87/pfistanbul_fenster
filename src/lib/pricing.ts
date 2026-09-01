import type { CartLine, CartTotals } from '../types'
import { buildById, meshById, sizeById } from '../data/catalog'

/**
 * Die ganze Preisliste besteht aus zwei Zahlen: ein flächenunabhängiger
 * Grundpreis plus ein Quadratmeterpreis, multipliziert mit dem Faktor der
 * Bauart und aufgerundet auf volle fünf Franken.
 *
 * ACHTUNG – VOM BETREIBER ZU RECHNEN: Beide Zahlen sind Positionierungs-
 * annahmen aus recherchierten Marktspannen, keine Kalkulation. Sie müssen
 * gegen echte Einkaufspreise, Arbeitszeit und Wunschmarge geprüft werden.
 */
export const BASE_CHF = 39
export const RATE_CHF_PER_M2 = 85

/** Aufschlag für die Einzelfertigung bei Sondermassen. */
export const CUSTOM_SURCHARGE = 1.15

/**
 * Mengenrabatt nach Anzahl Elementen, nicht nach Betrag – das bildet den
 * echten Vorteil ab: eine Rüstung, eine Lieferung, ein Weg.
 */
const DISCOUNT_TIERS = [
  { elements: 8, rate: 0.12 },
  { elements: 5, rate: 0.08 },
  { elements: 3, rate: 0.05 },
] as const

/** Lieferung innerhalb der Siedlung: persönliche Übergabe, kostenlos. */
export const SHIPPING_CHF = 0

function roundUpToFive(value: number): number {
  return Math.ceil(value / 5) * 5
}

function roundToRappen(value: number): number {
  return Math.round(value * 20) / 20
}

/** Preis eines Elements aus Mass, Bauart und Gewebe. */
export function priceFor(widthCm: number, heightCm: number, buildId: string, meshId: string): number {
  const build = buildById(buildId)
  const mesh = meshById(meshId)
  if (!build || !mesh) return 0

  const squareMetres = (widthCm * heightCm) / 10000
  const raw = (BASE_CHF + (RATE_CHF_PER_M2 + mesh.surchargePerM2) * squareMetres) * build.factor
  return roundUpToFive(raw)
}

/** Preis für eine Standardgrösse. */
export function unitPrice(buildId: string, sizeId: string, meshId: string): number {
  const size = sizeById(sizeId)
  if (!size) return 0
  return priceFor(size.widthCm, size.heightCm, buildId, meshId)
}

/** Richtpreis für ein Sondermass, inklusive Aufschlag für die Einzelfertigung. */
export function customPrice(widthCm: number, heightCm: number, buildId: string, meshId: string): number {
  return roundUpToFive(priceFor(widthCm, heightCm, buildId, meshId) * CUSTOM_SURCHARGE)
}

export function priceForLine(line: CartLine): number {
  return unitPrice(line.buildId, line.sizeId, line.meshId) * line.quantity
}

function discountFor(elements: number): { rate: number; elements: number } | null {
  return DISCOUNT_TIERS.find((tier) => elements >= tier.elements) ?? null
}

function nextTierFor(elements: number): { elements: number; rate: number } | null {
  const upcoming = [...DISCOUNT_TIERS].reverse().find((tier) => elements < tier.elements)
  return upcoming ? { elements: upcoming.elements, rate: upcoming.rate } : null
}

export function cartTotals(lines: CartLine[]): CartTotals {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
  const subtotalChf = lines.reduce((sum, line) => sum + priceForLine(line), 0)

  const tier = discountFor(itemCount)
  const discountRate = tier?.rate ?? 0
  const discountChf = roundToRappen(subtotalChf * discountRate)

  return {
    itemCount,
    subtotalChf,
    discountChf,
    discountRate,
    shippingChf: SHIPPING_CHF,
    totalChf: roundToRappen(subtotalChf - discountChf + SHIPPING_CHF),
    discountLabel: tier ? `Mengenrabatt ab ${tier.elements} Elementen (${Math.round(tier.rate * 100)} %)` : null,
    nextTier: nextTierFor(itemCount),
  }
}

/** Günstigster Preis einer Bauart über alle passenden Standardgrössen. */
export function lowestPriceFor(buildId: string, sizeIds: string[]): number {
  const prices = sizeIds.map((sizeId) => unitPrice(buildId, sizeId, 'standard')).filter((price) => price > 0)
  return prices.length ? Math.min(...prices) : 0
}
