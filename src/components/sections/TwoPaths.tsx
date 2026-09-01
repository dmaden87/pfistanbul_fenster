import { buildTypes, sizesOfKind } from '../../data/catalog'
import { customPrice, lowestPriceFor } from '../../lib/pricing'
import { formatChf } from '../../lib/format'
import './TwoPaths.css'

interface TwoPathsProps {
  onStandardClick: () => void
  onCustomClick: () => void
}

export function TwoPaths({ onStandardClick, onCustomClick }: TwoPathsProps) {
  const cheapest = Math.min(
    ...buildTypes.map((build) =>
      lowestPriceFor(
        build.id,
        sizesOfKind(build.kind).map((size) => size.id),
      ),
    ),
  )
  // Preisanker für den Anfrageweg, sonst wird er als teurer Sonderfall gelesen.
  const cheapestCustom = customPrice(60, 40, 'spannrahmen', 'standard')

  return (
    <section className="section two-paths" id="wege">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Zwei Wege zum Netz</span>
          <h2>Wohnen Sie im Pfisterhölzli – oder woanders?</h2>
          <p className="section__lead">
            Davon hängt ab, ob Sie direkt bestellen können oder eine Offerte bekommen. Beides geht heute noch.
          </p>
        </div>

        <div className="two-paths__grid">
          <article className="path path--primary">
            <span className="pill">Sofort bestellbar</span>
            <h3>Mein Fenster hat ein gängiges Format</h3>
            <p>
              Dann geht es direkt: Wählen Sie Ihren Wohnungstyp, wir legen die üblichen Grössen in den Warenkorb.
              Fester Preis, keine Wartezeit auf eine Offerte.
            </p>
            <ul className="path__list">
              <li>Preis sofort sichtbar, ab {formatChf(cheapest)}</li>
              <li>Lieferung gratis an die Wohnungstür</li>
              <li>Passgarantie: passt es nicht, tauschen wir</li>
            </ul>
            <button type="button" className="btn btn--lg" onClick={onStandardClick}>
              Wohnungstyp wählen
            </button>
          </article>

          <article className="path">
            <span className="pill pill--neutral">Offerte innert 24 Stunden</span>
            <h3>Ich brauche ein Sondermass</h3>
            <p>
              Attikafenster, Balkonverglasung, eine Wohnung ausserhalb der Siedlung oder einfach ein Fenster, das aus
              der Reihe fällt: Sagen Sie uns Anzahl und Masse, wir rechnen es durch.
            </p>
            <ul className="path__list">
              <li>Sonderanfertigung ab {formatChf(cheapestCustom)} pro Element</li>
              <li>Wir messen auf Wunsch kostenlos nach</li>
              <li>Unverbindlich, keine Anzahlung</li>
            </ul>
            <button type="button" className="btn btn--ghost btn--lg" onClick={onCustomClick}>
              Offerte anfordern
            </button>
          </article>
        </div>
      </div>
    </section>
  )
}
