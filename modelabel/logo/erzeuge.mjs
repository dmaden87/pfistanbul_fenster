// Baut die Logo-Vorschläge (SVG) und die Vorschauseite.
// node modelabel/logo/erzeuge.mjs
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const hier = dirname(fileURLToPath(import.meta.url))

// Ince-belli-Glas: Rand oben, schmale Taille, runder Bauch, flacher Boden.
const GLAS = 'M68,34 H132 C131,62 112,78 112,100 C112,114 124,120 124,134 C124,146 116,151 106,151 H94 C84,151 76,146 76,134 C76,120 88,114 88,100 C88,78 69,62 68,34 Z'
// Untersetzer, leicht gewölbt, mit kleinem Abstand zum Glas.
const TELLER = 'M40,156 C70,153 130,153 160,156 C157,163 140,167 100,167 C60,167 43,163 40,156 Z'
const TEE = '#9E2A1C' // «tavşan kanı», die Farbe von gut gezogenem Tee

const svg = (inhalt, farbe = 'currentColor') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="${farbe}" role="img">${inhalt}</svg>`

const varianten = [
  {
    datei: 'a-silhouette',
    name: 'Silhouette',
    text: 'Glas und Untersetzer als volle Fläche. Der schmale Spalt zwischen beiden trennt die Teile, auch ganz klein.',
    svg: (p) => svg(`<path d="${GLAS}"/><path d="${TELLER}"/>`),
  },
  {
    datei: 'b-linie',
    name: 'Linie',
    text: 'Eine durchgehende Kontur. Leicht und edel, passt auf Etiketten und Stickerei mit feinem Faden.',
    svg: (p) => svg(`<g fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"><path d="${GLAS}"/><path d="${TELLER}"/></g>`),
  },
  {
    datei: 'c-tee',
    name: 'Mit Tee',
    text: 'Das Glas ist bis knapp unter den Rand gefüllt, in der Farbe von «tavşan kanı». Die einzige Fassung mit Farbe.',
    svg: (p) => svg(
      `<defs><clipPath id="${p}k"><path d="${GLAS}"/></clipPath></defs>` +
      `<rect x="0" y="52" width="200" height="120" fill="${TEE}" clip-path="url(#${p}k)"/>` +
      `<path d="${GLAS}" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"/>` +
      `<path d="${TELLER}"/>`),
  },
  {
    datei: 'd-siegel',
    name: 'Siegel',
    text: 'Ein Kreis, aus dem das Glas ausgespart ist. Funktioniert als Knopf, Anhänger, Stempel und Profilbild.',
    svg: (p) => svg(
      `<defs><mask id="${p}m"><circle cx="100" cy="100" r="96" fill="#fff"/>` +
      `<g fill="#000" transform="translate(100 100) scale(.78) translate(-100 -100)"><path d="${GLAS}"/><path d="${TELLER}"/></g></mask></defs>` +
      `<circle cx="100" cy="100" r="96" mask="url(#${p}m)"/>`),
  },
  {
    datei: 'e-dampf',
    name: 'Dampf',
    text: 'Silhouette mit einer einzigen Dampflinie. Erzählt «frisch eingeschenkt» und gibt dem Zeichen Bewegung.',
    svg: (p) => svg(
      `<g transform="translate(0 14)"><path d="${GLAS}"/><path d="${TELLER}"/></g>` +
      `<path d="M100,40 C88,30 112,22 100,10" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`),
  },
  {
    datei: 'f-reduziert',
    name: 'Reduziert',
    text: 'Nur die beiden Seiten des Glases und ein Strich als Teller. Fast ein Schriftzeichen, sehr modisch, braucht aber den Namen daneben.',
    svg: (p) => svg(
      `<g fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round">` +
      `<path d="M68,34 C69,62 88,78 88,100 C88,114 76,120 76,134 C76,144 82,150 90,151"/>` +
      `<path d="M132,34 C131,62 112,78 112,100 C112,114 124,120 124,134 C124,144 118,150 110,151"/>` +
      `<path d="M48,164 C80,160 120,160 152,164"/></g>`),
  },
]

for (const v of varianten) writeFileSync(join(hier, `${v.datei}.svg`), v.svg(v.datei).replace('currentColor', '#111111').replaceAll('currentColor', '#111111') + '\n')

const karten = varianten.map((v, i) => `
    <article class="vorschlag" id="${v.datei}">
      <div class="buehne">${v.svg(`g${i}`)}</div>
      <div class="info">
        <h2><span class="buchstabe">${v.datei[0].toUpperCase()}</span> ${v.name}</h2>
        <p>${v.text}</p>
      </div>
      <div class="proben" aria-label="Grössenprobe">
        <span class="gross">${v.svg(`s${i}`)}</span>
        <span class="mittel">${v.svg(`m${i}`)}</span>
        <span class="klein">${v.svg(`k${i}`)}</span>
        <span class="dunkel">${v.svg(`d${i}`)}</span>
        <span class="teegrund">${v.svg(`t${i}`)}</span>
      </div>
      <div class="lockup">${v.svg(`l${i}`)}<span class="wortmarke" data-name>İNCE BELLİ</span></div>
    </article>`).join('')

