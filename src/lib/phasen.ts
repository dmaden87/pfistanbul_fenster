import type { Bestellung, BestellStatus, Lieferung } from '../types'

/**
 * Die Phasen des Betreibers – Lesehilfen fuer die Oberflaeche.
 *
 * Hier wird NICHTS mehr abgeleitet, was eine Phase waere: Die Phase steht in
 * `bestellung.status` und wird von Hand gesetzt. Was hier steht, sind die
 * Fragen, die die Karte und die Uebersicht an eine Bestellung stellen –
 * in welchen Abschnitt gehoert sie, ist sie abgeschlossen, was fehlt ihr
 * noch, wohin kaeme sie beim Wiederoeffnen.
 *
 * Die Abbildung ALTER Statuswerte steht bewusst nicht hier, sondern in
 * api/_phasen.ts: Sie geschieht beim Lesen auf dem Server, damit die
 * Oberflaeche nur noch die sieben gueltigen Werte sieht. (api/ darf nicht
 * aus src/ importieren; PHASEN gibt es deshalb dort ein zweites Mal, und
 * bau/phasen-test.mjs haelt beide gleich.)
 */

/** Die sechs Phasen in der Reihenfolge des Ablaufs. "abgesagt" steht daneben. */
export const PHASEN: readonly BestellStatus[] = ['neu', 'klaerung', 'kosten', 'offerte', 'bestellen', 'ausliefern']

/** Die Abschnitte der Uebersicht: die sechs Phasen und das Archiv. */
export type Abschnitt = (typeof PHASEN)[number] | 'archiv'
export const ABSCHNITTE: readonly Abschnitt[] = [...PHASEN, 'archiv']

/**
 * Wann bezahlt wurde.
 *
 * Zwei Quellen: der Haken bei der Uebergabe, und Stripe. Stripe zaehlt aber
 * nur, wenn der abgebuchte Betrag die Summe noch deckt. Netze duerfen nach
 * der Onlinezahlung geaendert werden – wird die Bestellung dabei teurer,
 * ist sie NICHT mehr bezahlt, und wer das uebersieht, liefert aus und
 * kassiert den Rest nie.
 */
export function bezahltAm(b: Bestellung): string | undefined {
  if (b.bezahltAm) return b.bezahltAm
  if (b.bezahlung?.status !== 'bezahlt') return undefined
  return b.bezahlung.betragChf + 0.005 >= b.summeChf ? b.bezahlung.zeitpunkt : undefined
}

/** Was von einer Onlinezahlung noch offen ist, nach einer Aenderung der Netze. */
export function restbetragChf(b: Bestellung): number {
  if (b.bezahltAm) return 0
  const bezahlt = b.bezahlung?.status === 'bezahlt' ? b.bezahlung.betragChf : 0
  return Math.max(0, Math.round((b.summeChf - bezahlt) * 100) / 100)
}

/** Abgeschlossen ist keine Phase: uebergeben UND bezahlt, in der letzten Phase. */
export function abgeschlossen(b: Bestellung): boolean {
  return b.status === 'ausliefern' && Boolean(b.ausgeliefertAm) && Boolean(bezahltAm(b))
}

/**
 * Onlinezahlung gewaehlt, aber nichts eingegangen – abgebrochen oder nie
 * abgeschlossen. So eine Bestellung gilt nicht als zugesagt, auch wenn sie
 * in "bestellen" steht: An der Kasse ist sie gescheitert.
 */
export function zahlungAusstehend(b: Bestellung): boolean {
  return b.zahlung === 'online' && b.bezahlung?.status !== 'bezahlt' && !b.bezahltAm
}

/** Katalogware aus dem Warenkorb: die Phasen 1–4 entfallen. */
export function phasenEntfallen(b: Bestellung): boolean {
  return b.art === 'bestellung'
}

/** Wie viele Positionen noch keinen Einkaufspreis von Bora haben. */
export function ohneEinkauf(b: Bestellung): number {
  return b.positionen.filter((p) => typeof p.einkaufChf !== 'number').length
}

/** Wie viele Positionen noch keinen Verkaufspreis haben – die Offerte druckte 0.00. */
export function ohneVerkauf(b: Bestellung): number {
  return b.positionen.filter((p) => !(p.preisChf > 0)).length
}

/**
 * Die Runde, in der eine Bestellung gerade steckt: die neueste, die sie
 * fuehrt. Bewusst abgeleitet und nicht als Feld – die Runde fuehrt ihre
 * `bestellungIds` ohnehin, ein zweites Feld waere eine zweite Wahrheit.
 */
export function rundeFuer(b: Bestellung, lieferungen: Lieferung[]): Lieferung | undefined {
  let neueste: Lieferung | undefined
  for (const l of lieferungen) {
    if (!l.bestellungIds.includes(b.id)) continue
    if (!neueste || l.erstellt > neueste.erstellt) neueste = l
  }
  return neueste
}

/** In welchen Abschnitt der Uebersicht eine Bestellung gehoert. */
export function abschnittFuer(b: Bestellung): Abschnitt {
  if (b.status === 'abgesagt') return 'archiv'
  if (abgeschlossen(b)) return 'archiv'
  return b.status
}

/** Alle Bestellungen nach Abschnitt, in der Reihenfolge der Phasen; leere Abschnitte als leere Liste. */
export function nachAbschnitt(bestellungen: Bestellung[]): Map<Abschnitt, Bestellung[]> {
  const gruppen = new Map<Abschnitt, Bestellung[]>()
  for (const a of ABSCHNITTE) gruppen.set(a, [])
  for (const b of bestellungen) gruppen.get(abschnittFuer(b))!.push(b)
  return gruppen
}

/** Die naechste Phase im Ablauf, oder undefined am Ende. */
export function naechstePhase(status: BestellStatus): BestellStatus | undefined {
  const i = PHASEN.indexOf(status)
  return i >= 0 ? PHASEN[i + 1] : undefined
}

/**
 * Wohin eine abgesagte Bestellung beim Wiederoeffnen kommt.
 *
 * Nicht stur nach "neu": Was schon geschehen ist, bleibt geschehen. Die
 * Haken erzaehlen, wie weit sie war – die Zusage, die Offerte, Boras
 * Preise, das Aufmass – und dort geht es weiter.
 */
export function phaseNachWiederoeffnen(b: Bestellung): BestellStatus {
  if (phasenEntfallen(b)) return 'bestellen'
  if (b.zusageAm) return 'bestellen'
  if (b.offerteAm) return 'offerte'
  if (b.positionen.length > 0 && ohneEinkauf(b) === 0) return 'offerte'
  if (b.einkaufAusRunde) return 'kosten'
  if (b.ausgemessenAm) return 'klaerung'
  return 'neu'
}

/** Tage seit einem Zeitpunkt, oder null. Fuer "seit n Tagen"-Marken. */
export function tageSeit(zeitpunkt: string | undefined, jetzt = Date.now()): number | null {
  if (!zeitpunkt) return null
  const t = Date.parse(zeitpunkt)
  if (Number.isNaN(t)) return null
  return Math.floor((jetzt - t) / 86_400_000)
}
