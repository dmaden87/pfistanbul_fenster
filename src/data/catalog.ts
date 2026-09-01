import type { Category, StandardSize } from '../types'

/**
 * ACHTUNG – VOM BETREIBER ZU PRUEFEN:
 * Masse und Preise sind eine erste, plausible Annahme. Vor dem Live-Gang
 * müssen die Fenstermasse im Pfisterhölzli nachgemessen und die Preise
 * gegen die echte Kalkulation geprüft werden. Alles Nötige steht in
 * dieser Datei – der Rest der Seite rechnet automatisch damit.
 */

export const categories: Category[] = [
  {
    id: 'plissee',
    name: 'Plissee-Insektenschutz',
    shortName: 'Plissee',
    tagline: 'Auf- und zuziehen wie ein Akkordeon',
    description:
      'Das Netz liegt in feinen Falten in einer schmalen Schiene. Ein Griff, und es ist da – ein Griff, und die Sicht ist wieder frei. Nichts muss ausgehängt und im Keller gelagert werden.',
    mesh: 'Fiberglasgewebe, grau beschichtet',
    bestFor: 'Fenster, die täglich benutzt werden – Wohnzimmer, Schlafzimmer, Küche',
    priceFactor: 1.6,
    features: [
      'Stufenlos zu öffnen und zu schliessen',
      'Bleibt das ganze Jahr montiert',
      'Kaum sichtbar von aussen',
      'Läuft leise, ohne Klappern',
    ],
  },
  {
    id: 'spannrahmen',
    name: 'Spannrahmen',
    shortName: 'Spannrahmen',
    tagline: 'Der Klassiker – einmal einhängen, fertig',
    description:
      'Ein leichter Alurahmen mit gespanntem Gewebe, der von aussen in die Fensterlaibung gehängt wird. Robust, günstig und in einer Minute abgenommen, wenn Sie die Scheibe putzen wollen.',
    mesh: 'Fiberglasgewebe, grau beschichtet',
    bestFor: 'Fenster, die im Sommer ohnehin meist offen stehen',
    priceFactor: 1,
    features: ['Günstigste Variante', 'Ohne Bohren, mit Klemmwinkeln', 'Zum Reinigen abnehmbar', 'Sehr stabil'],
  },
  {
    id: 'pollenplissee',
    name: 'Plissee mit Pollenschutzgewebe',
    shortName: 'Pollenschutz-Plissee',
    tagline: 'Für alle, die im Frühling schlecht schlafen',
    description:
      'Gleiche Mechanik wie das Standard-Plissee, aber mit einem beschichteten Spezialgewebe. Pollen sind zu klein für jede Masche – zurückgehalten werden sie, weil sie an der Beschichtung haften bleiben. Das reduziert den Pollenflug ins Zimmer spürbar.',
    mesh: 'Beschichtetes Pollenschutzgewebe',
    bestFor: 'Schlafzimmer und Kinderzimmer von Allergikerinnen und Allergikern',
    priceFactor: 1.95,
    features: [
      'Reduziert den Pollenflug ins Zimmer',
      'Umlaufende Bürstendichtung – sonst nützt das beste Gewebe nichts',
      'Lässt weniger Luft und Licht durch als Standardgewebe',
      'Gleiche Bedienung wie das Standard-Plissee',
    ],
  },
  {
    id: 'katzenschutz',
    name: 'Katzenschutz-Rahmen',
    shortName: 'Katzenschutz',
    tagline: 'Hält auch Krallen stand',
    description:
      'Verstärktes Gewebe in einem stabilen Rahmen. Ihre Katze kann sich ans offene Fenster setzen, ohne dass das Netz nachgibt – und ohne dass Sie beim Lüften Angst haben müssen.',
    mesh: 'Reissfestes Katzenschutzgewebe',
    bestFor: 'Haushalte mit Katzen, besonders in oberen Stockwerken',
    priceFactor: 1.75,
    features: ['Kratz- und reissfestes Gewebe', 'Verstärkter Rahmen', 'Ohne Bohren montierbar', 'Auch für Balkontüren'],
  },
]

