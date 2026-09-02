import { useState } from 'react'
import type { CustomerDetails, PaymentMethod, SubmissionState } from '../../types'
import type { UseCart } from '../../hooks/useCart'
import { netsInSet, setById, typeById } from '../../data/catalog'
import { formatChf, formatSize } from '../../lib/format'
import { priceForLine } from '../../lib/pricing'
import { priceNote, shopConfig } from '../../data/shopConfig'
import { ContactFields } from './ContactFields'
import { PreLaunchNotice } from './PreLaunchNotice'
import { emptyCustomer, hasErrors, validateCustomer, type Errors } from '../../lib/validate'
import { isDemoMode, makeReference, submitToOperator } from '../../lib/submitOrder'
import { startCheckout } from '../../lib/checkout'
import { blockerBadge, blockerHint, onlinePaymentBlocker } from '../../lib/payment'
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
  // Bei Übergabe bezahlen bleibt der vorgeschlagene Weg.
  const [payment, setPayment] = useState<PaymentMethod>('uebergabe')
  // Wunsch nach einer individuellen Zahlungslösung. Macht aus der Bestellung
  // eine Anfrage: Wir sagen erst zu, wenn wir miteinander gesprochen haben.
  const [flexiblePayment, setFlexiblePayment] = useState(false)

  const { lines, totals, montage, clear } = cart

  // Eine Stelle entscheidet, ob online bezahlt werden darf. `effectivePayment`
  // wird überall statt `payment` verwendet, damit eine gesperrte Option auch
  // dann nicht abgeschickt werden kann, wenn sie vorher einmal gewählt war.
  const onlineBlocker = onlinePaymentBlocker(lines, flexiblePayment)
  const effectivePayment: PaymentMethod = onlineBlocker === null ? payment : 'uebergabe'

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
      // Die Bestellung geht in jedem Fall zuerst an uns – auch wenn die
      // Onlinezahlung danach abgebrochen wird, ist sie damit nicht verloren.
      await submitToOperator({
        kind: 'bestellung',
        customer,
        lines,
        reference,
        montage,
        payment: effectivePayment,
        flexiblePayment,
      })

      if (effectivePayment === 'online') {
        const url = await startCheckout({ lines, montage, email: customer.email, reference })
        window.location.href = url
        return
      }

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
        <h3>{flexiblePayment ? 'Danke – Ihre Anfrage ist bei uns.' : 'Danke – Ihre Bestellung ist bei uns.'}</h3>
        <p className="section__lead">
          {flexiblePayment
            ? 'Wir melden uns persönlich bei Ihnen, um die Zahlung miteinander abzumachen. Bis dahin ist nichts verbindlich und es entstehen Ihnen keine Kosten.'
            : 'Bezahlt wird bei der Übergabe – im Webshop selbst wird nichts abgebucht.'}
        </p>
        <span className="confirmation__reference">Referenz {state.reference}</span>
        <PreLaunchNotice variant="bestaetigung" />
        <ul className="confirmation__next">
          {flexiblePayment ? (
            <>
              <li>Wir melden uns bei Ihnen – per Mail oder, wenn Sie eine Nummer angegeben haben, telefonisch.</li>
              <li>Gemeinsam finden wir eine Zahlungsart, die für Sie aufgeht. Zinslos, ohne Gebühren.</li>
              <li>Erst wenn das steht, bestätigen wir die Bestellung und produzieren.</li>
            </>
          ) : (
            <>
              <li>Wir prüfen die Masse und melden uns, falls etwas unklar ist.</li>
              <li>Wir bestätigen Ihnen den Liefertermin und melden uns, falls sich etwas verschiebt.</li>
              <li>
                Passt ein Netz wider Erwarten nicht, tauschen wir es kostenlos. Zusätzlich gilt unser freiwilliges
                Rückgaberecht von {shopConfig.returnDays} Tagen.
              </li>
            </>
          )}
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
                  <p>
                    {flexiblePayment
                      ? 'Sie schicken uns eine Anfrage – verbindlich wird nichts, bevor wir miteinander gesprochen haben.'
                      : 'Danach ist die Bestellung verbindlich. Korrigieren können Sie jetzt noch alles.'}
                  </p>
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

            <PreLaunchNotice variant="bestellung" payment={effectivePayment} />

            <div className="form-block">
              <div className="form-block__head">
                <h3>Bezahlung</h3>
                <p>
                  {shopConfig.onlinePayment && onlineBlocker === null
                    ? 'Sie können bei der Übergabe bezahlen oder gleich hier online. Beides führt zur selben Bestellung.'
                    : 'Sie zahlen bei der Übergabe – hier werden keine Zahlungsdaten erfasst.'}
                </p>
              </div>

              {shopConfig.onlinePayment ? (
                <div className="payment-choice" role="radiogroup" aria-label="Zahlungsart">
                  <label className={`payment-option${effectivePayment === 'uebergabe' ? ' payment-option--active' : ''}`}>
                    <input
                      type="radio"
                      name="zahlungsart"
                      value="uebergabe"
                      checked={effectivePayment === 'uebergabe'}
                      onChange={() => setPayment('uebergabe')}
                    />
                    <span>
                      <span className="payment-option__head">
                        <strong>Bei der Übergabe bezahlen</strong>
                        <span className="pill">Empfohlen</span>
                      </span>
                      <span className="payment-option__hint">
                        Bar oder mit TWINT, wenn die Netze bei Ihnen sind. Keine Anzahlung, keine Kartendaten – und Sie
                        sehen die Ware, bevor Sie zahlen.
                      </span>
                    </span>
                  </label>

                  <label
                    className={`payment-option${effectivePayment === 'online' ? ' payment-option--active' : ''}${
                      onlineBlocker ? ' payment-option--disabled' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="zahlungsart"
                      value="online"
                      checked={effectivePayment === 'online'}
                      disabled={onlineBlocker !== null}
                      onChange={() => setPayment('online')}
                    />
                    <span>
                      <span className="payment-option__head">
                        <strong>Jetzt online bezahlen</strong>
                        {onlineBlocker && <span className="pill pill--neutral">{blockerBadge(onlineBlocker)}</span>}
                      </span>
                      <span className="payment-option__hint">
                        {onlineBlocker
                          ? blockerHint(onlineBlocker)
                          : 'Sie werden zu Stripe weitergeleitet und zahlen dort mit Karte. Wir sehen Ihre Kartendaten nie. Danach kommen Sie automatisch hierher zurück.'}
                      </span>
                    </span>
                  </label>
                </div>
              ) : (
                <p className="form-status form-status--note">
                  <span aria-hidden="true">🔒</span>
                  <span>
                    Sie zahlen bei der Übergabe, in bar oder mit TWINT. Keine Anzahlung, keine Vorauszahlung – und hier
                    werden keine Kartendaten erfasst.
                  </span>
                </p>
              )}

              {shopConfig.flexiblePayment && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={flexiblePayment}
                    onChange={(event) => setFlexiblePayment(event.target.checked)}
                  />
                  <span>
                    <strong>Ich würde gerne eine individuelle Zahlungslösung finden.</strong>
                    <span className="checkbox__hint">
                      Zum Beispiel in Raten oder zu einem späteren Zeitpunkt. Wir schauen das gemeinsam an – zinslos und
                      ohne Gebühren. Sie schicken uns damit eine Anfrage statt einer verbindlichen Bestellung: Wir
                      melden uns persönlich, und erst wenn wir uns einig sind, produzieren wir.
                    </span>
                  </span>
                </label>
              )}

              <p className="form-status form-status--note payment-privacy">
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
                {state.status === 'sending'
                  ? effectivePayment === 'online'
                    ? 'Weiterleitung zu Stripe …'
                    : 'Wird gesendet …'
                  : flexiblePayment
                    ? 'Bestellung anfragen'
                    : effectivePayment === 'online'
                      ? 'Bestellen und bezahlen'
                      : shopConfig.operational
                        ? 'Jetzt verbindlich bestellen'
                        : 'Bestellung absenden'}
              </button>
              <p className="form-actions__hint">
                {flexiblePayment
                  ? 'Unverbindlich: Wir melden uns bei Ihnen und machen die Zahlung miteinander ab, bevor irgendetwas produziert wird.'
                  : effectivePayment === 'online'
                    ? 'Sie werden zu Stripe weitergeleitet. Ihre Bestellung ist bereits bei uns, auch wenn Sie dort abbrechen.'
                    : shopConfig.operational
                      ? 'Sie erhalten anschliessend eine Bestätigung per E-Mail, mit dem Liefertermin.'
                      : 'Wir melden uns in den nächsten Tagen persönlich bei Ihnen.'}
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
        {totals.savingsChf > 0 && (
          <p className="totals__saving-note">
            Im Set-Preis sind {formatChf(totals.savingsChf)} gegenüber den Einzelpreisen bereits abgezogen.
          </p>
        )}

        <p className="checkout__vat">{priceNote}</p>
      </aside>
    </div>
  )
}
