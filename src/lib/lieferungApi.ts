import type { AustrittsGrund, Lieferung } from '../types'

/**
 * Zugriff auf die Lieferrunden. Alles verlangt die Anmeldung; es gibt keinen
 * offenen Weg wie bei den Bestellungen.
 */

const PFAD = '/api/lieferungen'

async function antwort<T>(res: Response): Promise<T> {
  const daten = await res.json().catch(() => null)
  if (!res.ok) {
    const meldung =
      daten && typeof daten === 'object' && 'error' in daten && typeof daten.error === 'string'
        ? daten.error
        : `Der Server antwortete mit Status ${res.status}.`
    throw new Error(meldung)
  }
  return daten as T
}

export async function ladeLieferungen(): Promise<Lieferung[]> {
  const daten = await antwort<{ lieferungen: Lieferung[] }>(
    await fetch(PFAD, { credentials: 'same-origin', cache: 'no-store' }),
  )
  return daten.lieferungen
}

export async function lieferungAnlegen(bestellungIds: string[]): Promise<Lieferung> {
  const daten = await antwort<{ lieferung: Lieferung }>(
    await fetch(PFAD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ bestellungIds }),
    }),
  )
  return daten.lieferung
}

/**
 * Was sich an einer Runde aendern laesst.
 *
 * `entfernen` ist kein Feld der Runde, sondern eine Anweisung: Nimm diese
 * Bestellung heraus und stelle sie zurueck. Sie steht hier und nicht in
 * zwei getrennten Aufrufen, weil ein Abbruch dazwischen eine Bestellung
 * zuruecklaesst, die in keiner Runde steckt und trotzdem auf sie wartet.
 */
export type LieferungAenderung = Partial<
  Omit<Lieferung, 'id' | 'nummer' | 'erstellt' | 'geaendert' | 'entfernt' | 'versandAm'>
> & {
  entfernen?: { bestellungId: string; grund: AustrittsGrund; notiz?: string }
  /**
   * Der Rundenklick mit Kaestchen: Welche Bestellungen bei diesem
   * Standwechsel mitgehen. Wer fehlt, bleibt zurueck – im Entwurf ohne
   * Spur, ab "bestellt" als Austritt "keine Zusage", bei "geliefert" als
   * fehlende Ware. Ohne das Feld gehen alle mit.
   */
  mitnehmen?: string[]
  /** true stempelt "unterwegs seit jetzt", false loescht. */
  versandAm?: boolean
}

/** Was der Server zurueckmeldet, wenn er von sich aus etwas getan hat. */
export interface LieferungAntwort {
  lieferung: Lieferung
  /** Wie viele Bestellungen Einkaufszahlen bekommen haben. */
  einkauf?: number
  /** Wer beim Rundenklick zurueckblieb. */
  zurueckgeblieben?: string[]
}

export async function lieferungAendern(id: string, aenderung: LieferungAenderung): Promise<LieferungAntwort> {
  return antwort<LieferungAntwort>(
    await fetch(PFAD, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id, ...aenderung }),
    }),
  )
}

export async function lieferungEntfernen(id: string): Promise<void> {
  await antwort(
    await fetch(PFAD, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id }),
    }),
  )
}
