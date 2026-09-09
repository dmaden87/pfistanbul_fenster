/**
 * Testlauf fuer src/lib/bestellauftrag.ts.
 *
 * Aufruf: npm run test:auftrag
 *
 * Was hier schiefgeht, merkt niemand am Bildschirm, sondern erst, wenn die
 * Lieferung aus der Tuerkei ankommt und nicht passt. Drei Dinge muessen
 * stimmen:
 *
 *  - Ein Set wird in seine einzelnen Netze aufgeloest. Fuer das Geld ist es
 *    eine Position, fuer den Produzenten sechs Netze.
 *  - Gleiche Netze werden gezaehlt statt aufgelistet.
 *  - Fehlende Angaben werden GEMELDET und nicht mit einer Annahme gefuellt.
 */
import assert from 'node:assert/strict'
import { auftragAufbauen, kennungFuer } from '../src/lib/bestellauftrag.ts'

let bestanden = 0
const fehler = []

function pruefe(name, lauf) {
  try {
    lauf()
    bestanden++
    console.log(`ok    ${name}`)
  } catch (f) {
    fehler.push(`${name}: ${f.message}`)
    console.log(`FEHLT ${name}\n      ${f.message.split('\n')[0]}`)
  }
}

const KOMPLETT = {
  rahmendicke: '3-4 cm', rahmenfarbe: 'weiss', netzfarbe: 'grau', mechanismus: 'akkordeon', oeffnung: 'nach-links',
}

function bestellung(referenz, positionen) {
  return {
    id: referenz.toLowerCase(), referenz, art: 'bestellung', status: 'bestellt',
    eingang: '2026-09-01T10:00:00.000Z', geaendert: '2026-09-01T10:00:00.000Z',
    kunde: { name: 'Test', email: 't@example.com', telefon: '', strasse: '', plz: '', ort: '', bemerkung: '' },
    positionen, montage: false, zahlung: 'uebergabe', zahlungswunsch: false, summeChf: 0,
  }
}

pruefe('Ein Set wird in seine einzelnen Netze aufgeloest', () => {
  const a = auftragAufbauen([bestellung('PF-1', [{ menge: 1, bezeichnung: 'Set Mittel', detail: '', preisChf: 775, setId: 'set-mittel', ...KOMPLETT }])])
  // Set Mittel: 3 Zimmer, 1 Balkontuere, 1 Bad, 1 Kueche = 6 Plissees.
  assert.equal(a.bloecke[0].anzahl, 6)
  assert.equal(a.zeilen.length, 6, 'jedes Plissee braucht eine eigene Zeile')
  assert.equal(a.zeilen.filter((z) => z.bezeichnung === 'Zimmer').length, 3)
})

pruefe('Jede Zeile traegt ihre Paketkennung und eine laufende Nummer', () => {
  const a = auftragAufbauen([bestellung('PF-1A', [{ menge: 2, bezeichnung: 'Wohnzimmer', detail: '', preisChf: 170, breiteCm: 128.6, hoeheCm: 182.5, ...KOMPLETT }])])
  assert.equal(a.zeilen.length, 2)
  assert.deepEqual(a.zeilen.map((z) => z.nummer), [1, 2])
  assert.ok(a.zeilen.every((z) => z.kennung === 'PF-1A'))
  assert.ok(a.zeilen.every((z) => z.menge === 1), 'eine Zeile ist genau ein Stueck')
})

pruefe('Gleiche Bauarten stehen hintereinander, auch ueber Kunden hinweg', () => {
  // Sonst muesste er dieselbe Einstellung zweimal aufbauen.
  const gross = { menge: 1, bezeichnung: 'Wohnzimmer', detail: '', preisChf: 170, breiteCm: 128.6, hoeheCm: 182.5, ...KOMPLETT }
  const klein = { menge: 1, bezeichnung: 'Bad', detail: '', preisChf: 130, breiteCm: 64, hoeheCm: 95.7, ...KOMPLETT }
  const a = auftragAufbauen([bestellung('PF-1B', [gross, klein]), bestellung('PF-1C', [gross])])
  const breiten = a.zeilen.map((z) => z.breiteCm)
  assert.deepEqual(breiten, [128.6, 128.6, 64], 'gleiche Bauarten sind nicht beieinander')
  assert.deepEqual(a.zeilen.map((z) => z.kennung), ['PF-1B', 'PF-1C', 'PF-1B'])
})

pruefe('Das Zimmernetz traegt die Oeffnung aus dem Katalog: ein Plissee, Mitte', () => {
  const a = auftragAufbauen([bestellung('PF-2', [{ menge: 1, bezeichnung: 'Set Mittel', detail: '', preisChf: 775, setId: 'set-mittel', ...KOMPLETT }])])
  const zimmer = a.zeilen.find((n) => n.bezeichnung === 'Zimmer')
  assert.equal(zimmer.oeffnung, 'mitte')
  assert.equal(zimmer.breiteCm, 160.5)
})

