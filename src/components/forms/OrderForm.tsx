import { useState } from 'react'
import type { CustomerDetails, SubmissionState } from '../../types'
import type { UseCart } from '../../hooks/useCart'
import { netsInSet, setById, typeById } from '../../data/catalog'
import { formatChf, formatSize } from '../../lib/format'
import { priceForLine } from '../../lib/pricing'
import { priceNote, shopConfig } from '../../data/shopConfig'
import { ContactFields } from './ContactFields'
import { emptyCustomer, hasErrors, validateCustomer, type Errors } from '../../lib/validate'
import { isDemoMode, makeReference, submitToOperator } from '../../lib/submitOrder'
import './forms.css'
import './OrderForm.css'

interface OrderFormProps {
  cart: UseCart
  onBackToShop: () => void
}

/**
 * Die vier Schritte werden sichtbar angezeigt und der letzte Schritt ist eine
 * Prüfseite mit Korrekturmöglichkeit. Beides verlangt Art. 3 Abs. 1 lit. s UWG
 * für Schweizer Onlineshops (Hinweis auf die technischen Schritte, technische
 * Mittel zur Fehlerkorrektur vor Abgabe der Bestellung).
 */
const STEPS = ['Netze wählen', 'Warenkorb', 'Adresse', 'Prüfen & bestellen'] as const

