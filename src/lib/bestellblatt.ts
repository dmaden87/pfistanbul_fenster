import type { Bestellung } from '../types'
import { auftragAufbauen, kennungFuer, pakete, type Luecke } from './bestellauftrag'
import {
  ABSENDER,
  GANZE_LIEFERUNG,
  MASSREGEL,
  MECHANISMEN,
  NETZFARBEN,
  OEFFNUNGEN,
  PREISHINWEIS,
  RAHMENFARBEN,
  RICHTUNGSREGEL,
  TEXTE,
  beschriften,
  type Beschriftung,
} from '../data/produktion'

/**
 * Das Blatt an Bora als fertiges HTML – fuer die App, die daraus ein PDF
 * macht (expo-print) und es per WhatsApp oder Mail teilt.
 *
 * Inhalt und Reihenfolge sind dieselben wie in Bestellauftrag.tsx im
 * Web-Admin: dieselben Zeilen aus auftragAufbauen(), dieselben Texte aus
 * produktion.ts. Die Web-Fassung bleibt React, weil sie am Bildschirm
 * bearbeitet und mit window.print() gedruckt wird; die App hat kein DOM,
 * nur eine Zeichenkette fuer den Drucker. Aendert sich, was auf dem Blatt
 * steht, dann an beiden Stellen – der Test in bau/bestellblatt-test.mjs
 * prueft die Teile, die nicht auseinanderlaufen duerfen.
 */

export type BlattArt = 'anfrage' | 'bestellung'
export type BlattSprache = 'deutsch' | 'tuerkisch'

export interface BlattOptionen {
  art: BlattArt
  /** Oben rechts: Referenz des Auftrags oder Paket-Etikett. */
  nummer: string
  sprache?: BlattSprache
  /** Erwarteter Liefertermin – nur auf der Bestellung, frei getippt. */
  termin?: string
  bemerkung?: string
  nachtrag?: boolean
  /** Fuer Tests: das Datum im Kopf. */
  heute?: Date
}

export type BlattErgebnis = { html: string; dateiname: string; anzahl: number } | { luecken: Luecke[] }

