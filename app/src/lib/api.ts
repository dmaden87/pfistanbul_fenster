import type { BestellAenderung, Bestellung } from '@pf/types'

/**
 * Zugriff auf den Server von pfistanbul.ch – dieselben Endpunkte wie der
 * Adminbereich im Browser (src/lib/adminApi.ts), nur mit einem Schluessel im
 * Authorization-Kopf statt eines Cookies. Den Schluessel gibt der Server bei
 * der Anmeldung aus (api/_sitzung.ts, `appSchluessel`).
 *
 * Die Adresse laesst sich fuer Tests umstellen: EXPO_PUBLIC_API_BASIS.
 */
export const API_BASIS = process.env.EXPO_PUBLIC_API_BASIS ?? 'https://pfistanbul.ch'

/** Der Server sagt "nicht angemeldet" – der Schluessel ist abgelaufen oder ungueltig. */
export class NichtAngemeldet extends Error {
  constructor() {
    super('Die Anmeldung ist abgelaufen. Bitte neu anmelden.')
  }
}

async function antwort<T>(res: Response): Promise<T> {
  const daten: unknown = await res.json().catch(() => null)
  if (res.status === 401) throw new NichtAngemeldet()
  if (!res.ok) {
    const meldung =
      daten && typeof daten === 'object' && 'error' in daten && typeof daten.error === 'string'
        ? daten.error
        : `Der Server antwortete mit Status ${res.status}.`
    throw new Error(meldung)
  }
  return daten as T
}

/** Netzwerkfehler in einen Satz uebersetzen, den man unterwegs versteht. */
async function abrufen(pfad: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASIS}${pfad}`, init)
  } catch {
    throw new Error('Keine Verbindung zum Server. Ist das Handy online?')
  }
}

export interface Anmeldung {
  schluessel: string
  /** ISO-Zeitpunkt, bis zu dem der Schluessel gilt. */
  gueltigBis: string
}

export async function anmelden(passwort: string): Promise<Anmeldung> {
  const res = await abrufen('/api/bestellungen?aktion=anmelden', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passwort, app: true }),
  })
  // Hier heisst 401 "Passwort falsch", nicht "abgelaufen".
  if (res.status === 401) throw new Error('Das Passwort stimmt nicht.')
  const daten = await antwort<Partial<Anmeldung>>(res)
  if (!daten.schluessel || !daten.gueltigBis) {
    throw new Error('Der Server kennt die App-Anmeldung noch nicht. Ist die neue Fassung deployt?')
  }
  return { schluessel: daten.schluessel, gueltigBis: daten.gueltigBis }
}

export async function ladeBestellungen(schluessel: string): Promise<Bestellung[]> {
  const res = await abrufen('/api/bestellungen', {
    headers: { Authorization: `Bearer ${schluessel}` },
  })
  const daten = await antwort<{ bestellungen: Bestellung[] }>(res)
  return daten.bestellungen
}

/**
 * Aendert eine Bestellung – derselbe Weg wie der Web-Admin
 * (src/lib/adminApi.ts, `aendereBestellung`). Der Server nimmt nur, was in
 * `BestellAenderung` steht, prueft es und gibt den neuen Stand zurueck.
 */
export async function aendereBestellung(schluessel: string, id: string, aenderung: BestellAenderung): Promise<Bestellung> {
  const res = await abrufen('/api/bestellungen', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${schluessel}` },
    body: JSON.stringify({ id, ...aenderung }),
  })
  const daten = await antwort<{ bestellung: Bestellung }>(res)
  return daten.bestellung
}

/**
 * Das Geheimnis fuer den Offerte-Link (pfistanbul.ch/offerte/<geheim>). Der
 * Server legt es beim ersten Mal an und gibt danach immer dasselbe zurueck.
 */
export async function holeOfferteGeheimnis(schluessel: string, id: string): Promise<string> {
  const res = await abrufen('/api/bestellungen?aktion=offerte-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${schluessel}` },
    body: JSON.stringify({ id }),
  })
  const daten = await antwort<{ geheim?: string }>(res)
  if (!daten.geheim) throw new Error('Der Server kennt den Offerte-Link noch nicht. Ist die neue Fassung deployt?')
  return daten.geheim
}
