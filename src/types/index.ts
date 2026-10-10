import type { Mechanismus, Netzfarbe, Rahmenfarbe } from '../data/produktion'

/** Eine Überbauung, deren Fenster wir ausgemessen haben. */
export interface Ueberbauung {
  id: string
  /** Name der Siedlung, z. B. "Am Pfisterhölzli". */
  name: string
  /**
   * Der Name ohne Artikel, fuer den Fliesstext: "Sie wohnen im Pfisterhölzli?"
   * Aus `name` laesst sich das nicht ableiten - manche Siedlungen heissen
   * "Am ...", andere "Im ...", die meisten gar nicht so.
   */
  shortName: string
  /** Ort, z. B. "Greifensee ZH". */
  place: string
  /** Ein Satz zur Siedlung, erscheint über dem Sortiment. */
  intro: string
  windowTypes: WindowType[]
  sets: NetSet[]
}

/** Ein Gewebe. Nicht jedes ist direkt bestellbar. */
export interface MeshOption {
  id: string
  name: string
  short: string
  /** "standard" ist im Preis inbegriffen, "anfrage" gibt es gegen Aufpreis. */
  availability: 'standard' | 'anfrage'
  description: string
  stops: string
  /** Der Nachteil, den man ehrlicherweise dazusagt. */
  tradeoff: string
}

/**
 * Wohin sich das Netz beim Öffnen bewegt. "mitte" heisst: zwei Netze, die
 * sich beim Schliessen in der Mitte treffen.
 */
export type OpeningDirection = 'nach-links' | 'nach-oben' | 'nach-rechts' | 'nach-unten' | 'mitte'

/** Einer der ausgemessenen Fenstertypen einer Überbauung. */
export interface WindowType {
  id: string
  label: string
  /** Breite in cm. */
  widthCm: number
  /** Höhe in cm. */
  heightCm: number
  /** Fläche in m², wie im Kostenkonzept ausgewiesen. */
  areaM2: number
  room: string
  note?: string
  /** Fester Verkaufspreis in CHF. */
  priceChf: number
  opening: OpeningDirection
  /** Wie die Bedienung in einem Satz erklärt wird. */
  openingLabel: string
  /**
   * Dicke des Fensterrahmens, in den geklebt wird. Steht hier und nicht als
   * Vorbelegung im Formular, weil sie eine Eigenschaft der Ueberbauung ist:
   * Ohne diese Angabe koennte selbst eine gewoehnliche Warenkorb-Bestellung
   * nicht zum Produzenten, weil ihm eine Angabe fehlte.
   */
  rahmendicke: string
}

/** Ein Set aus mehreren Netzen zum festen Zielpreis. */
export interface NetSet {
  id: string
  label: string
  description: string
  items: { typeId: string; count: number }[]
  /** Fester Zielpreis in CHF. */
  priceChf: number
}

export type CartLineKind = 'einzel' | 'set'

export interface CartLine {
  id: string
  kind: CartLineKind
  /** Fenstertyp-Id oder Set-Id. */
  refId: string
  quantity: number
}

export interface CartTotals {
  /** Anzahl Netze insgesamt – Sets zählen mit ihren Einzelnetzen. */
  netCount: number
  netsChf: number
  /** Ersparnis gegenüber den Einzelpreisen, nur durch Sets. */
  savingsChf: number
  montageChf: number
  shippingChf: number
  totalChf: number
}

export interface CustomerDetails {
  name: string
  email: string
  phone: string
  street: string
  zip: string
  city: string
  notes: string
}

export interface CustomRequestLine {
  id: string
  widthCm: string
  heightCm: string
  quantity: string
  room: string
}

/** Wie bezahlt wird. "uebergabe" bleibt der vorgeschlagene Weg. */
export type PaymentMethod = 'uebergabe' | 'online'

export type SubmissionKind = 'bestellung' | 'anfrage' | 'zahlung'

export type SubmissionState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'success'; reference: string }
  | { status: 'error'; message: string }

/* --- Adminbereich ----------------------------------------------------------- */

