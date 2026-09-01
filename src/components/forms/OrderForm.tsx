import { useState } from 'react'
import type { CustomerDetails, SubmissionState } from '../../types'
import type { UseCart } from '../../hooks/useCart'
import { categoryById, sizeById } from '../../data/catalog'
import { formatChf, formatSize } from '../../lib/format'
import { priceForLine } from '../../lib/pricing'
import { ContactFields } from './ContactFields'
import { emptyCustomer, hasErrors, validateCustomer, type Errors } from '../../lib/validate'
import { isDemoMode, makeReference, submitToOperator } from '../../lib/submitOrder'
import './forms.css'
import './OrderForm.css'

interface OrderFormProps {
  cart: UseCart
  onBackToShop: () => void
}

export function OrderForm({ cart, onBackToShop }: OrderFormProps) {
  const [customer, setCustomer] = useState<CustomerDetails>({ ...emptyCustomer, zip: '8606', city: 'Greifensee' })
  const [errors, setErrors] = useState<Errors<CustomerDetails>>({})
  const [state, setState] = useState<SubmissionState>({ status: 'idle' })

  const { lines, totals, clear } = cart

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const nextErrors = validateCustomer(customer, true)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    const reference = makeReference('bestellung', Math.round(totals.totalChf * 100) + customer.email.length * 977)
    setState({ status: 'sending' })

    try {
      await submitToOperator({ kind: 'bestellung', customer, lines, reference })
      setState({ status: 'success', reference })
      clear()
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? `Die Bestellung konnte nicht übermittelt werden (${error.message}). Bitte versuchen Sie es nochmals – Ihr Warenkorb bleibt erhalten.`
            : 'Die Bestellung konnte nicht übermittelt werden. Bitte versuchen Sie es nochmals – Ihr Warenkorb bleibt erhalten.',
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
        <h3>Danke – Ihre Bestellung ist eingegangen.</h3>
        <p className="section__lead">
          Sie bekommen von uns eine Bestätigung per E-Mail. Bezahlt wird erst bei der Übergabe oder per Rechnung – im
          Webshop selbst wird nichts abgebucht.
        </p>
        <span className="confirmation__reference">Referenz {state.reference}</span>
        <ul className="confirmation__next">
          <li>Wir prüfen die Masse und melden uns, falls etwas unklar ist.</li>
          <li>Wir vereinbaren einen Termin für die Übergabe im Pfisterhölzli.</li>
          <li>Passt das Netz wider Erwarten nicht, tauschen wir es kostenlos aus.</li>
        </ul>
        <button type="button" className="btn btn--ghost" style={{ marginTop: 'var(--space-7)' }} onClick={onBackToShop}>
          Zurück zur Übersicht
        </button>
        {isDemoMode && (
          <p className="form-status form-status--note" style={{ marginTop: 'var(--space-6)' }}>
            Demo-Modus: Es wurde nichts verschickt. Die Bestellung steht in der Browser-Konsole.
          </p>
        )}
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="confirmation">
        <h3>Ihr Warenkorb ist leer.</h3>
        <p className="section__lead">Wählen Sie zuerst eine Grösse aus – oder fragen Sie ein Sondermass an.</p>
        <button type="button" className="btn" style={{ marginTop: 'var(--space-6)' }} onClick={onBackToShop}>
          Zu den Grössen
        </button>
      </div>
    )
  }

  return (
    <div className="checkout">
      <form className="checkout__form" onSubmit={handleSubmit} noValidate>
        <div className="form-block">
          <div className="form-block__head">
            <h3>
              <span className="form-step" aria-hidden="true">
                1
              </span>
              Ihre Angaben
            </h3>
            <p>Damit wir wissen, an welche Tür wir klopfen dürfen.</p>
          </div>

          <ContactFields
            customer={customer}
            errors={errors}
            withAddress
            notesLabel="Bemerkungen zur Lieferung"
            notesHint="Zum Beispiel: Stockwerk, Klingelname oder wann Sie am besten erreichbar sind."
            onChange={(patch) => setCustomer((current) => ({ ...current, ...patch }))}
          />
        </div>

        <div className="form-block">
          <div className="form-block__head">
            <h3>
              <span className="form-step" aria-hidden="true">
                2
              </span>
              Bezahlung
            </h3>
            <p>
              Sie zahlen erst, wenn die Netze bei Ihnen sind – bar bei der Übergabe oder per Rechnung mit TWINT. Es
              werden hier keine Kartendaten erfasst.
            </p>
          </div>
          <p className="form-status form-status--note">
            <span aria-hidden="true">🔒</span>
            <span>
              Ihre Angaben gehen direkt an uns und werden ausschliesslich für diese Bestellung verwendet. Keine
              Weitergabe an Dritte, kein Tracking.
            </span>
          </p>
        </div>

        {state.status === 'error' && <p className="form-status form-status--error">{state.message}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn--lg" disabled={state.status === 'sending'}>
            {state.status === 'sending' ? 'Wird gesendet …' : 'Bestellung abschicken'}
          </button>
          <button type="button" className="btn btn--quiet" onClick={onBackToShop}>
            Weiter einkaufen
          </button>
        </div>
      </form>

      <aside className="checkout__summary" aria-label="Bestellübersicht">
        <h3>Ihre Bestellung</h3>
        <ul>
          {lines.map((line) => {
            const category = categoryById(line.categoryId)
            const size = sizeById(line.sizeId)
            if (!category || !size) return null
            return (
              <li key={line.id}>
                <div>
                  <p className="checkout__item-title">
                    {line.quantity}× {category.shortName}
                  </p>
                  <p className="checkout__item-meta">
                    {size.label} · {formatSize(size.widthCm, size.heightCm)}
                  </p>
                </div>
                <span>{formatChf(priceForLine(line))}</span>
              </li>
            )
          })}
        </ul>

        <dl className="totals">
          <div>
            <dt>Zwischentotal</dt>
            <dd>{formatChf(totals.subtotalChf)}</dd>
          </div>
          {totals.discountChf > 0 && (
            <div className="totals__discount">
              <dt>{totals.discountLabel}</dt>
              <dd>−{formatChf(totals.discountChf)}</dd>
            </div>
          )}
          <div>
            <dt>Lieferung</dt>
            <dd>{totals.shippingChf === 0 ? 'kostenlos' : formatChf(totals.shippingChf)}</dd>
          </div>
          <div className="totals__grand">
            <dt>Total</dt>
            <dd>{formatChf(totals.totalChf)}</dd>
          </div>
        </dl>
        <p className="checkout__vat">Preise in CHF inkl. MwSt.</p>
      </aside>
    </div>
  )
}
