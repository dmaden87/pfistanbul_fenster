/**
 * Boras Preise von der Runde auf die Bestellungen.
 *
 * WARUM DIESE DATEI IN api/ LIEGT UND NICHT IN src/lib/: Die Dateien unter
 * src/ werden von Vite gebuendelt und importieren einander ohne
 * Dateiendung ("./bestellauftrag"). Das kann nur ein Bundler aufloesen. Die
 * API laeuft dagegen als gewoehnliches Node-Modul in einer Serverless-
 * Funktion, und dort ist ein endungsloser relativer Import schlicht ein
 * ERR_MODULE_NOT_FOUND – die Funktion stirbt beim Laden, noch bevor eine
 * Zeile Code laeuft.
 *
 * Genau das ist einmal passiert: Der Adminbereich zeigte nur noch "Status
 * 500" und keine einzige Bestellung, weil `api/lieferungen.ts` aus src/
 * importierte. Deshalb gilt hier die Regel: api/ importiert NIE aus src/.
 * `bau/api-test.mjs` prueft das bei jedem Testlauf nach, indem es jede
 * Funktion unter genau den Bedingungen laedt, die auch Vercel hat.
 *
 * Der Preis dafuer sind ein paar Zeilen, die es auch unter src/ gibt –
 * die Paketkennung, die Frachtregel, der Filter fuer ausgestiegene Zeilen.
 * `bau/einkauf-test.mjs` haelt beide Fassungen aneinander, damit sie nicht
 * auseinanderlaufen.
 */

interface Zeile {
  kennung: string
  herkunft?: { bestellungId: string; positionId: string; stueck: number }
  einkaufChf?: number
}

interface Runde {
  zeilen: Zeile[]
  entfernt?: { bestellungId: string }[]
  lieferkostenJePaket?: Record<string, number>
  lieferkostenChf?: number
}

/** Was fuer eine Bestellung aus der Runde herausfaellt. */
export interface EinkaufAnteil {
  bestellungId: string
  /** Einkaufspreis JE STUECK, nach Positionskennung. Wie `preisChf` auch. */
  jePosition: Record<string, number>
  lieferkostenChf?: number
  lieferkostenGeschaetzt: boolean
  /** Wie viele Zeilen dieser Bestellung noch ohne Preis sind. */
  ohnePreis: number
}

function runde2(x: number): number {
  return Math.round(x * 100) / 100
}

/** Die Paketkennung einer Bestellung. Muss zu src/lib/bestellauftrag passen. */
export function kennungFuer(b: { referenz: string; id: string }): string {
  return (b.referenz || b.id).toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

/** Die Fracht der Runde. Der Gesamtbetrag gilt vor den Einzelbetraegen. */
export function frachtGesamt(lieferung: Runde): number {
  const gesamt = lieferung.lieferkostenChf
  if (gesamt !== undefined && gesamt > 0) return gesamt
  return Object.values(lieferung.lieferkostenJePaket ?? {}).reduce((s, x) => s + x, 0)
}

/**
 * Die Zeilen, die noch zur Runde gehoeren.
 *
 * Zeilen ausgestiegener Bestellungen bleiben stehen – sie werden auf dem
 * Dokument durchgestrichen, damit Bora seine Preise an den gewohnten
 * Nummern wiederfindet. Gerechnet wird mit ihnen nicht mehr: Was nicht
 * bestellt wird, kostet nichts und bringt nichts.
 */
export function laufendeZeilen(lieferung: Runde): Zeile[] {
  const raus = new Set((lieferung.entfernt ?? []).map((a) => a.bestellungId))
  if (raus.size === 0) return lieferung.zeilen
  return lieferung.zeilen.filter((z) => !z.herkunft || !raus.has(z.herkunft.bestellungId))
}

/**
 * Die Einkaufszahlen je Bestellung einer Runde.
 *
 * Positionen mit Menge > 1 stehen in der Runde als mehrere Zeilen. Der
 * Positionspreis ist der Mittelwert ihrer Zeilen – normalerweise sind alle
 * gleich, aber wenn Bora fuer ein Stueck mehr verlangt, geht die Differenz
 * nicht verloren.
 *
 * DER FRACHTANTEIL. Ein Paket ist genau eine Bestellung, deshalb ist
 * `lieferkostenJePaket` bereits die Aufteilung. Nennt Bora nur ein Total,
 * wird nach Netzanzahl geteilt und als geschaetzt vermerkt. Nicht nach
 * Betrag: Fracht haengt am Volumen, nicht am Verkaufspreis.
 */
export function einkaufAusRunde(
  lieferung: Runde,
  /* Nur Referenz und Id – daraus wird die Paketkennung. */
  bestellungen: { id: string; referenz: string }[],
): EinkaufAnteil[] {
  const jeBestellung = new Map<string, { jePosition: Map<string, number[]>; ohnePreis: number; netze: number }>()

  for (const zeile of laufendeZeilen(lieferung)) {
    if (!zeile.herkunft) continue // Zusatzzeilen gehoeren zu keiner Bestellung.
    const { bestellungId, positionId } = zeile.herkunft
    const eintrag = jeBestellung.get(bestellungId) ?? { jePosition: new Map(), ohnePreis: 0, netze: 0 }
    jeBestellung.set(bestellungId, eintrag)
    eintrag.netze++
    if (typeof zeile.einkaufChf !== 'number') {
      eintrag.ohnePreis++
      continue
    }
    const bisher = eintrag.jePosition.get(positionId) ?? []
    bisher.push(zeile.einkaufChf)
    eintrag.jePosition.set(positionId, bisher)
  }

  const fracht = frachtGesamt(lieferung)
  const netzeGesamt = [...jeBestellung.values()].reduce((n, e) => n + e.netze, 0)

  return [...jeBestellung.entries()].map(([bestellungId, eintrag]) => {
    const bestellung = bestellungen.find((b) => b.id === bestellungId)
    const jePaket = bestellung ? lieferung.lieferkostenJePaket?.[kennungFuer(bestellung)] : undefined

    let anteil: number | undefined
    let geschaetzt = false
    if (typeof jePaket === 'number') {
      anteil = runde2(jePaket)
    } else if (fracht > 0 && netzeGesamt > 0) {
      anteil = runde2((fracht * eintrag.netze) / netzeGesamt)
      geschaetzt = true
    }

    const jePosition: Record<string, number> = {}
    for (const [positionId, preise] of eintrag.jePosition) {
      jePosition[positionId] = runde2(preise.reduce((s, x) => s + x, 0) / preise.length)
    }

    return {
      bestellungId,
      jePosition,
      lieferkostenChf: anteil,
      lieferkostenGeschaetzt: geschaetzt,
      ohnePreis: eintrag.ohnePreis,
    }
  })
}
