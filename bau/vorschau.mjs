/**
 * Rendert das Vorschaubild fuer geteilte Links.
 *
 * Aufruf: node bau/vorschau.mjs
 *
 * Ueber den Browser und nicht ueber sharp, weil sonst die Schrift nicht
 * stimmt - die Begruendung steht in bau/vorschau.html. Das PNG aus Chromium
 * geht anschliessend durch sharp, damit aus rund einem Megabyte ein Bild
 * wird, das ein Chat auch ueber Mobilfunk laedt.
 */
import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const BREITE = 1200
const HOEHE = 630
const ZIEL = 'public/vorschau.jpg'

/*
 * Bewusst hoeher rendern als gebraucht und danach zuschneiden. Bei einem
 * Fenster von genau 1200 x 630 skaliert Chromium die Darstellung auf rund
 * 87 Prozent - das Preisband lief dabei unten aus dem Bild, ohne dass etwas
 * fehlschlug. Mit Luft nach unten stimmt der Massstab, und der Zuschnitt ist
 * eine reine Rechnung.
 */
const FENSTERHOEHE = 900

const ordner = await mkdtemp(join(tmpdir(), 'vorschau-'))
const roh = join(ordner, 'roh.png')

execFileSync(CHROMIUM, [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  `--window-size=${BREITE},${FENSTERHOEHE}`,
  // Ohne Wartezeit sind die Schriften noch nicht geladen und der Text kaeme
  // in der Ersatzschrift heraus.
  '--virtual-time-budget=4000',
  `--screenshot=${roh}`,
  `file://${process.cwd()}/bau/vorschau.html`,
])

const { width, height } = await sharp(roh).metadata()
if (width !== BREITE || height !== FENSTERHOEHE) {
  throw new Error(`Chromium lieferte ${width}×${height} statt ${BREITE}×${FENSTERHOEHE}.`)
}

await sharp(roh)
  .extract({ left: 0, top: 0, width: BREITE, height: HOEHE })
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(ZIEL)
await rm(ordner, { recursive: true, force: true })

const { size } = await stat(ZIEL)
console.log(`${ZIEL}: ${BREITE}×${HOEHE}, ${Math.round(size / 1024)} kB`)
