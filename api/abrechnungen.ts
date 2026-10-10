import type { VercelRequest, VercelResponse } from '@vercel/node'
/* Zur Endung .js in den Importen siehe den Kommentar in api/bestellungen.ts. */
import {
  hDel,
  hGet,
  hGetAll,
  hSet,
  SpeicherFehlt,
  TABELLE_ABRECHNUNGEN,
  TABELLE_ABRECHNUNGEN_DEMO,
} from './_speicher.js'
import { demoAbrechnungen, demoModus } from './_demo.js'
import { angemeldet } from './_sitzung.js'

/**
 * Abrechnungen: einmal Geld verteilen, als Beleg.
 *
 * WAS HIER LIEGT, IST FERTIG GERECHNET. Der Browser schickt die Zeilen und
 * die Summen; der Server prueft sie auf Form und legt sie ab. Er rechnet
 * nicht nach – er koennte es nicht einmal: Die Formel steht in src/lib, und
 * api/ darf von dort nicht importieren (bau/api-test.mjs haelt das fest).
 *
 * Das ist vertretbar, weil der Endpunkt angemeldet ist und eine Abrechnung
 * kein Dokument fuer Dritte ist, sondern unsere eigene Notiz darueber, wer
 * wie viel bekommen hat. Was der Server dagegen sehr wohl tut: Eine
 * ERLEDIGTE Abrechnung nicht mehr anfassen lassen. Ein Beleg, der sich
 * nachtraeglich aendert, ist keiner.
 */

const TABELLE = demoModus ? TABELLE_ABRECHNUNGEN_DEMO : TABELLE_ABRECHNUNGEN

const BETEILIGTE = ['bora', 'ufuk', 'deniz'] as const
type Beteiligter = (typeof BETEILIGTE)[number]

const ARTEN = ['herstellung', 'lieferung', 'mwst', 'weiteres', 'auslage', 'montage'] as const
type Art = (typeof ARTEN)[number]

interface AbrechnungAuftrag {
  bestellungId: string
  referenz: string
  kunde: string
  erloesChf: number
  warenerloesChf: number
  montageerloesChf: number
}

interface AbrechnungPosten {
  bestellungId?: string
  auslageId?: string
  postenId: string
  art: Art
  bezeichnung?: string
  kunde?: string
  betragChf: number
  traeger: Beteiligter
}

type Betraege = Record<Beteiligter, number>

interface Abrechnung {
  id: string
  nummer: string
  erstelltAm: string
  erledigtAm?: string
  notiz?: string
  auftraege: AbrechnungAuftrag[]
  posten: AbrechnungPosten[]
  erloesChf: number
  warenerloesChf: number
  montageerloesChf: number
  warenkostenChf: number
  montagekostenChf: number
  betriebskostenChf: number
  rueckzahlungChf: number
  rueckzahlung: Betraege
  warengewinnChf: number
  montagegewinnChf: number
  verteilbarChf: number
  anteile: Betraege
  summe: Betraege
}

/* --- Eingaben zurechtstutzen ------------------------------------------------ */

function text(wert: unknown, max: number): string {
  return typeof wert === 'string' ? wert.trim().slice(0, max) : ''
}

/**
 * Ein Betrag in Franken, auf Rappen gerundet.
 *
 * DARF NEGATIV SEIN, anders als bei den Auslagen: Ein Topf im Minus ist eine
 * gueltige Aussage ("die Auslagen waren groesser als das, was hereinkam"),
 * und wer sie abschneidet, zeigt eine Abrechnung, die aufzugehen scheint.
 */
