// Zeichnet die drei Bäume als Skizze neben ihrer Logo-Form.
// node modelabel/logo/skizzen.mjs [ziel-für-artifact.html]
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { baeume } from './formen.mjs'

const hier = dirname(fileURLToPath(import.meta.url))

// Fester Zufall, damit jede Skizze bei jedem Lauf gleich aussieht.
let saat = 7
const zufall = () => ((saat = (saat * 16807) % 2147483647) / 2147483647)
const z = (n) => n.toFixed(1)

// Wolkige Krone: Bögen rund um eine Ellipse, leicht unregelmässig.
function wolke(cx, cy, rx, ry, bogen, abflachen = 0) {
  const pkt = []
  for (let i = 0; i < bogen; i++) {
    const w = (i / bogen) * Math.PI * 2 + zufall() * 0.12
    let y = cy + Math.sin(w) * ry * (1 + (zufall() - 0.5) * 0.12)
    if (abflachen && y > cy + ry * abflachen) y = cy + ry * abflachen
    pkt.push([cx + Math.cos(w) * rx * (1 + (zufall() - 0.5) * 0.12), y])
  }
  let d = `M${z(pkt[0][0])},${z(pkt[0][1])}`
  for (let i = 1; i <= bogen; i++) {
    const [x, y] = pkt[i % bogen]
    const [px, py] = pkt[i - 1]
    const r = Math.hypot(x - px, y - py) * (0.55 + zufall() * 0.2)
    d += ` A${z(r)},${z(r)} 0 0 1 ${z(x)},${z(y)}`
  }
  return d + ' Z'
}

// Teeblatt: länglich, spitz, fein gesägter Rand, Mittelrippe und Seitenadern.
function blatt(laenge, breite, zaehne = 16) {
  const oben = [], unten = []
  for (let i = 0; i <= zaehne * 2; i++) {
    const t = i / (zaehne * 2)
    const w = breite * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.9)
    const zahn = i % 2 && t > 0.08 && t < 0.96 ? breite * 0.06 : 0
    oben.push([t * laenge, -(w + zahn)])
    unten.push([t * laenge, w + zahn])
  }
  const rand = 'M0,0 ' + oben.map(([x, y]) => `L${z(x)},${z(y)}`).join(' ') + ' ' +
    unten.reverse().map(([x, y]) => `L${z(x)},${z(y)}`).join(' ') + ' Z'
  let adern = `M0,0 L${z(laenge * 0.97)},0`
  for (const t of [0.18, 0.32, 0.46, 0.6, 0.74]) {
    for (const s of [-1, 1]) {
      const t2 = t + 0.13
      const w2 = breite * 0.82 * Math.sin(Math.PI * t2)
      adern += ` M${z(t * laenge)},0 Q${z((t + 0.07) * laenge)},${z(s * w2 * 0.55)} ${z(t2 * laenge)},${z(s * w2)}`
    }
  }
  return { rand, adern }
}

const linie = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"'
const skizze = (inhalt) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 260" role="img">${inhalt}</svg>`

