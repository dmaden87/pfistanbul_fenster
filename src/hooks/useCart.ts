import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CartLine, CartLineKind, CartTotals } from '../types'
import { cartTotals, netsForLine, priceForLine } from '../lib/pricing'

const STORAGE_KEY = 'pfistanbul.cart.v3'

/**
 * Frueher wurde hier der Montage-Wunsch gespeichert. Das war falsch: Der
 * Haken kostet CHF 15 pro Fenster, und wer ihn einmal gesetzt hatte, fand ihn
 * Wochen spaeter bei einer neuen Bestellung wieder gesetzt vor – der
 * Aufschlag stand im Total, ohne dass ihn jemand nochmals gewaehlt haette.
 * Eine kostenpflichtige Zusatzleistung darf sich nicht selbst wieder
 * einschalten. Der Schluessel wird deshalb nur noch aufgeraeumt.
 */
const LEGACY_MONTAGE_KEY = 'pfistanbul.montage.v1'

function readStoredCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (line): line is CartLine =>
        typeof line === 'object' &&
        line !== null &&
        typeof (line as CartLine).id === 'string' &&
        ((line as CartLine).kind === 'einzel' || (line as CartLine).kind === 'set') &&
        typeof (line as CartLine).refId === 'string' &&
        typeof (line as CartLine).quantity === 'number',
    )
  } catch {
    return []
  }
}

function forgetLegacyMontage(): void {
  try {
    window.localStorage.removeItem(LEGACY_MONTAGE_KEY)
  } catch {
    // Speicher nicht verfuegbar – dann gibt es auch nichts aufzuraeumen.
  }
}

export interface UseCart {
  lines: CartLine[]
  totals: CartTotals
  montage: boolean
  setMontage: (value: boolean) => void
  add: (kind: CartLineKind, refId: string, quantity?: number) => void
  setQuantity: (id: string, quantity: number) => void
  remove: (id: string) => void
  clear: () => void
  linePrice: (line: CartLine) => number
  lineNets: (line: CartLine) => number
}

export function useCart(): UseCart {
  const [lines, setLines] = useState<CartLine[]>(readStoredCart)
  // Bewusst ohne Speicherung: Die Montage wird bei jeder Bestellung neu
  // gewaehlt und ist nie vorausgewaehlt.
  const [montage, setMontage] = useState(false)

  useEffect(() => {
    forgetLegacyMontage()
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Speicher nicht verfügbar (privater Modus) – der Warenkorb lebt dann
      // nur in dieser Sitzung.
    }
  }, [lines])

  const add = useCallback((kind: CartLineKind, refId: string, quantity = 1) => {
    setLines((current) => {
      const id = `${kind}__${refId}`
      const existing = current.find((line) => line.id === id)
      if (existing) {
        return current.map((line) =>
          line.id === id ? { ...line, quantity: Math.min(99, line.quantity + quantity) } : line,
        )
      }
      return [...current, { id, kind, refId, quantity }]
    })
  }, [])

  const setQuantity = useCallback((id: string, quantity: number) => {
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.id !== id)
        : current.map((line) => (line.id === id ? { ...line, quantity: Math.min(99, quantity) } : line)),
    )
  }, [])

  const remove = useCallback((id: string) => {
    setLines((current) => current.filter((line) => line.id !== id))
  }, [])

  const clear = useCallback(() => {
    setLines([])
    setMontage(false)
  }, [])

  const totals = useMemo(() => cartTotals(lines, montage), [lines, montage])

  return { lines, totals, montage, setMontage, add, setQuantity, remove, clear, linePrice: priceForLine, lineNets: netsForLine }
}
