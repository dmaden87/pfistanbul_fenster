// Baut die Logo-Varianten (SVG) und die Vorschauseite.
// node modelabel/logo/erzeuge.mjs [ziel-für-artifact.html]
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GLAS, LINIEN } from './formen.mjs'

const hier = dirname(fileURLToPath(import.meta.url))

const svg = (inhalt) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="currentColor" role="img">${inhalt}</svg>`
const maske = (id, inhalt) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">${inhalt}</mask>`

// Glas vor die Krone stellen: [Fusspunkt-y im Bild, Massstab]. Das Glas steht im Original bei y 155.
const glasLage = (fuss, massstab) => `translate(100 ${fuss}) scale(${massstab}) translate(-100 155)`.replace('-100 155', '-100 -155')
const RAND = 'M68,66 H132'
const TELLER_LINIEN = LINIEN.slice(2)
const GLAS_LINIEN = [RAND, ...LINIEN.slice(0, 2)]

// Eine Variante: Kronenkreis, Äste, Glas (immer mit geschlossenem Rand), Teller.
// Alle Linien haben dieselbe Stärke – im Bild gemessen, unabhängig vom Massstab des Glases.
function zeichen({ kreis: [cx, cy, r], strich, aeste = [], fuss, massstab, teller }) {
  const lage = glasLage(fuss, massstab)
  const luecke = `<path d="${GLAS}" transform="${lage}" fill="#000" stroke="#000" stroke-width="${(strich * 3.2) / massstab}" stroke-linejoin="round"/>`
  const linie = (d) => `<path d="${d}"/>`
  return (p) => svg(
    `<defs>${maske(`${p}r`, `<circle cx="${cx}" cy="${cy}" r="${r + strich / 2}" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="${r - strich / 2}" fill="#000"/>${luecke}`)}` +
    `${maske(`${p}a`, `<rect width="200" height="200" fill="#fff"/>${luecke}`)}</defs>` +
    `<rect width="200" height="200" fill="currentColor" mask="url(#${p}r)"/>` +
    `<g fill="none" stroke="currentColor" stroke-width="${strich}" stroke-linecap="round" stroke-linejoin="round">` +
    `<g mask="url(#${p}a)">${aeste.map(linie).join('')}</g>` +
    `<g transform="${lage}" stroke-width="${strich / massstab}">${GLAS_LINIEN.map(linie).join('')}${teller ? '' : TELLER_LINIEN.map(linie).join('')}</g>` +
    `${teller ? teller.map(linie).join('') : ''}</g>`)
}

// Im Kreis: Teller als Sehne genau bis an den Kreis.
const SEHNE_Y = 152, KREIS_R = 86
const sehne = Math.sqrt(KREIS_R ** 2 - (SEHNE_Y - 100) ** 2)

const varianten = [
  {
    datei: 'runde-krone-fein',
    name: 'Fein',
    text: 'Die gewählte Form, aber mit einer einzigen, feinen Linienstärke für alles. Nur noch eine Astgabel, das Glas etwas grösser. Wirkt leiser und hochwertiger, ohne etwas Neues zu erfinden.',
    svg: zeichen({ kreis: [100, 68, 62], strich: 4.5, aeste: ['M100,112 V66', 'M100,66 L84,46', 'M100,66 L116,44'], fuss: 162, massstab: 0.9 }),
  },
  {
    datei: 'runde-krone-pur',
    name: 'Pur',
    text: 'Ohne Äste. Die Krone reicht bis auf den Teller, das Glas steht ganz in ihr. Am reduziertesten und sehr ruhig. Der Baum ist hier eher Andeutung als Bild.',
    svg: zeichen({ kreis: [100, 92, 70], strich: 4.5, fuss: 158, massstab: 0.8 }),
  },
  {
    datei: 'runde-krone-im-kreis',
    name: 'Im Kreis',
    text: 'Die Krone umschliesst alles, der Teller ist eine Sehne genau von Rand zu Rand. Der Kreis ist Baum und Rahmen zugleich. Fertig für Knopf, Prägung und Profilbild, ohne ein zusätzliches Siegel.',
    svg: zeichen({
      kreis: [100, 100, KREIS_R], strich: 4.5, aeste: ['M100,86 V62', 'M100,62 L89,47', 'M100,62 L111,45'], fuss: 146, massstab: 0.7,
      teller: [`M${(100 - sehne).toFixed(1)},${SEHNE_Y} H${(100 + sehne).toFixed(1)}`, 'M84,161 C94,163.5 106,163.5 116,161'],
    }),
  },
]

for (const v of varianten) writeFileSync(join(hier, `${v.datei}.svg`), v.svg(v.datei).replaceAll('currentColor', '#111111') + '\n')

