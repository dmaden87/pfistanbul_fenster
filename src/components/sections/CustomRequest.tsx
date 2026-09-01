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
            Sagen Sie uns, wie viele Elemente Sie brauchen und wie gross sie sein sollen. Sie bekommen eine feste
            Offerte – ohne Vorauszahlung und ohne Verpflichtung.
          </p>
        </div>

        <CustomRequestForm />
      </div>
    </section>
  )
}
