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
import { einkaufAusRunde } from './_einkauf.js'

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
  /** Bestellungen, die die Runde verlassen haben. Ihre Zeilen bleiben stehen. */
  entfernt?: { bestellungId: string; grund: 'keineZusage' | 'aenderung'; zeitpunkt: string; notiz?: string }[]
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

  /*
   * Eine Bestellung aus der Runde nehmen.
   *
   * Das ist der eine Fall, in dem die Runde doch in eine Bestellung
   * schreibt – und der Widerspruch zur Regel "die Runde spiegelt keinen
   * Bestellstatus" ist keiner: Hier wird nichts fortlaufend gespiegelt,
   * sondern ein einzelnes Ereignis verbucht. Es muss serverseitig
   * geschehen, weil sonst zwei getrennte Aufrufe noetig waeren und ein
   * Abbruch dazwischen eine Bestellung zurueckliesse, die in keiner Runde
   * steckt und trotzdem auf sie wartet.
   */
  if (koerper.entfernen !== undefined) {
    const roh = koerper.entfernen as Record<string, unknown>
    const bestellungId = text(roh.bestellungId, 40)
    const grund = roh.grund === 'aenderung' ? 'aenderung' : 'keineZusage'
    if (!bestellungId) return res.status(400).json({ error: 'Welche Bestellung?' })
    if (!lieferung.bestellungIds.includes(bestellungId)) {
      return res.status(400).json({ error: 'Diese Bestellung steckt nicht in dieser Runde.' })
    }
    lieferung.bestellungIds = lieferung.bestellungIds.filter((x) => x !== bestellungId)
    lieferung.entfernt = [
      ...(lieferung.entfernt ?? []).filter((a) => a.bestellungId !== bestellungId),
      { bestellungId, grund, zeitpunkt: new Date().toISOString(), notiz: text(roh.notiz, 400) || undefined },
    ]
    await bestellungZurueck(bestellungId, grund)
    geaendert = true
  }

  if (!geaendert) return res.status(400).json({ error: 'Es war nichts zu ändern.' })

  /*
   * Verbindlich bestellen nimmt NUR die zugesagten mit.
   *
   * Zwischen "Preise da" und "bestellt" sitzt die Entscheidung der
   * Kundschaft. Wer ohne Zusage mitbestellt, hat Ware, die niemand bestellt
   * hat. Die anderen fliegen deshalb hier heraus – mit Grund "keineZusage",
   * also unter Beibehaltung ihrer Einkaufspreise: Sachlich hat sich nichts
   * geaendert, sie warten nur auf ein Ja.
   */
  let ohneZusage: string[] = []
  if (koerper.status === 'bestellt') {
    ohneZusage = await ohneZusageAussortieren(lieferung)
  }

  lieferung.geaendert = new Date().toISOString()
  await hSet(TABELLE, id, JSON.stringify(lieferung))

  /*
   * Frueher zog der Uebergang nach "bestellt" die Bestellungen auf denselben
   * Status. Das ist weg: Wo die Ware steht, steht in der Runde, und die
   * Uebersicht liest es dort. Ein zweiter Schreibweg auf denselben Sachverhalt
   * war genau die Quelle, aus der die widerspruechlichen Staende kamen.
   *
   * Was jetzt zurueckgeschrieben wird, ist etwas anderes: Boras Preise. Die
   * sind kein Status, sondern Daten, die nur hier hereinkommen und auf der
   * Bestellung gebraucht werden – siehe `einkaufZurueckschreiben`.
   */
  const einkauf = await einkaufZurueckschreiben(lieferung)
  return res.status(200).json({ ok: true, lieferung, einkauf, ohneZusage })
}

/** Liest eine Bestellung, veraendert sie und speichert sie zurueck. */
async function bestellungAendern(
  id: string,
  aendere: (b: Record<string, unknown>) => boolean,
): Promise<boolean> {
  const roh = await hGet(TABELLE_BESTELLUNGEN, id)
  if (!roh) return false
  try {
    const bestellung = JSON.parse(roh) as Record<string, unknown>
    if (!aendere(bestellung)) return false
    bestellung.geaendert = new Date().toISOString()
    await hSet(TABELLE_BESTELLUNGEN, id, JSON.stringify(bestellung))
    return true
  } catch {
    // Eine kaputte Bestellung haelt die Runde nicht auf.
    return false
  }
}

/**
 * Stellt eine Bestellung zurueck, die die Runde verlassen hat.
 *
 * Die beiden Gruende fuehren an verschiedene Orte, und das ist der Kern:
 * Wer nur auf die Zusage wartet, braucht keine neue Preisanfrage – seine
 * Einkaufspreise gelten weiter, und er geht in die naechste Bestellrunde.
 * Wer nachgemessen werden muss, hat neue Masse, also einen neuen Preis: Da
 * werden die Einkaufszahlen geloescht, sonst rechnet eine spaetere
 * Auswertung mit Zahlen zu Massen, die es nicht mehr gibt.
 */
