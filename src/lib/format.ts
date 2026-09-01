const chf = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Preisangabe in Schweizer Franken, z. B. "CHF 49.00". */
export function formatChf(value: number): string {
  return chf.format(value)
}

/** Masse als "120 × 140 cm". */
export function formatSize(widthCm: number, heightCm: number): string {
  return `${widthCm} × ${heightCm} cm`
}

/** Auf 5 Rappen runden, wie in der Schweiz ueblich. */
export function roundToRappen(value: number): number {
  return Math.round(value * 20) / 20
}
