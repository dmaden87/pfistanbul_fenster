/**
 * Testlauf fuer api/_einkauf.ts und src/lib/einkauf.ts.
 *
 * Hier entsteht die Grundlage jeder spaeteren Rentabilitaetsrechnung. Ein
 * Fehler faellt nicht auf, denn eine falsche Marge sieht aus wie eine
 * richtige – man merkt sie erst, wenn man ein Jahr lang zum falschen Preis
 * verkauft hat. Entsprechend genau wird hier hingeschaut, vor allem auf die
 * Faelle mit UNVOLLSTAENDIGEN Daten: Die duerfen nie eine Zahl liefern, die
 * besser aussieht als die Wirklichkeit.
 */
import assert from 'node:assert/strict'
import { einkaufAusRunde, frachtGesamt, kennungFuer, laufendeZeilen } from '../api/_einkauf.ts'
import { margeFuer } from '../src/lib/einkauf.ts'
import { kennungFuer as kennungSrc } from '../src/lib/bestellauftrag.ts'
import { laufendeZeilen as laufendeSrc, lieferkosten as frachtSrc } from '../src/lib/lieferung.ts'

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

function zeile(nummer, kennung, bestellungId, positionId, stueck, einkaufChf) {
  return {
    nummer,
    kennung,
    bezeichnung: 'Zimmer',
    herkunft: { bestellungId, positionId, stueck },
    ...(einkaufChf === undefined ? {} : { einkaufChf }),
  }
}

function runde(zeilen, extra = {}) {
  return {
    id: 'l1',
    nummer: 'L-2026-01',
    status: 'preise',
    erstellt: '2026-01-01T00:00:00.000Z',
    geaendert: '2026-01-01T00:00:00.000Z',
    bestellungIds: [...new Set(zeilen.map((z) => z.herkunft?.bestellungId).filter(Boolean))],
    zeilen,
    ...extra,
  }
}

/* --- Einkaufspreise je Position -------------------------------------------- */

pruefe('Der Positionspreis gilt JE STUECK, nicht fuer die Position', () => {
  // Eine Position mit Menge 3 steht als drei Zeilen zu je 42 in der Runde.
  const b = best('b1', 'PF-1', [{ id: 'p1', menge: 3, bezeichnung: 'Zimmer', detail: '', preisChf: 140 }])
  const l = runde([
    zeile(1, 'PF-1', 'b1', 'p1', 1, 42),
    zeile(2, 'PF-1', 'b1', 'p1', 2, 42),
    zeile(3, 'PF-1', 'b1', 'p1', 3, 42),
  ])
  const [anteil] = einkaufAusRunde(l, [b])
  assert.equal(anteil.jePosition.p1, 42, 'die drei Zeilen wurden addiert statt gemittelt')
  assert.equal(anteil.ohnePreis, 0)
})

pruefe('Verschiedene Preise auf einer Position werden gemittelt', () => {
  const b = best('b1', 'PF-1', [{ id: 'p1', menge: 2, bezeichnung: 'Zimmer', detail: '', preisChf: 140 }])
  const l = runde([zeile(1, 'PF-1', 'b1', 'p1', 1, 40), zeile(2, 'PF-1', 'b1', 'p1', 2, 50)])
  assert.equal(einkaufAusRunde(l, [b])[0].jePosition.p1, 45)
})

pruefe('Zeilen ohne Preis werden gezaehlt, nicht geschaetzt', () => {
  const b = best('b1', 'PF-1', [
    { id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 140 },
    { id: 'p2', menge: 1, bezeichnung: 'B', detail: '', preisChf: 160 },
  ])
  const l = runde([zeile(1, 'PF-1', 'b1', 'p1', 1, 42), zeile(2, 'PF-1', 'b1', 'p2', 1)])
  const [anteil] = einkaufAusRunde(l, [b])
  assert.equal(anteil.jePosition.p1, 42)
  assert.equal(anteil.jePosition.p2, undefined, 'ein Preis wurde erfunden')
  assert.equal(anteil.ohnePreis, 1)
})

pruefe('Zusatzzeilen gehoeren zu keiner Bestellung', () => {
  const b = best('b1', 'PF-1', [{ id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 140 }])
  const l = runde([
    zeile(1, 'PF-1', 'b1', 'p1', 1, 42),
    { nummer: 2, kennung: 'RESERVE', bezeichnung: 'Muster', einkaufChf: 30 },
  ])
  const anteile = einkaufAusRunde(l, [b])
  assert.equal(anteile.length, 1)
  assert.equal(anteile[0].bestellungId, 'b1')
})

/* --- Frachtanteil ----------------------------------------------------------- */

pruefe('Kosten je Paket sind der exakte Anteil', () => {
  const b1 = best('b1', 'PF-1', [{ id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 140 }])
  const b2 = best('b2', 'PF-2', [{ id: 'p1', menge: 3, bezeichnung: 'B', detail: '', preisChf: 140 }])
  const l = runde(
    [
      zeile(1, 'PF-1', 'b1', 'p1', 1, 42),
      zeile(2, 'PF-2', 'b2', 'p1', 1, 42),
      zeile(3, 'PF-2', 'b2', 'p1', 2, 42),
      zeile(4, 'PF-2', 'b2', 'p1', 3, 42),
    ],
    { lieferkostenJePaket: { 'PF-1': 20, 'PF-2': 60 } },
  )
  const anteile = einkaufAusRunde(l, [b1, b2])
  const a1 = anteile.find((a) => a.bestellungId === 'b1')
  const a2 = anteile.find((a) => a.bestellungId === 'b2')
  assert.equal(a1.lieferkostenChf, 20)
  assert.equal(a1.lieferkostenGeschaetzt, false)
  assert.equal(a2.lieferkostenChf, 60)
})

