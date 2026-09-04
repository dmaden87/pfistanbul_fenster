import type { BestellArt, BestellPosition, CartLine, CustomRequestLine, CustomerDetails, PaymentMethod } from '../types'
import { netsInSet, setById, typeById } from '../data/catalog'
import { cartTotals, priceForLine } from './pricing'
import { estimateCustomRequest } from './estimate'
import { formatSize } from './format'

/**
 * Legt die Bestellung im Adminbereich ab.
 *
 * Gespeichert wird genau das, was die Kundin auf der Seite gesehen hat –
 * Positionen, Mengen und Beträge. Für die Abwicklung zählt das und nicht eine
 * Neuberechnung; was tatsächlich abgebucht wird, entscheidet ohnehin allein
 * die Preistabelle in api/checkout.ts.
 */

interface Eingang {
  art: BestellArt
  referenz: string
  customer: CustomerDetails
  lines?: CartLine[]
  items?: CustomRequestLine[]
  montage?: boolean
  payment?: PaymentMethod
  zahlungswunsch?: boolean
}

function positionenAusWarenkorb(lines: CartLine[]): BestellPosition[] {
  return lines.map((line) => {
    if (line.kind === 'set') {
      const set = setById(line.refId)
      const inhalt = set
        ? set.items.map((i) => `${i.count}× ${typeById(i.typeId)?.label ?? i.typeId}`).join(', ')
        : ''
      return {
        menge: line.quantity,
        bezeichnung: set?.label ?? line.refId,
        detail: set ? `${netsInSet(set)} Netze: ${inhalt}` : '',
        preisChf: priceForLine(line),
      }
    }
    const typ = typeById(line.refId)
    return {
      menge: line.quantity,
      bezeichnung: typ?.label ?? line.refId,
      detail: typ ? formatSize(typ.widthCm, typ.heightCm) : '',
      preisChf: priceForLine(line),
    }
  })
}

function positionenAusAnfrage(items: CustomRequestLine[]): BestellPosition[] {
  const schaetzung = estimateCustomRequest(items)
  return items.map((item) => {
    const zeile = schaetzung?.lines.find((l) => l.id === item.id)
    return {
      menge: Number(item.quantity) || 1,
      bezeichnung: item.room ? `Sondermass ${item.room}` : 'Sondermass',
      detail: `${item.widthCm || '?'} × ${item.heightCm || '?'} cm`,
      preisChf: zeile?.perNetChf ?? 0,
    }
  })
}

/**
 * Schickt die Bestellung an den Server. Wirft, wenn das nicht klappt – die
 * aufrufende Stelle entscheidet dann, ob sie stattdessen eine Mail schickt.
 */
export async function speichereBestellung(eingang: Eingang): Promise<void> {
  const { art, referenz, customer, lines = [], items = [], montage = false, payment = 'uebergabe' } = eingang

  const positionen =
    art === 'bestellung' ? positionenAusWarenkorb(lines) : art === 'anfrage' ? positionenAusAnfrage(items) : []

  const summeChf =
    art === 'bestellung'
      ? cartTotals(lines, montage).totalChf
      : positionen.reduce((summe, p) => summe + p.preisChf * p.menge, 0)

  const antwort = await fetch('/api/bestellungen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      art,
      referenz,
      kunde: {
        name: customer.name,
        email: customer.email,
        telefon: customer.phone,
        strasse: customer.street,
        plz: customer.zip,
        ort: customer.city,
        bemerkung: customer.notes,
      },
      positionen,
      montage,
      zahlung: payment,
      zahlungswunsch: eingang.zahlungswunsch === true,
      summeChf,
    }),
  })

  if (!antwort.ok) {
    const daten = await antwort.json().catch(() => null)
    const meldung =
      daten && typeof daten === 'object' && 'error' in daten && typeof daten.error === 'string'
        ? daten.error
        : `Status ${antwort.status}`
    throw new Error(meldung)
  }
}