/**
 * Die PHASE einer Bestellung – der Workflow des Betreibers, in seiner
 * Reihenfolge:
 *
 *   neu → klaerung → offerte → zusage → bestellen → bora → ausliefern
 *
 * "offerte" ist die Arbeit am Angebot, "zusage" das Warten auf den Kunden,
 * nachdem es raus ist – zwei Phasen, weil das eine bei uns liegt und das
 * andere nicht.
 *
 * ES GAB EINE PHASE "kosten" ZWISCHEN KLAERUNG UND ANGEBOT. Dort wurde Bora
 * nach seinen Preisen gefragt, bevor wir unseren festlegten. Sie ist weg: Die
 * Kostenstruktur ist inzwischen bekannt, der Rechner der Webseite trifft sie,
 * und eine Phase, in der nur gewartet wird, haelt jeden Auftrag eine Woche
 * auf. Gespeicherte "kosten" werden beim Lesen auf "offerte" abgebildet.
 *
 * "bestellen" UND "bora" WAREN EINE PHASE. Jetzt ist "bestellen" der Backlog:
 * zugesagte Auftraege, die auf die naechste Sendung warten und sich dort zu
 * einem Paket buendeln lassen. Erst wenn das Paket bei Bora liegt, geht es
 * nach "bora" – dort steht, ob die Ware unterwegs ist und unter welcher
 * Sendungsnummer. Die Trennung ist keine Kosmetik: Vorher stand ein Auftrag,
 * der noch auf Gesellschaft wartet, in derselben Liste wie einer, der schon
 * in der Tuerkei produziert wird.
 *
 * Dazu "abgesagt" als Ende ohne Auftrag. "Abgeschlossen" ist keine Phase,
 * sondern die Aussage, dass in "ausliefern" beide Haken gesetzt sind
 * (uebergeben und bezahlt) – siehe `abgeschlossen()` in src/lib/phasen.ts.
 *
 * WARUM VON HAND UND NICHT ABGELEITET. Der vorige Ansatz leitete den Stand
 * der Ware aus der Lieferrunde ab und gruppierte nach "wer ist dran". Das
 * war fuer den einen Menschen, der im Tool arbeitet, unuebersichtlich: Er
 * denkt in seinem Ablauf je Bestellung, nicht in Zustaendigkeiten. Jetzt
 * ist die Phase ein gespeicherter Wert, und jede Bewegung ist sein Klick –
 * entweder auf der Karte oder, fuer viele Bestellungen auf einmal, auf der
 * Runde (mit Kaestchen, wer mitgeht).
 *
 * Eine Bestellung aus dem Warenkorb startet wie jede andere in "neu" – auch
 * sie soll einmal durch die Kontrolle. Von dort geht sie mit einem Klick
 * direkt in den Backlog: Der Kunde hat an der Kasse zugesagt, der Preis stand
 * im Katalog. Klaerung und Angebot gibt es fuer sie nicht; die Karte zeigt
 * sie als "entfaellt".
 *
 * ALTE WERTE. Gespeicherte Bestellungen tragen "neu | offeriert | zugesagt |
 * abgesagt" (Fassung von gestern) oder noch aelter "offerte | bestellt |
 * erledigt | geloescht". Beides wird beim LESEN abgebildet, nie durch ein
 * Skript – siehe `vereinheitlichen` in api/bestellungen.ts. Kein bestehendes
 * Feld wird dabei geloescht.
 */
export type BestellStatus =
  | 'neu'
  | 'klaerung'
  | 'offerte'
  | 'zusage'
  | 'bestellen'
  | 'bora'
  | 'ausliefern'
  | 'abgesagt'

/** Warum aus einer Bestellung nichts wurde. Erscheint im Archiv. */
export type AbsageGrund = 'spam' | 'doppelt' | 'keineAntwort' | 'kunde' | 'zuTeuer' | 'storno'

