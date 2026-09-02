import { useState } from 'react'
import type { CustomerDetails, SubmissionState } from '../../types'
import { ContactFields } from './ContactFields'
import { PreLaunchNotice } from './PreLaunchNotice'
import { emptyCustomer, hasErrors, validateCustomer, type Errors } from '../../lib/validate'
import { isDemoMode, makeReference, submitToOperator } from '../../lib/submitOrder'
import './forms.css'

/**
 * Kurzes Kontaktformular für alle, die über die Zahlung sprechen möchten.
 * Bewusst ohne Warenkorb, ohne Betrag und ohne Adresse: Wer sich hier meldet,
 * hat vielleicht noch gar nichts ausgesucht und soll nicht mehr preisgeben
 * müssen, als für einen Rückruf nötig ist.
 */
export function PaymentHelpForm() {
  const [customer, setCustomer] = useState<CustomerDetails>(emptyCustomer)
  const [errors, setErrors] = useState<Errors<CustomerDetails>>({})
  const [state, setState] = useState<SubmissionState>({ status: 'idle' })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const nextErrors = validateCustomer(customer, false)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    const reference = makeReference('zahlung', customer.email.length * 6791 + customer.name.length * 97)
    setState({ status: 'sending' })

    try {
      await submitToOperator({ kind: 'zahlung', customer, reference })
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
      <div className="confirmation confirmation--compact">
        <div className="confirmation__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h3>Danke, wir melden uns.</h3>
        <p className="section__lead">
          Das bleibt unter uns. Wir schauen gemeinsam an, was für Sie aufgeht – ohne Zinsen, ohne Gebühren und ohne
          dass Sie sich zu etwas verpflichten.
        </p>
        <span className="confirmation__reference">Referenz {state.reference}</span>
        <PreLaunchNotice variant="anfrage" />
        {isDemoMode && (
          <p className="form-status form-status--note" style={{ marginTop: 'var(--space-6)' }}>
            Demo-Modus: Es wurde nichts verschickt. Die Anfrage steht in der Browser-Konsole.
          </p>
        )}
      </div>
    )
  }

  return (
    <form className="payment-help__form" onSubmit={handleSubmit} noValidate>
      <ContactFields
        customer={customer}
        errors={errors}
        withAddress={false}
        idPrefix="zh"
        phoneHint="Wenn Sie lieber telefonieren als schreiben."
        notesLabel="Was schwebt Ihnen vor?"
        notesHint="Zum Beispiel: in drei Raten, oder erst nach dem Zahltag. Sie müssen sich nicht erklären."
        onChange={(patch) => setCustomer((current) => ({ ...current, ...patch }))}
      />

      {state.status === 'error' && <p className="form-status form-status--error">{state.message}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn--lg" disabled={state.status === 'sending'}>
          {state.status === 'sending' ? 'Wird gesendet …' : 'Unverbindlich anfragen'}
        </button>
        <p className="form-actions__hint">
          Kein Formular an eine Bank, keine Bonitätsprüfung, kein Eintrag irgendwo. Es liest jemand aus der Siedlung.
        </p>
      </div>
    </form>
  )
}
