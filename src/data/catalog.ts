import type { MeshOption, NetSet, Ueberbauung, WindowType } from '../types'

/**
 * Fenstertypen, Masse und Preise stammen aus dem Detailkonzept
 * "Preise & Kosten" vom 1.9.2026. Die Masse wurden in der Überbauung
 * aufgenommen, die Preise sind aus Einkauf, Fracht und Einfuhrsteuer
 * hergeleitet.
 *
 * OFFEN: Beim Typ Balkontüre steht im Konzept "206 × 84 cm" unter der
 * Spaltenüberschrift "B × H". Als Breite × Höhe gelesen wäre die Tür 84 cm
 * hoch – die Bemerkung "Türhöhe" und die Fläche von 1.730 m² sprechen dafür,
 * dass 206 cm die Höhe ist. Hier steht deshalb 84 cm breit × 206 cm hoch.
 * Bitte gegenprüfen.
 */
const pfisterhoelzliTypes: WindowType[] = [
  {
    id: 'bad',
    label: 'Bad',
    widthCm: 117,
    heightCm: 82.5,
    areaM2: 0.965,
    room: 'Bad und WC',
    note: 'Querformat',
    priceChf: 120,
    opening: 'nach-links',
    openingLabel: 'Öffnet seitlich, von rechts nach links',
  },
  {
    id: 'kueche',
    label: 'Küche',
    widthCm: 72.5,
    heightCm: 122,
    areaM2: 0.885,
    room: 'Küche',
    priceChf: 120,
    opening: 'nach-oben',
    openingLabel: 'Öffnet von unten nach oben',
  },
  {
    id: 'zimmer',
    label: 'Zimmer',
    widthCm: 160.5,
    heightCm: 122,
    areaM2: 1.958,
    room: 'Wohn-, Schlaf- und Kinderzimmer',
    note: 'Drei bis vier pro Wohnung',
    priceChf: 125,
    opening: 'mitte',
    openingLabel: 'Zwei Netze, die sich in der Mitte treffen – öffnen nach beiden Seiten',
  },
  {
    id: 'balkontuer',
    label: 'Balkontüre',
    widthCm: 84,
    heightCm: 206,
    areaM2: 1.73,
    room: 'Balkon und Loggia',
    priceChf: 135,
    opening: 'nach-rechts',
    openingLabel: 'Öffnet seitlich, von links nach rechts',
  },
]

/**
 * Set-Preise sind feste Zielpreise. Der ausgewiesene Rabatt ergibt sich aus
 * der Differenz zur Summe der Einzelpreise und wird nicht separat gepflegt.
 */
const pfisterhoelzliSets: NetSet[] = [
  {
    id: 'set-mittel',
    label: 'Set Mittel',
    description: 'Sechs Netze: drei Zimmer, Balkontüre, Bad und Küche. Passt auf die meisten Wohnungen.',
    items: [
      { typeId: 'zimmer', count: 3 },
      { typeId: 'balkontuer', count: 1 },
      { typeId: 'bad', count: 1 },
      { typeId: 'kueche', count: 1 },
    ],
    priceChf: 660,
  },
  {
    id: 'set-gross',
    label: 'Set Gross',
    description: 'Sieben Netze: vier Zimmer, Balkontüre, Bad und Küche. Für die grösseren Wohnungen und Attika.',
    items: [
      { typeId: 'zimmer', count: 4 },
      { typeId: 'balkontuer', count: 1 },
      { typeId: 'bad', count: 1 },
      { typeId: 'kueche', count: 1 },
    ],
    priceChf: 750,
  },
]

/**
 * Heute gibt es eine ausgemessene Überbauung. Kommt eine zweite dazu, ist das
 * ein weiterer Eintrag in dieser Liste – die Seite rechnet automatisch damit.
 */
export const ueberbauungen: Ueberbauung[] = [
  {
    id: 'pfisterhoelzli',
    name: 'Am Pfisterhölzli',
    place: 'Greifensee ZH',
    intro:
      'Die Siedlung wurde Anfang der Siebzigerjahre als Ganzes gebaut. Entsprechend wiederholen sich vier Fensterformate über alle Wohnungen – wir haben sie ausgemessen.',
    windowTypes: pfisterhoelzliTypes,
    sets: pfisterhoelzliSets,
  },
]

