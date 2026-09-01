/** Fenster oder Tür – bestimmt, welche Bauarten überhaupt in Frage kommen. */
export type SizeKind = 'fenster' | 'tuer'

/** Bauart: Spannrahmen, Plissee fürs Fenster, Plissee für die Balkontür. */
export interface BuildType {
  id: string
  name: string
  shortName: string
  tagline: string
  description: string
  /** Für welche Art Öffnung diese Bauart gebaut wird. */
  kind: SizeKind
  /** Faktor auf den berechneten Grundpreis. Plissee Fenster = 1. */
  factor: number
  bestFor: string
  features: string[]
  /** Der Nachteil, den man ehrlicherweise dazusagt. */
  caveat: string
}

/** Gewebe als eigene Wahl – der Aufschlag rechnet pro Quadratmeter. */
export interface MeshOption {
  id: string
  name: string
  short: string
  surchargePerM2: number
  description: string
  stops: string
  tradeoff: string
  /** Richtwerte des Marktes, keine Zusicherung über das eingekaufte Material. */
  spec: string
  openArea: string
}

/** Eine im Pfisterhölzli vorkommende Standardöffnung. */
export interface StandardSize {
  id: string
  label: string
  widthCm: number
  heightCm: number
  kind: SizeKind
  room: string
  note?: string
}

export interface CartLine {
  id: string
  buildId: string
  sizeId: string
  meshId: string
  quantity: number
}

export interface CartTotals {
  itemCount: number
  subtotalChf: number
  discountChf: number
  discountRate: number
  shippingChf: number
  totalChf: number
  discountLabel: string | null
  nextTier: { elements: number; rate: number } | null
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
  buildId: string
  meshId: string
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
