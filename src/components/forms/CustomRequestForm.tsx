import { useState } from 'react'
import type { CustomRequestLine, CustomerDetails, SubmissionState } from '../../types'
import { categories } from '../../data/catalog'
import { ContactFields } from './ContactFields'
import { emptyCustomer, hasErrors, validateCustomLines, validateCustomer, type Errors } from '../../lib/validate'
import { isDemoMode, makeReference, submitToOperator } from '../../lib/submitOrder'
import './forms.css'

function newLine(index: number): CustomRequestLine {
  return {
    id: `custom-${index}`,
    categoryId: categories[0]?.id ?? '',
    widthCm: '',
    heightCm: '',
    quantity: '1',
    room: '',
  }
}

export function CustomRequestForm() {
  const [items, setItems] = useState<CustomRequestLine[]>([newLine(0)])
  const [customer, setCustomer] = useState<CustomerDetails>(emptyCustomer)
  const [contactErrors, setContactErrors] = useState<Errors<CustomerDetails>>({})
  const [lineErrors, setLineErrors] = useState<Record<string, Errors<CustomRequestLine>>>({})
  const [state, setState] = useState<SubmissionState>({ status: 'idle' })
  const [counter, setCounter] = useState(1)
  // Wer den Ausmesstermin ausdrücklich selbst wünscht, schliesst damit das
  // Widerrufsrecht nach Art. 40a ff. OR für ein Haustürgeschäft aus. Der Wunsch
  // muss dokumentiert sein - deshalb wird er hier festgehalten und mitgeschickt.
  const [wantsVisit, setWantsVisit] = useState(false)

  const updateItem = (id: string, patch: Partial<CustomRequestLine>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const addItem = () => {
    setItems((current) => [...current, newLine(counter)])
    setCounter((value) => value + 1)
  }

  const removeItem = (id: string) => {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const nextContactErrors = validateCustomer(customer, false)
    const nextLineErrors = validateCustomLines(items)
    setContactErrors(nextContactErrors)
    setLineErrors(nextLineErrors)

    if (hasErrors(nextContactErrors) || hasErrors(nextLineErrors)) {
      setState({ status: 'idle' })
      return
    }

    const reference = makeReference('anfrage', items.length * 7919 + customer.email.length * 131 + customer.name.length)
    setState({ status: 'sending' })

    try {
      const notes = wantsVisit
        ? `${customer.notes}${customer.notes ? '\n' : ''}[Kunde wünscht ausdrücklich einen Ausmesstermin vor Ort.]`
        : customer.notes
      await submitToOperator({ kind: 'anfrage', customer: { ...customer, notes }, items, reference })
      setState({ status: 'success', reference })
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? `Die Anfrage konnte nicht übermittelt werden (${error.message}). Bitte versuchen Sie es später nochmals.`
            : 'Die Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es später nochmals.',
      })
    }
  }

  if (state.status === 'success') {
    return (
      <div className="confirmation">
        <div className="confirmation__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h3>Ihre Anfrage ist bei uns.</h3>
        <p className="section__lead">
          Wir rechnen Ihre Masse durch und melden uns mit einer verbindlichen Offerte – an Werktagen innert 24 Stunden.
        </p>
        <span className="confirmation__reference">Referenz {state.reference}</span>
        <ul className="confirmation__next">
          <li>Sie erhalten eine Offerte mit Preis, Gewebe und Liefertermin.</li>
          <li>Erst wenn Sie zusagen, produzieren wir – vorher entstehen keine Kosten.</li>
          <li>Passt etwas nicht, antworten Sie einfach auf unsere Mail.</li>
        </ul>
        {isDemoMode && (
          <p className="form-status form-status--note" style={{ marginTop: 'var(--space-6)' }}>
            Demo-Modus: Es wurde nichts verschickt. Die Anfrage steht in der Browser-Konsole.
          </p>
        )}
      </div>
    )
  }

  return (
    <form className="custom-request" onSubmit={handleSubmit} noValidate>
      <div className="form-block">
        <div className="form-block__head">
          <h3>
            <span className="form-step" aria-hidden="true">
              1
            </span>
            Welche Elemente brauchen Sie?
          </h3>
          <p>
            Breite und Höhe der Fensteröffnung in Zentimetern, aufs Ganze gerundet. Wenn Sie unsicher sind: Wir messen
            vor Ort nach, bevor produziert wird.
          </p>
        </div>

        <ul className="request-rows">
          {items.map((item, index) => {
            const errors = lineErrors[item.id] ?? {}
            return (
              <li className="request-row" key={item.id}>
                <span className="request-row__index">Element {index + 1}</span>

                <div className="field">
                  <label className="field__label" htmlFor={`${item.id}-category`}>
                    Bauart
                  </label>
                  <select
                    id={`${item.id}-category`}
                    className="select"
                    value={item.categoryId}
                    onChange={(event) => updateItem(item.id, { categoryId: event.target.value })}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field__label" htmlFor={`${item.id}-width`}>
                    Breite (cm)
                  </label>
                  <input
                    id={`${item.id}-width`}
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={20}
                    max={300}
                    value={item.widthCm}
                    aria-invalid={Boolean(errors.widthCm)}
                    onChange={(event) => updateItem(item.id, { widthCm: event.target.value })}
                  />
                  {errors.widthCm && <p className="field__error">{errors.widthCm}</p>}
                </div>

                <div className="field">
                  <label className="field__label" htmlFor={`${item.id}-height`}>
                    Höhe (cm)
                  </label>
                  <input
                    id={`${item.id}-height`}
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={20}
                    max={300}
                    value={item.heightCm}
                    aria-invalid={Boolean(errors.heightCm)}
                    onChange={(event) => updateItem(item.id, { heightCm: event.target.value })}
                  />
                  {errors.heightCm && <p className="field__error">{errors.heightCm}</p>}
                </div>

                <div className="field">
                  <label className="field__label" htmlFor={`${item.id}-quantity`}>
                    Anzahl
                  </label>
                  <input
                    id={`${item.id}-quantity`}
                    className="input"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={50}
                    value={item.quantity}
                    aria-invalid={Boolean(errors.quantity)}
                    onChange={(event) => updateItem(item.id, { quantity: event.target.value })}
                  />
                  {errors.quantity && <p className="field__error">{errors.quantity}</p>}
                </div>

                <button
                  type="button"
                  className="request-row__remove"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  aria-label={`Element ${index + 1} entfernen`}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>

        <button type="button" className="btn btn--ghost request-add" onClick={addItem}>
          + Weiteres Element
        </button>
      </div>

      <div className="form-block">
        <div className="form-block__head">
          <h3>
            <span className="form-step" aria-hidden="true">
              2
            </span>
            Wohin dürfen wir die Offerte schicken?
          </h3>
          <p>Unverbindlich und kostenlos. Ihre Angaben nutzen wir ausschliesslich für diese Anfrage.</p>
        </div>

        <ContactFields
          customer={customer}
          errors={contactErrors}
          withAddress={false}
          notesLabel="Bemerkungen"
          notesHint="Zum Beispiel: Stockwerk, Fenstertyp oder gewünschte Farbe."
          onChange={(patch) => setCustomer((current) => ({ ...current, ...patch }))}
        />

        <label className="checkbox">
          <input type="checkbox" checked={wantsVisit} onChange={(event) => setWantsVisit(event.target.checked)} />
          <span>
            <strong>Bitte kommen Sie zum Ausmessen vorbei.</strong>
            <span className="checkbox__hint">
              Kostenlos und unverbindlich. Wir melden uns für einen Termin. Weil Sie den Besuch damit ausdrücklich
              selbst wünschen, gilt ein danach abgeschlossener Vertrag nicht als Haustürgeschäft – Sie können ihn
              trotzdem jederzeit vor der Produktion absagen.
            </span>
          </span>
        </label>
      </div>

      {state.status === 'error' && <p className="form-status form-status--error">{state.message}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn--lg" disabled={state.status === 'sending'}>
          {state.status === 'sending' ? 'Wird gesendet …' : 'Meine Offerte anfordern'}
        </button>
        <p className="form-actions__hint">
          Unverbindlich, keine Anzahlung. Antwort innert 24 Stunden an Werktagen – Sie entscheiden erst, wenn der
          Preis auf dem Tisch liegt.
        </p>
      </div>
    </form>
  )
}
