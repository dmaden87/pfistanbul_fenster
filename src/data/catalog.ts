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
  },
  {
    id: 'kueche',
    label: 'Küche',
    widthCm: 72.5,
    heightCm: 122,
    areaM2: 0.885,
    room: 'Küche',
    priceChf: 120,
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
  },
  {
    id: 'balkontuer',
    label: 'Balkontüre',
    widthCm: 84,
    heightCm: 206,
    areaM2: 1.73,
    room: 'Balkon und Loggia',
    priceChf: 135,
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
 * Produktebene: Das Gewebe gehört zum Produkt, nicht zur Überbauung.
 *
 * ACHTUNG: Pollenschutz steht bewusst auf "anfrage". Preis und Verfügbarkeit
 * des Gewebes sind laut Kostenkonzept noch offen – wir bieten es deshalb als
 * Option an, nicht als bestellbaren Artikel, und nennen keine Rückhalterate.
 */
export const meshOptions: MeshOption[] = [
  {
    id: 'standard',
    name: 'Standardgewebe',
    short: 'Standard',
    availability: 'standard',
    description:
      'Fiberglasgewebe, grau beschichtet. Viel Luft, viel Licht, sehr langlebig – und von aussen kaum zu sehen. In jedem Preis inbegriffen.',
    stops: 'Stechmücken, Fliegen, Wespen, Hornissen, Motten',
    tradeoff: 'Ganz kleine Insekten wie Gnitzen kommen durch, und katzensicher ist es nicht.',
  },
  {
    id: 'pollen',
    name: 'Pollenschutzgewebe',
    short: 'Pollenschutz',
    availability: 'anfrage',
    description:
      'Pollen sind zu klein für jede Masche – rund sechzigmal kleiner als die Öffnungen im Standardgewebe. Zurückgehalten werden sie von einer Spezialbeschichtung, an der sie haften bleiben. Wer im Frühling schlecht schläft, merkt den Unterschied zuerst im Schlafzimmer.',
    stops: 'Insekten und einen erheblichen Teil des Blütenstaubs',
    tradeoff:
      'Deutlich weniger Luft und Durchsicht, und die Beschichtung lässt über die Jahre nach. Ein vollständiger Schutz ist es nicht, und eine Behandlung ersetzt es nicht.',
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
const meshIndex = new Map(meshOptions.map((mesh) => [mesh.id, mesh]))

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
