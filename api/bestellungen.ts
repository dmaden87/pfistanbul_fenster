import type { VercelRequest, VercelResponse } from '@vercel/node'
import { hGet, hGetAll, hSet, inkrement, speicherBereit, SpeicherFehlt, verfaellt } from './_speicher'
import { abmeldeCookie, angemeldet, anmeldeCookie, passwortGesetzt, passwortStimmt } from './_sitzung'

/**
 * Bestellungen: annehmen, auflisten, Status ändern.
 *
 * Das Anlegen ist offen – es kommt vom Bestellformular und muss ohne
 * Anmeldung gehen. Lesen und Ändern verlangen die Sitzung aus _sitzung.ts.
 *
 * Was gespeichert wird, ist bewusst das, was die Kundin auf der Seite gesehen
 * hat, nicht eine Neuberechnung. Für die Abwicklung zählt genau das. Die
 * verbindliche Preisberechnung fürs Geld passiert unabhängig davon in
 * checkout.ts, wo die Beträge ausschliesslich aus der Server-Tabelle kommen.
 */

const TABELLE = 'pf:bestellungen'

/** Nach so vielen Fehlversuchen ist für eine Viertelstunde Ruhe. */
const MAX_VERSUCHE = 8
const SPERRE_SEKUNDEN = 900

export type Status = 'neu' | 'bestellt' | 'erledigt' | 'geloescht'
const STATUS: Status[] = ['neu', 'bestellt', 'erledigt', 'geloescht']

interface Position {
  menge: number
  bezeichnung: string
  detail: string
  preisChf: number
}

/**
 * Drei Arten landen in derselben Tabelle: die feste Bestellung aus dem
 * Warenkorb, die Anfrage fuer ein Sondermass und die Frage nach einer
 * individuellen Zahlungsloesung. Die dritte fliesst nie zum Lieferanten,
 * darf aber genauso wenig untergehen wie die anderen beiden.
 */
export type Art = 'bestellung' | 'anfrage' | 'zahlung'
const ARTEN: Art[] = ['bestellung', 'anfrage', 'zahlung']

interface Bestellung {
  id: string
  referenz: string
  art: Art
  status: Status
  eingang: string
  geaendert: string
  kunde: {
    name: string
    email: string
    telefon: string
    strasse: string
    plz: string
    ort: string
    bemerkung: string
  }
  positionen: Position[]
  montage: boolean
  zahlung: 'uebergabe' | 'online'
  zahlungswunsch: boolean
  summeChf: number
}

/* --- Eingaben zurechtstutzen ------------------------------------------------ */

function text(wert: unknown, max: number): string {
  return typeof wert === 'string' ? wert.trim().slice(0, max) : ''
}

function zahl(wert: unknown): number {
  const n = typeof wert === 'number' ? wert : Number(wert)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

function positionen(wert: unknown): Position[] {
  if (!Array.isArray(wert)) return []
  return wert.slice(0, 30).map((p) => ({
    menge: Math.min(99, Math.max(1, Math.round(zahl((p as Position)?.menge)) || 1)),
    bezeichnung: text((p as Position)?.bezeichnung, 120),
    detail: text((p as Position)?.detail, 160),
    preisChf: zahl((p as Position)?.preisChf),
  }))
}

function ausRohdaten(roh: Record<string, unknown>): Bestellung | null {
  const art = ARTEN.includes(roh.art as Art) ? (roh.art as Art) : 'bestellung'
  const name = text((roh.kunde as Record<string, unknown>)?.name, 120)
  const email = text((roh.kunde as Record<string, unknown>)?.email, 160)
  // Ohne Name und E-Mail ist die Bestellung nicht zuzuordnen – dann lieber
  // ablehnen, als eine unbrauchbare Zeile in der Tabelle zu haben.
  if (!name || !email) return null

  const k = roh.kunde as Record<string, unknown>
  const jetzt = new Date().toISOString()

  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    referenz: text(roh.referenz, 40),
    art,
    status: 'neu',
    eingang: jetzt,
    geaendert: jetzt,
    kunde: {
      name,
      email,
      telefon: text(k?.telefon, 40),
      strasse: text(k?.strasse, 140),
      plz: text(k?.plz, 12),
      ort: text(k?.ort, 80),
      bemerkung: text(k?.bemerkung, 1200),
    },
    positionen: positionen(roh.positionen),
    montage: roh.montage === true,
    zahlung: roh.zahlung === 'online' ? 'online' : 'uebergabe',
    zahlungswunsch: roh.zahlungswunsch === true,
    summeChf: zahl(roh.summeChf),
  }
}

