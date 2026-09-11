import type { VercelRequest, VercelResponse } from '@vercel/node'
/*
 * Die Endung .js gehoert hier hin, obwohl die Dateien .ts heissen. Das
 * Projekt ist ein ES-Modul ("type": "module"), und Node loest relative
 * Importe zur Laufzeit nur mit Endung auf. TypeScript rechnet .js auf die
 * .ts-Datei um. Ohne die Endung startet die Funktion auf Vercel gar nicht
 * erst - mit ERR_MODULE_NOT_FOUND, sichtbar nur als 500.
 */
import {
  hDel,
  hGet,
  hGetAll,
  hSet,
  inkrement,
  speicherBereit,
  SpeicherFehlt,
  TABELLE_BESTELLUNGEN,
  TABELLE_LIEFERUNGEN,
  verfaellt,
} from './_speicher.js'
import { PHASEN, startPhase, vereinheitlichen as phaseVereinheitlichen, type Phase, type RundenBlick } from './_phasen.js'
import { abmeldeCookie, angemeldet, anmeldeCookie, passwortGesetzt, passwortStimmt } from './_sitzung.js'

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

const TABELLE = TABELLE_BESTELLUNGEN

/** Nach so vielen Fehlversuchen ist für eine Viertelstunde Ruhe. */
const MAX_VERSUCHE = 8
const SPERRE_SEKUNDEN = 900

/**
 * Der Status IST die Phase des Betreibers – siehe api/_phasen.ts. Die
 * Abbildung alter Werte geschieht dort, beim Lesen, mit Blick auf die
 * Runden: Eine gestern "neue" Bestellung konnte laengst bei Bora stecken.
 */
export type Status = Phase
const STATUS: Status[] = PHASEN

/** Die Runden, soweit die Abbildung sie braucht. Eine kaputte Zeile zaehlt nicht. */
async function rundenBlick(): Promise<RundenBlick[]> {
  const alle = await hGetAll(TABELLE_LIEFERUNGEN)
  const raus: RundenBlick[] = []
  for (const wert of Object.values(alle)) {
    try {
      const l = JSON.parse(wert) as RundenBlick
      if (Array.isArray(l.bestellungIds)) raus.push(l)
    } catch {
      continue
    }
  }
  return raus
}

export function vereinheitlichen(b: Bestellung, runden: RundenBlick[]): Bestellung {
  return phaseVereinheitlichen(b, runden)
}

/**
 * Woher der Eintrag kam. Die Seite legt immer "web" an; alles andere traegt
 * jemand im Adminbereich nach, weil die Bestellung ueber WhatsApp, Instagram
 * oder am Gartenzaun kam.
 */
export type Quelle = 'web' | 'whatsapp' | 'instagram' | 'telefon' | 'persoenlich'
const QUELLEN: Quelle[] = ['web', 'whatsapp', 'instagram', 'telefon', 'persoenlich']

