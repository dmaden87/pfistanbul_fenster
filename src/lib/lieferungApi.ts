import type { Lieferung } from '../types'

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

export async function lieferungAendern(
  id: string,
  aenderung: Partial<Omit<Lieferung, 'id' | 'nummer' | 'erstellt' | 'geaendert'>>,
): Promise<{ lieferung: Lieferung; mitgezogen: number }> {
  return antwort<{ lieferung: Lieferung; mitgezogen: number }>(
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