pruefe('Ein Gesamtbetrag wird nach NETZANZAHL geteilt und als geschaetzt vermerkt', () => {
  // Nicht nach Verkaufspreis: Fracht haengt am Volumen, nicht am Erloes.
  const b1 = best('b1', 'PF-1', [{ id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 500 }])
  const b2 = best('b2', 'PF-2', [{ id: 'p1', menge: 3, bezeichnung: 'B', detail: '', preisChf: 100 }])
  const l = runde(
    [
      zeile(1, 'PF-1', 'b1', 'p1', 1, 42),
      zeile(2, 'PF-2', 'b2', 'p1', 1, 42),
      zeile(3, 'PF-2', 'b2', 'p1', 2, 42),
      zeile(4, 'PF-2', 'b2', 'p1', 3, 42),
    ],
    { lieferkostenChf: 200 },
  )
  const anteile = einkaufAusRunde(l, [b1, b2])
  assert.equal(anteile.find((a) => a.bestellungId === 'b1').lieferkostenChf, 50)
  assert.equal(anteile.find((a) => a.bestellungId === 'b2').lieferkostenChf, 150)
  assert.ok(anteile.every((a) => a.lieferkostenGeschaetzt))
})

pruefe('Ohne Frachtangabe bleibt der Anteil leer statt null', () => {
  const b = best('b1', 'PF-1', [{ id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 140 }])
  const [anteil] = einkaufAusRunde(runde([zeile(1, 'PF-1', 'b1', 'p1', 1, 42)]), [b])
  assert.equal(anteil.lieferkostenChf, undefined, 'null waere die Aussage "Fracht ist gratis"')
})

/* --- Ausgestiegene Bestellungen -------------------------------------------- */

pruefe('Zeilen ausgestiegener Bestellungen zaehlen nicht mehr', () => {
  /*
   * Ihre Zeilen bleiben im Dokument stehen (durchgestrichen), damit Bora
   * seine Preise an den gewohnten Nummern wiederfindet. Gerechnet wird mit
   * ihnen nicht mehr – sonst schriebe der Server die Preise gleich wieder auf
   * eine Bestellung, die er gerade zurueckgestellt hat.
   */
  const b1 = best('b1', 'PF-1', [{ id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 140 }])
  const b2 = best('b2', 'PF-2', [{ id: 'p1', menge: 1, bezeichnung: 'B', detail: '', preisChf: 140 }])
  const l = runde([zeile(1, 'PF-1', 'b1', 'p1', 1, 42), zeile(2, 'PF-2', 'b2', 'p1', 1, 58)], {
    bestellungIds: ['b1'],
    entfernt: [{ bestellungId: 'b2', grund: 'aenderung', zeitpunkt: '2026-02-01T00:00:00.000Z' }],
    lieferkostenChf: 100,
  })
  const anteile = einkaufAusRunde(l, [b1, b2])
  assert.equal(anteile.length, 1)
  assert.equal(anteile[0].bestellungId, 'b1')
  // Die Fracht verteilt sich nur noch auf das, was wirklich geliefert wird.
  assert.equal(anteile[0].lieferkostenChf, 100)
})

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

/* --- Die zwei Fassungen duerfen nicht auseinanderlaufen -------------------- */

/*
 * api/ darf nicht aus src/ importieren – eine Serverless-Funktion kann die
 * endungslosen Importe von Vite nicht aufloesen und stirbt beim Laden. Der
 * Preis sind drei kleine Regeln, die es zweimal gibt. Hier werden sie
 * aneinandergehalten, damit sie nicht stillschweigend auseinanderlaufen.
 */

pruefe('Die Paketkennung ist auf beiden Seiten dieselbe', () => {
  for (const b of [
    { referenz: 'pf-8812', id: 'x' },
    { referenz: '', id: 'abc-123' },
    { referenz: 'H 4K2P!', id: 'y' },
    { referenz: 'ä-öü', id: 'z' },
  ]) {
    assert.equal(kennungFuer(b), kennungSrc(b), JSON.stringify(b))
  }
})

pruefe('Die Frachtregel ist auf beiden Seiten dieselbe', () => {
  for (const l of [
    { zeilen: [], lieferkostenJePaket: { 'PF-1': 30, 'PF-2': 25 } },
    { zeilen: [], lieferkostenJePaket: { 'PF-1': 30 }, lieferkostenChf: 50 },
    { zeilen: [], lieferkostenChf: 0, lieferkostenJePaket: { 'PF-1': 30 } },
    { zeilen: [] },
  ]) {
    assert.equal(frachtGesamt(l), frachtSrc(l).betrag, JSON.stringify(l))
  }
})

pruefe('Der Filter fuer ausgestiegene Zeilen ist auf beiden Seiten derselbe', () => {
  const l = runde([zeile(1, 'PF-1', 'b1', 'p1', 1, 42), zeile(2, 'PF-2', 'b2', 'p1', 1, 58)], {
    entfernt: [{ bestellungId: 'b2', grund: 'aenderung', zeitpunkt: '2026-02-01T00:00:00.000Z' }],
  })
  assert.deepEqual(laufendeZeilen(l), laufendeSrc(l))
  assert.equal(laufendeZeilen(l).length, 1)
  // Und ohne Aussteiger dieselbe Liste, nicht eine Kopie mit Loechern.
  const voll = runde([zeile(1, 'PF-1', 'b1', 'p1', 1, 42)])
  assert.deepEqual(laufendeZeilen(voll), laufendeSrc(voll))
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
