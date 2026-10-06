import type { VercelRequest, VercelResponse } from '@vercel/node'
/* Zur Endung .js in den Importen siehe den Kommentar in api/bestellungen.ts. */
import {
  hDel,
  hGet,
  hGetAll,
  hSet,
  SpeicherFehlt,
  TABELLE_AUSLAGEN,
  TABELLE_AUSLAGEN_DEMO,
} from './_speicher.js'
import { demoModus } from './_demo.js'
import { angemeldet } from './_sitzung.js'

/**
 * Auslagen: laufende Betriebskosten ohne Bestellbezug.
 *
 * Werbung, Server, Klebeband, Benzin – alles, was keiner einzelnen
 * Bestellung zuzurechnen ist und trotzdem bezahlt werden muss. Was zu einer
 * Bestellung gehoert, steht dort als Kostenposten und nicht hier; sonst
 * stuende dasselbe Geld an zwei Stellen.
 *
 * EIGENE FUNKTION UND NICHT EIN ZWEIG IN bestellungen.ts: Die Buchhaltung
 * ist ein anderer Bereich mit anderen Daten. Ein gemeinsamer Handler haette
 * nur den gemeinsamen Nenner – die Anmeldung –, und die steht ohnehin in
 * _sitzung.ts.
 *
 * ANMELDUNG WIE IM ADMINBEREICH, auch der Demomodus: Wer die Bestellungen
 * sehen darf, darf auch die Kosten sehen. Eine zweite Zugangsregel waere
 * eine zweite Stelle, an der man sich irren kann.
 */

const TABELLE = demoModus ? TABELLE_AUSLAGEN_DEMO : TABELLE_AUSLAGEN

const KATEGORIEN = ['marketing', 'infrastruktur', 'material', 'werkzeug', 'fahrten', 'sonstiges'] as const
type Kategorie = (typeof KATEGORIEN)[number]

const BETEILIGTE = ['bora', 'ufuk', 'deniz'] as const
type Beteiligter = (typeof BETEILIGTE)[number]

interface Auslage {
  id: string
  am: string
  bezeichnung: string
  kategorie: Kategorie
  betragChf: number
  traeger: Beteiligter
  bezahlt?: boolean
  notiz?: string
  erfasstAm: string
}

/* --- Eingaben zurechtstutzen ------------------------------------------------ */

function text(wert: unknown, max: number): string {
  return typeof wert === 'string' ? wert.trim().slice(0, max) : ''
}

