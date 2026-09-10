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
import { einkaufAusRunde, kennungFuer } from './_einkauf.js'
import type { Phase } from './_phasen.js'

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
  entfernt?: { bestellungId: string; grund: 'keineZusage' | 'aenderung' | 'storno'; zeitpunkt: string; notiz?: string }[]
  lieferkostenJePaket?: Record<string, number>
  lieferkostenChf?: number
  /** Zoll, Einfuhrsteuer, Gebuehren je Paket. */
  zollJePaket?: Record<string, number>
  /** Wann Bora die Sendung gemeldet hat. */
  versandAm?: string
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
    /*
     * Beim Einfrieren die Preise mitnehmen, die die Bestellungen schon
     * tragen. Eine Bestellung, die mangels Zusage aus einer frueheren Runde
     * fiel, hat Boras Preise auf ihren Positionen – die neue Runde darf ihn
     * nicht nochmals fragen. Ohne das hier starteten solche Runden mit
     * leeren Preisfeldern, und das Versprechen "naechste Bestellrunde ohne
     * neue Anfrage" war gelogen.
     */
    await preiseAusPositionen(lieferung)
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
  // Zoll, Einfuhrsteuer, Gebuehren: ein Betrag je Paket, Wochen nach der Ware.
  if (koerper.zollJePaket !== undefined) {
    lieferung.zollJePaket = lieferkosten(koerper.zollJePaket)
    geaendert = true
  }
  if (koerper.versandAm !== undefined) {
    lieferung.versandAm = koerper.versandAm === true ? new Date().toISOString() : undefined
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
   * DER RUNDENKLICK MIT KAESTCHEN.
   *
   * Ein Standwechsel der Runde ist ein Klick fuer viele Bestellungen – der
   * Betreiber sieht die Liste, waehlt ab, wer nicht mitgeht, und bestaetigt.
   * Das ist der eine Weg, auf dem die Runde Phasen setzt, und er ist
   * ausdruecklich sein Klick: Nichts springt von selbst.
   */
  let zurueckgeblieben: string[] = []
  if (koerper.status !== undefined) {
    const mitnehmen = koerper.mitnehmen !== undefined ? kennungen(koerper.mitnehmen) : undefined
    zurueckgeblieben = await rundenklick(lieferung, koerper.status as Status, mitnehmen)
  }

  lieferung.geaendert = new Date().toISOString()
  await hSet(TABELLE, id, JSON.stringify(lieferung))

  // Boras Preise, Fracht und Zoll auf die Bestellungen – siehe einkaufZurueckschreiben.
  const einkauf = await einkaufZurueckschreiben(lieferung)
  return res.status(200).json({ ok: true, lieferung, einkauf, zurueckgeblieben })
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

/** Setzt die Phase einer Bestellung – nur, wenn sie sich aendert. */
async function phaseSetzen(id: string, phase: Phase, dazu?: (b: Record<string, unknown>) => void): Promise<boolean> {
  return bestellungAendern(id, (b) => {
    let etwas = false
    if (b.status !== phase) {
      b.status = phase
      b.phaseSeit = new Date().toISOString()
      etwas = true
    }
    if (dazu) {
      const vorher = JSON.stringify(b)
      dazu(b)
      if (JSON.stringify(b) !== vorher) etwas = true
    }
    return etwas
  })
}

/**
 * Stellt eine Bestellung zurueck, die die Runde verlassen hat.
 *
 * "keineZusage" laesst die Phase, wo sie ist: Die Bestellung wartet auf ein
 * Ja, sonst hat sich nichts geaendert – ihre Einkaufspreise gelten weiter,
 * und die naechste Bestellrunde nimmt sie ohne neue Anfrage mit.
 *
 * "aenderung" fuehrt zurueck zur Auftragsklaerung. Die Einkaufspreise
 * bleiben AUCH hier stehen: Was sich aendert, entscheidet der Betreiber
 * erst danach im NetzEditor, und der Server loescht dann den Preis genau
 * der Netze, deren Masse oder Ausfuehrung anders sind (siehe
 * `einkaufBewahren` in bestellungen.ts). Frueher loeschte der Austritt
 * pauschal alle – auch die vier Netze, an denen sich nichts aenderte.
 */
async function bestellungZurueck(id: string, grund: 'keineZusage' | 'aenderung'): Promise<void> {
  if (grund === 'aenderung') await phaseSetzen(id, 'klaerung')
}

/**
 * Der Rundenklick: wer mitgeht, bekommt die Phase des neuen Stands; wer
 * zurueckbleibt, wird je nach Stand behandelt. Gibt die Zurueckgebliebenen
 * zurueck. Ohne Auswahl gehen alle mit.
 */
async function rundenklick(lieferung: Lieferung, stand: Status, mitnehmen?: string[]): Promise<string[]> {
  const dabei = [...lieferung.bestellungIds]
  const geht = mitnehmen ? dabei.filter((id) => mitnehmen.includes(id)) : dabei
  const bleibt = dabei.filter((id) => !geht.includes(id))
  const jetzt = new Date().toISOString()

  if (stand === 'angefragt') {
    // Im Entwurf abgewaehlt: einfach raus, ohne Spur – nichts war verbindlich.
    lieferung.bestellungIds = geht
    for (const id of geht) await phaseSetzen(id, 'kosten')
  } else if (stand === 'preise') {
    // Preise da, weiter: die Gewaehlten rechnen jetzt ihre Offerte.
    for (const id of geht) await phaseSetzen(id, 'offerte')
  } else if (stand === 'bestellt') {
    // Verbindlich bestellen: wer nicht mitgeht, faellt mit "keine Zusage"
    // heraus und behaelt seine Preise. Wer mitgeht, ist damit zugesagt.
    for (const id of bleibt) {
      lieferung.bestellungIds = lieferung.bestellungIds.filter((x) => x !== id)
      lieferung.entfernt = [
        ...(lieferung.entfernt ?? []).filter((a) => a.bestellungId !== id),
        { bestellungId: id, grund: 'keineZusage', zeitpunkt: jetzt },
      ]
    }
    for (const id of geht) {
      await phaseSetzen(id, 'bestellen', (b) => {
        if (!b.zusageAm) b.zusageAm = jetzt
      })
    }
  } else if (stand === 'geliefert') {
    // Ware da: wer fehlt, wartet auf die Nachlieferung und bleibt in "bestellen".
    for (const id of geht) await phaseSetzen(id, 'ausliefern', (b) => delete b.wareFehltSeit)
    for (const id of bleibt) await bestellungAendern(id, (b) => {
      b.wareFehltSeit = jetzt
      return true
    })
    // Zurueckgebliebene bleiben in der Runde – die Nachlieferung gehoert dazu.
    return bleibt
  }
  return bleibt
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

  /*
   * Zoll je Paket, unabhaengig von den Zeilen: Das Paket ist die Bestellung,
   * also ist der Betrag ihr Anteil. Der Bescheid kommt Wochen nach der Ware –
   * die Runde ist dann laengst geliefert, und die Zeilen spielen keine
   * Rolle mehr.
   */
  if (lieferung.zollJePaket) {
    for (const b of await bestellungenDerRunde(lieferung)) {
      if (!lieferung.bestellungIds.includes(b.id)) continue
      const zoll = lieferung.zollJePaket[kennungFuer(b)]
      if (typeof zoll !== 'number') continue
      const geschrieben = await bestellungAendern(b.id, (roh) => {
        if (roh.zollChf === zoll) return false
        roh.zollChf = zoll
        return true
      })
      if (geschrieben) gezaehlt++
    }
  }
  return gezaehlt
}

/**
 * Die Bestellungen einer Runde: Referenz und Id fuer die Paketkennung,
 * Positionen fuer die Preise beim Einfrieren.
 */
interface BestellBlick {
  id: string
  referenz: string
  positionen?: { id?: string; einkaufChf?: number }[]
}

async function bestellungenDerRunde(lieferung: Lieferung): Promise<BestellBlick[]> {
  const raus: BestellBlick[] = []
  for (const id of new Set([
    ...lieferung.bestellungIds,
    ...(lieferung.entfernt ?? []).map((a) => a.bestellungId),
  ])) {
    const roh = await hGet(TABELLE_BESTELLUNGEN, id)
    if (!roh) continue
    try {
      raus.push(JSON.parse(roh) as BestellBlick)
    } catch {
      continue
    }
  }
  return raus
}

/** Traegt bekannte Einkaufspreise von den Positionen in Zeilen ohne Preis. */
async function preiseAusPositionen(lieferung: Lieferung): Promise<void> {
  if (!lieferung.zeilen.some((z) => z.herkunft && typeof z.einkaufChf !== 'number')) return
  const bestellungen = await bestellungenDerRunde(lieferung)
  for (const zeile of lieferung.zeilen) {
    if (!zeile.herkunft || typeof zeile.einkaufChf === 'number') continue
    const b = bestellungen.find((x) => x.id === zeile.herkunft!.bestellungId)
    const p = b?.positionen?.find((x) => x.id === zeile.herkunft!.positionId)
    if (typeof p?.einkaufChf === 'number') zeile.einkaufChf = p.einkaufChf
  }
}

async function entfernen(req: VercelRequest, res: VercelResponse) {
  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  const id = text(koerper.id, 40)
  if (!id) return res.status(400).json({ error: 'Id fehlt.' })

  const geloescht = await hDel(TABELLE, id)
  if (!geloescht) return res.status(404).json({ error: 'Lieferung nicht gefunden.' })
  return res.status(200).json({ ok: true })
}