/**
 * Woher der Eintrag kam. Die Seite legt immer "web" an; alles andere traegt
 * jemand von Hand nach, weil die Bestellung ueber WhatsApp, Instagram oder
 * am Gartenzaun kam. Nur so laesst sich spaeter sagen, welcher Kanal
 * tatsaechlich Bestellungen bringt.
 */
export type BestellQuelle = 'web' | 'whatsapp' | 'instagram' | 'telefon' | 'persoenlich'

/** Woher der Eintrag kommt. "zahlung" ist die Frage nach einer Ratenlösung. */
export type BestellArt = 'bestellung' | 'anfrage' | 'zahlung'

/**
 * Ein einzelnes Netz (oder ein Set) innerhalb einer Bestellung.
 *
 * `breiteCm` und `hoeheCm` fehlen bei allem aus dem Warenkorb - dort steht
 * das Format schon im Katalog - und bei Eintraegen aus der Zeit vor diesem
 * Feld. Beim Sondermass sind sie das Wesentliche, deshalb stehen sie als
 * Zahlen da und nicht als Text in `detail`: Aus Zahlen laesst sich der
 * Bestellauftrag an den Lieferanten erzeugen, aus "ca. 120 breit" nicht.
 */
export interface BestellPosition {
  /**
   * Kennung der Position innerhalb der Bestellung. Vergibt der Server beim
   * Speichern.
   *
   * Sie ist noetig, damit eine Lieferrunde sich merken kann, welches Netz sie
   * NICHT enthaelt. Ueber die Position im Feld ginge das nicht: Wird eine
   * Zeile darueber geloescht, zeigte die Merkstelle plotzlich auf ein anderes
   * Netz. Fehlt sie bei Alteintraegen, wird ersatzweise der Listenplatz
   * genommen.
   */
  id?: string
  menge: number
  bezeichnung: string
  detail: string
  preisChf: number
  /**
   * Was der RECHNER fuer dieses Netz vorgeschlagen hat, je Stueck.
   *
   * `preisChf` ist der Verkaufspreis und darf im Angebot von Hand
   * ueberschrieben werden. Dann waere der urspruengliche Vorschlag weg - und
   * mit ihm die Antwort auf "haben wir hier nachgelassen, und wie viel?". Das
   * ist die Frage, die eine Auswertung spaeter stellt, und sie laesst sich
   * nachtraeglich nicht mehr beantworten: Der Rechner liefert zwar dieselbe
   * Zahl noch einmal, aber nur solange niemand die Katalogpreise anfasst, aus
   * denen er sie ableitet.
   *
   * Deshalb wird er EINMAL gestempelt und danach nie wieder angetastet - der
   * Server bewahrt ihn ueber jede Aenderung hinweg. Neu gerechnet wird er nur,
   * wenn sich die Masse aendern: Dann ist es ein anderes Netz, und der alte
   * Vorschlag gehoerte zu Massen, die es nicht mehr gibt.
   *
   * Fehlt bei allem, was vor diesem Feld entstanden ist.
   */
  richtpreisChf?: number
  /**
   * Was der Produzent je Stueck verlangt. Kommt aus der Lieferrunde und wird
   * dort eingetragen – hier steht die eingefrorene Kopie.
   *
   * Warum eine Kopie: Die Runde ist ein Arbeitspapier, die Bestellung ist der
   * Datensatz. Nach einem Wechsel in eine zweite Runde, nach dem Verwerfen
   * einer Runde oder Jahre spaeter bei der Frage "was hat dieser Kunde uns
   * gebracht" muss der Einkaufspreis noch da sein. Steht er nur in der Runde,
   * ist er weg, sobald die Runde weg ist.
   */
  einkaufChf?: number
  breiteCm?: number
  hoeheCm?: number
  /**
   * Die Angaben, die der Produzent braucht. Fehlen sie, wird der
   * Bestellauftrag nicht erzeugt, sondern sagt, was fehlt – lieber eine
   * Meldung als eine Lieferung aus der Tuerkei, die nicht passt.
   */
  rahmendicke?: string
  rahmenfarbe?: Rahmenfarbe
  netzfarbe?: Netzfarbe
  mechanismus?: Mechanismus
  oeffnung?: OpeningDirection
  /**
   * Verweis in den Katalog, wenn die Zeile aus dem Warenkorb kommt. Damit
   * loest der Bestellauftrag ein Set in seine einzelnen Netze auf, ohne dass
   * die Preiszeile angetastet wird: Fuer das Geld ist das Set eine Position,
   * fuer den Produzenten sind es sechs Netze.
   */
  typId?: string
  setId?: string
}

