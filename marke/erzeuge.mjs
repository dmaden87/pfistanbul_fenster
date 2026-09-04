/**
 * Erzeugt das Anzeigebild fuer Instagram und andere Profile.
 *
 * Zwei Dinge bestimmen den Entwurf, und beide werden gern uebersehen:
 *
 * 1. Instagram schneidet das Bild rund zu. Alles, was in den Ecken sitzt,
 *    ist weg – der Inhalt muss in den einbeschriebenen Kreis passen.
 * 2. Im Feed erscheint das Bild rund 32 Pixel gross. Das bestehende Zeichen
 *    hat ein Gitter aus sieben Linien; bei 32 Pixeln waere jede davon ein
 *    Viertelpixel und das Ganze ein grauer Fleck. Fuer das Profilbild ist
 *    das Gitter deshalb grober, die Linien sind dicker.
 *
 * Aufruf: node marke/erzeuge.mjs
 */
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const GRUEN = '#0f3b34'
const CREME = '#f7fbf9'
const ZIEL = 'marke'

/** Ein Gitter aus n×n Feldern, zentriert, mit runden Enden. */
function gitter(mitte, halb, felder, farbe, staerke) {
  const schritt = (halb * 2) / felder
  const linien = []
  for (let i = 1; i < felder; i++) {
    const p = mitte - halb + schritt * i
    linien.push(`M${mitte - halb} ${p}H${mitte + halb}`)
    linien.push(`M${p} ${mitte - halb}V${mitte + halb}`)
  }
  return `<path d="${linien.join('')}" stroke="${farbe}" stroke-width="${staerke}" stroke-linecap="round"/>`
}

const S = 1080
const M = S / 2

const varianten = {
  // Das Zeichen der Website, fuer den Kreis gebaut: groberes Gitter, dickere
  // Linien, viel Luft zum Rand.
  gitter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
    <rect width="${S}" height="${S}" fill="${GRUEN}"/>
    <rect x="${M - 300}" y="${M - 300}" width="600" height="600" rx="64" fill="none" stroke="${CREME}" stroke-width="46"/>
    ${gitter(M, 300, 3, CREME, 30)}
  </svg>`,

  // Ein Fenster, dessen rechte Haelfte vom Netz bedeckt ist. Sagt, worum es
  // geht, und bleibt auch klein lesbar, weil die Haelften unterschiedlich
  // hell wirken.
  netz: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
    <rect width="${S}" height="${S}" fill="${GRUEN}"/>
    <defs>
      <clipPath id="haelfte"><rect x="${M}" y="${M - 300}" width="300" height="600"/></clipPath>
    </defs>
    <g clip-path="url(#haelfte)">${gitter(M, 300, 10, CREME, 13)}</g>
    <rect x="${M - 300}" y="${M - 300}" width="600" height="600" rx="56" fill="none" stroke="${CREME}" stroke-width="40"/>
    <path d="M${M} ${M - 300}V${M + 300}" stroke="${CREME}" stroke-width="40" stroke-linecap="round"/>
  </svg>`,

  // Dieselbe Form hell. Unter lauter dunklen Profilbildern faellt das eher
  // auf; welche Fassung besser wirkt, entscheidet der Feed, nicht die Theorie.
  hell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">
    <rect width="${S}" height="${S}" fill="${CREME}"/>
    <rect x="${M - 300}" y="${M - 300}" width="600" height="600" rx="64" fill="none" stroke="${GRUEN}" stroke-width="46"/>
    ${gitter(M, 300, 3, GRUEN, 30)}
  </svg>`,
}

await mkdir(ZIEL, { recursive: true })
for (const [name, svg] of Object.entries(varianten)) {
  await writeFile(`${ZIEL}/profil-${name}.svg`, svg, 'utf8')
  for (const groesse of [1080, 320]) {
    await sharp(Buffer.from(svg)).resize(groesse, groesse).png().toFile(`${ZIEL}/profil-${name}-${groesse}.png`)
  }
  console.log(`${name}: SVG, 1080 und 320 Pixel`)
}

/*
 * Groessenprobe. Sie gehoert zum Erzeugen dazu und nicht in einen einmaligen
 * Test: Wer das Zeichen aendert, sieht sofort, ob es bei 32 Pixeln noch
 * etwas darstellt. Rund beschnitten, weil Instagram das auch tut.
 */
/*
 * Auch die beiden Schriftfassungen kommen in die Probe. Sie entstehen nicht
 * hier, sondern aus marke/wortmarke.html im Browser: Der SVG-Rasterizer
 * kennt die eingebettete Fraunces nicht und setzt still eine Standardschrift
 * ein. Fehlen die Dateien, laesst die Probe sie einfach weg.
 */
const AUS_DEM_BROWSER = ['wortmarke', 'nurtext']

const GROESSEN = [176, 96, 56, 32]
const rand = 26
const zeile = 176 + rand * 2
const breite = GROESSEN.reduce((s, g) => s + g + rand * 2, 0) + 40

const vorhanden = []
for (const name of AUS_DEM_BROWSER) {
  try {
    await sharp(`${ZIEL}/profil-${name}-1080.png`).metadata()
    vorhanden.push(name)
  } catch {
    // Noch nicht gerendert - kein Grund, die Probe scheitern zu lassen.
  }
}
const inDerProbe = [...Object.keys(varianten), ...vorhanden]

const teile = []
let y = rand
for (const name of inDerProbe) {
  let x = rand
  for (const g of GROESSEN) {
    const kreis = Buffer.from(`<svg width="${g}" height="${g}"><circle cx="${g / 2}" cy="${g / 2}" r="${g / 2}" fill="#fff"/></svg>`)
    const bild = await sharp(`${ZIEL}/profil-${name}-1080.png`)
      .resize(g, g)
      .composite([{ input: kreis, blend: 'dest-in' }])
      .png()
      .toBuffer()
    teile.push({ input: bild, left: Math.round(x), top: Math.round(y + (176 - g) / 2) })
    x += g + rand * 2
  }
  y += zeile
}

await sharp({ create: { width: Math.round(breite), height: Math.round(y + rand), channels: 4, background: '#e9e6e0' } })
  .composite(teile)
  .png()
  .toFile(`${ZIEL}/groessenprobe.png`)

console.log(`\nGroessenprobe: ${inDerProbe.join(', ')} bei ${GROESSEN.join(', ')} Pixeln`)
