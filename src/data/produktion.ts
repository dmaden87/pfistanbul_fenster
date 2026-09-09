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
  akkordeon: { deutsch: 'Akkordeon, verschiebbar', tuerkisch: 'akordeon (açılır kapanır)' },
  fix: { deutsch: 'fix, nicht zu öffnen', tuerkisch: 'sabit (açılmaz)' },
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
    'Tüm ölçüler kasa ölçüsüdür (bitmiş plisenin dış ölçüsü). Lütfen ölçülerden pay düşmeyin ve pay eklemeyin – kasa tam olarak belirtilen genişlik ve yükseklikte olmalı.',
}

export const RICHTUNGSREGEL: Beschriftung = {
  deutsch: 'Alle Öffnungsrichtungen sind von innen nach aussen betrachtet.',
  tuerkisch: 'Tüm açılma yönleri içeriden dışarıya bakıldığında geçerlidir.',
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

/**
 * Lieferkosten. Etwas anderes als der Stueckpreis und deshalb ein eigenes
 * Feld: Verpackung und Transport stecken darin, Steuern nicht – die zahlen
 * wir in der Schweiz und gehen den Produzenten nichts an.
 *
 * Eintragbar je Paket ODER fuer die ganze Lieferung, je nachdem, wie er
 * rechnet. Beides anzubieten kostet eine Spalte und erspart eine Rueckfrage.
 */
export const LIEFERKOSTEN: Beschriftung = {
  deutsch: 'Lieferkosten',
  tuerkisch: 'Nakliye bedeli',
}

export const GANZE_LIEFERUNG: Beschriftung = {
  deutsch: 'Ganze Lieferung',
  tuerkisch: 'Tüm sevkiyat',
}

/**
 * Warum auf dem Blatt NIE ein Preis gedruckt steht.
 *
 * Die Preise sind veraenderlich – bei groesseren Mengen werden sie guenstiger,
 * und ausgehandelt wird beim Produzenten. Ein gedruckter Preis waere also
 * entweder falsch oder eine Behauptung. Das Feld bleibt darum in beiden
 * Faellen leer, auch auf der Bestellung; wir tragen die Zahlen danach bei uns
 * ein, um die Marge gegen unsere Verkaufspreise zu pruefen.
 */
export const PREISHINWEIS: Beschriftung = {
  deutsch: 'Bitte Stückpreis je Zeile und die Lieferkosten eintragen.',
  tuerkisch: 'Lütfen her satır için birim fiyatı ve nakliye bedelini yazın.',
}

/**
 * Woraus das ungefaehre Packmass gerechnet wird.
 *
 * WICHTIG, WEIL ES DAS MODELL BESTIMMT: Die Plissees kommen zerlegt. Was
 * geliefert wird, sind die Rahmenstangen – zusammengebaut, aber nicht
 * zusammengesteckt. Das Netz steckt bereits im Profil und traegt nichts
 * zusaetzlich auf. Verpackt wird nicht in Kartons, sondern gestapelt,
 * eingewickelt und mit Klebeband gesichert.
 *
 * Ein Paket ist also ein BUENDEL STANGEN und kein Stapel Platten. Damit
 * haengt die Laenge am laengsten Einzelstueck und der Querschnitt an der
 * ANZAHL der Stangen – nicht an der Breite der Fenster. Ein frueheres Modell
 * rechnete flach gestapelte Platten und kam auf einen viel zu voluminoesen
 * Karton.
 *
 * ACHTUNG, DER QUERSCHNITT IST GESCHAETZT. Wie dick die Profile wirklich
 * sind, weiss der Produzent. Angesetzt ist, was ein zerlegtes Plissee im
 * Buendel ungefaehr belegt: Kassettenprofil mit eingelegtem Netz, Laufprofil
 * und zwei Fuehrungsschienen. Nach der ersten Lieferung nachmessen und diese
 * zwei Zahlen korrigieren – sie stehen absichtlich an einer einzigen Stelle.
 */
export const PACKMASS = {
  /** Querschnitt, den ein zerlegtes Plissee im Buendel belegt, in cm². */
  querschnittJePlisseeCm2: 35,
  /** Zuschlag fuer Folie und Klebeband, in cm. */
  zuschlagCm: 2,
} as const

export const PACKMASS_TITEL: Beschriftung = {
  deutsch: 'Packmass ca. (indikativ, theoretisch gerechnet)',
  tuerkisch: 'Yaklaşık paket ölçüsü (teorik hesap)',
}

/**
 * Alle uebrigen Beschriftungen des Auftrags.
 *
 * Das ist die einzige Stelle, an der die Sprache des Dokuments steht. Ein
 * Wechsel ist ein Eintrag pro Zeile, keine neue Fassung.
 *
 * Der Ton ist bewusst nicht steif: Der Auftrag geht an einen Betrieb, mit dem
 * wir ueber Bora in direktem Kontakt stehen, und in der Tuerkei ist
 * uebertriebene Foermlichkeit im Handwerk unueblich. Deshalb "yazın" und
 * nicht "yazınız".
 */
export const TEXTE = {
  /*
   * Ein Titel fuer beide Zustaende: Dasselbe Blatt geht als Anfrage raus und
   * wird spaeter zur Bestellung.
   *
   * Der Zustand steht trotzdem darunter, und zwar deutlich. Ob eine Zahl
   * erfragt oder ein Auftrag erteilt wird, ist der Unterschied zwischen "was
   * kostet das" und "bitte anfangen" – das darf nicht am Dateinamen haengen.
   */
  formular: { deutsch: 'Anfrage- und Bestellformular', tuerkisch: 'Talep ve Sipariş Formu' },
  zustand: { deutsch: 'Stand', tuerkisch: 'Durum' },
  preisanfrage: { deutsch: 'Preisanfrage', tuerkisch: 'Fiyat teklifi talebi' },
  bestellung: { deutsch: 'Bestellung', tuerkisch: 'Sipariş' },
  terminOffen: { deutsch: 'Ungefährer Liefertermin', tuerkisch: 'Yaklaşık teslim tarihi' },
  terminGesetzt: { deutsch: 'Erwarteter Liefertermin', tuerkisch: 'Beklenen teslim tarihi' },
  stueckHinweis: { deutsch: 'jede Zeile ist ein Stück', tuerkisch: 'her satır bir adettir' },
  plissee: { deutsch: 'Plissee', tuerkisch: 'plise' },
  plissees: { deutsch: 'Plissees', tuerkisch: 'plise' },
  masseinheit: {
    deutsch: 'Alle Masse in Zentimetern, Breite × Höhe.',
    tuerkisch: 'Tüm ölçüler santimetre cinsinden, genişlik × yükseklik.',
  },
  paketeTitel: {
    deutsch: 'Pakete · bitte getrennt verpacken und beschriften',
    tuerkisch: 'Paketler · lütfen ayrı ayrı paketleyip üzerine yazın',
  },
  /* Spaltenkoepfe */
  nummer: { deutsch: 'Nr.', tuerkisch: 'No.' },
  paket: { deutsch: 'Paket', tuerkisch: 'Paket' },
  fenster: { deutsch: 'Fenster', tuerkisch: 'Pencere' },
  breite: { deutsch: 'Breite', tuerkisch: 'Genişlik' },
  hoehe: { deutsch: 'Höhe', tuerkisch: 'Yükseklik' },
  rahmendicke: { deutsch: 'Rahmendicke', tuerkisch: 'Kasa kalınlığı' },
  rahmen: { deutsch: 'Rahmen', tuerkisch: 'Kasa rengi' },
  netz: { deutsch: 'Netz', tuerkisch: 'Tül rengi' },
  mechanismus: { deutsch: 'Mechanismus', tuerkisch: 'Mekanizma' },
  oeffnung: { deutsch: 'Öffnungsrichtung', tuerkisch: 'Açılma yönü' },
  stueckpreis: { deutsch: 'Stückpreis', tuerkisch: 'Birim fiyat' },
  stueck: { deutsch: 'Stück', tuerkisch: 'Adet' },
} as const satisfies Record<string, Beschriftung>
