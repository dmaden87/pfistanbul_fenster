/**
 * Die Referenzpreise fuer Deniz und Ufuk, auf Deutsch, als PDF.
 *
 * Aufruf: npm run referenzpreise
 *
 * Heraus kommt drucksachen/referenzpreise.pdf: je Rahmendicke eine Seite
 * mit einer Tabelle Breite x Hoehe, in jeder Zelle der Richtpreis fuer ein
 * Netz dieser Masse.
 *
 * WOFUER: Beim Ausmessen vor Ort steht man mit dem Metermass am Fenster und
 * soll sagen koennen, was es kostet - ohne das Telefon herauszuholen und
 * ohne zu rechnen. Ein Blatt im Rucksack beantwortet das in einer Sekunde.
 *
 * WARUM PDF UND NICHT BILD: Das Preisblatt fuer Bora geht per WhatsApp, da
 * ist ein Bild richtig. Dieses hier wird ausgedruckt und gefaltet, und ein
 * PDF bringt sein Papierformat mit, statt es dem Drucker zu ueberlassen.
 *
 * ES RECHNET NICHT SELBST. Jede Zelle kommt aus estimateNetChf(), die
 * Eckdaten aus preisFormel - alles aus src/lib/estimate.ts. Die Formel hier
 * abzuschreiben waere eine zweite Wahrheit; nach der naechsten Anpassung
 * zeigte das Blatt Preise, die niemand mehr verlangt. Genau so ist die
 * beworbene Spanne einmal auf "100 bis 200" stehengeblieben.
 *
 * DIE ZAHLEN SIND RICHTPREISE, KEINE OFFERTE. Was die Kundin bezahlt, steht
 * im Auftrag; dieses Blatt sagt, womit zu rechnen ist, bevor es einen
 * Auftrag gibt.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { estimateNetChf, margeProzent, preisFormel, selbstkostenChf } from '../src/lib/estimate.ts'
import { kostenConfig } from '../src/data/kostenConfig.ts'
import { RAHMENDICKEN } from '../src/data/produktion.ts'
import { shopConfig } from '../src/data/shopConfig.ts'

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ZIEL = 'drucksachen'

/*
 * DAS RASTER DECKT AB, WAS VORKOMMT. Unter 50 cm gibt es kaum ein Fenster,
 * und ueber 200 Breite faellt ein Plissee ohnehin in die Beratung. Die
 * Schritte von zehn Zentimetern sind grob genug fuer eine Seite und fein
 * genug zum Ablesen: Wer 137 misst, liest 140 und liegt nie zu tief, weil
 * der Preis mit der Flaeche steigt.
 */
const BREITEN = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]
const HOEHEN = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250]

/*
 * Der gewoehnliche Rahmen kommt zuerst - er ist der Normalfall, und wer das
 * Blatt aus dem Rucksack zieht, soll ihn oben haben und nicht blaettern.
 */
const DICKEN = ['2.8', '1.5']

/* Die Formate, an denen sich Kosten und Marge ablesen lassen. */
const ECKPUNKTE = [[100, 100], [100, 150], [100, 200], [150, 200], [200, 250]]

const chf = (x) => x.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const schrift = (datei) =>
  `url(data:font/woff2;base64,${readFileSync(`public/fonts/${datei}`).toString('base64')}) format('woff2')`

