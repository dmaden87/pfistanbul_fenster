/**
 * Die Referenzpreise als Liste, je Rahmendicke ein eigenes PDF.
 *
 * Aufruf: npm run referenzliste
 *
 * Heraus kommen drucksachen/referenzliste-2.8.pdf und -1.5.pdf: A4 hoch,
 * je Breite ein Block, darin eine Zeile fuer jede Hoehe mit Flaeche,
 * Selbstkosten, Richtpreis und der Marge in Franken und Prozent.
 *
 * WARUM NEBEN DEM RASTER: Das Raster (bau/referenzpreise.mjs) beantwortet
 * eine Frage - was kostet das? - und passt dafuer auf eine Seite. Diese
 * Liste beantwortet die zweite: was bleibt uns davon? Beides in eine Zelle
 * zu schreiben macht das Raster unlesbar, und genau dafuer ist es da.
 *
 * WARUM JE RAHMENDICKE EINE DATEI: Man misst mit einer Rahmendicke im Kopf,
 * nicht mit beiden. Eine Datei, die man ganz ausdruckt, ist einfacher als
 * eine, aus der man die richtige Haelfte heraussuchen muss.
 *
 * DIE MARGE IST VOR DER MONTAGE. Was an Montage und Anfahrt verdient wird,
 * steht hier nicht - das ist ein eigener Posten im Angebot und geht nach
 * einem eigenen Schluessel an Ufuk und Deniz. Diese Spalte sagt, was das
 * NETZ traegt.
 *
 * ES RECHNET NICHT SELBST: Preise aus estimateNetChf(), Kosten aus
 * selbstkostenChf(), beides aus src/lib/estimate.ts. Die Formel hier
 * abzuschreiben waere eine zweite Wahrheit.
 */
import { estimateNetChf, margeProzent, preisFormel, selbstkostenChf } from '../src/lib/estimate.ts'
import { kostenConfig } from '../src/data/kostenConfig.ts'
import { RAHMENDICKEN } from '../src/data/produktion.ts'
import { shopConfig } from '../src/data/shopConfig.ts'
import { BREITEN, DICKEN, HOEHEN, alsPdf, chf, flaecheM2, monat, schriften } from './drucksache.mjs'

/*
 * DREI BLOECKE JE SPALTE, ZWEI SPALTEN JE SEITE. Bei 21 Hoehen je Block
 * sind das 126 Zeilen auf einer A4-Seite - mehr geht nicht, ohne dass die
 * Schrift unter die Lesbarkeit faellt. Die Gegenprobe in alsPdf() haelt
 * fest, dass es aufgeht: Aendert jemand das Raster der Masse, zaehlt sie
 * die Seiten nach.
 */
const BLOECKE_JE_SPALTE = 3
const SPALTEN = 2
const BLOECKE_JE_SEITE = BLOECKE_JE_SPALTE * SPALTEN
const SEITEN = Math.ceil(BREITEN.length / BLOECKE_JE_SEITE)

const block = (breite, dicke) => {
  const zeilen = HOEHEN.map((h) => {
    const kosten = selbstkostenChf(breite, h, dicke)
    const preis = estimateNetChf(breite, h, dicke)
    const marge = Math.round((preis - kosten) * 100) / 100
    /* Wo der Mindestpreis greift, haengt die Marge nicht mehr an der
       Flaeche - das soll man sehen und nicht nachrechnen muessen. */
    const mindest = preis === preisFormel.mindestpreisChf
    return `<tr class="${mindest ? 'mindest' : ''}">
      <th scope="row">${h}</th>
      <td class="flaeche">${flaecheM2(breite, h).toFixed(2)}</td>
      <td>${chf(kosten)}</td>
      <td class="preis">${preis}</td>
      <td class="marge">${chf(marge)}</td>
      <td class="prozent">${margeProzent(breite, h, dicke)}%</td>
    </tr>`
  }).join('')

  return `<div class="block">
    <h2>Breite ${breite} cm</h2>
    <table>
      <thead>
        <tr>
          <th class="hoehe">Höhe</th>
          <th>m²</th>
          <th>Kostet</th>
          <th>Preis</th>
          <th>Marge</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>${zeilen}</tbody>
    </table>
  </div>`
}

const blatt = (dicke, breiten, nummer, fuss = '') => `<section class="blatt">
  <div class="kopf">
    <h1>Referenzpreise · ${RAHMENDICKEN[dicke]?.deutsch ?? `${dicke} cm`}</h1>
    <span class="marke">Pfistanbul Fenster · ${monat()} · Seite ${nummer} von ${SEITEN}</span>
  </div>
  <p class="lead">
    Alle Beträge in Franken, je Netz. <strong>Marge</strong> ist der Richtpreis minus Ware, Fracht und
    Einfuhrsteuer – <strong>ohne Montage</strong>, die kostet CHF ${shopConfig.montageChf} je Netz zusätzlich.
    Zwischenmasse aufrunden. Grau hinterlegt: Mindestpreis CHF ${preisFormel.mindestpreisChf}.
  </p>
  <div class="spalten">${breiten.map((b) => block(b, dicke)).join('')}</div>
  ${fuss}
</section>`

