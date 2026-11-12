import type { BestellAenderung, Bestellung, BestellPosition } from '../types'
import { shopConfig } from '../data/shopConfig'
import { betragOderNull } from './format'
import { gerechneterPreis, montageBetrag, vorschlagFuer } from '../components/admin/hilfen'

/*
 * Das Angebot – die Regeln ohne Oberflaeche.
 *
 * WARUM HIER: Der Web-Admin (Angebot.tsx) und die native App (app/) stellen
 * dasselbe Angebot zusammen. Vorbelegung, Summen, Rabattdeckel und was beim
 * Speichern mitgeht, duerfen nur an einer Stelle stehen. Die Begruendungen
 * im Einzelnen stehen im Kopf von Angebot.tsx; getestet in
 * bau/angebot-test.mjs.
 */

// Liest auch "1'234.50" (Schweizer Apostroph) – siehe betragAusText() in format.ts.
const zahl = betragOderNull
const runde2 = (n: number) => Math.round(n * 100) / 100

/** Woran ein Preisfeld haengt: die Kennung der Position, sonst ihr Platz. */
export const schluesselFuer = (p: BestellPosition, i: number) => p.id ?? `#${i}`

/** Was im Angebot bearbeitet wird – als Text, weil Felder auch leer sein duerfen. */
export interface AngebotEntwurf {
  preise: Record<string, string>
  montage: boolean
  montageChf: string
  anfahrt: boolean
  anfahrtChf: string
  rabatt: boolean
  rabattChf: string
  rabattText: string
}

/**
 * Die Vorbelegung. Preisfelder: der festgelegte Verkaufspreis, sonst der
 * Vorschlag. Montage: was gespeichert ist, sonst der Ansatz je Netz.
 * Anfahrt beim ERSTEN Mal eingeschaltet (im Liefergebiet null – und das
 * soll auf der Offerte stehen), danach so, wie es gespeichert ist.
 */
export function angebotStart(b: Bestellung): AngebotEntwurf {
  const netzZahl = b.positionen.reduce((n, p) => n + p.menge, 0)
  const betrag = montageBetrag(b)
  return {
    preise: Object.fromEntries(
      b.positionen.map((p, i) => {
        const vorschlag = vorschlagFuer(p)
        const start = p.preisChf > 0 ? p.preisChf : (vorschlag ?? 0)
        return [schluesselFuer(p, i), start > 0 ? String(start) : '']
      }),
    ),
    montage: b.montage === true || betrag > 0,
    montageChf: betrag > 0 ? String(betrag) : String(runde2(netzZahl * shopConfig.montageChf)),
    anfahrt: !b.preiseFestgelegtAm || b.anfahrt === true,
    anfahrtChf: b.anfahrtChf !== undefined ? String(b.anfahrtChf) : '0',
    rabatt: b.rabatt === true || (b.rabattChf ?? 0) > 0,
    rabattChf: b.rabattChf ? String(b.rabattChf) : '',
    rabattText: b.rabattText ?? '',
  }
}

/** Wie viele gestempelte Richtpreise von dem abweichen, was der Rechner heute sagt. */
export function abweichendeStempel(b: Bestellung): number {
  return b.positionen.filter((p) => {
    const gerechnet = gerechneterPreis(p.breiteCm, p.hoeheCm, p.netzart)
    return gerechnet !== null && typeof p.richtpreisChf === 'number' && p.richtpreisChf !== gerechnet
  }).length
}

/** Die Summen. Nie mehr Rabatt als da ist – der Server deckelt ebenso. */
export function angebotRechnung(b: Bestellung, e: AngebotEntwurf) {
  const verkauf = (p: BestellPosition, i: number) => zahl(e.preise[schluesselFuer(p, i)] ?? '')
  const netzeChf = runde2(b.positionen.reduce((s, p, i) => s + verkauf(p, i) * p.menge, 0))
  const montageSumme = e.montage ? zahl(e.montageChf) : 0
  const anfahrtSumme = e.anfahrt ? zahl(e.anfahrtChf) : 0
  const rabattSumme = e.rabatt ? Math.min(zahl(e.rabattChf), runde2(netzeChf + montageSumme + anfahrtSumme)) : 0
  return {
    verkauf,
    netzeChf,
    montageSumme,
    anfahrtSumme,
    rabattSumme,
    totalChf: runde2(netzeChf + montageSumme + anfahrtSumme - rabattSumme),
    unvollstaendig: b.positionen.some((p, i) => verkauf(p, i) <= 0),
  }
}

/** Preisfelder mit der Rechnung von heute (fuer «neu rechnen»). */
export function preiseNeuGerechnet(b: Bestellung, preise: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    b.positionen.map((p, i) => {
      const gerechnet = gerechneterPreis(p.breiteCm, p.hoeheCm, p.netzart)
      return [schluesselFuer(p, i), gerechnet ? String(gerechnet) : (preise[schluesselFuer(p, i)] ?? '')]
    }),
  )
}

/** Preisfelder mit den Vorschlaegen (gestempelt oder gerechnet). */
export function preiseAusVorschlaegen(b: Bestellung, preise: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    b.positionen.map((p, i) => {
      const vorschlag = vorschlagFuer(p)
      return [schluesselFuer(p, i), vorschlag ? String(vorschlag) : (preise[schluesselFuer(p, i)] ?? '')]
    }),
  )
}

/**
 * Was beim Festlegen an den Server geht. Die Positionen bleiben, wie sie
 * sind – nur der Verkaufspreis wird neu, die Kennung geht mit. Der Vorschlag
 * wird gestempelt, wenn noch keiner da ist; ersetzt nur mit `stempelErsetzen`
 * (dann mit der Rechnung von heute, nicht mit dem verlangten Preis).
 */
export function angebotAenderung(b: Bestellung, e: AngebotEntwurf, stempelErsetzen: boolean): BestellAenderung {
  const r = angebotRechnung(b, e)
  return {
    positionen: b.positionen.map((p, i) => {
      const zeile: BestellPosition = { ...p, preisChf: r.verkauf(p, i) }
      const gerechnet = gerechneterPreis(p.breiteCm, p.hoeheCm, p.netzart)
      if (stempelErsetzen) {
        if (gerechnet !== null) zeile.richtpreisChf = gerechnet
      } else {
        const vorschlag = vorschlagFuer(p)
        if (zeile.richtpreisChf === undefined && vorschlag !== null) zeile.richtpreisChf = vorschlag
      }
      return zeile
    }),
    ...(stempelErsetzen ? { richtpreiseNeu: true } : {}),
    montage: e.montage,
    montageChf: r.montageSumme,
    anfahrt: e.anfahrt,
    anfahrtChf: r.anfahrtSumme,
    rabatt: e.rabatt,
    rabattChf: r.rabattSumme,
    rabattText: r.rabattSumme > 0 ? e.rabattText.trim() : '',
    preiseFestgelegt: true,
  }
}
