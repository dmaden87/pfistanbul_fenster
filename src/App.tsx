import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { CartDrawer } from './components/shop/CartDrawer'
import { OrderForm } from './components/forms/OrderForm'
import { PaymentResult } from './components/forms/PaymentResult'
import { Hero } from './components/sections/Hero'
import { TrustBar } from './components/sections/TrustBar'
import { Benefits } from './components/sections/Benefits'
import { TwoPaths } from './components/sections/TwoPaths'
import { Construction } from './components/sections/Construction'
import { Shop } from './components/sections/Shop'
import { HowItWorks } from './components/sections/HowItWorks'
import { Measuring } from './components/sections/Measuring'
import { Story } from './components/sections/Story'
import { PaymentHelp } from './components/sections/PaymentHelp'
import { Promises } from './components/sections/Promises'
import { CustomRequest } from './components/sections/CustomRequest'
import { Faq } from './components/sections/Faq'
import { ClosingCta } from './components/sections/ClosingCta'
import { LegalPage, type LegalKey } from './components/sections/LegalPage'
import { AdminPage } from './components/admin/AdminPage'
import { Analytics } from '@vercel/analytics/react'
import { useCart } from './hooks/useCart'
import './App.css'

type View =
  | { name: 'shop' }
  | { name: 'checkout' }
  | { name: 'admin' }
  | { name: 'legal'; page: LegalKey }
  | { name: 'zahlung'; status: 'ok' | 'abbruch'; reference: string }

/**
 * Stripe schickt die Kundschaft mit ?zahlung=ok bzw. ?zahlung=abbruch zurück.
 * Wir lesen das einmal beim Start und räumen die Adresszeile gleich wieder auf,
 * damit ein Neuladen nicht nochmals dieselbe Meldung zeigt.
 */
function readPaymentReturn(): View | null {
  const params = new URLSearchParams(window.location.search)
  const status = params.get('zahlung')
  if (status !== 'ok' && status !== 'abbruch') return null

  const reference = params.get('ref') ?? ''
  window.history.replaceState({}, '', window.location.pathname)
  return { name: 'zahlung', status, reference }
}

export default function App() {
  const cart = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [view, setView] = useState<View>(() => readPaymentReturn() ?? { name: 'shop' })
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null)

  useEffect(() => {
    if (view.name !== 'shop') window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view])

  // Nach erfolgreicher Zahlung ist der Warenkorb erledigt.
  const cartCleared = useRef(false)
  useEffect(() => {
    if (view.name === 'zahlung' && view.status === 'ok' && !cartCleared.current) {
      cartCleared.current = true
      cart.clear()
    }
  }, [view, cart])

  // Der Sprung zu einem Abschnitt wartet, bis die Startseite wieder gerendert
  // ist - sonst geht der Klick aus der Bestell- oder Rechtsseite ins Leere.
  useEffect(() => {
    if (view.name !== 'shop' || !pendingAnchor) return
    const target = document.getElementById(pendingAnchor)
    setPendingAnchor(null)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [view, pendingAnchor])

  const goToShop = useCallback(() => setView({ name: 'shop' }), [])

  const goToCheckout = useCallback(() => {
    setCartOpen(false)
    setView({ name: 'checkout' })
  }, [])

  const goToAnchor = useCallback((anchor: string) => {
    setCartOpen(false)
    setView({ name: 'shop' })
    setPendingAnchor(anchor)
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">
        Zum Inhalt springen
      </a>

      <Header
        cartCount={cart.totals.netCount}
        onOpenCart={() => setCartOpen(true)}
        onNavigateHome={goToShop}
        onNavigate={goToAnchor}
      />

      <main id="main">
        {view.name === 'shop' && (
          <>
            <Hero onShopClick={() => goToAnchor('groessen')} onRequestClick={() => goToAnchor('anfrage')} />
            <TrustBar />
            <Benefits />
            <TwoPaths onStandardClick={() => goToAnchor('groessen')} onCustomClick={() => goToAnchor('anfrage')} />
            <Construction />
            <Shop cart={cart} onOpenCart={() => setCartOpen(true)} onRequestClick={() => goToAnchor('anfrage')} />
            <HowItWorks />
            <Measuring />
            <Story />
            <Promises />
            <CustomRequest />
            <PaymentHelp />
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
              <OrderForm cart={cart} onBackToShop={goToShop} onOpenCart={() => setCartOpen(true)} />
            </div>
          </section>
        )}

        {view.name === 'zahlung' && (
          <section className="section">
            <div className="shell">
              <PaymentResult
                status={view.status}
                reference={view.reference}
                onBackToShop={goToShop}
                onBackToCheckout={() => setView({ name: 'checkout' })}
              />
            </div>
          </section>
        )}

        {view.name === 'legal' && <LegalPage page={view.page} onBack={goToShop} />}

        {view.name === 'admin' && <AdminPage onBack={goToShop} />}
      </main>

      <Footer
        onOpenLegal={(page) => setView({ name: 'legal', page })}
        onNavigate={goToAnchor}
        onOpenAdmin={() => setView({ name: 'admin' })}
      />

      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} onCheckout={goToCheckout} />

      {/*
        Vercel Analytics: zaehlt Besuche und Seitenaufrufe, setzt keine Cookies
        und legt kein geraeteuebergreifendes Profil an. Die IP-Adresse wird von
        Vercel nur zur Herkunftsbestimmung verwendet und nicht gespeichert.
        Trotzdem ist es eine Bearbeitung durch einen Dritten in den USA und
        gehoert deshalb in die Datenschutzerklaerung.
      */}
      <Analytics />
    </>
  )
}
