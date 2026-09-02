import type { CartLine, CustomRequestLine, CustomerDetails, PaymentMethod, SubmissionKind } from '../types'
import { netsInSet, setById, typeById } from '../data/catalog'
import { cartTotals, priceForLine } from './pricing'
import { estimateCustomRequest } from './estimate'
import { formatChf, formatSize } from './format'

const endpoint = import.meta.env.VITE_ORDER_ENDPOINT?.trim()
const accessKey = import.meta.env.VITE_ORDER_ACCESS_KEY?.trim()

/**
 * Demo-Modus nur bei ausdrücklichem VITE_ORDER_ENDPOINT=demo.
 * Eine fehlende Konfiguration darf NICHT stillschweigend simulieren: sonst
 * bestätigt eine live geschaltete Seite Bestellungen, die nie jemand erhält.
 */
export const isDemoMode = endpoint === 'demo'

/** True, wenn gar kein Formulardienst konfiguriert ist. */
export const isUnconfigured = !endpoint

/** Kurze, fuer Menschen lesbare Referenz, damit Kunde und Betreiber dieselbe Bestellung meinen. */
export function makeReference(kind: SubmissionKind, seed: number): string {
  const prefix = kind === 'bestellung' ? 'PF' : kind === 'zahlung' ? 'PZ' : 'PA'
  return `${prefix}-${seed.toString(36).toUpperCase().slice(-6).padStart(6, '0')}`
}

