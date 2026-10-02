import { WindowVisual } from './WindowVisual'
import { priceRange } from '../../data/catalog'
import './Hero.css'

interface HeroProps {
  onRequestClick: () => void
  onSiedlungenClick: () => void
}

/*
 * DER ERSTE KNOPF IST JETZT DAS AUSMESSEN. Vorher stand dort der
 * Siedlungs-Shop: gefuellt, zuoberst, als waere das der Normalfall. Die
 * Anfragen kommen aber ueberwiegend von Fenstern, die niemand ausgemessen
 * hat. Das Siedlungsangebot steht daneben und fuehrt auf seine eigene Seite.
 */
export function Hero({ onRequestClick, onSiedlungenClick }: HeroProps) {

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

          {/*
            KURZ GEHALTEN, und das ist eine Mobilentscheidung. Hier standen
            vier Saetze; davon sagten zwei dasselbe wie der Abschnitt
            "Vorteile" eine Bildschirmhoehe weiter unten - direkt beim
            Hersteller gekauft, Bestellungen gebuendelt, Bruchteil des
            Fachbetriebs. Auf dem Handy schob dieser Text den Knopf und den
            Preis aus dem ersten Bildschirm. Die Begruendung ist nicht weg,
            sie steht dort, wo sie hingehoert.
          */}
          <p className="hero__lead">
            Ein Netz, das in Falten in einer schmalen Schiene liegt: einmal montiert, bleibt es das ganze Jahr. Wir
            fertigen es auf Ihr Mass – von Freunden und Nachbarn für Freunde und Nachbarn.
          </p>

          {/*
            EIN KNOPF, NICHT ZWEI. Hier standen zwei gleich breite Knoepfe
            nebeneinander - auf dem Handy untereinander, beide ueber die volle
            Breite. Das las sich als zwei gleichwertige Wege, und genau diese
            Ordnung haben wir abgeraeumt: Die Siedlung ist das Nebenangebot.
            Ausserdem schob der zweite Knopf den Preisbeleg aus dem ersten
            Bildschirm.

            Der Weg zur Siedlung bleibt - als Zeile statt als Knopf. Wer einen
            Flyer im Briefkasten hatte, sucht danach und findet eine Zeile
            genauso; wer nicht danach sucht, wird nicht mehr gefragt.
          */}
          <div className="hero__actions">
            <button type="button" className="btn btn--lg btn--stacked" onClick={onRequestClick}>
              <span className="btn__kicker">Masse eingeben, Preis sehen</span>
              <span>Mein Fenster ausrechnen</span>
            </button>
          </div>

          <p className="hero__nebenweg">
            <button type="button" className="btn btn--quiet" onClick={onSiedlungenClick}>
              Wohnen Sie in einer ausgemessenen Siedlung?
            </button>
          </p>

          <ul className="hero__proof">
            <li>
              <strong className="hero__preis">
                CHF {priceRange.minChf}–{priceRange.maxChf}
              </strong>
              <span>pro Fenster, Richtwert</span>
            </li>
            <li>
              <strong>Jedes Fenster</strong>
              <span>nach Mass gefertigt, kein Standardraster</span>
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
