import type { Auslage, Beteiligter, Bestellung, KostenArt, KostenPosten } from '../types'
import { einfuhrsteuerChf, herstellungFuer } from './kosten'
import { montageBetrag } from '../components/admin/hilfen'
import { verteilung as schluessel } from '../data/kostenConfig'

/**
 * Die Erfolgsrechnung: was hereinkommt, was hinausgeht, was bleibt.
 *
 * ZWEI GRUNDSAETZE, aus denen sich fast alles hier ergibt:
 *
 * 1. GESCHAETZT UND GEMESSEN WERDEN NIE VERMISCHT. Wo kein Betrag erfasst
 *    ist, springt die Formel aus src/lib/kosten.ts ein – aber der Datensatz
 *    traegt dann `geschaetzt`. Eine Marge, die auf Schaetzungen beruht, darf
 *    nicht aussehen wie eine, die auf Belegen beruht.
 *
 * 2. ERWARTET UND REALISIERT STEHEN NEBENEINANDER, NICHT IN EINER SUMME.
 *    Eine zugesagte, aber nicht gelieferte Bestellung ist kein Ertrag; sie
 *    ist eine Aussicht. Wer beides addiert, haelt sich fuer reicher, als er
 *    ist – und genau das soll dieses Werkzeug verhindern.
 *
 * Gerechnet wird bei jedem Laden neu aus den Bestellungen. Das heisst:
 * Aendert jemand nachtraeglich einen Verkaufspreis, aendert sich der
 * vergangene Monat mit. Fuer ein Steuerungswerkzeug ist das richtig; fuer
 * einen Abschluss waere es falsch, und dann muessten Perioden eingefroren
 * werden.
 */

function runde2(x: number): number {
  return Math.round(x * 100) / 100
}

/* --- Welche Bestellungen ueberhaupt zaehlen -------------------------------- */

/**
 * Ab "Warten auf Zusage" ist eine Bestellung Teil der Rechnung.
 *
 * Davor ist sie eine Anfrage: Preise koennen sich noch aendern, und die
 * meisten Anfragen werden nie ein Auftrag. Abgesagtes faellt wieder heraus,
 * und was von Hand ausgenommen wurde, zaehlt nie.
 */
const AB_PHASE: ReadonlyArray<string> = ['zusage', 'bestellen', 'bora', 'ausliefern']

export function inRechnung(b: Bestellung): boolean {
  if (b.ausserRechnung) return false
  return AB_PHASE.includes(b.status)
}

/* --- Eine Bestellung, auf Geld reduziert ---------------------------------- */

export interface BestellZahlen {
  id: string
  kunde: string
  paket?: string
  /** Massgebliches Datum fuer die Periode: Auslieferung, sonst Zusage. */
  datum: string
  /** Geliefert – der Ertrag ist verdient. Sonst ist er nur erwartet. */
  realisiert: boolean
  /** Das Geld ist da. */
  einkassiert: boolean

  netzeChf: number
  montageChf: number
  anfahrtChf: number
  rabattChf: number
  erloesChf: number

  herstellungChf: number
  lieferungChf: number
  mwstChf: number
  weitereChf: number
  kostenChf: number
  /** Mindestens ein Kostenposten stammt aus der Formel, nicht aus einem Beleg. */
  geschaetzt: boolean

  margeChf: number
  margeProzent: number | null
  /** Netze in dieser Bestellung – fuer "Marge pro Netz". */
  netzZahl: number
}

/** Summe der erfassten Posten einer Art. `undefined`, wenn es keine gibt. */
function erfasst(kosten: KostenPosten[] | undefined, art: KostenArt): number | undefined {
  if (!kosten) return undefined
  const treffer = kosten.filter((k) => k.art === art)
  if (treffer.length === 0) return undefined
  return runde2(treffer.reduce((s, k) => s + k.betragChf, 0))
}

