/** Eine Überbauung, deren Fenster wir ausgemessen haben. */
export interface Ueberbauung {
  id: string
  /** Name der Siedlung, z. B. "Am Pfisterhölzli". */
  name: string
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

export type SubmissionKind = 'bestellung' | 'anfrage'

export type SubmissionState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'success'; reference: string }
  | { status: 'error'; message: string }
