import { WindowVisual } from './WindowVisual'
import './Hero.css'

interface HeroProps {
  onShopClick: () => void
  onRequestClick: () => void
}

export function Hero({ onShopClick, onRequestClick }: HeroProps) {
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
            Insektenschutz, der zu den Fenstern in unserer Siedlung passt – ohne Ausmessen, ohne Wartezeit, ohne
            Handwerkerrechnung. Grösse anklicken, bestellen, in ein paar Tagen hängt es.
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
              <strong>ab CHF 29</strong>
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
