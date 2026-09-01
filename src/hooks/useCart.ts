import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CartLine, CartLineKind, CartTotals } from '../types'
import { cartTotals, netsForLine, priceForLine } from '../lib/pricing'

const STORAGE_KEY = 'pfistanbul.cart.v3'
const MONTAGE_KEY = 'pfistanbul.montage.v1'

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

function readStoredMontage(): boolean {
  try {
    return window.localStorage.getItem(MONTAGE_KEY) === '1'
  } catch {
    return false
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
  const [montage, setMontage] = useState<boolean>(readStoredMontage)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
      window.localStorage.setItem(MONTAGE_KEY, montage ? '1' : '0')
    } catch {
      // Speicher nicht verfügbar (privater Modus) – der Warenkorb lebt dann
      // nur in dieser Sitzung.
    }
  }, [lines, montage])

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

  const clear = useCallback(() => setLines([]), [])

  const totals = useMemo(() => cartTotals(lines, montage), [lines, montage])

  return { lines, totals, montage, setMontage, add, setQuantity, remove, clear, linePrice: priceForLine, lineNets: netsForLine }
}
