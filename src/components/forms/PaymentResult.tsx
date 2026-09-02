import { shopConfig } from '../../data/shopConfig'
import { PreLaunchNotice } from './PreLaunchNotice'
import './forms.css'

interface PaymentResultProps {
  status: 'ok' | 'abbruch'
  reference: string
  onBackToShop: () => void
  onBackToCheckout: () => void
}

/** Was der Kunde sieht, wenn er von Stripe zurückkommt. */
export function PaymentResult({ status, reference, onBackToShop, onBackToCheckout }: PaymentResultProps) {
  if (status === 'ok') {
    return (
      <div className="confirmation">
        <div className="confirmation__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </div>
        <h3>Zahlung eingegangen – vielen Dank.</h3>
        <p className="section__lead">
          Ihre Bestellung ist bei uns, die Zahlung ist bestätigt. Die Quittung schickt Ihnen Stripe direkt per E-Mail.
        </p>
        {reference && <span className="confirmation__reference">Referenz {reference}</span>}
        <PreLaunchNotice variant="bestaetigung" />
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
      </div>
    )
  }

  return (
    <div className="confirmation">
      <h3>Zahlung abgebrochen.</h3>
      <p className="section__lead">
        Es wurde nichts belastet. Ihre Bestellung ist trotzdem bei uns – wir melden uns in den nächsten Tagen und Sie
        können dann bei der Übergabe bezahlen. Wenn Sie es lieber nochmals online versuchen möchten, geht das hier.
      </p>
      <div className="form-actions" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn" onClick={onBackToCheckout}>
          Nochmals zur Bestellung
        </button>
        <button type="button" className="btn btn--quiet" onClick={onBackToShop}>
          Zurück zur Übersicht
        </button>
      </div>
    </div>
  )
}
