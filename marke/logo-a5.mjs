/**
 * Erzeugt marke/pfistanbul-logo-a5.pdf aus marke/logo-a5.html.
 *
 * Aufruf: node marke/logo-a5.mjs
 *
 * Chromium bettet die Schrift ein und zeichnet das Zeichen als Kurven - das
 * Ergebnis ist ein echtes Vektor-PDF und laesst sich beliebig vergroessern.
 * Die PNG-Dateien in diesem Ordner koennen das nicht.
 */
import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ZIEL = 'marke/pfistanbul-logo-a5.pdf'

await new Promise((fertig, scheitern) => {
  const browser = spawn(
    CHROMIUM,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-pdf-header-footer',
      // Ohne Wartezeit ist die Schrift noch nicht geladen und der Name kaeme
      // in einer Ersatzschrift heraus, ohne dass etwas fehlschlaegt.
      '--virtual-time-budget=5000',
      `--print-to-pdf=${ZIEL}`,
      `file://${process.cwd()}/marke/logo-a5.html`,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  )
  browser.on('error', scheitern)
  browser.on('close', (code) => (code === 0 ? fertig() : scheitern(new Error(`Chromium endete mit ${code}.`))))
})

const { size } = await stat(ZIEL)
console.log(`${ZIEL}: ${Math.round(size / 1024)} kB`)
