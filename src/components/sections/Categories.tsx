import { buildTypes, sizesOfKind } from '../../data/catalog'
import { lowestPriceFor } from '../../lib/pricing'
import { formatChf } from '../../lib/format'
import './Categories.css'

interface CategoriesProps {
  onPickSize: () => void
}

export function Categories({ onPickSize }: CategoriesProps) {
  return (
    <section className="section categories" id="sortiment">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Drei Bauarten</span>
          <h2>Welche Art Netz passt zu Ihrer Öffnung?</h2>
          <p className="section__lead">
            Der Unterschied liegt in der Bedienung, nicht in der Qualität. Das Gewebe wählen Sie unabhängig davon –
            jede Bauart gibt es mit jedem Gewebe.
          </p>
        </div>

        <div className="categories__grid">
          {buildTypes.map((build) => (
            <article className="category-card" key={build.id}>
              <div className="category-card__visual" aria-hidden="true">
                <span className={`category-card__mesh category-card__mesh--${build.id}`} />
              </div>

              <div className="category-card__body">
                <p className="category-card__tagline">{build.tagline}</p>
                <h3>{build.name}</h3>
                <p className="category-card__description">{build.description}</p>

                <ul className="category-card__features">
                  {build.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <dl className="category-card__specs">
                  <div>
                    <dt>Passt zu</dt>
                    <dd>{build.bestFor}</dd>
                  </div>
                  <div>
                    <dt>Ehrlich dazu</dt>
                    <dd>{build.caveat}</dd>
                  </div>
                </dl>
              </div>

              <footer className="category-card__foot">
                <p className="category-card__price">
                  <span>ab</span>
                  <strong>
                    {formatChf(
                      lowestPriceFor(
                        build.id,
                        sizesOfKind(build.kind).map((size) => size.id),
                      ),
                    )}
                  </strong>
                </p>
                <button type="button" className="btn btn--ghost" onClick={onPickSize}>
                  Grösse wählen
                </button>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
