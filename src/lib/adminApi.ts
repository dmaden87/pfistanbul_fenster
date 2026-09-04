import type { AdminStatus, Bestellung, BestellStatus } from '../types'

/**
 * Zugriff auf den Adminbereich. Alles läuft über /api/bestellungen; das
 * Passwort wird dort auf dem Server geprüft und die Sitzung steckt danach in
 * einem HttpOnly-Cookie, an das der Seitencode nicht herankommt.
 *
 * `credentials: 'same-origin'` ist hier keine Zierde: Ohne das schickt der
 * Browser den Cookie nicht mit, und jede Abfrage käme als "nicht angemeldet"
 * zurück.
 */

const PFAD = '/api/bestellungen'

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

export async function adminStatus(): Promise<AdminStatus> {
  return antwort<AdminStatus>(await fetch(`${PFAD}?aktion=status`, { credentials: 'same-origin' }))
}

export async function anmelden(passwort: string): Promise<void> {
  await antwort(
    await fetch(`${PFAD}?aktion=anmelden`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ passwort }),
    }),
  )
}

export async function abmelden(): Promise<void> {
  await antwort(await fetch(`${PFAD}?aktion=abmelden`, { method: 'POST', credentials: 'same-origin' }))
}

export async function ladeBestellungen(): Promise<Bestellung[]> {
  const daten = await antwort<{ bestellungen: Bestellung[] }>(
    await fetch(PFAD, { credentials: 'same-origin', cache: 'no-store' }),
  )
  return daten.bestellungen
}

/** Entfernt den Eintrag endgültig – im Gegensatz zum Status "geloescht". */
export async function entferneBestellung(id: string): Promise<void> {
  await antwort(
    await fetch(PFAD, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id }),
    }),
  )
}

export async function setzeStatus(id: string, status: BestellStatus): Promise<Bestellung> {
  const daten = await antwort<{ bestellung: Bestellung }>(
    await fetch(PFAD, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ id, status }),
    }),
  )
  return daten.bestellung
}
