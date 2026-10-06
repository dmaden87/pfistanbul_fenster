/**
 * Testlauf fuer src/lib/pl.ts – die Erfolgsrechnung.
 *
 * Eine falsche Marge sieht aus wie eine richtige. Deshalb wird hier vor
 * allem geprueft, was bei UNVOLLSTAENDIGEN Daten passiert, und ob die
 * Trennung haelt, auf der das ganze Werkzeug steht: geschaetzt gegen
 * gemessen, erwartet gegen realisiert, verdient gegen einkassiert.
 */
import assert from 'node:assert/strict'
import {
  inRechnung, zahlenFuer, abschnitte, offeneForderungen, offeneSchulden, aufteilung,
} from '../src/lib/pl.ts'
import { herstellungChf } from '../src/lib/kosten.ts'

let bestanden = 0
const fehler = []
function pruefe(name, lauf) {
  try { lauf(); bestanden++; console.log(`ok    ${name}`) }
  catch (f) { fehler.push(`${name}: ${f.message}`); console.log(`FEHL  ${name}\n      ${f.message.split('\n')[0]}`) }
}

const netz = (breiteCm, hoeheCm, preisChf, menge = 1) => ({
  id: `p${breiteCm}x${hoeheCm}`, bezeichnung: 'Netz', detail: '', menge, preisChf, breiteCm, hoeheCm,
})

function best(extra = {}) {
  const positionen = extra.positionen ?? [netz(100, 100, 150)]
  const montageChf = extra.montageChf ?? 0
  const anfahrtChf = extra.anfahrtChf ?? 0
  const rabattChf = extra.rabattChf ?? 0
  const waren = positionen.reduce((s, p) => s + p.preisChf * p.menge, 0)
  return {
    id: 'b1', referenz: 'A-1', art: 'bestellung', status: 'ausliefern',
    eingang: '2026-01-05T10:00:00.000Z', geaendert: '2026-01-05T10:00:00.000Z',
    kunde: { name: 'Muster', email: '', telefon: '', strasse: '', plz: '', ort: '', bemerkung: '' },
    montage: montageChf > 0,
    summeChf: waren + montageChf + anfahrtChf - rabattChf,
    ...extra,
    positionen,
    montageChf, anfahrtChf, rabattChf,
  }
}

const auslage = (extra = {}) => ({
  id: 'a1', am: '2026-01-20', bezeichnung: 'Aufkleber', kategorie: 'material',
  betragChf: 40, traeger: 'deniz', erfasstAm: '2026-01-20T08:00:00.000Z', ...extra,
})

/* --- Wer zaehlt ------------------------------------------------------------ */

pruefe('vor der Zusage zaehlt nichts', () => {
  for (const status of ['neu', 'klaerung', 'offerte']) {
    assert.equal(inRechnung(best({ status })), false, status)
  }
})

pruefe('ab der Zusage zaehlt alles bis zur Auslieferung', () => {
  for (const status of ['zusage', 'bestellen', 'bora', 'ausliefern']) {
    assert.equal(inRechnung(best({ status })), true, status)
  }
})

pruefe('abgesagt faellt wieder heraus', () => {
  assert.equal(inRechnung(best({ status: 'abgesagt' })), false)
})

pruefe('von Hand ausgenommen zaehlt nie', () => {
  assert.equal(inRechnung(best({ status: 'ausliefern', ausserRechnung: true })), false)
})

/* --- Der Erloes, aufgeteilt ------------------------------------------------ */

pruefe('Netze, Montage, Anfahrt und Rabatt stehen einzeln', () => {
  const z = zahlenFuer(best({ positionen: [netz(100, 100, 150), netz(80, 60, 130)], montageChf: 30, anfahrtChf: 20, rabattChf: 50 }))
  assert.equal(z.netzeChf, 280)
  assert.equal(z.montageChf, 30)
  assert.equal(z.anfahrtChf, 20)
  assert.equal(z.rabattChf, 50)
  assert.equal(z.erloesChf, 280)      // 280 + 30 + 20 - 50
})

pruefe('abgeschalteter Rabatt zaehlt nicht, auch wenn ein Betrag dasteht', () => {
  const z = zahlenFuer(best({ rabatt: false, rabattChf: 50, summeChf: 150 }))
  assert.equal(z.rabattChf, 0)
  assert.equal(z.netzeChf, 150)
})

/* --- Die Kosten: geschaetzt gegen gemessen --------------------------------- */

