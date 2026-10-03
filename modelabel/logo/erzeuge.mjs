// Baut die Logo-Vorschläge (SVG) und die Vorschauseite.
// node modelabel/logo/erzeuge.mjs [ziel-für-artifact.html]
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GLAS, TELLER, LINIEN, kronen } from './formen.mjs'

const hier = dirname(fileURLToPath(import.meta.url))

// Glas und Teller etwas kleiner vor den Baum stellen (Fusspunkt bleibt unten).
const VORNE = 'translate(100 182) scale(.8) translate(-100 -182)'

const svg = (inhalt) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="currentColor" role="img">${inhalt}</svg>`

const kreise = (k, d, farbe) => k.kreise.map(([x, y, r]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + d).toFixed(1)}" fill="${farbe}"/>`).join('')
const glasLuecke = `<path d="${GLAS}" transform="${VORNE}" fill="#000" stroke="#000" stroke-width="18" stroke-linejoin="round"/>`
const voll = '<rect width="200" height="200" fill="#fff"/>'
const maske = (id, inhalt) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">${inhalt}</mask>`

// Linie: Umriss der Kronen-Vereinigung (aussen +3, innen -3), Glas davor ausgespart.
const reduziert = (k) => (p) => svg(
  `<defs>${maske(`${p}r`, kreise(k, 3, '#fff') + kreise(k, -3, '#000') + glasLuecke)}${maske(`${p}a`, voll + glasLuecke)}</defs>` +
  `<rect width="200" height="200" mask="url(#${p}r)"/>` +
  `<g mask="url(#${p}a)" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round">` + [k.stamm, ...k.aeste].filter(Boolean).map(d => `<path d="${d}"/>`).join('') + `</g>` +
  `<g transform="${VORNE}" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round">` + ['M68,66 H132', ...LINIEN].map(d => `<path d="${d}"/>`).join('') + `</g>`)

