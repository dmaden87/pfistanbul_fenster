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

/**
 * Beschriftung nachschlagen, ohne an einem unbekannten Wert zu zerbrechen.
 *
 * WARUM ES DAS BRAUCHT: Offerte und Bestellauftrag schlugen direkt in den
 * Tabellen nach - MECHANISMEN[n.mechanismus].deutsch. Steht in einem
 * gespeicherten Netz ein Wert, den die aktuelle Tabelle nicht kennt, ist der
 * Treffer `undefined` und der Zugriff auf `.deutsch` wirft. Die Offerte wird
 * dann nicht etwa luckenhaft, sondern eine weisse Seite - und das ist das
 * Dokument, das zum Kunden geht.
 *
 * Das ist kein erfundener Fall. Beide Dokumente lesen Datensaetze, die
 * irgendwann einmal geschrieben wurden; sobald eine dieser Listen waechst
 * oder ein Wert umbenannt wird, gibt es alte Netze mit alten Werten. Genau
 * das steht an: Zu den Mechanismen kommen die nach innen und aussen
 * oeffnenden Standardnetze dazu.
 *
 * Unbekanntes wird ROH ANGEZEIGT und nicht verschluckt. Was jemand erfasst
 * hat, ist eine Information; ein Strich an ihrer Stelle waere der Verlust,
 * den diese Funktion verhindern soll.
 */
export function beschriften(
  tabelle: Record<string, Beschriftung>,
  schluessel: string | undefined | null,
  sprache: keyof Beschriftung = 'deutsch',
): string | null {
  if (!schluessel) return null
  return tabelle[schluessel]?.[sprache] ?? schluessel
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

/*
 * HIER STAND EINE BESCHRIFTUNG "Lieferkosten" fuer eine Spalte auf dem Blatt
 * an Bora – je Paket und fuer die ganze Lieferung. Sie ist weg: Was die
 * Lieferung kostet, traegt er nach der Bestellung in unsere Buchhaltung ein,
 * nicht von Hand auf ein Papier, das danach abgetippt werden muesste.
 */

export const GANZE_LIEFERUNG: Beschriftung = {
  deutsch: 'Ganze Lieferung',
  tuerkisch: 'Tüm sevkiyat',
}

/**
 * Die Bitte auf der PREISANFRAGE – und nur dort.
 *
 * Auf der Bestellung steht keine Zahl zum Geld mehr. Die Preise sind
 * veraenderlich, bei groesseren Mengen guenstiger, und ausgehandelt wird beim
 * Produzenten; eine gedruckte Zahl waere entweder falsch oder eine
 * Behauptung. Die Anfrage dagegen IST die Frage nach dem Preis, also hat sie
 * eine leere Spalte dafuer.
 *
 * Nach Lieferkosten wird hier nicht mehr gefragt: Die traegt Bora nach der
 * Bestellung in unsere Buchhaltung ein.
 */
export const PREISHINWEIS: Beschriftung = {
  deutsch: 'Bitte den Stückpreis je Zeile eintragen.',
  tuerkisch: 'Lütfen her satır için birim fiyatı yazın.',
}

/*
 * HIER STAND DAS MODELL FUERS PACKMASS: ein angenommener Querschnitt je
 * zerlegtem Plissee, ein Zuschlag fuer Folie und Klebeband, daraus ein
 * Buendelmass "ca. 162 × 11 × 11 cm" auf dem Blatt an Bora.
 *
 * Das Modell war gut durchdacht und half niemandem. Wie dick ein Buendel
 * Stangen wirklich wird, weiss der Produzent, und zum Bauen eines Netzes
 * braucht er die Zahl nicht. Sie ist samt der Frachtspalte vom Blatt
 * verschwunden – uebrig bleibt eine Fertigungs- und Packanweisung.
 */

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
   * Zwei Titel, weil es zwei verschiedene Blaetter sind: Ob eine Zahl erfragt
   * oder ein Auftrag erteilt wird, ist der Unterschied zwischen "was kostet
   * das" und "bitte anfangen" – das muss im Titel stehen, nicht daneben.
   */
  titelAnfrage: { deutsch: 'Preisanfrage', tuerkisch: 'Fiyat Talebi' },
  titelBestellung: { deutsch: 'Definitive Bestellung', tuerkisch: 'Kesin Sipariş' },
  untertitelAnfrage: {
    deutsch: 'Bitte Stückpreis und Frachtkosten eintragen und zurückschicken.',
    tuerkisch: 'Lütfen birim fiyatları ve nakliye bedelini yazıp geri gönderin.',
  },
  untertitelBestellung: {
    deutsch: 'Verbindlicher Auftrag zu den eingetragenen Preisen. Bitte fertigen.',
    tuerkisch: 'Yazılı fiyatlarla kesin sipariştir. Lütfen üretime alın.',
  },
  /* Die interne Notiz eines Auftrags – Sonderwuensche, Fragen, Bemerkungen. */
  notizen: { deutsch: 'Bemerkungen und Sonderwünsche', tuerkisch: 'Notlar ve özel istekler' },
  terminOffen: { deutsch: 'Ungefährer Liefertermin', tuerkisch: 'Yaklaşık teslim tarihi' },
  terminGesetzt: { deutsch: 'Erwarteter Liefertermin', tuerkisch: 'Beklenen teslim tarihi' },
  stueckHinweis: { deutsch: 'jede Zeile ist ein Stück', tuerkisch: 'her satır bir adettir' },
  plissee: { deutsch: 'Plissee', tuerkisch: 'plise' },
  plissees: { deutsch: 'Plissees', tuerkisch: 'plise' },
  masseinheit: {
    deutsch: 'Alle Masse in Zentimetern, Breite × Höhe.',
    tuerkisch: 'Tüm ölçüler santimetre cinsinden, genişlik × yükseklik.',
  },
  /*
   * Gestrichene Zeilen bleiben stehen, statt zu verschwinden.
   *
   * Bora hat seine Preise auf die Zeilennummern der Anfrage geschrieben. Wer
   * beim verbindlichen Auftrag neu ab eins durchnummeriert, zwingt ihn, jede
   * Zahl neu zu suchen – und irgendwann landet eine am falschen Netz. Also
   * behalten die Zeilen ihre Nummer, und was herausgefallen ist, wird
   * durchgestrichen.
   */
  gestrichen: {
    deutsch: 'gestrichen',
    tuerkisch: 'iptal',
  },
  gestrichenHinweis: {
    deutsch: 'Durchgestrichene Zeilen sind nicht bestellt. Die Nummern bleiben wie in der Anfrage.',
    tuerkisch: 'Üstü çizili satırlar sipariş edilmemiştir. Numaralar talepteki gibi kalır.',
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
