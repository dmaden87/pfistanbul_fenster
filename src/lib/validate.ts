import type { CustomerDetails, CustomRequestLine } from '../types'

export type Errors<T> = Partial<Record<keyof T, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const ZIP = /^\d{4}$/

export const emptyCustomer: CustomerDetails = {
  name: '',
  email: '',
  phone: '',
  street: '',
  zip: '',
  city: '',
  notes: '',
}

/**
 * Prueft die Kontaktangaben. `requireAddress` ist bei der Bestellung noetig,
 * bei der unverbindlichen Anfrage nicht.
 */
export function validateCustomer(customer: CustomerDetails, requireAddress: boolean): Errors<CustomerDetails> {
  const errors: Errors<CustomerDetails> = {}

  if (customer.name.trim().length < 2) {
    errors.name = 'Bitte Vor- und Nachname angeben.'
  }
  if (!EMAIL.test(customer.email.trim())) {
    errors.email = 'Bitte eine gültige E-Mail-Adresse angeben, damit wir antworten können.'
  }
  if (requireAddress) {
    if (customer.street.trim().length < 3) {
      errors.street = 'Bitte Strasse und Hausnummer angeben.'
    }
    if (!ZIP.test(customer.zip.trim())) {
      errors.zip = 'Bitte eine vierstellige Postleitzahl angeben.'
    }
    if (customer.city.trim().length < 2) {
      errors.city = 'Bitte den Ort angeben.'
    }
  }

  return errors
}

/** Plausible Fenstermasse in Zentimetern. */
export const MIN_CM = 20
export const MAX_CM = 300

export function validateCustomLines(items: CustomRequestLine[]): Record<string, Errors<CustomRequestLine>> {
  const result: Record<string, Errors<CustomRequestLine>> = {}

  for (const item of items) {
    const errors: Errors<CustomRequestLine> = {}
    const width = Number(item.widthCm)
    const height = Number(item.heightCm)
    const quantity = Number(item.quantity)

    if (!item.widthCm.trim() || Number.isNaN(width) || width < MIN_CM || width > MAX_CM) {
      errors.widthCm = `Breite zwischen ${MIN_CM} und ${MAX_CM} cm`
    }
    if (!item.heightCm.trim() || Number.isNaN(height) || height < MIN_CM || height > MAX_CM) {
      errors.heightCm = `Höhe zwischen ${MIN_CM} und ${MAX_CM} cm`
    }
    if (!item.quantity.trim() || Number.isNaN(quantity) || quantity < 1 || quantity > 50) {
      errors.quantity = 'Anzahl 1 bis 50'
    }

    if (Object.keys(errors).length > 0) result[item.id] = errors
  }

  return result
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0
}