/**
 * Was aus der Onlinezahlung geworden ist. Fehlt, solange Stripe nichts
 * gemeldet hat - dann ist offen, ob bezahlt wurde. Gesetzt wird das
 * ausschliesslich von api/stripe-webhook.ts, nie vom Browser.
 */
export interface Bezahlung {
  status: 'bezahlt' | 'abgebrochen'
  betragChf: number
  /** ISO-Zeitpunkt der Meldung von Stripe. */
  zeitpunkt: string
  /** Id der Checkout-Sitzung, zum Nachschlagen im Stripe-Konto. */
  sitzung: string
}

export interface Bestellung {
  id: string
  referenz: string
  art: BestellArt
  status: BestellStatus
  /** ISO-Zeitpunkt des Eingangs. */
  eingang: string
  /** ISO-Zeitpunkt der letzten Statusänderung. */
  geaendert: string
  kunde: {
    name: string
    email: string
    telefon: string
    strasse: string
    plz: string
    ort: string
    bemerkung: string
  }
  /** Die einzelnen Netze. Eine Bestellung ist ein Eintrag, die Netze stecken darin. */
  positionen: BestellPosition[]
  montage: boolean
  /**
   * Was die Montage kostet, als eigener Betrag. Fehlt bei Alteintraegen -
   * dort steckt sie in der Differenz zwischen `summeChf` und den Positionen.
   * Sie muss separat stehen, damit das Bearbeiten einzelner Netze die
   * Montagepauschale nicht verschluckt.
   */
  montageChf?: number
  /**
   * Die Anfahrt als eigener Posten. Im Liefergebiet kostet sie nichts, und
   * genau das soll auf der Offerte stehen - deshalb ist ein aktiver Posten
   * mit 0.- etwas anderes als kein Posten: Das eine sagt "kostenlos", das
   * andere sagt nichts.
   *
   * Vorher war die Anfahrt kein Feld, sondern ein Auswahlfeld IM Offert-
   * Dokument. Sie stand damit nirgends im Datensatz: Wer die Offerte zweimal
   * oeffnete, musste sich erinnern, was er beim ersten Mal gewaehlt hatte,
   * und die Summe in der Liste wusste ohnehin nichts davon.
   *
   * Fehlt bei Alteintraegen - dort gab es den Posten nicht.
   */
  anfahrt?: boolean
  anfahrtChf?: number
  /**
   * Ein Rabatt auf die ganze Bestellung, in CHF, mit dem Wort dazu
   * ("Kennenlernrabatt"). Steht auf der Offerte als eigener Posten; die
   * Netzpreise bleiben, was sie sind. Geht in die Summe ein.
   *
   * `rabatt` ist der Schalter, `rabattChf` der Betrag - wie bei Montage und
   * Anfahrt. Bei Alteintraegen fehlt der Schalter und wird beim Lesen aus dem
   * Betrag abgeleitet.
   */
  rabatt?: boolean
  rabattChf?: number
  rabattText?: string
  zahlung: PaymentMethod
  zahlungswunsch: boolean
  summeChf: number
  /** Nur bei Onlinezahlung und erst, wenn Stripe sich gemeldet hat. */
  bezahlung?: Bezahlung
  /** Fehlt bei Eintraegen aus der Zeit vor dem Feld – die kamen alle über die Seite. */
  quelle?: BestellQuelle
  /** Gesetzt, sobald vor Ort ausgemessen wurde. ISO-Zeitpunkt. */
  ausgemessenAm?: string
  /**
   * Phase 4: die Verkaufspreise wurden mit Blick auf Boras Kosten
   * festgelegt. Bis dahin tragen die Positionen den Richtpreis aus der
   * Anfrage – und eine Offerte mit Richtpreisen waere eine Offerte ohne
   * Kalkulation.
   */
  preiseFestgelegtAm?: string
  /** Gesetzt, sobald die Offerte raus ist. ISO-Zeitpunkt. */
  offerteAm?: string
  /**
   * Die beiden Haken am Ende. Bewusst zwei Zeitpunkte und kein weiterer
   * Status: Uebergabe und Zahlung sind unabhaengig voneinander. Bei
   * Barzahlung fallen sie zusammen, bei einer Onlinezahlung war laengst
   * bezahlt, und bei einer Ratenloesung liegen Wochen dazwischen.
   *
   * "Abgeschlossen" ist deshalb kein Zustand, den jemand setzt, sondern die
   * Aussage, dass beide gesetzt sind. Damit faellt eine uebergebene
   * Bestellung sofort aus der Ausliefer-Liste, taucht aber unter "Zahlung
   * offen" auf, bis das Geld da ist.
   */
  ausgeliefertAm?: string
  bezahltAm?: string
  /**
   * Zur Zahlung: bar, TWINT, Rate vereinbart, "zahlt naechste Woche". Ein
   * Freitext, kein Zahlungsjournal – der Betrieb wollte den einen Haken
   * behalten und dazu eine Notiz.
   */
  zahlungKommentar?: string
  /** Seit wann die Bestellung in ihrer Phase steht. Fuer "seit n Tagen". */
  phaseSeit?: string
  /** Phase 2: der Termin fuer die Auftragsklaerung beim Kunden. ISO-Datum. */
  klaerungTermin?: string
  /** Phase 4→5: wann der Kunde zugesagt hat. Rechtlich der Vertragsschluss. */
  zusageAm?: string
  /** Phase 6: der vereinbarte Liefer-/Montagetermin. ISO-Datum. */
  montageTermin?: string
  /**
   * Zwei Stempel bei Bora: bestellt, und von ihm verschickt. Angekommen ist
   * kein Stempel, sondern der Wechsel nach "ausliefern".
   */
  bestelltAm?: string
  versandAm?: string
  /**
   * Die Sendungsnummer der Lieferung, als Freitext und freiwillig: Bora
   * schickt ueber wechselnde Spediteure, und manchmal gibt es gar keine
   * Nummer. Ein Pflichtfeld waere damit ein Pflichtfeld, das man leer
   * laesst - also eine Luege im Datensatz.
   *
   * Sie gehoert zur SENDUNG, nicht zum Auftrag: Liegen mehrere Auftraege im
   * selben Paket, tragen sie alle dieselbe Nummer.
   */
  sendungsnummer?: string
  /**
   * Mehrere Auftraege gehen als EIN Paket an Bora – ein gemeinsamer
   * Bestelltalon, eine Sendung. Das Paket ist nur ein Etikett auf den
   * Auftraegen, keine eigene Sache: Wer dasselbe Etikett traegt, steht auf
   * demselben Talon. Die Buendelung selbst ist Organisation, kein Zustand.
   */
  paket?: string
  /** Bei "abgesagt": warum, und seit wann. */
  absageGrund?: AbsageGrund
  absageAm?: string
  /**
   * Der Anteil dieser Bestellung an Zoll, Einfuhrsteuer und Gebuehren, aus
   * der Runde je Paket verteilt wie die Fracht. Ein Betrag – der Betrieb
   * rechnet die Posten zusammen, der Bescheid kommt ohnehin Wochen nach
   * der Ware.
   */
  zollChf?: number
  /**
   * Der Frachtanteil dieser Bestellung, ebenfalls aus der Runde. Gibt Bora
   * die Kosten je Paket an, ist das Paket genau diese Bestellung und der
   * Anteil exakt. Nennt er nur ein Total, wird nach Netzanzahl geteilt –
   * dann steht `lieferkostenGeschaetzt` dabei, damit eine spaetere Auswertung
   * weiss, worauf sie sich stuetzt.
   */
  lieferkostenChf?: number
  lieferkostenGeschaetzt?: boolean
  /** Aus welcher Runde die Einkaufszahlen stammen, und wann. */
  einkaufAusRunde?: string
  einkaufAm?: string
  /** Interne Notiz aus dem Adminbereich. Sieht die Kundschaft nie. */
  notiz?: string

