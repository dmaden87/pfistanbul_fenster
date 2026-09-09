import type { VercelRequest, VercelResponse } from '@vercel/node'
/*
 * Die Endung .js gehoert hier hin, obwohl die Dateien .ts heissen. Das
 * Projekt ist ein ES-Modul ("type": "module"), und Node loest relative
 * Importe zur Laufzeit nur mit Endung auf. TypeScript rechnet .js auf die
 * .ts-Datei um. Ohne die Endung startet die Funktion auf Vercel gar nicht
 * erst - mit ERR_MODULE_NOT_FOUND, sichtbar nur als 500.
 */
import { hDel, hGet, hGetAll, hSet, inkrement, speicherBereit, SpeicherFehlt, TABELLE_BESTELLUNGEN, verfaellt } from './_speicher.js'
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
 * "offerte" liegt zwischen Eingang und Bestellung beim Lieferanten. Der
 * Schritt kam dazu, weil Sondermasse haeufiger sind als erwartet: Dort wird
 * zuerst ausgemessen und offeriert, und dazwischen vergehen Tage.
 */
export type Status = 'neu' | 'offerte' | 'bestellt' | 'erledigt' | 'geloescht'
const STATUS: Status[] = ['neu', 'offerte', 'bestellt', 'erledigt', 'geloescht']

/**
 * Woher der Eintrag kam. Die Seite legt immer "web" an; alles andere traegt
 * jemand im Adminbereich nach, weil die Bestellung ueber WhatsApp, Instagram
 * oder am Gartenzaun kam.
 */
export type Quelle = 'web' | 'whatsapp' | 'instagram' | 'telefon' | 'persoenlich'
const QUELLEN: Quelle[] = ['web', 'whatsapp', 'instagram', 'telefon', 'persoenlich']

interface Position {
  menge: number
  bezeichnung: string
  detail: string
  preisChf: number
  /** Nur beim Sondermass gesetzt. Als Zahl, damit daraus ein Auftrag entstehen kann. */
  breiteCm?: number
  hoeheCm?: number
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
  zahlung: 'uebergabe' | 'online'
  zahlungswunsch: boolean
  summeChf: number
  quelle?: Quelle
  /** Gesetzt, sobald vor Ort ausgemessen wurde. */
  ausgemessenAm?: string
  /** Gesetzt, sobald die Offerte raus ist. */
  offerteAm?: string
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
  return Math.min(600, Math.round(n))
}

function positionen(wert: unknown): Position[] {
  if (!Array.isArray(wert)) return []
  return wert.slice(0, 30).map((p) => {
    const roh = p as Record<string, unknown>
    const position: Position = {
      menge: Math.min(99, Math.max(1, Math.round(zahl(roh?.menge)) || 1)),
      bezeichnung: text(roh?.bezeichnung, 120),
      detail: text(roh?.detail, 160),
      preisChf: zahl(roh?.preisChf),
    }
    const breite = masszahl(roh?.breiteCm)
    const hoehe = masszahl(roh?.hoeheCm)
    if (breite !== undefined) position.breiteCm = breite
    if (hoehe !== undefined) position.hoeheCm = hoehe
    return position
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
  const rest = b.summeChf - positionenSumme(b.positionen)
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
  const status = vonHand && STATUS.includes(roh.status as Status) ? (roh.status as Status) : 'neu'
  const quelle = vonHand && QUELLEN.includes(roh.quelle as Quelle) ? (roh.quelle as Quelle) : 'web'
  const netze = positionen(roh.positionen)
  const montageChf = zahl(roh.montageChf)

  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    referenz: text(roh.referenz, 40),
    art,
    status,
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

  const bestellung = JSON.parse(vorhanden) as Bestellung
  let geaendert = false

  if (koerper.status !== undefined) {
    if (!STATUS.includes(koerper.status as Status)) return res.status(400).json({ error: 'Unbekannter Status.' })
    bestellung.status = koerper.status as Status
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
  if (netzeNeu || montageNeu) {
    // Die Montage MUSS vor dem Austausch der Positionen bestimmt werden. Bei
    // Alteintraegen ohne eigenes Feld ergibt sie sich aus der Differenz
    // zwischen Summe und Positionen – wird danach gerechnet, bezieht sich die
    // Differenz auf die neuen Netze und ist Unsinn. Bei mehr Netzen als
    // vorher wird sie sogar negativ und faellt auf 0: Die Montagepauschale
    // waere spurlos aus der Bestellung verschwunden.
    const montage = montageNeu ? zahl(koerper.montageChf) : montageBetrag(bestellung)
    if (netzeNeu) bestellung.positionen = positionen(koerper.positionen)
    bestellung.montageChf = montage
    bestellung.summeChf = Math.round((positionenSumme(bestellung.positionen) + montage) * 100) / 100
    geaendert = true
  }

  if (!geaendert) return res.status(400).json({ error: 'Es war nichts zu ändern.' })

  bestellung.geaendert = new Date().toISOString()
  await hSet(TABELLE, id, JSON.stringify(bestellung))

  return res.status(200).json({ ok: true, bestellung })
}
