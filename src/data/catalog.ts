import type { BuildType, MeshOption, SizeKind, StandardSize } from '../types'
import { shopConfig } from './shopConfig'

/**
 * ACHTUNG – VOM BETREIBER ZU ERHEBEN UND ZU RECHNEN:
 *
 * 1. Die zehn Standardmasse sind marktübliche Schweizer Fensterformate, KEINE
 *    Messung in der Siedlung. Für das Bausystem Am Pfisterhölzli gibt es keine
 *    öffentlich belegten Fenstermasse, und die Fassaden wurden ab 1993
 *    etappenweise saniert – je Haus können andere Profile verbaut sein.
 *    Vor dem Live-Gang real nachmessen.
 * 2. Die Raumzuordnungen sind Verkaufshilfen ("typisches Format für …"), keine
 *    Zusicherung, dass das Mass in einer bestimmten Wohnung passt.
 * 3. Die Gewebeangaben sind Richtwerte des Marktes, nicht das Datenblatt des
 *    eingekauften Materials. Vor der Veröffentlichung ersetzen.
 */

export const buildTypes: BuildType[] = [
  {
    id: 'plissee-fenster',
    name: 'Plissee-Insektenschutz für Fenster',
    shortName: 'Plissee Fenster',
    tagline: 'Auf- und zuziehen wie ein Akkordeon',
    kind: 'fenster',
    factor: 1,
    description:
      'Das Gewebe liegt in feinen Falten in einer schmalen Alu-Schiene und lässt sich in jeder Position anhalten – halb, ganz oder gar nicht. Es bleibt das ganze Jahr montiert und trägt nach aussen nur wenige Millimeter auf, funktioniert also auch bei eng anliegenden Rollläden.',
    bestFor: 'Fenster, an die man täglich herantritt: Wohnzimmer, Schlafzimmer, Küche',
    features: [
      'Stufenlos zu öffnen und zu schliessen',
      'Muss nie ausgehängt und eingelagert werden',
      'Umlaufende Bürstendichtung, kein Spalt',
      'Rahmen zum Reinigen aushängbar',
    ],
    caveat: 'Mehr bewegte Teile als ein Spannrahmen – und unten läuft eine flache Bodenschiene mit.',
  },
  {
    id: 'plissee-tuer',
    name: 'Plissee-Insektenschutz für Balkontüren',
    shortName: 'Plissee Balkontür',
    tagline: 'Durchgehen, ohne etwas auszuhängen',
    kind: 'tuer',
    factor: 1.35,
    description:
      'Dieselbe Faltmechanik, aber begehbar: verstärkte Profile, führende Bodenschiene, doppelte Bürstendichtung. Ab 160 cm Breite zweiteilig mit Mittelanschlag, öffnet dann von der Mitte nach beiden Seiten.',
    bestFor: 'Balkon- und Loggiatüren, die im Sommer den halben Tag offen stehen',
    features: [
      'Begehbar, ohne Aushängen',
      'Verstärkte Profile für den täglichen Gebrauch',
      'Doppelte Bürstendichtung',
      'Ab 160 cm zweiteilig',
    ],
    caveat: 'Die Bodenschiene ist eine flache Schwelle – für gehbehinderte Personen ein Thema.',
  },
  {
    id: 'spannrahmen',
    name: 'Spannrahmen',
    shortName: 'Spannrahmen',
    tagline: 'Der Klassiker – einmal einhängen, fertig',
    kind: 'fenster',
    factor: 0.65,
    description:
      'Ein leichter Alurahmen mit gespanntem Gewebe, der von aussen in die Laibung gehängt wird. Keine bewegten Teile, deshalb die langlebigste und günstigste Bauart – und im Winter in zwei Handgriffen wieder weg.',
    bestFor: 'Fenster, die man nicht als Durchgang oder Ablage braucht: Bad, Keller, Kinderzimmer',
    features: [
      'Die günstigste Variante',
      'Ohne Bohren, mit Klemmwinkeln',
      'Zum Reinigen abnehmbar',
      'Keine Mechanik, die kaputtgehen kann',
    ],
    caveat: 'Wer täglich durchgreifen oder ans Fensterbrett will, muss ihn jedes Mal aushängen.',
  },
]