function zahl(wert: unknown): number {
  const n = typeof wert === 'number' ? wert : Number(wert)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

function betraege(wert: unknown): Betraege {
  const k = (wert ?? {}) as Record<string, unknown>
  return { bora: zahl(k.bora), ufuk: zahl(k.ufuk), deniz: zahl(k.deniz) }
}

function auftraege(wert: unknown): AbrechnungAuftrag[] {
  if (!Array.isArray(wert)) return []
  const raus: AbrechnungAuftrag[] = []
  for (const roh of wert.slice(0, 200)) {
    const a = (roh ?? {}) as Record<string, unknown>
    const bestellungId = text(a.bestellungId, 60)
    if (!bestellungId) continue
    raus.push({
      bestellungId,
      referenz: text(a.referenz, 40),
      kunde: text(a.kunde, 120),
      erloesChf: zahl(a.erloesChf),
      warenerloesChf: zahl(a.warenerloesChf),
      montageerloesChf: zahl(a.montageerloesChf),
    })
  }
  return raus
}

function posten(wert: unknown): AbrechnungPosten[] {
  if (!Array.isArray(wert)) return []
  const raus: AbrechnungPosten[] = []
  for (const roh of wert.slice(0, 500)) {
    const p = (roh ?? {}) as Record<string, unknown>
    const art = ARTEN.includes(p.art as Art) ? (p.art as Art) : undefined
    const traeger = BETEILIGTE.includes(p.traeger as Beteiligter) ? (p.traeger as Beteiligter) : undefined
    const postenId = text(p.postenId, 60)
    if (!art || !traeger || !postenId) continue
    const bestellungId = text(p.bestellungId, 60)
    const auslageId = text(p.auslageId, 60)
    const bezeichnung = text(p.bezeichnung, 120)
    const kunde = text(p.kunde, 120)
    raus.push({
      ...(bestellungId ? { bestellungId } : {}),
      ...(auslageId ? { auslageId } : {}),
      postenId,
      art,
      ...(bezeichnung ? { bezeichnung } : {}),
      ...(kunde ? { kunde } : {}),
      betragChf: zahl(p.betragChf),
      traeger,
    })
  }
  return raus
}

function darf(req: VercelRequest): boolean {
  return demoModus || angemeldet(req.headers.cookie)
}

function ausKoerper(k: Record<string, unknown>): Abrechnung | string {
  const liste = auftraege(k.auftraege)
  const kosten = posten(k.posten)
  if (liste.length === 0 && kosten.length === 0) {
    return 'Eine Abrechnung ohne Aufträge und ohne Auslagen hat nichts zu verteilen.'
  }
  const nummer = text(k.nummer, 20)
  if (!nummer) return 'Nummer fehlt.'
  return {
    id: '',
    nummer,
    erstelltAm: new Date().toISOString(),
    ...(text(k.notiz, 300) ? { notiz: text(k.notiz, 300) } : {}),
    auftraege: liste,
    posten: kosten,
    erloesChf: zahl(k.erloesChf),
    warenerloesChf: zahl(k.warenerloesChf),
    montageerloesChf: zahl(k.montageerloesChf),
    warenkostenChf: zahl(k.warenkostenChf),
    montagekostenChf: zahl(k.montagekostenChf),
    betriebskostenChf: zahl(k.betriebskostenChf),
    rueckzahlungChf: zahl(k.rueckzahlungChf),
    rueckzahlung: betraege(k.rueckzahlung),
    warengewinnChf: zahl(k.warengewinnChf),
    montagegewinnChf: zahl(k.montagegewinnChf),
    verteilbarChf: zahl(k.verteilbarChf),
    anteile: betraege(k.anteile),
    summe: betraege(k.summe),
  }
}

/* --- Einstieg --------------------------------------------------------------- */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!darf(req)) return res.status(401).json({ error: 'Nicht angemeldet.' })

    if (req.method === 'GET') {
      if (demoModus) {
        const vorhanden = await hGetAll(TABELLE)
        if (Object.keys(vorhanden).length === 0) {
          for (const satz of demoAbrechnungen()) await hSet(TABELLE, String(satz.id), JSON.stringify(satz))
        }
      }
      const alle = await hGetAll(TABELLE)
      const liste: Abrechnung[] = []
      for (const wert of Object.values(alle)) {
        try { liste.push(JSON.parse(wert) as Abrechnung) }
        catch { /* Eine kaputte Zeile darf nicht die ganze Liste verhindern. */ }
      }
      /* Neueste zuerst – die Historie liest man von oben. */
      liste.sort((a, b) => (a.erstelltAm < b.erstelltAm ? 1 : a.erstelltAm > b.erstelltAm ? -1 : 0))
      return res.status(200).json({ abrechnungen: liste, ...(demoModus ? { demo: true } : {}) })
    }

    const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}

    if (req.method === 'POST') {
      /*
       * NUR EIN ENTWURF ZUR ZEIT. Zwei offene Abrechnungen koennten
       * denselben Auftrag enthalten, und das Geld waere zweimal verteilt.
       * Die Oberflaeche zeigt den Entwurf statt der Auswahl; der Riegel steht
       * trotzdem hier, weil zwei Fenster offen sein koennen.
       */
      const alle = await hGetAll(TABELLE)
      for (const wert of Object.values(alle)) {
        try {
          const a = JSON.parse(wert) as Abrechnung
          if (!a.erledigtAm) return res.status(409).json({ error: 'Es gibt schon eine offene Abrechnung.' })
        } catch { /* kaputte Zeile, ignorieren */ }
      }
      const gebaut = ausKoerper(koerper as Record<string, unknown>)
      if (typeof gebaut === 'string') return res.status(400).json({ error: gebaut })
      const id = `ab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
      const abrechnung = { ...gebaut, id }
      await hSet(TABELLE, id, JSON.stringify(abrechnung))
      return res.status(201).json({ ok: true, abrechnung })
    }

    if (req.method === 'PATCH') {
      const id = text(koerper.id, 40)
      if (!id) return res.status(400).json({ error: 'Id fehlt.' })
      const vorhanden = await hGet(TABELLE, id)
      if (!vorhanden) return res.status(404).json({ error: 'Abrechnung nicht gefunden.' })
      const alt = JSON.parse(vorhanden) as Abrechnung
      /*
       * EINE ERLEDIGTE ABRECHNUNG IST ZU. Sie ist der Beleg darueber, wer
       * wie viel bekommen hat; wer sie nachtraeglich aendert, aendert eine
       * Auszahlung, die laengst geflossen ist.
       */
      if (alt.erledigtAm) return res.status(409).json({ error: 'Diese Abrechnung ist abgeschlossen.' })
      const neu: Abrechnung = { ...alt }
      if (koerper.erledigt === true) neu.erledigtAm = new Date().toISOString()
      if (koerper.notiz !== undefined) {
        const notiz = text(koerper.notiz, 300)
        if (notiz) neu.notiz = notiz
        else delete neu.notiz
      }
      await hSet(TABELLE, id, JSON.stringify(neu))
      return res.status(200).json({ ok: true, abrechnung: neu })
    }

    if (req.method === 'DELETE') {
      const id = text(koerper.id ?? req.query.id, 40)
      if (!id) return res.status(400).json({ error: 'Id fehlt.' })
      const vorhanden = await hGet(TABELLE, id)
      if (vorhanden) {
        const alt = JSON.parse(vorhanden) as Abrechnung
        /* Verworfen wird nur ein Entwurf. Erledigtes bleibt. */
        if (alt.erledigtAm) return res.status(409).json({ error: 'Diese Abrechnung ist abgeschlossen.' })
      }
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
    console.error('Abrechnungen:', fehler)
    return res.status(500).json({ error: 'Unerwarteter Fehler.' })
  }
}
