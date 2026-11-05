/**
 * Erzeugt den Satz an Symbolen aus public/favicon.svg.
 *
 * Aufruf: node bau/favicon.mjs
 *
 * WARUM MEHR ALS DIE SVG-DATEI: Google holt sich das Symbol entweder ueber
 * das <link rel="icon"> oder direkt unter /favicon.ico - und empfiehlt eine
 * quadratische Rastergrafik in einem Vielfachen von 48 Pixeln. Eine SVG-Datei
 * hat keine Pixelgroesse; sie allein wird in der Suche haeufig nicht
 * angezeigt. Deshalb liegt beides daneben.
 *
 * Die .ico-Datei baut dieses Skript von Hand zusammen: sharp kann das Format
 * nicht schreiben. Eine .ico ist ein simpler Behaelter - ein Kopf, ein
 * Eintrag je Groesse, danach die PNG-Daten am Stueck.
 */
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const QUELLE = 'public/favicon.svg'
const svg = await readFile(QUELLE)

/** Eine Groesse als PNG-Puffer. */
const png = (groesse) => sharp(svg, { density: 384 }).resize(groesse, groesse).png({ compressionLevel: 9 }).toBuffer()

// Fuer die Seite: 48 ist Googles empfohlene Groesse, 96 deren Vielfaches,
// 180 ist das, was iOS fuer den Startbildschirm nimmt.
for (const groesse of [48, 96, 180]) {
  const name = groesse === 180 ? 'public/apple-touch-icon.png' : `public/favicon-${groesse}.png`
  await writeFile(name, await png(groesse))
  console.log(`${name.padEnd(32)} ${groesse}×${groesse}`)
}

/*
 * Die .ico enthaelt 16, 32 und 48 Pixel. 16 fuer den Browsertab, 48 fuer
 * Google. Der Aufbau: 6 Byte Kopf, dann je 16 Byte Eintrag, dann die Bilder.
 */
const groessen = [16, 32, 48]
const bilder = await Promise.all(groessen.map(png))

const kopf = Buffer.alloc(6)
kopf.writeUInt16LE(0, 0) // reserviert
kopf.writeUInt16LE(1, 2) // 1 = Symbol
kopf.writeUInt16LE(groessen.length, 4)

let offset = 6 + groessen.length * 16
const eintraege = groessen.map((groesse, i) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(groesse, 0) // Breite
  e.writeUInt8(groesse, 1) // Hoehe
  e.writeUInt8(0, 2) // Farbanzahl, 0 = mehr als 256
  e.writeUInt8(0, 3) // reserviert
  e.writeUInt16LE(1, 4) // Ebenen
  e.writeUInt16LE(32, 6) // Bit je Bildpunkt
  e.writeUInt32LE(bilder[i].length, 8)
  e.writeUInt32LE(offset, 12)
  offset += bilder[i].length
  return e
})

await writeFile('public/favicon.ico', Buffer.concat([kopf, ...eintraege, ...bilder]))
console.log(`public/favicon.ico              ${groessen.join(', ')} px`)

/*
 * Symbole fuer die Admin-App (public/admin.webmanifest). Android verlangt
 * 192 und 512 Pixel. Dazu eine "maskable" Fassung: Android schneidet App-
 * Symbole je nach Hersteller rund, eckig oder als Tropfen zu und nimmt dabei
 * bis zu 20 % vom Rand weg. Die normale Datei hat schon abgerundete Ecken und
 * eine schmale Kante - zugeschnitten saehe das aus wie ein Symbol im Symbol.
 * Die maskable Fassung fuellt deshalb die ganze Flaeche und haelt das Fenster
 * kleiner in der Mitte, in der sicheren Zone.
 */
for (const groesse of [192, 512]) {
  await writeFile(`public/admin-${groesse}.png`, await png(groesse))
  console.log(`${`public/admin-${groesse}.png`.padEnd(32)} ${groesse}×${groesse}`)
}

const maskierbar = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0f3b34"/>
  <g transform="translate(16 16) scale(0.62) translate(-16 -16)" stroke="#f7fbf9" stroke-linecap="round" fill="none">
    <rect x="7.5" y="7.5" width="17" height="17" rx="2.5" stroke-width="2.6"/>
    <path d="M7.5 16h17M16 7.5v17" stroke-width="2.2"/>
  </g>
</svg>`)
await writeFile(
  'public/admin-maskable-512.png',
  await sharp(maskierbar, { density: 1536 }).resize(512, 512).png({ compressionLevel: 9 }).toBuffer(),
)
console.log('public/admin-maskable-512.png    512×512 (maskable)')