const seite = `<title>Çay-Glas Logo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500&family=Jost:wght@400;500&display=swap">
<style>
/* Layout: ein ruhiges Raster aus Probeblättern, jedes Zeichen gross, darunter Grössen- und Grundprobe */
:root {
  --papier: #f6f5f3; --karte: #ffffff; --tinte: #141312; --leise: #6b6763; --linie: #e3e0dc; --tee: ${TEE};
  --anzeige: 'Bodoni Moda', 'Didot', 'Bodoni 72', Georgia, serif;
  --text: 'Jost', 'Futura', 'Avenir Next', system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --papier: #121110; --karte: #1b1a19; --tinte: #f1efec; --leise: #a29d97; --linie: #2e2c2a; --tee: #c2412d; color-scheme: dark } }
:root[data-theme="dark"] { --papier: #121110; --karte: #1b1a19; --tinte: #f1efec; --leise: #a29d97; --linie: #2e2c2a; --tee: #c2412d; color-scheme: dark }
body { background: var(--papier); color: var(--tinte); font-family: var(--text); font-size: 16px; line-height: 1.55 }
.rahmen { max-width: 1120px; margin: 0 auto; padding-inline: 20px; padding-block: 48px 64px; display: grid; gap: 40px }
header { display: grid; gap: 12px; max-width: 62ch }
.zeile { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
h1 { font-family: var(--anzeige); font-weight: 500; font-size: clamp(34px, 6vw, 56px); line-height: 1.05; margin: 0; text-wrap: balance }
header p { margin: 0; color: var(--leise) }
.name { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 14px; color: var(--leise) }
.name input { font: 500 15px var(--text); color: var(--tinte); background: var(--karte); border: 1px solid var(--linie); border-radius: 4px; padding: 8px 12px; width: 16ch }
.name input:focus-visible { outline: 2px solid var(--tee); outline-offset: 2px }
.raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr)); gap: 20px }
.vorschlag { background: var(--karte); border: 1px solid var(--linie); border-radius: 6px; display: grid; grid-template-rows: auto auto 1fr auto; overflow: hidden }
.buehne { color: var(--tinte); display: grid; place-items: center; padding: 28px 28px 8px }
.buehne svg { width: min(100%, 210px); height: auto }
.info { padding: 0 24px; display: grid; gap: 4px }
h2 { font-family: var(--anzeige); font-weight: 500; font-size: 24px; margin: 0; display: flex; align-items: baseline; gap: 10px }
.buchstabe { font-family: var(--text); font-size: 12px; letter-spacing: .12em; color: var(--leise) }
.info p { margin: 0; color: var(--leise); font-size: 14.5px }
.proben { display: flex; align-items: end; gap: 14px; padding: 18px 24px; color: var(--tinte); flex-wrap: wrap }
.proben span { display: grid; place-items: center }
.gross svg { width: 64px } .mittel svg { width: 32px } .klein svg { width: 16px }
.dunkel, .teegrund { width: 64px; height: 64px; border-radius: 50% }
.dunkel { background: #141312; color: #f1efec } .teegrund { background: var(--tee); color: #fff }
.dunkel svg, .teegrund svg { width: 44px }
.lockup { border-top: 1px solid var(--linie); padding: 16px 24px; display: flex; align-items: center; gap: 12px; color: var(--tinte); min-width: 0 }
.lockup svg { width: 40px; flex: none }
.wortmarke { font-family: var(--anzeige); font-size: 22px; letter-spacing: .16em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0 }
footer { color: var(--leise); font-size: 14px; max-width: 70ch; display: grid; gap: 8px }
footer p { margin: 0 }
</style>
<div class="rahmen">
  <header>
    <span class="zeile">Modelabel · Logo · erste Runde</span>
    <h1>Sechs Wege, ein Çay-Glas zu zeichnen</h1>
    <p>Alle Vorschläge gehen vom klassischen ince-belli-Glas auf dem Untersetzer aus. Unter jedem Zeichen stehen Grössenproben (64, 32 und 16 Pixel), dunkler und teeroter Grund und eine Zeile mit Namen.</p>
    <label class="name" for="labelname">Name zum Ausprobieren
      <input id="labelname" value="İNCE BELLİ" maxlength="22" autocomplete="off">
    </label>
  </header>
  <section class="raster">${karten}
  </section>
  <footer>
    <p>«İnce belli» heisst «schlanke Taille» und ist der türkische Name für genau diese Glasform. Hier ist es nur ein Platzhalter für den Labelnamen.</p>
    <p>Die Zeichen liegen als SVG im Ordner <code>modelabel/logo/</code> und lassen sich ohne Qualitätsverlust beliebig gross drucken, sticken oder plotten.</p>
  </footer>
</div>
<script>
const feld = document.getElementById('labelname')
const setze = () => document.querySelectorAll('[data-name]').forEach(el => { el.textContent = feld.value.trim() || 'İNCE BELLİ' })
feld.addEventListener('input', setze)
</script>
`

if (process.argv[2]) writeFileSync(process.argv[2], seite) // nur der Inhalt, ohne Gerüst
writeFileSync(join(hier, 'vorschau.html'), `<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${seite}</html>\n`)
console.log('fertig:', varianten.map(v => v.datei).join(', '))
