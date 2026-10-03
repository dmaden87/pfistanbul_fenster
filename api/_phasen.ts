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

export type Phase = 'neu' | 'klaerung' | 'offerte' | 'zusage' | 'bestellen' | 'bora' | 'ausliefern' | 'abgesagt'
export const PHASEN: Phase[] = ['neu', 'klaerung', 'offerte', 'zusage', 'bestellen', 'bora', 'ausliefern', 'abgesagt']

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
  quelle?: string
  status?: string
  geaendert?: string
  eingang?: string
  /** Stempelt die heutige Fassung bei jedem Phasenwechsel – alte Datensaetze haben es nie. */
  phaseSeit?: string
  einkaufAm?: string
  preiseFestgelegtAm?: string
  ausgemessenAm?: string
  offerteAm?: string
  zusageAm?: string
  /** Die beiden Stempel bei Bora – sie teilen den Backlog von "bei Bora". */
  bestelltAm?: string
  versandAm?: string
  ausgeliefertAm?: string
  bezahltAm?: string
  einkaufAusRunde?: string
  positionen?: { einkaufChf?: number }[]
}

/**
 * Wo eine neue Bestellung beginnt: immer bei "neu".
 *
 * Auch Katalogware aus dem Webshop, obwohl an der Kasse laengst zugesagt
 * und alles festgelegt ist. Der Grund ist kein fachlicher, sondern ein
 * betrieblicher: Jede Bestellung soll einmal durch die Kontrolle des
 * Betreibers, bevor sie bei Bora landet. Von "neu" aus geht Katalogware
 * mit einem Klick direkt nach "bestellen" – Klaerung und Offerte haetten
 * ihr nichts zu sagen.
 */
export function startPhase(): Phase {
  return 'neu'
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
 *   - vorgestern die sieben Phasen mit "kosten", ohne "bora"
 *   - heute:     neu | klaerung | offerte | zusage | bestellen | bora |
 *                ausliefern | abgesagt
 *
 * ZWEI AENDERUNGEN AN DEN PHASEN SELBST liegen damit im Speicher:
 *
 * "kosten" (Bora nach Preisen fragen) gibt es nicht mehr. Ein Auftrag, der
 * dort steht, hat seine Netze erfasst und wartete nur noch auf Zahlen - er
 * gehoert ins Angebot.
 *
 * "bestellen" war die Phase von der Zusage bis zur Ankunft. Heute ist sie nur
 * der Backlog, und was bei Bora liegt, steht in "bora". Entschieden wird das
 * nicht am Status, sondern an den Stempeln: Wer bestelltAm oder versandAm
 * traegt, ist bei Bora - das steht in genau dem Datensatz, um den es geht,
 * und nicht in einer Vermutung.
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
  // Katalogware AUS DEM WEBSHOP hat an der Kasse zugesagt. Von Hand erfasste
  // Katalogware (WhatsApp, Telefon) geht wie jede andere durch die Phasen.
  const katalog = b.art === 'bestellung' && (!b.quelle || b.quelle === 'web')

  /*
   * Wohin ein "schon zugesagt" fuehrt. Katalogware war nie in Klaerung oder
   * Angebot, unter keinem alten Wert - sie landet hier.
   *
   * Die Reihenfolge ist die des Ablaufs von hinten: geliefert schlaegt
   * unterwegs, unterwegs schlaegt bestellt, und ohne jeden Stempel bleibt es
   * der Backlog.
   */
  const beiBora = Boolean(b.bestelltAm || b.versandAm) || rundenStand === 'bestellt'
  const abBestellen = (): Phase =>
    rundenStand === 'geliefert' ? 'ausliefern' : beiBora ? 'bora' : 'bestellen'

  if (alt === 'abgesagt' || alt === 'geloescht') return 'abgesagt'
  if (alt === 'erledigt') return 'ausliefern'
  // Die aufgehobene Phase: Netze sind erfasst, es fehlt nur das Angebot.
  if (alt === 'kosten') return 'offerte'
  /*
   * Der Backlog, aufgeteilt. Entschieden wird an den eigenen Stempeln und
   * NICHT an einer Runde: "bestellen" hat jemand gesetzt, und eine alte
   * Lieferrunde darf diesen Klick nicht wieder wegziehen - derselbe Riegel
   * wie unten bei "neu".
   */
  if (alt === 'bestellen') return b.bestelltAm || b.versandAm ? 'bora' : 'bestellen'
  if (
    alt === 'ausliefern' ||
    alt === 'bora' ||
    alt === 'zusage' ||
    alt === 'klaerung' ||
    alt === 'offerte'
  ) {
    // Heutige Werte – bis auf "offerte", das es ganz alt auch gab. Dort
    // hiess es nur "im Offert-Abschnitt": Ob die Offerte raus war, stand
    // im Haken. Die heutige Fassung erkennt man an ihren Stempeln: Jeder
    // Phasenwechsel setzt phaseSeit, jede Kostenerfassung einkaufAm. Ein
    // "offerte" ohne jeden Stempel ist das alte.
    const heutig = Boolean(b.phaseSeit || b.einkaufAm || b.preiseFestgelegtAm || b.offerteAm || b.zusageAm)
    if (alt === 'offerte' && !heutig) {
      if (katalog) return abBestellen()
      /*
       * Jede dieser Runden bedeutete "Netze sind erfasst, Bora ist gefragt".
       * Das war die Phase "kosten"; heute ist es das Angebot. Die beiden
       * Runden, die weiter sind (bestellt, geliefert), stehen trotzdem hier:
       * Unter dem ganz alten "offerte" war die Offerte noch nicht raus, und
       * ein Auftrag ohne Offerte ist kein Auftrag bei Bora.
       */
      if (rundenStand) return 'offerte'
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
  //
  // Heutige Datensaetze tragen phaseSeit. Bei ihnen heisst "neu" auch "neu",
  // Katalogware eingeschlossen: Sie startet dort und wartet auf die
  // Kontrolle. Ohne diesen Riegel schoebe die Abbildung sie sofort wieder
  // nach "bestellen" – die Bestellung waere nicht zu halten.
  if (b.phaseSeit) return 'neu'
  if (katalog) return abBestellen()
  if (rundenStand === 'bestellt') return 'bora'
  if (rundenStand === 'geliefert') return 'ausliefern'
  // "preise", "angefragt", "entwurf": Netze erfasst, Bora gefragt – ins Angebot.
  if (rundenStand) return 'offerte'
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
