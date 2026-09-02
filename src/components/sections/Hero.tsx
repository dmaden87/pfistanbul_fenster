import { Foto } from '../media/Foto'
import { priceRange } from '../../data/catalog'
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
            fertigen es auf Ihr Mass, kaufen direkt beim Hersteller und bündeln die Bestellungen der Nachbarschaft –
            deshalb kostet es einen Bruchteil dessen, was ein Fachbetrieb verlangt.
          </p>

          <div className="hero__actions">
            <button type="button" className="btn btn--lg" onClick={onShopClick}>
              Sortiment Pfisterhölzli
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={onRequestClick}>
              Mein Fenster ausmessen
            </button>
          </div>

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
              <strong>Ohne Bohren</strong>
              <span>mieterfreundlich</span>
            </li>
          </ul>
        </div>

        <figure className="hero__visual">
          {/*
            Bis hierher stand eine CSS-Nachbildung eines Fensters, weil noch
            kein Produktfoto existierte. Jetzt gibt es eines – aufgenommen in
            einer Wohnung im Pfisterhölzli, mit genau dem Netz, das wir
            verkaufen. Ein echtes Bild belegt, was die Seite verspricht;
            eine Zeichnung behauptet es nur.
          */}
          <Foto
            name="fenster-geschlossen"
            alt="Wohnungsfenster im Pfisterhölzli mit geschlossenem Insektenschutz-Plissee. Durch das feine Gewebe sind Baumkrone, Wiese und Hügel klar zu erkennen."
            sizes="(max-width: 60rem) min(22rem, 90vw), min(26rem, 40vw)"
            className="hero__photo"
            sofort
          />
          <figcaption className="hero__caption">
            Denizʼ eigenes Fenster im Pfisterhölzli, Netz zugezogen. Die Aussicht bleibt.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
