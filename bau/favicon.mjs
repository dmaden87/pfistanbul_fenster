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
