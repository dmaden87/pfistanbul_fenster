/**
 * Kleiner Zugriff auf den Redis-Speicher von Upstash über dessen REST-API.
 *
 * Bewusst ohne SDK: Die REST-Schnittstelle ist ein einziger POST mit dem
 * Befehl als JSON-Array. Das spart eine Abhängigkeit, die bei jedem
 * Sicherheitsupdate mitgezogen werden müsste, und es gibt nichts, was
 * zwischen uns und dem Speicher noch kaputtgehen kann.
 *
 * Die Zugangsdaten kommen aus den Umgebungsvariablen, die Vercel setzt,
 * sobald im Dashboard unter Storage ein Upstash-Redis angelegt und mit dem
 * Projekt verbunden wurde. Je nach Zeitpunkt der Einrichtung heissen sie
 * KV_REST_API_* (der ältere Name "Vercel KV") oder UPSTASH_REDIS_REST_*.
 * Wir nehmen beide an, damit niemand raten muss.
 */

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN

/** True, sobald ein Speicher verbunden ist. Ohne ihn bleibt der Adminbereich leer, statt zu lügen. */
export const speicherBereit = Boolean(url && token)

export class SpeicherFehlt extends Error {
  constructor() {
    super(
      'Es ist noch kein Speicher verbunden. In Vercel unter Storage ein Upstash-Redis anlegen ' +
        'und mit dem Projekt verbinden – danach einmal neu deployen.',
    )
    this.name = 'SpeicherFehlt'
  }
}

async function befehl<T>(...teile: (string | number)[]): Promise<T> {
  if (!url || !token) throw new SpeicherFehlt()

  const antwort = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(teile.map(String)),
  })

  if (!antwort.ok) {
    const text = await antwort.text().catch(() => '')
    throw new Error(`Speicher antwortete mit ${antwort.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
  }

  const daten = (await antwort.json()) as { result?: T; error?: string }
  if (daten.error) throw new Error(`Speicher meldete: ${daten.error}`)
  return daten.result as T
}

/** Setzt ein Feld in einer Hash-Tabelle. */
export function hSet(schluessel: string, feld: string, wert: string) {
  return befehl<number>('HSET', schluessel, feld, wert)
}

/** Liest ein einzelnes Feld. */
export function hGet(schluessel: string, feld: string) {
  return befehl<string | null>('HGET', schluessel, feld)
}

/**
 * Liest die ganze Tabelle. Upstash liefert abwechselnd Feld und Wert in einer
 * flachen Liste; hier wird daraus ein Objekt.
 */
export async function hGetAll(schluessel: string): Promise<Record<string, string>> {
  const flach = await befehl<string[] | null>('HGETALL', schluessel)
  const raus: Record<string, string> = {}
  if (!flach) return raus
  for (let i = 0; i + 1 < flach.length; i += 2) raus[flach[i]] = flach[i + 1]
  return raus
}

/**
 * Entfernt ein Feld endgültig. Gebraucht fuer das Loeschversprechen in der
 * Datenschutzerklaerung: Anfragen, aus denen keine Bestellung wird, loeschen
 * wir spaetestens nach zwoelf Monaten – und auf Verlangen sofort, wie es das
 * revidierte Datenschutzgesetz vorsieht.
 */
export function hDel(schluessel: string, feld: string) {
  return befehl<number>('HDEL', schluessel, feld)
}

/** Zählt hoch und liefert den neuen Wert – für die Sperre nach zu vielen Fehlversuchen. */
export function inkrement(schluessel: string) {
  return befehl<number>('INCR', schluessel)
}

/** Setzt eine Verfallszeit in Sekunden. */
export function verfaellt(schluessel: string, sekunden: number) {
  return befehl<number>('EXPIRE', schluessel, sekunden)
}
