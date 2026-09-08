import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Plugin } from 'vite'

/**
 * Setzt die vorgerenderten Seiten in den Build ein.
 *
 * WARUM ZWEI SCHRITTE: Das Vorabrendern braucht einen Browser, und auf den
 * Bauservern von Vercel gibt es keinen. Gerendert wird deshalb hier, das
 * Ergebnis liegt als fertiges HTML im Repository (Ordner `vorgerendert/`) -
 * genau wie die Flyer-PDFs und die Instagram-Bilder auch. Vercel kopiert es
 * nur noch.
 *
 * DIE GEFAHR DABEI ist eine veraltete Kopie: Aendert jemand den Code, ohne
 * neu zu rendern, zeigt die ausgelieferte Datei auf Bundle-Dateien, die es
 * gar nicht mehr gibt - die Seite bliebe weiss. Deshalb prueft dieses Plugin
 * die Verweise und laesst den Build lieber scheitern, als eine kaputte Seite
 * auszuliefern.
 */

const ORDNER = 'vorgerendert'

/** Die Bundle-Dateien, auf die eine Seite verweist. */
function verweise(html: string): string[] {
  return [...html.matchAll(/\/assets\/[A-Za-z0-9._-]+/g)].map((treffer) => treffer[0]).sort()
}

/** Die strukturierten Daten einer Seite, als vergleichbare Knotenliste. */
function knoten(html: string): Record<string, unknown>[] {
  const roh = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1]
  if (!roh) return []
  try {
    return (JSON.parse(roh)['@graph'] as Record<string, unknown>[]) ?? []
  } catch {
    return []
  }
}

/**
 * Die Kopfangaben einer Seite, auf ihren Kern reduziert.
 *
 * Verglichen wird nicht der Text der Tags - Browser serialisieren anders als
 * die Quelldatei -, sondern was ein Tag AUSSAGT: bei <link> das Verhaeltnis
 * und das Ziel, bei <meta> der Name und der Inhalt.
 *
 * Ausgenommen sind die Angaben, die sich pro Seite unterscheiden SOLLEN.
 * Die setzt die Anwendung zur Laufzeit (src/lib/adresse.ts), damit
 * /impressum seinen eigenen Titel und canonical-Verweis traegt.
 */
const PRO_SEITE = new Set(['canonical', 'description', 'og:title', 'og:description', 'og:url'])

function kopfangaben(html: string): string[] {
  const kopf = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? ''
  const merkmal = (tag: string) => {
    const attribut = (name: string) => new RegExp(`\\b${name}=["']([^"']*)["']`, 'i').exec(tag)?.[1]
    if (/^<link/i.test(tag)) {
      const rel = attribut('rel') ?? ''
      return PRO_SEITE.has(rel) ? null : `link ${rel} ${attribut('href') ?? ''} ${attribut('sizes') ?? ''}`.trim()
    }
    const name = attribut('name') ?? attribut('property') ?? ''
    if (!name || PRO_SEITE.has(name)) return null
    return `meta ${name} ${attribut('content') ?? ''}`.trim()
  }
  return [...kopf.matchAll(/<(?:link|meta)\b[^>]*>/gi)]
    .map((t) => merkmal(t[0]))
    .filter((t): t is string => t !== null)
    .sort()
}

export function vorgerendertEinsetzen(): Plugin {
  return {
    name: 'pfistanbul-vorgerendert',
    apply: 'build',

    async closeBundle() {
      // Beim Rendern selbst muss das hier ausbleiben, sonst rendern wir das
      // Ergebnis des letzten Laufs erneut statt der frischen Huelle.
      if (process.env.PFISTANBUL_VORRENDERN === '1') {
        this.warn('Vorgerenderte Seiten werden diesmal nicht eingesetzt (Renderlauf).')
        return
      }

      const ziel = 'dist'
      const frisch = verweise(await readFile(join(ziel, 'index.html'), 'utf8'))

      let dateien: string[]
      try {
        dateien = (await readdir(ORDNER)).filter((name) => name.endsWith('.html'))
      } catch {
        throw new Error(
          `Der Ordner ${ORDNER}/ fehlt. Ohne ihn haben Impressum, AGB und Datenschutz keine ` +
            'eigene Adresse. Einmal `npm run vorrendern` ausfuehren und das Ergebnis mit einchecken.',
        )
      }
      if (dateien.length === 0) throw new Error(`${ORDNER}/ ist leer. Bitte \`npm run vorrendern\` ausfuehren.`)

      /*
       * Zweite Probe, und sie hat ihren Preis in Lehrgeld: Die Verweisprobe
       * allein reicht NICHT. Aendert man nur die erzeugten Kopfdaten - etwa
       * die strukturierten Daten in maschinenlesbar.ts -, bleiben die
       * Bundle-Namen gleich. Die veraltete Kopie ueberschrieb dann still die
       * frische, und die Korrektur landete nie auf der Seite. Aufgefallen ist
       * es nur, weil eine andere Pruefung nach den Bildern fragte.
       *
       * Verglichen wird deshalb auch der Inhalt: Jeder Knoten der abgelegten
       * Seite muss unveraendert im frischen Build vorkommen. Rechtsseiten
       * tragen bewusst nur einen Teil des Graphen - deshalb "enthalten" und
       * nicht "gleich".
       */
      const frischesIndex = await readFile(join(ziel, 'index.html'), 'utf8')
      const frischeKnoten = new Set(knoten(frischesIndex).map((k) => JSON.stringify(k)))
      const frischerKopf = kopfangaben(frischesIndex)

      for (const name of dateien) {
        const html = await readFile(join(ORDNER, name), 'utf8')
        const alt = verweise(html)
        if (alt.join('|') !== frisch.join('|')) {
          throw new Error(
            `${ORDNER}/${name} ist veraltet: Die Seite verweist auf ${alt.join(', ') || '(nichts)'}, ` +
              `dieser Build erzeugt aber ${frisch.join(', ')}. Wuerde die Datei so ausgeliefert, ` +
              'bliebe die Seite weiss. Bitte `npm run vorrendern` ausfuehren und neu einchecken.',
          )
        }

        /*
         * Dritte Probe. Die ersten beiden griffen nicht, als nur die
         * Kopfangaben wechselten - beim Ergaenzen der Symbole blieben
         * Bundle-Namen und strukturierte Daten gleich, und die veraltete
         * Kopie waere ohne die neuen Verweise ausgeliefert worden.
         */
        const fehlend = frischerKopf.filter((eintrag) => !kopfangaben(html).includes(eintrag))
        if (fehlend.length > 0) {
          throw new Error(
            `${ORDNER}/${name} fehlen Kopfangaben aus diesem Build: ${fehlend.join(' | ')}. ` +
              'Bitte `npm run vorrendern` ausfuehren und neu einchecken.',
          )
        }

        const fremd = knoten(html).filter((k) => !frischeKnoten.has(JSON.stringify(k)))
        if (fremd.length > 0) {
          const namen = fremd.map((k) => (k.name as string) ?? (k['@type'] as string)).join(', ')
          throw new Error(
            `${ORDNER}/${name} hat veraltete strukturierte Daten (${namen}). Dieser Build erzeugt ` +
              'andere. Bitte `npm run vorrendern` ausfuehren und neu einchecken.',
          )
        }

        await writeFile(join(ziel, name), html)
      }
    },
  }
}