export function zahlenFuer(b: Bestellung): BestellZahlen {
  const montageChf = montageBetrag(b)
  const anfahrtChf = b.anfahrt === false ? 0 : (b.anfahrtChf ?? 0)
  const rabattChf = b.rabatt === false ? 0 : (b.rabattChf ?? 0)
  const netzeChf = runde2(b.summeChf - montageChf - anfahrtChf + rabattChf)

  /*
   * HERSTELLUNG: erfasster Posten zuerst, dann die alten Einkaufspreise je
   * Position, erst zuletzt die Formel. Die mittlere Stufe gibt es, weil in
   * aelteren Datensaetzen `einkaufChf` aus den Lieferrunden steht – das sind
   * gemessene Zahlen und besser als jede Schaetzung.
   */
  let geschaetzt = false
  let herstellungChf = erfasst(b.kosten, 'herstellung')
  if (herstellungChf === undefined) {
    const ausRunde = b.positionen.reduce(
      (s, p) => s + (typeof p.einkaufChf === 'number' ? p.einkaufChf * p.menge : 0), 0)
    const alleAusRunde = b.positionen.length > 0 && b.positionen.every((p) => typeof p.einkaufChf === 'number')
    if (alleAusRunde) herstellungChf = runde2(ausRunde)
    else { herstellungChf = herstellungFuer(b.positionen); geschaetzt = true }
  }

  /*
   * LIEFERUNG wird NICHT geschaetzt. Was die Fracht kostet, haengt an der
   * Sendung und nicht am Netz; eine Zahl dafuer zu erfinden hiesse, eine
   * Groessenordnung zu erfinden. Fehlt sie, steht sie auf null und die
   * Marge ist zu gut – das sieht man am Fehlbetrag, nicht an einer Zahl,
   * die plausibel aussieht.
   */
  const lieferungChf = erfasst(b.kosten, 'lieferung') ?? b.lieferkostenChf ?? 0

  /* MWST: erfasst, sonst der alte Zollbetrag, sonst gerechnet auf die Ware. */
  let mwstChf = erfasst(b.kosten, 'mwst') ?? b.zollChf
  if (mwstChf === undefined) { mwstChf = einfuhrsteuerChf(herstellungChf); geschaetzt = true }

  const weitereChf = erfasst(b.kosten, 'weiteres') ?? 0

  const erloesChf = runde2(b.summeChf)
  const kostenChf = runde2(herstellungChf + lieferungChf + mwstChf + weitereChf)
  const margeChf = runde2(erloesChf - kostenChf)

  return {
    id: b.id,
    kunde: b.kunde.name,
    paket: b.paket,
    datum: b.ausgeliefertAm ?? b.zusageAm ?? b.eingang,
    realisiert: Boolean(b.ausgeliefertAm),
    einkassiert: Boolean(b.bezahltAm) || b.bezahlung?.status === 'bezahlt',
    netzeChf,
    montageChf,
    anfahrtChf,
    rabattChf,
    erloesChf,
    herstellungChf,
    lieferungChf,
    mwstChf,
    weitereChf,
    kostenChf,
    geschaetzt,
    margeChf,
    margeProzent: erloesChf > 0 ? Math.round((margeChf / erloesChf) * 1000) / 10 : null,
    netzZahl: b.positionen.reduce((s, p) => s + p.menge, 0),
  }
}

/* --- Perioden -------------------------------------------------------------- */

export type Periode = 'monat' | 'quartal' | 'ytd'

export interface Abschnitt {
  /** Schluessel zum Sortieren, z. B. "2026-03" oder "2026-Q1". */
  schluessel: string
  etikett: string
  /** Geliefert: verdienter Ertrag und die Kosten dazu. */
  erloesChf: number
  kostenChf: number
  betriebskostenChf: number
  ergebnisChf: number
  /** Davon schon einkassiert. */
  einkassiertChf: number
  /** Zugesagt, aber noch nicht geliefert – faellt in keine Periode, hier nur gezaehlt. */
  erwartetChf: number
  anzahl: number
  netzZahl: number
  /** Mindestens eine Bestellung darin rechnet mit geschaetzten Kosten. */
  geschaetzt: boolean
}

function monatsSchluessel(iso: string): string {
  return iso.slice(0, 7)
}

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function schluesselFuer(iso: string, periode: Periode): { schluessel: string; etikett: string } {
  const jahr = iso.slice(0, 4)
  const monat = Number(iso.slice(5, 7))
  if (periode === 'monat') {
    return { schluessel: monatsSchluessel(iso), etikett: `${MONATE[monat - 1]} ${jahr}` }
  }
  if (periode === 'quartal') {
    const q = Math.floor((monat - 1) / 3) + 1
    return { schluessel: `${jahr}-Q${q}`, etikett: `${q}. Quartal ${jahr}` }
  }
  return { schluessel: jahr, etikett: `${jahr} bis heute` }
}

/**
 * Die Erfolgsrechnung je Abschnitt.
 *
 * ERWARTETES BEKOMMT KEINE PERIODE. Eine zugesagte Bestellung wird irgendwann
 * geliefert – wann, weiss heute niemand. Sie in den Monat der Zusage zu
 * legen hiesse, einen Ertrag zu buchen, der dort nie anfaellt. Deshalb
 * laeuft sie neben der Tabelle mit, als eine Zahl.
 */
