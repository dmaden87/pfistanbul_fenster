/**
 * Rendert eine der Instagram-Tafeln zu einem fertigen Beitragsbild.
 *
 * Aufruf: node instagram/tafel.mjs <name>       z. B. livegang, preistafel, titelbild
 *
 * Bis jetzt liefen diese Tafeln von Hand durch den Browser, und wie genau,
 * stand nirgends. Das hier ist derselbe Weg, nur aufschreibbar.
 *
 * WARUM UEBER DEN BROWSER: librsvg ignoriert eingebettete woff2-Schriften
 * stillschweigend - der Text kaeme in einer Ersatzschrift heraus, ohne dass
 * etwas fehlschlaegt. Steht ausfuehrlicher in marke/LIESMICH.md.
 *
 * WARUM GROESSER GERENDERT UND DANN GESCHNITTEN: Bei einem Fenster von genau
 * der Zielgroesse skaliert Chromium die Darstellung auf rund 87 Prozent, und
 * der untere Rand laeuft aus dem Bild - ohne dass irgendetwas fehlschlaegt.
 * Mit Luft nach unten stimmt der Massstab.
 */
import { spawn } from 'node:child_process'
import { closeSync, openSync } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const BREITE = 1080
const HOEHE = 1350
const FENSTERHOEHE = 1700

const name = process.argv[2]
if (!name) throw new Error('Aufruf: node instagram/tafel.mjs <name>   (ohne .html)')

const ordner = await mkdtemp(join(tmpdir(), 'tafel-'))
const roh = join(ordner, 'roh.png')
const kanal = openSync(roh, 'w')

await new Promise((fertig, scheitern) => {
  const browser = spawn(
    CHROMIUM,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--user-data-dir=${join(ordner, 'profil')}`,
      `--window-size=${BREITE},${FENSTERHOEHE}`,
      // Ohne Wartezeit sind die Schriften noch nicht geladen.
      '--virtual-time-budget=5000',
      `--screenshot=${roh}`,
      `file://${process.cwd()}/instagram/${name}.html`,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  )
  browser.on('error', scheitern)
  browser.on('close', (code) => (code === 0 ? fertig() : scheitern(new Error(`Chromium endete mit ${code}.`))))
})
closeSync(kanal)

const { width, height } = await sharp(roh).metadata()
if (width !== BREITE || height !== FENSTERHOEHE) {
  throw new Error(`Chromium lieferte ${width}×${height} statt ${BREITE}×${FENSTERHOEHE}.`)
}

const ziel = `instagram/beitrag-${name}.jpg`
await sharp(roh)
  .extract({ left: 0, top: 0, width: BREITE, height: HOEHE })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(ziel)
await rm(ordner, { recursive: true, force: true })

const { size } = await stat(ziel)
console.log(`${ziel}: ${BREITE}×${HOEHE}, ${Math.round(size / 1024)} kB`)
