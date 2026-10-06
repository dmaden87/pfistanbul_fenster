import type { Bestellung, BestellStatus } from '../types'

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

/** Eine der Phasen des Ablaufs – ohne das Ende "abgesagt". */
export type Phase = Exclude<BestellStatus, 'abgesagt'>

/** Die Phasen in der Reihenfolge des Ablaufs. "abgesagt" steht daneben. */
export const PHASEN: readonly Phase[] = [
  'neu',
  'klaerung',
  'offerte',
  'zusage',
  'bestellen',
  'bora',
  'ausliefern',
]

/** Die Abschnitte der Uebersicht: die Phasen und das Archiv. */
export type Abschnitt = Phase | 'archiv'
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

/**
 * Katalogware aus dem WARENKORB: Der Kunde hat an der Kasse zugesagt, die
 * Phasen 1–5 entfallen. Von Hand erfasste Katalogware (WhatsApp, Telefon)
 * bekommt eine Offerte wie jede andere – nur mit Katalogpreisen.
 */
export function phasenEntfallen(b: Bestellung): boolean {
  return b.art === 'bestellung' && (!b.quelle || b.quelle === 'web')
}

/**
 * Wie viele Positionen noch keinen Einkaufspreis von Bora haben.
 *
 * Im Verkaufs-CRM steht das nirgends mehr: Der Adminbereich zeigt nur, was
 * hereinkommt. Die Zahl bleibt hier fuer die Buchhaltung, die als eigener
 * Bereich daneben entsteht - dort ist eine Position ohne Einkaufspreis eine
 * Luecke in der Erfolgsrechnung und nicht blosse Zierde.
 */
export function ohneEinkauf(b: Bestellung): number {
  return b.positionen.filter((p) => typeof p.einkaufChf !== 'number').length
}

