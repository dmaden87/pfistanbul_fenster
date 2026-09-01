import type { CartLine, CustomRequestLine, CustomerDetails, SubmissionKind } from '../types'
import { buildById, meshById, sizeById } from '../data/catalog'
import { cartTotals, customPrice, priceForLine } from './pricing'
import { formatChf, formatSize } from './format'

const endpoint = import.meta.env.VITE_ORDER_ENDPOINT?.trim()
const accessKey = import.meta.env.VITE_ORDER_ACCESS_KEY?.trim()

/** True, wenn der Versand nur simuliert wird (Demo- oder Entwicklungsmodus). */
export const isDemoMode = !endpoint || endpoint === 'demo'

/** True, wenn gar kein Formulardienst konfiguriert ist. */
export const isUnconfigured = !endpoint

/** Kurze, fuer Menschen lesbare Referenz, damit Kunde und Betreiber dieselbe Bestellung meinen. */
export function makeReference(kind: SubmissionKind, seed: number): string {
  const prefix = kind === 'bestellung' ? 'PF' : 'PA'
  return `${prefix}-${seed.toString(36).toUpperCase().slice(-6).padStart(6, '0')}`
}

function customerBlock(customer: CustomerDetails): string {
  return [
    `Name:      ${customer.name}`,
    `E-Mail:    ${customer.email}`,
    `Telefon:   ${customer.phone || '-'}`,
    `Adresse:   ${customer.street}, ${customer.zip} ${customer.city}`,
    customer.notes ? `Bemerkung: ${customer.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function orderBody(lines: CartLine[], customer: CustomerDetails, reference: string): string {
  const totals = cartTotals(lines)
  const rows = lines.map((line) => {
    const build = buildById(line.buildId)
    const size = sizeById(line.sizeId)
    const mesh = meshById(line.meshId)
    const label = `${build?.name ?? line.buildId} – ${size?.label ?? line.sizeId}`
    const measures = size ? formatSize(size.widthCm, size.heightCm) : ''
    return `${line.quantity}× ${label} (${measures}, ${mesh?.name ?? line.meshId}) — ${formatChf(priceForLine(line))}`
  })

  return [
    `BESTELLUNG ${reference}`,
    '',
    customerBlock(customer),
    '',
    'Positionen:',
    ...rows.map((row) => `  ${row}`),
    '',
    `Zwischentotal: ${formatChf(totals.subtotalChf)}`,
    totals.discountChf > 0
      ? `Rabatt:        -${formatChf(totals.discountChf)}${totals.discountLabel ? ` (${totals.discountLabel})` : ''}`
      : null,
    `Lieferung:     ${totals.shippingChf === 0 ? 'kostenlos' : formatChf(totals.shippingChf)}`,
    `Total:         ${formatChf(totals.totalChf)}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function requestBody(items: CustomRequestLine[], customer: CustomerDetails, reference: string): string {
  const rows = items.map((item, index) => {
    const build = buildById(item.buildId)
    const mesh = meshById(item.meshId)
    const width = Number(item.widthCm)
    const height = Number(item.heightCm)
    const estimate =
      Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
        ? formatChf(customPrice(width, height, item.buildId, item.meshId))
        : null
    return [
      `  Position ${index + 1}:`,
      `    Bauart:    ${build?.name ?? item.buildId}`,
      `    Gewebe:    ${mesh?.name ?? item.meshId}`,
      `    Masse:     ${item.widthCm || '?'} × ${item.heightCm || '?'} cm`,
      `    Anzahl:    ${item.quantity || '1'}`,
      item.room ? `    Raum:      ${item.room}` : null,
      estimate ? `    Richtwert: ${estimate} pro Stück (Formel, nicht geprüft)` : null,
    ]
      .filter(Boolean)
      .join('\n')
  })

  return [
    `BESTELLANFRAGE (Sonderanfertigung) ${reference}`,
    '',
    customerBlock(customer),
    '',
    'Gewuenschte Elemente:',
    ...rows,
    '',
    'Bitte Offerte erstellen und dem Kunden zustellen.',
  ].join('\n')
}

export interface SubmitPayload {
  kind: SubmissionKind
  customer: CustomerDetails
  lines?: CartLine[]
  items?: CustomRequestLine[]
  reference: string
}

/**
 * Schickt Bestellung oder Anfrage an den konfigurierten Formulardienst.
 * Der Dienst kennt die Empfaengeradresse; der Browser kennt sie nie.
 */
export async function submitToOperator(payload: SubmitPayload): Promise<void> {
  const { kind, customer, lines = [], items = [], reference } = payload

  const subject =
    kind === 'bestellung'
      ? `Neue Bestellung ${reference} – ${customer.name}`
      : `Neue Anfrage Sonderanfertigung ${reference} – ${customer.name}`

  const message = kind === 'bestellung' ? orderBody(lines, customer, reference) : requestBody(items, customer, reference)

  if (isDemoMode) {
    // Ohne konfigurierten Dienst wird nichts verschickt - der Ablauf laesst sich
    // trotzdem vollstaendig durchklicken.
    console.info(`[Demo-Modus] ${subject}\n\n${message}`)
    await new Promise((resolve) => setTimeout(resolve, 700))
    return
  }

  const body: Record<string, string> = {
    subject,
    from_name: 'Pfistanbul Fenster – Webshop',
    replyto: customer.email,
    name: customer.name,
    email: customer.email,
    message,
  }
  if (accessKey) body.access_key = accessKey

  const response = await fetch(endpoint as string, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Der Formulardienst hat mit Status ${response.status} geantwortet.`)
  }
}