const dokument = (dicke) => {
  const satzEur = kostenConfig.proM2Eur[dicke] ?? kostenConfig.proM2StandardEur
  /*
   * DER FUSS GEHOERT IN DIE LETZTE SEITE HINEIN, nicht dahinter: Ein Block
   * nach dem letzten <section> steht hinter dessen Seitenumbruch und
   * bekommt ein eigenes, fast leeres Blatt. Die Gegenprobe in alsPdf()
   * haette es gemeldet - schoener ist es, gar nicht erst hineinzulaufen.
   */
  const fuss = `<div class="fuss">
    Einkauf ${satzEur} €/m² bei 1 € = ${kostenConfig.eurChf} CHF, Fracht CHF ${kostenConfig.frachtProNetzChf} je Netz,
    Einfuhrsteuer ${(kostenConfig.einfuhrsteuer * 100).toFixed(1)} %. Wir sind nicht mehrwertsteuerpflichtig.
    Richtpreis: <span class="formel">${preisFormel.sockelChf} + ${preisFormel.warenfaktor} ×
    Selbstkosten, mindestens ${preisFormel.mindestpreisChf}</span>, aufgerundet auf ${preisFormel.rundungChf}.
  </div>`

  const seiten = []
  for (let i = 0; i < BREITEN.length; i += BLOECKE_JE_SEITE) {
    const letzte = i + BLOECKE_JE_SEITE >= BREITEN.length
    seiten.push(blatt(dicke, BREITEN.slice(i, i + BLOECKE_JE_SEITE), seiten.length + 1, letzte ? fuss : ''))
  }

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<style>
  ${schriften()}

  @page { size: A4 portrait; margin: 9mm 10mm; }

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #111111; background: #ffffff; -webkit-print-color-adjust: exact; }
  .blatt { break-after: page; }
  .blatt:last-of-type { break-after: auto; }

  .kopf { display: flex; align-items: baseline; justify-content: space-between; gap: 6mm; }
  h1 { font-family: 'Fraunces', serif; font-size: 14pt; letter-spacing: -0.02em; color: #10302b; }
  .marke { font-size: 7pt; color: #666666; white-space: nowrap; }
  .lead { margin-top: 1.2mm; font-size: 7.2pt; line-height: 1.35; color: #333333; }

  .spalten {
    margin-top: 3mm;
    display: grid;
    grid-template-columns: repeat(${SPALTEN}, 1fr);
    grid-template-rows: repeat(${BLOECKE_JE_SPALTE}, auto);
    grid-auto-flow: column;
    gap: 2.5mm 7mm;
    align-content: start;
  }

  .block h2 {
    font-size: 7.5pt; font-weight: 700; color: #10302b;
    padding-bottom: 0.3mm; margin-bottom: 0.3mm;
  }
  .block table { width: 100%; border-collapse: collapse; font-size: 6.8pt; }
  .block th, .block td { padding: 0.2mm 0.9mm; text-align: right; line-height: 1.1; white-space: nowrap; }
  .block thead th {
    font-size: 6pt; font-weight: 600; color: #555555;
    text-transform: uppercase; letter-spacing: 0.03em;
    border-bottom: 0.75pt solid #111111;
  }
  .block tbody th { font-weight: 700; color: #10302b; }
  .block tbody td { border-bottom: 0.25pt solid #e8e8e4; }
  .block tbody tr:nth-child(even) th, .block tbody tr:nth-child(even) td { background: #f7f7f4; }
  .block .hoehe { text-align: right; }
  .block .flaeche { color: #777777; }
  .block .preis { font-weight: 700; color: #10302b; }
  .block .marge { font-weight: 600; color: #1d6b53; }
  .block .prozent { color: #1d6b53; }
  /* Der Mindestpreis muss auch auf dem Wechselstreifen sichtbar bleiben. */
  .block tbody tr.mindest th, .block tbody tr.mindest td,
  .block tbody tr.mindest:nth-child(even) th, .block tbody tr.mindest:nth-child(even) td {
    background: #eef3ee;
  }

  .fuss {
    margin-top: 3mm; padding-top: 1.5mm; border-top: 0.5pt solid #d8d8d4;
    font-size: 6.8pt; color: #555555;
  }
  .formel { font-family: ui-monospace, monospace; color: #8a4b00; }
</style></head><body>
${seiten.join('\n')}
</body></html>`
}

for (const dicke of DICKEN) {
  const { pdf, groesse, seiten } = alsPdf({
    html: dokument(dicke),
    name: `referenzliste-${dicke}`,
    seiten: SEITEN,
  })
  const preise = BREITEN.flatMap((b) => HOEHEN.map((h) => estimateNetChf(b, h, dicke)))
  const margen = BREITEN.flatMap((b) => HOEHEN.map((h) =>
    Math.round((estimateNetChf(b, h, dicke) - selbstkostenChf(b, h, dicke)) * 100) / 100))
  console.log(`${pdf} geschrieben – ${(groesse / 1024).toFixed(0)} kB, ${seiten} Seiten`)
  console.log(`  ${RAHMENDICKEN[dicke].deutsch} · ${preise.length} Masse`)
  console.log(`  Preise ${Math.min(...preise)} bis ${Math.max(...preise)} CHF`)
  console.log(`  Marge ${chf(Math.min(...margen))} bis ${chf(Math.max(...margen))} CHF`)
}