  /* --- Buchhaltung ------------------------------------------------------ */

  /**
   * Was diese Bestellung gekostet hat, Posten fuer Posten.
   *
   * EINE LISTE UND NICHT DREI FELDER, weil jeder Posten seinen eigenen
   * Traeger und seinen eigenen Stand hat: Die Netze zahlt meist Bora, das
   * Verbrauchsmaterial einer von uns, und bezahlt ist das eine lange vor
   * dem anderen. Drei feste Felder koennten das nicht tragen.
   *
   * Die aelteren Felder `lieferkostenChf`, `zollChf` und `einkaufChf` je
   * Position bleiben stehen und werden weiter gelesen: Sie sind die
   * Vorgeschichte dieser Liste, und geloescht wird hier nichts.
   */
  kosten?: KostenPosten[]
  /**
   * Haelt die Bestellung aus der Erfolgsrechnung heraus, ohne sie zu
   * loeschen. Fuer Datensaetze aus der Bauzeit und fuer Versehen: Sie
   * sollen die Zahlen nicht verfaelschen, aber auch nicht verschwinden.
   */
  ausserRechnung?: boolean
}

/** Wer am Geschaeft beteiligt ist und etwas auslegen kann. */
export type Beteiligter = 'bora' | 'ufuk' | 'deniz'