pruefe('ohne erfasste Kosten rechnet die Formel – und sagt es', () => {
  const z = zahlenFuer(best({ positionen: [netz(128, 96, 150)] }))
  assert.equal(z.geschaetzt, true)
  assert.equal(z.herstellungChf, herstellungChf(128, 96))
  assert.ok(z.mwstChf > 0, 'Einfuhrsteuer muss gerechnet sein')
})

pruefe('ein erfasster Posten schlaegt die Formel', () => {
  const z = zahlenFuer(best({
    positionen: [netz(128, 96, 150)],
    kosten: [{ id: 'k1', art: 'herstellung', betragChf: 40, traeger: 'bora', erfasstAm: '2026-01-10T00:00:00.000Z' }],
  }))
  assert.equal(z.herstellungChf, 40)
})

pruefe('mehrere Posten derselben Art werden addiert', () => {
  const z = zahlenFuer(best({
    kosten: [
      { id: 'k1', art: 'weiteres', bezeichnung: 'Schrauben', betragChf: 12, traeger: 'deniz', erfasstAm: 'x' },
      { id: 'k2', art: 'weiteres', bezeichnung: 'Fahrt', betragChf: 8, traeger: 'ufuk', erfasstAm: 'x' },
    ],
  }))
  assert.equal(z.weitereChf, 20)
})

pruefe('alte Einkaufspreise aus den Lieferrunden gelten als gemessen', () => {
  /*
   * DIE EINFUHRSTEUER MUSS HIER MIT DASTEHEN. Ohne sie wird sie gerechnet,
   * und die Bestellung gilt zu Recht als geschaetzt – an der Herstellung
   * liegt es dann aber nicht. Genau diese Verwechslung hat der Test beim
   * ersten Lauf aufgedeckt: Die Erwartung war falsch, nicht die Rechnung.
   */
  const z = zahlenFuer(best({
    positionen: [{ ...netz(128, 96, 150), einkaufChf: 31 }],
    kosten: [{ id: 'm', art: 'mwst', betragChf: 2.51, traeger: 'bora', erfasstAm: 'x' }],
  }))
  assert.equal(z.herstellungChf, 31)
  assert.equal(z.geschaetzt, false, 'gemessene Zahlen sind keine Schaetzung')
})

pruefe('eine fehlende Einfuhrsteuer macht die Bestellung zur Schaetzung', () => {
  const z = zahlenFuer(best({ positionen: [{ ...netz(128, 96, 150), einkaufChf: 31 }] }))
  assert.equal(z.herstellungChf, 31, 'die Herstellung bleibt gemessen')
  assert.equal(z.geschaetzt, true, 'die Steuer ist gerechnet')
})

pruefe('ein einziger fehlender Einkaufspreis macht die ganze Bestellung zur Schaetzung', () => {
  const z = zahlenFuer(best({
    positionen: [{ ...netz(128, 96, 150), einkaufChf: 31 }, netz(80, 60, 130)],
  }))
  assert.equal(z.geschaetzt, true)
})

pruefe('Lieferkosten werden NIE geschaetzt', () => {
  const z = zahlenFuer(best({ positionen: [netz(128, 96, 150)] }))
  assert.equal(z.lieferungChf, 0, 'lieber eine Null als eine erfundene Fracht')
})

pruefe('die alten Felder lieferkostenChf und zollChf werden weiter gelesen', () => {
  const z = zahlenFuer(best({ lieferkostenChf: 18, zollChf: 9 }))
  assert.equal(z.lieferungChf, 18)
  assert.equal(z.mwstChf, 9)
})

pruefe('die Marge ist Erloes minus allen Kosten', () => {
  const z = zahlenFuer(best({
    positionen: [netz(100, 100, 200)], montageChf: 15,
    kosten: [
      { id: 'k1', art: 'herstellung', betragChf: 30, traeger: 'bora', erfasstAm: 'x' },
      { id: 'k2', art: 'lieferung', betragChf: 10, traeger: 'bora', erfasstAm: 'x' },
      { id: 'k3', art: 'mwst', betragChf: 2.43, traeger: 'bora', erfasstAm: 'x' },
    ],
  }))
  assert.equal(z.erloesChf, 215)
  assert.equal(z.kostenChf, 42.43)
  assert.equal(z.margeChf, 172.57)
  assert.equal(z.margeProzent, 80.3)
})

/* --- Realisiert gegen erwartet --------------------------------------------- */

