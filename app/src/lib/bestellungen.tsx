import { abschlussSchritte } from '@pf/lib/pl'
import type { Abrechnung, AbrechnungAenderung, Auslage, BestellAenderung, Bestellung } from '@pf/types'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { offerteLink } from '@pf/lib/nachrichten'
import * as api from './api'
import { aendereBestellung, holeOfferteGeheimnis, ladeAbrechnungen, ladeAuslagen, ladeBestellungen, NichtAngemeldet } from './api'
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
  /** Betriebskosten und Abrechnungen – fuer die Zahlen (src/lib/pl.ts). */
  auslagen: Auslage[]
  abrechnungen: Abrechnung[]
  laedt: boolean
  fehler: string | null
  neuLaden: () => Promise<void>
  /** Wirft bei einem Fehler; die Meldung ist fuer Menschen geschrieben. */
  aendern: (id: string, aenderung: BestellAenderung) => Promise<Bestellung>
  /** Der Link zu Offerte bzw. Quittung – wird beim ersten Mal angelegt. */
  offerteLinkFuer: (id: string) => Promise<string>
  /** Betriebsausgaben erfassen, aendern, loeschen. */
  auslageAnlegen: (a: Omit<Auslage, 'id' | 'erfasstAm'>) => Promise<Auslage>
  auslageAendern: (id: string, teil: Partial<Auslage>) => Promise<Auslage>
  auslageEntfernen: (id: string) => Promise<void>
  /** Abrechnung: Entwurf anlegen, abschliessen (mit allem, was dazugehoert), verwerfen. */
  abrechnungAnlegen: (a: Omit<Abrechnung, 'id' | 'erstelltAm' | 'erledigtAm'>) => Promise<Abrechnung>
  abrechnungAbschliessen: (a: Abrechnung) => Promise<void>
  abrechnungVerwerfen: (id: string) => Promise<void>
  abrechnungAendern: (id: string, teil: AbrechnungAenderung) => Promise<Abrechnung>
}

const BestellungenKontext = createContext<Kontext | null>(null)