interface Position {
  /** Kennung der Position, vom Server vergeben. Siehe src/types/index.ts. */
  id?: string
  menge: number
  bezeichnung: string
  detail: string
  preisChf: number
  /** Rahmenmass in cm, auf den Millimeter genau. */
  breiteCm?: number
  hoeheCm?: number
  /** Was der Produzent wissen muss. Frei gehalten, die Werteliste steht im Browser. */
  rahmendicke?: string
  rahmenfarbe?: string
  netzfarbe?: string
  mechanismus?: string
  oeffnung?: string
  /** Verweis in den Katalog, damit der Auftrag ein Set in Netze aufloesen kann. */
  typId?: string
  setId?: string
  /**
   * Boras Preis je Stueck. Kommt NIE vom Browser: Er wird von der
   * Lieferrunde zurueckgeschrieben (api/lieferungen.ts) und beim Aendern der
   * Netze vom Server je Kennung bewahrt – siehe `einkaufBewahren`.
   */
  einkaufChf?: number
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
  /**
   * Die Montagepauschale als eigener Betrag. Fehlt bei Alteintraegen; dort
   * steckt sie in der Differenz zwischen summeChf und den Positionen. Sie
   * muss separat stehen, sonst verschluckt jede Aenderung an den Netzen die
   * Montage - die Summe wuerde stillschweigend kleiner.
   */
  montageChf?: number
  rabattChf?: number
  rabattText?: string
  zahlung: 'uebergabe' | 'online'
  zahlungswunsch: boolean
  summeChf: number
  quelle?: Quelle
  /** Gesetzt, sobald vor Ort ausgemessen wurde. */
  ausgemessenAm?: string
  /** Gesetzt, sobald die Offerte raus ist. */
  offerteAm?: string
  preiseFestgelegtAm?: string
  /** Uebergabe und Zahlung. Beide gesetzt heisst abgeschlossen. */
  ausgeliefertAm?: string
  bezahltAm?: string
  zahlungKommentar?: string
  /** Die Felder der Phasen – siehe src/types/index.ts. */
  phaseSeit?: string
  klaerungTermin?: string
  zusageAm?: string
  montageTermin?: string
  bestelltAm?: string
  versandAm?: string
  paket?: string
  absageGrund?: AbsageGrund
  absageAm?: string
  zollChf?: number
  lieferkostenChf?: number
  lieferkostenGeschaetzt?: boolean
  einkaufAusRunde?: string
  einkaufAm?: string
  /** Interne Notiz. Sieht die Kundschaft nie. */
  notiz?: string
  /**
   * Setzt allein stripe-webhook.ts, nachdem Stripe den Ausgang der Zahlung
   * gemeldet hat. Beim Anlegen fehlt das Feld - eine Bestellung gilt erst
   * als bezahlt, wenn es jemand bestaetigt, der es wissen kann.
   */
  bezahlung?: { status: 'bezahlt' | 'abgebrochen'; betragChf: number; zeitpunkt: string; sitzung: string }
}

/* --- Eingaben zurechtstutzen ------------------------------------------------ */

const ABSAGE_GRUENDE = ['spam', 'doppelt', 'keineAntwort', 'kunde', 'zuTeuer', 'storno'] as const
type AbsageGrund = (typeof ABSAGE_GRUENDE)[number]

function absageGrund(wert: unknown): AbsageGrund | undefined {
  return ABSAGE_GRUENDE.includes(wert as AbsageGrund) ? (wert as AbsageGrund) : undefined
}

/** Ein ISO-Datum (JJJJ-MM-TT, mit oder ohne Zeit) oder nichts. Leer loescht. */
function datum(wert: unknown): string | undefined {
  if (typeof wert !== 'string') return undefined
  const t = wert.trim()
  if (!t) return undefined
  return /^\d{4}-\d{2}-\d{2}(T[0-9:.]+Z?)?$/.test(t) && !Number.isNaN(Date.parse(t)) ? t : undefined
}

function text(wert: unknown, max: number): string {
  return typeof wert === 'string' ? wert.trim().slice(0, max) : ''
}

