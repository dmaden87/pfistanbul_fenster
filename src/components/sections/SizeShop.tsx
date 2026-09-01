import { useMemo, useState } from 'react'
import type { UseCart } from '../../hooks/useCart'
import { apartmentById, apartmentTypes, categories, sizeById, standardSizes } from '../../data/catalog'
import { unitPrice } from '../../lib/pricing'
import { formatChf, formatSize, roundToRappen } from '../../lib/format'
import { priceNote } from '../../data/shopConfig'
import './SizeShop.css'

interface SizeShopProps {
  cart: UseCart
  onOpenCart: () => void
  onRequestClick: () => void
}

export function SizeShop({ cart, onOpenCart, onRequestClick }: SizeShopProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '')
  const [apartment, setApartment] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const category = categories.find((item) => item.id === activeCategory) ?? categories[0]
  const selectedApartment = apartment ? apartmentById(apartment) : undefined

  const recommendedIds = useMemo(
    () => new Set(selectedApartment?.windows.map((window) => window.sizeId) ?? []),
    [selectedApartment],
  )

  const packageTotal = useMemo(() => {
    if (!selectedApartment) return 0
    return roundToRappen(
      selectedApartment.windows.reduce(
        (sum, window) => sum + unitPrice(activeCategory, window.sizeId) * window.count,
        0,
      ),
    )
  }, [selectedApartment, activeCategory])

  const packageCount = selectedApartment?.windows.reduce((sum, window) => sum + window.count, 0) ?? 0

  const handleAdd = (sizeId: string) => {
    cart.add(activeCategory, sizeId)
    setJustAdded(sizeId)
    window.setTimeout(() => setJustAdded((current) => (current === sizeId ? null : current)), 1600)
  }

  const handleAddPackage = () => {
    if (!selectedApartment) return
    for (const item of selectedApartment.windows) {
      cart.add(activeCategory, item.sizeId, item.count)
    }
    onOpenCart()
  }

  return (
    <section className="section size-shop" id="groessen">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Direkt bestellbar</span>
          <h2>Die Grössen aus unserer Siedlung – schon ausgemessen.</h2>
          <p className="section__lead">
            Sagen Sie uns, welche Wohnung Sie haben. Wir zeigen Ihnen, welche Netze dazugehören, und legen sie auf
            Wunsch komplett in den Warenkorb. Kein Konfigurator, kein Massband.
          </p>
        </div>

        <div className="apartment-picker">
          <p className="apartment-picker__label" id="apartment-label">
            Welche Wohnung haben Sie?
          </p>
          <div className="apartment-picker__options" role="group" aria-labelledby="apartment-label">
            {apartmentTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`apartment-chip${apartment === type.id ? ' apartment-chip--active' : ''}`}
                aria-pressed={apartment === type.id}
                onClick={() => setApartment((current) => (current === type.id ? null : type.id))}
              >
                <span className="apartment-chip__label">{type.label}</span>
                <span className="apartment-chip__hint">{type.hint}</span>
              </button>
            ))}
            <button type="button" className="apartment-chip apartment-chip--other" onClick={onRequestClick}>
              <span className="apartment-chip__label">Etwas anderes</span>
              <span className="apartment-chip__hint">Offerte anfordern</span>
            </button>
          </div>
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

        {selectedApartment && (
          <div className="size-package">
            <div className="size-package__body">
              <h3>
                {selectedApartment.label} · {category?.shortName}
              </h3>
              <p>
                Nach unserer Erfahrung sind das {packageCount} Fenster. Sie können das Paket komplett nehmen oder unten
                einzeln zusammenstellen.
              </p>
              <ul>
                {selectedApartment.windows.map((window) => {
                  const size = sizeById(window.sizeId)
                  if (!size) return null
                  return (
                    <li key={window.sizeId}>
                      <span>
                        {window.count}× {size.label}
                      </span>
                      <span className="size-package__measure">{formatSize(size.widthCm, size.heightCm)}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="size-package__hint">
                Bitte vor dem Bestellen einmal nachmessen – seit dem Bau wurde etappenweise saniert, deshalb kann es
                Abweichungen geben. Passt etwas nicht, tauschen wir kostenlos.
              </p>
            </div>

            <div className="size-package__side">
              <p className="size-package__total-label">Komplettpreis</p>
              <p className="size-package__total">{formatChf(packageTotal)}</p>
              <p className="size-package__note">Rabatt und Lieferung rechnet der Warenkorb dazu.</p>
              <button type="button" className="btn btn--block btn--lg" onClick={handleAddPackage}>
                Alle {packageCount} in den Warenkorb
              </button>
            </div>
          </div>
        )}

        <div className="size-shop__panel" id="size-panel" role="tabpanel" aria-labelledby={`tab-${activeCategory}`}>
          <p className="size-shop__panel-note">
            <strong>{category?.shortName}</strong> · {category?.mesh} · {category?.bestFor}
          </p>

          <ul className="size-list">
            {standardSizes.map((size) => {
              const price = unitPrice(activeCategory, size.id)
              const added = justAdded === size.id
              const recommended = recommendedIds.has(size.id)
              return (
                <li className={`size-row${recommended ? ' size-row--recommended' : ''}`} key={size.id}>
                  <div className="size-row__label">
                    <p className="size-row__name">
                      {size.label}
                      {recommended && <span className="pill">In Ihrer Wohnung</span>}
                      {!recommended && size.note && <span className="pill pill--neutral">{size.note}</span>}
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
              {priceNote} Lieferung innerhalb der Siedlung kostenlos. Ab drei Elementen gibt es 10 %
              Nachbarschaftsrabatt – der Warenkorb rechnet ihn automatisch ab.
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