function customerBlock(customer: CustomerDetails): string {
  // Anfrageformulare erfassen keine Adresse. Dann soll auch keine leere
  // Zeile "Adresse:   ,  " in der Mail stehen.
  const address = [customer.street, [customer.zip, customer.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')

  return [
    `Name:      ${customer.name}`,
    `E-Mail:    ${customer.email}`,
    `Telefon:   ${customer.phone || '-'}`,
    address ? `Adresse:   ${address}` : null,
    customer.notes ? `Bemerkung: ${customer.notes}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

function orderBody(
  lines: CartLine[],
  customer: CustomerDetails,
  reference: string,
  montage: boolean,
  payment: PaymentMethod,
  flexiblePayment: boolean,
): string {
  const totals = cartTotals(lines, montage)
  const rows = lines.map((line) => {
    if (line.kind === 'set') {
      const set = setById(line.refId)
      const contents = set
        ? set.items
            .map((item) => `${item.count}× ${typeById(item.typeId)?.label ?? item.typeId}`)
            .join(', ')
        : ''
      return `${line.quantity}× ${set?.label ?? line.refId} (${netsInSet(set!)} Netze: ${contents}) — ${formatChf(priceForLine(line))}`
    }
    const type = typeById(line.refId)
    const measures = type ? formatSize(type.widthCm, type.heightCm) : ''
    return `${line.quantity}× ${type?.label ?? line.refId} (${measures}) — ${formatChf(priceForLine(line))}`
  })

  return [
    flexiblePayment ? `BESTELLANFRAGE MIT ZAHLUNGSWUNSCH ${reference}` : `BESTELLUNG ${reference}`,
    '',
    customerBlock(customer),
    '',
    'Positionen:',
    ...rows.map((row) => `  ${row}`),
    '',
    `Netze (${totals.netCount}): ${formatChf(totals.netsChf)}`,
    totals.savingsChf > 0 ? `Im Set gespart:  ${formatChf(totals.savingsChf)}` : null,
    montage ? `Montage:         ${formatChf(totals.montageChf)} (${totals.netCount} Fenster)` : 'Montage:         nein, Selbstmontage',
    `Lieferung:       ${totals.shippingChf === 0 ? 'kostenlos' : formatChf(totals.shippingChf)}`,
    `Total:           ${formatChf(totals.totalChf)}`,
    '',
    flexiblePayment
      ? 'Zahlung: KUNDE WUENSCHT EINE INDIVIDUELLE ZAHLUNGSLOESUNG.\n' +
        '         Das ist eine Anfrage, keine verbindliche Bestellung. Bitte persoenlich melden\n' +
        '         und gemeinsam abmachen, wie bezahlt wird.'
      : payment === 'online'
        ? 'Zahlung: online über Stripe. Bitte im Stripe-Konto prüfen, ob der Betrag eingegangen ist – die Bestellung wird auch dann gemeldet, wenn die Zahlung abgebrochen wurde.'
        : 'Zahlung: bei der Übergabe, bar oder mit TWINT.',
  ]
    // Nur null herausfiltern: filter(Boolean) wuerde auch die Leerzeilen
    // schlucken, die die Mail ueberhaupt erst lesbar machen.
    .filter((line) => line !== null)
    .join('\n')
}

function requestBody(items: CustomRequestLine[], customer: CustomerDetails, reference: string): string {
  const estimate = estimateCustomRequest(items)
  const rows = items.map((item, index) => {
    const line = estimate?.lines.find((entry) => entry.id === item.id)
    return [
      `  Position ${index + 1}:`,
      `    Masse:  ${item.widthCm || '?'} × ${item.heightCm || '?'} cm`,
      `    Anzahl: ${item.quantity || '1'}`,
      item.room ? `    Raum:   ${item.room}` : null,
      line ? `    Richtpreis: ${formatChf(line.perNetChf)} pro Netz` : null,
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
    // Der Kunde hat diese Zahl auf der Seite gesehen. Sie gehoert in die Mail,
    // damit die Offerte nicht unerwartet darueber liegt.
    estimate
      ? `Angezeigter Richtpreis: ${formatChf(estimate.totalChf)} fuer ${estimate.netCount} Netze (geschaetzt, nicht verbindlich).`
      : 'Kein Richtpreis angezeigt (Angaben unvollstaendig).',
    '',
    'Bitte Offerte erstellen und dem Kunden zustellen.',
  ].join('\n')
}

function paymentHelpBody(customer: CustomerDetails, reference: string): string {
  return [
    `ANFRAGE INDIVIDUELLE ZAHLUNGSLOESUNG ${reference}`,
    '',
    customerBlock(customer),
    '',
    'Diese Person moechte besprechen, wie sie bezahlen kann (Raten, spaeterer Termin,',
    'Teilzahlung). Es liegt keine Bestellung vor. Bitte persoenlich melden.',
  ].join('\n')
}

export interface SubmitPayload {
  kind: SubmissionKind
  customer: CustomerDetails
  lines?: CartLine[]
  items?: CustomRequestLine[]
  reference: string
  montage?: boolean
  payment?: PaymentMethod
  /** Kunde hat im Checkout um eine individuelle Zahlungsloesung gebeten. */
  flexiblePayment?: boolean
}

/**
 * Schickt Bestellung oder Anfrage an den konfigurierten Formulardienst.
 * Der Dienst kennt die Empfaengeradresse; der Browser kennt sie nie.
 */
export async function submitToOperator(payload: SubmitPayload): Promise<void> {
  const {
    kind,
    customer,
    lines = [],
    items = [],
    reference,
    montage = false,
    payment = 'uebergabe',
    flexiblePayment = false,
  } = payload

  const subject =
    kind === 'bestellung'
      ? flexiblePayment
        ? `Bestellanfrage mit Zahlungswunsch ${reference} – ${customer.name}`
        : `Neue Bestellung ${reference} – ${customer.name}`
      : kind === 'zahlung'
        ? `Anfrage Zahlungslösung ${reference} – ${customer.name}`
        : `Neue Anfrage Sonderanfertigung ${reference} – ${customer.name}`

  const message =
    kind === 'bestellung'
      ? orderBody(lines, customer, reference, montage, payment, flexiblePayment)
      : kind === 'zahlung'
        ? paymentHelpBody(customer, reference)
        : requestBody(items, customer, reference)

  if (isDemoMode) {
    // Ausdrücklich gewünschte Simulation: nichts wird verschickt, der Ablauf
    // lässt sich trotzdem vollständig durchklicken.
    console.info(`[Demo-Modus] ${subject}\n\n${message}`)
    await new Promise((resolve) => setTimeout(resolve, 700))
    return
  }

  if (isUnconfigured) {
    console.error(
      'VITE_ORDER_ENDPOINT ist nicht gesetzt. Ohne Formulardienst kann keine Bestellung zugestellt werden. ' +
        'In den Umgebungsvariablen des Hostings eintragen (siehe .env.example) oder für einen reinen Klicktest ' +
        'VITE_ORDER_ENDPOINT=demo setzen.',
    )
    throw new Error('Der Bestellversand ist auf dieser Seite noch nicht eingerichtet')
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