export const standardSizes: StandardSize[] = [
  {
    id: 'keller',
    label: 'Kellerfenster',
    widthCm: 60,
    heightCm: 40,
    room: 'Keller / Waschküche',
    note: 'Auch für kleine Lüftungsfenster',
    basePriceChf: 29,
  },
  {
    id: 'bad',
    label: 'Badfenster',
    widthCm: 60,
    heightCm: 80,
    room: 'Bad / WC',
    basePriceChf: 39,
  },
  {
    id: 'kueche',
    label: 'Küchenfenster',
    widthCm: 80,
    heightCm: 120,
    room: 'Küche',
    basePriceChf: 49,
  },
  {
    id: 'schlafzimmer',
    label: 'Schlafzimmerfenster',
    widthCm: 100,
    heightCm: 120,
    room: 'Schlaf- und Kinderzimmer',
    note: 'Die meistbestellte Grösse',
    basePriceChf: 55,
  },
  {
    id: 'wohnzimmer',
    label: 'Wohnzimmerfenster',
    widthCm: 120,
    heightCm: 140,
    room: 'Wohnzimmer',
    basePriceChf: 69,
  },
  {
    id: 'wohnzimmer-gross',
    label: 'Wohnzimmerfenster gross',
    widthCm: 140,
    heightCm: 150,
    room: 'Wohnzimmer, Südseite',
    basePriceChf: 79,
  },
  {
    id: 'balkontuer',
    label: 'Balkontür',
    widthCm: 90,
    heightCm: 210,
    room: 'Balkon / Terrasse',
    note: 'Begehbar, mit Trittschutz unten',
    basePriceChf: 99,
  },
  {
    id: 'balkontuer-breit',
    label: 'Balkontür breit',
    widthCm: 120,
    heightCm: 210,
    room: 'Balkon, zweiflügelig',
    basePriceChf: 119,
  },
]

const categoryIndex = new Map(categories.map((category) => [category.id, category]))
const sizeIndex = new Map(standardSizes.map((size) => [size.id, size]))

export function categoryById(id: string): Category | undefined {
  return categoryIndex.get(id)
}

export function sizeById(id: string): StandardSize | undefined {
  return sizeIndex.get(id)
}

export const allSizeIds = standardSizes.map((size) => size.id)

/**
 * ACHTUNG – VOM BETREIBER ZU ERHEBEN:
 * Die Zuordnung Wohnungstyp -> Fenster ist der stärkste Teil des Angebots
 * ("wir kennen Ihre Fenster") und gleichzeitig der einzige Teil, der real
 * nachgemessen werden MUSS. Die Wohnungstypen selbst sind belegt (Vermieter-
 * liste der Gemeinde Greifensee: 2 bis 5.5 Zimmer plus Attika), die Anzahl
 * und Zuordnung der Fenster ist eine Annahme.
 */
export interface ApartmentType {
  id: string
  label: string
  hint: string
  windows: { sizeId: string; count: number }[]
}

export const apartmentTypes: ApartmentType[] = [
  {
    id: '2-zimmer',
    label: '2 Zimmer',
    hint: 'ca. 55 m²',
    windows: [
      { sizeId: 'wohnzimmer', count: 1 },
      { sizeId: 'schlafzimmer', count: 1 },
      { sizeId: 'kueche', count: 1 },
      { sizeId: 'bad', count: 1 },
      { sizeId: 'balkontuer', count: 1 },
    ],
  },
  {
    id: '3-zimmer',
    label: '3 Zimmer',
    hint: 'ca. 70 m²',
    windows: [
      { sizeId: 'wohnzimmer', count: 1 },
      { sizeId: 'schlafzimmer', count: 2 },
      { sizeId: 'kueche', count: 1 },
      { sizeId: 'bad', count: 1 },
      { sizeId: 'balkontuer', count: 1 },
    ],
  },
  {
    id: '4-zimmer',
    label: '4 bis 4.5 Zimmer',
    hint: 'ca. 90 m²',
    windows: [
      { sizeId: 'wohnzimmer-gross', count: 1 },
      { sizeId: 'schlafzimmer', count: 3 },
      { sizeId: 'kueche', count: 1 },
      { sizeId: 'bad', count: 1 },
      { sizeId: 'balkontuer', count: 1 },
    ],
  },
  {
    id: '5-zimmer',
    label: '5 bis 5.5 Zimmer',
    hint: 'ca. 110 m²',
    windows: [
      { sizeId: 'wohnzimmer-gross', count: 1 },
      { sizeId: 'wohnzimmer', count: 1 },
      { sizeId: 'schlafzimmer', count: 3 },
      { sizeId: 'kueche', count: 1 },
      { sizeId: 'bad', count: 1 },
      { sizeId: 'balkontuer-breit', count: 1 },
    ],
  },
  {
    id: 'attika',
    label: 'Attikawohnung',
    hint: 'mit Dachterrasse',
    windows: [
      { sizeId: 'wohnzimmer-gross', count: 2 },
      { sizeId: 'schlafzimmer', count: 2 },
      { sizeId: 'kueche', count: 1 },
      { sizeId: 'bad', count: 1 },
      { sizeId: 'balkontuer-breit', count: 1 },
    ],
  },
]

export function apartmentById(id: string): ApartmentType | undefined {
  return apartmentTypes.find((type) => type.id === id)
}