export function abschnitte(
  bestellungen: Bestellung[],
  auslagen: Auslage[],
  periode: Periode,
): Abschnitt[] {
  const karte = new Map<string, Abschnitt>()
  const hole = (iso: string): Abschnitt => {
    const { schluessel, etikett } = schluesselFuer(iso, periode)
    let a = karte.get(schluessel)
    if (!a) {
      a = { schluessel, etikett, erloesChf: 0, kostenChf: 0, betriebskostenChf: 0,
        ergebnisChf: 0, einkassiertChf: 0, erwartetChf: 0, anzahl: 0, netzZahl: 0, geschaetzt: false }
      karte.set(schluessel, a)
    }
    return a
  }

  for (const b of bestellungen) {
    if (!inRechnung(b)) continue
    const z = zahlenFuer(b)
    const a = hole(z.datum)
    if (z.realisiert) {
      a.erloesChf = runde2(a.erloesChf + z.erloesChf)
      a.kostenChf = runde2(a.kostenChf + z.kostenChf)
      a.anzahl += 1
      a.netzZahl += z.netzZahl
      if (z.geschaetzt) a.geschaetzt = true
      if (z.einkassiert) a.einkassiertChf = runde2(a.einkassiertChf + z.erloesChf)
    } else {
      a.erwartetChf = runde2(a.erwartetChf + z.erloesChf)
    }
  }

  for (const l of auslagen) {
    const a = hole(l.am)
    a.betriebskostenChf = runde2(a.betriebskostenChf + l.betragChf)
  }

  for (const a of karte.values()) {
    a.ergebnisChf = runde2(a.erloesChf - a.kostenChf - a.betriebskostenChf)
  }

  return [...karte.values()].sort((x, y) => (x.schluessel < y.schluessel ? 1 : -1))
}

/* --- Offene Posten in beide Richtungen ------------------------------------- */

export interface Forderung {
  bestellungId: string
  kunde: string
  betragChf: number
  /** Seit wann geliefert und noch nicht bezahlt. */
  seit: string
}

/** Wer uns was schuldet: geliefert, aber nicht einkassiert. */
export function offeneForderungen(bestellungen: Bestellung[]): Forderung[] {
  const raus: Forderung[] = []
  for (const b of bestellungen) {
    if (!inRechnung(b)) continue
    const z = zahlenFuer(b)
    if (!z.realisiert || z.einkassiert) continue
    raus.push({ bestellungId: b.id, kunde: b.kunde.name, betragChf: z.erloesChf, seit: z.datum })
  }
  return raus.sort((x, y) => (x.seit < y.seit ? -1 : 1))
}

export interface Schuld {
  traeger: Beteiligter
  betragChf: number
  posten: { bezeichnung: string; betragChf: number; am: string }[]
}

/**
 * Wem wir was schulden: alles, was jemand ausgelegt und noch nicht
 * zurueckbekommen hat – aus den Bestellungen und aus den Auslagen.
 */
export function offeneSchulden(bestellungen: Bestellung[], auslagen: Auslage[]): Schuld[] {
  const karte = new Map<Beteiligter, Schuld>()
  const hole = (t: Beteiligter): Schuld => {
    let s = karte.get(t)
    if (!s) { s = { traeger: t, betragChf: 0, posten: [] }; karte.set(t, s) }
    return s
  }
  const BEZEICHNUNG: Record<KostenArt, string> = {
    herstellung: 'Herstellung Netze',
    lieferung: 'Lieferkosten',
    mwst: 'Einfuhrsteuer',
    weiteres: 'Weiteres',
  }

  for (const b of bestellungen) {
    if (!inRechnung(b)) continue
    for (const k of b.kosten ?? []) {
      if (k.bezahlt) continue
      const s = hole(k.traeger)
      s.betragChf = runde2(s.betragChf + k.betragChf)
      s.posten.push({
        bezeichnung: `${k.bezeichnung ?? BEZEICHNUNG[k.art]} · ${b.kunde.name}`,
        betragChf: k.betragChf,
        am: k.am ?? k.erfasstAm,
      })
    }
  }
  for (const l of auslagen) {
    if (l.bezahlt) continue
    const s = hole(l.traeger)
    s.betragChf = runde2(s.betragChf + l.betragChf)
    s.posten.push({ bezeichnung: l.bezeichnung, betragChf: l.betragChf, am: l.am })
  }

  for (const s of karte.values()) s.posten.sort((x, y) => (x.am < y.am ? -1 : 1))
  return [...karte.values()].sort((x, y) => y.betragChf - x.betragChf)
}