/** Gegen Zeichen, die im HTML etwas bedeuten – Notizen sind freier Text. */
function h(text: string | number): string {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Der Dateiname, wie ihn der Web-Admin beim Sichern als PDF vorschlaegt. */
export function blattDateiname(art: BlattArt, nummer: string): string {
  return `pfistanbul_${art === 'anfrage' ? 'talep' : 'siparis'}_${nummer.trim().replace(/[^A-Za-z0-9-]/g, '') || 'x'}`
}

/**
 * Das Blatt – oder, wenn einem Netz eine Angabe fehlt, die Liste dessen,
 * was fehlt. Wie im Web: kein Auftrag mit einer Annahme darin.
 */
export function bestellblatt(bestellungen: Bestellung[], o: BlattOptionen): BlattErgebnis {
  const auftrag = auftragAufbauen(bestellungen)
  if (auftrag.luecken.length > 0) return { luecken: auftrag.luecken }

  const sprache = o.sprache ?? 'tuerkisch'
  const w = (b: Beschriftung) => h(b[sprache])
  const mitPreisspalte = o.art === 'anfrage'
  const anzahl = auftrag.zeilen.length
  const paketliste = pakete(auftrag.zeilen)
  const notizen = bestellungen.filter((b) => b.notiz?.trim()).map((b) => [kennungFuer(b), b.notiz!.trim()] as const)
  const termin = o.termin?.trim() ?? ''
  const bemerkung = o.bemerkung?.trim() ?? ''
  const heute = (o.heute ?? new Date()).toLocaleDateString(sprache === 'tuerkisch' ? 'tr-TR' : 'de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const strich = (s: string | null | undefined) => h(s ?? '—')
  const mass = (n: number | undefined) => (n === undefined ? '—' : h(n))

  const kopfzeile = [
    o.nummer ? `<strong>${w(TEXTE.sendung)} ${h(o.nummer)}${o.nachtrag ? ` · ${w(TEXTE.nachtrag)}` : ''} · </strong>` : '',
    h(heute),
  ].join('')

  const zeilen = auftrag.zeilen
    .map(
      (z) => `<tr>
  <td class="zahl">${z.nummer}</td>
  <td class="paket">${h(z.kennung)}</td>
  <td class="raum">${h(z.bezeichnung)}</td>
  <td class="zahl">${mass(z.breiteCm)}</td>
  <td class="zahl">${mass(z.hoeheCm)}</td>
  <td>${strich(z.rahmendicke)}</td>
  <td>${strich(beschriften(RAHMENFARBEN, z.rahmenfarbe, sprache))}</td>
  <td>${strich(beschriften(NETZFARBEN, z.netzfarbe, sprache))}</td>
  <td>${strich(beschriften(MECHANISMEN, z.mechanismus, sprache))}</td>
  <td>${strich(beschriften(OEFFNUNGEN, z.oeffnung, sprache))}</td>${mitPreisspalte ? '\n  <td class="preis leer-feld"></td>' : ''}
</tr>`,
    )
    .join('\n')

  const teile: string[] = []
  teile.push(`<header class="kopf">
  <p class="marke">${h(ABSENDER.firma)}</p>
  <div class="rechts">
    <h1>${w(o.art === 'anfrage' ? TEXTE.titelAnfrage : TEXTE.titelBestellung)}</h1>
    <p class="stand">${w(o.art === 'anfrage' ? TEXTE.untertitelAnfrage : TEXTE.untertitelBestellung)}</p>
    <p class="zeile">${kopfzeile}</p>
  </div>
</header>`)
  if (o.nachtrag) teile.push(`<section class="regeln nachtrag"><p><strong>${w(TEXTE.nachtragSatz)}</strong></p></section>`)
  teile.push(`<section class="regeln"><p><strong>${w(MASSREGEL)}</strong></p><p>${w(RICHTUNGSREGEL)}</p></section>`)
  // Auf der Bestellung ohne Termin keine leere Zeile – siehe Bestellauftrag.tsx.
  if (o.art === 'anfrage') teile.push(`<section class="termin"><p>${w(TEXTE.terminOffen)}: <span class="leer"></span></p></section>`)
  else if (termin) teile.push(`<section class="termin"><p>${w(TEXTE.terminGesetzt)}: <strong>${h(termin)}</strong></p></section>`)
  if (bemerkung) teile.push(`<p class="bemerkung">${h(bemerkung)}</p>`)
  if (notizen.length > 0) {
    teile.push(`<section class="notizen"><h2>${w(TEXTE.notizen)}</h2>${notizen
      .map(([kennung, text]) => `<p class="bemerkung">${bestellungen.length > 1 ? `<strong>${h(kennung)}: </strong>` : ''}${h(text)}</p>`)
      .join('')}</section>`)
  }
  teile.push(`<section>
<h2>${anzahl} ${w(anzahl === 1 ? TEXTE.plissee : TEXTE.plissees)} · ${w(TEXTE.stueckHinweis)}</h2>
<table class="tabelle">
<thead><tr>
  <th class="eng">${w(TEXTE.nummer)}</th><th>${w(TEXTE.buendel)}</th><th>${w(TEXTE.fenster)}</th>
  <th class="eng">${w(TEXTE.breite)}</th><th class="eng">${w(TEXTE.hoehe)}</th><th>${w(TEXTE.rahmendicke)}</th>
  <th>${w(TEXTE.rahmen)}</th><th>${w(TEXTE.netz)}</th><th>${w(TEXTE.mechanismus)}</th><th>${w(TEXTE.oeffnung)}</th>${mitPreisspalte ? `<th class="preis">${w(TEXTE.stueckpreis)}</th>` : ''}
</tr></thead>
<tbody>
${zeilen}
</tbody>
</table>
<p class="hinweis">${w(TEXTE.masseinheit)}${o.art === 'anfrage' ? ` ${w(PREISHINWEIS)}` : ''}</p>
</section>`)
  if (paketliste.length > 1) {
    teile.push(`<section><h2>${w(TEXTE.buendelTitel)}</h2>
<table class="tabelle paketliste"><thead><tr><th>${w(TEXTE.buendel)}</th><th class="eng">${w(TEXTE.stueck)}</th></tr></thead><tbody>
${paketliste.map((p) => `<tr><td><span class="kennung">${h(p.kennung)}</span></td><td class="zahl">${p.anzahl}</td></tr>`).join('\n')}
<tr class="gesamt"><td>${w(GANZE_LIEFERUNG)}</td><td class="zahl">${anzahl}</td></tr>
</tbody></table></section>`)
  }

  const dateiname = blattDateiname(o.art, o.nummer)
  const html = `<!DOCTYPE html>
<html lang="${sprache === 'tuerkisch' ? 'tr' : 'de'}">
<head>
<meta charset="utf-8">
<title>${h(dateiname)}</title>
<style>${STIL}</style>
</head>
<body>
${teile.join('\n')}
</body>
</html>`
  return { html, dateiname, anzahl }
}

/* Abgeleitet aus Bestellauftrag.css, nur der Druckteil. Querformat A4. */
const STIL = `
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { color: #111; font-family: Inter, Roboto, system-ui, sans-serif; font-size: 10pt; line-height: 1.4; }
.kopf { display: flex; align-items: baseline; justify-content: space-between; gap: 8mm; padding-bottom: 4mm; border-bottom: 2px solid #111; }
.marke { font-size: 13pt; font-weight: 700; }
.rechts { text-align: right; }
h1 { font-size: 18pt; line-height: 1.1; }
h2 { margin: 7mm 0 2mm; font-size: 11pt; break-after: avoid; }
.stand { margin-top: 1mm; }
.zeile { font-size: 9pt; color: #444; }
.regeln { margin-top: 5mm; padding: 3mm 4mm; border: 1.5px solid #111; }
.regeln p + p { margin-top: 1.5mm; font-size: 9pt; }
.nachtrag { background: #111; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.termin { margin-top: 4mm; }
.leer { display: inline-block; width: 60mm; height: 6mm; border: 1px solid #111; vertical-align: middle; }
.bemerkung { margin-top: 3mm; padding: 2mm 3mm; background: #f2f2f2; font-size: 9.5pt; white-space: pre-wrap; }
.notizen { margin-top: 4mm; }
.notizen h2 { font-size: 10pt; }
.tabelle { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
.tabelle th { padding: 1.5mm 2mm; border-bottom: 1.5px solid #111; text-align: left; white-space: nowrap; }
.tabelle td { padding: 2mm; border-bottom: 0.5px solid #ccc; vertical-align: top; }
.tabelle tr { break-inside: avoid; }
.zahl { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.eng { width: 12mm; text-align: right; }
.paket { font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; }
.raum { font-weight: 600; }
.preis { width: 30mm; text-align: right; }
.leer-feld { border: 1px solid #111; height: 7mm; }
.hinweis { margin-top: 2mm; font-size: 8.5pt; color: #444; }
.paketliste { width: auto; min-width: 130mm; }
.kennung { padding: 0.5mm 2mm; border: 1.5px solid #111; font-size: 11pt; font-weight: 700; letter-spacing: 0.06em; }
.gesamt td { border-top: 1.5px solid #111; border-bottom: 0; font-weight: 700; }
`
