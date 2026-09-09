import type { Bestellung, Lieferung } from '../types'
import { kennungFuer } from './bestellauftrag'
import { laufendeZeilen, lieferkosten } from './lieferung'
import { montageBetrag } from '../components/admin/hilfen'

/**
 * Die Einkaufszahlen von der Runde auf die Bestellung.
 *
 * Boras Preise landen zuerst in der Lieferrunde, denn dort traegt man sie
 * ein. Dort duerfen sie aber nicht bleiben: Die Runde ist ein Arbeitspapier,
 * die Bestellung ist der Datensatz. Eine Bestellung kann eine Runde
 * verlassen und in einer zweiten landen, eine Runde kann verworfen werden –
 * und die Frage "was hat dieser Kunde uns gebracht" kommt Jahre spaeter.
 *
 * Deshalb wird zurueckgeschrieben, und zwar SOBALD ein Preis dasteht, nicht
 * erst beim verbindlichen Bestellen. Sonst waeren die Zahlen weg, wenn eine
 * Bestellung mangels Zusage aus der Runde faellt – und die naechste Runde
 * muesste Bora dieselbe Frage nochmals stellen.
 *
 * AUSGESTIEGENE BESTELLUNGEN zaehlen nicht mehr mit. Ihre Zeilen stehen
 * weiter im Dokument, durchgestrichen – aber sie werden nicht geliefert,
 * also tragen sie weder Einkauf noch Fracht. Ohne das schriebe der Server
 * die Preise gleich wieder auf eine Bestellung, die er gerade
 * zurueckgestellt hat.
 *
 * DER FRACHTANTEIL. Ein Paket ist genau eine Bestellung, deshalb ist
 * `lieferkostenJePaket` bereits die Aufteilung. Nennt Bora nur ein Total,
 * wird nach Netzanzahl geteilt und als geschaetzt vermerkt. Nicht nach
 * Betrag: Fracht haengt am Volumen, nicht am Verkaufspreis.
 */

/** Was fuer eine Bestellung aus der Runde herausfaellt. */
export interface EinkaufAnteil {
  bestellungId: string
  /** Einkaufspreis JE STUECK, nach Positionskennung. Wie `preisChf` auch. */
  jePosition: Record<string, number>
  lieferkostenChf?: number
  lieferkostenGeschaetzt: boolean
  /** Wie viele Zeilen dieser Bestellung noch ohne Preis sind. */
  ohnePreis: number
}

function runde2(x: number): number {
  return Math.round(x * 100) / 100
}

/**
 * Die Einkaufszahlen je Bestellung einer Runde.
 *
 * Positionen mit Menge > 1 stehen in der Runde als mehrere Zeilen. Der
 * Positionspreis ist der Mittelwert ihrer Zeilen – normalerweise sind alle
 * gleich, aber wenn Bora fuer ein Stueck mehr verlangt, geht die Differenz
 * nicht verloren.
 */
export function einkaufAusRunde(
  lieferung: Lieferung,
  /*
   * Nur Referenz und Id: Daraus wird die Paketkennung, unter der Bora seine
   * Frachtkosten eintraegt. Mehr braucht die Aufteilung nicht, und der enge
   * Typ macht sie auch fuer die API brauchbar, die ihre Bestellungen roh aus
   * dem Speicher liest.
   */
  bestellungen: { id: string; referenz: string }[],
): EinkaufAnteil[] {
  const jeBestellung = new Map<string, { jePosition: Map<string, number[]>; ohnePreis: number; netze: number }>()

  for (const zeile of laufendeZeilen(lieferung)) {
    if (!zeile.herkunft) continue // Zusatzzeilen gehoeren zu keiner Bestellung.
    const { bestellungId, positionId } = zeile.herkunft
    const eintrag = jeBestellung.get(bestellungId) ?? { jePosition: new Map(), ohnePreis: 0, netze: 0 }
    jeBestellung.set(bestellungId, eintrag)
    eintrag.netze++
    if (typeof zeile.einkaufChf !== 'number') {
      eintrag.ohnePreis++
      continue
    }
    const bisher = eintrag.jePosition.get(positionId) ?? []
    bisher.push(zeile.einkaufChf)
    eintrag.jePosition.set(positionId, bisher)
  }

  const fracht = lieferkosten(lieferung)
  const netzeGesamt = [...jeBestellung.values()].reduce((n, e) => n + e.netze, 0)

  return [...jeBestellung.entries()].map(([bestellungId, eintrag]) => {
    const bestellung = bestellungen.find((b) => b.id === bestellungId)
    const jePaket = bestellung ? lieferung.lieferkostenJePaket?.[kennungFuer(bestellung)] : undefined

    let anteil: number | undefined
    let geschaetzt = false
    if (typeof jePaket === 'number') {
      anteil = runde2(jePaket)
    } else if (fracht.betrag > 0 && netzeGesamt > 0) {
      anteil = runde2((fracht.betrag * eintrag.netze) / netzeGesamt)
      geschaetzt = true
    }

    const jePosition: Record<string, number> = {}
    for (const [positionId, preise] of eintrag.jePosition) {
      jePosition[positionId] = runde2(preise.reduce((s, x) => s + x, 0) / preise.length)
    }

    return {
      bestellungId,
      jePosition,
      lieferkostenChf: anteil,
      lieferkostenGeschaetzt: geschaetzt,
      ohnePreis: eintrag.ohnePreis,
    }
  })
}

/** Was von einer Bestellung uebrig bleibt, wenn Einkauf und Fracht ab sind. */
export interface BestellMarge {
  /** Summe der Einkaufspreise aller Positionen. */
  einkaufChf: number
  lieferkostenChf: number
  /** Verkauf OHNE Montage – die ist unsere Arbeit, nicht Ware. */
  warenerloesChf: number
  margeChf: number
  margeProzent: number | null
  /**
   * Ob der Datensatz vollstaendig ist: jede Position mit Einkaufspreis. Ohne
   * das ist die Marge zu gut, denn es fehlen Kosten – nicht Erloese.
   */
  vollstaendig: boolean
  /** Wie viele Positionen noch keinen Einkaufspreis tragen. */
  ohnePreis: number
}

export function margeFuer(b: Bestellung): BestellMarge {
  let einkaufChf = 0
  let ohnePreis = 0
  for (const p of b.positionen) {
    if (typeof p.einkaufChf === 'number') einkaufChf += p.einkaufChf * p.menge
    else ohnePreis += 1
  }
  einkaufChf = runde2(einkaufChf)
  const lieferkostenChf = b.lieferkostenChf ?? 0
  const warenerloesChf = runde2(b.summeChf - montageBetrag(b))
  const margeChf = runde2(warenerloesChf - einkaufChf - lieferkostenChf)
  return {
    einkaufChf,
    lieferkostenChf,
    warenerloesChf,
    margeChf,
    margeProzent: warenerloesChf > 0 ? Math.round((margeChf / warenerloesChf) * 1000) / 10 : null,
    vollstaendig: ohnePreis === 0 && b.positionen.length > 0,
    ohnePreis,
  }
}
