/**
 * Erzeugt die Symbole der nativen App (app/assets/).
 *
 * Aufruf: node bau/app-symbole.mjs   (oder in app/: npm run symbole)
 *
 * Alles aus demselben Fenster-Zeichen wie public/favicon.svg:
 *  - icon.png (1024): das ganze Symbol mit Grund, fuer iOS und als Vorlage.
 *  - android-icon-foreground.png: nur das Fenster, freigestellt. Android legt
 *    die Markenfarbe (app.config.ts, adaptiveIcon.backgroundColor) darunter
 *    und schneidet je nach Hersteller rund oder eckig zu. Von 108 dp sind nur
 *    die inneren 66 dp sicher - das Fenster bleibt deshalb in der Mitte.
 *  - android-icon-monochrome.png: dasselbe einfarbig, fuer die
 *    "Thematisierten Symbole" ab Android 13.
 *  - splash-icon.png: das Fenster gross, auf dem gruenen Startbildschirm.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const ZIEL = 'app/assets'
await mkdir(ZIEL, { recursive: true })

const fenster = (farbe, skala) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
  <g transform="translate(54 54) scale(${skala}) translate(-16 -16)" stroke="${farbe}" stroke-linecap="round" fill="none">
    <rect x="7.5" y="7.5" width="17" height="17" rx="2.5" stroke-width="2.6"/>
    <path d="M7.5 16h17M16 7.5v17" stroke-width="2.2"/>
  </g>
</svg>`

const png = (svg, groesse) => sharp(Buffer.from(svg), { density: 1200 }).resize(groesse, groesse).png().toBuffer()

await writeFile(`${ZIEL}/icon.png`, await sharp(await readFile('public/favicon.svg'), { density: 3000 }).resize(1024, 1024).flatten({ background: '#0f3b34' }).png().toBuffer())
await writeFile(`${ZIEL}/android-icon-foreground.png`, await png(fenster('#f7fbf9', 2.4), 432))
await writeFile(`${ZIEL}/android-icon-monochrome.png`, await png(fenster('#000000', 2.4), 432))
await writeFile(`${ZIEL}/splash-icon.png`, await png(fenster('#f7fbf9', 3), 512))
console.log('app/assets: icon, android-icon-foreground, android-icon-monochrome, splash-icon')
