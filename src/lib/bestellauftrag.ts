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
  anzahl: number
}

/**
 * Eine Zeile des Auftrags: genau EIN Plissee.
 *
 * Bewusst nicht "3 × dieses Netz". Der Produzent fertigt Stueck fuer Stueck,
 * und auf jedem Stueck muss die Paketkennung stehen – bei einer
 * zusammengefassten Zeile stuenden dort drei verschiedene. Gleiche Bauarten
 * stehen dafuer hintereinander, damit er sie in einem Zug fertigen kann.
 *
 * Die laufende Nummer ist fuer den Rueckweg: Bora traegt die Preise ein und
 * kann sich auf "Zeile 7" beziehen, statt Masse abzuschreiben.
 */
export interface AuftragsZeile extends AuftragsNetz {
  nummer: number
  kennung: string
}

export interface Luecke {
  kennung: string
  netz: string
  fehlt: string[]
}

export interface Auftrag {
  bloecke: AuftragsBlock[]
  /** Alle Plissees einzeln, gleiche Bauarten hintereinander. */
  zeilen: AuftragsZeile[]
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
  // Nach Bauart gesammelt, in der Reihenfolge des ersten Auftretens. So
  // stehen gleiche Netze beieinander, ohne dass die Liste umsortiert wirkt.
  const nachBauart = new Map<string, AuftragsZeile[]>()

  for (const bestellung of bestellungen) {
    const kennung = kennungFuer(bestellung)
    const netze = zusammenfassen(bestellung.positionen.flatMap(netzeAusPosition), true)
    let anzahl = 0

    for (const netz of netze) {
      const fehlt = PFLICHT.filter(({ feld }) => netz[feld] === undefined || netz[feld] === '').map((f) => f.name)
      if (fehlt.length > 0) luecken.push({ kennung, netz: netz.bezeichnung || 'ohne Bezeichnung', fehlt })

      // Aus "3 ×" werden drei Zeilen. Jede traegt ihre Paketkennung.
      const schluessel = bauart(netz)
      const liste = nachBauart.get(schluessel) ?? []
      for (let i = 0; i < netz.menge; i++) liste.push({ ...netz, menge: 1, nummer: 0, kennung })
      nachBauart.set(schluessel, liste)
      anzahl += netz.menge
    }

    bloecke.push({ bestellung, kennung, anzahl })
  }

  const zeilen = [...nachBauart.values()].flat().map((z, i) => ({ ...z, nummer: i + 1 }))
  return { bloecke, zeilen, anzahl: zeilen.length, luecken }
}