pruefe('Zwei gleiche Sets ergeben doppelt so viele Zeilen', () => {
  const a = auftragAufbauen([bestellung('PF-3', [{ menge: 2, bezeichnung: 'Set Mittel', detail: '', preisChf: 1550, setId: 'set-mittel', ...KOMPLETT }])])
  assert.equal(a.bloecke[0].anzahl, 12)
  assert.equal(a.zeilen.length, 12)
})

pruefe('Gleiche Netze verschiedener Kunden bleiben getrennte Zeilen mit eigener Kennung', () => {
  const netz = { menge: 1, bezeichnung: 'Wohnzimmer', detail: '', preisChf: 170, breiteCm: 128.6, hoeheCm: 182.5, ...KOMPLETT }
  const a = auftragAufbauen([bestellung('PF-4', [netz]), bestellung('PF-5', [{ ...netz, bezeichnung: 'Schlafzimmer' }])])
  assert.equal(a.bloecke.length, 2)
  assert.equal(a.zeilen.length, 2)
  assert.equal(a.anzahl, 2)
  // Verschiedene Pakete, aber gleiche Bauart: hintereinander.
  assert.deepEqual(a.zeilen.map((z) => z.kennung), ['PF-4', 'PF-5'])
})

pruefe('Verschiedene Bauart wird NICHT zusammengefasst', () => {
  const netz = { menge: 1, bezeichnung: 'Wohnzimmer', detail: '', preisChf: 170, breiteCm: 128.6, hoeheCm: 182.5, ...KOMPLETT }
  const a = auftragAufbauen([bestellung('PF-6', [netz, { ...netz, rahmenfarbe: 'schwarz' }])])
  assert.equal(a.zeilen.length, 2)
  assert.deepEqual(a.zeilen.map((z) => z.rahmenfarbe), ['weiss', 'schwarz'])
})

pruefe('Fehlende Angaben werden gemeldet und nicht gefuellt', () => {
  const a = auftragAufbauen([
    bestellung('PF-7', [{ menge: 1, bezeichnung: 'Sondermass Bad', detail: '', preisChf: 140, breiteCm: 64, hoeheCm: 95.7, rahmenfarbe: 'weiss', netzfarbe: 'grau', mechanismus: 'akkordeon' }]),
  ])
  assert.equal(a.luecken.length, 1)
  assert.deepEqual(a.luecken[0].fehlt, ['Rahmendicke', 'Öffnungsrichtung'])
  const netz = a.zeilen[0]
  assert.equal(netz.rahmendicke, undefined, 'die Luecke wurde mit einer Annahme gefuellt')
  assert.equal(netz.oeffnung, undefined, 'die Luecke wurde mit einer Annahme gefuellt')
})

pruefe('Ein vollstaendiges Netz meldet keine Luecke', () => {
  const a = auftragAufbauen([bestellung('PF-8', [{ menge: 1, bezeichnung: 'Bad', detail: '', preisChf: 140, breiteCm: 64, hoeheCm: 95.7, ...KOMPLETT }])])
  assert.equal(a.luecken.length, 0)
})

pruefe('Ein Katalognetz traegt Masse und Rahmendicke aus dem Katalog', () => {
  const a = auftragAufbauen([bestellung('PF-9', [{ menge: 1, bezeichnung: 'Bad', detail: '', preisChf: 130, typId: 'bad', rahmenfarbe: 'weiss', netzfarbe: 'grau', mechanismus: 'akkordeon' }])])
  const netz = a.zeilen[0]
  assert.equal(netz.breiteCm, 117)
  assert.equal(netz.hoeheCm, 82.5)
  assert.equal(netz.rahmendicke, '3-4 cm')
  assert.equal(a.luecken.length, 0, 'ein Katalognetz sollte vollstaendig sein')
})

pruefe('Was in der Bestellung steht, gilt vor dem Katalog', () => {
  // Sonst wuerde eine Preis- oder Massanpassung im Katalog eine laengst
  // erteilte Bestellung ruecklaeufig aendern.
  const a = auftragAufbauen([bestellung('PF-10', [{ menge: 1, bezeichnung: 'Bad', detail: '', preisChf: 130, typId: 'bad', breiteCm: 119, hoeheCm: 84, ...KOMPLETT }])])
  assert.equal(a.zeilen[0].breiteCm, 119)
})

pruefe('Die Kennung ist kurz und ohne Sonderzeichen', () => {
  assert.equal(kennungFuer({ referenz: 'pf-8812', id: 'x' }), 'PF-8812')
  assert.equal(kennungFuer({ referenz: '', id: 'abc-123' }), 'ABC-123')
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
