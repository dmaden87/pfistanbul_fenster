// Setzt die Namen-Kandidaten neben das Zeichen «Pur»: drei Schriftrichtungen,
// gestapelt und nebeneinander, auf Etikett und Anhänger.
// node modelabel/logo/wortmarken.mjs [ziel-für-artifact.html]
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zeichen, PUR } from './formen.mjs'

const hier = dirname(fileURLToPath(import.meta.url))

let zaehler = 0
// Neben Schrift braucht das Zeichen etwas mehr Linie als allein, damit beide gleich schwer wirken.
const pur = zeichen({ ...PUR, strich: 7.5 })
const marke = () => pur(`w${zaehler++}`)
// Als Buchstabe O braucht das Zeichen eine kräftigere Linie, sonst wirkt es neben der Schrift zu dünn.
const purO = zeichen({ ...PUR, strich: 12 })
const markeO = () => purO(`o${zaehler++}`)

const namen = [
  { name: 'Zarif', herkunft: 'Türkisch', bedeutung: 'fein, elegant, anmutig', notiz: 'Das Z gibt dem Namen Kontur, der Rest bleibt weich. Gesprochen «za-RIF».' },
  { name: 'Otium', herkunft: 'Lateinisch', bedeutung: 'kultivierte Musse, die freie Zeit derer, die angekommen sind', notiz: 'Beginnt mit O, also kann das Zeichen selbst der erste Buchstabe sein. I, U und M stehen ruhig daneben.' },
  { name: 'Safa', herkunft: 'Türkisch', bedeutung: 'unbeschwerter Genuss, Heiterkeit', notiz: 'Der weichste der vier. Die zwei A geben einen gleichmässigen Rhythmus, fast spiegelbildlich.' },
  { name: 'Mola', herkunft: 'Türkisch', bedeutung: 'Pause, wie in «çay molası», der Teepause', notiz: 'Das O steht genau in der Mitte. Als Zeichen gesetzt wird es zum Mittelpunkt des Namens.' },
]

const schriften = [
  { id: 'grotesk', name: 'Grotesk, weit', text: 'Geometrische Grotesk in Versalien mit viel Abstand. Die klassische Basic-Premium-Sprache: klar, ruhig, international.' },
  { id: 'antiqua', name: 'Antiqua', text: 'Feine Serifenschrift in Versalien. Wirkt älter und kultivierter, eher Maison als Basic.' },
  { id: 'rund', name: 'Rund, klein', text: 'Weiche Serife in Kleinbuchstaben. Die freundlichste Fassung, nahbar und trotzdem hochwertig.' },
]

// Wort mit dem ersten O als Zeichen.
const mitO = (name) => {
  const i = name.toLowerCase().indexOf('o')
  return `${name.slice(0, i)}<span class="o-zeichen" aria-hidden="true">${markeO()}</span>${name.slice(i + 1)}`
}

const karte = (n) => `
    <article class="name">
      <div class="kopf">
        <h2>${n.name}</h2>
        <p class="bedeutung"><span>${n.herkunft}</span> ${n.bedeutung}</p>
      </div>
      <div class="buehne">
        <div class="gestapelt">${marke()}<span class="wort">${n.name}</span></div>
      </div>
      <div class="zeilen">
        <div class="quer">${marke()}<span class="wort">${n.name}</span></div>
        ${/o/i.test(n.name) ? `<div class="quer nur-wort"><span class="wort" aria-label="${n.name}">${mitO(n.name)}</span><span class="hinweis">O als Zeichen</span></div>` : ''}
      </div>
      <div class="anwendung">
        <figure class="etikett"><div class="quer">${marke()}<span class="wort">${n.name}</span></div><figcaption>Webetikett</figcaption></figure>
        <figure class="anhaenger"><div><span class="loch"></span><div class="gestapelt">${marke()}<span class="wort">${n.name}</span></div></div><figcaption>Anhänger</figcaption></figure>
      </div>
      <p class="notiz">${n.notiz}</p>
    </article>`

const matrix = `
    <div class="matrix" role="table" aria-label="Alle Namen in allen Schriften">
      <div class="m-kopf" role="row"><span role="columnheader"></span>${schriften.map(s => `<span role="columnheader">${s.name}</span>`).join('')}</div>
      ${namen.map(n => `<div class="m-zeile" role="row"><span class="m-name" role="rowheader">${n.name}</span>${schriften.map(s => `<span role="cell" class="s-${s.id}"><span class="quer">${marke()}<span class="wort">${n.name}</span></span></span>`).join('')}</div>`).join('\n      ')}
    </div>`

