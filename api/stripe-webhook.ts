import type { IncomingMessage, ServerResponse } from 'node:http'
import Stripe from 'stripe'
/*
 * Die Endung .js gehoert hier hin, obwohl die Datei .ts heisst - siehe die
 * ausfuehrliche Begruendung in bestellungen.ts.
 */
import { hGetAll, hSet, TABELLE_BESTELLUNGEN } from './_speicher.js'

/**
 * Stripe meldet hier, was aus einer Zahlung geworden ist.
 *
 * Warum es das ueberhaupt braucht: Die Bestellung liegt schon im
 * Adminbereich, BEVOR die Kundin zu Stripe weitergeleitet wird (siehe
 * OrderForm.tsx - erst speichern, dann bezahlen). Das ist Absicht, sonst
 * ginge eine Bestellung verloren, sobald jemand die Zahlung abbricht. Die
 * Kehrseite: Aus der gespeicherten Bestellung allein laesst sich nicht
 * ablesen, ob wirklich Geld geflossen ist. "Zahlungsart online" heisst nur,
 * dass die Kundin diesen Weg gewaehlt hat.
 *
 * Auf die Rueckleitung nach /?zahlung=ok ist dabei kein Verlass: Sie
 * passiert im Browser, laesst sich von Hand aufrufen und bleibt aus, wenn
 * jemand nach der Zahlung das Fenster schliesst. Verbindlich ist allein
 * dieses Ereignis, denn es kommt von Stripe und traegt eine Signatur.
 */

/**
 * Ohne die Helfer von Vercel. Die lesen sonst den Koerper der Anfrage aus und
 * geben ihn als fertig geparstes Objekt weiter - fuer die Signaturpruefung
 * brauchen wir aber exakt die Bytes, die Stripe unterschrieben hat. Schon ein
 * anders gesetztes Leerzeichen nach dem erneuten Serialisieren wuerde die
 * Pruefung scheitern lassen. Deshalb arbeitet diese Funktion mit den nackten
 * Node-Typen und schreibt ihre Antworten selbst.
 */
export const config = { helpers: false }

/** Grosszuegig fuer ein Ereignis, aber keine offene Tuer. */
const MAX_BYTES = 1024 * 256

/** Was wir uns zu einer Zahlung merken. Haengt an der Bestellung. */
interface Bezahlung {
  status: 'bezahlt' | 'abgebrochen'
  betragChf: number
  zeitpunkt: string
  sitzung: string
}

function antwort(res: ServerResponse, code: number, daten: Record<string, unknown>) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(daten))
}

/** Liest die Anfrage Byte fuer Byte ein, ohne sie zu deuten. */
async function rohkoerper(req: IncomingMessage): Promise<Buffer> {
  const teile: Buffer[] = []
  let groesse = 0
  for await (const stueck of req) {
    // Ohne setEncoding liefert der Strom immer Buffer; der Zweig ist blosse Vorsicht.
    const puffer = Buffer.isBuffer(stueck) ? stueck : Buffer.from(stueck as Uint8Array)
    groesse += puffer.length
    if (groesse > MAX_BYTES) throw new Error('Der Koerper der Anfrage ist zu gross.')
    teile.push(puffer)
  }
  return Buffer.concat(teile)
}

/**
 * Sucht die Bestellung zur Referenz. Gespeichert wird nach interner Id, die
 * Referenz ist das, was Kundin und Stripe gemeinsam haben - also einmal durch
 * die Tabelle. Bei unseren Stueckzahlen ist das billiger als ein zweiter
 * Index, der auseinanderlaufen koennte.
 */
async function findeBestellung(referenz: string) {
  const alle = await hGetAll(TABELLE_BESTELLUNGEN)
  for (const [id, wert] of Object.entries(alle)) {
    try {
      const bestellung = JSON.parse(wert) as Record<string, unknown> & { referenz?: string }
      if (bestellung.referenz === referenz) return { id, bestellung }
    } catch {
      // Eine kaputte Zeile darf die Suche nicht abbrechen.
    }
  }
  return null
}

/**
 * Schreibt den Zahlungsstand an die Bestellung.
 *
 * Zweimal dasselbe Ereignis zu verarbeiten ist ungefaehrlich - Stripe
 * wiederholt Zustellungen, und das Ergebnis ist beide Male dasselbe. Nur eine
 * bereits bezahlte Bestellung darf ein spaeteres "abgelaufen" nicht mehr
 * umstossen.
 */
