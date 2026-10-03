import type { Bestellung, BestellPosition, OpeningDirection, ZeilenHerkunft } from '../types'
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

/**
 * Ein Buendel, wie es auf dem Blatt erscheint: die Verpackung EINES Auftrags.
 *
 * Wird aus den Zeilen abgeleitet und nicht aus den Bestellungen. So gilt
 * dieselbe Rechnung fuer die frisch berechneten Zeilen einer Runde im Entwurf
 * und fuer die eingefrorenen einer laengst versendeten Anfrage.
 */
export interface AuftragsPaket {
  /** Was auf das Paket geschrieben wird. Kurz, ohne Umlaute. */
  kennung: string
  anzahl: number
}

/*
 * HIER STAND EIN GERECHNETES PACKMASS – "ca. 162 × 11 × 11 cm", aus einem
 * angenommenen Querschnitt je zerlegtem Plissee. Es stand auf dem Blatt an
 * Bora, neben einer Spalte fuer die Fracht.
 *
 * Beides ist raus. Die Rechnung war eine Schaetzung von uns ueber etwas, das
 * der Produzent genauer weiss, und sie half ihm beim Packen nicht; was die
 * Lieferung kostet, traegt er nach der Bestellung in unsere Buchhaltung ein.
 * Eine Zahl auf einem Arbeitspapier, die niemand braucht und die niemand
 * nachpruefen kann, ist keine Information, sondern Ballast.
 */

/**
 * Eine Zeile des Auftrags: genau EIN Plissee.
 *
 * Bewusst nicht "3 × dieses Netz". Der Produzent fertigt Stueck fuer Stueck,
 * und auf jedem Stueck muss die Buendelkennung stehen – bei einer
 * zusammengefassten Zeile stuenden dort drei verschiedene. Gleiche Bauarten
 * stehen dafuer hintereinander, damit er sie in einem Zug fertigen kann.
 *
 * Die laufende Nummer ist fuer den Rueckweg: Bora traegt die Preise ein und
 * kann sich auf "Zeile 7" beziehen, statt Masse abzuschreiben.
 */
export interface AuftragsZeile extends AuftragsNetz {
  nummer: number
  kennung: string
  /** Woher die Zeile stammt: welche Bestellung, welche Position, welches Stueck. */
  herkunft?: ZeilenHerkunft
}

export interface Luecke {
  kennung: string
  netz: string
  fehlt: string[]
}

export interface Auftrag {
  /** Alle Plissees einzeln, gleiche Bauarten hintereinander. */
  zeilen: AuftragsZeile[]
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

/**
 * Die Kennung, die auf das BUENDEL kommt – also auf die Verpackung eines
 * einzelnen Auftrags. Kurz und ohne Umlaute: Sie wird von Hand
 * abgeschrieben, und alles Laengere wird dabei verstuemmelt.
 *
 * NICHT ZU VERWECHSELN MIT DEM PAKET-ETIKETT (P-2026-01). Das bezeichnet die
 * ganze Sendung, in der mehrere Buendel reisen. Auf dem Blatt an Bora steht
 * die Sendung oben rechts und das Buendel in der Spalte – beide hiessen
 * einmal "Paket", und auf einem Blatt, auf dem beides vorkommt, war nicht zu
 * erkennen, welches gemeint war.
 */
export function kennungFuer(b: { referenz: string; id: string }): string {
  return (b.referenz || b.id).toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

/**
 * Alle Zeilen der Auftraege, in stabiler Reihenfolge: Bestellung fuer
 * Bestellung, Position fuer Position, Stueck fuer Stueck. Nach Bauart
 * sortiert erst `auftragAufbauen` fuer das Dokument.
 */
export function zeilenDerAuftraege(bestellungen: Bestellung[]): AuftragsZeile[] {
  const raus: AuftragsZeile[] = []

  for (const bestellung of bestellungen) {
    const kennung = kennungFuer(bestellung)
    bestellung.positionen.forEach((position, index) => {
      // Alteintraege ohne Kennung: ersatzweise der Listenplatz.
      const positionId = position.id ?? `#${index}`
      for (const netz of netzeAusPosition(position)) {
        for (let stueck = 0; stueck < netz.menge; stueck++) {
          const herkunft: ZeilenHerkunft = { bestellungId: bestellung.id, positionId, stueck }
          raus.push({ ...netz, menge: 1, nummer: 0, kennung, herkunft })
        }
      }
    })
  }

  return raus.map((z, i) => ({ ...z, nummer: i + 1 }))
}

/** Was einer Zeile fehlt, damit sie gefertigt werden kann. */
export function fehlendeAngaben(netz: AuftragsNetz): string[] {
  return PFLICHT.filter(({ feld }) => netz[feld] === undefined || netz[feld] === '').map((f) => f.name)
}

/**
 * Der Auftrag fuers Dokument: gleiche Bauarten hintereinander, damit der
 * Produzent sie in einem Zug fertigen kann.
 */
export function auftragAufbauen(bestellungen: Bestellung[]): Auftrag {
  const luecken: Luecke[] = []
  const nachBauart = new Map<string, AuftragsZeile[]>()

  for (const zeile of zeilenDerAuftraege(bestellungen)) {
    const fehlt = fehlendeAngaben(zeile)
    if (fehlt.length > 0) {
      luecken.push({ kennung: zeile.kennung, netz: zeile.bezeichnung || 'ohne Bezeichnung', fehlt })
    }
    const schluessel = bauart(zeile)
    const liste = nachBauart.get(schluessel) ?? []
    liste.push(zeile)
    nachBauart.set(schluessel, liste)
  }

  const zeilen = [...nachBauart.values()].flat().map((z, i) => ({ ...z, nummer: i + 1 }))
  return { zeilen, luecken }
}

/**
 * Die Netze einer Bestellung mit ihren Preisen – fuer die Offerte an die
 * Kundschaft. Anders als beim Auftrag an den Produzenten bleiben Mengen
 * zusammen ("3 ×"), und Sets werden NICHT aufgeloest: Die Kundschaft hat ein
 * Set zu einem Setpreis bestellt, nicht sechs Einzelnetze.
 */
export function netzeAusBestellung(bestellung: Bestellung): (AuftragsNetz & { preisChf: number })[] {
  return bestellung.positionen.map((p) => ({
    menge: p.menge,
    bezeichnung: p.bezeichnung,
    breiteCm: p.breiteCm,
    hoeheCm: p.hoeheCm,
    rahmendicke: p.rahmendicke,
    rahmenfarbe: p.rahmenfarbe,
    netzfarbe: p.netzfarbe,
    mechanismus: p.mechanismus,
    oeffnung: p.oeffnung,
    preisChf: p.preisChf,
  }))
}

/** Die Buendel einer Zeilenliste, in der Reihenfolge des ersten Auftretens. */
export function pakete(zeilen: AuftragsZeile[]): AuftragsPaket[] {
  const nachKennung = new Map<string, AuftragsZeile[]>()
  for (const zeile of zeilen) {
    const liste = nachKennung.get(zeile.kennung) ?? []
    liste.push(zeile)
    nachKennung.set(zeile.kennung, liste)
  }
  return [...nachKennung.entries()].map(([kennung, liste]) => ({
    kennung,
    anzahl: liste.length,
  }))
}
