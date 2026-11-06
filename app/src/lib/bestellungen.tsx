import type { Bestellung } from '@pf/types'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ladeBestellungen, NichtAngemeldet } from './api'
import { useAnmeldung } from './anmeldung'

/**
 * Die Bestellungen, einmal geladen und von allen Bildschirmen geteilt: Die
 * Liste laedt sie, der Auftrag liest daraus, ohne nochmals zu fragen.
 *
 * In V1.0 nur lesen. Aendern kommt mit V1.1 – dann schreibt der Auftrag hier
 * hinein und die Liste ist sofort auf dem neuen Stand.
 */
interface Kontext {
  bestellungen: Bestellung[]
  laedt: boolean
  fehler: string | null
  neuLaden: () => Promise<void>
}

const BestellungenKontext = createContext<Kontext | null>(null)

export function BestellungenProvider({ children }: { children: ReactNode }) {
  const { schluessel, abmelden } = useAnmeldung()
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  const neuLaden = useCallback(async () => {
    if (!schluessel) return
    setLaedt(true)
    try {
      setBestellungen(await ladeBestellungen(schluessel))
      setFehler(null)
    } catch (f) {
      if (f instanceof NichtAngemeldet) {
        await abmelden()
        return
      }
      setFehler(f instanceof Error ? f.message : String(f))
    } finally {
      setLaedt(false)
    }
  }, [schluessel, abmelden])

  useEffect(() => {
    void neuLaden()
  }, [neuLaden])

  const wert = useMemo(() => ({ bestellungen, laedt, fehler, neuLaden }), [bestellungen, laedt, fehler, neuLaden])
  return <BestellungenKontext.Provider value={wert}>{children}</BestellungenKontext.Provider>
}

export function useBestellungen(): Kontext {
  const k = useContext(BestellungenKontext)
  if (!k) throw new Error('useBestellungen ausserhalb von BestellungenProvider')
  return k
}