// Platane: dicker kurzer Stamm mit Flecken, wenige starke Äste, breite Krone.
const platane = (() => {
  const krone = wolke(120, 100, 104, 70, 15)
  const innen = wolke(122, 104, 70, 44, 9)
  const flecken = [[114, 214, 6, 9], [126, 194, 5, 7], [117, 178, 4, 6], [124, 232, 6, 5]]
    .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="var(--wasch)" stroke="currentColor" stroke-width="1.2"/>`).join('')
  const blattform = 'M0,0 L-6,-10 L-16,-8 L-12,-20 L-20,-30 L-8,-30 L-4,-42 L0,-34 L4,-42 L8,-30 L20,-30 L12,-20 L16,-8 L6,-10 Z'
  return skizze(
    `<path d="${krone}" fill="var(--wasch)" ${linie} stroke-width="2.2"/>` +
    `<path d="${innen}" ${linie} stroke-width="1.2" opacity=".55"/>` +
    `<path d="M106,250 C110,215 108,185 104,160 M134,250 C130,215 132,185 136,160" ${linie} stroke-width="2.4"/>` +
    `<path d="M104,160 C98,140 80,128 62,118 M112,162 C114,140 108,120 104,96 M128,160 C134,140 150,126 170,116 M136,160 C150,150 168,146 186,140" ${linie} stroke-width="3.4"/>` +
    flecken +
    `<path d="M70,250 H170" ${linie} stroke-width="1.6"/>` +
    `<g transform="translate(206 246) scale(.85)"><path d="${blattform}" fill="var(--wasch)" ${linie} stroke-width="2.4"/><path d="M0,0 V-34 M0,-10 L-14,-26 M0,-10 L14,-26" ${linie} stroke-width="1.6"/></g>`)
})()

// Zypresse: schmale Säule mit zackigem Rand, kaum Stamm. Eine kleinere dahinter.
function saeule(cx, oben, unten, breit) {
  const links = [], rechts = []
  const n = 26
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const y = oben + t * (unten - oben)
    const w = breit * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.62 + 0.02)), 1.3)
    const zack = i % 2 ? breit * 0.12 : 0
    links.push([cx - w - zack, y]); rechts.push([cx + w + zack, y])
  }
  return `M${cx},${oben} ` + rechts.map(([x, y]) => `L${z(x)},${z(y)}`).join(' ') + ' ' +
    links.reverse().map(([x, y]) => `L${z(x)},${z(y)}`).join(' ') + ' Z'
}
const zypresse = skizze(
  `<path d="${saeule(72, 96, 236, 16)}" fill="none" ${linie} stroke-width="1.4" opacity=".5"/>` +
  `<path d="${saeule(130, 12, 236, 26)}" fill="var(--wasch)" ${linie} stroke-width="2"/>` +
  `<path d="M130,40 C126,90 134,150 128,220 M118,120 L128,104 M140,150 L130,134 M120,180 L128,168" ${linie} stroke-width="1.1" opacity=".55"/>` +
  `<path d="M125,236 V250 M135,236 V250 M44,250 H190" ${linie} stroke-width="2"/>`)

// Tee: Zweig mit Knospe und zwei Blättern, dahinter ein flach geschnittener Teestrauch.
const tee = (() => {
  const gross = blatt(96, 26), klein = blatt(70, 19, 12)
  const strauch = 'M16,250 C16,234 22,224 34,224 A12,12 0 0 1 56,220 A13,13 0 0 1 82,218 A13,13 0 0 1 108,217 A13,13 0 0 1 134,217 A13,13 0 0 1 160,218 A13,13 0 0 1 186,220 A12,12 0 0 1 208,224 C220,226 224,236 224,250 Z'
  return skizze(
    `<path d="${strauch}" ${linie} stroke-width="1.3" opacity=".45"/><path d="M8,250 H232" ${linie} stroke-width="1.6"/>` +
    `<path d="M120,214 C118,170 124,120 120,46" ${linie} stroke-width="2.4"/>` +
    `<path d="M120,48 C112,36 114,20 121,8 C128,20 128,36 120,48 Z" fill="var(--wasch)" ${linie} stroke-width="2"/>` +
    `<g transform="translate(121 96) rotate(-38)"><path d="${gross.rand}" fill="var(--wasch)" ${linie} stroke-width="1.9"/><path d="${gross.adern}" ${linie} stroke-width="1.1"/></g>` +
    `<g transform="translate(120 150) rotate(205)"><path d="${klein.rand}" fill="var(--wasch)" ${linie} stroke-width="1.9"/><path d="${klein.adern}" ${linie} stroke-width="1.1"/></g>`)
})()

// Logo-Form: nur der Baum, so wie er hinter dem Glas steht.
const logoform = (b) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="20 0 160 180" role="img"><g ${linie} stroke-width="6">` +
  [...b.flaeche, ...b.linien].map(d => `<path d="${d}"/>`).join('') + `</g></svg>`

const reihen = [
  {
    name: 'Platane', tuerkisch: 'çınar', zeichnung: platane, logo: logoform(baeume.platane),
    text: [
      'Ein grosser Laubbaum mit kurzem, dickem Stamm und einer breiten, runden Krone. Er wird mehrere hundert Jahre alt.',
      'Du kennst ihn wahrscheinlich aus Parks und Alleen: Die Rinde blättert in Flecken ab, der Stamm sieht grau, grün und beige gescheckt aus. Die Blätter ähneln Ahornblättern (unten rechts).',
      'In der Türkei stehen alte Platanen auf Dorfplätzen und in Teegärten. Man trinkt Tee in ihrem Schatten.',
    ],
  },
  {
    name: 'Zypresse', tuerkisch: 'servi', zeichnung: zypresse, logo: logoform(baeume.zypresse),
    text: [
      'Ein immergrüner Nadelbaum, sehr schlank und spitz wie eine Säule oder Flamme. Bekannt aus der Toskana und dem ganzen Mittelmeer.',
      'In Istanbul prägen Zypressen die Hügel am Bosporus.',
      'Gut zu wissen: In der Türkei pflanzt man Zypressen traditionell auf Friedhöfen. Viele denken bei ihr deshalb an Trauer und Abschied. Für ein Modelabel ist das eine Bedeutung, die man kennen sollte.',
    ],
  },
  {
    name: 'Teestrauch', tuerkisch: 'çay', zeichnung: tee, logo: logoform(baeume.teeblatt),
    text: [
      'Tee wächst eigentlich an einem Strauch und nicht an einem Baum. In der Türkei wächst er an der Schwarzmeerküste um Rize auf steilen Terrassen. Die Sträucher werden hüfthoch und flach geschnitten (hinten in der Skizze).',
      'Die Blätter sind dunkelgrün, glänzend, länglich mit Spitze und haben einen fein gesägten Rand. Gepflückt werden nur die Triebspitzen: eine Knospe und zwei Blätter, wie auf der Zeichnung.',
      'Der Baum im Logo ist also erfunden: Seine Krone ist ein Teeblatt. Damit ist er der einzige der drei, der direkt vom Tee erzählt.',
    ],
  },
]

const seite = `<title>Baum-Skizzen</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;1,6..96,400&family=Jost:wght@400;500&display=swap">
<style>
/* Layout: pro Baum eine Zeile – Text, Skizze, Pfeil, Logo-Form; auf dem Handy untereinander */
:root {
  --papier: #f6f5f3; --karte: #ffffff; --tinte: #1d1c1a; --leise: #6b6763; --linie: #e3e0dc; --wasch: #e6ebe0; --tee: #9e2a1c;
  --anzeige: 'Bodoni Moda', 'Didot', 'Bodoni 72', Georgia, serif;
  --text: 'Jost', 'Futura', 'Avenir Next', system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --papier: #121110; --karte: #1b1a19; --tinte: #ece9e4; --leise: #a29d97; --linie: #2e2c2a; --wasch: #2a3027; --tee: #c2412d; color-scheme: dark } }
:root[data-theme="dark"] { --papier: #121110; --karte: #1b1a19; --tinte: #ece9e4; --leise: #a29d97; --linie: #2e2c2a; --wasch: #2a3027; --tee: #c2412d; color-scheme: dark }
body { background: var(--papier); color: var(--tinte); font-family: var(--text); font-size: 16px; line-height: 1.55 }
.rahmen { max-width: 1080px; margin: 0 auto; padding-inline: 20px; padding-block: 48px 64px; display: grid; gap: 40px }
header { display: grid; gap: 12px; max-width: 62ch }
.zeile { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
h1 { font-family: var(--anzeige); font-weight: 500; font-size: clamp(34px, 6vw, 54px); line-height: 1.05; margin: 0; text-wrap: balance }
header p { margin: 0; color: var(--leise) }
.baum { background: var(--karte); border: 1px solid var(--linie); border-radius: 6px; padding: 28px; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) auto minmax(0, .6fr); gap: 28px; align-items: center }
.baum.favorit { border-color: var(--tee) }
.text { display: grid; gap: 10px; min-width: 0 }
h2 { font-family: var(--anzeige); font-weight: 500; font-size: 30px; margin: 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px }
h2 em { font-weight: 400; font-size: 20px; color: var(--leise) }
.marke { font-family: var(--text); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--tee); border: 1px solid var(--tee); border-radius: 3px; padding: 2px 6px }
.text p { margin: 0; color: var(--leise); font-size: 15px; max-width: 60ch }
figure { margin: 0; display: grid; gap: 8px; justify-items: center; color: var(--tinte) }
figure svg { width: 100%; max-width: 260px; height: auto }
figcaption { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--leise) }
.pfeil { color: var(--leise); font-size: 28px; line-height: 1 }
.logo svg { max-width: 130px }
@media (max-width: 820px) {
  .baum { grid-template-columns: 1fr 1fr; padding: 20px }
  .text { grid-column: 1 / -1 }
  .pfeil { display: none }
}
</style>
<div class="rahmen">
  <header>
    <span class="zeile">Modelabel · Logo · die Bäume</span>
    <h1>Drei Bäume, skizziert</h1>
    <p>Links siehst du, wie der Baum in echt aussieht, rechts die vereinfachte Form, die hinter dem Çay-Glas steht.</p>
  </header>
  ${reihen.map((r, i) => `
  <section class="baum${i === 2 ? ' favorit' : ''}">
    <div class="text">
      <h2>${r.name} <em>${r.tuerkisch}</em>${i === 2 ? ' <span class="marke">Deine Tendenz</span>' : ''}</h2>
      ${r.text.map(t => `<p>${t}</p>`).join('\n      ')}
    </div>
    <figure>${r.zeichnung}<figcaption>Skizze</figcaption></figure>
    <span class="pfeil" aria-hidden="true">→</span>
    <figure class="logo">${r.logo}<figcaption>Im Logo</figcaption></figure>
  </section>`).join('')}
</div>
`

if (process.argv[2]) writeFileSync(process.argv[2], seite) // nur der Inhalt, ohne Gerüst
writeFileSync(join(hier, 'baeume.html'), `<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${seite}</html>\n`)
console.log('fertig: baeume.html')
