import type { CartLine } from '../types'
import { netsForLine } from './pricing'

/**
 * Startet die Onlinezahlung. Der Browser schickt nur, WAS bestellt wurde –
 * die Preise setzt die Serverfunktion aus ihrer eigenen Tabelle. So kann
 * niemand über die Entwicklerkonsole den Betrag verändern.
 */
export async function startCheckout(options: {
  lines: CartLine[]
  montage: boolean
  email: string
  reference: string
}): Promise<string> {
  const { lines, montage, email, reference } = options
  const montageNets = montage ? lines.reduce((sum, line) => sum + netsForLine(line), 0) : 0

  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lines: lines.map((line) => ({ kind: line.kind, refId: line.refId, quantity: line.quantity })),
      montageNets,
      email,
      reference,
    }),
  })

  const payload: unknown = await response.json().catch(() => null)
  const url =
    payload && typeof payload === 'object' && 'url' in payload && typeof payload.url === 'string'
      ? payload.url
      : null

  if (!response.ok || !url) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Der Zahlungsdienst hat mit Status ${response.status} geantwortet`
    throw new Error(message)
  }

  return url
}
