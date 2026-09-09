import type { Bestellung, BestellPosition, OpeningDirection } from '../types'
import type { Mechanismus, Netzfarbe, Rahmenfarbe } from '../data/produktion'
import { setById, typeById } from '../data/catalog'

/**
 * Aus Bestellungen wird ein Auftrag an den Produzenten.
 *
 * Drei Dinge passieren hier, und jedes hat einen Grund:
 *
 * 1. SETS WERDEN AUFGELÖST. Fuer das Geld ist "Set Mittel" eine Position mit
 *    einem Preis. Fuer den Produzenten sind es sechs Netze mit sechs
 *    Massen. Beides muss stimmen, also bleibt die Preiszeile unangetastet
 *    und der Auftrag schlaegt die Einzelteile im Katalog nach.
 *
 * 2. GLEICHE NETZE WERDEN GEZAEHLT. Drei Zimmerfenster derselben Wohnung
 *    sind fuer ihn nicht drei Zeilen, sondern "3 ×" eine Zeile. Das ist
 *    weniger zu lesen und weniger falsch zu machen.
 *
 * 3. LUECKEN WERDEN GEMELDET, NICHT GEFUELLT. Fehlt einem Netz die
 *    Rahmendicke oder die Oeffnungsrichtung, entsteht kein Auftrag mit einer
 *    Annahme darin, sondern eine Liste dessen, was fehlt. Eine Lieferung aus
 *    der Tuerkei, die nicht passt, kostet Wochen; eine Fehlermeldung kostet
 *    fuenf Minuten.
 */

export interface AuftragsNetz {
  menge: number
  /** Raum oder Fenster, fuer unsere Zuordnung beim Auspacken. */
  bezeichnung: string
  breiteCm?: number
  hoeheCm?: number
  rahmendicke?: string
  rahmenfarbe?: Rahmenfarbe
  netzfarbe?: Netzfarbe
  mechanismus?: Mechanismus
  oeffnung?: OpeningDirection
}

export interface AuftragsBlock {
  bestellung: Bestellung
  /** Was auf das Paket geschrieben wird. Kurz, ohne Umlaute. */
  kennung: string
  netze: AuftragsNetz[]
  anzahl: number
}

export interface Luecke {
  kennung: string
  netz: string
  fehlt: string[]
}

export interface Auftrag {
  bloecke: AuftragsBlock[]
  /** Alle Netze aller Kunden, nach Bauart zusammengefasst – daraus fertigt er. */
  fertigung: AuftragsNetz[]
  anzahl: number
  luecken: Luecke[]
}

/** Welche Angaben ein Netz haben muss, damit es gefertigt werden kann. */
const PFLICHT: { feld: keyof AuftragsNetz; name: string }[] = [
  { feld: 'breiteCm', name: 'Breite' },
  { feld: 'hoeheCm', name: 'Höhe' },
  { feld: 'rahmendicke', name: 'Rahmendicke' },
  { feld: 'rahmenfarbe', name: 'Rahmenfarbe' },
  { feld: 'netzfarbe', name: 'Netzfarbe' },
  { feld: 'mechanismus', name: 'Mechanismus' },
  { feld: 'oeffnung', name: 'Öffnungsrichtung' },
]

/** Die Bauart eines Netzes als Zeichenkette – zwei gleiche Netze ergeben dieselbe. */
function bauart(n: AuftragsNetz): string {
  return [n.breiteCm, n.hoeheCm, n.rahmendicke, n.rahmenfarbe, n.netzfarbe, n.mechanismus, n.oeffnung].join('|')
}