/** Wie viele Positionen noch keinen Verkaufspreis haben – die Offerte druckte 0.00. */
export function ohneVerkauf(b: Bestellung): number {
  return b.positionen.filter((p) => !(p.preisChf > 0)).length
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

/**
 * Ein Eintrag in der Liste eines Abschnitts: eine einzelne Bestellung – oder
 * ein ganzes Paket.
 */
export type Listeneintrag =
  | { art: 'einzeln'; bestellung: Bestellung }
  | { art: 'paket'; paket: string; bestellungen: Bestellung[] }

/**
 * Fasst Bestellungen mit demselben Paket-Etikett zu einem Eintrag zusammen.
 *
 * WARUM: Ein Paket geht als Ganzes zu Bora, kommt als Ganzes zurueck und
 * traegt eine Sendungsnummer. In der Liste standen seine Auftraege aber
 * einzeln untereinander, jeder mit denselben Knoepfen und derselben Marke –
 * bei vier Auftraegen vier fast gleiche Karten, und die Frage "was liegt
 * eigentlich bei Bora?" war nicht mehr auf einen Blick zu beantworten.
 *
 * Die Reihenfolge bleibt: Ein Paket steht dort, wo sein erster Auftrag stand.
 * Sonst sprigen Eintraege beim Buendeln an eine andere Stelle, und man sucht
 * den Auftrag, den man gerade noch gesehen hat.
 *
 * Gruppiert wird nur, wo es Pakete gibt – siehe den Aufruf in AdminPage.
 * Ein einzelner Auftrag mit Etikett bleibt ein Paket mit einem Auftrag: Er
 * IST eines, und die naechste Bestellung kann dazukommen.
 */
export function nachPaket(bestellungen: Bestellung[]): Listeneintrag[] {
  const raus: Listeneintrag[] = []
  const stelle = new Map<string, number>()

  for (const b of bestellungen) {
    if (!b.paket) {
      raus.push({ art: 'einzeln', bestellung: b })
      continue
    }
    const platz = stelle.get(b.paket)
    if (platz === undefined) {
      stelle.set(b.paket, raus.length)
      raus.push({ art: 'paket', paket: b.paket, bestellungen: [b] })
    } else {
      const eintrag = raus[platz]
      if (eintrag.art === 'paket') eintrag.bestellungen.push(b)
    }
  }
  return raus
}

/** Wie viele Netze in diesen Bestellungen stecken. Sets zaehlen als eine Position. */
export function netzZahl(bestellungen: Bestellung[]): number {
  return bestellungen.reduce((n, b) => n + b.positionen.reduce((m, p) => m + p.menge, 0), 0)
}

/** Was diese Bestellungen zusammen kosten – der Verkaufspreis, nicht unsere Kosten. */
export function summeVon(bestellungen: Bestellung[]): number {
  return Math.round(bestellungen.reduce((s, b) => s + b.summeChf, 0) * 100) / 100
}

/** Die naechste Phase im Ablauf, oder undefined am Ende. */
export function naechstePhase(status: BestellStatus): BestellStatus | undefined {
  const i = PHASEN.indexOf(status as Phase)
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
  // Von hinten nach vorn: der weiteste Stempel gewinnt.
  if (b.ausgeliefertAm) return 'ausliefern'
  if (b.bestelltAm || b.versandAm) return 'bora'
  if (b.zusageAm) return 'bestellen'
  if (b.offerteAm) return 'zusage'
  if (b.preiseFestgelegtAm) return 'offerte'
  /*
   * Nur ausdrueckliche Spuren zaehlen – ein Termin, ein Aufmass. NICHT die
   * blosse Anwesenheit von Netzen: Die bringt jede Anfrage von der Seite
   * schon mit, und damit kaeme nichts mehr in "neu" zurueck, obwohl es dort
   * abgesagt wurde.
   */
  if (b.ausgemessenAm || b.klaerungTermin) return 'klaerung'
  return 'neu'
}

/** Tage seit einem Zeitpunkt, oder null. Fuer "seit n Tagen"-Marken. */
export function tageSeit(zeitpunkt: string | undefined, jetzt = Date.now()): number | null {
  if (!zeitpunkt) return null
  const t = Date.parse(zeitpunkt)
  if (Number.isNaN(t)) return null
  return Math.floor((jetzt - t) / 86_400_000)
}

/* --- Preis aendern und Pakete erweitern -------------------------------------- */

/**
 * In welchen Abschnitten es ueberhaupt einen Verkaufspreis zu aendern gibt.
 *
 * NICHT IN "NEU" UND "KLAERUNG": Dort gibt es noch kein Angebot, und ein
 * Preisblock waere die Aufforderung, einen zu erfinden, bevor die Masse
 * stehen. Das Archiv ist draussen, weil dort nichts mehr zu verhandeln ist.
 */
export const PREISPHASEN: readonly Abschnitt[] = ['offerte', 'zusage', 'bestellen', 'bora', 'ausliefern']

/**
 * Laesst sich der Verkaufspreis noch aendern?
 *
 * DIE GRENZE IST DIE ZAHLUNG, NICHT DIE PHASE. Vorher hing der Angebot-Block
 * an "Angebot erstellen" allein. Das unterstellt, dass nach dem Verschicken
 * der Offerte nichts mehr passiert - und das stimmt nicht: Ein Netz hat einen
 * Mangel und der Rabatt steigt, es aendert sich etwas Wesentliches, wir
 * zeigen Goodwill, es braucht Zusatzmaterial. Wer das nicht im Werkzeug
 * aendern kann, aendert es nirgends und traegt die Differenz im Kopf.
 *
 * Ist das Geld da, ist der Preis eine Tatsache; was danach kaeme, waere eine
 * Rueckerstattung und kein neuer Preis.
 */
export function preisAenderbar(b: Bestellung, abschnitt: Abschnitt): boolean {
  return PREISPHASEN.includes(abschnitt) && !bezahltAm(b)
}

/** Ein Paket, dem sich noch etwas hinzufuegen laesst. */
export interface OffenesPaket {
  etikett: string
  /** Wie viele Auftraege schon darin sind. */
  anzahl: number
  /** Liegt es schon bei Bora? Dann ist der Zusatz ein Nachtrag. */
  beiBora: boolean
}

/**
 * Die Pakete, denen sich noch etwas hinzufuegen laesst.
 *
 * ZWEI SORTEN, UND DER UNTERSCHIED ZAEHLT. Ein Paket im Backlog ist noch
 * nicht bestellt; dort kommt einfach etwas dazu. Ein Paket BEI BORA ist
 * bestellt und in der Fertigung - da geht es auch noch, aber nur in
 * Absprache mit ihm, und der Nachzuegler braucht einen eigenen Talon.
 *
 * Frueher zaehlte nur das Backlog, mit der Begruendung, ein spaeteres Netz
 * stuende auf keinem Talon und fehlte in der Lieferung. Das stimmt fuer ein
 * Paket, das unterwegs ist - nicht fuer eines, das Bora gerade erst
 * zusammenbaut. Diese Wochen sind genau die, in denen eine Bestellung
 * hereinkommt und nicht auf die naechste Sendung warten muss.
 *
 * AUSGELIEFERTES IST DRAUSSEN. Was zurueck ist, nimmt nichts mehr auf.
 */
export function erweiterbarePakete(bestellungen: Bestellung[]): OffenesPaket[] {
  const etiketten = new Set<string>()
  for (const b of bestellungen) {
    if (b.paket && (b.status === 'bestellen' || b.status === 'bora')) etiketten.add(b.paket)
  }
  return [...etiketten].sort().map((etikett) => {
    const drin = bestellungen.filter((b) => b.paket === etikett)
    return {
      etikett,
      anzahl: drin.filter((b) => b.status === 'bestellen' || b.status === 'bora').length,
      /* Liegt auch nur eines schon bei Bora, ist das ganze Paket dort. */
      beiBora: drin.some((b) => b.status === 'bora'),
    }
  })
}
