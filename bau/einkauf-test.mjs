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
import { montageFuerOfferte } from '../src/components/admin/hilfen.ts'

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
  assert.equal(m.montageChf, 0, 'ohne Montage darf keine erscheinen')
})

pruefe('Die Montage zaehlt nicht zum Warenerloes, aber voll in die Marge', () => {
  /*
   * Zwei Zahlen, zwei Aussagen: Der Warenerloes sagt, was die WARE
   * einbringt – sonst zeigte er einen Gewinn auf Ware, den es dort nicht
   * gibt. Die Marge dagegen ist das, was am Ende bleibt, und die Montage
   * ist unsere eigene Arbeit: Erloes ohne Kosten, also ganz Deckungsbeitrag.
   */
  const b = best(
    'b1',
    'PF-1',
    [{ id: 'p1', menge: 2, bezeichnung: 'A', detail: '', preisChf: 150, einkaufChf: 45 }],
    { montage: true, montageChf: 30, summeChf: 330 },
  )
  const m = margeFuer(b)
  assert.equal(m.warenerloesChf, 300)
  assert.equal(m.montageChf, 30)
  assert.equal(m.erloesChf, 330)
  assert.equal(m.margeChf, 240, '300 + 30 Montage − 90 Einkauf')
  assert.equal(m.margeProzent, 72.7, 'der Prozentsatz misst am ganzen Erloes')
})

pruefe('Der Zoll geht von der Marge ab', () => {
  // Er kommt Wochen nach der Ware. Wird er nicht abgezogen, sieht jede
  // Bestellung dauerhaft besser aus, als sie war.
  const b = best(
    'b1',
    'PF-1',
    [{ id: 'p1', menge: 2, bezeichnung: 'A', detail: '', preisChf: 150, einkaufChf: 45 }],
    { lieferkostenChf: 30, zollChf: 20 },
  )
  const m = margeFuer(b)
  assert.equal(m.zollChf, 20)
  assert.equal(m.margeChf, 160, '300 − 90 − 30 Fracht − 20 Zoll')
})

pruefe('Ohne Zoll und ohne Montage bleiben die Zahlen, wie sie waren', () => {
  const b = best('b1', 'PF-1', [{ id: 'p1', menge: 2, bezeichnung: 'A', detail: '', preisChf: 150, einkaufChf: 45 }])
  const m = margeFuer(b)
  assert.equal(m.zollChf, 0)
  assert.equal(m.montageChf, 0)
  assert.equal(m.erloesChf, m.warenerloesChf)
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

/* --- Die Montage auf der Offerte ------------------------------------------- */

pruefe('Die Offerte nimmt den veranschlagten Betrag, auch ohne Haken', () => {
  /*
   * Der Fall aus dem Betrieb: sechs Netze, 50.- Montage im Preisblock
   * eingetragen. Der Haken blieb dabei ungesetzt – die Karte zeigte die
   * Montage, die Offerte verschwieg sie.
   */
  const b = best('b1', 'H-H7Y1', [{ id: 'p1', menge: 6, bezeichnung: 'A', detail: '', preisChf: 150 }], {
    montage: false,
    montageChf: 50,
    summeChf: 950,
  })
  assert.equal(montageFuerOfferte(b, 6, 15), 50)
})

pruefe('Ohne Betrag, aber mit Haken gilt der Ansatz je Netz', () => {
  const b = best('b1', 'PF-1', [{ id: 'p1', menge: 6, bezeichnung: 'A', detail: '', preisChf: 150 }], {
    montage: true,
    montageChf: 0,
    summeChf: 900,
  })
  assert.equal(montageFuerOfferte(b, 6, 15), 90)
})

pruefe('Ohne Betrag und ohne Haken gibt es keine Montage', () => {
  const b = best('b1', 'PF-1', [{ id: 'p1', menge: 6, bezeichnung: 'A', detail: '', preisChf: 150 }], {
    montage: false,
    montageChf: 0,
    summeChf: 900,
  })
  assert.equal(montageFuerOfferte(b, 6, 15), 0)
})

pruefe('Ein Rabatt verschiebt die Montage nicht', () => {
  // montageBetrag() rechnet bei Alteintraegen aus der Differenz zurueck –
  // der Rabatt darf dabei nicht als fehlende Montage erscheinen.
  const b = best('b1', 'PF-1', [{ id: 'p1', menge: 2, bezeichnung: 'A', detail: '', preisChf: 100 }], {
    montage: true,
    rabattChf: 25,
    summeChf: 205,
  })
  delete b.montageChf
  assert.equal(montageFuerOfferte(b, 2, 15), 30)
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
