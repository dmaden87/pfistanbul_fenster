import { Foto } from '../media/Foto'
import { construction } from '../../data/catalog'
import './Construction.css'

/**
 * Wie das Netz gebaut ist und wie es ans Fenster kommt. Auf Produktebene,
 * gilt für jede Überbauung gleich.
 */
export function Construction() {
  return (
    <section className="section construction" id="aufbau">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">So ist es gebaut</span>
          <h2>Drei Teile, keine Überraschungen.</h2>
          <p className="section__lead">
            Rahmen, Befestigung, Gewebe – mehr ist es nicht. Bei jedem Teil sagen wir auch, was es nicht kann; das
            erspart beiden Seiten die Enttäuschung nach der Lieferung.
          </p>
        </div>

        <div className="build-grid">
          {construction.map((part, index) => (
            <article className={`build-card build-card--${part.id}`} key={part.id}>
              <span className="build-card__step" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3>{part.name}</h3>
              <p className="build-card__text">{part.description}</p>
              <dl>
                <div>
                  <dt>Gut daran</dt>
                  <dd>{part.stops}</dd>
                </div>
                <div>
                  <dt>Ehrlich dazu</dt>
                  <dd>{part.tradeoff}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        {/*
          Zwei Fotos statt weiterer Absaetze. Das linke zeigt das Gewebe aus
          der Naehe, das rechte den Nachteil, den die Karte oben zugibt: Der
          Rahmen sitzt vor dem Fenster und ist von aussen zu sehen. Wer das
          selbst beurteilen will, soll es sehen und nicht nachlesen muessen.
        */}
        <div className="build-photos">
          <figure>
            <Foto
              name="gewebe-detail"
              alt="Nahaufnahme des Plissees: Links liegt das Gewebe gespannt vor der Scheibe, rechts sind die Falten zusammengeschoben. Dahinter Baum und Wiese."
              sizes="(max-width: 60rem) 90vw, 40vw"
            />
            <figcaption>
              Die Falten laufen in einer schmalen Schiene. Zusammengeschoben liegt das ganze Netz als schmales Paket
              am Rand.
            </figcaption>
          </figure>

          <figure>
            <Foto
              name="fassade-aussen"
              alt="Hausfassade von aussen mit zwei Fenstern, an denen das Insektenschutz-Plissee montiert ist. Der helle Rahmen sitzt vor dem Fensterrahmen und zeichnet sich deutlich ab."
              sizes="(max-width: 60rem) 90vw, 40vw"
            />
            <figcaption>
              So sieht es von aussen aus. Der Rahmen trägt vor dem Fenster auf – das gehört dazu, und Sie sollen es
              vorher wissen.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