const geliefert = best({ id: 'g', status: 'ausliefern', ausgeliefertAm: '2026-03-10T00:00:00.000Z', zusageAm: '2026-02-01T00:00:00.000Z' })
const zugesagt = best({ id: 'z', status: 'zusage', zusageAm: '2026-03-20T00:00:00.000Z' })

pruefe('Geliefertes ist Ertrag, Zugesagtes ist Aussicht', () => {
  const [a] = abschnitte([geliefert, zugesagt], [], 'monat')
  assert.equal(a.schluessel, '2026-03')
  assert.equal(a.erloesChf, 150, 'nur das Gelieferte')
  assert.equal(a.erwartetChf, 150, 'das Zugesagte steht daneben')
  assert.equal(a.anzahl, 1)
})

pruefe('das Lieferdatum bestimmt die Periode, nicht die Zusage', () => {
  const [a] = abschnitte([geliefert], [], 'monat')
  assert.equal(a.schluessel, '2026-03', 'Zusage war im Februar')
})

pruefe('ohne Lieferdatum zaehlt die Zusage', () => {
  const [a] = abschnitte([zugesagt], [], 'monat')
  assert.equal(a.schluessel, '2026-03')
})

pruefe('einkassiert wird getrennt gezaehlt', () => {
  const bezahlt = best({ ...geliefert, bezahltAm: '2026-03-15T00:00:00.000Z' })
  const [a] = abschnitte([bezahlt], [], 'monat')
  assert.equal(a.erloesChf, 150)
  assert.equal(a.einkassiertChf, 150)
  const [b] = abschnitte([geliefert], [], 'monat')
  assert.equal(b.einkassiertChf, 0, 'geliefert heisst nicht bezahlt')
})

pruefe('Stripes Meldung gilt auch als einkassiert', () => {
  const bezahlt = best({ ...geliefert, bezahlung: { status: 'bezahlt', am: '2026-03-12', sitzung: 'cs_1' } })
  const [a] = abschnitte([bezahlt], [], 'monat')
  assert.equal(a.einkassiertChf, 150)
})

/* --- Perioden -------------------------------------------------------------- */

pruefe('Quartal fasst drei Monate zusammen', () => {
  const jan = best({ id: 'j', ausgeliefertAm: '2026-01-10T00:00:00.000Z' })
  const mar = best({ id: 'm', ausgeliefertAm: '2026-03-10T00:00:00.000Z' })
  const [a] = abschnitte([jan, mar], [], 'quartal')
  assert.equal(a.schluessel, '2026-Q1')
  assert.equal(a.anzahl, 2)
  assert.equal(a.erloesChf, 300)
})

pruefe('YTD fasst das Jahr zusammen', () => {
  const jan = best({ id: 'j', ausgeliefertAm: '2026-01-10T00:00:00.000Z' })
  const nov = best({ id: 'n', ausgeliefertAm: '2026-11-10T00:00:00.000Z' })
  const liste = abschnitte([jan, nov], [], 'ytd')
  assert.equal(liste.length, 1)
  assert.equal(liste[0].schluessel, '2026')
  assert.equal(liste[0].erloesChf, 300)
})

pruefe('Abschnitte kommen neueste zuerst', () => {
  const jan = best({ id: 'j', ausgeliefertAm: '2026-01-10T00:00:00.000Z' })
  const mar = best({ id: 'm', ausgeliefertAm: '2026-03-10T00:00:00.000Z' })
  const liste = abschnitte([jan, mar], [], 'monat')
  assert.deepEqual(liste.map((a) => a.schluessel), ['2026-03', '2026-01'])
})

pruefe('Betriebskosten mindern das Ergebnis, nicht die Warenkosten', () => {
  const [a] = abschnitte([best({ ausgeliefertAm: '2026-01-10T00:00:00.000Z',
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 30, traeger: 'bora', erfasstAm: 'x' }] })],
    [auslage({ am: '2026-01-20', betragChf: 40 })], 'monat')
  assert.equal(a.kostenChf, 30 + 0 + 2.43, 'Herstellung plus gerechnete Einfuhrsteuer')
  assert.equal(a.betriebskostenChf, 40)
  assert.equal(a.ergebnisChf, 150 - 32.43 - 40)
})

/* --- Offene Posten --------------------------------------------------------- */

