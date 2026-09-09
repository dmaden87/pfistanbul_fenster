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
    if (spezifikator.startsWith('.') && spezifikator.endsWith('.js') && kontext.parentURL) {
      const alsTs = new URL(spezifikator.slice(0, -3) + '.ts', kontext.parentURL)
      if (existsSync(fileURLToPath(alsTs))) return { url: alsTs.href, shortCircuit: true }
    }
    return naechster(spezifikator, kontext)
  },
})
