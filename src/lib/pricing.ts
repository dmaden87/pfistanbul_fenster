import type { CartLine, CartTotals } from '../types'
import { categoryById, sizeById } from '../data/catalog'
import { roundToRappen } from './format'

/** Ab dieser Stueckzahl im Warenkorb gilt der Mengenrabatt. */
export const BULK_DISCOUNT_THRESHOLD = 3
/** Rabattsatz ab der Schwelle. */
export const BULK_DISCOUNT_RATE = 0.1
/** Lieferung im Pfisterhoelzli ist immer kostenlos. */
export const SHIPPING_CHF = 0

/** Preis eines einzelnen Elements: Groessenbasis mal Aufschlag der Bauart. */
export function unitPrice(categoryId: string, sizeId: string): number {
  const category = categoryById(categoryId)
  const size = sizeById(sizeId)
  if (!category || !size) return 0
  return roundToRappen(size.basePriceChf * category.priceFactor)
}

/** Preis einer Warenkorbzeile inklusive Menge. */
export function priceForLine(line: CartLine): number {
  return roundToRappen(unitPrice(line.categoryId, line.sizeId) * line.quantity)
}

export function cartTotals(lines: CartLine[]): CartTotals {
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
  const subtotalChf = roundToRappen(lines.reduce((sum, line) => sum + priceForLine(line), 0))

  const qualifiesForBulk = itemCount >= BULK_DISCOUNT_THRESHOLD
  const discountChf = qualifiesForBulk ? roundToRappen(subtotalChf * BULK_DISCOUNT_RATE) : 0
  const discountLabel = qualifiesForBulk
    ? `Nachbarschaftsrabatt ${Math.round(BULK_DISCOUNT_RATE * 100)}% ab ${BULK_DISCOUNT_THRESHOLD} Elementen`
    : null

  return {
    itemCount,
    subtotalChf,
    discountChf,
    shippingChf: SHIPPING_CHF,
    totalChf: roundToRappen(subtotalChf - discountChf + SHIPPING_CHF),
    discountLabel,
  }
}

/** Guenstigster Preis einer Bauart ueber alle Standardgroessen - fuer "ab CHF x". */
export function lowestPriceFor(categoryId: string, sizeIds: string[]): number {
  const prices = sizeIds.map((sizeId) => unitPrice(categoryId, sizeId)).filter((price) => price > 0)
  return prices.length ? Math.min(...prices) : 0
}
