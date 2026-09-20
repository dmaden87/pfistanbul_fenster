/**
 * Testlauf fuer die Bedeutung von `preisChf` in einer Position.
 *
 * DER FEHLER, DEN ES HIER GAB: Jede Stelle im Haus rechnet `preisChf * menge`
 * - die Karte im Adminbereich, die Offerte, der Server beim Neurechnen der
 * Summe. `preisChf` ist also der STUECKPREIS. Der Warenkorb schrieb dort aber
 * den Zeilenbetrag hinein, also Stueckpreis mal Menge. Zwei Fenster zu 150.-
 * standen damit als "2 x 300.-" in der Tabelle: einmal 600.- (Netze
 * zusammengerechnet) und einmal 300.- (die gespeicherte Summe).
 *
 * WARUM ES NIEMAND MERKTE: Bei Menge 1 sind Stueckpreis und Zeilenbetrag
 * dieselbe Zahl. Erst ab zwei gleichen Netzen laufen sie auseinander - und
 * die ersten Bestellungen hatten von jedem Fenster genau eines.
 *
 * WARUM ES GEFAEHRLICH WAR: Nicht wegen der Anzeige. Sondern weil der Server
 * bei jeder Aenderung an den Netzen `summeChf` neu aus den Positionen rechnet.
 * Eine einzige Korrektur im Adminbereich haette aus der 300er-Bestellung eine
 * 600er gemacht - und die bezahlte Rechnung haette ploetzlich als halb
 * bezahlt dagestanden.
 *
 * Lauf: node --import ./bau/ts-aufloeser.mjs bau/warenkorb-test.mjs
 */
import assert from 'node:assert/strict'
import { positionenAusWarenkorb } from '../src/lib/bestellungSpeichern.ts'
import { cartTotals, einzelpreisFuerZeile, priceForLine } from '../src/lib/pricing.ts'
import { positionenSumme } from '../src/components/admin/hilfen.ts'
import { netSets, typeById } from '../src/data/catalog.ts'
import { preiseVereinheitlichen } from '../api/_preise.ts'

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

const ZIMMER = typeById('zimmer')
const zeile = (refId, quantity, kind = 'einzel') => ({ id: `z-${refId}`, kind, refId, quantity })

/* --- Was der Warenkorb ablegt ----------------------------------------------- */

pruefe('Der Stueckpreis steht in der Position, nicht der Zeilenbetrag', () => {
  const [p] = positionenAusWarenkorb([zeile('zimmer', 2)])
  assert.equal(p.menge, 2)
  assert.equal(p.preisChf, ZIMMER.priceChf, 'preisChf muss der Preis EINES Netzes sein')
})

pruefe('Der genaue Fall aus dem Betrieb: zwei Fenster zu 150.-', () => {
  const positionen = positionenAusWarenkorb([zeile('zimmer', 2)])
  const summen = cartTotals([zeile('zimmer', 2)], false)
  assert.equal(summen.totalChf, 300, 'die Kundin sieht 300.- im Warenkorb')
  assert.equal(positionenSumme(positionen), 300, 'der Adminbereich muss dieselben 300.- zeigen')
})

/*
 * Das ist die Bedingung, die den Fehler ueberhaupt erst sichtbar macht: Was
 * der Warenkorb an Netzen ausrechnet und was der Adminbereich aus den
 * Positionen ausrechnet, muss dieselbe Zahl sein. Sie wird hier fuer jeden
 * Artikel im Katalog geprueft, nicht nur fuer den einen, der aufgefallen ist.
 */
pruefe('Netze im Warenkorb und Netze im Adminbereich stimmen ueberein', () => {
  const zeilen = [zeile('zimmer', 3), zeile('bad', 2), zeile(netSets[0].id, 2, 'set')]
  const summen = cartTotals(zeilen, false)
  assert.equal(positionenSumme(positionenAusWarenkorb(zeilen)), summen.netsChf)
})

pruefe('Auch mit Montage bleibt die Summe der Bestellung dieselbe', () => {
  const zeilen = [zeile('zimmer', 2), zeile('balkontuer', 1)]
  const summen = cartTotals(zeilen, true)
  const positionen = positionenAusWarenkorb(zeilen)
  assert.equal(positionenSumme(positionen) + summen.montageChf, summen.totalChf)
})

pruefe('Zeilenbetrag und Stueckpreis unterscheiden sich nur ab Menge zwei', () => {
  assert.equal(priceForLine(zeile('zimmer', 1)), einzelpreisFuerZeile(zeile('zimmer', 1)))
  assert.equal(priceForLine(zeile('zimmer', 4)), einzelpreisFuerZeile(zeile('zimmer', 4)) * 4)
})

