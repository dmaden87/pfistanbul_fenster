import { useMemo, useState } from 'react'
import type { UseCart } from '../../hooks/useCart'
import {
  apartmentById,
  apartmentTypes,
  buildById,
  buildTypes,
  orderableMeshes,
  sizeById,
  sizesOfKind,
} from '../../data/catalog'
import { unitPrice } from '../../lib/pricing'
import { formatChf, formatSize } from '../../lib/format'
import { priceNote } from '../../data/shopConfig'
import './SizeShop.css'

interface SizeShopProps {
  cart: UseCart
  onOpenCart: () => void
  onRequestClick: () => void
}

/** Für Balkontüren gibt es nur die Türvariante – die wird im Paket automatisch genommen. */
const DOOR_BUILD = 'plissee-tuer'

export function SizeShop({ cart, onOpenCart, onRequestClick }: SizeShopProps) {
  const [activeBuild, setActiveBuild] = useState(buildTypes[0]?.id ?? '')
  const [activeMesh, setActiveMesh] = useState(orderableMeshes[0]?.id ?? 'standard')
  const [apartment, setApartment] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const build = buildById(activeBuild) ?? buildTypes[0]
  const mesh = orderableMeshes.find((option) => option.id === activeMesh) ?? orderableMeshes[0]
  const visibleSizes = useMemo(() => sizesOfKind(build?.kind ?? 'fenster'), [build])
  const selectedApartment = apartment ? apartmentById(apartment) : undefined

  const recommendedIds = useMemo(
    () => new Set(selectedApartment?.windows.map((window) => window.sizeId) ?? []),
    [selectedApartment],
  )

  /** Im Paket bekommt jede Öffnung die Bauart, die zu ihr passt. */
  const buildForSize = (sizeId: string) => {
    const size = sizeById(sizeId)
    if (!size) return activeBuild
    return size.kind === 'tuer' ? DOOR_BUILD : activeBuild
  }

  const packageTotal = useMemo(() => {
    if (!selectedApartment) return 0
    return selectedApartment.windows.reduce(
      (sum, item) => sum + unitPrice(buildForSize(item.sizeId), item.sizeId, activeMesh) * item.count,
      0,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApartment, activeBuild, activeMesh])

  const packageCount = selectedApartment?.windows.reduce((sum, item) => sum + item.count, 0) ?? 0

  const handleAdd = (sizeId: string) => {
    cart.add(activeBuild, sizeId, activeMesh)
    setJustAdded(sizeId)
    window.setTimeout(() => setJustAdded((current) => (current === sizeId ? null : current)), 1600)
  }

  const handleAddPackage = () => {
    if (!selectedApartment) return
    for (const item of selectedApartment.windows) {
      cart.add(buildForSize(item.sizeId), item.sizeId, activeMesh, item.count)
    }
    onOpenCart()
  }

  return (
    <section className="section size-shop" id="groessen">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Direkt bestellbar</span>
          <h2>Die gängigen Formate – fertig gerechnet statt konfiguriert.</h2>
          <p className="section__lead">
            Sagen Sie uns, welche Wohnung Sie haben. Wir zeigen Ihnen, welche Netze dazugehören, und legen sie auf
            Wunsch komplett in den Warenkorb. Messen Sie vor dem Bestellen einmal nach – dann passt es.
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

        <div className="choices">
          <div className="choice">
            <p className="choice__label" id="build-label">
              Bauart
            </p>
            <div className="size-shop__tabs" role="tablist" aria-labelledby="build-label">
              {buildTypes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  id={`tab-${item.id}`}
                  aria-selected={item.id === activeBuild}
                  aria-controls="size-panel"
                  className={`size-tab${item.id === activeBuild ? ' size-tab--active' : ''}`}
                  onClick={() => setActiveBuild(item.id)}
                >
                  <span className="size-tab__name">{item.shortName}</span>
                  <span className="size-tab__hint">{item.tagline}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="choice">
            <p className="choice__label" id="mesh-label">
              Gewebe
            </p>
            <div className="mesh-picker" role="group" aria-labelledby="mesh-label">
              {orderableMeshes.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`mesh-chip${option.id === activeMesh ? ' mesh-chip--active' : ''}`}
                  aria-pressed={option.id === activeMesh}
                  onClick={() => setActiveMesh(option.id)}
                >
                  <span className="mesh-chip__name">{option.short}</span>
                  <span className="mesh-chip__price">
                    {option.surchargePerM2 === 0 ? 'ohne Aufpreis' : `+ CHF ${option.surchargePerM2}/m²`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedApartment && (
          <div className="size-package">
            <div className="size-package__body">
              <h3>
                {selectedApartment.label} · {build?.shortName} · {mesh?.short}
              </h3>
              <p>
                Nach unserer Erfahrung sind das {packageCount} Öffnungen. Balkontüren rechnen wir automatisch als
                Türelement. Sie können das Paket komplett nehmen oder unten einzeln zusammenstellen.
              </p>
              <ul>
                {selectedApartment.windows.map((item) => {
                  const size = sizeById(item.sizeId)
                  if (!size) return null
                  return (
                    <li key={item.sizeId}>
                      <span>
                        {item.count}× {size.label}
                        {size.kind === 'tuer' && <span className="pill pill--neutral">Türelement</span>}
                      </span>
                      <span className="size-package__measure">{formatSize(size.widthCm, size.heightCm)}</span>
                    </li>
                  )
                })}
              </ul>
              <p className="size-package__hint">
                Bitte vor dem Bestellen nachmessen. Seit dem Bau wurde etappenweise saniert, deshalb können die
                Rahmenprofile von Haus zu Haus abweichen. Passt etwas nicht, tauschen wir kostenlos.
              </p>
            </div>

            <div className="size-package__side">
              <p className="size-package__total-label">Komplettpreis</p>
              <p className="size-package__total">{formatChf(packageTotal)}</p>
              <p className="size-package__note">Der Mengenrabatt kommt im Warenkorb dazu.</p>
              <button type="button" className="btn btn--block btn--lg" onClick={handleAddPackage}>
                Alle {packageCount} in den Warenkorb
              </button>
            </div>
          </div>
        )}

        <div className="size-shop__panel" id="size-panel" role="tabpanel" aria-labelledby={`tab-${activeBuild}`}>
          <p className="size-shop__panel-note">
            <strong>{build?.shortName}</strong> mit {mesh?.name}. {build?.bestFor}.{' '}
            <span className="size-shop__caveat">Ehrlich dazu: {build?.caveat}</span>
          </p>

          <ul className="size-list">
            {visibleSizes.map((size) => {
              const price = unitPrice(activeBuild, size.id, activeMesh)
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
              {priceNote} Lieferung innerhalb der Siedlung kostenlos. Ab drei Elementen 5 %, ab fünf 8 %, ab acht 12 %
              Mengenrabatt – der Warenkorb rechnet ihn automatisch ab. Der Preis ist immer Grundpreis plus
              Quadratmeter, aufgerundet auf fünf Franken. Das ist unsere ganze Preisliste.
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
