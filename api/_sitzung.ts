import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Anmeldung für den Adminbereich.
 *
 * Der entscheidende Punkt: Das Passwort wird hier auf dem Server geprüft, nie
 * im Browser. Eine Prüfung im Frontend wäre wirkungslos – der Code der Seite
 * ist öffentlich, jede Person könnte ihn lesen und die Bestelldaten trotzdem
 * abrufen. In den Bestellungen stehen Namen, Adressen und Telefonnummern
 * unserer Nachbarn; das ist nichts, was hinter einer Attrappe liegen darf.
 *
 * Das Passwort selbst steht deshalb auch nicht im Code, sondern als
 * Umgebungsvariable ADMIN_PASSWORT in Vercel – ohne VITE_-Präfix, damit es
 * nicht ins Browser-Bündel wandert.
 */

const passwort = process.env.ADMIN_PASSWORT

export const passwortGesetzt = Boolean(passwort && passwort.length >= 8)

/** Wie lange eine Anmeldung gilt. */
const GUELTIG_MS = 12 * 60 * 60 * 1000

export const COOKIE = 'pf_admin'

/**
 * Der Schlüssel zum Signieren wird aus dem Passwort abgeleitet. Das spart eine
 * zweite Umgebungsvariable und hat einen erwünschten Nebeneffekt: Wird das
 * Passwort geändert, sind alle offenen Sitzungen sofort ungültig.
 */
function schluessel(): Buffer {
  return createHash('sha256').update(`pfistanbul-admin-v1:${passwort}`).digest()
}

/** Vergleich in konstanter Zeit, damit die Antwortdauer das Passwort nicht verrät. */
export function passwortStimmt(eingabe: unknown): boolean {
  if (!passwort || typeof eingabe !== 'string') return false
  // Erst hashen, dann vergleichen: timingSafeEqual verlangt gleiche Länge,
  // und die Länge des Passworts soll nicht durchsickern.
  const a = createHash('sha256').update(eingabe).digest()
  const b = createHash('sha256').update(passwort).digest()
  return timingSafeEqual(a, b)
}

function unterschrift(ablauf: number): string {
  return createHmac('sha256', schluessel()).update(String(ablauf)).digest('hex')
}

/** Baut den Set-Cookie-Kopf für eine frische Anmeldung. */
export function anmeldeCookie(): string {
  const ablauf = Date.now() + GUELTIG_MS
  const wert = `${ablauf}.${unterschrift(ablauf)}`
  return `${COOKIE}=${wert}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${Math.floor(GUELTIG_MS / 1000)}`
}

/** Löscht den Cookie beim Abmelden. */
export function abmeldeCookie(): string {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}

/** Prüft den mitgeschickten Cookie. */
export function angemeldet(cookieKopf: string | undefined): boolean {
  if (!passwort || !cookieKopf) return false

  const treffer = cookieKopf.split(';').find((teil) => teil.trim().startsWith(`${COOKIE}=`))
  if (!treffer) return false

  const wert = treffer.trim().slice(COOKIE.length + 1)
  const punkt = wert.lastIndexOf('.')
  if (punkt < 1) return false

  const ablauf = Number(wert.slice(0, punkt))
  const gesehen = wert.slice(punkt + 1)
  if (!Number.isFinite(ablauf) || ablauf < Date.now()) return false

  const erwartet = unterschrift(ablauf)
  if (gesehen.length !== erwartet.length) return false
  return timingSafeEqual(Buffer.from(gesehen, 'hex'), Buffer.from(erwartet, 'hex'))
}
