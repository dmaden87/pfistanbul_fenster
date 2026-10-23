/**
 * Das Preisblatt fuer Bora und Ufuk, auf Tuerkisch, als Bild.
 *
 * Aufruf: npm run preisblatt            (2.8er Rahmen, der gewoehnliche)
 *         npm run preisblatt -- 1.5     (der schmale)
 *
 * Heraus kommt drucksachen/preisblatt-<dicke>.png: eine Tabelle mit Massen,
 * Kosten, Verkaufspreis und Marge in Franken und Prozent, dazu die Formel im
 * Klartext und die Frage an die beiden.
 *
 * WARUM TUERKISCH UND WARUM EIN BILD: Bora liest kein Deutsch, und ein Bild
 * laesst sich per WhatsApp schicken, ohne dass jemand eine Tabellendatei
 * oeffnen muss. Dasselbe Blatt geht an Ufuk, damit beide ueber dieselben
 * Zahlen reden.
 *
 * ES RECHNET NICHT SELBST. Preise kommen aus estimateNetChf(), Kosten aus
 * selbstkostenChf(), und Sockel und Faktor stehen als preisFormel daneben -
 * alles aus src/lib/estimate.ts. Die Formel hier abzuschreiben waere eine
 * zweite Wahrheit: Nach der naechsten Anpassung zeigte das Blatt eine
 * Rechnung, nach der niemand mehr arbeitet. Genau so ist die beworbene
 * Preisspanne einmal auf "100 bis 200" stehengeblieben, als der Rechner
 * laengst anders rechnete.
 *
 * WEISS UND MIT HAARLINIEN, nicht im Markengruen: Das Blatt wird gedruckt
 * und auf dem Telefon gelesen. Eine dunkle Tabelle frisst eine halbe
 * Patrone und wird auf Normalpapier grau.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { estimateNetChf, margeProzent, preisFormel, selbstkostenChf } from '../src/lib/estimate.ts'
import { einfuhrsteuerChf, herstellungChf } from '../src/lib/kosten.ts'
import { kostenConfig } from '../src/data/kostenConfig.ts'
import { RAHMENDICKEN } from '../src/data/produktion.ts'

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ZIEL = 'drucksachen'

const dicke = process.argv[2] ?? '2.8'
if (!(dicke in RAHMENDICKEN)) {
  console.error(`Unbekannte Rahmendicke "${dicke}". Moeglich: ${Object.keys(RAHMENDICKEN).join(', ')}`)
  process.exit(1)
}

/*
 * DIE MASSE SIND EINE AUSWAHL, KEINE PREISLISTE. Sie sollen die Spanne
 * zeigen, in der wir uns bewegen - vom kleinsten Badfenster bis zur grossen
 * Tuere -, und darunter die Formate, die bei uns wirklich vorkommen.
 */
const MASSE = [
  [60, 80], [70, 100], [80, 100], [100, 100], [100, 120], [100, 150],
  [160, 122], [100, 210], [128.6, 182.5], [140, 200], [150, 250], [180, 250], [250, 250],
]

const chf = (x) => x.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ganz = (x) => x.toLocaleString('de-CH', { maximumFractionDigits: 0 })

const zeilen = MASSE.map(([b, h]) => {
  const ware = herstellungChf(b, h, dicke)
  const kosten = selbstkostenChf(b, h, dicke)
  const preis = estimateNetChf(b, h, dicke)
  return {
    mass: `${b} × ${h}`,
    flaeche: ((b / 100) * (h / 100)).toFixed(2),
    ware,
    fracht: kostenConfig.frachtProNetzChf,
    zoll: einfuhrsteuerChf(ware),
    kosten,
    preis,
    karChf: Math.round((preis - kosten) * 100) / 100,
    kar: margeProzent(b, h, dicke),
  }
})

/* latin-ext ist Pflicht: ohne sie fallen ş, ğ und ı auf eine Ersatzschrift. */
const schrift = (datei) =>
  `url(data:font/woff2;base64,${readFileSync(`public/fonts/${datei}`).toString('base64')}) format('woff2')`

