import { useEffect, useRef } from 'react'
import type { UseCart } from '../../hooks/useCart'
import { categoryById, sizeById } from '../../data/catalog'
import { formatChf, formatSize } from '../../lib/format'
import { unitPrice, BULK_DISCOUNT_THRESHOLD } from '../../lib/pricing'
import { priceNote } from '../../data/shopConfig'
import './CartDrawer.css'

interface CartDrawerProps {
  cart: UseCart
  open: boolean
  onClose: () => void
  onCheckout: () => void
}

export function CartDrawer({ cart, open, onClose, onCheckout }: CartDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const { lines, totals, setQuantity, remove, clear } = cart
  const missingForDiscount = Math.max(0, BULK_DISCOUNT_THRESHOLD - totals.itemCount)

  return (
    <div className="drawer" role="presentation" onClick={onClose}>
      <div
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Warenkorb"
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer__head">
          <div>
            <h2>Warenkorb</h2>
            <p>{totals.itemCount === 0 ? 'Noch nichts drin' : `${totals.itemCount} Element${totals.itemCount === 1 ? '' : 'e'}`}</p>
          </div>
          <button type="button" className="drawer__close" onClick={onClose} ref={closeRef} aria-label="Warenkorb schliessen">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="drawer__empty">
            <p className="drawer__empty-title">Ihr Warenkorb ist leer.</p>
            <p>Wählen Sie oben eine Grösse aus – oder fragen Sie ein Sondermass an, wenn nichts passt.</p>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Weiter stöbern
            </button>
          </div>
        ) : (
          <>
            <ul className="drawer__lines">
              {lines.map((line) => {
                const category = categoryById(line.categoryId)
                const size = sizeById(line.sizeId)
                if (!category || !size) return null
                return (
                  <li key={line.id} className="cart-line">
                    <div className="cart-line__visual" aria-hidden="true">
                      <span className="cart-line__mesh" />
                    </div>
                    <div className="cart-line__body">
                      <p className="cart-line__title">{category.shortName}</p>
                      <p className="cart-line__meta">
                        {size.label} · {formatSize(size.widthCm, size.heightCm)}
                      </p>
                      <p className="cart-line__unit">{formatChf(unitPrice(line.categoryId, line.sizeId))} pro Stück</p>
                    </div>
                    <div className="cart-line__side">
                      <div className="stepper">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.id, line.quantity - 1)}
                          aria-label={`Menge verringern für ${category.shortName} ${size.label}`}
                        >
                          −
                        </button>
                        <span aria-live="polite">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.id, line.quantity + 1)}
                          aria-label={`Menge erhöhen für ${category.shortName} ${size.label}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-line__remove"
                        onClick={() => remove(line.id)}
                        aria-label={`${category.shortName} ${size.label} entfernen`}
                      >
                        Entfernen
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            <footer className="drawer__foot">
              {missingForDiscount > 0 && (
                <p className="drawer__nudge">
                  Noch {missingForDiscount} Element{missingForDiscount === 1 ? '' : 'e'} bis zum Nachbarschaftsrabatt.
                </p>
              )}

              <dl className="totals">
                <div>
                  <dt>Zwischentotal</dt>
                  <dd>{formatChf(totals.subtotalChf)}</dd>
                </div>
                {totals.discountChf > 0 && (
                  <div className="totals__discount">
                    <dt>{totals.discountLabel}</dt>
                    <dd>−{formatChf(totals.discountChf)}</dd>
                  </div>
                )}
                <div>
                  <dt>Lieferung im Pfisterhölzli</dt>
                  <dd>{totals.shippingChf === 0 ? 'kostenlos' : formatChf(totals.shippingChf)}</dd>
                </div>
                <div className="totals__grand">
                  <dt>Total</dt>
                  <dd>{formatChf(totals.totalChf)}</dd>
                </div>
              </dl>

              <p className="drawer__vat">{priceNote}</p>

              <button type="button" className="btn btn--block btn--lg" onClick={onCheckout}>
                Zur Bestellung
              </button>
              <button type="button" className="btn btn--quiet drawer__clear" onClick={clear}>
                Warenkorb leeren
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