async function bestellungZurueck(id: string, grund: 'keineZusage' | 'aenderung'): Promise<void> {
  await bestellungAendern(id, (b) => {
    b.status = grund === 'keineZusage' ? 'offeriert' : 'neu'
    if (grund === 'aenderung') {
      const positionen = Array.isArray(b.positionen) ? (b.positionen as Record<string, unknown>[]) : []
      for (const p of positionen) delete p.einkaufChf
      delete b.lieferkostenChf
      delete b.lieferkostenGeschaetzt
      delete b.einkaufAusRunde
      delete b.einkaufAm
    }
    return true
  })
}

/** Nimmt alle Bestellungen ohne Zusage aus der Runde. Gibt ihre Ids zurueck. */
async function ohneZusageAussortieren(lieferung: Lieferung): Promise<string[]> {
  const raus: string[] = []
  for (const bestellungId of [...lieferung.bestellungIds]) {
    const roh = await hGet(TABELLE_BESTELLUNGEN, bestellungId)
    if (!roh) continue
    try {
      const status = (JSON.parse(roh) as { status?: string }).status
      // "bestellt" ist der alte Wert fuer "zugesagt" – siehe die Abbildung in
      // bestellungen.ts. Hier zaehlt er mit, sonst faellt eine Altbestellung
      // beim Bestellen grundlos heraus.
      if (status === 'zugesagt' || status === 'bestellt') continue
      raus.push(bestellungId)
    } catch {
      continue
    }
  }
  for (const bestellungId of raus) {
    lieferung.bestellungIds = lieferung.bestellungIds.filter((x) => x !== bestellungId)
    lieferung.entfernt = [
      ...(lieferung.entfernt ?? []).filter((a) => a.bestellungId !== bestellungId),
      { bestellungId, grund: 'keineZusage', zeitpunkt: new Date().toISOString() },
    ]
    await bestellungZurueck(bestellungId, 'keineZusage')
  }
  return raus
}

/**
 * Schreibt Boras Preise auf die Bestellungen.
 *
 * Sobald ein Preis dasteht, nicht erst beim verbindlichen Bestellen: Sonst
 * waeren die Zahlen weg, wenn eine Bestellung mangels Zusage aus der Runde
 * faellt – und die naechste Runde muesste Bora dieselbe Frage nochmals
 * stellen.
 *
 * Gibt die Zahl der geaenderten Bestellungen zurueck.
 */
async function einkaufZurueckschreiben(lieferung: Lieferung): Promise<number> {
  const anteile = einkaufAusRunde(lieferung, await bestellungenDerRunde(lieferung))
  let gezaehlt = 0
  for (const anteil of anteile) {
    const preise = Object.entries(anteil.jePosition)
    if (preise.length === 0 && anteil.lieferkostenChf === undefined) continue
    const geschrieben = await bestellungAendern(anteil.bestellungId, (b) => {
      const positionen = Array.isArray(b.positionen) ? (b.positionen as Record<string, unknown>[]) : []
      let etwas = false
      for (const [positionId, preis] of preise) {
        const position = positionen.find((p) => p.id === positionId)
        if (!position || position.einkaufChf === preis) continue
        position.einkaufChf = preis
        etwas = true
      }
      if (anteil.lieferkostenChf !== undefined && b.lieferkostenChf !== anteil.lieferkostenChf) {
        b.lieferkostenChf = anteil.lieferkostenChf
        b.lieferkostenGeschaetzt = anteil.lieferkostenGeschaetzt || undefined
        etwas = true
      }
      if (etwas) {
        b.einkaufAusRunde = lieferung.nummer
        b.einkaufAm = new Date().toISOString()
      }
      return etwas
    })
    if (geschrieben) gezaehlt++
  }
  return gezaehlt
}

/**
 * Die Bestellungen einer Runde, fuer die Zuordnung der Frachtkosten. Nur
 * Referenz und Id werden gebraucht – daraus bildet `kennungFuer` die
 * Paketkennung, unter der Bora seine Frachtkosten eintraegt.
 */
async function bestellungenDerRunde(lieferung: Lieferung): Promise<{ id: string; referenz: string }[]> {
  const raus: { id: string; referenz: string }[] = []
  for (const id of new Set([
    ...lieferung.bestellungIds,
    ...(lieferung.entfernt ?? []).map((a) => a.bestellungId),
  ])) {
    const roh = await hGet(TABELLE_BESTELLUNGEN, id)
    if (!roh) continue
    try {
      raus.push(JSON.parse(roh) as { id: string; referenz: string })
    } catch {
      continue
    }
  }
  return raus
}

async function entfernen(req: VercelRequest, res: VercelResponse) {
  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  const id = text(koerper.id, 40)
  if (!id) return res.status(400).json({ error: 'Id fehlt.' })

  const geloescht = await hDel(TABELLE, id)
  if (!geloescht) return res.status(404).json({ error: 'Lieferung nicht gefunden.' })
  return res.status(200).json({ ok: true })
}
