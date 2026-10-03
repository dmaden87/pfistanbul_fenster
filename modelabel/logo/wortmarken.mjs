// Setzt die Namen-Kandidaten in der Antiqua neben die Zeichen «Pur» und «Fein»:
// gestapelt, nebeneinander, mit dem Zeichen als O, auf Etikett und Anhänger.
// node modelabel/logo/wortmarken.mjs [ziel-für-artifact.html]
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zeichen, PUR, FEIN } from './formen.mjs'

const hier = dirname(fileURLToPath(import.meta.url))

// Versalhöhe der Antiqua (Cormorant Garamond) in em; runde Formen ragen leicht darüber.
const VERSAL = 0.64, UEBERHANG = 1.12

let zaehler = 0
const varianten = [PUR, FEIN].map((cfg, i) => {
  // Neben Schrift braucht das Zeichen mehr Linie als allein, damit beide gleich schwer wirken.
  const neben = zeichen({ ...cfg, strich: 7.5 })
  const alsO = zeichen({ ...cfg, strich: 11 })
  const [, cy, r] = cfg.kreis
  // Als O: Kreisdurchmesser = Versalhöhe, Kreisunterkante auf der Grundlinie.
  const breite = (VERSAL * UEBERHANG * 200) / (2 * r + cfg.strich)
  const tiefer = ((200 - (cy + r)) / 200) * breite
  return {
    name: ['Pur', 'Fein'][i],
    marke: () => neben(`w${zaehler++}`),
    o: () => `<span class="o-zeichen" aria-hidden="true" style="width:${breite.toFixed(3)}em;vertical-align:-${tiefer.toFixed(3)}em">${alsO(`o${zaehler++}`)}</span>`,
  }
})

const namen = [
  { name: 'Zarif', herkunft: 'Türkisch', bedeutung: 'fein, elegant, anmutig' },
  { name: 'Otium', herkunft: 'Lateinisch', bedeutung: 'kultivierte Musse, die freie Zeit derer, die angekommen sind' },
  { name: 'Safa', herkunft: 'Türkisch', bedeutung: 'unbeschwerter Genuss, Heiterkeit' },
  { name: 'Mola', herkunft: 'Türkisch', bedeutung: 'Pause, wie in «çay molası», der Teepause' },
]

const mitO = (name, v) => {
  const i = name.toLowerCase().indexOf('o')
  return `${name.slice(0, i)}${v.o()}${name.slice(i + 1)}`
}

const karte = (n, v) => `
        <article class="variante">
          <span class="etikette">${v.name}</span>
          <div class="buehne"><div class="gestapelt">${v.marke()}<span class="wort">${n.name}</span></div></div>
          <div class="zeilen">
            <div class="quer">${v.marke()}<span class="wort">${n.name}</span></div>
            ${/o/i.test(n.name) ? `<div class="quer gross"><span class="wort" aria-label="${n.name}">${mitO(n.name, v)}</span></div>` : ''}
          </div>
          <div class="anwendung">
            <figure class="etikett"><div class="quer">${v.marke()}<span class="wort">${n.name}</span></div><figcaption>Webetikett</figcaption></figure>
            <figure class="anhaenger"><div><span class="loch"></span><div class="gestapelt">${v.marke()}<span class="wort">${n.name}</span></div></div><figcaption>Anhänger</figcaption></figure>
          </div>
        </article>`

const abschnitt = (n) => `
    <section class="name">
      <div class="kopf"><h2>${n.name}</h2><p><span>${n.herkunft}</span> ${n.bedeutung}</p></div>
      <div class="paar">${varianten.map(v => karte(n, v)).join('')}
      </div>
    </section>`

const spalten = [
  ...varianten.map(v => ({ titel: v.name, zelle: (n) => `<span class="quer">${v.marke()}<span class="wort">${n.name}</span></span>` })),
  ...varianten.map(v => ({ titel: `${v.name} als O`, zelle: (n) => /o/i.test(n.name) ? `<span class="wort" aria-label="${n.name}">${mitO(n.name, v)}</span>` : '<span class="leer">kein O</span>' })),
]
const matrix = `
      <div class="matrix" role="table" aria-label="Alle Namen mit beiden Zeichen">
        <div class="m-kopf" role="row"><span role="columnheader"></span>${spalten.map(s => `<span role="columnheader">${s.titel}</span>`).join('')}</div>
        ${namen.map(n => `<div class="m-zeile" role="row"><span class="m-name" role="rowheader">${n.name}</span>${spalten.map(s => `<span role="cell">${s.zelle(n)}</span>`).join('')}</div>`).join('\n        ')}
      </div>`

