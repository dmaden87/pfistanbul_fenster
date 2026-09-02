import type { CustomerDetails } from '../../types'
import type { Errors } from '../../lib/validate'

interface ContactFieldsProps {
  customer: CustomerDetails
  errors: Errors<CustomerDetails>
  withAddress: boolean
  notesLabel: string
  notesHint: string
  /**
   * Praefix fuer die Feld-Ids. Noetig, sobald zwei Formulare mit diesen
   * Feldern auf derselben Seite stehen – doppelte Ids brechen sonst die
   * Zuordnung von Label und Fehlermeldung zum Eingabefeld.
   */
  idPrefix?: string
  /** Hinweis unter dem Telefonfeld. Je nach Formular ein anderer Grund. */
  phoneHint?: string
  onChange: (patch: Partial<CustomerDetails>) => void
}

export function ContactFields({
  customer,
  errors,
  withAddress,
  notesLabel,
  notesHint,
  idPrefix = 'cf',
  phoneHint = 'Nur für kurze Rückfragen zum Mass.',
  onChange,
}: ContactFieldsProps) {
  return (
    <div className="form-grid">
      <div className="field form-grid__wide">
        <label className="field__label" htmlFor={`${idPrefix}-name`}>
          Name
        </label>
        <input
          id={`${idPrefix}-name`}
          className="input"
          type="text"
          autoComplete="name"
          value={customer.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${idPrefix}-name-error` : undefined}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        {errors.name && (
          <p className="field__error" id={`${idPrefix}-name-error`}>
            {errors.name}
          </p>
        )}
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-email`}>
          E-Mail
        </label>
        <input
          id={`${idPrefix}-email`}
          className="input"
          type="email"
          autoComplete="email"
          value={customer.email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? `${idPrefix}-email-error` : undefined}
          onChange={(event) => onChange({ email: event.target.value })}
        />
        {errors.email && (
          <p className="field__error" id={`${idPrefix}-email-error`}>
            {errors.email}
          </p>
        )}
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${idPrefix}-phone`}>
          Telefon <span className="field__optional">optional</span>
        </label>
        <input
          id={`${idPrefix}-phone`}
          className="input"
          type="tel"
          autoComplete="tel"
          placeholder="079 000 00 00"
          value={customer.phone}
          onChange={(event) => onChange({ phone: event.target.value })}
        />
        <p className="field__hint">{phoneHint}</p>
      </div>

      {withAddress && (
        <>
          <div className="field form-grid__wide">
            <label className="field__label" htmlFor={`${idPrefix}-street`}>
              Strasse und Nummer
            </label>
            <input
              id={`${idPrefix}-street`}
              className="input"
              type="text"
              autoComplete="street-address"
              value={customer.street}
              aria-invalid={Boolean(errors.street)}
              aria-describedby={errors.street ? `${idPrefix}-street-error` : undefined}
              onChange={(event) => onChange({ street: event.target.value })}
            />
            {errors.street && (
              <p className="field__error" id={`${idPrefix}-street-error`}>
                {errors.street}
              </p>
            )}
          </div>

          <div className="field field--zip">
            <label className="field__label" htmlFor={`${idPrefix}-zip`}>
              PLZ
            </label>
            <input
              id={`${idPrefix}-zip`}
              className="input"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={4}
              value={customer.zip}
              aria-invalid={Boolean(errors.zip)}
              aria-describedby={errors.zip ? `${idPrefix}-zip-error` : undefined}
              onChange={(event) => onChange({ zip: event.target.value })}
            />
            {errors.zip && (
              <p className="field__error" id={`${idPrefix}-zip-error`}>
                {errors.zip}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor={`${idPrefix}-city`}>
              Ort
            </label>
            <input
              id={`${idPrefix}-city`}
              className="input"
              type="text"
              autoComplete="address-level2"
              value={customer.city}
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? `${idPrefix}-city-error` : undefined}
              onChange={(event) => onChange({ city: event.target.value })}
            />
            {errors.city && (
              <p className="field__error" id={`${idPrefix}-city-error`}>
                {errors.city}
              </p>
            )}
          </div>
        </>
      )}

      <div className="field form-grid__wide">
        <label className="field__label" htmlFor={`${idPrefix}-notes`}>
          {notesLabel} <span className="field__optional">optional</span>
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          className="textarea"
          value={customer.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
        />
        <p className="field__hint">{notesHint}</p>
      </div>
    </div>
  )
}
