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
export type OpeningDirection = 'nach-links' | 'nach-oben' | 'nach-rechts' | 'mitte'

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

/** Wo eine Bestellung in der Abwicklung steht. */
export type BestellStatus = 'neu' | 'bestellt' | 'erledigt' | 'geloescht'

/** Woher der Eintrag kommt. "zahlung" ist die Frage nach einer Ratenlösung. */
export type BestellArt = 'bestellung' | 'anfrage' | 'zahlung'

export interface BestellPosition {
  menge: number
  bezeichnung: string
  detail: string
  preisChf: number
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
  positionen: BestellPosition[]
  montage: boolean
  zahlung: PaymentMethod
  zahlungswunsch: boolean
  summeChf: number
  /** Nur bei Onlinezahlung und erst, wenn Stripe sich gemeldet hat. */
  bezahlung?: Bezahlung
}

/** Was der Server über die Einrichtung des Adminbereichs verrät. */
export interface AdminStatus {
  eingerichtet: boolean
  speicher: boolean
  passwort: boolean
  angemeldet: boolean
}
