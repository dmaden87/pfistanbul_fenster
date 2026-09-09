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
 * Wo eine Bestellung in der Abwicklung steht.
 *
 * "offerte" liegt zwischen Eingang und Bestellung beim Lieferanten. Der
 * Schritt kam dazu, weil Sondermasse haeufiger sind als erwartet: Dort wird
 * zuerst ausgemessen und offeriert, und zwischen Offerte und Zusage vergehen
 * Tage. Ohne eigenen Abschnitt sass das entweder faelschlich unter "neu"
 * (nichts unternommen, stimmt nicht) oder unter "bestellt" (beim Lieferanten,
 * stimmt auch nicht).
 */
export type BestellStatus = 'neu' | 'offerte' | 'bestellt' | 'erledigt' | 'geloescht'

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
  zahlung: PaymentMethod
  zahlungswunsch: boolean
  summeChf: number
  /** Nur bei Onlinezahlung und erst, wenn Stripe sich gemeldet hat. */
  bezahlung?: Bezahlung
  /** Fehlt bei Eintraegen aus der Zeit vor dem Feld – die kamen alle über die Seite. */
  quelle?: BestellQuelle
  /** Gesetzt, sobald vor Ort ausgemessen wurde. ISO-Zeitpunkt. */
  ausgemessenAm?: string
  /** Gesetzt, sobald die Offerte raus ist. ISO-Zeitpunkt. */
  offerteAm?: string
  /** Interne Notiz aus dem Adminbereich. Sieht die Kundschaft nie. */
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
  /** true setzt den Zeitpunkt auf jetzt, false loescht ihn. */
  ausgemessen?: boolean
  offerteVersendet?: boolean
  positionen?: BestellPosition[]
  montage?: boolean
  montageChf?: number
  notiz?: string
  quelle?: BestellQuelle
}

/** Was der Server über die Einrichtung des Adminbereichs verrät. */
export interface AdminStatus {
  eingerichtet: boolean
  speicher: boolean
  passwort: boolean
  angemeldet: boolean
}

/* --- Lieferrunde ------------------------------------------------------------ */

/**
 * Wo eine Lieferrunde steht.
 *
 * Der Lebenslauf eines einzigen Dokuments: Es geht als Anfrage raus, kommt
 * mit Preisen zurueck und wird zur Bestellung.
 *
 *   entwurf → angefragt → preise → bestellt → geliefert
 *
 * "entwurf" ist der einzige Zustand, in dem sich die Zusammenstellung noch
 * aendern laesst. Ab "angefragt" sind die Zeilen eingefroren – siehe
 * `zeilen`.
 */
export type LieferungStatus = 'entwurf' | 'angefragt' | 'preise' | 'bestellt' | 'geliefert'

/**
 * Eine eingefrorene Zeile des Auftrags.
 *
 * Warum eingefroren: Bora traegt die Preise mit Bezug auf die laufende
 * Nummer ein ("Zeile 7"). Wuerde jemand danach ein Netz aendern oder
 * ergaenzen, verschoebe sich die Nummerierung und seine Preise landeten am
 * falschen Netz. Deshalb haelt die Lieferrunde ab dem Versand ihre eigene
 * Kopie, statt die Bestellungen erneut auszuwerten.
 */
export interface LieferungZeile {
  nummer: number
  /** Paketkennung, entspricht der Referenz der Bestellung. */
  kennung: string
  /** Fehlt bei Zusatzzeilen, die zu keiner Bestellung gehoeren. */
  herkunft?: ZeilenHerkunft
  bezeichnung: string
  breiteCm?: number
  hoeheCm?: number
  rahmendicke?: string
  rahmenfarbe?: string
  netzfarbe?: string
  mechanismus?: string
  oeffnung?: string
  /** Was der Produzent verlangt. Wird nach Boras Rueckmeldung eingetragen. */
  einkaufChf?: number
}

export interface Lieferung {
  id: string
  /** Menschenlesbare Nummer, z. B. "L-2026-01". Steht auf dem Dokument. */
  nummer: string
  status: LieferungStatus
  erstellt: string
  geaendert: string
  /** Welche Bestellungen in dieser Runde stecken. */
  bestellungIds: string[]
  zeilen: LieferungZeile[]
  /**
   * Zeilen, die aus dieser Runde genommen wurden. Die Netze bleiben in der
   * Bestellung und kommen in die naechste Runde – "aus der Lieferung
   * entfernen" ist etwas anderes als "dem Kunden das Netz streichen".
   *
   * Schluessel: `bestellungId#positionId#stueck`.
   */
  ausgeschlossen?: string[]
  /**
   * Zeilen, die nur zur Runde gehoeren und zu keiner Bestellung: ein
   * Reservenetz, ein Muster, ein Ersatz fuer ein beschaedigtes Stueck. Sie
   * erscheinen auf dem Auftrag, aber auf keiner Rechnung.
   */
  zusatz?: LieferungZeile[]
  /** Lieferkosten je Paketkennung, wie Bora sie einträgt. */
  lieferkostenJePaket?: Record<string, number>
  /** Lieferkosten für die ganze Runde, falls er nicht je Paket rechnet. */
  lieferkostenChf?: number
  /** Liefertermin: erst seine Schätzung, später unser erwarteter Termin. */
  termin?: string
  bemerkung?: string
}
