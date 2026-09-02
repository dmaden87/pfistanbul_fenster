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
      </div>
    </section>
  )
}
