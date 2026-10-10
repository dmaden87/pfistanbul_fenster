import type {
  Abrechnung, AbrechnungAuftrag, AbrechnungPosten,
  Auslage, Beteiligter, Bestellung, KostenArt, KostenPosten,
} from '../types'
import { einfuhrsteuerChf, frachtChf, herstellungFuer } from './kosten'
import { montageBetrag } from '../components/admin/hilfen'
import { standardTraeger, verteilung as schluessel } from '../data/kostenConfig'

/**
 * Die Erfolgsrechnung: was hereinkommt, was hinausgeht, was bleibt.
 *
 * DREI GRUNDSAETZE, aus denen sich fast alles hier ergibt:
 *
 * 0. ALLES STEHT AUS SICHT DER FIRMA PFISTANBUL, nie aus der einer Person.
 *    "Wer uns was schuldet" heisst: der Firma. "Wem wir was schulden" auch -
 *    und darum stehen dort Bora, Ufuk und Deniz nebeneinander, obwohl zwei
 *    davon die Firma sind. Boras Netze sind eine Schuld an ihn; Ufuks und
 *    Deniz' Montage ist eine Schuld an sie. Wer stattdessen aus Deniz' Sicht
 *    schaut, sieht seine eigene Montage als Einnahme und Boras Netze als
 *    Schuld, und nichts geht mehr auf.
 *
 *    UND DIE MONTAGE IST AUFWAND. Hier stand eine Weile das Gegenteil - wer
 *    sich selbst fuer die eigene Arbeit bezahle, habe keine Ausgabe,
 *    sondern verteile Erloes. Das gilt fuer eine Gewinnverteilung; fuer
 *    eine Leistung, die zum Ansatz je Netz anfaellt, gilt es nicht.
 *    Montieren kostet, auch wenn es die eigenen Leute tun. Der Ansatz ist
 *    der Kundenpreis, die Anfahrt zaehlt mit - der Montage-Topf ist damit
 *    genau null, und das Betriebsergebnis traegt die Montage.
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
  /** Montage und Anfahrt – unsere eigene Arbeit, und seit jeher Aufwand. */
  montageKostenChf: number
  weitereChf: number
  kostenChf: number
  /** Mindestens ein Kostenposten stammt aus der Formel, nicht aus einem Beleg. */
  geschaetzt: boolean

  margeChf: number
  margeProzent: number | null
  /** Netze in dieser Bestellung – fuer "Marge pro Netz". */
  netzZahl: number
}

/**
 * Ein Kostenposten, wie die Auswertung ihn sieht – erfasst oder nicht.
 *
 * ZWEI FLAGGEN, DIE NICHT DASSELBE SAGEN, auch wenn sie meist zusammen
 * auftreten:
 *
 * `erfasst` heisst, dass ein Kostenposten dahintersteht, den jemand
 * eingetragen hat. Nur daran laesst sich "bezahlt" ablesen; was nicht
 * erfasst ist, steht beim Standardtraeger offen, denn bestaetigt hat es
 * niemand.
 *
 * `geschaetzt` heisst, dass der BETRAG aus einer Formel kommt. Ein alter
 * Einkaufspreis aus einer Lieferrunde ist nicht erfasst und trotzdem
 * gemessen – Bora hat ihn genannt. Diese Unterscheidung ist einmal
 * verlorengegangen, und damit galten gemessene Preise als Schaetzung.
 */
export interface EffektiverPosten {
  id: string
  art: KostenArt
  bezeichnung?: string
  betragChf: number
  traeger: Beteiligter
  bezahlt: boolean
  erfasst: boolean
  geschaetzt: boolean
}

/**
 * Die Kosten eines Auftrags, vollstaendig – ERFASSTES UND GERECHNETES.
 *
 * DAS IST DER KERN DER GANZEN SICHT. Niemand soll die Netzkosten von Hand
 * eintippen muessen: Sobald die Kundschaft zugesagt hat, stehen Herstellung,
 * Fracht und Einfuhrsteuer fest genug, um sie zu rechnen – und sie stehen
 * bei dem offen, der sie auslegt. Von Hand erfasst wird nur, was davon
 * abweicht, und was gar nichts mit einem Auftrag zu tun hat.
 */
