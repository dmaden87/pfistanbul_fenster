/**
 * Der Aufloeser, den Vercel fuer die Serverless-Funktionen mitbringt – und
 * NUR der: Ein relativer Import auf ".js" darf die danebenliegende
 * ".ts"-Datei meinen.
 *
 * Bewusst ohne die endungslose Aufloesung aus bau/ts-aufloeser.mjs. Die
 * gehoert zu Vite und gilt nur unter src/; wer sie auch beim Pruefen der
 * API einschaltet, merkt nie, dass eine Funktion in Produktion gar nicht
 * startet. Genau so ist der Adminbereich einmal auf "Status 500" gelaufen.
 */
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

registerHooks({
  resolve(spezifizierer, kontext, weiter) {
    if (spezifizierer.startsWith('.') && spezifizierer.endsWith('.js')) {
      const alsTs = spezifizierer.replace(/\.js$/, '.ts')
      try {
        if (existsSync(fileURLToPath(new URL(alsTs, kontext.parentURL)))) {
          return weiter(alsTs, kontext)
        }
      } catch {
        // Kein aufloesbarer Pfad – dann eben der urspruengliche Versuch.
      }
    }
    return weiter(spezifizierer, kontext)
  },
})