/**
 * Welche Art Kosten. Die ersten drei sind die festen Zeilen jeder
 * Bestellung, `weiteres` ist alles, was sonst noch anfaellt.
 */
export type KostenArt = 'herstellung' | 'lieferung' | 'mwst' | 'weiteres'

/**
 * Ein Kostenposten – an einer Bestellung oder, als Auslage, ohne sie.
 *
 * `traeger` ist nicht, wer die Kosten verursacht hat, sondern WER SIE
 * AUSGELEGT HAT. Daraus faellt die Frage "wem schulden wir was" von selbst
 * ab: Alles, was nicht `bezahlt` ist, steht beim Traeger offen.
 */
export interface KostenPosten {
  id: string
  art: KostenArt
  /** Nur bei `weiteres` noetig; die festen Arten beschriften sich selbst. */
  bezeichnung?: string
  betragChf: number
  traeger: Beteiligter
  /** Ausgeglichen, also an den Traeger zurueckgeflossen. */
  bezahlt?: boolean
  /** Wann die Auslage anfiel. Ohne Angabe zaehlt sie beim Erfassungstag. */
  am?: string
  erfasstAm: string
}

/** Wofuer eine Auslage ohne Bestellbezug angefallen ist. */
export type AuslagenKategorie =
  | 'marketing'
  | 'infrastruktur'
  | 'material'
  | 'werkzeug'
  | 'fahrten'
  | 'sonstiges'

/**
 * Laufende Betriebskosten ohne Bestellbezug: Werbung, Server, Klebeband,
 * Benzin. Alles, was keiner einzelnen Bestellung zuzurechnen ist und
 * trotzdem bezahlt werden muss.
 */
export interface Auslage {
  id: string
  /** Tag der Ausgabe, ISO. Bestimmt, in welchen Monat sie faellt. */
  am: string
  bezeichnung: string
  kategorie: AuslagenKategorie
  betragChf: number
  traeger: Beteiligter
  bezahlt?: boolean
  notiz?: string
  erfasstAm: string
}

/* --- Die Abrechnung --------------------------------------------------------- */

/**
 * Ein Auftrag, wie er in einer Abrechnung steht.
 *
 * MIT EIGENEN BETRAEGEN, nicht nur als Verweis. Eine abgeschlossene
 * Abrechnung ist ein Beleg: Was darin steht, muss in einem Jahr noch
 * dasselbe sagen, auch wenn jemand inzwischen den Preis des Auftrags
 * geaendert, den Kurs angepasst oder die Formel umgebaut hat.
 */
