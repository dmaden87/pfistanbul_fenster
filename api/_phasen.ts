/**
 * Die Phasen einer Bestellung, so wie der Server sie kennt – und die
 * Abbildung ALTER Statuswerte beim Lesen.
 *
 * Selbsttragend, ohne Import aus src/: Eine Serverless-Funktion kann die
 * endungslosen Importe von Vite nicht aufloesen (siehe api/_einkauf.ts und
 * bau/api-test.mjs). PHASEN gibt es deshalb hier ein zweites Mal;
 * bau/phasen-test.mjs haelt beide Fassungen gleich.
 *
 * WARUM BEIM LESEN UND NICHT DURCH EIN SKRIPT. Die gespeicherten
 * Bestellungen sind die einzige Kopie. Ein Wanderungsskript liefe genau
 * dann, wenn niemand hinschaut, und ein Fehler darin waere endgueltig.
 * Diese Abbildung dagegen ist jederzeit wiederholbar, loescht kein Feld
 * und ueberschreibt nichts – der neue Wert wird erst gespeichert, wenn
 * jemand die Bestellung ohnehin aendert.
 */

export type Phase = 'neu' | 'klaerung' | 'kosten' | 'offerte' | 'zusage' | 'bestellen' | 'ausliefern' | 'abgesagt'
export const PHASEN: Phase[] = ['neu', 'klaerung', 'kosten', 'offerte', 'zusage', 'bestellen', 'ausliefern', 'abgesagt']

/** Was die Abbildung von einer Runde wissen muss. */
export interface RundenBlick {
  status: string
  bestellungIds: string[]
  erstellt: string
}

/** Was die Abbildung von einer Bestellung liest. Alles andere bleibt unangetastet. */
interface BestellBlick {
  id: string
  art?: string
  status?: string
  geaendert?: string
  eingang?: string
  /** Stempelt die heutige Fassung bei jedem Phasenwechsel – alte Datensaetze haben es nie. */
  phaseSeit?: string
  einkaufAm?: string
  ausgemessenAm?: string
  offerteAm?: string
  zusageAm?: string
  ausgeliefertAm?: string
  bezahltAm?: string
  einkaufAusRunde?: string
  positionen?: { einkaufChf?: number }[]
}

/** Wo eine neue Bestellung beginnt: Katalogware hat an der Kasse zugesagt. */
export function startPhase(art: string | undefined): Phase {
  return art === 'bestellung' ? 'bestellen' : 'neu'
}

/** Die neueste Runde, die eine Bestellung fuehrt. */
function rundeFuer(id: string, runden: RundenBlick[]): RundenBlick | undefined {
  let neueste: RundenBlick | undefined
  for (const l of runden) {
    if (!l.bestellungIds.includes(id)) continue
    if (!neueste || l.erstellt > neueste.erstellt) neueste = l
  }
  return neueste
}

/**
 * Bildet einen alten Statuswert auf die Phase ab.
 *
 * Drei Generationen liegen im Speicher:
 *   - ganz alt:  neu | offerte | bestellt | erledigt | geloescht
 *   - gestern:   neu | offeriert | zugesagt | abgesagt
 *   - heute:     die sieben Phasen und abgesagt
 *
 * "neu" gibt es in allen dreien – aber gestern konnte eine "neue"
 * Bestellung laengst in einer Runde bei Bora stecken (der Stand der Ware
 * war abgeleitet). Deshalb schaut die Abbildung fuer "neu" auf die Runde:
 * Eine Bestellung in einer eingefrorenen Runde ist nicht mehr in Phase 1,
 * egal was drinsteht.
 */
export function phaseVon<B extends BestellBlick>(b: B, runden: RundenBlick[]): Phase {
  const alt = b.status ?? 'neu'
  const runde = rundeFuer(b.id, runden)
  const rundenStand = runde?.status
  const katalog = b.art === 'bestellung'

  // Katalogware war nie in den Phasen 1–5, unter keinem alten Wert.
  const abBestellen = (): Phase => (rundenStand === 'geliefert' ? 'ausliefern' : 'bestellen')

  if (alt === 'abgesagt' || alt === 'geloescht') return 'abgesagt'
  if (alt === 'erledigt') return 'ausliefern'
  if (
    alt === 'ausliefern' ||
    alt === 'bestellen' ||
    alt === 'zusage' ||
    alt === 'kosten' ||
    alt === 'klaerung' ||
    alt === 'offerte'
  ) {
    // Heutige Werte – bis auf "offerte", das es ganz alt auch gab. Dort
    // hiess es nur "im Offert-Abschnitt": Ob die Offerte raus war, stand
    // im Haken. Die heutige Fassung erkennt man an ihren Stempeln: Jeder
    // Phasenwechsel setzt phaseSeit, jede Kostenerfassung einkaufAm. Ein
    // "offerte" ohne jeden Stempel ist das alte.
    const heutig = Boolean(b.phaseSeit || b.einkaufAm || b.offerteAm || b.zusageAm)
    if (alt === 'offerte' && !heutig) {
      if (katalog) return abBestellen()
      if (rundenStand === 'angefragt' || rundenStand === 'entwurf') return 'kosten'
      if (rundenStand === 'preise' || rundenStand === 'bestellt' || rundenStand === 'geliefert') return 'offerte'
      if (b.einkaufAusRunde || b.positionen?.some((p) => typeof p.einkaufChf === 'number')) return 'offerte'
      return b.ausgemessenAm ? 'klaerung' : 'neu'
    }
    // Ein "offerte" mit Haken "Offerte versendet" wartet auf den Kunden –
    // das ist seit der Trennung eine eigene Phase. Gilt fuer jede Generation.
    if (alt === 'offerte' && b.offerteAm && !b.zusageAm) return 'zusage'
    return alt
  }
  if (alt === 'offeriert') return 'zusage'
  if (alt === 'zugesagt' || alt === 'bestellt') return abBestellen()

  // "neu" – in jeder Generation moeglich.
  if (katalog) return abBestellen()
  if (rundenStand === 'bestellt') return 'bestellen'
  if (rundenStand === 'geliefert') return 'ausliefern'
  if (rundenStand === 'preise') return 'offerte'
  if (rundenStand === 'angefragt' || rundenStand === 'entwurf') return 'kosten'
  if (b.einkaufAusRunde) return 'offerte'
  if (b.ausgemessenAm) return 'klaerung'
  return 'neu'
}

/**
 * Vereinheitlicht eine gelesene Bestellung. Gibt dasselbe Objekt zurueck,
 * wenn nichts zu tun ist; sonst eine Kopie mit der abgebildeten Phase und
 * – nur fuer das ganz alte "erledigt" – den beiden Haken, die es meinte.
 * Kein Feld wird entfernt.
 */
export function vereinheitlichen<B extends BestellBlick>(b: B, runden: RundenBlick[]): B {
  const alt = b.status ?? 'neu'
  const phase = phaseVon(b, runden)
  const erledigt = alt === 'erledigt'
  if (phase === alt && !erledigt) return b
  const kopie: B = { ...b, status: phase }
  if (erledigt) {
    kopie.ausgeliefertAm = b.ausgeliefertAm ?? b.geaendert
    kopie.bezahltAm = b.bezahltAm ?? b.geaendert
  }
  return kopie
}