/* --- Was mit den bereits gespeicherten Bestellungen geschieht ---------------- */

const kunde = { name: 'Testkunde', email: 't@example.ch' }
const best = (positionen, extra = {}) => ({
  id: 'b1',
  referenz: 'PA-0001',
  art: 'bestellung',
  status: 'bestellen',
  kunde,
  positionen,
  montage: false,
  quelle: 'web',
  ...extra,
})

pruefe('Eine alte Bestellung mit Zeilenbetraegen wird beim Lesen geradegezogen', () => {
  // So liegt sie im Speicher: 2 x "300.-", Summe 300.-.
  const b = best([{ menge: 2, bezeichnung: 'Zimmer', detail: '', preisChf: 300 }], { summeChf: 300 })
  const heil = preiseVereinheitlichen(b)
  assert.equal(heil.positionen[0].preisChf, 150)
  assert.equal(positionenSumme(heil.positionen), heil.summeChf)
})

pruefe('Mit Montage wird ebenso geradegezogen', () => {
  const b = best([{ menge: 2, bezeichnung: 'Zimmer', detail: '', preisChf: 300 }], {
    summeChf: 330,
    montageChf: 30,
    montage: true,
  })
  assert.equal(preiseVereinheitlichen(b).positionen[0].preisChf, 150)
})

pruefe('Eine richtige Bestellung wird NICHT angefasst', () => {
  const b = best([{ menge: 2, bezeichnung: 'Zimmer', detail: '', preisChf: 150 }], { summeChf: 300 })
  assert.equal(preiseVereinheitlichen(b).positionen[0].preisChf, 150)
})

pruefe('Menge eins bleibt unberuehrt – da gibt es nichts zu entscheiden', () => {
  const b = best([{ menge: 1, bezeichnung: 'Zimmer', detail: '', preisChf: 150 }], { summeChf: 150 })
  assert.equal(preiseVereinheitlichen(b).positionen[0].preisChf, 150)
})

/*
 * Der wichtigste Nichtfall. Eine Sondermass-Anfrage legt von jeher den
 * Stueckpreis ab. Wuerde die Reparatur hier zuschlagen, halbierte sie
 * Preise, die nie falsch waren.
 */
pruefe('Sondermass mit Stueckpreisen bleibt unberuehrt', () => {
  const b = best([{ menge: 3, bezeichnung: 'Sondermass', detail: '120 × 90 cm', preisChf: 140 }], {
    art: 'anfrage',
    summeChf: 420,
  })
  assert.equal(preiseVereinheitlichen(b).positionen[0].preisChf, 140)
})

pruefe('Eine Bestellung mit Rabatt wird richtig gelesen', () => {
  const b = best([{ menge: 2, bezeichnung: 'Zimmer', detail: '', preisChf: 300 }], {
    summeChf: 280,
    rabattChf: 20,
    rabattText: 'Kennenlernrabatt',
  })
  assert.equal(preiseVereinheitlichen(b).positionen[0].preisChf, 150)
})

/*
 * Wenn die gespeicherte Summe zu KEINER der beiden Lesarten passt, ist etwas
 * anderes im Argen - dann wird nichts geraten. Lieber eine Zahl, die jemandem
 * auffaellt, als eine stillschweigend veraenderte.
 */
pruefe('Passt die Summe zu keiner Lesart, bleibt alles stehen', () => {
  const b = best([{ menge: 2, bezeichnung: 'Zimmer', detail: '', preisChf: 300 }], { summeChf: 1234 })
  assert.equal(preiseVereinheitlichen(b).positionen[0].preisChf, 300)
})

pruefe('Ohne Positionen oder ohne Summe passiert nichts', () => {
  assert.equal(preiseVereinheitlichen(best([], { summeChf: 0 })).positionen.length, 0)
  const ohne = best([{ menge: 2, bezeichnung: 'X', detail: '', preisChf: 300 }], {})
  assert.equal(preiseVereinheitlichen(ohne).positionen[0].preisChf, 300)
})

pruefe('Geht die Teilung nicht rappengenau auf, bleibt alles stehen', () => {
  // Ein Zeilenbetrag von 100.- auf drei Stueck gaebe 33.33 je Stueck - und
  // drei mal 33.33 sind 99.99, nicht 100. Lieber stehen lassen.
  const b = best([{ menge: 3, bezeichnung: 'X', detail: '', preisChf: 100 }], { summeChf: 100 })
  assert.equal(preiseVereinheitlichen(b).positionen[0].preisChf, 100)
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length) {
  console.error('\n' + fehler.join('\n'))
  process.exit(1)
}