export interface AbrechnungAuftrag {
  bestellungId: string
  referenz: string
  kunde: string
  /** Der ganze Erloes dieses Auftrags, wie er in die Abrechnung ging. */
  erloesChf: number
  /** Davon aus der Ware, nach Rabatt – der Topf, an dem Bora beteiligt ist. */
  warenerloesChf: number
  /** Davon aus Montage und Anfahrt – unsere eigene Arbeit. */
  montageerloesChf: number
}

/** Eine Auslage, wie sie in einer Abrechnung steht. */
export interface AbrechnungPosten {
  /** Woher der Posten kommt. Genau eines von beiden. */
  bestellungId?: string
  auslageId?: string
  /** Die Kennung innerhalb des Auftrags – oder die der Auslage. */
  postenId: string
  art: KostenArt | 'auslage' | 'montage'
  /** Wie er auf dem Beleg heisst. Bei festen Arten leer; die Oberflaeche beschriftet sie. */
  bezeichnung?: string
  /** Zu welchem Kunden er gehoert, wo es einen gibt. */
  kunde?: string
  betragChf: number
  traeger: Beteiligter
}

/**
 * Eine Abrechnung: einmal Geld verteilen, als Beleg.
 *
 * WARUM ES DAS GIBT. Vorher rechnete die Oberflaeche jedes Mal neu, was eine
 * Abrechnung ueber ALLE festen Auftraege ergaebe – eine Vorschau, keine
 * Abrechnung. Sie nahm auch Auftraege mit, von denen noch kein Rappen da
 * war, und sie vergass, was beim letzten Mal schon verteilt wurde.
 *
 * Eine Abrechnung nimmt jetzt genau das, was ausgewaehlt wurde: Auftraege,
 * deren Geld eingegangen ist, und Auslagen, die jemand ausgelegt hat. Sie
 * ist ein Entwurf, solange `erledigtAm` fehlt, und danach unveraenderlich.
 */
export interface Abrechnung {
  id: string
  /** Fortlaufend, zum Darueberreden: A-2026-01. */
  nummer: string
  erstelltAm: string
  /** Gesetzt heisst: abgeschlossen, ausbezahlt, unveraenderlich. */
  erledigtAm?: string
  notiz?: string

  auftraege: AbrechnungAuftrag[]
  posten: AbrechnungPosten[]

  /*
   * Die Summen, eingefroren. Sie liessen sich aus den Zeilen darueber neu
   * rechnen – und genau das sollen sie nicht muessen: Ein Beleg, der sich
   * beim Lesen neu rechnet, ist keiner. Dass beides beim Abschluss
   * uebereinstimmt, prueft bau/abrechnung-test.mjs.
   */
  erloesChf: number
  warenerloesChf: number
  montageerloesChf: number
  warenkostenChf: number
  /** Montage und Anfahrt, die an Ufuk und Deniz zurueckgehen. */
  montagekostenChf: number
  betriebskostenChf: number
  rueckzahlungChf: number
  rueckzahlung: Record<Beteiligter, number>
  warengewinnChf: number
  montagegewinnChf: number
  verteilbarChf: number
  anteile: Record<Beteiligter, number>
  /** Anteil plus Rueckzahlung – was unter dem Strich zu jedem fliesst. */
  summe: Record<Beteiligter, number>
}

/** Was sich an einer Abrechnung noch aendern laesst. */
export interface AbrechnungAenderung {
  /** true schliesst sie ab und friert sie ein. */
  erledigt?: boolean
  notiz?: string
}

/** Woher eine Auftragszeile stammt – oder dass sie nur zur Runde gehoert. */
export interface ZeilenHerkunft {
  bestellungId: string
  positionId: string
  /** Das wievielte Stueck einer Position mit Menge > 1. */
  stueck: number
}