pruefe('wer uns was schuldet: geliefert und nicht bezahlt', () => {
  const liste = offeneForderungen([geliefert, zugesagt])
  assert.equal(liste.length, 1, 'Zugesagtes schuldet noch niemand')
  assert.equal(liste[0].bestellungId, 'g')
  assert.equal(liste[0].betragChf, 150)
})

pruefe('bezahlte Bestellungen stehen nicht mehr offen', () => {
  assert.equal(offeneForderungen([best({ ...geliefert, bezahltAm: '2026-03-15' })]).length, 0)
})

pruefe('wem wir was schulden, je Traeger zusammengefasst', () => {
  const b = best({
    kosten: [
      { id: 'k1', art: 'herstellung', betragChf: 60, traeger: 'bora', erfasstAm: 'x', am: '2026-02-01' },
      { id: 'k2', art: 'lieferung', betragChf: 20, traeger: 'bora', erfasstAm: 'x', am: '2026-02-01' },
      { id: 'k3', art: 'weiteres', bezeichnung: 'Dübel', betragChf: 7, traeger: 'deniz', erfasstAm: 'x', am: '2026-02-03' },
    ],
  })
  const liste = offeneSchulden([b], [auslage({ betragChf: 40, traeger: 'deniz' })])
  assert.equal(liste.length, 2)
  assert.equal(liste[0].traeger, 'bora')
  assert.equal(liste[0].betragChf, 80)
  assert.equal(liste[1].traeger, 'deniz')
  assert.equal(liste[1].betragChf, 47)
  assert.equal(liste[1].posten.length, 2)
})

pruefe('bezahlte Posten schulden wir nicht mehr', () => {
  const b = best({ kosten: [{ id: 'k1', art: 'herstellung', betragChf: 60, traeger: 'bora', bezahlt: true, erfasstAm: 'x' }] })
  assert.equal(offeneSchulden([b], []).length, 0)
})

pruefe('Kosten einer Bestellung vor der Zusage schulden wir noch nicht', () => {
  const b = best({ status: 'offerte', kosten: [{ id: 'k1', art: 'herstellung', betragChf: 60, traeger: 'bora', erfasstAm: 'x' }] })
  assert.equal(offeneSchulden([b], []).length, 0)
})

/* --- Abrechnung ------------------------------------------------------------ */

pruefe('verteilt wird nur, was einkassiert ist', () => {
  const offen = best({ id: 'o', ausgeliefertAm: '2026-03-01' })
  const bezahlt = best({ id: 'p', ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02' })
  const a = aufteilung([offen, bezahlt], [])
  assert.equal(a.einkassiertChf, 150, 'die offene Bestellung bleibt draussen')
})

pruefe('zwei Toepfe: Bora an der Ware, die Montage unter Ufuk und Deniz', () => {
  const b = best({
    ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02',
    positionen: [netz(100, 100, 200)], montageChf: 100,
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 100, traeger: 'bora', bezahlt: true, erfasstAm: 'x' },
             { id: 'k2', art: 'mwst', betragChf: 0, traeger: 'bora', bezahlt: true, erfasstAm: 'x' }],
  })
  const a = aufteilung([b], [])
  assert.equal(a.warengewinnChf, 100, '200 Warenerloes minus 100 Kosten')
  assert.equal(a.montagegewinnChf, 100)
  assert.equal(a.anteile.bora, 20, '20 Prozent von 100, nichts von der Montage')
  assert.equal(a.anteile.ufuk, 40 + 50)
  assert.equal(a.anteile.deniz, 40 + 50)
  assert.equal(a.anteile.bora + a.anteile.ufuk + a.anteile.deniz, a.verteilbarChf)
})

pruefe('offene Auslagen gehen vor der Verteilung zurueck', () => {
  const b = best({ ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02' })
  const a = aufteilung([b], [auslage({ betragChf: 40, traeger: 'deniz' })])
  assert.equal(a.rueckzahlungChf, 40)
})

pruefe('die Anfahrt gehoert zur Arbeit, nicht zur Ware', () => {
  const b = best({
    ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02', anfahrtChf: 20,
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 0, traeger: 'bora', erfasstAm: 'x' },
             { id: 'k2', art: 'mwst', betragChf: 0, traeger: 'bora', erfasstAm: 'x' }],
  })
  const a = aufteilung([b], [])
  assert.equal(a.montagegewinnChf, 20)
  assert.equal(a.anteile.bora, 150 * 0.2, 'Bora bekommt nichts von der Anfahrt')
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) process.exit(1)
