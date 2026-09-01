import { meshOptions } from '../../data/catalog'
import './Meshes.css'

/**
 * Das Gewebe gehört zum Produkt, nicht zur Überbauung. Pollenschutz steht
 * bewusst als Option "auf Anfrage" – ohne Datenblatt des tatsächlich
 * bezogenen Gewebes nennen wir keine Rückhalterate und keine Prozentzahl.
 */
export function Meshes() {
  return (
    <section className="section meshes" id="gewebe">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Das Gewebe</span>
          <h2>Was das Netz zurückhält – und was ehrlicherweise nicht.</h2>
          <p className="section__lead">
            Je feiner ein Gewebe, desto weniger Luft und Licht kommt durch. Das ist Physik und lässt sich nicht
            wegwerben. Deshalb sagen wir bei jeder Variante auch, was sie kostet – nicht nur in Franken.
          </p>
        </div>

        <div className="mesh-grid">
          {meshOptions.map((mesh) => (
            <article className={`mesh-card mesh-card--${mesh.id}`} key={mesh.id}>
              <div className="mesh-card__swatch" aria-hidden="true">
                <span />
              </div>
              <div className="mesh-card__body">
                <header>
                  <h3>{mesh.name}</h3>
                  <span className={mesh.availability === 'standard' ? 'pill' : 'pill pill--neutral'}>
                    {mesh.availability === 'standard' ? 'Im Preis inbegriffen' : 'Aufpreis auf Anfrage'}
                  </span>
                </header>
                <p>{mesh.description}</p>
                <dl>
                  <div>
                    <dt>Hält ab</dt>
                    <dd>{mesh.stops}</dd>
                  </div>
                  <div>
                    <dt>Ehrlich dazu</dt>
                    <dd>{mesh.tradeoff}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>

        <p className="meshes__note">
          <strong>Dichtung schlägt Gewebe.</strong> Ein Spalt von zwei Millimetern zwischen Rahmen und Laibung macht
          das beste Gewebe wirkungslos. Deshalb ist bei uns jeder Rahmen umlaufend mit einer Bürstendichtung versehen
          – das haben Klettband- und Magnetlösungen prinzipbedingt nicht.
        </p>
      </div>
    </section>
  )
}
