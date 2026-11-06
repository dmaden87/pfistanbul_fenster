import { tresor } from '@/lib/tresor'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { anmelden as serverAnmelden, type Anmeldung } from './api'

/**
 * Wer angemeldet ist – fuer die ganze App.
 *
 * Der Schluessel liegt im geschuetzten Speicher des Geraets (SecureStore:
 * Android Keystore, iOS Keychain), nie im normalen App-Speicher. So bleibt
 * man angemeldet, bis der Schluessel abläuft (30 Tage) oder man sich abmeldet.
 */
const SPEICHER = 'pf-admin-anmeldung'

type Stand = 'laedt' | 'abgemeldet' | 'angemeldet'

interface Kontext {
  stand: Stand
  schluessel: string | null
  anmelden: (passwort: string) => Promise<void>
  abmelden: () => Promise<void>
}

const AnmeldungKontext = createContext<Kontext | null>(null)

function gueltig(a: Anmeldung | null): a is Anmeldung {
  return Boolean(a && Date.parse(a.gueltigBis) > Date.now())
}

export function AnmeldungProvider({ children }: { children: ReactNode }) {
  const [anmeldung, setAnmeldung] = useState<Anmeldung | null>(null)
  const [geladen, setGeladen] = useState(false)

  useEffect(() => {
    tresor.lesen(SPEICHER)
      .then((roh) => {
        const gespeichert = roh ? (JSON.parse(roh) as Anmeldung) : null
        if (gueltig(gespeichert)) setAnmeldung(gespeichert)
      })
      .catch(() => {})
      .finally(() => setGeladen(true))
  }, [])

  const anmelden = useCallback(async (passwort: string) => {
    const neu = await serverAnmelden(passwort)
    await tresor.schreiben(SPEICHER, JSON.stringify(neu))
    setAnmeldung(neu)
  }, [])

  const abmelden = useCallback(async () => {
    await tresor.loeschen(SPEICHER).catch(() => {})
    setAnmeldung(null)
  }, [])

  const wert = useMemo<Kontext>(
    () => ({
      stand: !geladen ? 'laedt' : gueltig(anmeldung) ? 'angemeldet' : 'abgemeldet',
      schluessel: gueltig(anmeldung) ? anmeldung.schluessel : null,
      anmelden,
      abmelden,
    }),
    [geladen, anmeldung, anmelden, abmelden],
  )

  return <AnmeldungKontext.Provider value={wert}>{children}</AnmeldungKontext.Provider>
}

export function useAnmeldung(): Kontext {
  const k = useContext(AnmeldungKontext)
  if (!k) throw new Error('useAnmeldung ausserhalb von AnmeldungProvider')
  return k
}
