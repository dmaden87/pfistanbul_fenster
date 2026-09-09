import type { Bestellung, BestellPosition, ZeilenHerkunft } from '../types'
import { zeilenSchluessel } from './bestellauftrag'

/**
 * Eine Zeile der Lieferrunde bearbeiten – und damit die Bestellung dahinter.
 *
 * Der schwierige Teil sind Positionen mit Menge > 1. In der Bestellung steht
 * "3 × Zimmer" als EINE Zeile; in der Runde sind es drei. Wird eines dieser
 * drei geaendert, kann die gemeinsame Zeile nicht bleiben.
 *
 * Geloest wird das, indem die Position beim ersten Eingriff in einzelne
 * Positionen zu je einem Stueck zerfaellt. Der naheliegende Weg – die Menge
 * um eins senken und eine neue Zeile anhaengen – waere kuerzer und waere
 * falsch: Eine Runde merkt sich ausgeschlossene Netze ueber
 * `positionId#stueck`, und nach so einem Eingriff zeigten diese Merkstellen
 * auf Stuecke, die es nicht mehr gibt. Ein ausgeschlossenes Netz waere
 * stillschweigend wieder dabei.
 *
 * Deshalb liefert jede Aenderung ausser den neuen Positionen auch eine
 * Umbenennung: welcher alte Schluessel jetzt welcher neue ist.
 */

export interface Ergebnis {
  positionen: BestellPosition[]
  /** Alte Ausschluss-Schluessel auf neue. Leer, wenn sich nichts verschoben hat. */
  umbenennung: Record<string, string>
}

function neueId(): string {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

function idVon(position: BestellPosition, index: number): string {
  return position.id ?? `#${index}`
}

function finde(bestellung: Bestellung, herkunft: ZeilenHerkunft): number {
  return bestellung.positionen.findIndex((p, i) => idVon(p, i) === herkunft.positionId)
}

/**
 * Zerlegt eine Position in einzelne Positionen zu je einem Stueck und sagt,
 * welcher Schluessel jetzt welcher ist.
 */
function zerlegen(
  bestellung: Bestellung,
  index: number,
): { teile: BestellPosition[]; umbenennung: Record<string, string> } {
  const position = bestellung.positionen[index]
  const alteId = idVon(position, index)
  const teile: BestellPosition[] = []
  const umbenennung: Record<string, string> = {}

  for (let stueck = 0; stueck < position.menge; stueck++) {
    const id = stueck === 0 ? alteId : neueId()
    teile.push({ ...position, id, menge: 1 })
    umbenennung[zeilenSchluessel({ bestellungId: bestellung.id, positionId: alteId, stueck })] = zeilenSchluessel({
      bestellungId: bestellung.id,
      positionId: id,
      stueck: 0,
    })
  }
  return { teile, umbenennung }
}

/** Ersetzt Position und Stueck durch die geaenderten Werte. */
export function zeileAendern(
  bestellung: Bestellung,
  herkunft: ZeilenHerkunft,
  aenderung: Partial<BestellPosition>,
): Ergebnis {
  const index = finde(bestellung, herkunft)
  if (index < 0) return { positionen: bestellung.positionen, umbenennung: {} }

  const position = bestellung.positionen[index]
  if (position.menge === 1) {
    const positionen = [...bestellung.positionen]
    positionen[index] = { ...position, ...aenderung, menge: 1 }
    return { positionen, umbenennung: {} }
  }

  const { teile, umbenennung } = zerlegen(bestellung, index)
  teile[herkunft.stueck] = { ...teile[herkunft.stueck], ...aenderung, menge: 1 }
  return {
    positionen: [...bestellung.positionen.slice(0, index), ...teile, ...bestellung.positionen.slice(index + 1)],
    umbenennung,
  }
}

/**
 * Entfernt das Netz aus der BESTELLUNG. Etwas anderes als das Entfernen aus
 * der Lieferrunde – hier bekommt die Kundschaft dieses Netz nicht mehr.
 */
export function zeileEntfernen(bestellung: Bestellung, herkunft: ZeilenHerkunft): Ergebnis {
  const index = finde(bestellung, herkunft)
  if (index < 0) return { positionen: bestellung.positionen, umbenennung: {} }

  const position = bestellung.positionen[index]
  if (position.menge === 1) {
    return { positionen: bestellung.positionen.filter((_, i) => i !== index), umbenennung: {} }
  }

  const { teile, umbenennung } = zerlegen(bestellung, index)
  const bleiben = teile.filter((_, i) => i !== herkunft.stueck)
  // Der Schluessel des geloeschten Stuecks zeigt auf nichts mehr.
  delete umbenennung[zeilenSchluessel({ ...herkunft, positionId: idVon(position, index) })]
  return {
    positionen: [...bestellung.positionen.slice(0, index), ...bleiben, ...bestellung.positionen.slice(index + 1)],
    umbenennung,
  }
}

/** Wendet eine Umbenennung auf die Ausschlussliste einer Runde an. */
export function schluesselUmbenennen(ausgeschlossen: string[], umbenennung: Record<string, string>): string[] {
  if (Object.keys(umbenennung).length === 0) return ausgeschlossen
  // Ein Schluessel, fuer den es keine Entsprechung mehr gibt, faellt weg –
  // sein Netz existiert nicht mehr.
  return ausgeschlossen.map((s) => umbenennung[s] ?? s).filter((s) => s !== undefined)
}
