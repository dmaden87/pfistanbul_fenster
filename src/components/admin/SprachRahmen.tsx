import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { SPRACH_SPEICHER, SprachKontext, texteFuer, type AdminSprache } from './sprache'

/**
 * Haelt die gewaehlte Sprache des Adminbereichs.
 *
 * Eigene Datei, damit sprache.ts nur Daten und Funktionen enthaelt – das
 * Nachladen im Betrieb funktioniert sonst nicht zuverlaessig.
 */
export function SprachRahmen({ children }: { children: ReactNode }) {
  const [sprache, setzeSpracheRoh] = useState<AdminSprache>(() => {
    // Die Wahl bleibt erhalten: Ufuk soll sie nicht bei jedem Besuch neu
    // treffen muessen. Ein privates Fenster oder geleerte Browserdaten
    // faellt auf Deutsch zurueck, das ist kein Schaden.
    try {
      return localStorage.getItem(SPRACH_SPEICHER) === 'tuerkisch' ? 'tuerkisch' : 'deutsch'
    } catch {
      return 'deutsch'
    }
  })

  const setzeSprache = useCallback((s: AdminSprache) => {
    setzeSpracheRoh(s)
    try {
      localStorage.setItem(SPRACH_SPEICHER, s)
    } catch {
      // Ohne Speicher gilt die Wahl nur fuer diesen Besuch. Kein Grund abzubrechen.
    }
  }, [])

  useEffect(() => {
    // Damit Vorleseprogramme und die Rechtschreibpruefung die richtige
    // Sprache annehmen.
    document.documentElement.lang = sprache === 'tuerkisch' ? 'tr' : 'de'
    return () => {
      document.documentElement.lang = 'de'
    }
  }, [sprache])

  return (
    <SprachKontext.Provider
      value={{ sprache, setzeSprache, t: texteFuer(sprache), ort: sprache === 'tuerkisch' ? 'tr-TR' : 'de-CH' }}
    >
      {children}
    </SprachKontext.Provider>
  )
}