const karten = varianten.map((v, i) => `
    <article class="vorschlag">
      <div class="buehne">${v.svg(`g${i}`)}</div>
      <div class="info"><h2>${v.name}</h2><p>${v.text}</p></div>
      <div class="proben" aria-label="Grössenprobe">
        <span class="mittel">${v.svg(`m${i}`)}</span>
        <span class="klein">${v.svg(`k${i}`)}</span>
        <span class="mini">${v.svg(`n${i}`)}</span>
      </div>
      <div class="anwendung">
        <figure class="etikett">${v.svg(`e${i}`)}<figcaption>Webetikett</figcaption></figure>
        <figure class="anhaenger"><span class="loch"></span>${v.svg(`h${i}`)}<figcaption>Anhänger</figcaption></figure>
      </div>
    </article>`).join('')

const seite = `<title>Çay-Glas Logo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500&family=Jost:wght@400;500&display=swap">
<style>
/* Layout: drei gleich breite Spalten, je Variante Zeichen, Text, Grössen und zwei Anwendungen */
:root {
  --papier: #f6f5f3; --karte: #ffffff; --tinte: #141312; --leise: #6b6763; --linie: #e3e0dc;
  --stoff: #22262b; --faden: #e8e1d2; --karton: #e9e4da;
  --anzeige: 'Bodoni Moda', 'Didot', 'Bodoni 72', Georgia, serif;
  --text: 'Jost', 'Futura', 'Avenir Next', system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --papier: #121110; --karte: #1b1a19; --tinte: #f1efec; --leise: #a29d97; --linie: #2e2c2a; --stoff: #0c0e10; --karton: #d9d3c7; color-scheme: dark } }
:root[data-theme="dark"] { --papier: #121110; --karte: #1b1a19; --tinte: #f1efec; --leise: #a29d97; --linie: #2e2c2a; --stoff: #0c0e10; --karton: #d9d3c7; color-scheme: dark }
body { background: var(--papier); color: var(--tinte); font-family: var(--text); font-size: 16px; line-height: 1.55 }
.rahmen { max-width: 1120px; margin: 0 auto; padding-inline: 20px; padding-block: 48px 64px; display: grid; gap: 40px }
header { display: grid; gap: 12px; max-width: 64ch }
.zeile { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
h1 { font-family: var(--anzeige); font-weight: 500; font-size: clamp(34px, 6vw, 54px); line-height: 1.05; margin: 0; text-wrap: balance }
header p { margin: 0; color: var(--leise) }
.raster { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 20px }
.vorschlag { background: var(--karte); border: 1px solid var(--linie); border-radius: 6px; display: grid; grid-template-rows: auto 1fr auto auto }
.buehne { color: var(--tinte); display: grid; place-items: center; padding: 40px 28px 20px }
.buehne svg { width: min(100%, 220px); height: auto }
.info { padding: 0 24px; display: grid; gap: 4px; align-content: start }
h2 { font-family: var(--anzeige); font-weight: 500; font-size: 26px; margin: 0 }
.info p { margin: 0; color: var(--leise); font-size: 14.5px }
.proben { display: flex; align-items: end; gap: 16px; padding: 20px 24px; color: var(--tinte) }
.mittel svg { width: 48px; display: block } .klein svg { width: 24px; display: block } .mini svg { width: 16px; display: block }
.anwendung { border-top: 1px solid var(--linie); padding: 20px 24px 24px; display: flex; gap: 16px; align-items: end }
figure { margin: 0; display: grid; gap: 8px; justify-items: center }
figcaption { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
.etikett svg, .anhaenger svg { display: block }
.etikett svg { width: 46px; padding: 12px 34px; background: var(--stoff); color: var(--faden); border-radius: 2px;
  background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.04) 0 1px, transparent 1px 3px) }
.anhaenger { position: relative }
.anhaenger svg { width: 54px; padding: 34px 20px 22px; background: var(--karton); color: #1d1c1a; border-radius: 3px }
.loch { position: absolute; top: 12px; left: 50%; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: var(--karte); box-shadow: inset 0 0 0 1px rgba(0,0,0,.15) }
footer { color: var(--leise); font-size: 14px; max-width: 70ch }
footer p { margin: 0 }
</style>
<div class="rahmen">
  <header>
    <span class="zeile">Modelabel · Logo · vierte Runde</span>
    <h1>Runde Krone, reduziert</h1>
    <p>Drei Varianten für das Basic-Premium-Segment. Alle haben jetzt eine einzige, gleichmässige Linienstärke und mehr Luft. Darunter siehst du jede Variante in 48, 24 und 16 Pixeln, auf einem gewebten Etikett und auf einem Anhänger aus Karton.</p>
  </header>
  <section class="raster">${karten}
  </section>
  <footer><p>Die Zeichen liegen als SVG im Ordner <code>modelabel/logo/</code> und lassen sich beliebig gross drucken, sticken oder prägen.</p></footer>
</div>
`

if (process.argv[2]) writeFileSync(process.argv[2], seite) // nur der Inhalt, ohne Gerüst
writeFileSync(join(hier, 'vorschau.html'), `<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${seite}</html>\n`)
console.log('fertig:', varianten.map(v => v.datei).join(', '))
