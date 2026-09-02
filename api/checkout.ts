import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

/**
 * Erzeugt eine Stripe-Checkout-Sitzung für den Warenkorb.
 *
 * Diese Funktion läuft auf dem Server, nicht im Browser – nur so bleibt der
 * geheime Stripe-Schlüssel geheim. Ebenso wichtig: Die Preise kommen NICHT
 * vom Client. Der Browser schickt nur, welche Artikel in welcher Menge
 * gewünscht sind; welcher Betrag dazugehört, entscheidet allein diese Tabelle.
 * Sonst könnte jede Person im Browser den Preis auf null setzen.
 */
/*
 * ACHTUNG BEI PREISÄNDERUNGEN: Der Betrag steht doppelt – in
 * src/data/catalog.ts für die Anzeige und in Stripe für die Abrechnung.
 * Stripe-Preise sind unveränderlich; ein neuer Preis heisst also immer auch
 * eine neue Id hier. Der Kommentar hinter jeder Zeile nennt den Betrag, der
 * in Stripe hinterlegt ist – er muss mit dem Katalog übereinstimmen.
 */
const PRICE_IDS: Record<string, string> = {
  // Einzelne Netze
  'einzel:bad': 'price_1UBA0cLaNnyxPcSBaqEOpmwg', // CHF 130
  'einzel:kueche': 'price_1UBA0gLaNnyxPcSBzjtArAdn', // CHF 130
  'einzel:zimmer': 'price_1UBA0mLaNnyxPcSBZpLjthwI', // CHF 150
  'einzel:balkontuer': 'price_1UBA0rLaNnyxPcSBYnBhmmzK', // CHF 155
  // Sets
  'set:set-mittel': 'price_1UBA0vLaNnyxPcSBg1u40DeA', // CHF 775
  'set:set-gross': 'price_1UBA11LaNnyxPcSBT02jUGxf', // CHF 850
}

/** Montage kostet 15 Franken pro Fenster und hat kein eigenes Stripe-Produkt. */
const MONTAGE_RAPPEN = 1500

const MAX_QUANTITY = 99
const MAX_LINES = 20

interface IncomingLine {
  kind: unknown
  refId: unknown
  quantity: unknown
}

function badRequest(response: VercelResponse, message: string) {
  return response.status(400).json({ error: message })
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Nur POST' })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    console.error(
      'STRIPE_SECRET_KEY ist nicht gesetzt. Ohne den Schlüssel kann keine Zahlung gestartet werden. ' +
        'In den Umgebungsvariablen des Hostings eintragen – als sensitive Variable, NICHT mit VITE_-Präfix.',
    )
    return response.status(500).json({ error: 'Die Onlinezahlung ist auf dieser Seite noch nicht eingerichtet' })
  }

  const body = (typeof request.body === 'string' ? JSON.parse(request.body) : request.body) ?? {}
  const lines: IncomingLine[] = Array.isArray(body.lines) ? body.lines : []
  const montageNets = Number(body.montageNets ?? 0)
  const email = typeof body.email === 'string' ? body.email.slice(0, 200) : undefined
  const reference = typeof body.reference === 'string' ? body.reference.slice(0, 40) : ''

  if (lines.length === 0 || lines.length > MAX_LINES) {
    return badRequest(response, 'Ungültiger Warenkorb')
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

  for (const line of lines) {
    const key = `${line.kind}:${line.refId}`
    const price = PRICE_IDS[key]
    const quantity = Number(line.quantity)

    if (!price) return badRequest(response, `Unbekannter Artikel: ${key}`)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return badRequest(response, 'Ungültige Menge')
    }

    lineItems.push({ price, quantity })
  }

  if (Number.isInteger(montageNets) && montageNets > 0) {
    if (montageNets > MAX_QUANTITY * MAX_LINES) return badRequest(response, 'Ungültige Anzahl Montagen')
    lineItems.push({
      quantity: montageNets,
      price_data: {
        currency: 'chf',
        unit_amount: MONTAGE_RAPPEN,
        tax_behavior: 'inclusive',
        product_data: {
          name: 'Montage durch uns',
          description: 'Wir montieren das Netz bei Ihnen – pro Fenster.',
        },
      },
    })
  }

  const origin =
    (typeof request.headers.origin === 'string' && request.headers.origin) ||
    (request.headers.host ? `https://${request.headers.host}` : '')

  try {
    const stripe = new Stripe(secretKey)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      locale: 'de',
      customer_email: email,
      client_reference_id: reference || undefined,
      metadata: { referenz: reference },
      success_url: `${origin}/?zahlung=ok&ref=${encodeURIComponent(reference)}`,
      cancel_url: `${origin}/?zahlung=abbruch`,
    })

    if (!session.url) throw new Error('Stripe hat keine Weiterleitung zurückgegeben')
    return response.status(200).json({ url: session.url })
  } catch (error) {
    console.error('Stripe-Checkout fehlgeschlagen:', error)
    return response.status(502).json({ error: 'Die Zahlung konnte nicht gestartet werden' })
  }
}
