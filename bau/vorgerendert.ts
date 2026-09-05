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
        await writeFile(join(ziel, name), html)
      }
    },
  }
}
