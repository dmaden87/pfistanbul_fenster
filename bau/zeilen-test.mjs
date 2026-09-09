/**
 * Testlauf fuer src/lib/zeilenBearbeiten.ts.
 *
 * Aufruf: npm test
 *
 * Hier geht es um die Stelle, die still falsch waere: Eine Runde merkt sich
 * ausgeschlossene Netze ueber `positionId#stueck`. Wird eine Position mit
 * Menge > 1 bearbeitet, verschieben sich diese Stuecke – und ohne saubere
 * Umbenennung waere ein ausgeschlossenes Netz plotzlich wieder in der
 * Lieferung, ohne dass es jemandem auffaellt.
 */
import assert from 'node:assert/strict'
import { zeileAendern, zeileEntfernen, schluesselUmbenennen } from '../src/lib/zeilenBearbeiten.ts'
import { zeilenDerRunde, zeilenSchluessel } from '../src/lib/bestellauftrag.ts'

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

const K = { rahmendicke: '3-4 cm', rahmenfarbe: 'weiss', netzfarbe: 'grau', mechanismus: 'akkordeon', oeffnung: 'nach-links' }
const bestellung = {
  id: 'b1', referenz: 'PF-1', art: 'bestellung', status: 'neu',
  eingang: '2026-09-01T10:00:00.000Z', geaendert: '2026-09-01T10:00:00.000Z',
  kunde: { name: 'T', email: 't@x.ch', telefon: '', strasse: '', plz: '', ort: '', bemerkung: '' },
  positionen: [
    { id: 'pA', menge: 3, bezeichnung: 'Zimmer', detail: '', preisChf: 170, breiteCm: 128.6, hoeheCm: 182.5, ...K },
    { id: 'pB', menge: 1, bezeichnung: 'Bad', detail: '', preisChf: 130, breiteCm: 64, hoeheCm: 95.7, ...K },
  ],
  montage: false, zahlung: 'uebergabe', zahlungswunsch: false, summeChf: 640,
}

pruefe('Jedes Stueck wird eine eigene Zeile mit eigener Herkunft', () => {
  const zeilen = zeilenDerRunde([bestellung])
  assert.equal(zeilen.length, 4)
  assert.deepEqual(zeilen.map((z) => z.herkunft.stueck), [0, 1, 2, 0])
  assert.deepEqual(zeilen.map((z) => z.herkunft.positionId), ['pA', 'pA', 'pA', 'pB'])
})

pruefe('Eine ausgeschlossene Zeile fehlt in der Runde, bleibt aber in der Bestellung', () => {
  const schluessel = zeilenSchluessel({ bestellungId: 'b1', positionId: 'pA', stueck: 1 })
  const zeilen = zeilenDerRunde([bestellung], { ausgeschlossen: [schluessel] })
  assert.equal(zeilen.length, 3)
  assert.equal(bestellung.positionen[0].menge, 3, 'die Bestellung wurde angetastet')
})

pruefe('Eine Position mit Menge 1 wird an Ort und Stelle geaendert', () => {
  const e = zeileAendern(bestellung, { bestellungId: 'b1', positionId: 'pB', stueck: 0 }, { breiteCm: 66 })
  assert.equal(e.positionen.length, 2)
  assert.equal(e.positionen[1].breiteCm, 66)
  assert.deepEqual(e.umbenennung, {})
})

pruefe('Eine Position mit Menge 3 zerfaellt beim Aendern in drei Einzelne', () => {
  const e = zeileAendern(bestellung, { bestellungId: 'b1', positionId: 'pA', stueck: 1 }, { breiteCm: 130 })
  assert.equal(e.positionen.length, 4, 'drei Zimmer plus Bad erwartet')
  assert.deepEqual(e.positionen.slice(0, 3).map((p) => p.menge), [1, 1, 1])
  assert.deepEqual(e.positionen.slice(0, 3).map((p) => p.breiteCm), [128.6, 130, 128.6])
  assert.equal(e.positionen[3].bezeichnung, 'Bad', 'die uebrigen Positionen sind verrutscht')
})

pruefe('Der Ausschluss folgt der Zerlegung – das ist die stille Falle', () => {
  // Vorher ausgeschlossen: das dritte Zimmer (Stueck 2).
  const vorher = zeilenSchluessel({ bestellungId: 'b1', positionId: 'pA', stueck: 2 })
  const e = zeileAendern(bestellung, { bestellungId: 'b1', positionId: 'pA', stueck: 0 }, { breiteCm: 130 })
  const nachher = schluesselUmbenennen([vorher], e.umbenennung)
  assert.notDeepEqual(nachher, [vorher], 'der Schluessel wurde nicht umbenannt')

  const geaendert = { ...bestellung, positionen: e.positionen }
  const zeilen = zeilenDerRunde([geaendert], { ausgeschlossen: nachher })
  assert.equal(zeilen.length, 3, 'das ausgeschlossene Netz ist wieder in der Lieferung')
  // Und es ist das richtige: geblieben sind das geaenderte und ein unveraendertes Zimmer.
  assert.deepEqual(zeilen.slice(0, 2).map((z) => z.breiteCm), [130, 128.6])
})

pruefe('Loeschen entfernt das Netz aus der Bestellung', () => {
  const e = zeileEntfernen(bestellung, { bestellungId: 'b1', positionId: 'pA', stueck: 1 })
  const zimmer = e.positionen.filter((p) => p.bezeichnung === 'Zimmer')
  assert.equal(zimmer.reduce((s, p) => s + p.menge, 0), 2, 'es sind nicht zwei Zimmer uebrig')
})

pruefe('Loeschen einer Position mit Menge 1 entfernt die ganze Zeile', () => {
  const e = zeileEntfernen(bestellung, { bestellungId: 'b1', positionId: 'pB', stueck: 0 })
  assert.equal(e.positionen.length, 1)
  assert.equal(e.positionen[0].bezeichnung, 'Zimmer')
})

pruefe('Zusatzzeilen der Runde haengen hinten an und haben keine Herkunft', () => {
  const zeilen = zeilenDerRunde([bestellung], {
    zusatz: [{ nummer: 0, kennung: 'RESERVE', bezeichnung: 'Reservenetz', breiteCm: 100, hoeheCm: 100 }],
  })
  assert.equal(zeilen.length, 5)
  assert.equal(zeilen[4].kennung, 'RESERVE')
  assert.equal(zeilen[4].herkunft, undefined)
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
