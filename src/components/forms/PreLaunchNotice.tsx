import type { PaymentMethod } from '../../types'
import { shopConfig } from '../../data/shopConfig'
import './PreLaunchNotice.css'

interface PreLaunchNoticeProps {
  /** "bestellung" steht vor dem Absenden, "bestaetigung" danach. */
  variant: 'bestellung' | 'anfrage' | 'bestaetigung'
  /** Bei Onlinezahlung stimmt "es entstehen keine Kosten" nicht mehr. */
  payment?: PaymentMethod
}

/**
 * Deutlicher Hinweis, solange shopConfig.operational auf false steht: Wir
 * nehmen die Bestellung entgegen, sind aber noch im Aufbau und melden uns
 * persönlich. Verschwindet vollständig, sobald der Schalter umgelegt wird.
 */
export function PreLaunchNotice({ variant, payment = 'uebergabe' }: PreLaunchNoticeProps) {
  if (shopConfig.operational) return null

  return (
    <aside className="prelaunch" role="note">
      <span className="prelaunch__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5v5.5" />
          <path d="M12 16.4v.2" />
        </svg>
      </span>

      <div>
        <p className="prelaunch__title">Wir sind noch im Aufbau.</p>
        {variant === 'bestaetigung' ? (
          <p>
            Weil wir noch nicht im Normalbetrieb sind, läuft nichts automatisch: Wir schauen uns Ihre Bestellung
            persönlich an und melden uns in den nächsten Tagen bei Ihnen – mit der Bestätigung und einem Termin.
            Verbindlich ist erst, was wir miteinander abgemacht haben.
          </p>
        ) : payment === 'online' ? (
          <p>
            Ihre Bestellung nehmen wir trotzdem gerne entgegen. Wir melden uns in den nächsten Tagen persönlich bei
            Ihnen, bestätigen alles und sagen Ihnen, wann wir liefern können. Sollten wir wider Erwarten nicht liefern
            können, erstatten wir den bezahlten Betrag vollständig zurück.
          </p>
        ) : (
          <p>
            {variant === 'bestellung' ? 'Ihre Bestellung' : 'Ihre Anfrage'} nehmen wir trotzdem gerne entgegen. Wir
            melden uns in den nächsten Tagen persönlich bei Ihnen, bestätigen alles und sagen Ihnen, wann wir liefern
            können. Bis dahin entstehen Ihnen keine Kosten und Sie gehen keine Verpflichtung ein.
          </p>
        )}
      </div>
    </aside>
  )
}
