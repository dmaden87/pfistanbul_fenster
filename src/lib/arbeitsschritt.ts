import type { Bestellung, Lieferung } from '../types'

/**
 * Wo eine Bestellung gerade wirklich steht.
 *
 * Die Uebersicht war konfus, weil sie nach Status gruppierte – und der Status
 * beantwortete zwei Fragen auf einmal: wo steht der Kunde, und wo steht die
 * Ware? Solange eine Preisanfrage bei Bora lief, stand die Bestellung
 * weiterhin unter "neu eingegangen", als haette niemand etwas getan.
 *
 * Hier laufen die beiden Spuren zusammen:
 *
 * - Die KUNDENSPUR steht in `bestellung.status` und wird von Hand gesetzt.
 * - Die LIEFERANTENSPUR steckt in der Runde und wird nie von Hand gesetzt.
 *   Stimmt sie nicht, korrigiert man die Runde – die Bestellung folgt.
 *
 * Das Ergebnis ist kein Status, sondern eine Aufgabe: was ist als Naechstes
 * zu tun, und wer ist dran. Deshalb gehoert zu jedem Schritt ein Block, und
 * zwei der Bloecke bedeuten "warten" und haben gar keinen Knopf.
 */
export type Arbeitsschritt =
  | 'neu'
  | 'anfrageLaeuft'
  | 'offerteRechnen'
  | 'offerteDraussen'
  | 'bereitZuBestellen'
  | 'beimLieferanten'
  | 'ausliefern'
  | 'zahlungOffen'
  | 'abgeschlossen'
  | 'abgesagt'

/** Wessen Problem der Schritt gerade ist. */
export type Block = 'beiDir' | 'beimLieferanten' | 'beimKunden' | 'archiv'

export const BLOCK_VON: Record<Arbeitsschritt, Block> = {
  neu: 'beiDir',
  offerteRechnen: 'beiDir',
  bereitZuBestellen: 'beiDir',
  ausliefern: 'beiDir',
  zahlungOffen: 'beiDir',
  anfrageLaeuft: 'beimLieferanten',
  beimLieferanten: 'beimLieferanten',
  offerteDraussen: 'beimKunden',
  abgeschlossen: 'archiv',
  abgesagt: 'archiv',
}

/** Die Reihenfolge der Abschnitte innerhalb eines Blocks. */
export const SCHRITTE: Arbeitsschritt[] = [
  'neu',
  'offerteRechnen',
  'bereitZuBestellen',
  'ausliefern',
  'zahlungOffen',
  'anfrageLaeuft',
  'beimLieferanten',
  'offerteDraussen',
  'abgeschlossen',
  'abgesagt',
]

/**
 * Wann bezahlt wurde.
 *
 * Zwei Quellen: der Haken bei der Uebergabe, und Stripe. Die Onlinezahlung
 * traegt sich selbst ein, lange bevor jemand die Bestellung anfasst – wer sie
 * hier nicht mitnimmt, laesst bezahlte Bestellungen unter "Zahlung offen"
 * stehen und ruft Leuten hinterher, die schon gezahlt haben.
 */
export function bezahltAm(b: Bestellung): string | undefined {
  if (b.bezahltAm) return b.bezahltAm
  return b.bezahlung?.status === 'bezahlt' ? b.bezahlung.zeitpunkt : undefined
}

/**
 * Die Runde, in der eine Bestellung gerade steckt.
 *
 * Bewusst abgeleitet und nicht als Feld auf der Bestellung: Eine Bestellung
 * ist immer ganz in genau einer Runde, und die Runde fuehrt ihre
 * `bestellungIds` ohnehin. Ein zweites Feld waere eine zweite Wahrheit, und
 * die geht irgendwann auseinander.
 *
 * Faellt eine Bestellung aus einer Runde und kommt spaeter in eine neue, gilt
 * die neuere – deshalb die Sortierung.
 */
export function rundeFuer(b: Bestellung, lieferungen: Lieferung[]): Lieferung | undefined {
  let neueste: Lieferung | undefined
  for (const l of lieferungen) {
    if (!l.bestellungIds.includes(b.id)) continue
    if (!neueste || l.erstellt > neueste.erstellt) neueste = l
  }
  return neueste
}

/**
 * Der Arbeitsschritt einer Bestellung.
 *
 * Die Reihenfolge der Pruefungen ist die Aussage: Was weiter hinten im Ablauf
 * steht, gewinnt. Eine uebergebene Bestellung ist uebergeben, auch wenn die
 * Runde noch auf "bestellt" steht – dann ist die Runde nicht nachgefuehrt,
 * und das darf die Ausliefer-Liste nicht verschmutzen.
 */
export function arbeitsschritt(b: Bestellung, runde?: Lieferung): Arbeitsschritt {
  if (b.status === 'abgesagt') return 'abgesagt'

  const bezahlt = bezahltAm(b)
  if (b.ausgeliefertAm && bezahlt) return 'abgeschlossen'
  if (b.ausgeliefertAm) return 'zahlungOffen'

  /*
   * Solange die Runde unterwegs ist, bestimmt sie. Ausnahme ist der Entwurf:
   * Eine Runde, die noch niemand abgeschickt hat, sagt nichts ueber die Ware
   * und darf deshalb keine Bestellung aus der Arbeitsliste nehmen – sonst
   * verschwindet sie, weil jemand ein Kaestchen angekreuzt hat.
   */
  if (runde) {
    if (runde.status === 'geliefert') return 'ausliefern'
    if (runde.status === 'bestellt') return 'beimLieferanten'
    if (runde.status === 'angefragt') return 'anfrageLaeuft'
    // Bei "Preise da" entscheidet die Kundenspur: offen heisst, die Offerte
    // ist noch zu rechnen.
    if (runde.status === 'preise' && b.status === 'neu') return 'offerteRechnen'
  }

  if (b.status === 'zugesagt') return 'bereitZuBestellen'
  if (b.status === 'offeriert') return 'offerteDraussen'
  return 'neu'
}

/** Der Schritt einer Bestellung, die Runde aus der Liste herausgesucht. */
export function schrittMit(b: Bestellung, lieferungen: Lieferung[]): Arbeitsschritt {
  return arbeitsschritt(b, rundeFuer(b, lieferungen))
}

/**
 * Alle Bestellungen nach Schritt sortiert, in der Reihenfolge von SCHRITTE.
 * Leere Schritte bleiben als leere Liste stehen, damit die Uebersicht ihre
 * Abschnitte kennt, ohne sie zweimal zu berechnen.
 */
export function nachSchritt(
  bestellungen: Bestellung[],
  lieferungen: Lieferung[],
): Map<Arbeitsschritt, Bestellung[]> {
  const gruppen = new Map<Arbeitsschritt, Bestellung[]>()
  for (const schritt of SCHRITTE) gruppen.set(schritt, [])
  for (const b of bestellungen) gruppen.get(schrittMit(b, lieferungen))!.push(b)
  return gruppen
}
