import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CartLine, CartTotals } from '../types'
import { priceForLine, cartTotals } from '../lib/pricing'

const STORAGE_KEY = 'pfistanbul.cart.v2'

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
        typeof (line as CartLine).buildId === 'string' &&
        typeof (line as CartLine).sizeId === 'string' &&
        typeof (line as CartLine).meshId === 'string' &&
        typeof (line as CartLine).quantity === 'number',
    )
  } catch {
    return []
  }
}

export interface UseCart {
  lines: CartLine[]
  totals: CartTotals
  add: (buildId: string, sizeId: string, meshId: string, quantity?: number) => void
  setQuantity: (id: string, quantity: number) => void
  remove: (id: string) => void
  clear: () => void
  linePrice: (line: CartLine) => number
}

export function useCart(): UseCart {
  const [lines, setLines] = useState<CartLine[]>(readStoredCart)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Speicher nicht verfuegbar (privater Modus) - der Warenkorb lebt dann nur in dieser Sitzung.
    }
  }, [lines])

  const add = useCallback((buildId: string, sizeId: string, meshId: string, quantity = 1) => {
    setLines((current) => {
      const id = `${buildId}__${sizeId}__${meshId}`
      const existing = current.find((line) => line.id === id)
      if (existing) {
        return current.map((line) =>
          line.id === id ? { ...line, quantity: Math.min(99, line.quantity + quantity) } : line,
        )
      }
      return [...current, { id, buildId, sizeId, meshId, quantity }]
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

  const totals = useMemo(() => cartTotals(lines), [lines])

  return { lines, totals, add, setQuantity, remove, clear, linePrice: priceForLine }
}