export function OrderForm({ cart, onBackToShop }: OrderFormProps) {
  const [customer, setCustomer] = useState<CustomerDetails>({ ...emptyCustomer, zip: '8606', city: 'Greifensee' })
  const [errors, setErrors] = useState<Errors<CustomerDetails>>({})
  const [state, setState] = useState<SubmissionState>({ status: 'idle' })
  const [step, setStep] = useState<'adresse' | 'pruefen'>('adresse')

  const { lines, totals, montage, clear } = cart

  const handleContinue = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors = validateCustomer(customer, true)
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return
    setStep('pruefen')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async () => {
    const reference = makeReference('bestellung', Math.round(totals.totalChf * 100) + customer.email.length * 977)
    setState({ status: 'sending' })

    try {
      await submitToOperator({ kind: 'bestellung', customer, lines, reference, montage })
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
          <li>Wir bestätigen Ihnen den Liefertermin und melden uns, falls sich etwas verschiebt.</li>
          <li>
            Passt ein Netz wider Erwarten nicht, tauschen wir es kostenlos. Zusätzlich gilt unser freiwilliges
            Rückgaberecht von {shopConfig.returnDays} Tagen.
          </li>
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

  const activeIndex = step === 'adresse' ? 2 : 3

  return (
    <div className="checkout">
      <div className="checkout__form">
        <ol className="checkout-steps" aria-label="Schritte bis zur Bestellung">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={
                index < activeIndex ? 'is-done' : index === activeIndex ? 'is-current' : undefined
              }
              aria-current={index === activeIndex ? 'step' : undefined}
            >
              <span className="checkout-steps__marker" aria-hidden="true">
                {index < activeIndex ? '✓' : index + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>

        {step === 'adresse' ? (
          <form onSubmit={handleContinue} noValidate>
            <div className="form-block">
              <div className="form-block__head">
                <h3>Ihre Angaben</h3>
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

            <div className="form-actions">
              <button type="submit" className="btn btn--lg">
                Weiter zur Prüfung
              </button>
              <button type="button" className="btn btn--quiet" onClick={onBackToShop}>
                Weiter einkaufen
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="form-block">
              <div className="form-block__head form-block__head--row">
                <div>
                  <h3>Bitte prüfen Sie Ihre Angaben</h3>
                  <p>Danach ist die Bestellung verbindlich. Korrigieren können Sie jetzt noch alles.</p>
                </div>
                <button type="button" className="btn btn--ghost" onClick={() => setStep('adresse')}>
                  Ändern
                </button>
              </div>

              <dl className="review">
                <div>
                  <dt>Name</dt>
                  <dd>{customer.name}</dd>
                </div>
                <div>
                  <dt>E-Mail</dt>
                  <dd>{customer.email}</dd>
                </div>
                {customer.phone && (
                  <div>
                    <dt>Telefon</dt>
                    <dd>{customer.phone}</dd>
                  </div>
                )}
                <div>
                  <dt>Lieferadresse</dt>
                  <dd>
                    {customer.street}
                    <br />
                    {customer.zip} {customer.city}
                  </dd>
                </div>
                {customer.notes && (
                  <div>
                    <dt>Bemerkungen</dt>
                    <dd>{customer.notes}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="form-block">
              <div className="form-block__head form-block__head--row">
                <div>
                  <h3>Ihre Positionen</h3>
                  <p>Menge oder Grösse ändern Sie im Warenkorb.</p>
                </div>
                <button type="button" className="btn btn--ghost" onClick={onBackToShop}>
                  Warenkorb ändern
                </button>
              </div>

              <ul className="review-lines">
                {lines.map((line) => {
                  const set = line.kind === 'set' ? setById(line.refId) : undefined
                  const type = line.kind === 'einzel' ? typeById(line.refId) : undefined
                  const title = set?.label ?? type?.label
                  if (!title) return null
                  const detail = set
                    ? `${netsInSet(set)} Netze`
                    : type
                      ? formatSize(type.widthCm, type.heightCm)
                      : ''
                  return (
                    <li key={line.id}>
                      <span>
                        {line.quantity}× {title} ({detail})
                      </span>
                      <span>{formatChf(priceForLine(line))}</span>
                    </li>
                  )
                })}
                <li>
                  <span>Montage durch uns</span>
                  <span>{montage ? formatChf(totals.montageChf) : 'nein, Selbstmontage'}</span>
                </li>
              </ul>
            </div>

            <div className="form-block">
              <div className="form-block__head">
                <h3>Bezahlung</h3>
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
              <button type="button" className="btn btn--lg" onClick={handleSubmit} disabled={state.status === 'sending'}>
                {state.status === 'sending' ? 'Wird gesendet …' : 'Jetzt verbindlich bestellen'}
              </button>
              <p className="form-actions__hint">
                Sie erhalten anschliessend eine Bestätigung per E-Mail, mit dem Liefertermin.
              </p>
            </div>
          </>
        )}
      </div>

      <aside className="checkout__summary" aria-label="Bestellübersicht">
        <h3>Ihre Bestellung</h3>
        <ul>
          {lines.map((line) => {
            const set = line.kind === 'set' ? setById(line.refId) : undefined
            const type = line.kind === 'einzel' ? typeById(line.refId) : undefined
            const title = set?.label ?? type?.label
            if (!title) return null
            const meta = set
              ? `${netsInSet(set)} Netze im Set`
              : type
                ? `${formatSize(type.widthCm, type.heightCm)} · ${type.room}`
                : ''
            return (
              <li key={line.id}>
                <div>
                  <p className="checkout__item-title">
                    {line.quantity}× {title}
                  </p>
                  <p className="checkout__item-meta">{meta}</p>
                </div>
                <span>{formatChf(priceForLine(line))}</span>
              </li>
            )
          })}
        </ul>

        <dl className="totals">
          <div>
            <dt>Netze ({totals.netCount})</dt>
            <dd>{formatChf(totals.netsChf)}</dd>
          </div>
          {totals.savingsChf > 0 && (
            <div className="totals__discount">
              <dt>Im Set gespart</dt>
              <dd>−{formatChf(totals.savingsChf)}</dd>
            </div>
          )}
          {montage && (
            <div>
              <dt>Montage</dt>
              <dd>{formatChf(totals.montageChf)}</dd>
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
        <p className="checkout__vat">{priceNote}</p>
      </aside>
    </div>
  )
}
