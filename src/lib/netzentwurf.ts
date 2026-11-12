import type { BestellPosition, OpeningDirection } from '../types'
import { STANDARD, type Mechanismus, type Netzart, type Netzfarbe, type Rahmenfarbe } from '../data/produktion'
import { betragOderNull, formatSize } from './format'
import { netsInSet, setById, typeById } from '../data/catalog'
import { gerechneterPreis, verkaufspreisFuer } from '../components/admin/hilfen'

/*
 * Netze einer Bestellung bearbeiten – die Regeln ohne Oberflaeche.
 *
 * WARUM HIER: Der Netz-Editor im Web-Admin (NetzEditor.tsx) und die native
 * App (app/) bearbeiten dieselben Netze. Wie aus dem Entwurf eine Position
 * wird, welcher Preis gespeichert wird und was ein gueltiges Netz ist, darf
 * nur an einer Stelle stehen – sonst rechnet die App anders als das Web.
 * Getestet in bau/netzentwurf-test.mjs. Die ausfuehrliche Begruendung der
 * Preisregel steht im Kopf von NetzEditor.tsx.
 */

export interface Entwurf {
  menge: string
  bezeichnung: string
  breiteCm: string
  hoeheCm: string
  preisChf: string
  rahmendicke: string
  rahmenfarbe: Rahmenfarbe
  netzfarbe: Netzfarbe
  netzart: Netzart
  mechanismus: Mechanismus
  oeffnung: OpeningDirection | ''
  typId?: string
  setId?: string
  /**
   * Die Kennung MUSS mit. Ohne sie vergibt der Server beim Speichern neue
   * Kennungen, und damit reisst alles ab, was an der alten haengt: die
   * eingefrorenen Zeilen der Lieferrunde (herkunft.positionId) und Boras
   * Einkaufspreis, den der Server nur je Kennung wiederfindet. Ein
   * korrigierter Verkaufspreis loeschte so die ganze Marge – still.
   */
  id?: string
}

/** Der Wert des Katalog-Dropdowns: Typ oder Set. */
export function katalogWert(e: Entwurf): string {
  return e.setId ? `set:${e.setId}` : e.typId ? `typ:${e.typId}` : ''
}

/** Fuellt einen Entwurf aus dem Katalog. Leer, wenn nichts gewaehlt ist. */
export function ausKatalog(wert: string, vorher: Entwurf): Entwurf {
  const [art, id] = wert.split(':')
  if (art === 'typ') {
    const typ = typeById(id)
    if (!typ) return { ...leer(), menge: vorher.menge }
    return {
      ...leer(),
      menge: vorher.menge,
      id: vorher.id,
      typId: typ.id,
      bezeichnung: typ.label,
      breiteCm: String(typ.widthCm),
      hoeheCm: String(typ.heightCm),
      preisChf: String(typ.priceChf),
      rahmendicke: typ.rahmendicke,
      oeffnung: typ.opening,
    }
  }
  if (art === 'set') {
    const set = setById(id)
    if (!set) return { ...leer(), menge: vorher.menge }
    return { ...leer(), menge: vorher.menge, id: vorher.id, setId: set.id, bezeichnung: set.label, preisChf: String(set.priceChf) }
  }
  return { ...leer(), menge: vorher.menge, id: vorher.id }
}

export function zuEntwurf(p: BestellPosition): Entwurf {
  return {
    id: p.id,
    menge: String(p.menge),
    bezeichnung: p.bezeichnung,
    breiteCm: p.breiteCm ? String(p.breiteCm) : '',
    hoeheCm: p.hoeheCm ? String(p.hoeheCm) : '',
    preisChf: String(p.preisChf),
    rahmendicke: p.rahmendicke ?? STANDARD.rahmendicke,
    rahmenfarbe: p.rahmenfarbe ?? STANDARD.rahmenfarbe,
    netzfarbe: p.netzfarbe ?? STANDARD.netzfarbe,
    netzart: p.netzart ?? STANDARD.netzart,
    mechanismus: p.mechanismus ?? STANDARD.mechanismus,
    // Die Oeffnungsrichtung wird NICHT vorbelegt. Sie sieht man nur am
    // Fenster, und ein falsch geratener Standard liefert die halbe Runde
    // spiegelverkehrt.
    oeffnung: p.oeffnung ?? '',
    typId: p.typId,
    setId: p.setId,
  }
}

export function leer(): Entwurf {
  return {
    menge: '1',
    bezeichnung: '',
    breiteCm: '',
    hoeheCm: '',
    preisChf: '',
    rahmendicke: STANDARD.rahmendicke,
    rahmenfarbe: STANDARD.rahmenfarbe,
    netzfarbe: STANDARD.netzfarbe,
    netzart: STANDARD.netzart,
    mechanismus: STANDARD.mechanismus,
    oeffnung: '',
  }
}

