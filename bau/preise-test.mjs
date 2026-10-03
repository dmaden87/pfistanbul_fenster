/**
 * Testlauf fuer die Preisregeln des Adminbereichs.
 *
 * Zwei Funktionen, beide in src/components/admin/hilfen.ts, beide mit Geld
 * daran:
 *
 *   `vorschlagFuer`     – was im Angebot als Vorschlag des Rechners steht.
 *   `verkaufspreisFuer` – welcher Preis beim Bearbeiten der Netze bleibt.
 *
 * Die zweite ist die heikle. Im Netz-Editor tippt niemand mehr einen Preis;
 * trotzdem muss beim Speichern eine Zahl in die Position. Nimmt sie immer den
 * gerechneten Vorschlag, wird jeder im Angebot von Hand gesetzte Preis beim
 * naechsten Korrigieren einer Bezeichnung still zurueckgesetzt. Nimmt sie
 * immer den alten, bleibt nach einem neuen Aufmass ein Preis stehen, der zu
 * den neuen Massen nicht passt. Beides faellt niemandem auf, bis die Offerte
 * draussen ist.
 */
import assert from 'node:assert/strict'
import { gerechneterPreis, verkaufspreisFuer, vorschlagFuer } from '../src/components/admin/hilfen.ts'
import { estimateNetChf } from '../src/lib/estimate.ts'

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

/* --- Der gerechnete Preis --------------------------------------------------- */

pruefe('Der gerechnete Preis ist derselbe wie auf der Startseite', () => {
  // Keine zweite Preisliste: Was der Admin vorschlaegt, muss die Zahl sein,
  // die die Kundschaft im Rechner gesehen hat.
  assert.equal(gerechneterPreis(120, 80), estimateNetChf(1.2 * 0.8))
  assert.equal(gerechneterPreis(90, 210), estimateNetChf(0.9 * 2.1))
})

pruefe('Ohne beide Masse gibt es keinen gerechneten Preis', () => {
  assert.equal(gerechneterPreis(120, undefined), null)
  assert.equal(gerechneterPreis(undefined, 80), null)
  assert.equal(gerechneterPreis(0, 80), null)
})

/* --- Der Vorschlag im Angebot ----------------------------------------------- */

pruefe('Der gestempelte Richtpreis gewinnt gegen eine Neuberechnung', () => {
  /*
   * Er ist die Zahl, die die Kundschaft gesehen hat. Neu rechnen wuerde
   * dieselbe Zahl ergeben – aber nur, solange niemand die Katalogpreise
   * anfasst, aus denen der Rechner sie ableitet. Danach waere der
   * "Vorschlag" ein anderer als der genannte.
   */
  const p = { menge: 1, bezeichnung: 'Bad', detail: '', preisChf: 0, breiteCm: 120, hoeheCm: 80, richtpreisChf: 133 }
  assert.equal(vorschlagFuer(p), 133)
})

pruefe('Ohne Stempel wird aus den Massen gerechnet', () => {
  const p = { menge: 1, bezeichnung: 'Bad', detail: '', preisChf: 0, breiteCm: 120, hoeheCm: 80 }
  assert.equal(vorschlagFuer(p), estimateNetChf(1.2 * 0.8))
})

pruefe('Ohne Masse gibt es keinen Vorschlag statt einer erfundenen Zahl', () => {
  // Katalogware ohne Masse in der Position, Alteintraege: Dann steht im
  // Angebot ein Strich, und der Verkaufspreis wird von Hand gesetzt.
  const p = { menge: 1, bezeichnung: 'Set Mittel', detail: '', preisChf: 0, setId: 'mittel' }
  assert.equal(vorschlagFuer(p), null)
})

/* --- Welcher Preis beim Bearbeiten bleibt ----------------------------------- */

const netz = (preisChf, breiteCm, hoeheCm) => ({ preisChf, breiteCm, hoeheCm })

pruefe('Ein festgelegter Preis bleibt, wenn die Masse gleich sind', () => {
  // Der Fall: Im Angebot wurden 185 statt der gerechneten 170 verlangt,
  // danach korrigiert jemand nur die Bezeichnung des Netzes.
  assert.equal(verkaufspreisFuer(netz(185, 90, 210), netz(0, 90, 210), 170), 185)
})

pruefe('Neue Masse heissen neuer Preis', () => {
  // Nach dem Aufmass ist das Fenster groesser als gedacht. Der alte Preis
  // gehoerte zu einem Fenster, das es so nicht gibt.
  assert.equal(verkaufspreisFuer(netz(185, 90, 210), netz(0, 120, 210), 190), 190)
  // Auch eine Aenderung auf den Millimeter zaehlt: Dafuer ist das Feld da.
  assert.equal(verkaufspreisFuer(netz(185, 90, 210), netz(0, 90, 210.5), 170), 170)
})

pruefe('Ein neues Netz bekommt den gerechneten Preis', () => {
  assert.equal(verkaufspreisFuer(undefined, netz(0, 160, 120), 170), 170)
})

pruefe('Ohne alten Preis gilt der Vorschlag, auch bei gleichen Massen', () => {
  // So kommt eine Anfrage aus der Klaerung: Masse da, Preis noch nicht
  // festgelegt.
  assert.equal(verkaufspreisFuer(netz(0, 120, 80), netz(0, 120, 80), 140), 140)
})

pruefe('Ohne Vorschlag und ohne alten Preis bleibt null', () => {
  // Ehrlich statt erfunden: Die Offerte zeigt dann eine Luecke, und die
  // faellt auf.
  assert.equal(verkaufspreisFuer(undefined, netz(0, undefined, undefined), null), 0)
  // Ein alter Preis ohne Masse bleibt dagegen stehen – Katalogware etwa.
  assert.equal(verkaufspreisFuer(netz(240, undefined, undefined), netz(0, undefined, undefined), null), 240)
})

/* --- Ergebnis ---------------------------------------------------------------- */

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