/* --- Hilfen ----------------------------------------------------------------- */

function absender(req: VercelRequest): string {
  const kopf = req.headers['x-forwarded-for']
  const roh = Array.isArray(kopf) ? kopf[0] : kopf
  return (roh ?? 'unbekannt').split(',')[0].trim().slice(0, 60)
}

function nichtAngemeldet(res: VercelResponse) {
  return res.status(401).json({ error: 'Nicht angemeldet.' })
}

/* --- Einstieg --------------------------------------------------------------- */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const aktion = typeof req.query.aktion === 'string' ? req.query.aktion : ''

  try {
    if (req.method === 'POST' && aktion === 'anmelden') return await anmelden(req, res)
    if (req.method === 'POST' && aktion === 'abmelden') {
      res.setHeader('Set-Cookie', abmeldeCookie())
      return res.status(200).json({ ok: true })
    }
    if (req.method === 'GET' && aktion === 'status') {
      // Verrät nur, ob der Bereich überhaupt eingerichtet ist – nie, ob ein
      // Passwort richtig war.
      return res.status(200).json({
        eingerichtet: speicherBereit && passwortGesetzt,
        speicher: speicherBereit,
        passwort: passwortGesetzt,
        angemeldet: angemeldet(req.headers.cookie),
      })
    }
    if (req.method === 'POST') return await anlegen(req, res)
    if (req.method === 'GET') return await auflisten(req, res)
    if (req.method === 'PATCH') return await aendern(req, res)

    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ error: 'Methode nicht erlaubt.' })
  } catch (fehler) {
    if (fehler instanceof SpeicherFehlt) {
      console.error(fehler.message)
      return res.status(503).json({ error: fehler.message })
    }
    console.error('Bestellungen:', fehler)
    return res.status(500).json({ error: 'Unerwarteter Fehler.' })
  }
}

async function anmelden(req: VercelRequest, res: VercelResponse) {
  if (!passwortGesetzt) {
    return res.status(503).json({
      error:
        'Es ist kein Adminpasswort gesetzt. In Vercel die Umgebungsvariable ADMIN_PASSWORT anlegen ' +
        '(mindestens acht Zeichen, ohne VITE_-Präfix) und neu deployen.',
    })
  }

  const schluessel = `pf:anmeldeversuche:${absender(req)}`
  const versuche = await inkrement(schluessel)
  if (versuche === 1) await verfaellt(schluessel, SPERRE_SEKUNDEN)
  if (versuche > MAX_VERSUCHE) {
    return res.status(429).json({ error: 'Zu viele Versuche. Bitte in einer Viertelstunde nochmals.' })
  }

  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  if (!passwortStimmt(koerper.passwort)) {
    return res.status(401).json({ error: 'Passwort stimmt nicht.' })
  }

  res.setHeader('Set-Cookie', anmeldeCookie())
  return res.status(200).json({ ok: true })
}

async function anlegen(req: VercelRequest, res: VercelResponse) {
  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  const bestellung = ausRohdaten(koerper as Record<string, unknown>)
  if (!bestellung) return res.status(400).json({ error: 'Name und E-Mail fehlen.' })

  await hSet(TABELLE, bestellung.id, JSON.stringify(bestellung))
  return res.status(201).json({ ok: true, id: bestellung.id })
}

async function auflisten(req: VercelRequest, res: VercelResponse) {
  if (!angemeldet(req.headers.cookie)) return nichtAngemeldet(res)

  const alle = await hGetAll(TABELLE)
  const liste: Bestellung[] = []
  for (const wert of Object.values(alle)) {
    try {
      liste.push(JSON.parse(wert) as Bestellung)
    } catch {
      // Eine kaputte Zeile darf nicht die ganze Tabelle unbrauchbar machen.
    }
  }
  liste.sort((a, b) => b.eingang.localeCompare(a.eingang))

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ bestellungen: liste })
}

async function aendern(req: VercelRequest, res: VercelResponse) {
  if (!angemeldet(req.headers.cookie)) return nichtAngemeldet(res)

  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  const id = text(koerper.id, 40)
  const status = koerper.status as Status
  if (!id || !STATUS.includes(status)) return res.status(400).json({ error: 'Id oder Status fehlt.' })

  const vorhanden = await hGet(TABELLE, id)
  if (!vorhanden) return res.status(404).json({ error: 'Bestellung nicht gefunden.' })

  const bestellung = JSON.parse(vorhanden) as Bestellung
  bestellung.status = status
  bestellung.geaendert = new Date().toISOString()
  await hSet(TABELLE, id, JSON.stringify(bestellung))

  return res.status(200).json({ ok: true, bestellung })
}
