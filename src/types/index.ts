/** Bauart eines Insektenschutz-Produkts (Plissee, Spannrahmen, ...). */
export interface Category {
  id: string
  name: string
  shortName: string
  tagline: string
  description: string
  mesh: string
  bestFor: string
  /** Aufschlag auf den Basispreis der Groesse, als Faktor (1 = kein Aufschlag). */
  priceFactor: number
  features: string[]
}

/** Eine im Pfisterhoelzli vorkommende Standardgroesse. */
export interface StandardSize {
  id: string
  label: string
  widthCm: number
  heightCm: number
  room: string
  note?: string
  /** Basispreis in CHF fuer die guenstigste Bauart. */
  basePriceChf: number
}

/** Konkret bestellbare Kombination aus Bauart und Standardgroesse. */
export interface Variant {
  categoryId: string
  sizeId: string
}

export interface CartLine {
  id: string
  categoryId: string
  sizeId: string
  quantity: number
}

export interface CartTotals {
  itemCount: number
  subtotalChf: number
  discountChf: number
  shippingChf: number
  totalChf: number
  discountLabel: string | null
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
  categoryId: string
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
