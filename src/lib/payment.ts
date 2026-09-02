import type { CartLine } from '../types'
import { setById, typeById } from '../data/catalog'
import { shopConfig } from '../data/shopConfig'

/** Warum die Onlinezahlung gerade nicht angeboten wird. `null` heisst: sie steht offen. */
export type OnlinePaymentBlocker = 'abgeschaltet' | 'vor-dem-start' | 'sondermass' | 'leerer-warenkorb'

/**
 * Online bezahlbar ist nur, was einem Katalogartikel mit fest hinterlegtem
 * Preis entspricht – denn genau diese Artikel haben auf der Serverseite
 * (api/checkout.ts) eine Stripe-Preis-Id. Alles andere, insbesondere
 * Sondermasse, wird erst nach der persönlichen Offerte abgerechnet.
 */
export function isOnlinePayableLine(line: CartLine): boolean {
  if (line.kind === 'set') return Boolean(setById(line.refId))
  if (line.kind === 'einzel') return Boolean(typeById(line.refId))
  return false
}

/**
 * Eine Stelle entscheidet über die Onlinezahlung, damit Anzeige und Absenden
 * nicht auseinanderlaufen können. Solange wir nicht operativ sind, nehmen wir
 * grundsätzlich kein Geld entgegen.
 */
export function onlinePaymentBlocker(lines: CartLine[]): OnlinePaymentBlocker | null {
  if (!shopConfig.onlinePayment) return 'abgeschaltet'
  if (!shopConfig.operational) return 'vor-dem-start'
  if (lines.length === 0) return 'leerer-warenkorb'
  if (!lines.every(isOnlinePayableLine)) return 'sondermass'
  return null
}

/** Kurzer Badge-Text neben der abgeschalteten Option. */
export function blockerBadge(blocker: OnlinePaymentBlocker): string {
  switch (blocker) {
    case 'sondermass':
      return 'Nicht für Sondermasse'
    case 'leerer-warenkorb':
      return 'Kein Warenkorb'
    default:
      return 'Noch nicht verfügbar'
  }
}

/** Erklärung, warum die Option ausgegraut ist. */
export function blockerHint(blocker: OnlinePaymentBlocker): string {
  switch (blocker) {
    case 'sondermass':
      return 'Ihr Warenkorb enthält mindestens eine Position nach Mass. Dafür gibt es keinen festen Preis, den wir im Voraus verrechnen könnten – wir offerieren Ihnen den Preis zuerst persönlich.'
    case 'leerer-warenkorb':
      return 'Legen Sie zuerst Netze in den Warenkorb.'
    default:
      return 'Solange wir im Aufbau sind, nehmen wir bewusst noch keine Zahlungen entgegen. Sobald wir live sind, können Sie hier direkt mit Karte bezahlen.'
  }
}
