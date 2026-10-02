import type { OpeningDirection } from '../types'

/**
 * Vier Beispiele für den Rechner auf der Startseite.
 *
 * WAS SIE EIGENTLICH ZEIGEN: nicht vier Räume, sondern vier Arten, wie ein
 * Netz aufgeht. Der Raum ist nur die Gelegenheit, bei der man die Bauart am
 * ehesten antrifft - ein Badfenster ist ein Beispiel für "seitlich", nicht
 * eine eigene Kategorie. Deshalb trägt jedes Beispiel beides: `bauart` als
 * Überschrift und `raum` als das Beispiel dazu.
 *
 * SEITLICH STEHT ZWEIMAL DRIN, und das ist kein Versehen: Bad und Balkontüre
 * öffnen gleich, nur spiegelverkehrt. Was sie unterscheidet, ist die Grösse -
 * die Türe geht bis zum Boden, und wer eine rechnen will, sucht nach der
 * Türe und nicht nach einer Öffnungsrichtung. Das vierte Beispiel ist deshalb
 * nach dem benannt, was wirklich anders ist.
 *
 * KEINE NUMMERN ("Variante 1"). In Schritt 2 kommen die echten Varianten -
 * Akkordeon gegenüber innen und aussen öffnenden Standardnetzen, dazu
 * Rahmenfarben. Dasselbe Wort für zwei verschiedene Dinge wäre dann nicht
 * mehr einzufangen.
 *
 * WARUM EIGENE DATEN und nicht die Formate aus dem Katalog: Die Katalogmasse
 * sind die ausgemessenen Fenster EINER Überbauung. Solange die Siedlung die
 * Startseite bestimmte, war das dasselbe; seit das Sondermass der Standard
 * ist, wäre es eine stille Kopplung - die Startseite würde ihre Beispiele
 * ändern, sobald eine andere Siedlung die aktive wird.
 *
 * DIE MASSE SIND BEWUSST GERUNDET. Sie sollen ein typisches Badfenster
 * beschreiben, nicht ein bestimmtes. Wer hier 117 × 82.5 cm liest, denkt, wir
 * wüssten etwas über sein Fenster. Wir wissen nichts darüber - er soll die
 * Zahlen überschreiben, und runde Zahlen laden dazu ein.
 *
 * Die Preise stehen hier NICHT. Sie kommen aus estimateNetChf() und damit aus
 * derselben Rechnung wie die Anfrage darunter. Eine zweite Preisliste gäbe es
 * nur so lange, bis jemand vergisst, sie nachzuführen.
 */
export interface Raumbeispiel {
  id: string
  /** Wie das Netz aufgeht. Steht als Überschrift auf dem Balken. */
  bauart: string
  /** Der Raum, an dem man diese Bauart am ehesten antrifft. */
  raum: string
  /** Kurzform des Raums für den Balken: "Beispiel: …". */
  raumKurz: string
  breiteCm: number
  hoeheCm: number
  oeffnung: OpeningDirection
  oeffnungLabel: string
}

export const raumbeispiele: Raumbeispiel[] = [
  {
    id: 'bad',
    bauart: 'Seitlich',
    raum: 'Bad und WC',
    raumKurz: 'Badfenster',
    breiteCm: 120,
    hoeheCm: 80,
    oeffnung: 'nach-links',
    oeffnungLabel: 'Ein Netz, zieht seitlich auf',
  },
  {
    id: 'kueche',
    bauart: 'Nach oben',
    raum: 'Küche',
    raumKurz: 'Küchenfenster',
    breiteCm: 70,
    hoeheCm: 120,
    oeffnung: 'nach-oben',
    oeffnungLabel: 'Ein Netz, zieht von unten nach oben auf',
  },
  {
    id: 'zimmer',
    bauart: 'Zweiteilig',
    raum: 'Wohn-, Schlaf- und Kinderzimmer',
    raumKurz: 'Zimmerfenster',
    breiteCm: 160,
    hoeheCm: 120,
    oeffnung: 'mitte',
    oeffnungLabel: 'Zwei Netze, die sich in der Mitte treffen – für breite Fenster',
  },
  {
    id: 'balkontuer',
    bauart: 'In Türhöhe',
    raum: 'Balkon und Loggia',
    raumKurz: 'Balkontüre',
    breiteCm: 90,
    hoeheCm: 210,
    oeffnung: 'nach-rechts',
    oeffnungLabel: 'Ein Netz, zieht seitlich auf – geht bis zum Boden',
  },
]
