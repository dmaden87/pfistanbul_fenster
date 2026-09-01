import { useState } from 'react'
import type { UseCart } from '../../hooks/useCart'
import { categories, standardSizes } from '../../data/catalog'
import { unitPrice } from '../../lib/pricing'
import { formatChf, formatSize } from '../../lib/format'
import './SizeShop.css'

interface SizeShopProps {
  cart: UseCart
  onOpenCart: () => void
  onRequestClick: () => void
}

export function SizeShop({ cart, onOpenCart, onRequestClick }: SizeShopProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '')
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const category = categories.find((item) => item.id === activeCategory) ?? categories[0]

  const handleAdd = (sizeId: string) => {
    cart.add(activeCategory, sizeId)
    setJustAdded(sizeId)
    window.setTimeout(() => setJustAdded((current) => (current === sizeId ? null : current)), 1600)
  }

  return (
    <section className="section size-shop" id="groessen">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Direkt bestellbar</span>
          <h2>Die Grössen aus unserer Siedlung – schon ausgemessen.</h2>
          <p className="section__lead">
            Diese Masse decken die allermeisten Fenster im Pfisterhölzli ab. Bauart wählen, Grösse anklicken, fertig.
            Kein Konfigurator, keine Wartezeit auf eine Offerte.
          </p>
        </div>

        <div className="size-shop__tabs" role="tablist" aria-label="Bauart wählen">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={item.id === activeCategory}
              aria-controls="size-panel"
              className={`size-tab${item.id === activeCategory ? ' size-tab--active' : ''}`}
              onClick={() => setActiveCategory(item.id)}
            >
              <span className="size-tab__name">{item.shortName}</span>
              <span className="size-tab__hint">{item.tagline}</span>
            </button>
          ))}
        </div>

        <div className="size-shop__panel" id="size-panel" role="tabpanel" aria-labelledby={`tab-${activeCategory}`}>
          <p className="size-shop__panel-note">
            <strong>{category?.shortName}</strong> · {category?.mesh} · {category?.bestFor}
          </p>

          <ul className="size-list">
            {standardSizes.map((size) => {
              const price = unitPrice(activeCategory, size.id)
              const added = justAdded === size.id
              return (
                <li className="size-row" key={size.id}>
                  <div className="size-row__label">
                    <p className="size-row__name">
                      {size.label}
                      {size.note && <span className="pill pill--neutral">{size.note}</span>}
                    </p>
                    <p className="size-row__room">{size.room}</p>
                  </div>

                  <p className="size-row__measure">{formatSize(size.widthCm, size.heightCm)}</p>

                  <p className="size-row__price">{formatChf(price)}</p>

                  <button
                    type="button"
                    className={`btn size-row__add${added ? ' size-row__add--done' : ''}`}
                    onClick={() => handleAdd(size.id)}
                  >
                    {added ? 'Hinzugefügt ✓' : 'In den Warenkorb'}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="size-shop__foot">
            <p>
              Alle Preise in CHF inkl. MwSt. Lieferung innerhalb der Siedlung kostenlos. Ab drei Elementen gibt es
              10 % Nachbarschaftsrabatt – der Warenkorb rechnet ihn automatisch ab.
            </p>
            <button type="button" className="btn btn--quiet" onClick={onOpenCart}>
              Warenkorb ansehen
            </button>
          </div>
        </div>

        <aside className="size-shop__custom">
          <div>
            <h3>Ihr Fenster ist nicht dabei?</h3>
            <p>
              Attikawohnung, Balkonverglasung, Dachfenster oder einfach ein Mass, das aus der Reihe fällt: Sagen Sie uns
              Anzahl und Masse, wir rechnen es durch und schicken Ihnen eine Offerte. Kostenlos und unverbindlich.
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
