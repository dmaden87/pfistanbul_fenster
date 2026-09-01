import { categories, allSizeIds } from '../../data/catalog'
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
          <span className="section__eyebrow">Vier Bauarten</span>
          <h2>Welche Art Netz passt zu Ihrem Fenster?</h2>
          <p className="section__lead">
            Alle vier gibt es in denselben Standardgrössen. Der Unterschied liegt in der Bedienung und im Gewebe – nicht
            in der Qualität.
          </p>
        </div>

        <div className="categories__grid">
          {categories.map((category) => (
            <article className="category-card" key={category.id}>
              <div className="category-card__visual" aria-hidden="true">
                <span className={`category-card__mesh category-card__mesh--${category.id}`} />
              </div>

              <div className="category-card__body">
                <p className="category-card__tagline">{category.tagline}</p>
                <h3>{category.name}</h3>
                <p className="category-card__description">{category.description}</p>

                <ul className="category-card__features">
                  {category.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <dl className="category-card__specs">
                  <div>
                    <dt>Gewebe</dt>
                    <dd>{category.mesh}</dd>
                  </div>
                  <div>
                    <dt>Passt zu</dt>
                    <dd>{category.bestFor}</dd>
                  </div>
                </dl>
              </div>

              <footer className="category-card__foot">
                <p className="category-card__price">
                  <span>ab</span>
                  <strong>{formatChf(lowestPriceFor(category.id, allSizeIds))}</strong>
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
