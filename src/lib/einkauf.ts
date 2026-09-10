import type { Bestellung } from '../types'
import { montageBetrag } from '../components/admin/hilfen'

/**
 * Was eine einzelne Bestellung eingebracht hat.
 *
 * Die Aufteilung der Runde auf ihre Bestellungen steht bewusst NICHT hier,
 * sondern in `api/_einkauf.ts`: Sie geschieht dort, wo geschrieben wird.
 * Die Oberflaeche rechnet nichts nach – sie liest, was der Server auf die
 * Bestellung geschrieben hat. (Und api/ darf nicht aus src/ importieren,
 * siehe den Kommentar dort.)
 */

function runde2(x: number): number {
  return Math.round(x * 100) / 100
}

/** Was von einer Bestellung uebrig bleibt, wenn Einkauf und Fracht ab sind. */
export interface BestellMarge {
  /** Summe der Einkaufspreise aller Positionen. */
  einkaufChf: number
  lieferkostenChf: number
  /** Verkauf OHNE Montage – die ist unsere Arbeit, nicht Ware. */
  warenerloesChf: number
  margeChf: number
  margeProzent: number | null
  /**
   * Ob der Datensatz vollstaendig ist: jede Position mit Einkaufspreis. Ohne
   * das ist die Marge zu gut, denn es fehlen Kosten – nicht Erloese.
   */
  vollstaendig: boolean
  /** Wie viele Positionen noch keinen Einkaufspreis tragen. */
  ohnePreis: number
}

export function margeFuer(b: Bestellung): BestellMarge {
  let einkaufChf = 0
  let ohnePreis = 0
  for (const p of b.positionen) {
    if (typeof p.einkaufChf === 'number') einkaufChf += p.einkaufChf * p.menge
    else ohnePreis += 1
  }
  einkaufChf = runde2(einkaufChf)
  const lieferkostenChf = b.lieferkostenChf ?? 0
  const warenerloesChf = runde2(b.summeChf - montageBetrag(b))
  const margeChf = runde2(warenerloesChf - einkaufChf - lieferkostenChf)
  return {
    einkaufChf,
    lieferkostenChf,
    warenerloesChf,
    margeChf,
    margeProzent: warenerloesChf > 0 ? Math.round((margeChf / warenerloesChf) * 1000) / 10 : null,
    vollstaendig: ohnePreis === 0 && b.positionen.length > 0,
    ohnePreis,
  }
}
