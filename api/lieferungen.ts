import type { VercelRequest, VercelResponse } from '@vercel/node'
/*
 * Die Endung .js gehoert hier hin, obwohl die Dateien .ts heissen – siehe
 * die ausfuehrliche Begruendung in bestellungen.ts.
 */
import {
  hDel,
  hGet,
  hGetAll,
  hSet,
  SpeicherFehlt,
  TABELLE_BESTELLUNGEN,
  TABELLE_LIEFERUNGEN,
} from './_speicher.js'
import { angemeldet } from './_sitzung.js'

/**
 * Lieferrunden: anlegen, auflisten, aendern, loeschen.
 *
 * Eine Runde buendelt mehrere Bestellungen zu einem Auftrag an den
 * Produzenten. Sie ist noetig, weil zwischen Anfrage und Antwort Tage
 * vergehen: Eine Auswahl im Browser waere bis dahin laengst weg, und mit ihr
 * die Frage, worauf sich Boras Preise beziehen.
 *
 * ALLES HIER VERLANGT DIE ANMELDUNG. Anders als bei den Bestellungen gibt es
 * keinen offenen Weg – eine Lieferrunde legt niemand von aussen an.
 */

const TABELLE = TABELLE_LIEFERUNGEN

export type Status = 'entwurf' | 'angefragt' | 'preise' | 'bestellt' | 'geliefert'
const STATUS: Status[] = ['entwurf', 'angefragt', 'preise', 'bestellt', 'geliefert']

interface Zeile {
  nummer: number
  kennung: string
  herkunft?: { bestellungId: string; positionId: string; stueck: number }
  bezeichnung: string
  breiteCm?: number
  hoeheCm?: number
  rahmendicke?: string
  rahmenfarbe?: string
  netzfarbe?: string
  mechanismus?: string
  oeffnung?: string
  einkaufChf?: number
}

interface Lieferung {
  id: string
  nummer: string
  status: Status
  erstellt: string
  geaendert: string
  bestellungIds: string[]
  zeilen: Zeile[]
  ausgeschlossen?: string[]
  zusatz?: Zeile[]
  lieferkostenJePaket?: Record<string, number>
  lieferkostenChf?: number
  termin?: string
  bemerkung?: string
}

/* --- Eingaben zurechtstutzen ------------------------------------------------ */

function text(wert: unknown, max: number): string {
  return typeof wert === 'string' ? wert.trim().slice(0, max) : ''
}

function betrag(wert: unknown): number | undefined {
  if (wert === undefined || wert === null || wert === '') return undefined
  const n = typeof wert === 'number' ? wert : Number(wert)
  if (!Number.isFinite(n) || n < 0) return undefined
  return Math.round(n * 100) / 100
}

function mass(wert: unknown): number | undefined {
  if (wert === undefined || wert === null || wert === '') return undefined
  const n = typeof wert === 'number' ? wert : Number(wert)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.min(600, Math.round(n * 10) / 10)
}

function zeilen(wert: unknown): Zeile[] {
  if (!Array.isArray(wert)) return []
  return wert.slice(0, 400).map((roh, i) => {
    const z = (roh ?? {}) as Record<string, unknown>
    const zeile: Zeile = {
      nummer: Math.max(1, Math.round(Number(z.nummer)) || i + 1),
      kennung: text(z.kennung, 40),
      bezeichnung: text(z.bezeichnung, 120),
    }
    const breite = mass(z.breiteCm)
    const hoehe = mass(z.hoeheCm)
    if (breite !== undefined) zeile.breiteCm = breite
    if (hoehe !== undefined) zeile.hoeheCm = hoehe
    for (const feld of ['rahmendicke', 'rahmenfarbe', 'netzfarbe', 'mechanismus', 'oeffnung'] as const) {
      const w = text(z[feld], 40)
      if (w) zeile[feld] = w
    }
    const einkauf = betrag(z.einkaufChf)
    if (einkauf !== undefined) zeile.einkaufChf = einkauf
    const h = z.herkunft as Record<string, unknown> | undefined
    if (h && text(h.bestellungId, 40) && text(h.positionId, 40)) {
      zeile.herkunft = {
        bestellungId: text(h.bestellungId, 40),
        positionId: text(h.positionId, 40),
        stueck: Math.max(0, Math.round(Number(h.stueck)) || 0),
      }
    }
    return zeile
  })
}

