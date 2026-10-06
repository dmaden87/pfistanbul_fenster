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
 * FEST IST EIN AUFTRAG, SOBALD DIE KUNDSCHAFT ZUGESAGT HAT.
 *
 * Die Phase "Warten auf Zusage" gehoert noch NICHT dazu – sie heisst so,
 * weil wir auf das Ja warten. Der Zusage-Stempel schiebt den Auftrag in
 * "Bereit zum Bestellen" (siehe `phaseNachWiederoeffnen` in phasen.ts), und
 * erst ab dort steht ein Verkaufspreis, auf den man sich verlassen kann.
 *
 * HIER STAND ZUERST 'zusage' DABEI. Der Unterschied ist eine Phase und
 * damit die halbe Aussage: Mit ihr zaehlten Angebote als Ertrag, die noch
 * niemand angenommen hat. Alles davor ist Funnel, nicht Rechnung.
 */
const FESTE_PHASEN: ReadonlyArray<string> = ['bestellen', 'bora', 'ausliefern']

/**
 * Der Funnel: von der frischen Anfrage bis zum Warten auf die Zusage.
 *
 * Hier sind Preise Vorschlaege, Masse manchmal geschaetzt, und die meisten
 * Anfragen werden nie ein Auftrag. Deshalb steht das getrennt und geht nie
 * in eine Summe mit dem Ist ein.
 */
const FUNNEL_PHASEN: { phase: string; etikett: string }[] = [
  { phase: 'neu', etikett: 'Neu, unbearbeitet' },
  { phase: 'klaerung', etikett: 'Auftrag klären' },
  { phase: 'offerte', etikett: 'Angebot erstellen' },
  { phase: 'zusage', etikett: 'Warten auf Zusage' },
]

export function inRechnung(b: Bestellung): boolean {
  if (b.ausserRechnung) return false
  return zaehltPhase(b)
}

/**
 * Nur die Phase, ohne den Schalter.
 *
 * DIE OBERFLAECHE BRAUCHT BEIDES GETRENNT. Zeigte sie nur, was `inRechnung`
 * durchlaesst, waere ein von Hand ausgenommener Auftrag samt seinem
 * Kaestchen verschwunden – und niemand koennte ihn je wieder hereinholen.
 * Genau so war die erste Fassung: eine Einbahnstrasse.
 */
export function zaehltPhase(b: Bestellung): boolean {
  return FESTE_PHASEN.includes(b.status)
}

/** Steht der Auftrag im Funnel – also vor der Zusage? */
export function imFunnel(b: Bestellung): boolean {
  if (b.ausserRechnung) return false
  return FUNNEL_PHASEN.some((f) => f.phase === b.status)
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
  /**
   * Davon noch nicht bezahlt – die Debitoren dieser Periode.
   *
   * SIE STECKEN BEREITS IM ERLOES. Geliefert ist geliefert; ob das Geld
   * schon da ist, aendert nichts daran, dass der Ertrag verdient wurde.
   * Diese Spalte sagt nur, wie viel davon noch aussteht.
   */
  offenChf: number
  /**
   * Davon noch nicht geliefert – der Teil, der im Funnel steht.
   *
   * ER ZAEHLT MIT. Frueher stand er neben der Rechnung: Ein zugesagter
   * Auftrag sei kein Ertrag, weil nichts erbracht ist. Buchhalterisch
   * stimmt das; zum Steuern eines Betriebs mit sechs Auftraegen taugt es
   * nicht. Ein zugesagter Auftrag hat einen festen Verkaufspreis und
   * gerechnete Kosten – das ist die Zahl, auf die man schaut. Wie weit er
   * ist, steht in den drei Spalten daneben.
   */
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
  /*
   * "BIS HEUTE" NUR FUERS LAUFENDE JAHR. Bei mehreren Jahren in der Liste
   * stuende sonst "2025 bis heute" - und das Jahr ist seit Silvester
   * vollstaendig. Ein abgelaufenes Jahr heisst einfach so.
   */
  const heuer = new Date().getFullYear()
  return { schluessel: jahr, etikett: Number(jahr) === heuer ? `${jahr} bis heute` : jahr }
}

