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

/**
 * OHNE KOSTENFOLGE. Bora verlangt fuer alle drei denselben Preis; die Farbe
 * steht hier, damit sie auf dem Bestellblatt landet, nicht damit jemand
 * damit rechnet.
 *
 * `dunkelbraun` IST NICHT MEHR IM ANGEBOT, bleibt aber stehen: Es steht in
 * Bestellungen, die schon geschrieben sind, und ohne diesen Eintrag zeigte
 * ihr Blatt den nackten Schluessel statt eines Worts. Geloescht wird hier
 * nie etwas - nur nicht mehr angeboten (siehe RAHMENFARBEN_WAHL).
 */
export type Rahmenfarbe = 'weiss' | 'anthrazit' | 'schwarz' | 'dunkelbraun'

export const RAHMENFARBEN: Record<Rahmenfarbe, Beschriftung> = {
  weiss: { deutsch: 'weiss', tuerkisch: 'beyaz' },
  anthrazit: { deutsch: 'anthrazit', tuerkisch: 'antrasit' },
  schwarz: { deutsch: 'schwarz', tuerkisch: 'siyah' },
  dunkelbraun: { deutsch: 'dunkelbraun', tuerkisch: 'koyu kahverengi' },
}

/** Was im Admin zur Wahl steht - ohne die Altfarbe. */
export const RAHMENFARBEN_WAHL: Rahmenfarbe[] = ['weiss', 'anthrazit', 'schwarz']

/* --- Rahmendicke ------------------------------------------------------------ */

/**
 * DIE DICKE DES PLISSEE-RAHMENS, und sie kostet Geld: Bora rechnet den
 * schmalen 1.5er teurer als den gewoehnlichen 2.8er. Deshalb ist aus dem
 * freien Textfeld eine Wahl geworden - ein Mass, das in den Preis eingeht,
 * darf nicht als "ca. 2-3" im Datensatz stehen.
 *
 * NICHT ZU VERWECHSELN mit shopConfig.rahmendicke: Das ist die Dicke der
 * FENSTERrahmen in der Siedlung ("3-4 cm"), eine Angabe ueber die Haeuser.
 * Diese hier beschreibt unser Produkt.
 *
 * ALTE EINTRAEGE TRAGEN FREIEN TEXT. Das Feld bleibt deshalb ein String;
 * was nicht in dieser Tabelle steht, wird angezeigt, wie es dasteht, und
 * laesst sich im Editor auf einen der beiden Werte setzen.
 */
export type Rahmendicke = '1.5' | '2.8'

export const RAHMENDICKEN: Record<Rahmendicke, Beschriftung> = {
  '1.5': { deutsch: '1.5 cm, schmal', tuerkisch: '1.5 cm, ince' },
  '2.8': { deutsch: '2.8 cm, normal', tuerkisch: '2.8 cm, normal' },
}

/* --- Netzart ---------------------------------------------------------------- */

/**
 * Gewoehnliches oder engmaschiges Gewebe. Engmaschig haelt auch kleine
 * Muecken und Pollen ab und kostet bei Bora mehr - wie viel, steht noch
 * nicht fest (Stand Oktober 2026 angekuendigt fuer die naechste Woche).
 *
 * Die Wahl steht trotzdem schon da: Sie gehoert auf das Bestellblatt, damit
 * Bora das richtige Gewebe einzieht. Bis der Aufschlag bekannt ist, rechnet
 * der Kostenrechner beide gleich - und das steht so in kostenConfig.ts.
 */
export type Netzart = 'normal' | 'engmaschig'