function kennungen(wert: unknown): string[] {
  if (!Array.isArray(wert)) return []
  return wert.slice(0, 400).map((x) => text(x, 120)).filter(Boolean)
}

function lieferkosten(wert: unknown): Record<string, number> | undefined {
  if (!wert || typeof wert !== 'object' || Array.isArray(wert)) return undefined
  const raus: Record<string, number> = {}
  for (const [schluessel, roh] of Object.entries(wert as Record<string, unknown>).slice(0, 200)) {
    const k = text(schluessel, 40)
    const b = betrag(roh)
    if (k && b !== undefined) raus[k] = b
  }
  return Object.keys(raus).length > 0 ? raus : undefined
}

/**
 * Die naechste freie Nummer, "L-2026-01".
 *
 * Sie ist die einzige Zahl, auf die sich Bora bezieht, wenn er antwortet.
 * Gezaehlt wird je Jahr, damit sie kurz bleibt.
 */
function naechsteNummer(vorhandene: Lieferung[]): string {
  const jahr = new Date().getFullYear()
  const praefix = `L-${jahr}-`
  const hoechste = vorhandene
    .filter((l) => l.nummer.startsWith(praefix))
    .map((l) => Number(l.nummer.slice(praefix.length)))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0)
  return `${praefix}${String(hoechste + 1).padStart(2, '0')}`
}

/* --- Einstieg --------------------------------------------------------------- */

function nichtAngemeldet(res: VercelResponse) {
  return res.status(401).json({ error: 'Nicht angemeldet.' })
}

async function alle(): Promise<Lieferung[]> {
  const roh = await hGetAll(TABELLE)
  const liste: Lieferung[] = []
  for (const wert of Object.values(roh)) {
    try {
      liste.push(JSON.parse(wert) as Lieferung)
    } catch {
      // Eine kaputte Zeile darf nicht die ganze Tabelle unbrauchbar machen.
    }
  }
  return liste.sort((a, b) => b.erstellt.localeCompare(a.erstellt))
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!angemeldet(req.headers.cookie)) return nichtAngemeldet(res)

    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ lieferungen: await alle() })
    }
    if (req.method === 'POST') return await anlegen(req, res)
    if (req.method === 'PATCH') return await aendern(req, res)
    if (req.method === 'DELETE') return await entfernen(req, res)

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return res.status(405).json({ error: 'Methode nicht erlaubt.' })
  } catch (fehler) {
    if (fehler instanceof SpeicherFehlt) {
      console.error(fehler.message)
      return res.status(503).json({ error: fehler.message })
    }
    console.error('Lieferungen:', fehler)
    return res.status(500).json({ error: 'Unerwarteter Fehler.' })
  }
}

async function anlegen(req: VercelRequest, res: VercelResponse) {
  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  const bestellungIds = kennungen(koerper.bestellungIds)
  if (bestellungIds.length === 0) return res.status(400).json({ error: 'Es sind keine Bestellungen gewählt.' })

  const jetzt = new Date().toISOString()
  const lieferung: Lieferung = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    nummer: naechsteNummer(await alle()),
    status: 'entwurf',
    erstellt: jetzt,
    geaendert: jetzt,
    bestellungIds,
    // Im Entwurf sind die Zeilen noch nicht eingefroren: Sie werden aus den
    // Bestellungen gerechnet, damit sich Netze bis zum Versand aendern lassen.
    zeilen: [],
  }

  await hSet(TABELLE, lieferung.id, JSON.stringify(lieferung))
  return res.status(201).json({ ok: true, lieferung })
}

/**
 * Aendert eine Lieferrunde. Wie bei den Bestellungen eine Aufzaehlung und
 * kein Zusammenfuehren von allem, was ankommt: Nummer, Anlagezeitpunkt und
 * Id sind die Identitaet der Runde und bleiben.
 *
 * Der Uebergang nach "bestellt" zieht die enthaltenen Bestellungen mit. Das
 * ist der Sinn der Runde: Wer sie beim Lieferanten bestellt hat, hat alle
 * darin bestellt, und niemand soll das sechsmal einzeln klicken.
 */
