import { useEffect, useState } from 'react'
import './Header.css'

interface HeaderProps {
  cartCount: number
  onOpenCart: () => void
  onNavigateHome: () => void
  onNavigate: (anchor: string) => void
}

const NAV = [
  { anchor: 'ueberuns', label: 'Über uns' },
  { anchor: 'aufbau', label: 'Aufbau' },
  { anchor: 'groessen', label: 'Überbauungen' },
  { anchor: 'montage', label: 'Messen & Montage' },
  { anchor: 'anfrage', label: 'Sondermass' },
  { anchor: 'faq', label: 'Fragen' },
]

export function Header({ cartCount, onOpenCart, onNavigateHome, onNavigate }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <header className={`site-header${scrolled ? ' site-header--scrolled' : ''}`}>
      <div className="shell site-header__inner">
        <a
          className="brand"
          href="#top"
          onClick={(event) => {
            event.preventDefault()
            setMenuOpen(false)
            onNavigateHome()
          }}
        >
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="32" height="32">
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <g stroke="var(--brand-mark-line)" strokeWidth="1.5" strokeLinecap="round" opacity="0.95">
                <path d="M7 10h18M7 16h18M7 22h18" />
                <path d="M11 7v18M16 7v18M21 7v18" />
              </g>
            </svg>
          </span>
          <span className="brand__text">
            <strong>Pfistanbul</strong>
            <span>Fenster</span>
          </span>
        </a>

        <nav className={`site-nav${menuOpen ? ' site-nav--open' : ''}`} aria-label="Hauptnavigation">
          {NAV.map((item) => (
            <a
              key={item.anchor}
              href={`#${item.anchor}`}
              onClick={(event) => {
                event.preventDefault()
                setMenuOpen(false)
                onNavigate(item.anchor)
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="site-header__actions">
          <button type="button" className="cart-button" onClick={onOpenCart}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 5h2l2.2 10.2a2 2 0 0 0 2 1.6h6.9a2 2 0 0 0 2-1.5L21 8H7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10.5" cy="20" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="17.5" cy="20" r="1.2" fill="currentColor" stroke="none" />
            </svg>
            <span>Warenkorb</span>
            {cartCount > 0 && <span className="cart-button__badge">{cartCount}</span>}
          </button>

          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Menü schliessen' : 'Menü öffnen'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