/*
 * Masse und Mengen lesen dieselbe Schreibweise wie die Betraege: Wer
 * "1'234" tippt, meint tausendzweihundertvierunddreissig - bei Millimetern
 * genauso wie bei Franken. Hier stand `Number(w.replace(',','.'))`, und das
 * machte aus einem Apostroph lautlos eine Null.
 */
const zahl = betragOderNull

/** Auf den Millimeter, nicht auf den Zentimeter: 128.6 gerundet passt nicht. */
export function masszahl(wert: string): number | undefined {
  const n = zahl(wert)
  return n > 0 ? Math.min(600, Math.round(n * 10) / 10) : undefined
}

export function ausEntwurf(e: Entwurf): BestellPosition {
  const position: BestellPosition = {
    menge: Math.min(99, Math.max(1, Math.round(zahl(e.menge)) || 1)),
    bezeichnung: e.bezeichnung.trim(),
    detail: '',
    preisChf: Math.round(zahl(e.preisChf) * 100) / 100,
    rahmendicke: e.rahmendicke.trim() || undefined,
    rahmenfarbe: e.rahmenfarbe,
    netzfarbe: e.netzfarbe,
    netzart: e.netzart,
    mechanismus: e.mechanismus,
  }
  const breite = masszahl(e.breiteCm)
  const hoehe = masszahl(e.hoeheCm)
  if (breite !== undefined) position.breiteCm = breite
  if (hoehe !== undefined) position.hoeheCm = hoehe
  if (e.oeffnung) position.oeffnung = e.oeffnung
  if (e.typId) position.typId = e.typId
  if (e.setId) {
    position.setId = e.setId
    // Wie im Warenkorb: Das Set ist eine Preiszeile, sein Inhalt steht als Text.
    const set = setById(e.setId)
    if (set) {
      const inhalt = set.items.map((i) => `${i.count}× ${typeById(i.typeId)?.label ?? i.typeId}`).join(', ')
      position.detail = `${netsInSet(set)} Netze: ${inhalt}`
    }
  } else if (e.typId && breite && hoehe) {
    position.detail = formatSize(breite, hoehe)
  }
  if (e.id) position.id = e.id
  return position
}

/**
 * Die Netze, wie sie gespeichert wuerden – mit dem Preis nach der Regel des
 * Netz-Editors: Katalogware aus dem Katalog, unangetastet. Sondermass: der
 * gerechnete Vorschlag – ausser es stand schon ein Preis da UND die Masse
 * sind dieselben. Dann hat ihn jemand im Angebot festgelegt, und der gilt.
 * Der Vorschlag geht als `richtpreisChf` mit; der Server bewahrt den ersten.
 */
export function netzeMitPreis(entwuerfe: Entwurf[], vorher: BestellPosition[], katalog: boolean): BestellPosition[] {
  const alt = new Map(vorher.filter((p) => p.id).map((p) => [p.id as string, p]))
  return entwuerfe.map((e) => {
    const position = ausEntwurf(e)
    if (katalog) return position
    const vorschlag = gerechneterPreis(position.breiteCm, position.hoeheCm, position.netzart)
    return {
      ...position,
      preisChf: verkaufspreisFuer(e.id ? alt.get(e.id) : undefined, position, vorschlag),
      ...(vorschlag !== null ? { richtpreisChf: vorschlag } : {}),
    }
  })
}

/**
 * Was gespeichert wird – oder warum nicht. Leere Zeilen fallen weg; eine
 * Zeile ohne Bezeichnung ist ein Fehler. Katalog: nur, was aus dem Katalog
 * kommt, zaehlt. Die Fehler sind Schluessel der Admin-Texte (sprache.ts).
 */
export function netzeZumSpeichern(
  netze: BestellPosition[],
  katalog: boolean,
): { netze: BestellPosition[]; fehler?: undefined } | { netze?: undefined; fehler: 'katalogFehlt' | 'bezeichnungFehlt' } {
  const gefuellt = katalog
    ? netze.filter((p) => p.typId || p.setId)
    : netze.filter((p) => p.bezeichnung || p.preisChf > 0 || p.breiteCm || p.hoeheCm)
  if (katalog && gefuellt.length === 0 && netze.length > 0) return { fehler: 'katalogFehlt' }
  if (gefuellt.some((p) => !p.bezeichnung)) return { fehler: 'bezeichnungFehlt' }
  return { netze: gefuellt }
}

/** Montage, Betrag aus dem Feld, auf Rappen gerundet. */
export function betragAusFeld(wert: string): number {
  return Math.round(zahl(wert) * 100) / 100
}