// Siegel: Krone, Glas und Teller aus dem Kreis ausgespart, Äste bleiben stehen.
const siegel = (k) => (p) => svg(
  `<defs>${maske(`${p}m`, '<circle cx="100" cy="100" r="96" fill="#fff"/>' +
    `<g transform="translate(100 100) scale(.74) translate(-100 -96)">` + kreise(k, 0, '#000') +
    (k.stamm ? `<path d="${k.stamm}" fill="none" stroke="#000" stroke-width="10" stroke-linecap="round"/>` : '') +
    k.aeste.map(d => `<path d="${d}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`).join('') +
    `<g transform="${VORNE}" fill="#000" stroke="#fff" stroke-width="11" stroke-linejoin="round" paint-order="stroke"><path d="${GLAS}"/><path d="${TELLER}"/></g></g>`)}</defs>` +
  `<circle cx="100" cy="100" r="96" mask="url(#${p}m)"/>`)

const varianten = Object.entries(kronen).flatMap(([schluessel, k]) => [
  { datei: `reduziert-cinar-${schluessel}`, stil: 'Reduziert', krone: k, svg: reduziert(k) },
  { datei: `siegel-cinar-${schluessel}`, stil: 'Siegel', krone: k, svg: siegel(k) },
])

for (const v of varianten) writeFileSync(join(hier, `${v.datei}.svg`), v.svg(v.datei).replaceAll('currentColor', '#111111').replace('<rect width="200" height="200" mask', '<rect width="200" height="200" fill="#111111" mask') + '\n')

const paare = Object.values(kronen).map((k, j) => {
  const zwei = varianten.filter(v => v.krone === k)
  return `
    <section class="paar">
      <div class="paarkopf"><h2>${k.name}</h2><p>${k.text}</p></div>
      <div class="zwei">${zwei.map((v, i) => `
        <article class="vorschlag">
          <div class="buehne">${v.svg(`g${j}${i}`)}</div>
          <div class="fuss">
            <span class="stil">${v.stil}</span>
            <div class="proben" aria-label="Grössenprobe">
              <span class="mittel">${v.svg(`m${j}${i}`)}</span>
              <span class="klein">${v.svg(`k${j}${i}`)}</span>
              <span class="dunkel">${v.svg(`d${j}${i}`)}</span>
              <span class="teegrund">${v.svg(`t${j}${i}`)}</span>
            </div>
          </div>
        </article>`).join('')}
      </div>
    </section>`
}).join('')

const seite = `<title>Çay-Glas Logo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500&family=Jost:wght@400;500&display=swap">
<style>
/* Layout: pro Krone ein Paar (Reduziert | Siegel) nebeneinander, darunter Grössen- und Grundprobe */
:root {
  --papier: #f6f5f3; --karte: #ffffff; --tinte: #141312; --leise: #6b6763; --linie: #e3e0dc; --tee: #9e2a1c;
  --anzeige: 'Bodoni Moda', 'Didot', 'Bodoni 72', Georgia, serif;
  --text: 'Jost', 'Futura', 'Avenir Next', system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --papier: #121110; --karte: #1b1a19; --tinte: #f1efec; --leise: #a29d97; --linie: #2e2c2a; --tee: #b23a26; color-scheme: dark } }
:root[data-theme="dark"] { --papier: #121110; --karte: #1b1a19; --tinte: #f1efec; --leise: #a29d97; --linie: #2e2c2a; --tee: #b23a26; color-scheme: dark }
body { background: var(--papier); color: var(--tinte); font-family: var(--text); font-size: 16px; line-height: 1.55 }
.rahmen { max-width: 1040px; margin: 0 auto; padding-inline: 20px; padding-block: 48px 64px; display: grid; gap: 48px }
header { display: grid; gap: 12px; max-width: 62ch }
.zeile { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
h1 { font-family: var(--anzeige); font-weight: 500; font-size: clamp(34px, 6vw, 54px); line-height: 1.05; margin: 0; text-wrap: balance }
header p { margin: 0; color: var(--leise) }
.paar { display: grid; gap: 16px }
.paarkopf { display: grid; gap: 2px; max-width: 62ch }
h2 { font-family: var(--anzeige); font-weight: 500; font-size: 28px; margin: 0 }
.paarkopf p { margin: 0; color: var(--leise) }
.zwei { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 20px }
.vorschlag { background: var(--karte); border: 1px solid var(--linie); border-radius: 6px; display: grid }
.buehne { color: var(--tinte); display: grid; place-items: center; padding: 32px 24px 16px }
.buehne svg { width: min(100%, 240px); height: auto }
.fuss { border-top: 1px solid var(--linie); padding: 14px 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px }
.stil { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
.proben { display: flex; align-items: center; gap: 12px; color: var(--tinte) }
.proben span { display: grid; place-items: center }
.mittel svg { width: 32px } .klein svg { width: 16px }
.dunkel, .teegrund { width: 52px; height: 52px; border-radius: 50% }
.dunkel { background: #141312; color: #f1efec } .teegrund { background: var(--tee); color: #fff }
.dunkel svg, .teegrund svg { width: 38px }
footer { color: var(--leise); font-size: 14px; max-width: 70ch }
footer p { margin: 0 }
</style>
<div class="rahmen">
  <header>
    <span class="zeile">Modelabel · Logo · dritte Runde</span>
    <h1>Das Çay-Glas unter der Çınar</h1>
    <p>Vier Wege, die Platane zu zeichnen, jeweils als Linie und als Siegel. Das Glas behält die Form aus deinem Foto.</p>
  </header>
  ${paare}
  <footer><p>Die Zeichen liegen als SVG im Ordner <code>modelabel/logo/</code> und lassen sich beliebig gross drucken, sticken oder plotten.</p></footer>
</div>
`

if (process.argv[2]) writeFileSync(process.argv[2], seite) // nur der Inhalt, ohne Gerüst
writeFileSync(join(hier, 'vorschau.html'), `<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${seite}</html>\n`)
console.log('fertig:', varianten.map(v => v.datei).join(', '))
