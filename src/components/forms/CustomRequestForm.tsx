import { useState } from 'react'
import type { CustomRequestLine, CustomerDetails, SubmissionState } from '../../types'
import { ContactFields } from './ContactFields'
import { PreLaunchNotice } from './PreLaunchNotice'
import { emptyCustomer, hasErrors, validateCustomLines, validateCustomer, type Errors } from '../../lib/validate'
import { isDemoMode, makeReference, submitToOperator } from '../../lib/submitOrder'
import { estimateCustomRequest } from '../../lib/estimate'
import { formatChf, formatSize } from '../../lib/format'
import './forms.css'

function newLine(index: number): CustomRequestLine {
  return {
    id: `custom-${index}`,
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

  // Richtpreis, sobald ein Element vollstaendig dasteht. Bewusst waehrend des
  // Tippens und nicht erst beim Absenden: Der Punkt der Uebung ist, dass man
  // nicht erst eine Anfrage stellen muss, um eine Hausnummer zu kennen.
  const estimate = estimateCustomRequest(items)

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
        <PreLaunchNotice variant="bestaetigung" />
        <ul className="confirmation__next">
          <li>Sie erhalten eine Offerte mit Preis und Liefertermin.</li>
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
            Breite und Höhe der Fensteröffnung in Zentimetern. Messen Sie an drei Stellen und nehmen Sie den kleinsten
            Wert. Wenn Sie unsicher sind: Wir messen vor Ort nach, bevor produziert wird.
          </p>
        </div>

        <ul className="request-rows">
          {items.map((item, index) => {
            const errors = lineErrors[item.id] ?? {}
            return (
              <li className="request-row" key={item.id}>
                <span className="request-row__index">Element {index + 1}</span>

                <div className="field">
                  <label className="field__label" htmlFor={`${item.id}-room`}>
                    Wo? <span className="field__optional">optional</span>
                  </label>
                  <input
                    id={`${item.id}-room`}
                    className="input"
                    type="text"
                    placeholder="z. B. Estrich"
                    value={item.room}
                    onChange={(event) => updateItem(item.id, { room: event.target.value })}
                  />
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

        {estimate && (
          <aside className="estimate" aria-live="polite">
            <div className="estimate__head">
              <div>
                <p className="estimate__label">Richtpreis, geschätzt</p>
                <p className="estimate__value">ca. {formatChf(estimate.totalChf)}</p>
              </div>
              <p className="estimate__count">
                {estimate.netCount} {estimate.netCount === 1 ? 'Netz' : 'Netze'}
              </p>
            </div>

            {estimate.lines.length > 1 && (
              <ul className="estimate__lines">
                {estimate.lines.map((line) => (
                  <li key={line.id}>
                    <span>
                      {line.quantity}× {formatSize(line.widthCm, line.heightCm)}
                    </span>
                    <span className="estimate__per">à ca. {formatChf(line.perNetChf)}</span>
                    <span className="estimate__sum">{formatChf(line.totalChf)}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="estimate__note">
              <strong>Das ist eine Schätzung, keine Offerte.</strong> Wir rechnen sie aus den Preisen unseres
              ausgemessenen Sortiments hoch – Sockelbetrag pro Netz plus Gewebefläche, mit einem Zuschlag für
              Unsicherheit. Den verbindlichen Preis nennen wir Ihnen, nachdem wir Ihre Masse angeschaut haben; er liegt
              erfahrungsgemäss eher darunter. Lieferung im Pfisterhölzli ist enthalten, Montage nicht.
            </p>

            {estimate.pendingCount > 0 && (
              <p className="estimate__flag">
                {estimate.pendingCount === 1
                  ? 'Ein Element ist noch nicht vollständig ausgefüllt und fehlt in dieser Summe.'
                  : `${estimate.pendingCount} Elemente sind noch nicht vollständig ausgefüllt und fehlen in dieser Summe.`}
              </p>
            )}

            {estimate.anyOversized && (
              <p className="estimate__flag">
                Ein Element ist grösser als alles, was wir bisher ausgemessen haben. Dort ist die Schätzung ungenauer –
                wir schauen es uns persönlich an.
              </p>
            )}
          </aside>
        )}
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

      <PreLaunchNotice variant="anfrage" />

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