/**
 * Die Erfolgsrechnung je Abschnitt.
 *
 * NOCH NICHT GELIEFERTES FAELLT IN DEN MONAT DER ZUSAGE. Das ist nicht das
 * Datum, an dem geliefert wird – das kennt heute niemand. Es ist das Datum,
 * an dem der Auftrag fest wurde, und darum geht es hier: Die Rechnung zeigt,
 * was an festen Auftraegen da ist, nicht was die Post schon gebracht hat.
 * Wie weit jeder ist, sagen die Spalten "einkassiert", "offen" und "noch
 * nicht geliefert".
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
        ergebnisChf: 0, einkassiertChf: 0, offenChf: 0, erwartetChf: 0,
        anzahl: 0, netzZahl: 0, geschaetzt: false }
      karte.set(schluessel, a)
    }
    return a
  }

  for (const b of bestellungen) {
    if (!inRechnung(b)) continue
    const z = zahlenFuer(b)
    const a = hole(z.datum)
    /*
     * JEDER FESTE AUFTRAG ZAEHLT, ab der Zusage. Die drei Spalten darunter
     * sagen, wie weit er ist: einkassiert, geliefert und noch offen, oder
     * noch nicht geliefert. Zusammen ergeben sie wieder den Erloes.
     */
    a.erloesChf = runde2(a.erloesChf + z.erloesChf)
    a.kostenChf = runde2(a.kostenChf + z.kostenChf)
    a.anzahl += 1
    a.netzZahl += z.netzZahl
    if (z.geschaetzt) a.geschaetzt = true
    if (!z.realisiert) a.erwartetChf = runde2(a.erwartetChf + z.erloesChf)
    else if (z.einkassiert) a.einkassiertChf = runde2(a.einkassiertChf + z.erloesChf)
    else a.offenChf = runde2(a.offenChf + z.erloesChf)
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

/* --- Die Kennzahlen oben ---------------------------------------------------- */

export interface Kennzahlen {
  /** Alle festen Auftraege zum Verkaufspreis. */
  erloesChf: number
  /** Davon schon auf dem Konto. */
  cashedChf: number
  /** Davon geliefert und noch nicht bezahlt – die Debitoren. */
  debitChf: number
  /** Davon fest, aber noch nicht geliefert – in Arbeit. */
  inArbeitChf: number

  /** Der Funnel: alles VOR der Zusage. Steht nie in einer Summe mit dem Ist. */
  funnelChf: number

  /** Warenkosten aller festen Auftraege. */
  warenkostenChf: number
  betriebskostenChf: number
  /** Beides zusammen. */
  kostenChf: number
  /** Davon noch zu bezahlen – die Kreditoren. */
  creditChf: number

  /** Erloes minus alle Kosten. Die Rechnung, wie sie in der Tabelle steht. */
  betriebsergebnisChf: number
  /** Betriebsergebnis in Prozent vom Erloes. */
  rentabilitaet: number | null

  /**
   * Dasselbe, aber nur mit dem, was wirklich geflossen ist: einkassiertes
   * Geld gegen bezahlte Rechnungen. Das ist, was auf dem Konto passiert ist.
   */
  realErgebnisChf: number

  /** Der Funnel in Stueck und Geld. */
  funnelAnzahl: number
  funnelNetze: number
  funnelKostenChf: number
  funnelMargeChf: number
}

/**
 * Die Zahlen fuer den Kopf der Seite.
 *
 * HIER UND NICHT IN DER OBERFLAECHE, damit sie geprueft werden koennen. Eine
 * Kennzahl, die nur in einer Komponente entsteht, faellt bei jedem Umbau der
 * Komponente mit – und niemand merkt, dass sie seither etwas anderes misst.
 */