export const meshOptions: MeshOption[] = [
  {
    id: 'standard',
    name: 'Standard-Fiberglasgewebe',
    short: 'Standard',
    surchargePerM2: 0,
    description: 'Das Gewebe für den Alltag. Viel Luft, viel Licht, sehr langlebig – und von aussen kaum zu sehen.',
    stops: 'Stechmücken, Fliegen, Wespen, Hornissen, Motten',
    tradeoff: 'Hält keine ganz kleinen Insekten ab und ist nicht katzensicher.',
    spec: 'ca. 1,4 × 1,6 mm',
    openArea: 'ca. 60 %',
  },
  {
    id: 'feinmasch',
    name: 'Feinmaschgewebe',
    short: 'Feinmasch',
    surchargePerM2: 15,
    description:
      'Deutlich engere Masche. Sinnvoll in Seenähe und im Erdgeschoss neben den Familiengärten, wo die kleinen Plagegeister unterwegs sind.',
    stops: 'zusätzlich Gnitzen, Kriebelmücken, Trauermücken, Gewittertierchen',
    tradeoff: 'Etwas weniger Luftdurchlass als Standardgewebe.',
    spec: 'ca. 0,7 × 0,7 mm',
    openArea: 'ca. 65 %',
  },
  {
    id: 'katzensicher',
    name: 'Katzenschutzgewebe',
    short: 'Katzensicher',
    surchargePerM2: 45,
    description:
      'Rund siebenmal reissfester als Standardgewebe. Ihre Katze kann sich ans offene Fenster setzen, ohne dass das Netz nachgibt.',
    stops: 'Insekten, und es hält dem Gewicht einer Katze stand',
    tradeoff: 'Gröbere Masche und sichtbar dickere Fäden.',
    spec: 'ca. 1,5 × 2,5 mm',
    openArea: 'ca. 36 %',
  },
  {
    id: 'pollen',
    name: 'Pollenschutzgewebe',
    short: 'Pollenschutz',
    surchargePerM2: 75,
    description:
      'Beschichtetes Spezialgewebe. Pollen sind zu klein für jede Masche – zurückgehalten werden sie, weil sie an der Beschichtung haften bleiben.',
    stops: 'Insekten und ein erheblicher Teil des Blütenstaubs',
    tradeoff: 'Deutlich weniger Luft und Durchsicht. Die Beschichtung lässt über die Jahre nach.',
    spec: 'beschichtet, längliche Masche',
    openArea: 'ca. 33 %',
  },
]

/** Nur diese Gewebe dürfen bestellt werden – Pollenschutz ist bis zum Datenblatt gesperrt. */
export const orderableMeshes = meshOptions.filter(
  (mesh) => mesh.id !== 'pollen' || shopConfig.pollenEnabled,
)

export const standardSizes: StandardSize[] = [
  { id: 'f-60x40', label: 'Kellerfenster', widthCm: 60, heightCm: 40, kind: 'fenster', room: 'Typisches Format für Keller, Waschküche, Estrich' },
  { id: 'f-60x60', label: 'Klein, quadratisch', widthCm: 60, heightCm: 60, kind: 'fenster', room: 'Typisches Format für Bad, WC, kleines Küchenfenster' },
  { id: 'f-80x100', label: 'Kippflügel', widthCm: 80, heightCm: 100, kind: 'fenster', room: 'Typisches Format für Küche und kleine Schlafzimmer' },
  { id: 'f-100x120', label: 'Standardfenster', widthCm: 100, heightCm: 120, kind: 'fenster', room: 'Typisches Format für Schlaf- und Kinderzimmer', note: 'Meistverkaufte Grösse' },
  { id: 'f-120x115', label: 'Wohnzimmer quer', widthCm: 120, heightCm: 115, kind: 'fenster', room: 'Typisches Wohnzimmerformat' },
  { id: 'f-140x120', label: 'Wohnzimmer gross', widthCm: 140, heightCm: 120, kind: 'fenster', room: 'Typisches Format für Eckzimmer und Süd- oder Westlage' },
  { id: 'f-150x150', label: 'Grossfenster', widthCm: 150, heightCm: 150, kind: 'fenster', room: 'Typisches Format für Wohnzimmer XL und Loggia-Seitenfenster', note: 'Mit Mittelstrebe' },
  { id: 't-80x200', label: 'Balkontür einflügelig', widthCm: 80, heightCm: 200, kind: 'tuer', room: 'Das verbreitetste Türmass in Bauten der Siebzigerjahre' },
  { id: 't-100x200', label: 'Balkontür breit', widthCm: 100, heightCm: 200, kind: 'tuer', room: 'Breite Balkontür, Terrassenzugang im Erdgeschoss' },
  { id: 't-160x200', label: 'Balkontür zweiflügelig', widthCm: 160, heightCm: 200, kind: 'tuer', room: 'Zweiflügelige Balkon- oder Loggiatür', note: 'Zweiteilig' },
]

