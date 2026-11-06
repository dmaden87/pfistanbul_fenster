import { useEffect, useState } from 'react'
import type { Bestellung } from '../../types'
import { Offerte } from '../admin/Offerte'
import { Quittung } from '../admin/Quittung'
import { bezahltAm } from '../../lib/phasen'
import { operator } from '../../data/operator'
import '../admin/Bestellauftrag.css'

/**
 * Die Offerte unter ihrem Link – pfistanbul.ch/offerte/<geheim>.
 *
 * Dasselbe Blatt wie im Adminbereich (Offerte.tsx), damit die Kundschaft
 * genau sieht, was wir gedruckt haetten. Die Daten kommen ohne Anmeldung,
 * aber nur mit dem Geheimnis, und nur das, was auf der Offerte steht – siehe
 * kundenfassung() in api/bestellungen.ts.
 *
 * Ist der Auftrag uebergeben und bezahlt, steht unter demselben Link die
 * Quittung (Vorlage I): Die Kundschaft hat ihn schon, und ein zweiter Link
 * fuer denselben Auftrag waere einer mehr zum Verwechseln.
 */
export function OffertePage({ geheim }: { geheim: string }) {
  const [zustand, setZustand] = useState<{ bestellung: Bestellung } | { fehler: string } | null>(null)

  useEffect(() => {
    let aktiv = true
    fetch(`/api/bestellungen?aktion=offerte&g=${encodeURIComponent(geheim)}`)
      .then(async (antwort) => {
        const daten = (await antwort.json().catch(() => ({}))) as { bestellung?: Bestellung; error?: string }
        if (!aktiv) return
        setZustand(daten.bestellung ? { bestellung: daten.bestellung } : { fehler: daten.error ?? 'Die Offerte konnte nicht geladen werden.' })
      })
      .catch(() => aktiv && setZustand({ fehler: 'Die Offerte konnte nicht geladen werden. Bitte später nochmals versuchen.' }))
    return () => {
      aktiv = false
    }
  }, [geheim])

  return (
    <main id="main" className="section">
      <div className="shell">
        {zustand === null && <p>Offerte wird geladen …</p>}
        {zustand && 'fehler' in zustand && (
          <div className="section__intro">
            <h1>Offerte</h1>
            <p className="section__lead">{zustand.fehler}</p>
            <p>
              {operator.businessName} · <a href={`mailto:${operator.email}`}>{operator.email}</a>
            </p>
          </div>
        )}
        {zustand && 'bestellung' in zustand &&
          (bezahltAm(zustand.bestellung) && zustand.bestellung.ausgeliefertAm ? (
            <Quittung bestellung={zustand.bestellung} />
          ) : (
            <Offerte bestellung={zustand.bestellung} stand={zustand.bestellung.preiseFestgelegtAm} />
          ))}
      </div>
    </main>
  )
}
