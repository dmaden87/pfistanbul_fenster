/**
 * Erzeugt die App-Symbole fuer die Android-App (android/).
 *
 * Aufruf: node bau/android-symbole.mjs
 *
 * Zwei Sorten, weil Android zwei kennt:
 *  - ic_launcher.png: das klassische Symbol fuer Android 7 und aelter,
 *    fertig mit abgerundeten Ecken, in fuenf Dichten.
 *  - ic_launcher_foreground.png: nur das Fenster, ohne Hintergrund, fuer
 *    die "adaptiven" Symbole ab Android 8. Den Hintergrund (die Markenfarbe)
 *    legt Android selbst darunter und schneidet das Ganze je nach Hersteller
 *    rund, eckig oder als Tropfen zu. Das Fenster muss deshalb in der Mitte
 *    bleiben: Von 108 dp Kantenlaenge sind nur die inneren 66 dp sicher.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const RES = 'android/app/src/main/res'
const svg = await readFile('public/favicon.svg')

const dichten = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

const vordergrund = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
  <g transform="translate(54 54) scale(2.4) translate(-16 -16)" stroke="#f7fbf9" stroke-linecap="round" fill="none">
    <rect x="7.5" y="7.5" width="17" height="17" rx="2.5" stroke-width="2.6"/>
    <path d="M7.5 16h17M16 7.5v17" stroke-width="2.2"/>
  </g>
</svg>`)

for (const [name, faktor] of Object.entries(dichten)) {
  const ordner = `${RES}/mipmap-${name}`
  await mkdir(ordner, { recursive: true })
  const klassisch = Math.round(48 * faktor)
  const adaptiv = Math.round(108 * faktor)
  await writeFile(`${ordner}/ic_launcher.png`, await sharp(svg, { density: 1536 }).resize(klassisch, klassisch).png().toBuffer())
  await writeFile(
    `${ordner}/ic_launcher_foreground.png`,
    await sharp(vordergrund, { density: 1536 }).resize(adaptiv, adaptiv).png().toBuffer(),
  )
  console.log(`${ordner.padEnd(44)} ${klassisch} / ${adaptiv} px`)
}