const seite = `<title>Namen und Wortmarke</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Fraunces:opsz,wght,SOFT@9..144,300..500,0..100&family=Jost:wght@400;500&display=swap">
<style>
/* Layout: Schriftwahl oben, je Name eine Karte (gestapelt, quer, O-Variante, Etikett, Anhänger), unten alle Kombinationen als Raster */
:root {
  --papier: #f5f4f1; --karte: #ffffff; --tinte: #171615; --leise: #6b6763; --linie: #e2dfda;
  --stoff: #23272c; --faden: #ece5d6; --karton: #e8e2d6; --akzent: #8a3a2b;
  --ui: 'Jost', 'Futura', 'Avenir Next', system-ui, sans-serif;
  --grotesk: 'Jost', 'Futura', 'Avenir Next', system-ui, sans-serif;
  --antiqua: 'Cormorant Garamond', 'Garamond', 'Baskerville', Georgia, serif;
  --rund: 'Fraunces', 'Iowan Old Style', Georgia, serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --papier: #121110; --karte: #1a1918; --tinte: #f0ede8; --leise: #a39e97; --linie: #2e2c29; --stoff: #0d0f11; --karton: #d8d1c4; --akzent: #c0614c; color-scheme: dark } }
:root[data-theme="dark"] { --papier: #121110; --karte: #1a1918; --tinte: #f0ede8; --leise: #a39e97; --linie: #2e2c29; --stoff: #0d0f11; --karton: #d8d1c4; --akzent: #c0614c; color-scheme: dark }
body { background: var(--papier); color: var(--tinte); font-family: var(--ui); font-size: 16px; line-height: 1.55 }
.rahmen { max-width: 1160px; margin: 0 auto; padding-inline: 20px; padding-block: 48px 72px; display: grid; gap: 36px }
header { display: grid; gap: 12px; max-width: 64ch }
.zeile { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
h1 { font-family: var(--antiqua); font-weight: 500; font-size: clamp(38px, 6vw, 60px); line-height: 1.02; margin: 0; text-wrap: balance }
header p { margin: 0; color: var(--leise) }

/* Schriftwahl */
.wahl { display: grid; gap: 10px }
.knoepfe { display: flex; flex-wrap: wrap; gap: 8px }
.knoepfe button { font: 500 14px var(--ui); color: var(--tinte); background: var(--karte); border: 1px solid var(--linie); border-radius: 999px; padding: 8px 16px; cursor: pointer }
.knoepfe button[aria-pressed="true"] { background: var(--tinte); color: var(--papier); border-color: var(--tinte) }
.knoepfe button:focus-visible { outline: 2px solid var(--akzent); outline-offset: 2px }
.wahl p { margin: 0; color: var(--leise); font-size: 14.5px; max-width: 64ch }

/* Schriftrichtungen: gelten für alles mit .wort innerhalb */
.s-grotesk .wort { font-family: var(--grotesk); font-weight: 400; text-transform: uppercase; letter-spacing: .34em; margin-right: -.34em }
.s-antiqua .wort { font-family: var(--antiqua); font-weight: 500; text-transform: uppercase; letter-spacing: .24em; margin-right: -.24em }
.s-rund .wort { font-family: var(--rund); font-weight: 380; font-variation-settings: 'SOFT' 100, 'opsz' 72; text-transform: lowercase; letter-spacing: .01em }

.namen { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 500px), 1fr)); gap: 20px }
.name { background: var(--karte); border: 1px solid var(--linie); border-radius: 6px; display: grid; align-content: start }
.kopf { padding: 22px 24px 0; display: grid; gap: 2px }
h2 { margin: 0; font: 500 13px var(--ui); letter-spacing: .16em; text-transform: uppercase; color: var(--leise) }
.bedeutung { margin: 0; font-size: 15px }
.bedeutung span { color: var(--leise) }
.buehne { display: grid; place-items: center; padding: 36px 24px 32px; color: var(--tinte) }

.gestapelt { display: grid; justify-items: center; gap: .55em }
.gestapelt svg { width: 2.6em; height: auto; display: block }
.buehne .gestapelt { font-size: 34px }
.quer { display: inline-flex; align-items: center; gap: .55em; color: inherit; min-width: 0 }
.quer svg { width: 1.7em; height: auto; flex: none; display: block }
.zeilen { border-top: 1px solid var(--linie); padding: 18px 24px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 24px; font-size: 22px }
.nur-wort { gap: 14px; align-items: baseline; font-size: 30px }
.hinweis { font: 400 11px var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
.o-zeichen { display: inline-block; width: 1.06em; vertical-align: -.2em; margin-inline: -.1em; letter-spacing: 0 }
.s-grotesk .o-zeichen { margin-right: .24em }
.s-antiqua .o-zeichen { margin-right: .14em }
.s-rund .o-zeichen { width: .8em; vertical-align: -.15em; margin-inline: -.06em .02em }
.o-zeichen svg { width: 100%; height: auto; display: block }

.anwendung { border-top: 1px solid var(--linie); padding: 20px 24px; display: flex; flex-wrap: wrap; gap: 18px; align-items: end }
figure { margin: 0; display: grid; gap: 8px; justify-items: center }
figcaption { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
.etikett > .quer { font-size: 13px; color: var(--faden); background: var(--stoff); padding: 18px 26px; border-radius: 2px;
  background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px) }
.anhaenger > div { position: relative; background: var(--karton); color: #1d1c1a; border-radius: 3px; padding: 34px 26px 24px; font-size: 13px }
.loch { position: absolute; top: 12px; left: 50%; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: var(--karte); box-shadow: inset 0 0 0 1px rgba(0,0,0,.15) }
.notiz { margin: 0; padding: 0 24px 22px; color: var(--leise); font-size: 14.5px }

section > h3 { font-family: var(--antiqua); font-weight: 500; font-size: 30px; margin: 0 0 12px }
.matrix-rahmen { overflow-x: auto; background: var(--karte); border: 1px solid var(--linie); border-radius: 6px }
.matrix { display: grid; min-width: 760px }
.m-kopf, .m-zeile { display: grid; grid-template-columns: 90px repeat(3, 1fr); align-items: center }
.m-kopf span { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise); padding: 14px 20px }
.m-zeile { border-top: 1px solid var(--linie) }
.m-zeile > span { padding: 22px 20px; font-size: 20px; color: var(--tinte) }
.m-name { font-size: 12px !important; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) !important }
footer { color: var(--leise); font-size: 14px; max-width: 72ch; display: grid; gap: 8px }
footer p { margin: 0 }
</style>
<div class="rahmen">
  <header>
    <span class="zeile">Modelabel · Name und Wortmarke</span>
    <h1>Vier Namen neben dem Zeichen</h1>
    <p>Zarif, Otium, Safa und Mola, jeweils mit dem Zeichen «Pur»: gestapelt, nebeneinander, auf einem Webetikett und auf einem Anhänger. Oben wählst du die Schriftrichtung, unten stehen alle zwölf Kombinationen zum Vergleich.</p>
  </header>
  <div class="wahl">
    <div class="knoepfe" role="group" aria-label="Schriftrichtung">
      ${schriften.map((s, i) => `<button type="button" id="schrift-${s.id}" data-schrift="${s.id}" aria-pressed="${i === 0}">${s.name}</button>`).join('\n      ')}
    </div>
    <p id="schrift-text">${schriften[0].text}</p>
  </div>
  <section class="namen s-grotesk" id="namen">${namen.map(karte).join('')}
  </section>
  <section>
    <h3>Alle Kombinationen</h3>
    <div class="matrix-rahmen">${matrix}
    </div>
  </section>
  <footer>
    <p>Die Schriften sind Platzhalter aus Google Fonts, die der Richtung nahekommen. Für die finale Wortmarke würde man die Buchstaben einzeln nachzeichnen und den Abstand von Hand ausgleichen.</p>
    <p>Ob die Namen für Bekleidung (Klasse 25) frei sind, ist noch nicht geprüft.</p>
  </footer>
</div>
<script>
const texte = ${JSON.stringify(Object.fromEntries(schriften.map(s => [s.id, s.text])))}
const bereich = document.getElementById('namen')
const knoepfe = document.querySelectorAll('[data-schrift]')
function waehle(id) {
  if (!texte[id]) return
  bereich.className = 'namen s-' + id
  knoepfe.forEach(k => k.setAttribute('aria-pressed', String(k.dataset.schrift === id)))
  document.getElementById('schrift-text').textContent = texte[id]
  try { localStorage.setItem('schrift', id) } catch (e) {}
}
knoepfe.forEach(k => k.addEventListener('click', () => waehle(k.dataset.schrift)))
try { const gemerkt = localStorage.getItem('schrift'); if (gemerkt) waehle(gemerkt) } catch (e) {}
</script>
`

if (process.argv[2]) writeFileSync(process.argv[2], seite) // nur der Inhalt, ohne Gerüst
writeFileSync(join(hier, 'wortmarken.html'), `<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${seite}</html>\n`)
console.log('fertig: wortmarken.html')