export function kennzahlen(bestellungen: Bestellung[], auslagen: Auslage[]): Kennzahlen {
  let erloesChf = 0, cashedChf = 0, debitChf = 0, inArbeitChf = 0, warenkostenChf = 0
  let realErloesChf = 0, realWarenkostenChf = 0
  let funnelChf = 0, funnelAnzahl = 0, funnelNetze = 0, funnelKostenChf = 0, funnelMargeChf = 0

  /* Der Funnel steht vor der Zusage und wird getrennt gezaehlt. */
  for (const b of bestellungen) {
    if (!imFunnel(b)) continue
    const z = zahlenFuer(b)
    funnelChf = runde2(funnelChf + z.erloesChf)
    funnelAnzahl += 1
    funnelNetze += z.netzZahl
    funnelKostenChf = runde2(funnelKostenChf + z.kostenChf)
    funnelMargeChf = runde2(funnelMargeChf + z.margeChf)
  }

  for (const b of bestellungen) {
    if (!inRechnung(b)) continue
    const z = zahlenFuer(b)
    erloesChf = runde2(erloesChf + z.erloesChf)
    warenkostenChf = runde2(warenkostenChf + z.kostenChf)

    if (!z.realisiert) {
      inArbeitChf = runde2(inArbeitChf + z.erloesChf)
    } else if (z.einkassiert) {
      cashedChf = runde2(cashedChf + z.erloesChf)
      realErloesChf = runde2(realErloesChf + z.erloesChf)
    } else {
      debitChf = runde2(debitChf + z.erloesChf)
    }

    /* Fuer die reale Rechnung zaehlt nur, was auch bezahlt ist. */
    for (const k of b.kosten ?? []) {
      if (k.bezahlt) realWarenkostenChf = runde2(realWarenkostenChf + k.betragChf)
    }
  }

  const betriebskostenChf = runde2(auslagen.reduce((s, l) => s + l.betragChf, 0))
  const realBetriebskostenChf = runde2(
    auslagen.filter((l) => l.bezahlt).reduce((s, l) => s + l.betragChf, 0))

  const schulden = offeneSchulden(bestellungen, auslagen)
  const creditChf = runde2(schulden.reduce((s, x) => s + x.betragChf, 0))

  const kostenChf = runde2(warenkostenChf + betriebskostenChf)
  const betriebsergebnisChf = runde2(erloesChf - kostenChf)

  return {
    erloesChf,
    cashedChf,
    debitChf,
    inArbeitChf,
    funnelChf,
    warenkostenChf,
    betriebskostenChf,
    kostenChf,
    creditChf,
    betriebsergebnisChf,
    rentabilitaet: erloesChf > 0 ? Math.round((betriebsergebnisChf / erloesChf) * 1000) / 10 : null,
    realErgebnisChf: runde2(realErloesChf - realWarenkostenChf - realBetriebskostenChf),
    funnelAnzahl,
    funnelNetze,
    funnelKostenChf,
    funnelMargeChf,
  }
}

/* --- Forecast: was noch kommt ---------------------------------------------- */

export interface ForecastZeile {
  /** Die Phase, in der die Auftraege stehen. */
  phase: string
  etikett: string
  anzahl: number
  netzZahl: number
  erloesChf: number
  kostenChf: number
  margeChf: number
  geschaetzt: boolean
}

/**
 * Der Funnel, nach Naehe geordnet.
 *
 * NICHT NACH MONAT. Eine Anfrage hat kein Lieferdatum – wann daraus etwas
 * wird, und ob ueberhaupt, weiss heute niemand. Die Phase sagt dafuer etwas
 * Echtes: Was auf die Zusage wartet, kommt eher als das, was gestern
 * hereingeschneit ist.
 *
 * NICHTS DAVON IST ERTRAG. Die Preise sind Vorschlaege, die Kosten
 * gerechnet, und die meisten Anfragen werden nie ein Auftrag. Darum geht
 * diese Tabelle nie in eine Summe mit der Erfolgsrechnung ein.
 */
export function forecast(bestellungen: Bestellung[]): ForecastZeile[] {
  const karte = new Map<string, ForecastZeile>()
  for (const { phase, etikett } of FUNNEL_PHASEN) {
    karte.set(phase, { phase, etikett, anzahl: 0, netzZahl: 0, erloesChf: 0, kostenChf: 0, margeChf: 0, geschaetzt: false })
  }
  for (const b of bestellungen) {
    if (!imFunnel(b)) continue
    const z = zahlenFuer(b)
    const zeile = karte.get(b.status)
    if (!zeile) continue
    zeile.anzahl += 1
    zeile.netzZahl += z.netzZahl
    zeile.erloesChf = runde2(zeile.erloesChf + z.erloesChf)
    zeile.kostenChf = runde2(zeile.kostenChf + z.kostenChf)
    zeile.margeChf = runde2(zeile.margeChf + z.margeChf)
    if (z.geschaetzt) zeile.geschaetzt = true
  }
  return [...karte.values()].filter((z) => z.anzahl > 0)
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
