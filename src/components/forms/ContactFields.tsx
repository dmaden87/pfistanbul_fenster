import type { CustomerDetails } from '../../types'
import type { Errors } from '../../lib/validate'

interface ContactFieldsProps {
  customer: CustomerDetails
  errors: Errors<CustomerDetails>
  withAddress: boolean
  notesLabel: string
  notesHint: string
  onChange: (patch: Partial<CustomerDetails>) => void
}

export function ContactFields({ customer, errors, withAddress, notesLabel, notesHint, onChange }: ContactFieldsProps) {
  return (
    <div className="form-grid">
      <div className="field form-grid__wide">
        <label className="field__label" htmlFor="cf-name">
          Name
        </label>
        <input
          id="cf-name"
          className="input"
          type="text"
          autoComplete="name"
          value={customer.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'cf-name-error' : undefined}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        {errors.name && (
          <p className="field__error" id="cf-name-error">
            {errors.name}
          </p>
        )}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="cf-email">
          E-Mail
        </label>
        <input
          id="cf-email"
          className="input"
          type="email"
          autoComplete="email"
          value={customer.email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'cf-email-error' : undefined}
          onChange={(event) => onChange({ email: event.target.value })}
        />
        {errors.email && (
          <p className="field__error" id="cf-email-error">
            {errors.email}
          </p>
        )}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="cf-phone">
          Telefon <span className="field__optional">optional</span>
        </label>
        <input
          id="cf-phone"
          className="input"
          type="tel"
          autoComplete="tel"
          placeholder="079 000 00 00"
          value={customer.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
        <p className="field__hint">Nur für kurze Rückfragen zum Mass.</p>
      </div>

      {withAddress && (
        <>
          <div className="field form-grid__wide">
            <label className="field__label" htmlFor="cf-street">
              Strasse und Nummer
            </label>
            <input
              id="cf-street"
              className="input"
              type="text"
              autoComplete="street-address"
              value={customer.street}
              aria-invalid={Boolean(errors.street)}
              aria-describedby={errors.street ? 'cf-street-error' : undefined}
              onChange={(event) => onChange({ street: event.target.value })}
            />
            {errors.street && (
              <p className="field__error" id="cf-street-error">
                {errors.street}
              </p>
            )}
          </div>

          <div className="field field--zip">
            <label className="field__label" htmlFor="cf-zip">
              PLZ
            </label>
            <input
              id="cf-zip"
              className="input"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={4}
              value={customer.zip}
              aria-invalid={Boolean(errors.zip)}
              aria-describedby={errors.zip ? 'cf-zip-error' : undefined}
              onChange={(event) => onChange({ zip: event.target.value })}
            />
            {errors.zip && (
              <p className="field__error" id="cf-zip-error">
                {errors.zip}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="cf-city">
              Ort
            </label>
            <input
              id="cf-city"
              className="input"
              type="text"
              autoComplete="address-level2"
              value={customer.city}
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? 'cf-city-error' : undefined}
              onChange={(event) => onChange({ city: event.target.value })}
            />
            {errors.city && (
              <p className="field__error" id="cf-city-error">
                {errors.city}
              </p>
            )}
          </div>
        </>
      )}

      <div className="field form-grid__wide">
        <label className="field__label" htmlFor="cf-notes">
          {notesLabel} <span className="field__optional">optional</span>
        </label>
        <textarea
          id="cf-notes"
          className="textarea"
          value={customer.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
        <p className="field__hint">{notesHint}</p>
      </div>
    </div>
  )
}
