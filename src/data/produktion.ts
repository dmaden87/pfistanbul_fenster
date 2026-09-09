import type { OpeningDirection } from '../types'

/**
 * Alles, was der Produzent ueber ein Netz wissen muss.
 *
 * Der Produzent arbeitet fuer viele Auftraggeber und kann sich unser
 * Sortiment nicht merken. Deshalb steht auf dem Auftrag bei JEDEM Netz alles
 * da – auch das, was bei uns immer gleich ist. "Wie immer" ist keine
 * Bestellangabe.
 *
 * ÜBERSETZUNG: Die Beschriftungen unten sind die einzige Stelle, an der die
 * Sprache des Auftrags steht. Der Auftrag geht auf Tuerkisch raus; dafuer
 * wird hier `tuerkisch` gefuellt und nichts anderes angefasst. `deutsch`
 * bleibt fuer den Adminbereich, den wir bedienen.
 */

export interface Beschriftung {
  deutsch: string
  tuerkisch: string
}

/* --- Rahmenfarbe ------------------------------------------------------------ */

export type Rahmenfarbe = 'weiss' | 'schwarz' | 'dunkelbraun'

export const RAHMENFARBEN: Record<Rahmenfarbe, Beschriftung> = {
  weiss: { deutsch: 'weiss', tuerkisch: 'beyaz' },
  schwarz: { deutsch: 'schwarz', tuerkisch: 'siyah' },
  dunkelbraun: { deutsch: 'dunkelbraun', tuerkisch: 'koyu kahverengi' },
}

/* --- Netzfarbe -------------------------------------------------------------- */

export type Netzfarbe = 'weiss' | 'grau'

export const NETZFARBEN: Record<Netzfarbe, Beschriftung> = {
  weiss: { deutsch: 'weiss', tuerkisch: 'beyaz' },
  grau: { deutsch: 'grau', tuerkisch: 'gri' },
}

/* --- Mechanismus ------------------------------------------------------------ */

/**
 * Muss zwingend dastehen: Der Produzent kann auch feste Rahmen fertigen, die
 * sich nicht oeffnen lassen. Fehlt die Angabe, ist die Lieferung
 * moeglicherweise unbrauchbar und niemand hat einen Fehler gemacht.
 */
export type Mechanismus = 'akkordeon' | 'fix'

export const MECHANISMEN: Record<Mechanismus, Beschriftung> = {
  akkordeon: { deutsch: 'Akkordeon, verschiebbar', tuerkisch: 'akordeon, sürgülü' },
  fix: { deutsch: 'fix, nicht zu öffnen', tuerkisch: 'sabit, açılmaz' },
}

/* --- Öffnungsrichtung ------------------------------------------------------- */

/**
 * IMMER VON INNEN NACH AUSSEN BETRACHTET. Das ist die klassische Stelle, an
 * der eine ganze Lieferung spiegelverkehrt ankommt, und deshalb steht der
 * Satz auch auf dem Auftrag selbst und nicht nur hier.
 *
 * "mitte" ist EIN Plissee, das sich in der Mitte oeffnet – nie zwei
 * Positionen.
 */
export const OEFFNUNGEN: Record<OpeningDirection, Beschriftung> = {
  'nach-links': { deutsch: 'rechts nach links', tuerkisch: 'sağdan sola' },
  'nach-rechts': { deutsch: 'links nach rechts', tuerkisch: 'soldan sağa' },
  'nach-oben': { deutsch: 'unten nach oben', tuerkisch: 'aşağıdan yukarıya' },
  'nach-unten': { deutsch: 'oben nach unten', tuerkisch: 'yukarıdan aşağıya' },
  mitte: { deutsch: 'Mitte nach links und rechts, ein Plissee', tuerkisch: 'ortadan sağa ve sola, tek plise' },
}

/* --- Was gilt, wenn nichts anderes gesagt wird ------------------------------ */

/**
 * Unser Standardprodukt. Es steht trotzdem bei jedem Netz auf dem Auftrag –
 * das hier ist nur die Vorbelegung beim Erfassen, damit niemand dreimal
 * dasselbe auswaehlen muss.
 */
export const STANDARD = {
  rahmenfarbe: 'weiss' as Rahmenfarbe,
  netzfarbe: 'grau' as Netzfarbe,
  mechanismus: 'akkordeon' as Mechanismus,
  /**
   * Rahmendicke der Fensterrahmen im Pfisterhölzli. Der Bereich ist Absicht
   * und fuer den Produzenten verstaendlich – er baut mit dieser Toleranz.
   */
  rahmendicke: '3-4 cm',
} as const

/**
 * Wie die Masse zu lesen sind. Der wichtigste Satz des ganzen Auftrags: Wenn
 * beide Seiten glauben, die andere ziehe das Mass ab, passt kein einziges
 * Netz.
 */
export const MASSREGEL: Beschriftung = {
  deutsch:
    'Alle Masse sind Rahmenmasse (Aussenmass des fertigen Plissees). Bitte nichts abziehen und nichts dazurechnen – der Rahmen muss genau so breit und hoch werden, wie angegeben.',
  tuerkisch:
    'Tüm ölçüler kasa ölçüsüdür (bitmiş plisenin dış ölçüsü). Lütfen hiçbir pay çıkarmayın ve eklemeyin – kasa tam olarak belirtilen genişlik ve yükseklikte olmalıdır.',
}

export const RICHTUNGSREGEL: Beschriftung = {
  deutsch: 'Alle Öffnungsrichtungen sind von innen nach aussen betrachtet.',
  tuerkisch: 'Tüm açılma yönleri içeriden dışarıya doğru bakıldığında geçerlidir.',
}

/**
 * Der Absender, wie er auf dem Auftrag steht.
 *
 * Steht hier und nicht in operator.ts: Das dort ist die Adresse fuer die
 * Kundschaft und fuer das Impressum. Diese hier geht in die Tuerkei und
 * nennt deshalb das Land in der Sprache des Empfaengers.
 *
 * ZUR ORTSANGABE: Die Postleitzahl 8606 gehoert zu Greifensee, nicht zu
 * Zuerich. So steht es hier trotzdem, weil der Empfaenger Zuerich kennt und
 * Greifensee nicht; die Post stellt nach Postleitzahl zu. Soll ein Paket
 * wirklich hierher geschickt werden, ist "8606 Greifensee" die sichere
 * Fassung.
 */
export const ABSENDER = {
  firma: 'Pfistanbul Fenster',
  person: 'Deniz Maden',
  strasse: 'Am Pfisterhölzli 38',
  ort: 'CH 8606 Zürich',
  land: { deutsch: 'SCHWEIZ', tuerkisch: 'İSVİÇRE' } as Beschriftung,
} as const

/** Was Bora je Lieferung eintraegt – zusaetzlich zu den Stueckpreisen. */
export const LIEFERKOSTEN: Beschriftung = {
  deutsch: 'Lieferkosten für die ganze Lieferung',
  tuerkisch: 'Tüm sevkiyat için nakliye bedeli',
}
