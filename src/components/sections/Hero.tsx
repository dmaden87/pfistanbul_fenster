import { WindowVisual } from './WindowVisual'
import { activeUeberbauung, priceRange } from '../../data/catalog'
import { shopConfig } from '../../data/shopConfig'
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
            Insektenschutz-Plissee nach Mass
          </p>

          <h1 className="hero__title">
            Fenster auf.
            <br />
            <span className="hero__title-accent">Mücken draussen.</span>
          </h1>

          <p className="hero__lead">
            Ein Netz, das in Falten in einer schmalen Schiene liegt: einmal montiert, bleibt es das ganze Jahr. Wir
            fertigen es auf Ihr Mass, kaufen direkt beim Hersteller und bündeln die Bestellungen – deshalb kostet es
            einen Bruchteil dessen, was ein Fachbetrieb verlangt. Wir liefern und montieren im ganzen{' '}
            {shopConfig.serviceArea}.
          </p>

          <div className="hero__actions">
            <button type="button" className="btn btn--lg" onClick={onShopClick}>
              Feste Grössen ansehen
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={onRequestClick}>
              Mein Fenster ausmessen
            </button>
          </div>

          {/*
            Im Pfisterhoelzli verteilen wir Flyer. Wer von dort kommt, soll die
            Siedlung sofort wiederfinden - ohne dass die ganze Seite so wirkt,
            als sei sie nur fuer diese eine Adresse gemacht.
          */}
          <p className="hero__local">
            <strong>Sie wohnen im {activeUeberbauung.shortName}?</strong> Ihre vier Fensterformate sind ausgemessen und
            haben feste Preise –{' '}
            <button type="button" className="link-inline" onClick={onShopClick}>
              direkt zum Sortiment
            </button>
            .
          </p>

          <ul className="hero__proof">
            <li>
              <strong>
                CHF {priceRange.minChf}–{priceRange.maxChf}
              </strong>
              <span>pro Fenster, Richtwert</span>
            </li>
            <li>
              <strong>Nach Mass</strong>
              <span>oder ab ausgemessenem Sortiment</span>
            </li>
            <li>
              <strong>Meist ohne Bohren</strong>
              <span>geklebt statt gedübelt</span>
            </li>
            <li>
              <strong>Das ganze Jahr</strong>
              <span>im Winter offen lassen statt abhängen</span>
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