async function aendern(req: VercelRequest, res: VercelResponse) {
  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  const id = text(koerper.id, 40)
  if (!id) return res.status(400).json({ error: 'Id fehlt.' })

  const vorhanden = await hGet(TABELLE, id)
  if (!vorhanden) return res.status(404).json({ error: 'Lieferung nicht gefunden.' })

  const lieferung = JSON.parse(vorhanden) as Lieferung
  let geaendert = false

  if (koerper.status !== undefined) {
    if (!STATUS.includes(koerper.status as Status)) return res.status(400).json({ error: 'Unbekannter Status.' })
    lieferung.status = koerper.status as Status
    geaendert = true
  }
  if (koerper.zeilen !== undefined) {
    lieferung.zeilen = zeilen(koerper.zeilen)
    geaendert = true
  }
  if (koerper.bestellungIds !== undefined) {
    lieferung.bestellungIds = kennungen(koerper.bestellungIds)
    geaendert = true
  }
  if (koerper.ausgeschlossen !== undefined) {
    lieferung.ausgeschlossen = kennungen(koerper.ausgeschlossen)
    geaendert = true
  }
  if (koerper.zusatz !== undefined) {
    lieferung.zusatz = zeilen(koerper.zusatz)
    geaendert = true
  }
  if (koerper.lieferkostenJePaket !== undefined) {
    lieferung.lieferkostenJePaket = lieferkosten(koerper.lieferkostenJePaket)
    geaendert = true
  }
  if (koerper.lieferkostenChf !== undefined) {
    lieferung.lieferkostenChf = betrag(koerper.lieferkostenChf)
    geaendert = true
  }
  if (koerper.termin !== undefined) {
    lieferung.termin = text(koerper.termin, 120) || undefined
    geaendert = true
  }
  if (koerper.bemerkung !== undefined) {
    lieferung.bemerkung = text(koerper.bemerkung, 1200) || undefined
    geaendert = true
  }

  if (!geaendert) return res.status(400).json({ error: 'Es war nichts zu ändern.' })

  lieferung.geaendert = new Date().toISOString()
  await hSet(TABELLE, id, JSON.stringify(lieferung))

  const mitgezogen = lieferung.status === 'bestellt' ? await bestellungenAufBestellt(lieferung.bestellungIds) : 0
  return res.status(200).json({ ok: true, lieferung, mitgezogen })
}

/**
 * Setzt die Bestellungen der Runde auf "beim Lieferanten bestellt".
 *
 * Bewusst ohne Rueckweg: Faellt die Runde zurueck auf "angefragt", bleiben
 * die Bestellungen, wo sie sind. Eine automatische Ruecknahme koennte einen
 * Status ueberschreiben, den jemand inzwischen von Hand weitergesetzt hat –
 * etwa auf "erledigt", weil schon ausgeliefert wurde.
 */
async function bestellungenAufBestellt(ids: string[]): Promise<number> {
  let gezaehlt = 0
  for (const id of ids) {
    const roh = await hGet(TABELLE_BESTELLUNGEN, id)
    if (!roh) continue
    try {
      const bestellung = JSON.parse(roh) as { status: string; geaendert: string }
      if (bestellung.status === 'bestellt' || bestellung.status === 'erledigt' || bestellung.status === 'geloescht') {
        continue
      }
      bestellung.status = 'bestellt'
      bestellung.geaendert = new Date().toISOString()
      await hSet(TABELLE_BESTELLUNGEN, id, JSON.stringify(bestellung))
      gezaehlt++
    } catch {
      // Eine kaputte Bestellung haelt die Runde nicht auf.
    }
  }
  return gezaehlt
}

async function entfernen(req: VercelRequest, res: VercelResponse) {
  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  const id = text(koerper.id, 40)
  if (!id) return res.status(400).json({ error: 'Id fehlt.' })

  const geloescht = await hDel(TABELLE, id)
  if (!geloescht) return res.status(404).json({ error: 'Lieferung nicht gefunden.' })
  return res.status(200).json({ ok: true })
}
