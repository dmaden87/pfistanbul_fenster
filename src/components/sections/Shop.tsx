import { useState } from 'react'
import type { UseCart } from '../../hooks/useCart'
import { netSets, netsInSet, regularPriceOfSet, typeById, windowTypes } from '../../data/catalog'
import { priceNote, shopConfig } from '../../data/shopConfig'
import { formatChf, formatSize } from '../../lib/format'
import './Shop.css'

interface ShopProps {
  cart: UseCart
  onOpenCart: () => void
  onRequestClick: () => void
}

export function Shop({ cart, onOpenCart, onRequestClick }: ShopProps) {
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const flash = (key: string) => {
    setJustAdded(key)
    window.setTimeout(() => setJustAdded((current) => (current === key ? null : current)), 1600)
  }

  return (
    <section className="section shop" id="groessen">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Sortiment und Preise</span>
          <h2>Vier Fenstertypen. Mehr gibt es bei uns nicht – und mehr braucht es nicht.</h2>
          <p className="section__lead">
            Wir haben die Fenster in der Überbauung ausgemessen. Es sind vier Formate, die sich über alle Wohnungen
            wiederholen. Für jedes gibt es einen festen Preis, kein Konfigurator dazwischen.
          </p>
        </div>

        <h3 className="shop__group-title">Als Set für die ganze Wohnung</h3>
        <div className="set-grid">
          {netSets.map((set) => {
            const regular = regularPriceOfSet(set)
            const savings = regular - set.priceChf
            const nets = netsInSet(set)
            const key = `set-${set.id}`
            return (
              <article className="set-card" key={set.id}>
                <header>
                  <h4>{set.label}</h4>
                  <span className="pill">{nets} Netze</span>
                </header>
                <p className="set-card__description">{set.description}</p>

                <ul className="set-card__items">
                  {set.items.map((item) => {
                    const type = typeById(item.typeId)
                    if (!type) return null
                    return (
                      <li key={item.typeId}>
                        <span>
                          {item.count}× {type.label}
                        </span>
                        <span>{formatSize(type.widthCm, type.heightCm)}</span>
                      </li>
                    )
                  })}
                </ul>

                <footer>
                  <div className="set-card__price">
                    <p className="set-card__amount">{formatChf(set.priceChf)}</p>
                    <p className="set-card__saving">
                      Einzeln {formatChf(regular)} · Sie sparen {formatChf(savings)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`btn btn--block${justAdded === key ? ' btn--done' : ''}`}
                    onClick={() => {
                      cart.add('set', set.id)
                      flash(key)
                    }}
                  >
                    {justAdded === key ? 'Hinzugefügt ✓' : 'Set in den Warenkorb'}
                  </button>
                </footer>
              </article>
            )
          })}
        </div>

        <h3 className="shop__group-title">Oder einzeln</h3>
        <div className="shop__panel">
          <ul className="type-list">
            {windowTypes.map((type) => {
              const key = `einzel-${type.id}`
              return (
                <li className="type-row" key={type.id}>
                  <div className="type-row__label">
                    <p className="type-row__name">
                      {type.label}
                      {type.note && <span className="pill pill--neutral">{type.note}</span>}
                    </p>
                    <p className="type-row__room">{type.room}</p>
                  </div>

                  <p className="type-row__measure">{formatSize(type.widthCm, type.heightCm)}</p>
                  <p className="type-row__area">{type.areaM2.toFixed(2).replace('.', ',')} m²</p>
                  <p className="type-row__price">{formatChf(type.priceChf)}</p>

                  <button
                    type="button"
                    className={`btn btn--ghost type-row__add${justAdded === key ? ' type-row__add--done' : ''}`}
                    onClick={() => {
                      cart.add('einzel', type.id)
                      flash(key)
                    }}
                  >
                    {justAdded === key ? 'Hinzugefügt ✓' : 'In den Warenkorb'}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="shop__foot">
            <p>
              {priceNote} Lieferung innerhalb der Siedlung kostenlos. Montage durch uns auf Wunsch{' '}
              {formatChf(shopConfig.montageChf)} pro Fenster – auch im Set. Den Haken dafür setzen Sie im Warenkorb.
            </p>
            <button type="button" className="btn btn--quiet" onClick={onOpenCart}>
              Warenkorb ansehen
            </button>
          </div>
        </div>

        <aside className="shop__custom">
          <div>
            <h3>Ein Fenster, das nicht dazugehört?</h3>
            <p>
              Ein Estrich- oder Kellerfenster, eine verglaste Loggia oder ein Umbau, der vom Raster abweicht: Sagen Sie
              uns Anzahl und Masse, wir rechnen es in der nächsten Sammelbestellung mit und schicken Ihnen eine Offerte.
            </p>
          </div>
          <button type="button" className="btn" onClick={onRequestClick}>
            Sondermass anfragen
          </button>
        </aside>
      </div>
    </section>
  )
}