/**
 * Was sich im Adminbereich an einer Bestellung aendern laesst.
 *
 * Bewusst eine Aufzaehlung und kein "alles, was ankommt": `bezahlung` steht
 * absichtlich nicht darin. Der Zahlungsstand kommt allein von Stripe ueber
 * api/stripe-webhook.ts. Waere er von hier aus setzbar, koennte ein
 * Fehlklick eine Bestellung als bezahlt markieren, die es nicht ist.
 */
export interface BestellAenderung {
  status?: BestellStatus
  /**
   * Die Kostenposten der Buchhaltung, GANZ ODER GAR NICHT. Einzelne Posten
   * nachzupflegen hiesse, beim Loeschen zu raten, was gemeint war - die
   * Oberflaeche hat die Liste ohnehin vollstaendig vor sich.
   */
  kosten?: KostenPosten[]
  /**
   * Erlaubt, den Richtpreis der Positionen zu ERSETZEN statt ihn zu bewahren.
   *
   * Nur zusammen mit `positionen`, und nur von einem eigenen Knopf aus. Der
   * Richtpreis ist sonst unantastbar: Er ist die Zahl, die die Kundschaft
   * gesehen hat. Bei einem von Hand erfassten Auftrag hat sie nie eine
   * gesehen - dort steht der getippte Preis als sein eigener Vergleichswert,
   * und das ist keiner.
   */
  richtpreiseNeu?: boolean
  /** Haelt die Bestellung aus der Erfolgsrechnung heraus. */
  ausserRechnung?: boolean
  /** true setzt den Zeitpunkt auf jetzt, false loescht ihn. */
  ausgemessen?: boolean
  offerteVersendet?: boolean
  /** true stempelt "Verkaufspreise festgelegt" auf jetzt, false loescht. */
  preiseFestgelegt?: boolean
  ausgeliefert?: boolean
  /**
   * Die Zahlung bei der Uebergabe. Nicht zu verwechseln mit `bezahlung`: Das
   * ist Stripes Meldung und bleibt von hier aus unantastbar.
   */
  bezahlt?: boolean
  zahlungKommentar?: string
  /** Datumsfelder: ein ISO-Datum setzt, ein leerer String loescht. */
  klaerungTermin?: string
  montageTermin?: string
  /** true stempelt jetzt, false loescht. */
  zusage?: boolean
  bestellt?: boolean
  versand?: boolean
  /** Die Sendungsnummer; ein leerer String nimmt sie weg. */
  sendungsnummer?: string
  /** Das Paket-Etikett; ein leerer String nimmt es weg. */
  paket?: string
  /**
   * Boras Kosten, von Hand eingetragen: je Position der Stueckpreis (null
   * loescht), dazu Fracht und Zoll fuer den ganzen Auftrag.
   */
  einkauf?: {
    jePosition?: Record<string, number | null>
    lieferkostenChf?: number | null
    zollChf?: number | null
  }
  absageGrund?: AbsageGrund
  positionen?: BestellPosition[]
  /**
   * Die drei Posten des Angebots, jeder als Schalter mit Betrag. Steht der
   * Schalter auf false, setzt der Server den Betrag auf 0: Ein abgeschalteter
   * Posten mit einem Betrag darin waere eine Zahl, die irgendwann wieder
   * auftaucht.
   */
  montage?: boolean
  montageChf?: number
  anfahrt?: boolean
  anfahrtChf?: number
  rabatt?: boolean
  /** 0 oder leer nimmt den Rabatt weg. */
  rabattChf?: number
  rabattText?: string
  notiz?: string
  quelle?: BestellQuelle
}

/** Was der Server über die Einrichtung des Adminbereichs verrät. */
export interface AdminStatus {
  eingerichtet: boolean
  speicher: boolean
  passwort: boolean
  angemeldet: boolean
  /**
   * Die Testumgebung: keine Anmeldung, eigene Tabelle, Dummy-Datensaetze.
   * Nur auf Vorschau-Deployments von Zweigen mit der Endung "-demo" - siehe
   * api/_demo.ts. Fehlt im Normalbetrieb.
   */
  demo?: boolean
}
