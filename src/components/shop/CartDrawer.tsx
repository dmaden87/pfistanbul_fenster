import { useEffect, useRef } from 'react'
import type { UseCart } from '../../hooks/useCart'
import { netsInSet, setById, typeById } from '../../data/catalog'
import { formatChf, formatSize } from '../../lib/format'
import { priceNote, shopConfig } from '../../data/shopConfig'
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

  const { lines, totals, montage, setMontage, setQuantity, remove, clear, linePrice } = cart

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
            <p>{totals.netCount === 0 ? 'Noch nichts drin' : `${totals.netCount} Netz${totals.netCount === 1 ? '' : 'e'}`}</p>
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
            <p>Wählen Sie ein Set für die ganze Wohnung – oder einzelne Netze, wenn Sie nur ein paar brauchen.</p>
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Weiter stöbern
            </button>
          </div>
        ) : (
          <>
            <ul className="drawer__lines">
              {lines.map((line) => {
                const set = line.kind === 'set' ? setById(line.refId) : undefined
                const type = line.kind === 'einzel' ? typeById(line.refId) : undefined
                const title = set?.label ?? type?.label
                if (!title) return null
                const meta = set
                  ? `${netsInSet(set)} Netze im Set`
                  : type
                    ? `${formatSize(type.widthCm, type.heightCm)} · ${type.room}`
                    : ''
                return (
                  <li key={line.id} className="cart-line">
                    <div className="cart-line__visual" aria-hidden="true">
                      <span className="cart-line__mesh" />
                    </div>
                    <div className="cart-line__body">
                      <p className="cart-line__title">{title}</p>
                      <p className="cart-line__meta">{meta}</p>
                      <p className="cart-line__unit">{formatChf(linePrice(line) / line.quantity)} pro Stück</p>
                    </div>
                    <div className="cart-line__side">
                      <p className="cart-line__sum">{formatChf(linePrice(line))}</p>
                      <div className="stepper">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.id, line.quantity - 1)}
                          aria-label={`Menge verringern für ${title}`}
                        >
                          −
                        </button>
                        <span aria-live="polite">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.id, line.quantity + 1)}
                          aria-label={`Menge erhöhen für ${title}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-line__remove"
                        onClick={() => remove(line.id)}
                        aria-label={`${title} entfernen`}
                      >
                        Entfernen
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            <footer className="drawer__foot">
              <label className="montage-toggle">
                <input type="checkbox" checked={montage} onChange={(event) => setMontage(event.target.checked)} />
                <span>
                  <strong>Montage durch uns</strong>
                  <span className="montage-toggle__hint">
                    {formatChf(shopConfig.montageChf)} pro Fenster. Ohne Haken montieren Sie selbst – geklemmt, ohne
                    Bohren, in wenigen Minuten.
                  </span>
                </span>
              </label>

              <dl className="totals">
                <div>
                  <dt>Netze ({totals.netCount})</dt>
                  <dd>{formatChf(totals.netsChf)}</dd>
                </div>
                {totals.savingsChf > 0 && (
                  <div className="totals__discount">
                    <dt>Im Set gespart</dt>
                    <dd>−{formatChf(totals.savingsChf)}</dd>
                  </div>
                )}
                {montage && (
                  <div>
                    <dt>
                      Montage {totals.netCount} × {formatChf(shopConfig.montageChf)}
                    </dt>
                    <dd>{formatChf(totals.montageChf)}</dd>
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
              <p className="drawer__note">
                Wir produzieren in Sammelbestellungen. Sobald {shopConfig.minimumBatchNets} Netze zusammen sind, geht die
                Runde in Produktion – wir melden uns mit dem Termin.
              </p>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