const seite = (dicke) => {
  const satzEur = kostenConfig.proM2Eur[dicke] ?? kostenConfig.proM2StandardEur
  const name = RAHMENDICKEN[dicke]?.deutsch ?? `${dicke} cm`

  const zeilen = HOEHEN.map((h) => {
    const zellen = BREITEN.map((b) => {
      const preis = estimateNetChf(b, h, dicke)
      const m2 = (b / 100) * (h / 100)
      /* Wo der Mindestpreis greift, traegt das Netz seine Marge nicht mehr
         aus der Flaeche - das soll man sehen, nicht nachrechnen muessen. */
      const mindest = preis === preisFormel.mindestpreisChf
      return `<td class="${mindest ? 'mindest' : ''}${m2 > 2 ? ' gross' : ''}">${preis}</td>`
    }).join('')
    return `<tr><th scope="row">${h}</th>${zellen}</tr>`
  }).join('')

  const eck = ECKPUNKTE.map(([b, h]) => {
    const kosten = selbstkostenChf(b, h, dicke)
    const preis = estimateNetChf(b, h, dicke)
    return `<tr>
      <td class="links">${b} × ${h}</td>
      <td>${((b / 100) * (h / 100)).toFixed(2)} m²</td>
      <td>${chf(kosten)}</td>
      <td class="preis">${preis}</td>
      <td>${chf(Math.round((preis - kosten) * 100) / 100)}</td>
      <td class="prozent">${margeProzent(b, h, dicke)}%</td>
    </tr>`
  }).join('')

  return `<section class="blatt">
  <div class="kopf">
    <h1>Referenzpreise · ${name}</h1>
    <span class="marke">Pfistanbul Fenster · ${new Date().toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}</span>
  </div>
  <p class="lead">
    Richtpreis je Netz in Franken, aufgerundet auf ${preisFormel.rundungChf}. Senkrecht die Höhe, waagrecht die
    Breite, beides in Zentimetern. Einkauf ${satzEur} €/m². <strong>Montage kommt dazu:
    CHF ${shopConfig.montageChf} je Netz.</strong> Wir sind nicht mehrwertsteuerpflichtig.
  </p>

  <table class="raster">
    <thead>
      <tr><th class="ecke">H ╲ B</th>${BREITEN.map((b) => `<th>${b}</th>`).join('')}</tr>
    </thead>
    <tbody>${zeilen}</tbody>
  </table>

  <div class="fuss">
    <div>
      <h2>Was dahintersteckt</h2>
      <table class="eck">
        <thead>
          <tr><th class="links">Mass</th><th>Fläche</th><th>Kostet uns</th><th>Preis</th><th>Bleibt</th><th>Marge</th></tr>
        </thead>
        <tbody>${eck}</tbody>
      </table>
    </div>
    <div>
      <h2>Zum Ablesen</h2>
      <p>
        Zwischenmasse auf den nächsten Strich aufrunden – der Preis steigt mit der
        Fläche, wer aufrundet liegt nie zu tief.
      </p>
      <p>
        <span class="muster mindest"></span> Mindestpreis CHF ${preisFormel.mindestpreisChf}: Darunter geht kein Netz,
        weil wir für jedes zweimal hinfahren.<br>
        <span class="muster gross"></span> Über 2 m² – grosse Formate, hier lohnt der Blick auf die Montage.
      </p>
      <p class="formel">${preisFormel.sockelChf} + ${preisFormel.warenfaktor} × Selbstkosten, mindestens ${preisFormel.mindestpreisChf}</p>
    </div>
  </div>
</section>`
}

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<style>
  @font-face { font-family: 'Fraunces'; font-weight: 700; src: ${schrift('fraunces-normal-700-latin-ext.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 400; src: ${schrift('inter-normal-400-latin-ext.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 600; src: ${schrift('inter-normal-600-latin-ext.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 700; src: ${schrift('inter-normal-700-latin-ext.woff2')}; }

  @page { size: A4 landscape; margin: 8mm 9mm; }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #111111; background: #ffffff; -webkit-print-color-adjust: exact; }
  .blatt { break-after: page; }
  .blatt:last-child { break-after: auto; }

  .kopf { display: flex; align-items: baseline; justify-content: space-between; gap: 10mm; }
  h1 { font-family: 'Fraunces', serif; font-size: 17pt; letter-spacing: -0.02em; color: #10302b; }
  .marke { font-size: 8.5pt; color: #666666; }
  .lead { margin-top: 1.5mm; font-size: 8pt; line-height: 1.4; color: #333333; }

  .raster { width: 100%; margin-top: 3mm; border-collapse: collapse; table-layout: fixed; font-size: 7.6pt; }
  .raster th, .raster td { padding: 0.55mm 0; text-align: center; line-height: 1.25; }
  .raster thead th {
    font-size: 7.6pt; font-weight: 700; color: #10302b;
    border-bottom: 1pt solid #111111; padding-bottom: 1mm;
  }
  .raster th[scope="row"] {
    font-weight: 700; color: #10302b; border-right: 1pt solid #111111;
    width: 9mm;
  }
  .raster .ecke { font-size: 7pt; font-weight: 600; color: #777777; border-right: 1pt solid #111111; }
  .raster td { border-bottom: 0.25pt solid #e2e2dd; color: #111111; }
  .raster tbody tr:nth-child(even) td { background: #f7f7f4; }
  .raster tbody tr:nth-child(even) th[scope="row"] { background: #f7f7f4; }
  /* Die beiden Lagen muessen auch auf dem Wechselstreifen sichtbar bleiben. */
  .raster td.mindest, .raster tbody tr:nth-child(even) td.mindest { background: #eef3ee; color: #5c6b5c; }
  .raster td.gross, .raster tbody tr:nth-child(even) td.gross { background: #fbf3e6; font-weight: 600; }

  .fuss { margin-top: 3.5mm; display: grid; grid-template-columns: 1.35fr 1fr; gap: 8mm; }
  .fuss h2 {
    font-size: 7.5pt; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; color: #555555; margin-bottom: 1.5mm;
  }
  .fuss p { font-size: 8pt; line-height: 1.45; color: #222222; margin-bottom: 1.5mm; }

  .eck { width: 100%; border-collapse: collapse; font-size: 8pt; }
  .eck th {
    padding: 0 2mm 1mm; font-size: 7.5pt; font-weight: 600; text-align: right;
    color: #555555; border-bottom: 0.75pt solid #111111; white-space: nowrap;
  }
  .eck td { padding: 0.8mm 2mm; text-align: right; border-bottom: 0.25pt solid #e2e2dd; white-space: nowrap; }
  .eck .links { text-align: left; font-weight: 600; }
  .eck th.links { text-align: left; }
  .eck .preis { font-weight: 700; color: #10302b; }
  .eck .prozent { color: #1d6b53; font-weight: 600; }

  .muster {
    display: inline-block; width: 3.4mm; height: 2.6mm; margin-right: 1mm;
    vertical-align: -0.2mm; border: 0.25pt solid #cccccc;
  }
  .muster.mindest { background: #eef3ee; }
  .muster.gross { background: #fbf3e6; }

  .formel { font-family: ui-monospace, monospace; font-size: 8pt; color: #8a4b00; }
</style></head><body>
${DICKEN.map(seite).join('\n')}
</body></html>`

mkdirSync(ZIEL, { recursive: true })
const profil = join(ZIEL, 'profil-referenzpreise')
rmSync(profil, { recursive: true, force: true })
mkdirSync(profil, { recursive: true })
const quelle = join(ZIEL, 'referenzpreise.html')
const pdf = join(ZIEL, 'referenzpreise.pdf')
writeFileSync(quelle, html)

execFileSync(CHROMIUM, [
  '--headless=new', '--disable-gpu', '--no-sandbox',
  `--user-data-dir=${profil}`, '--no-first-run',
  '--no-pdf-header-footer', `--print-to-pdf=${pdf}`,
  quelle,
], { stdio: ['ignore', 'ignore', 'pipe'] })

/*
 * GEGENPROBE: Chromium meldet auch dann Erfolg, wenn es eine leere Datei
 * schreibt - etwa wenn eine Schrift fehlt und das Rendern stehenbleibt. Ein
 * PDF unter zwanzig Kilobyte hat keine zwei Seiten Tabelle drin.
 */
const groesse = statSync(pdf).size
if (groesse < 20_000) {
  console.error(`${pdf} ist nur ${groesse} Bytes gross – da steht nichts drin.`)
  process.exit(1)
}

/*
 * UND DIE ZWEITE, WICHTIGERE: EINE SEITE JE RAHMENDICKE. Laeuft die Tabelle
 * ueber, schiebt der Druck die letzten Zeilen auf ein zweites Blatt - und
 * das faellt sonst erst auf, wenn jemand mit dem halben Raster am Fenster
 * steht. Beim ersten Anlauf war genau das der Fall: vier Seiten statt zwei.
 */
const seiten = (readFileSync(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
if (seiten !== DICKEN.length) {
  console.error(`${pdf} hat ${seiten} Seiten statt ${DICKEN.length} – das Raster passt nicht aufs Blatt.`)
  process.exit(1)
}

if (!process.env.HTML_BEHALTEN) rmSync(quelle)
rmSync(profil, { recursive: true, force: true })

const alle = DICKEN.flatMap((d) =>
  HOEHEN.flatMap((h) => BREITEN.map((b) => estimateNetChf(b, h, d))))
console.log(`${pdf} geschrieben – ${(groesse / 1024).toFixed(0)} kB, ${DICKEN.length} Seiten`)
console.log(`${BREITEN.length} Breiten x ${HOEHEN.length} Hoehen · Preise ${Math.min(...alle)} bis ${Math.max(...alle)} CHF`)
console.log(`Formel: ${preisFormel.sockelChf} + ${preisFormel.warenfaktor} x Selbstkosten, mindestens ${preisFormel.mindestpreisChf}`)
