/**
 * Testlauf fuer src/lib/bestellblatt.ts – das Blatt an Bora als HTML fuer
 * die App. Es muss dieselben Zeilen und Texte tragen wie das Blatt im
 * Web-Admin, und es darf nie mit einer Luecke rausgehen.
 */
import assert from 'node:assert/strict'
import { bestellblatt, blattDateiname } from '../src/lib/bestellblatt.ts'
import { auftragAufbauen } from '../src/lib/bestellauftrag.ts'
import { TEXTE, PREISHINWEIS } from '../src/data/produktion.ts'

let bestanden = 0
const fehler = []
function pruefe(name, lauf) {
  try {
    lauf()
    bestanden++
    console.log(`ok    ${name}`)
  } catch (f) {
    fehler.push(name)
    console.log(`FEHLT ${name}\n      ${f.message.split('\n')[0]}`)
  }
}

const netz = { menge: 2, bezeichnung: 'Küche', detail: '', preisChf: 150, breiteCm: 100, hoeheCm: 120, rahmendicke: '1.8', netzart: 'normal', rahmenfarbe: 'weiss', netzfarbe: 'grau', mechanismus: 'akkordeon', oeffnung: 'nach-links' }
const auftrag = (extra = {}) => ({
  id: 'x1', referenz: 'PF-D004', art: 'anfrage', status: 'bestellen', quelle: 'whatsapp', eingang: '2026-11-01', geaendert: '2026-11-02',
  kunde: { name: 'Test', email: '', telefon: '', strasse: '', plz: '', ort: '', bemerkung: '' },
  positionen: [netz], montage: false, zahlung: 'uebergabe', zahlungswunsch: false, summeChf: 300, ...extra,
})
const heute = new Date('2026-11-06T10:00:00Z')

pruefe('Bestellung: Titel, jede Zeile ein Stueck, keine Preisspalte', () => {
  const r = bestellblatt([auftrag()], { art: 'bestellung', nummer: 'PF-D004', heute })
  assert.ok('html' in r)
  assert.equal(r.anzahl, 2)
  assert.ok(r.html.includes(TEXTE.titelBestellung.tuerkisch))
  assert.equal((r.html.match(/<td class="paket">PF-D004<\/td>/g) ?? []).length, 2)
  assert.ok(!r.html.includes(TEXTE.stueckpreis.tuerkisch))
  assert.ok(!r.html.includes(PREISHINWEIS.tuerkisch))
})

pruefe('Anfrage: leere Preisspalte und Bitte um Preise', () => {
  const r = bestellblatt([auftrag()], { art: 'anfrage', nummer: 'PF-D004', heute })
  assert.ok(r.html.includes(TEXTE.titelAnfrage.tuerkisch))
  assert.ok(r.html.includes(PREISHINWEIS.tuerkisch))
  assert.equal((r.html.match(/leer-feld/g) ?? []).length, 2 + 1) // zwei Zeilen + Stil
})

pruefe('Deutsch zum Pruefen', () => {
  const r = bestellblatt([auftrag()], { art: 'bestellung', nummer: 'X', sprache: 'deutsch', heute })
  assert.ok(r.html.includes(TEXTE.titelBestellung.deutsch))
  assert.ok(r.html.includes('lang="de"'))
})

pruefe('Gleiche Zeilen wie der Auftrag im Web-Admin', () => {
  const b = [auftrag({ positionen: [netz, { ...netz, menge: 1, bezeichnung: 'Bad', breiteCm: 60 }] })]
  const r = bestellblatt(b, { art: 'bestellung', nummer: 'X', heute })
  assert.equal(r.anzahl, auftragAufbauen(b).zeilen.length)
})

pruefe('Fehlt eine Angabe, entsteht kein Blatt, sondern die Liste', () => {
  const r = bestellblatt([auftrag({ positionen: [{ ...netz, oeffnung: undefined }] })], { art: 'bestellung', nummer: 'X' })
  assert.ok(!('html' in r))
  assert.equal(r.luecken.length, 2)
  assert.deepEqual(r.luecken[0].fehlt, ['Öffnungsrichtung'])
})

pruefe('Notiz wird geschuetzt mitgedruckt', () => {
  const r = bestellblatt([auftrag({ notiz: 'Griff <links> & oben' })], { art: 'bestellung', nummer: 'X', heute })
  assert.ok(r.html.includes('Griff &lt;links&gt; &amp; oben'))
  assert.ok(!r.html.includes('<links>'))
})

pruefe('Termin nur auf der Bestellung und nur, wenn getippt', () => {
  const ohne = bestellblatt([auftrag()], { art: 'bestellung', nummer: 'X', heute })
  assert.ok(!ohne.html.includes(TEXTE.terminGesetzt.tuerkisch))
  const mit = bestellblatt([auftrag()], { art: 'bestellung', nummer: 'X', termin: 'Ende Nov', heute })
  assert.ok(mit.html.includes('Ende Nov'))
})

pruefe('Nachtrag steht drauf', () => {
  const r = bestellblatt([auftrag()], { art: 'bestellung', nummer: 'P-2026-01', nachtrag: true, heute })
  assert.ok(r.html.includes(TEXTE.nachtragSatz.tuerkisch))
})

pruefe('Mehrere Buendel: Paketliste mit Gesamtzahl', () => {
  const r = bestellblatt([auftrag(), auftrag({ id: 'x2', referenz: 'PF-D005' })], { art: 'bestellung', nummer: 'P-1', heute })
  assert.equal(r.anzahl, 4)
  assert.ok(r.html.includes('<span class="kennung">PF-D005</span>'))
})

pruefe('Dateiname wie im Web', () => {
  assert.equal(blattDateiname('bestellung', 'P-2026/01 '), 'pfistanbul_siparis_P-202601')
  assert.equal(blattDateiname('anfrage', ''), 'pfistanbul_talep_x')
})

console.log(`\n${bestanden} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) process.exit(1)
