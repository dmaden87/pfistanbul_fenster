/**
 * Prueft, dass ein Betrag in Schweizer Schreibweise gelesen wird.
 *
 * DER FEHLER, DEN DAS VERHINDERT, WAR LAUTLOS. Die Felder lasen
 * `Number(text.replace(',', '.'))`. Das verschluckt den Tausender-Apostroph:
 * Aus "1'234.50" wird NaN und daraus eine Null. Wer zwoelftausend Franken so
 * eintippt, wie man sie in der Schweiz schreibt, speicherte eine Null - und
 * merkte es fruehestens in der Abrechnung. Zwei Felder waren zudem
 * `type="number"` und nahmen den Apostroph gar nicht erst an.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { betragAusText, betragOderNull } from '../src/lib/format.ts'

let gut = 0
let schlecht = 0
function pruefe(name, lauf) {
  try { lauf(); gut += 1; console.log(`ok    ${name}`) }
  catch (f) { schlecht += 1; console.log(`FEHL  ${name}\n      ${f.message.split('\n')[0]}`) }
}

/* --- Was jemand tippt ------------------------------------------------------ */

pruefe('Das verlangte Format: xx’xxx.yy', () => {
  assert.equal(betragAusText("12'345.67"), 12345.67)
  assert.equal(betragAusText("1'234.50"), 1234.5)
  assert.equal(betragAusText("99'999.99"), 99999.99)
})

pruefe('Auch ohne Apostroph', () => {
  assert.equal(betragAusText('12345.67'), 12345.67)
  assert.equal(betragAusText('1234.5'), 1234.5)
  assert.equal(betragAusText('0'), 0)
  assert.equal(betragAusText('0.05'), 0.05)
})

/*
 * DER APOSTROPH HAT MEHRERE GESTALTEN. Auf dem Telefon setzt die Tastatur
 * das typografische ’, manche Tabellenkalkulation den Akzent, und aus
 * einer Kopie kommt gern ein geschuetztes Leerzeichen. Alle meinen dasselbe.
 */
pruefe('Jede Gestalt des Tausendertrenners', () => {
  for (const zeichen of ["'", '‘', '’', '´', '`', ' ', ' ', ' ']) {
    assert.equal(betragAusText(`12${zeichen}345.67`), 12345.67, `Zeichen ${JSON.stringify(zeichen)}`)
  }
})

pruefe('Komma statt Punkt trennt ebenfalls die Rappen', () => {
  assert.equal(betragAusText('1234,50'), 1234.5)
  assert.equal(betragAusText('1,50'), 1.5, 'ein Franken fuenfzig, nicht hundertfuenfzig')
})

/*
 * BEIDE ZEICHEN DA? Das SPAETERE trennt die Rappen. "1.234,50" ist deutsche
 * Schreibweise, "1,234.50" englische - und nur die Reihenfolge unterscheidet
 * sie. Wer eine der beiden einfuegt, meint in beiden Faellen 1234.50.
 */
pruefe('Bei zwei Zeichen entscheidet das letzte', () => {
  assert.equal(betragAusText('1.234,50'), 1234.5)
  assert.equal(betragAusText('1,234.50'), 1234.5)
  assert.equal(betragAusText("1'234,50"), 1234.5)
})

/* --- Was kein Betrag ist ---------------------------------------------------- */

/*
 * NULL IST NICHT NULL FRANKEN. Eine Null ist eine Aussage ("kostet nichts"),
 * ein Tippfehler ist keine - deshalb gibt betragAusText() null zurueck und
 * nicht 0. Erst betragOderNull() macht daraus eine Zahl, und zwar dort, wo
 * ein leeres Feld wirklich "nichts" heisst.
 */
pruefe('Was kein Betrag ist, gibt null statt einer Null', () => {
  for (const murks of ['', '   ', 'abc', '12.3.4', '.', '-', 'CHF 20']) {
    assert.equal(betragAusText(murks), null, JSON.stringify(murks))
  }
})

pruefe('betragOderNull macht daraus eine Null, aber nie etwas Negatives', () => {
  assert.equal(betragOderNull(''), 0)
  assert.equal(betragOderNull('abc'), 0)
  assert.equal(betragOderNull('-5'), 0, 'ein Preis unter null ist in keinem Feld gueltig')
  assert.equal(betragOderNull("1'234.50"), 1234.5)
})

pruefe('Mehr als zwei Nachkommastellen werden auf Rappen gerundet', () => {
  assert.equal(betragAusText('1.009'), 1.01)
  assert.equal(betragAusText('1.001'), 1)
  /*
   * NICHT GEPRUEFT WIRD DIE HALBE RAPPEN-KANTE: "1.005" ergibt 1.00 und
   * nicht 1.01, weil 1.005 * 100 als Gleitkommazahl 100.4999... ist. Das
   * gilt im ganzen Projekt gleich - runde2() rechnet ueberall so -, und
   * eine Ausnahme nur im Leser waere schlimmer als die Ungenauigkeit: Dann
   * saehe ein Betrag nach dem Speichern anders aus als beim Tippen. Im
   * verlangten Format xx'xxx.yy kommt der Fall ohnehin nicht vor.
   */
})

/* --- Die Kopien auf dem Server --------------------------------------------- */

/*
 * api/ darf nicht aus src/ importieren, also steht dieselbe Leseregel dort
 * noch einmal - dreimal sogar. Genau so ist schon einmal eine Formel
 * auseinandergelaufen (montageBetrag, als die Anfahrt dazukam). Hier wird
 * deshalb verglichen, dass alle drei Kopien dasselbe Zeichen-Set abraeumen.
 */
const SERVER = ['api/bestellungen.ts', 'api/auslagen.ts', 'api/abrechnungen.ts']
const regel = (datei) => {
  const text = readFileSync(new URL(`../${datei}`, import.meta.url), 'utf8')
  const treffer = text.match(/text = wert\.trim\(\)\.replace\([^\n]*/)
  return treffer ? treffer[0].trim() : null
}

pruefe('Alle drei Endpunkte lesen Betraege nach derselben Regel', () => {
  const regeln = SERVER.map(regel)
  for (const [i, r] of regeln.entries()) assert.ok(r, `${SERVER[i]}: keine Leseregel gefunden`)
  assert.equal(new Set(regeln).size, 1, regeln.join('\n      '))
})

pruefe('Und sie raeumen dieselben Zeichen weg wie der Browser', () => {
  const imBrowser = readFileSync(new URL('../src/lib/format.ts', import.meta.url), 'utf8')
    .match(/let text = roh\.replace\((\/[^/]*\/g)/)
  assert.ok(imBrowser, 'im Browser keine Leseregel gefunden')
  assert.ok(regel(SERVER[0]).includes(imBrowser[1]),
    `Browser ${imBrowser[1]}\n      Server ${regel(SERVER[0])}`)
})

console.log(`\n${gut}/${gut + schlecht} bestanden`)
if (schlecht > 0) process.exit(1)