export function BestellungenProvider({ children }: { children: ReactNode }) {
  const { schluessel, abmelden } = useAnmeldung()
  const [bestellungen, setBestellungen] = useState<Bestellung[]>([])
  const [auslagen, setAuslagen] = useState<Auslage[]>([])
  const [abrechnungen, setAbrechnungen] = useState<Abrechnung[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  const neuLaden = useCallback(async () => {
    if (!schluessel) return
    setLaedt(true)
    try {
      // Alles auf einmal: Die Zahlen rechnen aus allen drei, und ein Stand,
      // in dem die Bestellungen neu sind und die Abrechnungen alt, rechnet
      // bereits Bezahltes noch einmal als offen.
      const [b, a, ab] = await Promise.all([ladeBestellungen(schluessel), ladeAuslagen(schluessel), ladeAbrechnungen(schluessel)])
      setBestellungen(b)
      setAuslagen(a)
      setAbrechnungen(ab)
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

  const offerteLinkFuer = useCallback(
    async (id: string) => {
      if (!schluessel) throw new NichtAngemeldet()
      try {
        const geheim = await holeOfferteGeheimnis(schluessel, id)
        setBestellungen((alt) => alt.map((b) => (b.id === id ? { ...b, offerteGeheim: geheim } : b)))
        return offerteLink(geheim)
      } catch (f) {
        if (f instanceof NichtAngemeldet) await abmelden()
        throw f
      }
    },
    [schluessel, abmelden],
  )

  /** Jeder Aufruf mit Schluessel; ein abgelaufener meldet ab. */
  const mitSchluessel = useCallback(
    async <T,>(lauf: (k: string) => Promise<T>): Promise<T> => {
      if (!schluessel) throw new NichtAngemeldet()
      try {
        return await lauf(schluessel)
      } catch (f) {
        if (f instanceof NichtAngemeldet) await abmelden()
        throw f
      }
    },
    [schluessel, abmelden],
  )

  const auslageAnlegen = useCallback(
    async (a: Omit<Auslage, 'id' | 'erfasstAm'>) => {
      const neu = await mitSchluessel((k) => api.legeAuslageAn(k, a))
      setAuslagen((l) => [neu, ...l])
      return neu
    },
    [mitSchluessel],
  )
  const auslageAendern = useCallback(
    async (id: string, teil: Partial<Auslage>) => {
      const neu = await mitSchluessel((k) => api.aendereAuslage(k, id, teil))
      setAuslagen((l) => l.map((x) => (x.id === id ? neu : x)))
      return neu
    },
    [mitSchluessel],
  )
  const auslageEntfernen = useCallback(
    async (id: string) => {
      await mitSchluessel((k) => api.entferneAuslage(k, id))
      setAuslagen((l) => l.filter((x) => x.id !== id))
    },
    [mitSchluessel],
  )
  const abrechnungAnlegen = useCallback(
    async (a: Omit<Abrechnung, 'id' | 'erstelltAm' | 'erledigtAm'>) => {
      const neu = await mitSchluessel((k) => api.legeAbrechnungAn(k, a))
      setAbrechnungen((l) => [neu, ...l])
      return neu
    },
    [mitSchluessel],
  )
  const abrechnungAendern = useCallback(
    async (id: string, teil: AbrechnungAenderung) => {
      const neu = await mitSchluessel((k) => api.aendereAbrechnung(k, id, teil))
      setAbrechnungen((l) => l.map((x) => (x.id === id ? neu : x)))
      return neu
    },
    [mitSchluessel],
  )
  const abrechnungVerwerfen = useCallback(
    async (id: string) => {
      await mitSchluessel((k) => api.entferneAbrechnung(k, id))
      setAbrechnungen((l) => l.filter((x) => x.id !== id))
    },
    [mitSchluessel],
  )
  /*
   * ABSCHLIESSEN: erst die Posten auf bezahlt, dann die Abrechnung erledigt –
   * wie im Web (ZahlenPage.tsx), mit denselben Schritten aus pl.ts. Geht
   * zwischendurch etwas schief, bleibt die Abrechnung offen und laesst sich
   * nochmals abschliessen; das Wiederholen setzt dieselben Werte.
   */
  const abrechnungAbschliessen = useCallback(
    async (a: Abrechnung) => {
      const schritte = abschlussSchritte(a, bestellungen)
      for (const id of schritte.auslagen) {
        const neu = await mitSchluessel((k) => api.aendereAuslage(k, id, { bezahlt: true }))
        setAuslagen((l) => l.map((x) => (x.id === id ? neu : x)))
      }
      for (const { bestellungId, kosten } of schritte.kosten) {
        const neu = await mitSchluessel((k) => aendereBestellung(k, bestellungId, { kosten }))
        setBestellungen((l) => l.map((x) => (x.id === bestellungId ? neu : x)))
      }
      const fertig = await mitSchluessel((k) => api.aendereAbrechnung(k, a.id, { erledigt: true }))
      setAbrechnungen((l) => l.map((x) => (x.id === a.id ? fertig : x)))
    },
    [mitSchluessel, bestellungen],
  )

  const wert = useMemo(
    () => ({
      bestellungen, auslagen, abrechnungen, laedt, fehler, neuLaden, aendern, offerteLinkFuer,
      auslageAnlegen, auslageAendern, auslageEntfernen,
      abrechnungAnlegen, abrechnungAbschliessen, abrechnungVerwerfen, abrechnungAendern,
    }),
    [
      bestellungen, auslagen, abrechnungen, laedt, fehler, neuLaden, aendern, offerteLinkFuer,
      auslageAnlegen, auslageAendern, auslageEntfernen,
      abrechnungAnlegen, abrechnungAbschliessen, abrechnungVerwerfen, abrechnungAendern,
    ],
  )
  return <BestellungenKontext.Provider value={wert}>{children}</BestellungenKontext.Provider>
}

export function useBestellungen(): Kontext {
  const k = useContext(BestellungenKontext)
  if (!k) throw new Error('useBestellungen ausserhalb von BestellungenProvider')
  return k
}
