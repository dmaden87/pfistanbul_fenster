// Baut die Logo-Vorschläge (SVG) und die Vorschauseite.
// node modelabel/logo/erzeuge.mjs [ziel-für-artifact.html]
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const hier = dirname(fileURLToPath(import.meta.url))

// Glas nach Foto: Rand fast so breit wie der Boden, sanfte Taille, voller runder Bauch.
const GLAS = 'M68,66 H132 C131,82 121,90 121,104 C121,120 131,130 131,142 C131,151 126,155 118,155 H82 C74,155 69,151 69,142 C69,130 79,120 79,104 C79,90 69,82 68,66 Z'
// Untersetzer: breiter Teller mit tiefer Mulde darunter.
const TELLER = 'M38,160 C70,157 130,157 162,160 C160,165 150,168 136,169 C134,176 128,180 100,180 C72,180 66,176 64,169 C50,168 40,165 38,160 Z'
// Für «Reduziert»: nur die Glasseiten, Tellerkante und Mulde.
const LINIEN = [
  'M68,66 C69,82 79,90 79,104 C79,120 69,130 69,142 C69,151 74,155 82,155',
  'M132,66 C131,82 121,90 121,104 C121,120 131,130 131,142 C131,151 126,155 118,155',
  'M40,162 C75,158 125,158 160,162',
  'M68,173 C85,177 115,177 132,173',
]

// Bäume: Fläche (Krone/Stamm) und feine Linien (Äste, Adern).
const baeume = {
  platane: {
    name: 'Platane',
    text: 'Runde Krone wie die alten Platanen (çınar) über Teegärten. Der Stamm wächst aus dem Glas.',
    flaeche: ['M100,10 A68,68 0 1 1 99.99,10 Z'],
    linien: ['M100,100 V40', 'M100,80 L72,56', 'M100,62 L126,40'],
  },
  zypresse: {
    name: 'Zypresse',
    text: 'Die schlanke Zypresse der Istanbuler Hügel, leicht versetzt hinter dem Glas. Gibt dem Zeichen Höhe.',
    flaeche: ['M134,4 C156,40 160,110 154,166 H114 C108,110 112,40 134,4 Z'],
    linien: [],
  },
  teeblatt: {
    name: 'Teeblatt',
    text: 'Die Krone ist ein Teeblatt, seine Mittelader der Stamm. Baum und Tee in einer Form.',
    flaeche: ['M100,4 C168,30 172,112 100,152 C28,112 32,30 100,4 Z'],
    linien: ['M100,100 V30', 'M100,88 L134,62', 'M100,68 L68,46', 'M100,50 L122,34'],
  },
}

// Glas und Teller etwas kleiner vor den Baum stellen (Fusspunkt bleibt unten).
const VORNE = 'translate(100 182) scale(.8) translate(-100 -182)'

const svg = (inhalt) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="currentColor" role="img">${inhalt}</svg>`

const reduziert = (b) => (p) => svg(
  `<defs><mask id="${p}v" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><rect width="200" height="200" fill="#fff"/>` +
  `<path d="${GLAS}" transform="${VORNE}" fill="#000" stroke="#000" stroke-width="18" stroke-linejoin="round"/></mask></defs>` +
  `<g mask="url(#${p}v)" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">` +
  [...b.flaeche, ...b.linien].map(d => `<path d="${d}"/>`).join('') + `</g>` +
  `<g transform="${VORNE}" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round">` + LINIEN.map(d => `<path d="${d}"/>`).join('') + `</g>`)

const siegel = (b) => (p) => svg(
  `<defs><mask id="${p}m" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><circle cx="100" cy="100" r="96" fill="#fff"/>` +
  `<g transform="translate(100 100) scale(.76) translate(-100 -93)">` +
  b.flaeche.map(d => `<path d="${d}" fill="#000"/>`).join('') +
  b.linien.map(d => `<path d="${d}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`).join('') +
  `<g transform="${VORNE}" fill="#000" stroke="#fff" stroke-width="11" stroke-linejoin="round" paint-order="stroke"><path d="${GLAS}"/><path d="${TELLER}"/></g>` +
  `</g></mask></defs><circle cx="100" cy="100" r="96" mask="url(#${p}m)"/>`)

const varianten = Object.entries(baeume).flatMap(([schluessel, b]) => [
  { datei: `reduziert-${schluessel}`, stil: 'Reduziert', baum: b, svg: reduziert(b) },
  { datei: `siegel-${schluessel}`, stil: 'Siegel', baum: b, svg: siegel(b) },
])

for (const v of varianten) writeFileSync(join(hier, `${v.datei}.svg`), v.svg(v.datei).replaceAll('currentColor', '#111111') + '\n')

const paare = Object.entries(baeume).map(([schluessel, b], j) => {
  const zwei = varianten.filter(v => v.baum === b)
  return `
    <section class="paar">
      <div class="paarkopf"><h2>${b.name}</h2><p>${b.text}</p></div>
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
/* Layout: pro Baum ein Paar (Reduziert | Siegel) nebeneinander, darunter Grössen- und Grundprobe */
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
    <span class="zeile">Modelabel · Logo · zweite Runde</span>
    <h1>Das Çay-Glas mit Baum</h1>
    <p>Das Glas hat jetzt die Form aus dem Foto: Der Bauch ist fast so breit wie der Rand, die Taille sanft und der Untersetzer hat eine tiefe Mulde. Dahinter steht jeweils ein Baum, einmal als Linie und einmal als Siegel.</p>
  </header>
  ${paare}
  <footer><p>Die Zeichen liegen als SVG im Ordner <code>modelabel/logo/</code> und lassen sich beliebig gross drucken, sticken oder plotten.</p></footer>
</div>
`

if (process.argv[2]) writeFileSync(process.argv[2], seite) // nur der Inhalt, ohne Gerüst
writeFileSync(join(hier, 'vorschau.html'), `<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${seite}</html>\n`)
console.log('fertig:', varianten.map(v => v.datei).join(', '))