function zahl(wert: unknown): number {
  const n = typeof wert === 'number' ? wert : Number(wert)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

/**
 * Ein Mass in Zentimetern, oder nichts. Anders als `zahl` liefert das hier
 * `undefined` statt 0: Ein Netz mit "0 cm Breite" waere eine Falschangabe,
 * ein Netz ohne Massangabe ist einfach eines aus dem Katalog.
 */
function masszahl(wert: unknown): number | undefined {
  if (wert === undefined || wert === null || wert === '') return undefined
  const n = typeof wert === 'number' ? wert : Number(wert)
  if (!Number.isFinite(n) || n <= 0) return undefined
  // Eine Nachkommastelle, also auf den Millimeter. Fensteroeffnungen messen
  // sich nicht in ganzen Zentimetern: 128.6 auf 129 gerundet ist ein Netz,
  // das nicht passt.
  return Math.min(600, Math.round(n * 10) / 10)
}

function positionen(wert: unknown): Position[] {
  if (!Array.isArray(wert)) return []
  return wert.slice(0, 30).map((p) => {
    const roh = p as Record<string, unknown>
    const position: Position = {
      // Vorhandene Kennung behalten, sonst eine vergeben. Sie darf sich nie
      // aendern: Eine Lieferrunde merkt sich darueber, welches Netz sie nicht
      // enthaelt.
      id: text(roh?.id, 40) || `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      menge: Math.min(99, Math.max(1, Math.round(zahl(roh?.menge)) || 1)),
      bezeichnung: text(roh?.bezeichnung, 120),
      detail: text(roh?.detail, 160),
      preisChf: zahl(roh?.preisChf),
    }
    const breite = masszahl(roh?.breiteCm)
    const hoehe = masszahl(roh?.hoeheCm)
    if (breite !== undefined) position.breiteCm = breite
    if (hoehe !== undefined) position.hoeheCm = hoehe
    // Die Angaben fuer den Produzenten und die Katalogverweise. Was leer
    // ankommt, bleibt weg: Der Bestellauftrag prueft spaeter, ob alles da
    // ist, und meldet die Luecke, statt sie mit einer Annahme zu fuellen.
    for (const feld of ['rahmendicke', 'rahmenfarbe', 'netzfarbe', 'mechanismus', 'oeffnung', 'typId', 'setId'] as const) {
      const wert = text(roh?.[feld], 40)
      if (wert) position[feld] = wert
    }
    return position
  })
}

/** Die Felder, an denen Boras Preis haengt. Aendert sich eines, gilt er nicht mehr. */
const PREISRELEVANT = ['breiteCm', 'hoeheCm', 'rahmendicke', 'rahmenfarbe', 'netzfarbe', 'mechanismus', 'typId', 'setId'] as const

/**
 * Traegt Boras Einkaufspreise von den alten auf die neuen Positionen.
 *
 * Der Browser schickt beim "Netze speichern" die Positionen ohne
 * Einkaufspreis – er kennt sie zwar, darf sie aber nicht setzen, denn die
 * einzige Quelle dafuer ist die Lieferrunde. Wuerde der Server die neuen
 * Positionen einfach uebernehmen, waere jeder korrigierte Verkaufspreis das
 * Ende der Marge: alle einkaufChf weg, "Datensatz unvollstaendig", und die
 * naechste Runde muesste Bora dieselbe Frage nochmals stellen.
 *
 * Bewahrt wird JE POSITION, nicht je Bestellung: Wer ein fuenftes Netz
 * dazunimmt, aendert die vier bepreisten nicht. Und bewahrt wird nur, wenn
 * die preisrelevanten Angaben gleich geblieben sind – ein Netz mit neuen
 * Massen ist fuer Bora ein anderes Netz, und sein alter Preis waere eine
 * Zahl zu Massen, die es nicht mehr gibt.
 */
function einkaufBewahren(alt: Position[], neu: Position[]): Position[] {
  const vorher = new Map(alt.filter((p) => p.id).map((p) => [p.id as string, p]))
  return neu.map((p) => {
    const alte = p.id ? vorher.get(p.id) : undefined
    if (!alte || typeof alte.einkaufChf !== 'number') return p
    const gleich = PREISRELEVANT.every((feld) => alte[feld] === p[feld])
    return gleich ? { ...p, einkaufChf: alte.einkaufChf } : p
  })
}

/** Was die Netze zusammen kosten, ohne Montage. */
function positionenSumme(liste: Position[]): number {
  return Math.round(liste.reduce((summe, p) => summe + p.preisChf * p.menge, 0) * 100) / 100
}

/**
 * Die Montagepauschale einer Bestellung. Steht sie als eigenes Feld da, gilt
 * dieses. Bei Alteintraegen aus der Zeit davor bleibt nur der Rueckschluss
 * aus der Differenz - der stimmt, weil die Lieferung in der Siedlung nichts
 * kostet und ausser Netzen und Montage nichts in die Summe eingeht.
 */
function montageBetrag(b: Bestellung): number {
  if (typeof b.montageChf === 'number') return b.montageChf
  const rest = b.summeChf - positionenSumme(b.positionen) + (b.rabattChf ?? 0)
  return rest > 0 ? Math.round(rest * 100) / 100 : 0
}

/**
 * Baut aus dem Rohkoerper eine Bestellung.
 *
 * `vonHand` unterscheidet die beiden Wege, auf denen etwas hier ankommt:
 *
 * - Vom Bestellformular (offen, ohne Anmeldung). Dann sind Status, Quelle und
 *   Eingangszeitpunkt nicht verhandelbar, und ohne E-Mail geht es nicht - die
 *   Bestaetigung muss irgendwohin.
 * - Aus dem Adminbereich (nur angemeldet). Dann darf jemand Status und Quelle
 *   setzen, und statt der E-Mail genuegt eine Telefonnummer: Wer ueber
 *   WhatsApp bestellt, hat oft keine hinterlegt, und die Bestellung deswegen
 *   abzulehnen waere albern.
 */
function ausRohdaten(roh: Record<string, unknown>, vonHand = false): Bestellung | null {
  const art = ARTEN.includes(roh.art as Art) ? (roh.art as Art) : 'bestellung'
  const k = (roh.kunde ?? {}) as Record<string, unknown>
  const name = text(k.name, 120)
  const email = text(k.email, 160)
  const telefon = text(k.telefon, 40)
  // Ohne Name und Rueckweg ist die Bestellung nicht zuzuordnen – dann lieber
  // ablehnen, als eine unbrauchbare Zeile in der Tabelle zu haben.
  if (!name) return null
  if (!email && !(vonHand && telefon)) return null

  const jetzt = new Date().toISOString()
  /*
   * Der Startpunkt haengt an der Art.
   *
   * Eine Bestellung aus dem Warenkorb ist bereits zugesagt: Der Kunde hat an
   * der Kasse zugesagt, der Preis stand im Katalog, und die Bestaetigung geht
   * automatisch raus. Sie braucht keine Offerte und wartet auf nichts – sie
   * wartet nur darauf, beim Lieferanten bestellt zu werden. Stuende sie unter
   * "neu", muesste jemand sie jeden Tag von Hand weiterschieben, ohne dass
   * dabei etwas entschieden wird.
   *
   * Eine Sondermass-Anfrage dagegen ist "neu": Da ist noch nichts zugesagt,
   * nicht einmal ein Preis.
   */
  const status = vonHand && STATUS.includes(roh.status as Status) ? (roh.status as Status) : startPhase(art)
  const quelle = vonHand && QUELLEN.includes(roh.quelle as Quelle) ? (roh.quelle as Quelle) : 'web'
  const netze = positionen(roh.positionen)
  const montageChf = zahl(roh.montageChf)

  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    referenz: text(roh.referenz, 40),
    art,
    status,
    // Seit wann in dieser Phase – und zugleich das Merkmal, an dem die
    // Abbildung alter Werte eine heutige Bestellung erkennt.
    phaseSeit: jetzt,
    // Katalogware von Hand: Die Preise stehen im Katalog, sie sind festgelegt.
    ...(vonHand && roh.preiseFestgelegt === true ? { preiseFestgelegtAm: jetzt } : {}),
    eingang: jetzt,
    geaendert: jetzt,
    kunde: {
      name,
      email,
      telefon,
      strasse: text(k.strasse, 140),
      plz: text(k.plz, 12),
      ort: text(k.ort, 80),
      bemerkung: text(k.bemerkung, 1200),
    },
    positionen: netze,
    montage: roh.montage === true,
    montageChf,
    zahlung: roh.zahlung === 'online' ? 'online' : 'uebergabe',
    zahlungswunsch: roh.zahlungswunsch === true,
    // Von Hand erfasst wird die Summe hier gerechnet und nicht uebernommen:
    // Wer die Netze eintippt, soll nicht zusaetzlich den Betrag ausrechnen.
    summeChf: vonHand ? Math.round((positionenSumme(netze) + montageChf) * 100) / 100 : zahl(roh.summeChf),
    quelle,
    notiz: text(roh.notiz, 1200) || undefined,
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
    if (req.method === 'POST' && aktion === 'erfassen') return await erfassen(req, res)
    if (req.method === 'POST') return await anlegen(req, res)
    if (req.method === 'GET') return await auflisten(req, res)
    if (req.method === 'PATCH') return await aendern(req, res)
    if (req.method === 'DELETE') return await entfernen(req, res)

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE')
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

/**
 * Legt eine Bestellung von Hand an – fuer alles, was ueber WhatsApp,
 * Instagram oder am Gartenzaun hereinkommt.
 *
 * Bewusst ein eigener Einstieg und nicht ein Zusatzfeld am offenen POST: Der
 * offene Weg ist die Angriffsflaeche der Seite, und er soll genau eine Sache
 * koennen. Wer hier Status und Quelle setzen darf, muss angemeldet sein.
 */
async function erfassen(req: VercelRequest, res: VercelResponse) {
  if (!angemeldet(req.headers.cookie)) return nichtAngemeldet(res)

  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  const bestellung = ausRohdaten(koerper as Record<string, unknown>, true)
  if (!bestellung) return res.status(400).json({ error: 'Es fehlt der Name oder ein Rückweg (E-Mail oder Telefon).' })

  await hSet(TABELLE, bestellung.id, JSON.stringify(bestellung))
  return res.status(201).json({ ok: true, bestellung })
}

async function auflisten(req: VercelRequest, res: VercelResponse) {
  if (!angemeldet(req.headers.cookie)) return nichtAngemeldet(res)

  const [alle, runden] = await Promise.all([hGetAll(TABELLE), rundenBlick()])
  const liste: Bestellung[] = []
  for (const wert of Object.values(alle)) {
    try {
      liste.push(vereinheitlichen(JSON.parse(wert) as Bestellung, runden))
    } catch {
      // Eine kaputte Zeile darf nicht die ganze Tabelle unbrauchbar machen.
    }
  }
  liste.sort((a, b) => b.eingang.localeCompare(a.eingang))

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ bestellungen: liste })
}

/**
 * Loescht einen Eintrag endgueltig. Nicht dasselbe wie der Status
 * "geloescht": Der bedeutet abgesagt und bleibt zum Nachschlagen stehen.
 * Hier verschwinden die Daten wirklich – das braucht es, damit wir das
 * Loeschversprechen aus der Datenschutzerklaerung auch halten koennen.
 */
async function entfernen(req: VercelRequest, res: VercelResponse) {
  if (!angemeldet(req.headers.cookie)) return nichtAngemeldet(res)

  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  const id = text(koerper.id, 40)
  if (!id) return res.status(400).json({ error: 'Id fehlt.' })

  const geloescht = await hDel(TABELLE, id)
  if (!geloescht) return res.status(404).json({ error: 'Bestellung nicht gefunden.' })

  return res.status(200).json({ ok: true })
}

/**
 * Aendert eine bestehende Bestellung.
 *
 * Uebernommen wird nur, was hier ausdruecklich aufgezaehlt ist. Ein
 * Zusammenfuehren von "allem, was ankommt" waere kuerzer und waere falsch:
 * `bezahlung` gehoert dazu, und dieses Feld setzt allein stripe-webhook.ts.
 * Kaeme es von hier aus durch, koennte ein Fehlklick eine Bestellung als
 * bezahlt markieren, die niemand bezahlt hat - und danach wuerde sie
 * ausgeliefert.
 *
 * Ebenfalls nicht aenderbar: id, referenz, eingang, art. Das ist die
 * Identitaet des Eintrags; wer sie braucht, legt einen neuen an.
 */
async function aendern(req: VercelRequest, res: VercelResponse) {
  if (!angemeldet(req.headers.cookie)) return nichtAngemeldet(res)

  const koerper = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body) ?? {}
  const id = text(koerper.id, 40)
  if (!id) return res.status(400).json({ error: 'Id fehlt.' })

  const vorhanden = await hGet(TABELLE, id)
  if (!vorhanden) return res.status(404).json({ error: 'Bestellung nicht gefunden.' })

  const runden = await rundenBlick()
  const bestellung = vereinheitlichen(JSON.parse(vorhanden) as Bestellung, runden)
  let geaendert = false
  const jetzt = new Date().toISOString()

  if (koerper.status !== undefined) {
    if (!STATUS.includes(koerper.status as Status)) return res.status(400).json({ error: 'Unbekannter Status.' })
    const neu = koerper.status as Status
    if (neu !== bestellung.status) {
      const vorher = bestellung.status
      bestellung.status = neu
      // Seit wann sie in dieser Phase steht – fuer "seit n Tagen" auf der Karte.
      bestellung.phaseSeit = jetzt
      if (neu === 'abgesagt') {
        bestellung.absageAm = jetzt
        bestellung.absageGrund = absageGrund(koerper.absageGrund) ?? bestellung.absageGrund
      } else if (neu === 'offerte' && vorher === 'zusage') {
        // Nachbessern: Die Offerte geht nochmals raus, der alte Haken waere
        // gelogen – und mit ihm stuende sie beim Lesen wieder in "zusage".
        delete bestellung.offerteAm
      } else {
        // Wiederoeffnen: Die Absage ist Geschichte, nicht Zustand.
        delete bestellung.absageAm
        delete bestellung.absageGrund
      }
    }
    geaendert = true
  } else if (koerper.absageGrund !== undefined && bestellung.status === 'abgesagt') {
    bestellung.absageGrund = absageGrund(koerper.absageGrund)
    geaendert = true
  }

  /*
   * Die Felder der Phasen. Datumsfelder setzt ein ISO-Datum, ein leerer
   * String loescht; die Haken folgen dem Muster true → jetzt, false → weg.
   */
  if (koerper.klaerungTermin !== undefined) {
    bestellung.klaerungTermin = datum(koerper.klaerungTermin)
    geaendert = true
  }
  if (koerper.montageTermin !== undefined) {
    bestellung.montageTermin = datum(koerper.montageTermin)
    geaendert = true
  }
  if (koerper.zusage !== undefined) {
    bestellung.zusageAm = koerper.zusage === true ? jetzt : undefined
    geaendert = true
  }
  if (koerper.bestellt !== undefined) {
    bestellung.bestelltAm = koerper.bestellt === true ? jetzt : undefined
    geaendert = true
  }
  if (koerper.versand !== undefined) {
    bestellung.versandAm = koerper.versand === true ? jetzt : undefined
    geaendert = true
  }
  if (koerper.paket !== undefined) {
    bestellung.paket = text(koerper.paket, 40) || undefined
    geaendert = true
  }
  /*
   * Boras Kosten, von Hand vom Talon abgetippt: je Position der Stueckpreis,
   * dazu Fracht und Zoll fuer den ganzen Auftrag. Was nicht mitkommt,
   * bleibt; null loescht. Der Stueckpreis haengt an der Positionskennung,
   * nicht am Listenplatz – ein spaeter geloeschtes Netz verschiebt nichts.
   */
  if (koerper.einkauf !== undefined && typeof koerper.einkauf === 'object' && koerper.einkauf !== null) {
    const e = koerper.einkauf as Record<string, unknown>
    const jePosition = (e.jePosition ?? {}) as Record<string, unknown>
    for (const [positionId, wert] of Object.entries(jePosition)) {
      const position = bestellung.positionen.find((p) => p.id === positionId)
      if (!position) continue
      if (wert === null) delete position.einkaufChf
      else position.einkaufChf = zahl(wert)
    }
    if (e.lieferkostenChf !== undefined) {
      bestellung.lieferkostenChf = e.lieferkostenChf === null ? undefined : zahl(e.lieferkostenChf)
      // Von Hand eingetragen ist exakt, nicht geschaetzt.
      delete bestellung.lieferkostenGeschaetzt
    }
    if (e.zollChf !== undefined) bestellung.zollChf = e.zollChf === null ? undefined : zahl(e.zollChf)
    bestellung.einkaufAm = jetzt
    geaendert = true
  }
  if (koerper.zahlungKommentar !== undefined) {
    bestellung.zahlungKommentar = text(koerper.zahlungKommentar, 400) || undefined
    geaendert = true
  }

  if (koerper.quelle !== undefined) {
    if (!QUELLEN.includes(koerper.quelle as Quelle)) return res.status(400).json({ error: 'Unbekannte Quelle.' })
    bestellung.quelle = koerper.quelle as Quelle
    geaendert = true
  }

  // Die beiden Haken im Offert-Abschnitt. Gespeichert wird ein Zeitpunkt und
  // nicht ein Ja/Nein: Dieselbe Aussage, dazu die Antwort auf "seit wann
  // liegt das eigentlich?" – die Frage kommt beim Nachfassen immer.
  if (koerper.ausgemessen !== undefined) {
    bestellung.ausgemessenAm = koerper.ausgemessen === true ? new Date().toISOString() : undefined
    geaendert = true
  }
  if (koerper.offerteVersendet !== undefined) {
    bestellung.offerteAm = koerper.offerteVersendet === true ? new Date().toISOString() : undefined
    geaendert = true
  }
  if (koerper.preiseFestgelegt !== undefined) {
    bestellung.preiseFestgelegtAm = koerper.preiseFestgelegt === true ? jetzt : undefined
    geaendert = true
  }

  /*
   * Uebergabe und Zahlung. Auch hier Zeitpunkte statt Ja/Nein, aus demselben
   * Grund – und weil eine Rentabilitaetsrechnung spaeter wissen will, wie
   * lange zwischen Bestellung und Geld lag.
   *
   * "bezahlt" wird hier von Hand gesetzt, fuer die Uebergabe an der Tuer.
   * Die Onlinezahlung traegt sich in `bezahlung` selbst ein; das darf von
   * hier aus niemand anfassen, denn was Stripe abgebucht hat, entscheidet
   * nicht der Adminbereich.
   */
  if (koerper.ausgeliefert !== undefined) {
    bestellung.ausgeliefertAm = koerper.ausgeliefert === true ? new Date().toISOString() : undefined
    geaendert = true
  }
  if (koerper.bezahlt !== undefined) {
    bestellung.bezahltAm = koerper.bezahlt === true ? new Date().toISOString() : undefined
    geaendert = true
  }

  if (koerper.notiz !== undefined) {
    bestellung.notiz = text(koerper.notiz, 1200) || undefined
    geaendert = true
  }

  if (koerper.montage !== undefined) {
    bestellung.montage = koerper.montage === true
    geaendert = true
  }

  // Netze und Montagebetrag haengen an der Summe. Wird eines davon
  // angefasst, wird die Summe neu gerechnet - sonst stuende in der Liste ein
  // Betrag, der zu den sichtbaren Positionen nicht mehr passt.
  const netzeNeu = koerper.positionen !== undefined
  const montageNeu = koerper.montageChf !== undefined
  const rabattNeu = koerper.rabattChf !== undefined || koerper.rabattText !== undefined
  if (netzeNeu || montageNeu || rabattNeu) {
    // Die Montage MUSS vor dem Austausch der Positionen bestimmt werden. Bei
    // Alteintraegen ohne eigenes Feld ergibt sie sich aus der Differenz
    // zwischen Summe und Positionen – wird danach gerechnet, bezieht sich die
    // Differenz auf die neuen Netze und ist Unsinn. Bei mehr Netzen als
    // vorher wird sie sogar negativ und faellt auf 0: Die Montagepauschale
    // waere spurlos aus der Bestellung verschwunden.
    const montage = montageNeu ? zahl(koerper.montageChf) : montageBetrag(bestellung)
    if (netzeNeu) bestellung.positionen = einkaufBewahren(bestellung.positionen, positionen(koerper.positionen))
    bestellung.montageChf = montage
    /*
     * Der Rabatt auf die ganze Bestellung: nie mehr als Netze und Montage
     * zusammen, ohne Betrag gar nicht da – und dann auch ohne Wort.
     */
    if (koerper.rabattChf !== undefined) {
      const rabatt = Math.min(zahl(koerper.rabattChf), positionenSumme(bestellung.positionen) + montage)
      bestellung.rabattChf = rabatt > 0 ? rabatt : undefined
    }
    if (koerper.rabattText !== undefined) bestellung.rabattText = text(koerper.rabattText, 80) || undefined
    if (!bestellung.rabattChf) delete bestellung.rabattText
    bestellung.summeChf = Math.round((positionenSumme(bestellung.positionen) + montage - (bestellung.rabattChf ?? 0)) * 100) / 100
    geaendert = true
  }

  if (!geaendert) return res.status(400).json({ error: 'Es war nichts zu ändern.' })

  bestellung.geaendert = new Date().toISOString()
  await hSet(TABELLE, id, JSON.stringify(bestellung))

  return res.status(200).json({ ok: true, bestellung })
}
