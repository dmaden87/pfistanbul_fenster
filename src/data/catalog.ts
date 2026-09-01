import type { NetSet, WindowType } from '../types'

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
export const windowTypes: WindowType[] = [
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
export const netSets: NetSet[] = [
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

const typeIndex = new Map(windowTypes.map((type) => [type.id, type]))
const setIndex = new Map(netSets.map((set) => [set.id, set]))

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