export function kostenPosten(b: Bestellung): EffektiverPosten[] {
  const raus: EffektiverPosten[] = []
  const vorhanden = (art: KostenArt) => (b.kosten ?? []).filter((k) => k.art === art)

  const uebernehmen = (k: KostenPosten) => raus.push({
    id: k.id,
    art: k.art,
    ...(k.bezeichnung ? { bezeichnung: k.bezeichnung } : {}),
    betragChf: k.betragChf,
    traeger: k.traeger,
    bezahlt: k.bezahlt === true,
    erfasst: true,
    geschaetzt: false,
  })

  /* Herstellung: erfasst, sonst die alten Einkaufspreise, sonst die Formel. */
  const herstellung = vorhanden('herstellung')
  let herstellungChf: number
  if (herstellung.length > 0) {
    herstellung.forEach(uebernehmen)
    herstellungChf = runde2(herstellung.reduce((s, k) => s + k.betragChf, 0))
  } else {
    const alleAusRunde = b.positionen.length > 0 && b.positionen.every((p) => typeof p.einkaufChf === 'number')
    herstellungChf = alleAusRunde
      ? runde2(b.positionen.reduce((s, p) => s + (p.einkaufChf ?? 0) * p.menge, 0))
      : herstellungFuer(b.positionen)
    if (herstellungChf > 0) {
      raus.push({ id: `${b.id}-herstellung`, art: 'herstellung', betragChf: herstellungChf,
        traeger: standardTraeger.herstellung, bezahlt: false, erfasst: false,
        geschaetzt: !alleAusRunde })
    }
  }

  /*
   * KARGO UND MWST GEHOEREN ZUSAMMEN, und zwar so, wie Bora sie in Rechnung
   * stellt: Fracht und Einfuhrsteuer fallen mit derselben Sendung an, beides
   * legt er aus, und auf seinem Beleg stehen sie nicht getrennt.
   *
   * HIER STAND, LIEFERUNG WERDE NIE GERECHNET - "lieber eine Null als eine
   * erfundene Fracht". Das war richtig, solange es keine Zahl gab. Jetzt
   * gibt es eine: rund 12 Franken je Netz aus einer echten Sendung. Eine
   * Null ist nicht ehrlicher als eine Pauschale, die als solche
   * gekennzeichnet ist - sie liess Boras groessten Posten nach der Ware ganz
   * verschwinden und die Marge um acht Punkte besser aussehen.
   *
   * ZUSAMMENGEFASST WIRD NUR, WENN NICHTS ERFASST IST. Wo jemand Fracht oder
   * Zoll einzeln eingetragen hat - heute oder in einem alten Datensatz -,
   * bleibt es einzeln. Geloescht wird nie etwas.
   */
  const lieferung = vorhanden('lieferung')
  const mwst = vorhanden('mwst')
  const kargo = vorhanden('kargo')
  const altVermerkt = (b.lieferkostenChf ?? 0) > 0 || b.zollChf !== undefined
  const einzeln = lieferung.length > 0 || mwst.length > 0 || altVermerkt

  if (kargo.length > 0) kargo.forEach(uebernehmen)
  else if (einzeln) {
    /* Der alte Weg, Stueck fuer Stueck - unveraendert. */
    if (lieferung.length > 0) lieferung.forEach(uebernehmen)
    else if ((b.lieferkostenChf ?? 0) > 0) {
      raus.push({ id: `${b.id}-lieferung`, art: 'lieferung', betragChf: b.lieferkostenChf as number,
        traeger: standardTraeger.lieferung, bezahlt: false, erfasst: false, geschaetzt: false })
    }
    if (mwst.length > 0) mwst.forEach(uebernehmen)
    else {
      const betrag = b.zollChf ?? einfuhrsteuerChf(herstellungChf)
      if (betrag > 0) {
        raus.push({ id: `${b.id}-mwst`, art: 'mwst', betragChf: betrag,
          traeger: standardTraeger.mwst, bezahlt: false, erfasst: false,
          geschaetzt: b.zollChf === undefined })
      }
    }
  } else {
    const netzZahl = b.positionen.reduce((n, p) => n + p.menge, 0)
    const betrag = runde2(frachtChf(netzZahl) + einfuhrsteuerChf(herstellungChf))
    if (betrag > 0) {
      raus.push({ id: `${b.id}-kargo`, art: 'kargo', betragChf: betrag,
        traeger: standardTraeger.lieferung, bezahlt: false, erfasst: false, geschaetzt: true })
    }
  }

  /*
   * DIE MONTAGE IST AUFWAND. Deniz' Entscheid, und er kehrt um, was hier
   * vorher stand: "Wer sich selbst fuer die eigene Arbeit bezahlt, hat keine
   * Ausgabe." Das gilt fuer eine Gewinnverteilung - fuer eine Leistung, die
   * zum Ansatz je Netz anfaellt, gilt es nicht. Montieren kostet, auch wenn
   * es die eigenen Leute tun.
   *
   * DER BETRAG KOMMT AUS DEM ANGEBOT, nicht aus einer Pauschale. Die 15
   * Franken je Netz in shopConfig sind die Vorbelegung des Formulars; im
   * Angebot laesst sich der Betrag ueberschreiben - nachgelassen, erhoeht,
   * geschenkt -, und was dort steht, ist der Aufwand. Wer stattdessen 15 mal
   * die Netzzahl rechnete, bekaeme bei jedem Nachlass einen Montage-Topf,
   * den es nicht gibt, und eine Marge, die nicht stimmt.
   *
   * Weil der Ansatz derselbe ist wie der Kundenpreis, ist der Montage-Topf
   * genau null: An der Verteilung aendert sich nichts, nur das
   * Betriebsergebnis sinkt um die Montagesumme. Die Anfahrt zaehlt mit: Wer
   * montiert, ist gefahren.
   *
   * HALBE / HALBE, wie der Schluessel in kostenConfig.ts es sagt. Es gibt
   * kein Feld "montiert von", also wird nichts erfunden.
   */
  const montage = vorhanden('montage')
  if (montage.length > 0) montage.forEach(uebernehmen)
  else {
    const betrag = runde2(montageBetrag(b) + (b.anfahrt === false ? 0 : (b.anfahrtChf ?? 0)))
    if (betrag > 0) {
      for (const wer of ['bora', 'ufuk', 'deniz'] as Beteiligter[]) {
        const anteil = schluessel.montage[wer]
        if (anteil <= 0) continue
        raus.push({ id: `${b.id}-montage-${wer}`, art: 'montage', betragChf: runde2(betrag * anteil),
          traeger: wer, bezahlt: false, erfasst: false, geschaetzt: false })
      }
    }
  }

  vorhanden('weiteres').forEach(uebernehmen)
  return raus
}

