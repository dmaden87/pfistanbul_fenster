import type { OpeningDirection } from '../types'

/**
 * Vier Räume als Startpunkt für den Beispielrechner.
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
  label: string
  raum: string
  breiteCm: number
  hoeheCm: number
  oeffnung: OpeningDirection
  oeffnungLabel: string
}

export const raumbeispiele: Raumbeispiel[] = [
  {
    id: 'bad',
    label: 'Bad',
    raum: 'Bad und WC',
    breiteCm: 120,
    hoeheCm: 80,
    oeffnung: 'nach-links',
    oeffnungLabel: 'Öffnet seitlich',
  },
  {
    id: 'kueche',
    label: 'Küche',
    raum: 'Küche',
    breiteCm: 70,
    hoeheCm: 120,
    oeffnung: 'nach-oben',
    oeffnungLabel: 'Öffnet von unten nach oben',
  },
  {
    id: 'zimmer',
    label: 'Zimmer',
    raum: 'Wohn-, Schlaf- und Kinderzimmer',
    breiteCm: 160,
    hoeheCm: 120,
    oeffnung: 'mitte',
    oeffnungLabel: 'Zwei Netze, treffen sich in der Mitte',
  },
  {
    id: 'balkontuer',
    label: 'Balkontüre',
    raum: 'Balkon und Loggia',
    breiteCm: 90,
    hoeheCm: 210,
    oeffnung: 'nach-rechts',
    oeffnungLabel: 'Öffnet seitlich',
  },
]
