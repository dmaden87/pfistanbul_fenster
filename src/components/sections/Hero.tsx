import { WindowVisual } from './WindowVisual'
import { buildTypes, sizesOfKind } from '../../data/catalog'
import { lowestPriceFor } from '../../lib/pricing'
import { formatChf } from '../../lib/format'
import './Hero.css'

interface HeroProps {
  onShopClick: () => void
  onRequestClick: () => void
}

export function Hero({ onShopClick, onRequestClick }: HeroProps) {
  const cheapest = Math.min(
    ...buildTypes.map((build) =>
      lowestPriceFor(
        build.id,
        sizesOfKind(build.kind).map((size) => size.id),
      ),
    ),
  )

  return (
    <section className="hero" id="top">
      <div className="hero__glow" aria-hidden="true" />
      <div className="shell hero__inner">
        <div className="hero__copy">
          <p className="hero__eyebrow">
            <span className="hero__dot" aria-hidden="true" />
            Aus dem Pfisterhölzli, für das Pfisterhölzli
          </p>

          <h1 className="hero__title">
            Fenster auf.
            <br />
            <span className="hero__title-accent">Mücken draussen.</span>
          </h1>

          <p className="hero__lead">
            Insektenschutz für die gängigen Fensterformate in unserer Siedlung – ohne Konfigurator, ohne Wartezeit auf
            eine Offerte, ohne Handwerkerrechnung. Wohnung wählen, einmal nachmessen, bestellen.
          </p>

          <div className="hero__actions">
            <button type="button" className="btn btn--lg" onClick={onShopClick}>
              Grössen und Preise ansehen
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={onRequestClick}>
              Sondermass anfragen
            </button>
          </div>

          <ul className="hero__proof">
            <li>
              <strong>ab {formatChf(cheapest)}</strong>
              <span>pro Element</span>
            </li>
            <li>
              <strong>Lieferung gratis</strong>
              <span>im Pfisterhölzli</span>
            </li>
            <li>
              <strong>Ohne Bohren</strong>
              <span>mieterfreundlich</span>
            </li>
          </ul>
        </div>

        <div className="hero__visual">
          <WindowVisual />
        </div>
      </div>
    </section>
  )
}
