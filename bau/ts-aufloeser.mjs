import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

/**
 * Laesst Node die Dateien unter api/ direkt ausfuehren.
 *
 * Zwei Dinge stehen dem im Weg. Das eine loest Node selbst, wenn es mit
 * --experimental-strip-types laeuft: die Typannotationen. Das andere ist
 * unsere eigene Konvention – die Importe dort enden auf ".js", obwohl die
 * Dateien ".ts" heissen. Das muss so sein, weil Node zur Laufzeit auf Vercel
 * die Endung verlangt und TypeScript sie beim Uebersetzen umrechnet. Fuer
 * einen Testlauf ohne Uebersetzungsschritt fehlt genau diese Umrechnung, und
 * ohne sie bricht der Import mit ERR_MODULE_NOT_FOUND ab.
 *
 * Hier wird sie nachgeholt: Zeigt ein relativer ".js"-Import auf nichts, aber
 * die gleichnamige ".ts"-Datei liegt daneben, wird diese genommen. Nur fuer
 * Tests – im Betrieb laeuft der uebersetzte Code.
 */
registerHooks({
  resolve(spezifikator, kontext, naechster) {
    if (spezifikator.startsWith('.') && kontext.parentURL) {
      // api/: ".js" meint die gleichnamige ".ts".
      // src/: gar keine Endung – dort loest sonst Vite auf.
      const kandidaten = spezifikator.endsWith('.js')
        ? [spezifikator.slice(0, -3) + '.ts']
        : [spezifikator + '.ts', spezifikator + '/index.ts']
      for (const kandidat of kandidaten) {
        const url = new URL(kandidat, kontext.parentURL)
        if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true }
      }
    }
    return naechster(spezifikator, kontext)
  },
})
