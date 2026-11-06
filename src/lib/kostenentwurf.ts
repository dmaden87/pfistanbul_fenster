import type { Beteiligter, Bestellung, KostenArt, KostenPosten } from '../types'
import { einfuhrsteuerChf, herstellungFuer } from './kosten'
import { betragOderNull } from './format'

/*
 * Die Kosten einer Bestellung erfassen – die Regeln ohne Oberflaeche.
 *
 * WARUM HIER: Der Kosten-Editor im Web-Admin (zahlen/KostenEditor.tsx) und
 * die native App erfassen dieselben Posten. Vorbelegung, Schaetzung und was
 * gespeichert wird, duerfen nur an einer Stelle stehen. Die Begruendungen
 * stehen im Kopf von KostenEditor.tsx; getestet in bau/preisregeln-test.mjs.
 */

/** Die festen Posten, die jede Bestellung hat. Dazu beliebig viele "weitere". */
export const FESTE_KOSTEN: KostenArt[] = ['herstellung', 'lieferung', 'mwst']

/** Wer einen Posten ausgelegt haben kann. */
export const KOSTEN_TRAEGER: Beteiligter[] = ['bora', 'ufuk', 'deniz']

/**
 * Eine Zeile im Editor: der Posten plus der getippte Text (damit "12'345.67"
 * nicht verloren geht, solange jemand tippt) und die Markierung `neu` fuer
 * "noch geschaetzt, nicht gespeichert".
 */
export type KostenZeile = KostenPosten & { neu?: boolean; betragText: string }

export function neueKostenId(): string {
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Die Vorbelegung: was gespeichert ist; fehlt ein fester Posten, mit der
 * Schaetzung aus der Formel und `neu: true`.
 */
export function kostenStart(b: Bestellung): KostenZeile[] {
  const geschaetzteHerstellung = herstellungFuer(b.positionen)
  const vorhanden = b.kosten ?? []
  const mitText = (k: KostenPosten): KostenZeile => ({ ...k, betragText: String(k.betragChf) })
  const zeilen: KostenZeile[] = []
  for (const art of FESTE_KOSTEN) {
    const treffer = vorhanden.filter((k) => k.art === art)
    if (treffer.length > 0) {
      zeilen.push(...treffer.map(mitText))
      continue
    }
    const betrag = art === 'herstellung' ? geschaetzteHerstellung : art === 'mwst' ? einfuhrsteuerChf(geschaetzteHerstellung) : 0
    zeilen.push({ id: neueKostenId(), art, betragChf: betrag, betragText: betrag > 0 ? String(betrag) : '', traeger: 'bora', erfasstAm: '', neu: true })
  }
  // Wie bisher im Web-Admin: nur die festen Posten und die weiteren.
  zeilen.push(...vorhanden.filter((k) => k.art === 'weiteres').map(mitText))
  return zeilen
}

/** Ein weiterer Posten, standardmaessig von Deniz ausgelegt. */
export function weitererKostenposten(): KostenZeile {
  return { id: neueKostenId(), art: 'weiteres', bezeichnung: '', betragChf: 0, betragText: '', traeger: 'deniz', erfasstAm: '' }
}

export const kostenBetrag = (k: { betragText: string }) => betragOderNull(k.betragText)

/**
 * Was gespeichert wird. Leere Zeilen fliegen raus – ausser die Herstellung:
 * Dort ist die Null eine Aussage ("kostet uns nichts"). `neu` gehoert nicht
 * in den Datensatz; jeder Posten wird neu aufgebaut statt kopiert.
 */
export function kostenZumSpeichern(zeilen: KostenZeile[]): KostenPosten[] {
  return zeilen
    .filter((k) => kostenBetrag(k) > 0 || k.art === 'herstellung')
    .map((k) => ({
      id: k.id,
      art: k.art,
      ...(k.bezeichnung ? { bezeichnung: k.bezeichnung } : {}),
      betragChf: kostenBetrag(k),
      traeger: k.traeger,
      ...(k.bezahlt ? { bezahlt: true } : {}),
      ...(k.am ? { am: k.am } : {}),
      erfasstAm: k.erfasstAm,
    }))
}
