import { PaymentHelpForm } from '../forms/PaymentHelpForm'
import { shopConfig } from '../../data/shopConfig'
import './PaymentHelp.css'

/**
 * Zahlung nach Absprache. Kein automatisierter Ratenkauf, sondern ein
 * Gespräch unter Nachbarn – deshalb steht hier nirgends eine Zusage, ein Zins
 * oder ein Plan mit festen Raten. Es geht um die Einladung, sich zu melden.
 */
export function PaymentHelp() {
  if (!shopConfig.flexiblePayment) return null

  return (
    <section className="section payment-help" id="zahlung">
      <div className="shell payment-help__inner">
        <div className="payment-help__copy">
          <span className="section__eyebrow">Zahlung nach Absprache</span>
          <h2>Am Geld soll es nicht scheitern.</h2>
          <p className="section__lead">
            Nicht bei allen sitzt es gerade gleich locker – und ein Sommer ohne Mücken sollte nicht davon abhängen,
            welche Woche im Monat gerade ist. Wenn Ihnen der Betrag auf einmal zu viel ist, sagen Sie es uns einfach.
          </p>

          <ul className="payment-help__points">
            <li>
              <strong>In Raten, oder später.</strong> Was für Sie aufgeht, machen wir miteinander ab – schriftlich, in
              zwei Sätzen, damit beide wissen, woran sie sind.
            </li>
            <li>
              <strong>Zinslos und ohne Gebühren.</strong> Sie zahlen am Ende denselben Preis wie alle anderen. Wir
              verdienen nichts daran, dass Sie später zahlen.
            </li>
            <li>
              <strong>Keine Bank, keine Prüfung.</strong> Es gibt kein Kreditformular und keine Abklärung über Sie. Wir
              schauen einander an und finden eine Lösung.
            </li>
            <li>
              <strong>Es bleibt unter uns.</strong> Ihre Anfrage landet bei uns zweien, sonst nirgends. Niemand in der
              Siedlung erfährt davon.
            </li>
          </ul>
        </div>

        <div className="payment-help__panel">
          <h3>Melden Sie sich einfach.</h3>
          <p className="payment-help__panel-lead">
            Schreiben Sie uns kurz – Sie müssen weder einen Grund angeben noch schon wissen, welche Netze Sie wollen.
          </p>
          <PaymentHelpForm />
        </div>
      </div>
    </section>
  )
}