export function zahlenFuer(b: Bestellung): BestellZahlen {
  const montageChf = montageBetrag(b)
  const anfahrtChf = b.anfahrt === false ? 0 : (b.anfahrtChf ?? 0)
  const rabattChf = b.rabatt === false ? 0 : (b.rabattChf ?? 0)
  const netzeChf = runde2(b.summeChf - montageChf - anfahrtChf + rabattChf)

  /*
   * EINE QUELLE FUER DIE KOSTEN: `kostenPosten` oben. Frueher rechnete diese
   * Funktion dieselben Faelle ein zweites Mal durch, und die zwei Fassungen
   * liefen beim ersten Umbau auseinander – die Auswertung zeigte eine Marge,
   * die in der offenen-Posten-Liste nicht vorkam.
   */
  const posten = kostenPosten(b)
  const summeVon = (art: KostenArt) =>
    runde2(posten.filter((k) => k.art === art).reduce((s, k) => s + k.betragChf, 0))

  const herstellungChf = summeVon('herstellung')
  /*
   * KARGO ZAEHLT ZU BEIDEN, und darum wird es hier aufgeteilt statt
   * verschwiegen: Der kombinierte Posten enthaelt Fracht UND Einfuhrsteuer.
   * Stuende er nur in einer der beiden Zeilen, waere die andere falsch;
   * stuende er in keiner, fehlten seine Franken in den Gesamtkosten - und
   * genau das ist beim ersten Lauf passiert.
   *
   * Zerlegt wird nach derselben Formel, aus der er entsteht: die Steuer auf
   * der Ware, der Rest ist Fracht.
   */
  const montageKostenChf = summeVon('montage')
  const kargoChf = summeVon('kargo')
  const kargoSteuer = kargoChf > 0 ? Math.min(kargoChf, einfuhrsteuerChf(herstellungChf)) : 0
  const lieferungChf = runde2(summeVon('lieferung') + kargoChf - kargoSteuer)
  const mwstChf = runde2(summeVon('mwst') + kargoSteuer)
  const weitereChf = summeVon('weiteres')
  const geschaetzt = posten.some((k) => k.geschaetzt)

  const erloesChf = runde2(b.summeChf)
  const kostenChf = runde2(herstellungChf + lieferungChf + mwstChf + montageKostenChf + weitereChf)
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
    montageKostenChf,
    weitereChf,
    kostenChf,
    geschaetzt,
    margeChf,
    margeProzent: erloesChf > 0 ? Math.round((margeChf / erloesChf) * 1000) / 10 : null,
    netzZahl: b.positionen.reduce((s, p) => s + p.menge, 0),
  }
}

/* --- Perioden -------------------------------------------------------------- */

/**
 * ZWEI ABSCHNITTE, NICHT FUENF.
 *
 * Monat und Quartal sind draussen, solange es ein paar Dutzend Auftraege
 * sind: Eine Tabelle mit sechs Zeilen zu je einem oder zwei Auftraegen sagt
 * weniger als eine Zeile mit allen. Die Gruppierung selbst steht weiter hier
 * und ist geprueft – sie zurueckzuholen ist eine Zeile in dieser Liste und
 * eine im Schalter der Oberflaeche.
 */