/** Die Überbauung, deren Sortiment die Seite gerade zeigt. */
export const activeUeberbauung = ueberbauungen[0]

export const windowTypes = activeUeberbauung.windowTypes
export const netSets = activeUeberbauung.sets

/**
 * Produktebene: Aufbau des Netzes. Gilt für jede Überbauung gleich.
 *
 * KEIN POLLENSCHUTZ: Bewusst nicht im Sortiment, solange das Gewebe nicht
 * eingekauft ist. Ein normales Insektenschutzgewebe hält keine Pollen zurück –
 * Pollen sind rund sechzigmal kleiner als die Masche. Nötig wäre ein
 * beschichtetes Spezialgewebe. Solange das nicht vorliegt, darf auf der Seite
 * weder von Pollen noch von einer Rückhalterate die Rede sein: Das wäre nach
 * UWG eine unrichtige Angabe, und Art. 13a UWG kehrt die Beweislast um.
 */
export const construction: MeshOption[] = [
  {
    id: 'rahmen',
    name: 'Der Rahmen',
    short: 'Rahmen',
    availability: 'standard',
    description:
      'Ein rund fünf Zentimeter breiter Rahmen, in dem das Netz in feinen Falten läuft. Er wird von aussen in den äusseren Fensterrahmen gedrückt – er sitzt also vor dem Fenster, nicht darin.',
    stops: 'Bleibt das ganze Jahr montiert',
    tradeoff: 'Er trägt vor dem Fenster auf und ist von aussen sichtbar.',
  },
  {
    id: 'befestigung',
    name: 'Die Befestigung',
    short: 'Befestigung',
    availability: 'standard',
    description:
      'Doppelseitiges Klebeband auf allen vier Seiten. Kein Bohren, keine Dübel, keine Schrauben – und damit auch keine Rückfrage bei der Verwaltung und keine Löcher bei der Wohnungsabgabe.',
    stops: 'Hält ohne einen einzigen Dübel',
    tradeoff: 'Der Fensterrahmen muss sauber und trocken sein, damit das Band greift.',
  },
  {
    id: 'gewebe',
    name: 'Das Gewebe',
    short: 'Gewebe',
    availability: 'standard',
    description:
      'Fiberglasgewebe in Grau. Viel Luft, viel Licht, sehr langlebig – und von aussen kaum zu sehen. Umlaufend mit einer Bürstendichtung, damit kein Spalt bleibt: Zwei Millimeter Lücke machen das beste Gewebe wirkungslos.',
    stops: 'Stechmücken, Fliegen, Wespen, Hornissen, Motten',
    tradeoff: 'Ganz kleine Insekten wie Gnitzen kommen durch, und katzensicher ist es nicht.',
  },
]

/**
 * Richtpreis für Fenster ausserhalb einer ausgemessenen Überbauung.
 * Bewusst als Spanne mit Gültigkeitsbereich – bei deutlich grösseren Flächen
 * trägt sie nicht mehr.
 */
export const priceRange = {
  minChf: 100,
  maxChf: 200,
  maxAreaM2: 2,
} as const

const typeIndex = new Map(ueberbauungen.flatMap((u) => u.windowTypes).map((type) => [type.id, type]))
const setIndex = new Map(ueberbauungen.flatMap((u) => u.sets).map((set) => [set.id, set]))
const meshIndex = new Map(construction.map((part) => [part.id, part]))

export function meshById(id: string): MeshOption | undefined {
  return meshIndex.get(id)
}

export function typeById(id: string): WindowType | undefined {
  return typeIndex.get(id)
}

export function setById(id: string): NetSet | undefined {
  return setIndex.get(id)
}

/** Anzahl Netze in einem Set. */
export function netsInSet(set: NetSet): number {
  return set.items.reduce((sum, item) => sum + item.count, 0)
}

/** Summe der Einzelpreise eines Sets – die Grundlage für die ausgewiesene Ersparnis. */
export function regularPriceOfSet(set: NetSet): number {
  return set.items.reduce((sum, item) => sum + (typeById(item.typeId)?.priceChf ?? 0) * item.count, 0)
}