/**
 * Wohnungstypen sind belegt (Vermieterliste der Gemeinde Greifensee: 2 bis 5.5
 * Zimmer plus Attika). Welche Fenster dazugehören, ist geschätzt.
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
      { sizeId: 'f-120x115', count: 1 },
      { sizeId: 'f-100x120', count: 1 },
      { sizeId: 'f-80x100', count: 1 },
      { sizeId: 'f-60x60', count: 1 },
      { sizeId: 't-80x200', count: 1 },
    ],
  },
  {
    id: '3-zimmer',
    label: '3 Zimmer',
    hint: 'ca. 70 m²',
    windows: [
      { sizeId: 'f-120x115', count: 1 },
      { sizeId: 'f-100x120', count: 2 },
      { sizeId: 'f-80x100', count: 1 },
      { sizeId: 'f-60x60', count: 1 },
      { sizeId: 't-80x200', count: 1 },
    ],
  },
  {
    id: '4-zimmer',
    label: '4 bis 4.5 Zimmer',
    hint: 'ca. 90 m²',
    windows: [
      { sizeId: 'f-140x120', count: 1 },
      { sizeId: 'f-100x120', count: 3 },
      { sizeId: 'f-80x100', count: 1 },
      { sizeId: 'f-60x60', count: 1 },
      { sizeId: 't-100x200', count: 1 },
    ],
  },
  {
    id: '5-zimmer',
    label: '5 bis 5.5 Zimmer',
    hint: 'ca. 110 m²',
    windows: [
      { sizeId: 'f-150x150', count: 1 },
      { sizeId: 'f-120x115', count: 1 },
      { sizeId: 'f-100x120', count: 3 },
      { sizeId: 'f-80x100', count: 1 },
      { sizeId: 'f-60x60', count: 1 },
      { sizeId: 't-160x200', count: 1 },
    ],
  },
  {
    id: 'attika',
    label: 'Attikawohnung',
    hint: 'mit Dachterrasse',
    windows: [
      { sizeId: 'f-150x150', count: 2 },
      { sizeId: 'f-100x120', count: 2 },
      { sizeId: 'f-80x100', count: 1 },
      { sizeId: 'f-60x60', count: 1 },
      { sizeId: 't-160x200', count: 1 },
    ],
  },
]

const buildIndex = new Map(buildTypes.map((build) => [build.id, build]))
const sizeIndex = new Map(standardSizes.map((size) => [size.id, size]))
const meshIndex = new Map(meshOptions.map((mesh) => [mesh.id, mesh]))

export function buildById(id: string): BuildType | undefined {
  return buildIndex.get(id)
}

export function sizeById(id: string): StandardSize | undefined {
  return sizeIndex.get(id)
}

export function meshById(id: string): MeshOption | undefined {
  return meshIndex.get(id)
}

export function apartmentById(id: string): ApartmentType | undefined {
  return apartmentTypes.find((type) => type.id === id)
}

export function sizesOfKind(kind: SizeKind): StandardSize[] {
  return standardSizes.filter((size) => size.kind === kind)
}

/** Die Bauart, die zu einer Öffnung passt – Türen brauchen die Türvariante. */
export function buildsForKind(kind: SizeKind): BuildType[] {
  return buildTypes.filter((build) => build.kind === kind)
}