export type Periode = 'ytd' | 'total'

export interface Abschnitt {
  /**
   * Schluessel des Abschnitts: die Jahreszahl oder 'alles'.
   *
   * DIE BESCHRIFTUNG BAUT DIE OBERFLAECHE daraus, nicht diese Datei: Sie
   * haengt an der gewaehlten Sprache, und die kennt die Rechnung nicht.
   * `etikett` bleibt als deutsche Fassung stehen, damit die Tests etwas
   * Lesbares vergleichen koennen.
   */
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

function schluesselFuer(iso: string, periode: Periode): { schluessel: string; etikett: string } | null {
  const jahr = iso.slice(0, 4)
  if (periode === 'total') return { schluessel: 'alles', etikett: 'Total, alles bisher' }
  /*
   * YTD IST DAS LAUFENDE JAHR UND SONST NICHTS. Aelteres faellt hier heraus
   * – es gehoert ins Total. Frueher kam je Jahr eine Zeile heraus, und die
   * aelteste hiess dann "2025 bis heute": falsch, denn das Jahr ist seit
   * Silvester vollstaendig.
   */
  const heuer = String(new Date().getFullYear())
  if (jahr !== heuer) return null
  return { schluessel: jahr, etikett: `${jahr} bis heute` }
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
  const hole = (iso: string): Abschnitt | null => {
    const treffer = schluesselFuer(iso, periode)
    if (!treffer) return null
    const { schluessel, etikett } = treffer
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
    if (!a) continue
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
    if (!a) continue
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
  /** Davon schon bezahlt. */
  bezahltKostenChf: number
  /** Davon noch zu bezahlen – die Kreditoren. */
  creditChf: number
  /**
   * Davon ohne Beleg: kein erfasster Kostenposten dahinter, der Betrag kommt
   * aus der Formel oder aus einem alten Feld.
   *
   * KEIN DRITTER TEIL DER SUMME, SONDERN EIN HINWEIS. Bezahlt und Credit
   * ergeben zusammen die Gesamtkosten; was ohne Beleg dasteht, steckt in
   * Credit mit drin. (Zuerst war es ein dritter Teil – solange nicht
   * erfasste Posten gar nicht offen standen. Seit sie es tun, waere es
   * doppelt gezaehlt.)
   */
  ohneBelegChf: number

  /** Erloes minus alle Kosten. Die Rechnung, wie sie in der Tabelle steht. */
  betriebsergebnisChf: number
  /** Betriebsergebnis in Prozent vom Erloes. */
  rentabilitaet: number | null

  /**
   * Dasselbe, aber nur mit dem, was wirklich geflossen ist: einkassiertes
   * Geld gegen bezahlte Rechnungen. Das ist, was auf dem Konto passiert ist.
   */
  realErgebnisChf: number

  /** Feste Auftraege in Stueck. */
  auftraegeAnzahl: number
  auftraegeNetze: number

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
  let auftraegeAnzahl = 0, auftraegeNetze = 0
  let realErloesChf = 0, realWarenkostenChf = 0, ohneBelegChf = 0
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
    auftraegeAnzahl += 1
    auftraegeNetze += z.netzZahl

    if (!z.realisiert) {
      inArbeitChf = runde2(inArbeitChf + z.erloesChf)
    } else if (z.einkassiert) {
      cashedChf = runde2(cashedChf + z.erloesChf)
      realErloesChf = runde2(realErloesChf + z.erloesChf)
    } else {
      debitChf = runde2(debitChf + z.erloesChf)
    }

    /*
     * Fuer die reale Rechnung zaehlt nur, was auch bezahlt ist. Nebenbei
     * faellt ab, wie viel ueberhaupt ohne Beleg dasteht – ueber
     * `kostenPosten`, nicht ueber `b.kosten`: Sonst fehlten genau die
     * nicht erfassten Posten, um die es dabei geht.
     */
    for (const k of kostenPosten(b)) {
      if (k.bezahlt) realWarenkostenChf = runde2(realWarenkostenChf + k.betragChf)
      if (!k.erfasst) ohneBelegChf = runde2(ohneBelegChf + k.betragChf)
    }
  }

  const betriebskostenChf = runde2(auslagen.reduce((s, l) => s + l.betragChf, 0))
  const realBetriebskostenChf = runde2(
    auslagen.filter((l) => l.bezahlt).reduce((s, l) => s + l.betragChf, 0))

  /*
   * CREDIT IST WIEDER DIE GANZE SUMME. Eine Weile musste die Montage hier
   * herausgerechnet werden, weil sie als Schuld dastand, ohne eine Koste zu
   * sein - bezahlt und offen gaben zusammen mehr als die Gesamtkosten. Seit
   * sie Aufwand ist, geht die Rechnung von selbst auf.
   */
  const schulden = offeneSchulden(bestellungen, auslagen)
  const creditChf = runde2(schulden.reduce((s, x) => s + x.betragChf, 0))

  const kostenChf = runde2(warenkostenChf + betriebskostenChf)
  const betriebsergebnisChf = runde2(erloesChf - kostenChf)

  /*
   * ZWEI TEILE, DIE AUFGEHEN: bezahlt und offen ergeben zusammen die
   * Gesamtkosten. Keiner der beiden wird als Rest des anderen gerechnet –
   * ein Rest verschluckt jeden Fehler, statt ihn zu zeigen. Dass die Summe
   * stimmt, prueft bau/pl-test.mjs.
   */
  const bezahltKostenChf = runde2(realWarenkostenChf + realBetriebskostenChf)

  return {
    erloesChf,
    cashedChf,
    debitChf,
    inArbeitChf,
    funnelChf,
    warenkostenChf,
    betriebskostenChf,
    kostenChf,
    bezahltKostenChf,
    creditChf,
    ohneBelegChf,
    betriebsergebnisChf,
    rentabilitaet: erloesChf > 0 ? Math.round((betriebsergebnisChf / erloesChf) * 1000) / 10 : null,
    realErgebnisChf: runde2(realErloesChf - realWarenkostenChf - realBetriebskostenChf),
    auftraegeAnzahl,
    auftraegeNetze,
    funnelAnzahl,
    funnelNetze,
    funnelKostenChf,
    funnelMargeChf,
  }
}

/* --- Warenkosten der festen Auftraege -------------------------------------- */

export interface Warenkosten {
  /** Wie viele feste Auftraege dahinterstehen. */
  auftraege: number
  herstellungChf: number
  lieferungChf: number
  mwstChf: number
  /** Fracht und Einfuhrsteuer zusammen, wie Bora sie stellt. */
  kargoChf: number
  /** Montage und Anfahrt – unsere eigene Arbeit, und trotzdem Aufwand. */
  montageChf: number
  weitereChf: number
  summeChf: number
  /** Davon noch nicht an den Traeger zurueckgeflossen. */
  offenChf: number
}

/**
 * Die Warenkosten aller festen Auftraege, nach Art aufgeteilt.
 *
 * DAMIT SIE NIEMAND VON HAND ERFASST. Unter den Betriebskosten stand bisher
 * nur, was jemand eingetippt hatte – die Netze fehlten dort, obwohl sie der
 * groesste Posten sind. Sie ergeben sich aus den Auftraegen ab der Zusage
 * und werden hier gerechnet, nicht gepflegt. Von Hand erfasst wird nur, was
 * zu keinem Auftrag gehoert: Werbung, Server, Material, Fahrten.
 */
export function warenkosten(bestellungen: Bestellung[]): Warenkosten {
  let auftraege = 0
  let herstellungChf = 0, lieferungChf = 0, mwstChf = 0, kargoChf = 0
  let montageChf = 0, weitereChf = 0, offenChf = 0
  for (const b of bestellungen) {
    if (!inRechnung(b)) continue
    auftraege += 1
    for (const k of kostenPosten(b)) {
      if (k.art === 'herstellung') herstellungChf = runde2(herstellungChf + k.betragChf)
      /*
       * Kargo steht als eigene Zeile, nicht aufgeteilt. Dieser Block
       * beschriftet den Betriebskosten-Block, und dort soll stehen, was auf
       * Boras Rechnung steht: Fracht und Steuer zusammen.
       */
      else if (k.art === 'kargo') kargoChf = runde2(kargoChf + k.betragChf)
      else if (k.art === 'montage') montageChf = runde2(montageChf + k.betragChf)
      else if (k.art === 'lieferung') lieferungChf = runde2(lieferungChf + k.betragChf)
      else if (k.art === 'mwst') mwstChf = runde2(mwstChf + k.betragChf)
      else weitereChf = runde2(weitereChf + k.betragChf)
      if (!k.bezahlt) offenChf = runde2(offenChf + k.betragChf)
    }
  }
  return {
    auftraege,
    herstellungChf,
    lieferungChf,
    mwstChf,
    kargoChf,
    montageChf,
    weitereChf,
    summeChf: runde2(herstellungChf + lieferungChf + mwstChf + kargoChf + montageChf + weitereChf),
    offenChf,
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
  /** Massgebliches Datum: Auslieferung, sonst Zusage. */
  seit: string
  /** Steht die Ware schon beim Kunden? */
  geliefert: boolean
}

/**
 * Wer uns was schuldet: jeder feste Auftrag, der nicht bezahlt ist.
 *
 * NICHT ERST AB DER AUSLIEFERUNG. Zuerst stand hier `realisiert` als
 * Bedingung, und die Liste blieb leer, obwohl mehrere Auftraege fest waren –
 * geliefert war nur noch keiner. Wer wissen will, was noch hereinkommt, will
 * genau diese Auftraege sehen; ob die Ware schon steht, sagt eine Spalte.
 */
export function offeneForderungen(bestellungen: Bestellung[]): Forderung[] {
  const raus: Forderung[] = []
  for (const b of bestellungen) {
    if (!inRechnung(b)) continue
    const z = zahlenFuer(b)
    if (z.einkassiert) continue
    raus.push({ bestellungId: b.id, kunde: b.kunde.name, betragChf: z.erloesChf,
      seit: z.datum, geliefert: z.realisiert })
  }
  return raus.sort((x, y) => (x.seit < y.seit ? -1 : 1))
}

export interface SchuldPosten {
  /** Woher der Posten kommt – fuer das Haekchen in der Oberflaeche. */
  bestellungId?: string
  auslageId?: string
  /**
   * Die Kennung des Postens innerhalb seines Auftrags.
   *
   * NICHT NUR DIE ART. Von "Weiteres" kann es mehrere geben; wer nach der
   * Art abhakt, setzt sie alle zugleich auf bezahlt.
   */
  postenId: string
  art: KostenArt | 'auslage'
  /**
   * Der eigene Name des Postens, wo es einen gibt: bei "Weiteres" und bei
   * den Auslagen. Die festen Arten beschriftet die OBERFLAECHE aus `art` –
   * hier darf kein deutscher Text stehen, sonst bleibt er auf Tuerkisch
   * stehen. (Genau das ist passiert: "Herstellung Netze" stand in der
   * tuerkischen Ansicht, weil es aus dieser Datei kam.)
   */
  bezeichnung?: string
  /** Zu welchem Auftrag der Posten gehoert. Bei Auslagen steht nichts. */
  kunde?: string
  betragChf: number
  am: string
  /** Kein erfasster Kostenposten dahinter – das Haekchen schreibt ihn fest. */
  erfasst: boolean
}

export interface Schuld {
  traeger: Beteiligter
  betragChf: number
  posten: SchuldPosten[]
}

/**
 * Wem wir was schulden: alles, was jemand ausgelegt und noch nicht
 * zurueckbekommen hat – aus den Bestellungen und aus den Auslagen.
 */
/**
 * Die Kennungen aller Posten, die in einer Abrechnung stecken.
 *
 * FUER DIE MONTAGE-SCHULD. Bei den Kostenposten sagt `bezahlt`, dass sie
 * erledigt sind - die Montage-Schuld hat aber keinen Datensatz, in den sich
 * das schreiben liesse: Sie ergibt sich aus dem Auftrag. Erledigt ist sie
 * deshalb genau dann, wenn sie in einer Abrechnung steht.
 */
export function abgerechnetePosten(abrechnungen: Abrechnung[]): Set<string> {
  const raus = new Set<string>()
  for (const a of abrechnungen) {
    for (const p of a.posten) raus.add(`${p.bestellungId ?? p.auslageId ?? ''}:${p.postenId}`)
  }
  return raus
}

export function offeneSchulden(
  bestellungen: Bestellung[],
  auslagen: Auslage[],
  abrechnungen: Abrechnung[] = [],
): Schuld[] {
  const schon = abgerechnetePosten(abrechnungen)
  const karte = new Map<Beteiligter, Schuld>()
  const hole = (t: Beteiligter): Schuld => {
    let s = karte.get(t)
    if (!s) { s = { traeger: t, betragChf: 0, posten: [] }; karte.set(t, s) }
    return s
  }
  for (const b of bestellungen) {
    if (!inRechnung(b)) continue

    /*
     * DIE MONTAGE STEHT HIER NICHT MEHR EXTRA. Sie war eine Weile ein
     * Sonderfall - sichtbar als Schuld, aber keine Koste. Seit sie Aufwand
     * ist, kommt sie wie jeder andere Posten aus `kostenPosten` und braucht
     * keinen eigenen Zweig: weniger Code, und `bezahlt` ist wieder die
     * einzige Wahrheit darueber, ob sie erledigt ist.
     */

    /*
     * NICHT ERFASSTE POSTEN ZAEHLEN MIT. Zuerst standen hier nur die von Hand
     * erfassten – und die Liste blieb leer, obwohl Bora die Netze und die
     * Fracht laengst ausgelegt hatte. Niemand tippt diese Betraege ein; sie
     * ergeben sich aus dem Auftrag, und bis jemand "bezahlt" setzt, stehen
     * sie offen.
     */
    for (const k of kostenPosten(b)) {
      if (k.bezahlt) continue
      if (schon.has(`${b.id}:${k.id}`)) continue
      const s = hole(k.traeger)
      s.betragChf = runde2(s.betragChf + k.betragChf)
      s.posten.push({
        bestellungId: b.id,
        postenId: k.id,
        art: k.art,
        ...(k.bezeichnung ? { bezeichnung: k.bezeichnung } : {}),
        kunde: b.kunde.name,
        betragChf: k.betragChf,
        am: b.zusageAm ?? b.eingang,
        erfasst: k.erfasst,
      })
    }
  }
  for (const l of auslagen) {
    if (l.bezahlt) continue
    if (schon.has(`${l.id}:${l.id}`)) continue
    const s = hole(l.traeger)
    s.betragChf = runde2(s.betragChf + l.betragChf)
    s.posten.push({
      auslageId: l.id,
      postenId: l.id,
      art: 'auslage',
      bezeichnung: l.bezeichnung,
      betragChf: l.betragChf,
      am: l.am,
      erfasst: true,
    })
  }

  for (const s of karte.values()) s.posten.sort((x, y) => (x.am < y.am ? -1 : 1))
  return [...karte.values()].sort((x, y) => y.betragChf - x.betragChf)
}

/* --- Abrechnung ------------------------------------------------------------ */

/**
 * Ein Auftrag, dessen Geld da ist und der noch in keiner Abrechnung steht.
 *
 * DIE EINNAHMESEITE EINER ABRECHNUNG, und sie kommt NICHT aus
 * `offeneForderungen`: Dort stehen die UNbezahlten – das ist ihre Definition.
 * Wer dort etwas abhakt, sagt "das Geld ist eingegangen", und die Zeile
 * verschwindet. Genau das Geld, das verteilt werden soll, findet sich in
 * jener Liste also nie.
 */
export interface Einnahme {
  bestellungId: string
  referenz: string
  kunde: string
  erloesChf: number
  warenerloesChf: number
  montageerloesChf: number
  /** Seit wann das Geld da ist. */
  am: string
}

/** Die Kennungen aller Auftraege, die in einer Abrechnung stecken. */
export function abgerechneteAuftraege(abrechnungen: Abrechnung[]): Set<string> {
  const raus = new Set<string>()
  for (const a of abrechnungen) for (const x of a.auftraege) raus.add(x.bestellungId)
  return raus
}

/**
 * Was noch zu verteilen ist: bezahlte Auftraege ausserhalb jeder Abrechnung.
 *
 * ENTWUERFE ZAEHLEN MIT. Ein Auftrag, der in einer offenen Abrechnung liegt,
 * steht hier nicht mehr zur Wahl – sonst liesse er sich in zwei Abrechnungen
 * zugleich legen und das Geld waere zweimal verteilt.
 */
export function offeneEinnahmen(bestellungen: Bestellung[], abrechnungen: Abrechnung[]): Einnahme[] {
  const schon = abgerechneteAuftraege(abrechnungen)
  const raus: Einnahme[] = []
  for (const b of bestellungen) {
    if (!inRechnung(b) || schon.has(b.id)) continue
    const z = zahlenFuer(b)
    if (!z.einkassiert) continue
    raus.push({
      bestellungId: b.id,
      referenz: b.referenz,
      kunde: b.kunde.name,
      erloesChf: z.erloesChf,
      /* Der Rabatt mindert die Ware – nachgelassen wird auf den Netzpreis. */
      warenerloesChf: runde2(z.netzeChf - z.rabattChf),
      montageerloesChf: runde2(z.montageChf + z.anfahrtChf),
      am: b.bezahltAm ?? b.bezahlung?.zeitpunkt ?? z.datum,
    })
  }
  return raus.sort((x, y) => (x.am < y.am ? -1 : 1))
}

/** Die Summen einer Abrechnung, aus ihren Zeilen gerechnet. */
export interface AbrechnungZahlen {
  erloesChf: number
  warenerloesChf: number
  montageerloesChf: number
  warenkostenChf: number
  /** Was fuer Montage und Anfahrt an Ufuk und Deniz zurueckgeht. */
  montagekostenChf: number
  betriebskostenChf: number
  rueckzahlungChf: number
  rueckzahlung: Record<Beteiligter, number>
  warengewinnChf: number
  montagegewinnChf: number
  verteilbarChf: number
  anteile: Record<Beteiligter, number>
  summe: Record<Beteiligter, number>
}

/**
 * Was eine Abrechnung aus diesen Auftraegen und Auslagen ergibt.
 *
 * ZUERST ZURUECK, DANN VERTEILEN. Wer etwas ausgelegt hat, bekommt es vom
 * eingegangenen Geld zuerst zurueck; erst was danach bleibt, geht nach den
 * Schluesseln.
 *
 * ZWEI TOEPFE, wie abgemacht: Die Ware kauft Bora ein, daran ist er
 * beteiligt. Montage und Anfahrt sind die Arbeit von Ufuk und Deniz und
 * werden unter ihnen geteilt. Die Schluessel stehen in
 * src/data/kostenConfig.ts – auch, aus welchem Topf die Betriebskosten
 * bezahlt werden.
 *
 * EIN TOPF IM MINUS WIRD NICHT VERTEILT. Die Anzeige las sonst "Bora
 * -10.02", und das sieht aus, als schuldete Bora uns Geld. In Wahrheit ist
 * nur noch nichts zu verteilen. Der Topf bleibt negativ stehen, denn das
 * ist die Lage; die Anteile werden bei null abgeschnitten. Die Rueckzahlung
 * bleibt davon unberuehrt: Eine Auslage geht zurueck, auch wenn am Ende
 * nichts zu verteilen ist.
 */
export function abrechnungZahlen(
  auftraege: AbrechnungAuftrag[],
  posten: AbrechnungPosten[],
): AbrechnungZahlen {
  let erloesChf = 0
  let warenerloesChf = 0
  let montageerloesChf = 0
  for (const a of auftraege) {
    erloesChf = runde2(erloesChf + a.erloesChf)
    warenerloesChf = runde2(warenerloesChf + a.warenerloesChf)
    montageerloesChf = runde2(montageerloesChf + a.montageerloesChf)
  }

  const rueckzahlung: Record<Beteiligter, number> = { bora: 0, ufuk: 0, deniz: 0 }
  let warenkostenChf = 0
  let montagekostenChf = 0
  let betriebskostenChf = 0
  for (const p of posten) {
    rueckzahlung[p.traeger] = runde2(rueckzahlung[p.traeger] + p.betragChf)
    if (p.art === 'auslage') betriebskostenChf = runde2(betriebskostenChf + p.betragChf)
    /*
     * DIE MONTAGE GEHT VOM MONTAGE-TOPF AB, nicht vom Waren-Topf. Sonst
     * waere es so, als haette Bora unsere Montage bezahlt: Sein Anteil
     * stiege, weil wir uns selbst fuer unsere Arbeit auszahlen.
     */
    else if (p.art === 'montage') montagekostenChf = runde2(montagekostenChf + p.betragChf)
    else warenkostenChf = runde2(warenkostenChf + p.betragChf)
  }
  const rueckzahlungChf = runde2(warenkostenChf + montagekostenChf + betriebskostenChf)

  const aufWare = schluessel.betriebskosten === 'ware'
  const warengewinnChf = runde2(warenerloesChf - warenkostenChf - (aufWare ? betriebskostenChf : 0))
  const montagegewinnChf = runde2(montageerloesChf - montagekostenChf - (aufWare ? 0 : betriebskostenChf))

  const anteile: Record<Beteiligter, number> = { bora: 0, ufuk: 0, deniz: 0 }
  const summe: Record<Beteiligter, number> = { bora: 0, ufuk: 0, deniz: 0 }
  const ware = Math.max(0, warengewinnChf)
  const montage = Math.max(0, montagegewinnChf)
  for (const wer of ['bora', 'ufuk', 'deniz'] as Beteiligter[]) {
    anteile[wer] = runde2(ware * schluessel.ware[wer] + montage * schluessel.montage[wer])
    summe[wer] = runde2(anteile[wer] + rueckzahlung[wer])
  }

  return {
    erloesChf,
    warenerloesChf,
    montageerloesChf,
    warenkostenChf,
    montagekostenChf,
    betriebskostenChf,
    rueckzahlungChf,
    rueckzahlung,
    warengewinnChf,
    montagegewinnChf,
    verteilbarChf: runde2(ware + montage),
    anteile,
    summe,
  }
}

/** Das naechste freie Etikett: A-<Jahr>-<laufende Nummer>. */
export function naechsteAbrechnungsnummer(abrechnungen: Abrechnung[], jetzt = new Date()): string {
  const jahr = jetzt.getFullYear()
  const anfang = `A-${jahr}-`
  const hoechste = abrechnungen
    .map((a) => a.nummer)
    .filter((n) => n.startsWith(anfang))
    .map((n) => Number(n.slice(anfang.length)))
    .filter((n) => Number.isFinite(n))
    .reduce((h, n) => Math.max(h, n), 0)
  return `${anfang}${String(hoechste + 1).padStart(2, '0')}`
}
