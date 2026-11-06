import type { BestellAenderung, Bestellung } from '@pf/types'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { aendereBestellung, ladeBestellungen, NichtAngemeldet } from './api'
import { useAnmeldung } from './anmeldung'

/**
 * Die Bestellungen, einmal geladen und von allen Bildschirmen geteilt: Die
 * Liste laedt sie, der Auftrag liest daraus, ohne nochmals zu fragen.
 *
 * Aendern schreibt den Stand, den der Server zurueckgibt, sofort hier
 * hinein - die Liste ist damit gleich auf dem neuen Stand, ohne neu zu laden.
 */
interface Kontext {
  bestellungen: Bestellung[]
  laedt: boolean
  fehler: string | null
  neuLaden: () => Promise<void>
  /** Wirft bei einem Fehler; die Meldung ist fuer Menschen geschrieben. */
  aendern: (id: string, aenderung: BestellAenderung) => Promise<Bestellung>
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

  const aendern = useCallback(
    async (id: string, aenderung: BestellAenderung) => {
      if (!schluessel) throw new NichtAngemeldet()
      try {
        const neu = await aendereBestellung(schluessel, id, aenderung)
        setBestellungen((alt) => alt.map((b) => (b.id === id ? neu : b)))
        return neu
      } catch (f) {
        if (f instanceof NichtAngemeldet) await abmelden()
        throw f
      }
    },
    [schluessel, abmelden],
  )

  const wert = useMemo(() => ({ bestellungen, laedt, fehler, neuLaden, aendern }), [bestellungen, laedt, fehler, neuLaden, aendern])
  return <BestellungenKontext.Provider value={wert}>{children}</BestellungenKontext.Provider>
}

export function useBestellungen(): Kontext {
  const k = useContext(BestellungenKontext)
  if (!k) throw new Error('useBestellungen ausserhalb von BestellungenProvider')
  return k
}