const seite = `<title>Namen und Wortmarke</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Jost:wght@400;500&display=swap">
<style>
/* Layout: je Name ein Abschnitt mit zwei Karten nebeneinander (Pur | Fein), unten alle Kombinationen im Raster */
:root {
  --papier: #f5f4f1; --karte: #ffffff; --tinte: #171615; --leise: #6b6763; --linie: #e2dfda;
  --stoff: #23272c; --faden: #ece5d6; --karton: #e8e2d6; --akzent: #8a3a2b;
  --ui: 'Jost', 'Futura', 'Avenir Next', system-ui, sans-serif;
  --antiqua: 'Cormorant Garamond', 'Garamond', 'Baskerville', Georgia, serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --papier: #121110; --karte: #1a1918; --tinte: #f0ede8; --leise: #a39e97; --linie: #2e2c29; --stoff: #0d0f11; --karton: #d8d1c4; --akzent: #c0614c; color-scheme: dark } }
:root[data-theme="dark"] { --papier: #121110; --karte: #1a1918; --tinte: #f0ede8; --leise: #a39e97; --linie: #2e2c29; --stoff: #0d0f11; --karton: #d8d1c4; --akzent: #c0614c; color-scheme: dark }
body { background: var(--papier); color: var(--tinte); font-family: var(--ui); font-size: 16px; line-height: 1.55 }
.rahmen { max-width: 1160px; margin: 0 auto; padding-inline: 20px; padding-block: 48px 72px; display: grid; gap: 44px }
header { display: grid; gap: 12px; max-width: 64ch }
.zeile { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
h1 { font-family: var(--antiqua); font-weight: 500; font-size: clamp(38px, 6vw, 60px); line-height: 1.02; margin: 0; text-wrap: balance }
header p { margin: 0; color: var(--leise) }

.wort { font-family: var(--antiqua); font-weight: 500; text-transform: uppercase; letter-spacing: .24em; margin-right: -.24em; white-space: nowrap }
.o-zeichen { display: inline-block; margin-inline: -.06em .14em; letter-spacing: 0 }
.o-zeichen svg, .quer .o-zeichen svg { width: 100%; height: auto; display: block }

.name { display: grid; gap: 14px }
.kopf { display: grid; gap: 2px }
h2 { margin: 0; font-family: var(--antiqua); font-weight: 500; font-size: 30px }
.kopf p { margin: 0; font-size: 15px }
.kopf p span { color: var(--leise) }
.paar { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 480px), 1fr)); gap: 20px }
.variante { background: var(--karte); border: 1px solid var(--linie); border-radius: 6px; display: grid; align-content: start; position: relative }
.etikette { position: absolute; top: 16px; left: 20px; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--leise) }
.buehne { display: grid; place-items: center; padding: 48px 24px 32px; color: var(--tinte) }
.gestapelt { display: grid; justify-items: center; gap: .5em }
.gestapelt svg { width: 2.6em; height: auto; display: block }
.buehne .gestapelt { font-size: 36px }
.quer { display: inline-flex; align-items: center; gap: .5em; color: inherit; min-width: 0 }
.quer svg { width: 1.7em; height: auto; flex: none; display: block }
.zeilen { border-top: 1px solid var(--linie); padding: 18px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 24px; font-size: 22px }
.zeilen .gross { font-size: 32px }
.anwendung { border-top: 1px solid var(--linie); padding: 20px 24px 24px; display: flex; flex-wrap: wrap; gap: 18px; align-items: end }
figure { margin: 0; display: grid; gap: 8px; justify-items: center }
figcaption { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
.etikett > .quer { font-size: 14px; color: var(--faden); background: var(--stoff); padding: 18px 26px; border-radius: 2px;
  background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px) }
.anhaenger > div { position: relative; background: var(--karton); color: #1d1c1a; border-radius: 3px; padding: 34px 26px 24px; font-size: 14px }
.loch { position: absolute; top: 12px; left: 50%; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: var(--karte); box-shadow: inset 0 0 0 1px rgba(0,0,0,.15) }

.vergleich h3 { font-family: var(--antiqua); font-weight: 500; font-size: 30px; margin: 0 0 12px }
.matrix-rahmen { overflow-x: auto; background: var(--karte); border: 1px solid var(--linie); border-radius: 6px }
.matrix { display: grid; min-width: 900px }
.m-kopf, .m-zeile { display: grid; grid-template-columns: 90px repeat(4, 1fr); align-items: center }
.m-kopf span { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise); padding: 14px 20px }
.m-zeile { border-top: 1px solid var(--linie) }
.m-zeile > span { padding: 22px 20px; font-size: 21px; color: var(--tinte) }
.m-zeile > .m-name { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
.leer { font: 400 12px var(--ui); color: var(--leise) }
footer { color: var(--leise); font-size: 14px; max-width: 72ch; display: grid; gap: 8px }
footer p { margin: 0 }
</style>
<div class="rahmen">
  <header>
    <span class="zeile">Modelabel · Name und Wortmarke</span>
    <h1>Antiqua mit Pur und Fein</h1>
    <p>Alle vier Namen in der Antiqua, links mit dem Zeichen «Pur», rechts mit «Fein». Jeweils gestapelt, nebeneinander, bei Otium und Mola auch mit dem Zeichen als O, dazu auf Webetikett und Anhänger.</p>
  </header>
  ${namen.map(abschnitt).join('')}
  <section class="vergleich">
    <h3>Alle Kombinationen</h3>
    <div class="matrix-rahmen">${matrix}
    </div>
  </section>
  <footer>
    <p>Die Antiqua ist ein Platzhalter (Cormorant Garamond aus Google Fonts). Für die finale Wortmarke würde man die Buchstaben einzeln nachzeichnen und die Abstände von Hand ausgleichen.</p>
    <p>Ob die Namen für Bekleidung (Klasse 25) frei sind, ist noch nicht geprüft.</p>
  </footer>
</div>
`

if (process.argv[2]) writeFileSync(process.argv[2], seite) // nur der Inhalt, ohne Gerüst
writeFileSync(join(hier, 'wortmarken.html'), `<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${seite}</html>\n`)
console.log('fertig: wortmarken.html')
