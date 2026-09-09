import type { Bestellung, BestellPosition, Lieferung, LieferungZeile, OpeningDirection, ZeilenHerkunft } from '../types'
import type { Mechanismus, Netzfarbe, Rahmenfarbe } from '../data/produktion'
import { setById, typeById } from '../data/catalog'
import { PACKMASS } from '../data/produktion'

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
 * Ein Paket, wie es auf dem Blatt erscheint.
 *
 * Wird aus den Zeilen abgeleitet und nicht aus den Bestellungen. So gilt
 * dieselbe Rechnung fuer die frisch berechneten Zeilen einer Runde im Entwurf
 * und fuer die eingefrorenen einer laengst versendeten Anfrage.
 */
export interface AuftragsPaket {
  /** Was auf das Paket geschrieben wird. Kurz, ohne Umlaute. */
  kennung: string
  anzahl: number
  /** Ungefaehres Packmass in cm. Fehlt, sobald einer Zeile die Masse fehlen. */
  packmass?: { laengeCm: number; seiteCm: number }
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
  /** Woher die Zeile stammt. Fehlt bei Zusatzzeilen der Runde. */
  herkunft?: ZeilenHerkunft
}

/** Der Schluessel, unter dem eine Runde eine Zeile ausschliessen kann. */
export function zeilenSchluessel(h: ZeilenHerkunft): string {
  return `${h.bestellungId}#${h.positionId}#${h.stueck}`
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
 * Die Kennung, die auf das Paket kommt. Kurz und ohne Umlaute: Sie wird von
 * Hand abgeschrieben, und alles Laengere wird dabei verstuemmelt.
 */
export function kennungFuer(b: Bestellung): string {
  return (b.referenz || b.id).toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

/**
 * Was das Paket ungefaehr misst.
 *
 * Die Plissees kommen zerlegt: geliefert werden die Rahmenstangen, gestapelt,
 * eingewickelt und mit Klebeband gesichert. Ein Paket ist damit ein BUENDEL
 * und kein Karton.
 *
 * Daraus folgt die Rechnung. Die Laenge des Buendels ist die laengste einzelne
 * Stange – also die laengste Seite des groessten Fensters. Der Querschnitt
 * haengt an der ANZAHL der Plissees und nicht an ihrer Breite: Jedes bringt
 * seine vier Profile mit, egal wie gross das Fenster ist. Angenommen wird ein
 * ungefaehr quadratisches Buendel, daher die Wurzel.
 *
 * DAS IST EINE SCHAETZUNG und keine Frachtangabe. Der Querschnitt je Plissee
 * steht in PACKMASS und gehoert nach der ersten Lieferung korrigiert.
 */
export function packmass(netze: AuftragsNetz[]): AuftragsPaket['packmass'] {
  let laengsteStange = 0
  let stueck = 0

  for (const netz of netze) {
    if (!netz.breiteCm || !netz.hoeheCm) return undefined
    laengsteStange = Math.max(laengsteStange, netz.breiteCm, netz.hoeheCm)
    stueck += netz.menge
  }
  if (stueck === 0) return undefined

  const querschnitt = stueck * PACKMASS.querschnittJePlisseeCm2
  return {
    laengeCm: Math.ceil(laengsteStange + PACKMASS.zuschlagCm),
    seiteCm: Math.ceil(Math.sqrt(querschnitt) + PACKMASS.zuschlagCm),
  }
}

/**
 * Alle Zeilen einer Runde, in stabiler Reihenfolge: Bestellung fuer
 * Bestellung, Position fuer Position, Stueck fuer Stueck.
 *
 * Bewusst NICHT nach Bauart gruppiert. Diese Liste ist die zum Bearbeiten;
 * wuerde sie sich beim Tippen umsortieren, spraenge einem die Zeile unter dem
 * Finger weg. Nach Bauart sortiert erst `auftragAufbauen` fuer das Dokument.
 *
 * Ausgeschlossene Zeilen fehlen, Zusatzzeilen der Runde haengen hinten an.
 */
export function zeilenDerRunde(
  bestellungen: Bestellung[],
  runde?: Pick<Lieferung, 'ausgeschlossen' | 'zusatz'>,
): AuftragsZeile[] {
  const raus: AuftragsZeile[] = []
  const ausgeschlossen = new Set(runde?.ausgeschlossen ?? [])

  for (const bestellung of bestellungen) {
    const kennung = kennungFuer(bestellung)
    bestellung.positionen.forEach((position, index) => {
      // Alteintraege ohne Kennung: ersatzweise der Listenplatz.
      const positionId = position.id ?? `#${index}`
      for (const netz of netzeAusPosition(position)) {
        for (let stueck = 0; stueck < netz.menge; stueck++) {
          const herkunft: ZeilenHerkunft = { bestellungId: bestellung.id, positionId, stueck }
          if (ausgeschlossen.has(zeilenSchluessel(herkunft))) continue
          raus.push({ ...netz, menge: 1, nummer: 0, kennung, herkunft })
        }
      }
    })
  }

  for (const zusatz of runde?.zusatz ?? []) {
    raus.push({
      ...(zusatz as LieferungZeile & AuftragsNetz),
      menge: 1,
      nummer: 0,
      herkunft: undefined,
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
export function auftragAufbauen(
  bestellungen: Bestellung[],
  runde?: Pick<Lieferung, 'ausgeschlossen' | 'zusatz'>,
): Auftrag {
  const luecken: Luecke[] = []
  const nachBauart = new Map<string, AuftragsZeile[]>()

  for (const zeile of zeilenDerRunde(bestellungen, runde)) {
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

/** Die Pakete einer Zeilenliste, in der Reihenfolge des ersten Auftretens. */
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
    packmass: packmass(liste),
  }))
}
