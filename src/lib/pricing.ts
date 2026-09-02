import type { CartLine, CartTotals } from '../types'
import { netsInSet, regularPriceOfSet, setById, typeById, windowTypes } from '../data/catalog'
import { shopConfig } from '../data/shopConfig'

/** Lieferung in der Siedlung: persönliche Übergabe, kostenlos. */
export const SHIPPING_CHF = 0

/** Preis einer Warenkorbzeile ohne Montage. */
export function priceForLine(line: CartLine): number {
  if (line.kind === 'set') {
    return (setById(line.refId)?.priceChf ?? 0) * line.quantity
  }
  return (typeById(line.refId)?.priceChf ?? 0) * line.quantity
}

/** Anzahl Netze einer Zeile – ein Set zählt mit allen enthaltenen Netzen. */
export function netsForLine(line: CartLine): number {
  if (line.kind === 'set') {
    const set = setById(line.refId)
    return set ? netsInSet(set) * line.quantity : 0
  }
  return line.quantity
}

/** Ersparnis einer Zeile gegenüber den Einzelpreisen. Nur Sets sparen etwas. */
function savingsForLine(line: CartLine): number {
  if (line.kind !== 'set') return 0
  const set = setById(line.refId)
  if (!set) return 0
  return (regularPriceOfSet(set) - set.priceChf) * line.quantity
}

export function cartTotals(lines: CartLine[], withMontage: boolean): CartTotals {
  const netCount = lines.reduce((sum, line) => sum + netsForLine(line), 0)
  const netsChf = lines.reduce((sum, line) => sum + priceForLine(line), 0)
  const savingsChf = lines.reduce((sum, line) => sum + savingsForLine(line), 0)
  const montageChf = withMontage ? netCount * shopConfig.montageChf : 0

  return {
    netCount,
    netsChf,
    savingsChf,
    montageChf,
    shippingChf: SHIPPING_CHF,
    totalChf: netsChf + montageChf + SHIPPING_CHF,
  }
}

/**
 * Günstigster Einzelpreis im Sortiment – für "ab CHF x". Wird aus dem Katalog
 * abgeleitet, damit der Wert bei einer Preisänderung nicht stehen bleibt.
 */
export function lowestPrice(): number {
  return Math.min(...windowTypes.map((type) => type.priceChf))
}