/** Die Angaben eines Katalogtyps als Netz. */
function ausTyp(typId: string, menge: number, position: BestellPosition): AuftragsNetz | null {
  const typ = typeById(typId)
  if (!typ) return null
  return {
    menge,
    bezeichnung: typ.label,
    // Was in der Bestellung steht, gilt vor dem Katalog: Aendert sich der
    // Katalog, soll eine laengst erteilte Bestellung nicht anders lauten.
    breiteCm: position.breiteCm ?? typ.widthCm,
    hoeheCm: position.hoeheCm ?? typ.heightCm,
    rahmendicke: position.rahmendicke ?? typ.rahmendicke,
    rahmenfarbe: position.rahmenfarbe,
    netzfarbe: position.netzfarbe,
    mechanismus: position.mechanismus,
    oeffnung: position.oeffnung ?? typ.opening,
  }
}

/** Eine Bestellzeile in die Netze, die daraus zu fertigen sind. */
function netzeAusPosition(p: BestellPosition): AuftragsNetz[] {
  if (p.setId) {
    const set = setById(p.setId)
    if (!set) return []
    const raus: AuftragsNetz[] = []
    for (const teil of set.items) {
      const netz = ausTyp(teil.typeId, teil.count * p.menge, {
        // Beim Set stehen Masse und Bauart nicht an der Preiszeile – die
        // gelten fuer das ganze Set und waeren fuer ein einzelnes Netz
        // falsch. Sie kommen aus dem Katalog.
        ...p,
        breiteCm: undefined,
        hoeheCm: undefined,
        rahmendicke: undefined,
        oeffnung: undefined,
      })
      if (netz) raus.push(netz)
    }
    return raus
  }

  if (p.typId) {
    const netz = ausTyp(p.typId, p.menge, p)
    if (netz) return [{ ...netz, bezeichnung: p.bezeichnung || netz.bezeichnung }]
  }

  return [
    {
      menge: p.menge,
      bezeichnung: p.bezeichnung,
      breiteCm: p.breiteCm,
      hoeheCm: p.hoeheCm,
      rahmendicke: p.rahmendicke,
      rahmenfarbe: p.rahmenfarbe,
      netzfarbe: p.netzfarbe,
      mechanismus: p.mechanismus,
      oeffnung: p.oeffnung,
    },
  ]
}

/** Gleiche Netze zu einer Zeile zusammenfassen, Reihenfolge bleibt erhalten. */
function zusammenfassen(netze: AuftragsNetz[], mitBezeichnung: boolean): AuftragsNetz[] {
  const nach = new Map<string, AuftragsNetz>()
  for (const netz of netze) {
    const schluessel = mitBezeichnung ? `${netz.bezeichnung}|${bauart(netz)}` : bauart(netz)
    const da = nach.get(schluessel)
    if (da) da.menge += netz.menge
    else nach.set(schluessel, { ...netz })
  }
  return [...nach.values()]
}

/**
 * Die Kennung, die auf das Paket kommt. Kurz und ohne Umlaute: Sie wird von
 * Hand abgeschrieben, und alles Laengere wird dabei verstuemmelt.
 */
export function kennungFuer(b: Bestellung): string {
  return (b.referenz || b.id).toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

export function auftragAufbauen(bestellungen: Bestellung[]): Auftrag {
  const bloecke: AuftragsBlock[] = []
  const luecken: Luecke[] = []
  const alle: AuftragsNetz[] = []

  for (const bestellung of bestellungen) {
    const kennung = kennungFuer(bestellung)
    const roh = bestellung.positionen.flatMap(netzeAusPosition)
    const netze = zusammenfassen(roh, true)

    for (const netz of netze) {
      const fehlt = PFLICHT.filter(({ feld }) => netz[feld] === undefined || netz[feld] === '').map((f) => f.name)
      if (fehlt.length > 0) luecken.push({ kennung, netz: netz.bezeichnung || 'ohne Bezeichnung', fehlt })
    }

    const anzahl = netze.reduce((summe, n) => summe + n.menge, 0)
    bloecke.push({ bestellung, kennung, netze, anzahl })
    alle.push(...netze)
  }

  const fertigung = zusammenfassen(alle, false)
  return { bloecke, fertigung, anzahl: fertigung.reduce((s, n) => s + n.menge, 0), luecken }
}