const satzEur = kostenConfig.proM2Eur[dicke] ?? kostenConfig.proM2StandardEur
const kasa = dicke === '1.5' ? '1.5 cm ince kasa' : '2.8 cm normal kasa'

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<style>
  @font-face { font-family: 'Fraunces'; font-weight: 700; src: ${schrift('fraunces-normal-700-latin-ext.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 400; src: ${schrift('inter-normal-400-latin-ext.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 600; src: ${schrift('inter-normal-600-latin-ext.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 700; src: ${schrift('inter-normal-700-latin-ext.woff2')}; }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; background: #ffffff; color: #111111;
    font-family: 'Inter', sans-serif; padding: 44px 44px 36px;
    -webkit-font-smoothing: antialiased;
  }
  .kopf { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; }
  h1 { font-family: 'Fraunces', serif; font-size: 40px; letter-spacing: -0.02em; color: #10302b; }
  .marke { font-size: 17px; color: #666666; }
  .lead { margin-top: 10px; font-size: 18px; line-height: 1.5; color: #444444; }

  table { width: 100%; margin-top: 28px; border-collapse: collapse; font-size: 19px; }
  th {
    padding: 0 10px 10px; font-size: 14px; font-weight: 600; text-align: right;
    text-transform: uppercase; letter-spacing: 0.05em; color: #555555;
    border-bottom: 1.5pt solid #111111; white-space: nowrap;
  }
  th.links, td.links { text-align: left; }
  td { padding: 9px 10px; text-align: right; border-bottom: 0.5pt solid #d8d8d4; white-space: nowrap; }
  /* Ein sehr heller Wechsel – gerade genug, um die Zeile zu halten. */
  tbody tr:nth-child(even) { background: #f6f6f3; }
  .mass { font-weight: 600; }
  .alan { color: #777777; font-size: 16px; }
  .trenn { border-left: 1pt solid #b8b8b2; }
  .fiyat { font-weight: 700; font-size: 21px; color: #10302b; }
  .kar { font-weight: 600; color: #1d6b53; }
  .kar-prozent { color: #1d6b53; font-size: 17px; }

  .fuss { margin-top: 26px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px 36px; }
  .fuss h2 {
    font-size: 14px; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.05em; color: #555555; margin-bottom: 7px;
  }
  .fuss p { font-size: 16px; line-height: 1.5; color: #222222; }
  .formel {
    margin-top: 6px; font-family: ui-monospace, monospace; font-size: 15.5px;
    color: #8a4b00; line-height: 1.6;
  }
  .frage {
    margin-top: 24px; padding: 16px 20px; border-left: 4px solid #c07a1f;
    background: #faf4ea; font-size: 18px; line-height: 1.5; color: #222222;
  }
</style></head><body>
  <div class="kopf">
    <h1>Satış fiyatı ve kâr</h1>
    <span class="marke">Pfistanbul Fenster · ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</span>
  </div>
  <p class="lead">
    ${kasa}, normal dokuma. Tüm tutarlar İsviçre frangı (CHF).
    Mal bedeli: ${satzEur} €/m², kur 1 € = ${kostenConfig.eurChf} CHF.
  </p>

  <table>
    <thead>
      <tr>
        <th class="links">Ölçü (cm)</th>
        <th>Alan</th>
        <th>Mal</th>
        <th>Kargo</th>
        <th>Gümrük&nbsp;${(kostenConfig.einfuhrsteuer * 100).toFixed(1)}%</th>
        <th class="trenn">Toplam maliyet</th>
        <th class="trenn">Satış fiyatı</th>
        <th class="trenn">Kâr CHF</th>
        <th>Kâr %</th>
      </tr>
    </thead>
    <tbody>
      ${zeilen.map((z) => `
      <tr>
        <td class="links mass">${z.mass}</td>
        <td class="alan">${z.flaeche} m²</td>
        <td>${chf(z.ware)}</td>
        <td>${chf(z.fracht)}</td>
        <td>${chf(z.zoll)}</td>
        <td class="trenn">${chf(z.kosten)}</td>
        <td class="trenn fiyat">${ganz(z.preis)}</td>
        <td class="trenn kar">${chf(z.karChf)}</td>
        <td class="kar-prozent">${z.kar}%</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="fuss">
    <div>
      <h2>Fiyat nasıl hesaplanıyor</h2>
      <p>Taban tutar artı toplam maliyetin katı, ${preisFormel.rundungChf} CHF’ye yukarı yuvarlanır:</p>
      <p class="formel">${preisFormel.sockelChf} + ${preisFormel.warenfaktor} × toplam maliyet<br>en az ${preisFormel.mindestpreisChf} CHF</p>
    </div>
    <div>
      <h2>Bu fiyata dahil değil</h2>
      <p>
        Montaj ayrı bir kalem: sineklik başına 15 CHF.
        Ölçü almak için gidiş‑geliş ücretsiz.
        Biz KDV mükellefi değiliz, fiyatlara KDV eklenmez.
      </p>
    </div>
  </div>

  <div class="frage">
    <strong>Ne dersiniz?</strong> Özellikle 1–2 m² arası ve 3 m² üstü fiyatlar
    sizce yerinde mi? Küçük sinekliklerde ${preisFormel.mindestpreisChf} CHF alt sınırı var, çünkü ölçü ve
    montaj için iki kez gidiliyor.
  </div>
</body></html>`

mkdirSync(ZIEL, { recursive: true })
const profil = join(ZIEL, `profil-${dicke}`)
rmSync(profil, { recursive: true, force: true })
mkdirSync(profil, { recursive: true })
const quelle = join(ZIEL, `preisblatt-${dicke}.html`)
const roh = join(ZIEL, `roh-${dicke}.png`)
const bild = join(ZIEL, `preisblatt-${dicke}.png`)
writeFileSync(quelle, html)

/*
 * Das Fenster ist absichtlich zu hoch: Ein zu knappes schneidet lieber die
 * letzte Zeile ab, als den Rest zu zeigen. Zugeschnitten wird danach.
 */
const FENSTERHOEHE = 1600
const BREITE = 1080
const MASSSTAB = 2

execFileSync(CHROMIUM, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--user-data-dir=${profil}`, '--no-first-run',
  `--window-size=${BREITE},${FENSTERHOEHE}`, `--force-device-scale-factor=${MASSSTAB}`,
  `--screenshot=${roh}`,
  quelle,
], { stdio: ['ignore', 'ignore', 'pipe'] })

/*
 * sharp sucht den Rand in Weiss und nimmt ihn weg; der Innenabstand kommt
 * danach wieder drauf, samt Luft fuer die Unterlaengen der letzten Zeile -
 * ohne sie knabbert der Zuschnitt sie an.
 */
const { info } = await sharp(roh).trim({ background: '#ffffff', threshold: 2 }).toBuffer({ resolveWithObject: true })
const RAND = 180
const hoehe = Math.min(FENSTERHOEHE * MASSSTAB, info.height + RAND)
await sharp(roh).extract({ left: 0, top: 0, width: BREITE * MASSSTAB, height: hoehe }).toFile(bild)

/*
 * GEGENPROBE: Steht im untersten Streifen noch Text, war der Zuschnitt zu
 * eng - und das faellt sonst erst auf, wenn das Bild schon verschickt ist.
 */
const streifen = await sharp(bild)
  .extract({ left: 0, top: hoehe - 70, width: BREITE * MASSSTAB, height: 70 })
  .raw()
  .toBuffer()
let dunkel = 0
for (let i = 0; i < streifen.length; i += 3) if (streifen[i] < 150) dunkel += 1
if (dunkel > 50) {
  console.error(`Der Zuschnitt ist zu eng – unten stehen noch ${dunkel} dunkle Pixel. RAND erhoehen.`)
  process.exit(1)
}

/*
 * Aufraeumen: Was bleibt, ist das Bild. Die Quelldatei und das
 * Browserprofil sind Werkzeug, kein Ergebnis - laegen sie daneben, wuesste
 * beim naechsten Mal niemand mehr, welche davon zum Bild gehoert.
 */
rmSync(roh)
rmSync(quelle)
rmSync(profil, { recursive: true, force: true })

const preise = zeilen.map((z) => z.preis)
const margen = zeilen.map((z) => z.kar)
console.log(`${bild} geschrieben – ${BREITE * MASSSTAB} x ${hoehe} Pixel`)
console.log(`${kasa}, ${satzEur} EUR/m2 · ${zeilen.length} Formate`)
console.log(`Preise ${Math.min(...preise)} bis ${Math.max(...preise)} CHF · Marge ${Math.min(...margen)} bis ${Math.max(...margen)} Prozent`)
console.log(`Formel: ${preisFormel.sockelChf} + ${preisFormel.warenfaktor} x Selbstkosten, mindestens ${preisFormel.mindestpreisChf}`)
