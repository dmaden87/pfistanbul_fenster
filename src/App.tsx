import { useCallback, useEffect, useState } from 'react'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { CartDrawer } from './components/shop/CartDrawer'
import { OrderForm } from './components/forms/OrderForm'
import { Hero } from './components/sections/Hero'
import { TrustBar } from './components/sections/TrustBar'
import { Benefits } from './components/sections/Benefits'
import { Categories } from './components/sections/Categories'
import { SizeShop } from './components/sections/SizeShop'
import { MeshTable } from './components/sections/MeshTable'
import { HowItWorks } from './components/sections/HowItWorks'
import { Measuring } from './components/sections/Measuring'
import { CustomRequest } from './components/sections/CustomRequest'
import { Faq } from './components/sections/Faq'
import { ClosingCta } from './components/sections/ClosingCta'
import { LegalPage, type LegalKey } from './components/sections/LegalPage'
import { useCart } from './hooks/useCart'
import './App.css'

type View = { name: 'shop' } | { name: 'checkout' } | { name: 'legal'; page: LegalKey }

export default function App() {
  const cart = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [view, setView] = useState<View>({ name: 'shop' })

  useEffect(() => {
    if (view.name !== 'shop') window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view])

  const goToShop = useCallback(() => setView({ name: 'shop' }), [])

  const goToCheckout = useCallback(() => {
    setCartOpen(false)
    setView({ name: 'checkout' })
  }, [])

  const goToAnchor = useCallback((anchor: string) => {
    setView({ name: 'shop' })
    window.requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">
        Zum Inhalt springen
      </a>

      <Header cartCount={cart.totals.itemCount} onOpenCart={() => setCartOpen(true)} onNavigateHome={goToShop} />

      <main id="main">
        {view.name === 'shop' && (
          <>
            <Hero onShopClick={() => goToAnchor('groessen')} onRequestClick={() => goToAnchor('anfrage')} />
            <TrustBar />
            <Benefits />
            <Categories onPickSize={() => goToAnchor('groessen')} />
            <SizeShop cart={cart} onOpenCart={() => setCartOpen(true)} onRequestClick={() => goToAnchor('anfrage')} />
            <MeshTable />
            <HowItWorks />
            <Measuring />
            <CustomRequest />
            <Faq />
            <ClosingCta onShopClick={() => goToAnchor('groessen')} onRequestClick={() => goToAnchor('anfrage')} />
          </>
        )}

        {view.name === 'checkout' && (
          <section className="section">
            <div className="shell">
              <div className="section__intro">
                <span className="section__eyebrow">Bestellung abschliessen</span>
                <h1>Fast geschafft.</h1>
                <p className="section__lead">
                  Prüfen Sie Ihre Positionen und sagen Sie uns, wohin geliefert werden soll. Bezahlt wird erst bei der
                  Übergabe.
                </p>
              </div>
              <OrderForm cart={cart} onBackToShop={goToShop} />
            </div>
          </section>
        )}

        {view.name === 'legal' && <LegalPage page={view.page} onBack={goToShop} />}
      </main>

      <Footer onOpenLegal={(page) => setView({ name: 'legal', page })} />

      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={goToCheckout} />
    </>
  )
}
