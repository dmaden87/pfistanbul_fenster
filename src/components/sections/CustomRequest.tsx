import { CustomRequestForm } from '../forms/CustomRequestForm'
import './CustomRequest.css'

export function CustomRequest() {
  return (
    <section className="section custom-request-section" id="anfrage">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Sonderanfertigung</span>
          <h2>Kein Standardmass? Dann rechnen wir es Ihnen aus.</h2>
          <p className="section__lead">
            Sagen Sie uns, wie viele Netze Sie brauchen und wie gross sie sein sollen. Wir rechnen sie in der nächsten
            Sammelbestellung mit und schicken Ihnen eine feste Offerte – ohne Vorauszahlung, ohne Verpflichtung.
          </p>
        </div>

        <CustomRequestForm />
      </div>
    </section>
  )
}
