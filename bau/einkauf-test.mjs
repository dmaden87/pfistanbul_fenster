/**
 * Testlauf fuer src/lib/einkauf.ts – die Marge einer Bestellung.
 *
 * Hier entsteht die Grundlage jeder spaeteren Rentabilitaetsrechnung. Ein
 * Fehler faellt nicht auf, denn eine falsche Marge sieht aus wie eine
 * richtige – man merkt sie erst, wenn man ein Jahr lang zum falschen Preis
 * verkauft hat. Entsprechend genau wird hier hingeschaut, vor allem auf die
 * Faelle mit UNVOLLSTAENDIGEN Daten: Die duerfen nie eine Zahl liefern, die
 * besser aussieht als die Wirklichkeit.
 */
import assert from 'node:assert/strict'
import { margeFuer } from '../src/lib/einkauf.ts'

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

const kunde = { name: 'Testkunde', email: 't@example.ch' }

function best(id, referenz, positionen, extra = {}) {
  return {
    id,
    referenz,
    art: 'bestellung',
    status: 'zugesagt',
    kunde,
    positionen,
    summeChf: positionen.reduce((s, p) => s + p.preisChf * p.menge, 0),
    montage: false,
    ...extra,
  }
}

/* --- Die Marge einer Bestellung -------------------------------------------- */

pruefe('Die Marge zieht Einkauf und Fracht vom Warenerloes ab', () => {
  const b = best(
    'b1',
    'PF-1',
    [{ id: 'p1', menge: 2, bezeichnung: 'A', detail: '', preisChf: 150, einkaufChf: 45 }],
    { lieferkostenChf: 30 },
  )
  const m = margeFuer(b)
  assert.equal(m.warenerloesChf, 300)
  assert.equal(m.einkaufChf, 90)
  assert.equal(m.lieferkostenChf, 30)
  assert.equal(m.margeChf, 180)
  assert.equal(m.margeProzent, 60)
  assert.equal(m.vollstaendig, true)
})

pruefe('Die Montage zaehlt NICHT zum Warenerloes', () => {
  // Sonst zeigt die Marge einen Gewinn auf Ware, den es dort nicht gibt.
  const b = best(
    'b1',
    'PF-1',
    [{ id: 'p1', menge: 2, bezeichnung: 'A', detail: '', preisChf: 150, einkaufChf: 45 }],
    { montage: true, montageChf: 30, summeChf: 330 },
  )
  const m = margeFuer(b)
  assert.equal(m.warenerloesChf, 300)
  assert.equal(m.margeChf, 210)
})

pruefe('Eine Position ohne Einkaufspreis macht den Datensatz unvollstaendig', () => {
  const b = best('b1', 'PF-1', [
    { id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 150, einkaufChf: 45 },
    { id: 'p2', menge: 1, bezeichnung: 'B', detail: '', preisChf: 150 },
  ])
  const m = margeFuer(b)
  assert.equal(m.vollstaendig, false)
  assert.equal(m.ohnePreis, 1)
  // Die Marge ist ZU GUT, weil Kosten fehlen – nicht Erloese. Deshalb darf
  // sie nie ohne die Markierung angezeigt werden.
  assert.equal(m.einkaufChf, 45)
  assert.equal(m.margeChf, 255)
})

pruefe('Eine Bestellung ganz ohne Einkaufszahlen ist unvollstaendig', () => {
  const b = best('b1', 'PF-1', [{ id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 150 }])
  const m = margeFuer(b)
  assert.equal(m.vollstaendig, false)
  assert.equal(m.einkaufChf, 0)
  assert.equal(m.lieferkostenChf, 0)
})

pruefe('Ohne Erloes gibt es keinen Prozentsatz statt einer Division durch null', () => {
  const b = best('b1', 'PF-1', [])
  assert.equal(margeFuer(b).margeProzent, null)
  assert.equal(margeFuer(b).vollstaendig, false)
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