/* --- Abrechnung ------------------------------------------------------------ */

export interface Aufteilung {
  /** Was tatsaechlich eingegangen ist – nur das laesst sich verteilen. */
  einkassiertChf: number
  /** Davon aus der Ware, nach Rabatt. */
  warenerloesChf: number
  /** Davon aus Montage und Anfahrt – unsere eigene Arbeit. */
  montageerloesChf: number
  /** Die Kosten der bezahlten Auftraege. */
  warenkostenChf: number
  betriebskostenChf: number
  /** Offene Auslagen, die zuerst an die zurueckgehen, die sie getragen haben. */
  rueckzahlungChf: number
  /** Die zwei Toepfe. Koennen negativ sein – dann ist nichts zu verteilen. */
  warengewinnChf: number
  montagegewinnChf: number
  verteilbarChf: number
  anteile: Record<Beteiligter, number>
}

/**
 * Was eine Abrechnung ergaebe, wenn man sie heute machen wuerde.
 *
 * NUR EINKASSIERTES WIRD VERTEILT. Buchhalterischer Gewinn liegt zum Teil
 * noch beim Kunden; wer ihn ausschuettet, zahlt aus der eigenen Tasche.
 *
 * ZWEI TOEPFE, wie abgemacht: Die Ware kauft Bora ein, daran ist er
 * beteiligt. Montage und Anfahrt sind die Arbeit von Ufuk und Deniz und
 * werden unter ihnen geteilt. Die Schluessel stehen in
 * src/data/kostenConfig.ts – auch, aus welchem Topf die Betriebskosten
 * bezahlt werden.
 */
export function aufteilung(bestellungen: Bestellung[], auslagen: Auslage[]): Aufteilung {
  let einkassiertChf = 0
  let warenerloesChf = 0
  let montageerloesChf = 0
  let warenkostenChf = 0

  for (const b of bestellungen) {
    if (!inRechnung(b)) continue
    const z = zahlenFuer(b)
    if (!z.einkassiert) continue
    einkassiertChf = runde2(einkassiertChf + z.erloesChf)
    /* Der Rabatt mindert die Ware – nachgelassen wird auf den Netzpreis. */
    warenerloesChf = runde2(warenerloesChf + z.netzeChf - z.rabattChf)
    montageerloesChf = runde2(montageerloesChf + z.montageChf + z.anfahrtChf)
    warenkostenChf = runde2(warenkostenChf + z.kostenChf)
  }

  const schulden = offeneSchulden(bestellungen, auslagen)
  const rueckzahlungChf = runde2(schulden.reduce((s, x) => s + x.betragChf, 0))

  const betriebskostenChf = runde2(auslagen.reduce((s, l) => s + l.betragChf, 0))
  const aufWare = schluessel.betriebskosten === 'ware'
  const warengewinnChf = runde2(warenerloesChf - warenkostenChf - (aufWare ? betriebskostenChf : 0))
  const montagegewinnChf = runde2(montageerloesChf - (aufWare ? 0 : betriebskostenChf))

  /*
   * EIN TOPF IM MINUS WIRD NICHT VERTEILT.
   *
   * Beim ersten Durchlauf stand hier nichts davon, und die Anzeige las sich
   * so: "Bora −10.02". Das sieht aus, als schuldete Bora uns Geld. In
   * Wahrheit ist nur noch nichts zu verteilen – die Betriebskosten sind
   * groesser als der Gewinn der bisher bezahlten Auftraege. Ein Minus ist
   * eine Lage, kein Anteil.
   *
   * Der Topf selbst bleibt negativ stehen: Das ist die Wahrheit, und sie
   * gehoert angezeigt. Nur die Anteile werden bei null abgeschnitten.
   */
  const anteile: Record<Beteiligter, number> = { bora: 0, ufuk: 0, deniz: 0 }
  const ware = Math.max(0, warengewinnChf)
  const montage = Math.max(0, montagegewinnChf)
  for (const wer of ['bora', 'ufuk', 'deniz'] as Beteiligter[]) {
    anteile[wer] = runde2(ware * schluessel.ware[wer] + montage * schluessel.montage[wer])
  }

  return {
    einkassiertChf,
    warenerloesChf,
    montageerloesChf,
    warenkostenChf,
    betriebskostenChf,
    rueckzahlungChf,
    warengewinnChf,
    montagegewinnChf,
    verteilbarChf: runde2(ware + montage),
    anteile,
  }
}