async function vermerke(referenz: string, bezahlung: Bezahlung): Promise<boolean> {
  const treffer = await findeBestellung(referenz)
  if (!treffer) return false

  const vorher = treffer.bestellung.bezahlung as Bezahlung | undefined
  if (vorher?.status === 'bezahlt' && bezahlung.status !== 'bezahlt') return true

  treffer.bestellung.bezahlung = bezahlung
  treffer.bestellung.geaendert = new Date().toISOString()
  await hSet(TABELLE_BESTELLUNGEN, treffer.id, JSON.stringify(treffer.bestellung))
  return true
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return antwort(res, 405, { error: 'Nur POST' })
  }

  const geheimnis = process.env.STRIPE_WEBHOOK_SECRET
  const schluessel = process.env.STRIPE_SECRET_KEY
  if (!geheimnis || !schluessel) {
    console.error(
      'STRIPE_WEBHOOK_SECRET oder STRIPE_SECRET_KEY fehlt. Ohne beides kann kein Zahlungseingang ' +
        'bestaetigt werden. In Vercel als sensitive Environment Variable eintragen, nicht mit VITE_-Praefix.',
    )
    // 503 und nicht 200: Stripe wiederholt die Zustellung dann spaeter, und
    // das Ereignis geht nicht verloren, waehrend die Variable noch fehlt.
    return antwort(res, 503, { error: 'Der Zahlungsabgleich ist noch nicht eingerichtet.' })
  }

  const signatur = req.headers['stripe-signature']
  if (typeof signatur !== 'string') {
    return antwort(res, 400, { error: 'Signatur fehlt.' })
  }

  let koerper: Buffer
  try {
    koerper = await rohkoerper(req)
  } catch (fehler) {
    console.error('Webhook-Koerper nicht lesbar:', fehler)
    return antwort(res, 400, { error: 'Anfrage nicht lesbar.' })
  }

  const stripe = new Stripe(schluessel)
  let ereignis: Stripe.Event
  try {
    ereignis = await stripe.webhooks.constructEventAsync(koerper, signatur, geheimnis)
  } catch (fehler) {
    /*
     * Hier landet auch der Fall, dass der Koerper leer ankommt, weil die
     * Helfer von Vercel ihn doch vorab gelesen haben. Deshalb steht die
     * Laenge im Log - sie unterscheidet "jemand faelscht Ereignisse" von
     * "config.helpers greift nicht".
     */
    console.error(`Stripe-Signatur ungueltig (${koerper.length} Bytes empfangen):`, fehler)
    return antwort(res, 400, { error: 'Signatur ungueltig.' })
  }

  if (
    ereignis.type !== 'checkout.session.completed' &&
    ereignis.type !== 'checkout.session.async_payment_succeeded' &&
    ereignis.type !== 'checkout.session.expired'
  ) {
    // Alles andere quittieren wir freundlich, statt Stripe wiederholen zu
    // lassen, was uns nicht interessiert.
    return antwort(res, 200, { ok: true, ignoriert: ereignis.type })
  }

  const sitzung = ereignis.data.object as Stripe.Checkout.Session
  const referenz = sitzung.client_reference_id ?? sitzung.metadata?.referenz ?? ''
  const betragChf = (sitzung.amount_total ?? 0) / 100

  if (!referenz) {
    console.error(
      `Zahlung ohne Referenz (${ereignis.type}, Sitzung ${sitzung.id}, ${betragChf} CHF). ` +
        'Bitte im Stripe-Konto von Hand zuordnen.',
    )
    return antwort(res, 200, { ok: true, hinweis: 'ohne Referenz' })
  }

  const bezahlt = ereignis.type !== 'checkout.session.expired' && sitzung.payment_status === 'paid'
  const bezahlung: Bezahlung = {
    status: bezahlt ? 'bezahlt' : 'abgebrochen',
    betragChf,
    zeitpunkt: new Date(ereignis.created * 1000).toISOString(),
    sitzung: sitzung.id,
  }

  try {
    const gefunden = await vermerke(referenz, bezahlung)
    if (!gefunden) {
      /*
       * Sollte nicht vorkommen, weil die Bestellung vor der Weiterleitung
       * gespeichert wird. Wenn doch, liegt sie als Mail vor - deshalb hier
       * nur laut protokollieren und Stripe nicht endlos wiederholen lassen.
       */
      console.error(
        `Keine Bestellung zur Referenz ${referenz} gefunden (${ereignis.type}, ${betragChf} CHF, ` +
          `Sitzung ${sitzung.id}). Die Bestellmail pruefen.`,
      )
    }
    return antwort(res, 200, { ok: true, referenz, zugeordnet: gefunden })
  } catch (fehler) {
    console.error('Zahlungsstand konnte nicht gespeichert werden:', fehler)
    // 500: Stripe versucht es erneut, und der Vermerk holt sich nach.
    return antwort(res, 500, { error: 'Speichern fehlgeschlagen.' })
  }
}