export const NETZARTEN: Record<Netzart, Beschriftung> = {
  normal: { deutsch: 'normal', tuerkisch: 'normal' },
  engmaschig: { deutsch: 'engmaschig', tuerkisch: 'sık dokulu' },
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
  netzart: 'normal' as Netzart,
  /**
   * Die Dicke UNSERES Plissee-Rahmens, nicht die der Fensterrahmen.
   *
   * HIER STAND "3-4 cm", und das war die Dicke der FENSTERrahmen im
   * Pfisterhoelzli - eine Angabe ueber die Haeuser, die versehentlich zur
   * Vorbelegung eines Produktmerkmals geworden war. Seit Bora den schmalen
   * 1.5er teurer rechnet als den 2.8er, geht dieses Feld in den Preis ein;
   * eine Toleranzangabe laesst sich nicht multiplizieren.
   *
   * Der 2.8er ist der gewoehnliche und deshalb die Vorbelegung.
   */
  rahmendicke: '2.8' as Rahmendicke,
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
    deutsch: 'Bitte Stückpreis je Zeile eintragen und zurückschicken.',
    tuerkisch: 'Lütfen her satır için birim fiyatı yazıp geri gönderin.',
  },
  /*
   * KEINE PREISE MEHR AUF DIESEM BLATT, also auch keine im Untertitel. Dort
   * stand "Verbindlicher Auftrag zu den eingetragenen Preisen" – neben einer
   * Tabelle, in der keine Preise mehr stehen. Ein Satz, der auf eine Spalte
   * zeigt, die es nicht gibt, laesst den Leser suchen.
   */
  untertitelBestellung: {
    deutsch: 'Verbindlicher Auftrag. Bitte fertigen.',
    tuerkisch: 'Kesin sipariştir. Lütfen üretime alın.',
  },
  /*
   * "Sendung" vor der Nummer oben rechts, und das ist keine Zierde: Auf
   * diesem Blatt gibt es ZWEI Dinge, die man Paket nennen koennte – die
   * Lieferung als Ganzes (P-2026-01) und das Buendel je Auftrag (PF-D004),
   * das getrennt verpackt und beschriftet wird. Ohne Wort davor standen
   * beide als "Paket" da, und Bora haette raten muessen, welches gemeint
   * ist.
   */
  sendung: { deutsch: 'Sendung', tuerkisch: 'Sevkiyat' },
  /*
   * Fuer ein Blatt, das einer Sendung FOLGT, die schon bestellt ist. Es steht
   * in der Sprache des Blattes und nicht in der der Maske: Wer es liest,
   * sitzt in Istanbul und hat die erste Liste schon vor sich.
   */
  nachtrag: { deutsch: 'Nachtrag', tuerkisch: 'Ek sipariş' },
  nachtragSatz: {
    deutsch: 'Nachtrag zu einer bereits bestellten Sendung. Nur die Netze auf diesem Blatt kommen dazu – die früher bestellten bitte NICHT noch einmal fertigen.',
    tuerkisch: 'Daha önce sipariş edilmiş bir sevkiyata ektir. Yalnızca bu sayfadaki sineklikler eklenir – önceki siparişleri LÜTFEN tekrar üretmeyin.',
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
   * HIER STANDEN ZWEI BESCHRIFTUNGEN FUER GESTRICHENE ZEILEN. Sie stammen
   * aus einer Zeit, in der die Bestellung aus der Anfrage entstand und deren
   * Zeilennummern behielt, damit Boras Preise am richtigen Netz blieben.
   * Benutzt hat sie nie jemand – das Blatt kennt diesen Zustand nicht –, und
   * seit auf der Bestellung keine Preise mehr stehen, gibt es auch den Grund
   * dafuer nicht mehr.
   */
  buendelTitel: {
    deutsch: 'Bündel · bitte getrennt verpacken und beschriften',
    tuerkisch: 'Koliler · lütfen ayrı ayrı paketleyip üzerine yazın',
  },
  /* Spaltenkoepfe */
  nummer: { deutsch: 'Nr.', tuerkisch: 'No.' },
  /*
   * Das BUENDEL, nicht die Sendung: Jeder Auftrag wird fuer sich verpackt
   * und beschriftet, damit wir ihn beim Ausliefern nicht erst auseinander
   * sortieren muessen. Mehrere Buendel reisen in einer Sendung.
   */
  buendel: { deutsch: 'Bündel', tuerkisch: 'Koli' },
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