function zahl(wert: unknown): number {
  const n = typeof wert === 'number' ? wert : Number(wert)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

/**
 * Ein Tag im Format JJJJ-MM-TT. Eine Auslage faellt an einem Tag an, nicht
 * in einer Sekunde.
 *
 * `Date.parse` REICHT ALS PRUEFUNG NICHT. "2026-02-30" ergibt dort eine
 * gueltige Zahl – JavaScript rechnet den ueberzaehligen Tag in den 2. Maerz
 * um. Aus einem Tippfehler wuerde so stillschweigend ein anderer Monat, und
 * die Auslage faende sich in der falschen Periode wieder. Deshalb der Weg
 * zurueck: Nur wenn das Datum sich selbst wieder ergibt, gab es den Tag.
 */
function tag(wert: unknown): string {
  const t = text(wert, 30).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return ''
  const d = new Date(`${t}T00:00:00.000Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t ? t : ''
}

function darf(req: VercelRequest): boolean {
  return demoModus || angemeldet(req.headers.cookie)
}

function nichtAngemeldet(res: VercelResponse) {
  return res.status(401).json({ error: 'Nicht angemeldet.' })
}

/**
 * Baut aus dem, was hereinkommt, eine Auslage – oder sagt, was fehlt.
 *
 * `bestehend` ist der alte Stand beim Aendern: Was der Browser nicht
 * mitschickt, bleibt stehen. Sonst loeschte ein Haken am Bezahlt-Feld
 * nebenbei die Bezeichnung.
 */
function ausKoerper(k: Record<string, unknown>, bestehend?: Auslage): Auslage | string {
  const bezeichnung = k.bezeichnung === undefined && bestehend ? bestehend.bezeichnung : text(k.bezeichnung, 80)
  if (!bezeichnung) return 'Bezeichnung fehlt.'

  const am = k.am === undefined && bestehend ? bestehend.am : tag(k.am)
  if (!am) return 'Datum fehlt oder ist unbrauchbar.'

  const kategorie = KATEGORIEN.includes(k.kategorie as Kategorie)
    ? (k.kategorie as Kategorie)
    : bestehend?.kategorie
  if (!kategorie) return 'Kategorie fehlt.'

  const traeger = BETEILIGTE.includes(k.traeger as Beteiligter)
    ? (k.traeger as Beteiligter)
    : bestehend?.traeger
  if (!traeger) return 'Es fehlt, wer ausgelegt hat.'

  const betragChf = k.betragChf === undefined && bestehend ? bestehend.betragChf : zahl(k.betragChf)
  if (!(betragChf > 0)) return 'Betrag fehlt.'

  const notiz = k.notiz === undefined && bestehend ? bestehend.notiz : text(k.notiz, 200) || undefined
  const bezahlt = k.bezahlt === undefined && bestehend ? bestehend.bezahlt : k.bezahlt === true || undefined

  return {
    id: bestehend?.id ?? '',
    am,
    bezeichnung,
    kategorie,
    betragChf,
    traeger,
    ...(bezahlt ? { bezahlt: true } : {}),
    ...(notiz ? { notiz } : {}),
    erfasstAm: bestehend?.erfasstAm ?? new Date().toISOString(),
  }
}

/* --- Einstieg --------------------------------------------------------------- */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!darf(req)) return nichtAngemeldet(res)

    if (req.method === 'GET') {
      const alle = await hGetAll(TABELLE)
      const liste: Auslage[] = []
      for (const wert of Object.values(alle)) {
        try { liste.push(JSON.parse(wert) as Auslage) }
        catch { /* Eine kaputte Zeile darf nicht die ganze Liste verhindern. */ }
      }
      liste.sort((a, b) => (a.am < b.am ? 1 : a.am > b.am ? -1 : 0))
      return res.status(200).json({ auslagen: liste, ...(demoModus ? { demo: true } : {}) })
    }

    const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}

    if (req.method === 'POST') {
      const gebaut = ausKoerper(koerper as Record<string, unknown>)
      if (typeof gebaut === 'string') return res.status(400).json({ error: gebaut })
      const id = `al-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      const auslage = { ...gebaut, id }
      await hSet(TABELLE, id, JSON.stringify(auslage))
      return res.status(201).json({ ok: true, auslage })
    }

    if (req.method === 'PATCH') {
      const id = text(koerper.id, 40)
      if (!id) return res.status(400).json({ error: 'Id fehlt.' })
      const vorhanden = await hGet(TABELLE, id)
      if (!vorhanden) return res.status(404).json({ error: 'Auslage nicht gefunden.' })
      const gebaut = ausKoerper(koerper as Record<string, unknown>, JSON.parse(vorhanden) as Auslage)
      if (typeof gebaut === 'string') return res.status(400).json({ error: gebaut })
      await hSet(TABELLE, id, JSON.stringify(gebaut))
      return res.status(200).json({ ok: true, auslage: gebaut })
    }

    if (req.method === 'DELETE') {
      const id = text(koerper.id ?? req.query.id, 40)
      if (!id) return res.status(400).json({ error: 'Id fehlt.' })
      await hDel(TABELLE, id)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
    return res.status(405).json({ error: 'Methode nicht erlaubt.' })
  } catch (fehler) {
    if (fehler instanceof SpeicherFehlt) {
      console.error(fehler.message)
      return res.status(503).json({ error: fehler.message })
    }
    console.error('Auslagen:', fehler)
    return res.status(500).json({ error: 'Unerwarteter Fehler.' })
  }
}
