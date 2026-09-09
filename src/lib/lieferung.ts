import type { Bestellung, Lieferung, LieferungZeile } from '../types'
import { montageBetrag } from '../components/admin/hilfen'

/**
 * Was eine Lieferrunde kostet und was sie einbringt.
 *
 * Der Zweck der ganzen Uebung: In `shopConfig` steht seit Anfang
 * `minimumBatchNets: 25` – ab wann eine Runde ihre Fracht traegt. Das war
 * eine Schaetzung. Mit Boras Zahlen wird eine Rechnung daraus.
 *
 * Zwei Entscheidungen darin sind bewusst:
 *
 * 1. DIE MONTAGE ZAEHLT NICHT ZUM ERLOES. Sie ist unsere Arbeit, nicht Ware.
 *    Wer sie mitrechnet, sieht eine Marge, die es auf der Ware nicht gibt.
 * 2. FEHLENDE EINKAUFSPREISE WERDEN NICHT GESCHAETZT, sondern gezaehlt.
 *    Solange nicht alle Zeilen einen Preis haben, ist die Marge unvollstaendig
 *    und sagt das auch.
 */

export interface Rechnung {
  netze: number
  /** Summe der eingetragenen Einkaufspreise. */
  einkaufChf: number
  /** Wie viele Zeilen noch keinen Preis haben. Solange > 0, ist alles vorlaeufig. */
  zeilenOhnePreis: number
  lieferkostenChf: number
  /**
   * True, wenn sowohl je Paket als auch fuer die ganze Lieferung ein Betrag
   * dasteht. Dann gilt der Gesamtbetrag – aber es gehoert nachgefragt.
   */
  lieferkostenDoppelt: boolean
  /** Einkauf plus Fracht. */
  einsatzChf: number
  /** Was die Kundschaft für die Ware zahlt, ohne Montage. */
  warenerloesChf: number
  margeChf: number
  /** Marge in Prozent des Erlöses. Null, solange kein Erlös feststeht. */
  margeProzent: number | null
  einsatzJeNetzChf: number | null
}

/**
 * Die Zeilen, die noch zur Runde gehoeren.
 *
 * Zeilen ausgestiegener Bestellungen bleiben stehen – sie werden auf dem
 * Dokument durchgestrichen, damit Bora seine Preise an den gewohnten
 * Nummern wiederfindet. Gerechnet wird mit ihnen aber nicht mehr: Was nicht
 * bestellt wird, kostet nichts und bringt nichts.
 */
export function laufendeZeilen(lieferung: Lieferung): LieferungZeile[] {
  const raus = new Set((lieferung.entfernt ?? []).map((a) => a.bestellungId))
  if (raus.size === 0) return lieferung.zeilen
  return lieferung.zeilen.filter((z) => !z.herkunft || !raus.has(z.herkunft.bestellungId))
}

/** Die Fracht der Runde. Der Gesamtbetrag gilt vor den Einzelbetraegen. */
export function lieferkosten(lieferung: Lieferung): { betrag: number; doppelt: boolean } {
  const jePaket = Object.values(lieferung.lieferkostenJePaket ?? {})
  const summeJePaket = jePaket.reduce((s, x) => s + x, 0)
  const gesamt = lieferung.lieferkostenChf

  if (gesamt !== undefined && gesamt > 0) {
    return { betrag: gesamt, doppelt: summeJePaket > 0 }
  }
  return { betrag: Math.round(summeJePaket * 100) / 100, doppelt: false }
}

export function rechne(lieferung: Lieferung, bestellungen: Bestellung[]): Rechnung {
  const zeilen = laufendeZeilen(lieferung)
  const mitPreis = zeilen.filter((z) => typeof z.einkaufChf === 'number')
  const einkaufChf = Math.round(mitPreis.reduce((s, z) => s + (z.einkaufChf ?? 0), 0) * 100) / 100

  const fracht = lieferkosten(lieferung)
  const einsatzChf = Math.round((einkaufChf + fracht.betrag) * 100) / 100

  // Nur die Bestellungen, die wirklich in dieser Runde stecken.
  const dabei = bestellungen.filter((b) => lieferung.bestellungIds.includes(b.id))
  const warenerloesChf =
    Math.round(dabei.reduce((s, b) => s + (b.summeChf - montageBetrag(b)), 0) * 100) / 100

  const margeChf = Math.round((warenerloesChf - einsatzChf) * 100) / 100

  return {
    netze: zeilen.length,
    einkaufChf,
    zeilenOhnePreis: zeilen.length - mitPreis.length,
    lieferkostenChf: fracht.betrag,
    lieferkostenDoppelt: fracht.doppelt,
    einsatzChf,
    warenerloesChf,
    margeChf,
    margeProzent: warenerloesChf > 0 ? Math.round((margeChf / warenerloesChf) * 1000) / 10 : null,
    einsatzJeNetzChf: zeilen.length > 0 ? Math.round((einsatzChf / zeilen.length) * 100) / 100 : null,
  }
}

/** Die Zeilen einer Lieferung nach Paket gruppiert – fuer die Preiserfassung. */
export function nachPaket(zeilen: LieferungZeile[]): Map<string, LieferungZeile[]> {
  const raus = new Map<string, LieferungZeile[]>()
  for (const zeile of zeilen) {
    const liste = raus.get(zeile.kennung) ?? []
    liste.push(zeile)
    raus.set(zeile.kennung, liste)
  }
  return raus
}
