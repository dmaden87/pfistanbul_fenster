/**
 * Prueft die Merkmale eines Netzes: Rahmendicke, Gewebe, Rahmenfarbe.
 *
 * SIE SIND KEINE BESCHRIFTUNG MEHR, SONDERN TEIL DES PREISES. Seit Bora den
 * schmalen 1.5er Rahmen teurer rechnet als den 2.8er und engmaschiges
 * Gewebe teurer als gewoehnliches, entscheidet die Auswahl mit, was ein
 * Netz kostet. Was in den Preis eingeht, darf kein Freitext sein - und
 * dieser Test haelt fest, dass die Tabellen vollstaendig sind und die
 * Vorbelegung zu ihnen passt.
 */
import assert from 'node:assert/strict'
import {
  NETZARTEN, RAHMENDICKEN, RAHMENFARBEN, RAHMENFARBEN_WAHL, STANDARD, beschriften,
} from '../src/data/produktion.ts'

let gut = 0
let schlecht = 0
function pruefe(name, lauf) {
  try { lauf(); gut += 1; console.log(`ok    ${name}`) }
  catch (f) { schlecht += 1; console.log(`FEHL  ${name}\n      ${f.message.split('\n')[0]}`) }
}

pruefe('Es gibt genau die zwei Rahmendicken', () => {
  assert.deepEqual(Object.keys(RAHMENDICKEN), ['1.5', '2.8'])
})

pruefe('Es gibt genau die zwei Gewebe', () => {
  assert.deepEqual(Object.keys(NETZARTEN), ['normal', 'engmaschig'])
})

pruefe('Zur Wahl stehen weiss, anthrazit und schwarz', () => {
  assert.deepEqual(RAHMENFARBEN_WAHL, ['weiss', 'anthrazit', 'schwarz'])
})

/*
 * GELOESCHT WIRD HIER NIE ETWAS. "dunkelbraun" ist nicht mehr im Angebot,
 * steht aber in Bestellungen, die schon geschrieben sind. Ohne den Eintrag
 * zeigte ihr Bestellblatt den nackten Schluessel statt eines Worts - und
 * Bora laese "dunkelbraun" als Code, nicht als Farbe.
 */
pruefe('Die Altfarbe bleibt beschriftbar, auch wenn sie niemand mehr waehlt', () => {
  assert.ok(!RAHMENFARBEN_WAHL.includes('dunkelbraun'), 'nicht mehr zur Wahl')
  assert.equal(beschriften(RAHMENFARBEN, 'dunkelbraun'), 'dunkelbraun')
  assert.equal(beschriften(RAHMENFARBEN, 'dunkelbraun', 'tuerkisch'), 'koyu kahverengi')
})

pruefe('Jede Auswahl ist in beiden Sprachen beschriftet', () => {
  for (const [name, tabelle] of [['Rahmendicke', RAHMENDICKEN], ['Gewebe', NETZARTEN], ['Rahmenfarbe', RAHMENFARBEN]]) {
    for (const [wert, b] of Object.entries(tabelle)) {
      assert.ok(b.deutsch && b.deutsch.trim(), `${name}/${wert}: deutsch fehlt`)
      assert.ok(b.tuerkisch && b.tuerkisch.trim(), `${name}/${wert}: tuerkisch fehlt`)
    }
  }
})

/*
 * DIE VORBELEGUNG WAR EINMAL FALSCH: Sie trug "3-4 cm", die Dicke der
 * FENSTERrahmen im Pfisterhoelzli, und fuhr als Rahmenmass unseres Plissees
 * zu Bora. Solange niemand damit rechnete, fiel es nicht auf.
 */
pruefe('Die Vorbelegung ist eine der angebotenen Dicken', () => {
  assert.ok(STANDARD.rahmendicke in RAHMENDICKEN, `"${STANDARD.rahmendicke}" steht nicht zur Wahl`)
  assert.equal(STANDARD.rahmendicke, '2.8', 'der gewoehnliche Rahmen ist die Vorbelegung')
})

pruefe('Die Vorbelegungen fuer Gewebe und Farbe stehen ebenfalls zur Wahl', () => {
  assert.ok(STANDARD.netzart in NETZARTEN)
  assert.ok(RAHMENFARBEN_WAHL.includes(STANDARD.rahmenfarbe))
})

console.log(`\n${gut}/${gut + schlecht} bestanden`)
if (schlecht > 0) process.exit(1)
