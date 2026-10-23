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
import { aufschlagChf, estimateNetChf, margeProzent, selbstkostenChf } from '../src/lib/estimate.ts'
import { einfuhrsteuerChf, herstellungChf } from '../src/lib/kosten.ts'
import { kostenConfig } from '../src/data/kostenConfig.ts'
import { windowTypes } from '../src/data/catalog.ts'

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
  assert.equal(gerechneterPreis(120, 80), estimateNetChf(120, 80))
  assert.equal(gerechneterPreis(90, 210), estimateNetChf(90, 210))
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
  assert.equal(vorschlagFuer(p), estimateNetChf(120, 80))
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

/* --- Das Preismodell selbst -------------------------------------------------- */

/*
 * HIER HAENGT GELD DRAN, UND ZWAR IN BEIDE RICHTUNGEN. Der Rechner nennt der
 * Kundschaft eine Zahl, bevor jemand von uns sie gesehen hat. Ist sie zu
 * tief, haben wir sie schon versprochen; ist sie zu hoch, ruft niemand an.
 */

pruefe('Gleiche Flaeche, gleicher Preis - so wie eingekauft wird', () => {
  /*
   * DIESER TEST STAND EINMAL ANDERSHERUM, und beide Fassungen waren zu
   * ihrer Zeit richtig.
   *
   * Solange Bora Stueck fuer Stueck offerierte, folgten seine Preise
   * erkennbar dem Umfang: 30 x 300 braucht anderthalbmal so viel Rahmen,
   * Schiene und Buerstendichtung wie 95 x 95, obwohl beide rund 0.9 m²
   * haben. Ein Preis nach Flaeche setzte bei schmalen hohen Netzen zu wenig
   * an - und genau das hielt dieser Test fest.
   *
   * Seit der m2-Vereinbarung stimmt es nicht mehr: Bora verlangt denselben
   * Satz je Quadratmeter, egal welche Form. Damit traegt ER das Risiko der
   * ungleichen Formen, nicht wir, und unser Verkaufspreis darf dieselbe
   * Rechnung machen wie unser Einkauf. Eine Formel, die hier feiner waere
   * als die Preisliste, waere eine Erfindung.
   */
  assert.equal(estimateNetChf(30, 300), estimateNetChf(90, 100),
    'dieselbe Flaeche kostet dasselbe')
  assert.ok(estimateNetChf(100, 200) > estimateNetChf(100, 100),
    'mehr Flaeche kostet mehr')
})

pruefe('Mehr Flaeche kostet nie weniger', () => {
  let vorher = 0
  for (let seite = 20; seite <= 300; seite += 5) {
    const preis = estimateNetChf(seite, seite)
    assert.ok(preis >= vorher, `${seite} x ${seite} faellt auf ${preis} nach ${vorher}`)
    vorher = preis
  }
})

pruefe('Der Richtpreis ist Kosten plus gedeckelter Aufschlag', () => {
  /*
   * DIE GANZE FORMEL IN EINER ZEILE, und deshalb steht sie hier noch einmal
   * ausgeschrieben: Wer sie in estimate.ts aendert, soll diesen Test rot
   * sehen und nicht erst die Startseite.
   */
  for (const [b, h] of [[60, 100], [100, 150], [150, 250], [250, 250]]) {
    const k = selbstkostenChf(b, h)
    const erwartet = Math.ceil((k + Math.min(3 * k, 150)) / 5 - 1e-9) * 5
    assert.equal(estimateNetChf(b, h), erwartet, `${b} x ${h}`)
  }
})

pruefe('Die Selbstkosten sind Ware plus Fracht plus Einfuhrsteuer', () => {
  const ware = herstellungChf(100, 150)
  assert.equal(selbstkostenChf(100, 150),
    Math.round((ware + kostenConfig.frachtProNetzChf + einfuhrsteuerChf(ware)) * 100) / 100)
})

pruefe('Kleine Netze tragen die vollen 75 Prozent Marge', () => {
  /*
   * Solange der Aufschlag unter dem Deckel bleibt, ist die Marge genau die
   * vereinbarte - bis auf die Rundung auf fuenf Franken, die sie minim
   * nach oben schiebt.
   */
  const marge = margeProzent(60, 100)
  assert.ok(marge >= 75 && marge <= 78, `60 x 100 traegt ${marge} Prozent`)
  assert.ok(aufschlagChf(selbstkostenChf(60, 100)) < 150, 'der Deckel greift hier noch nicht')
})

pruefe('Bei grossen Netzen greift der Deckel und die Marge sinkt', () => {
  assert.equal(aufschlagChf(selbstkostenChf(250, 250)), 150, 'der Aufschlag steht auf dem Deckel')
  const marge = margeProzent(250, 250)
  assert.ok(marge < 50, `250 x 250 traegt noch ${marge} Prozent`)
  /*
   * DAS IST DER ZWECK DES DECKELS, nicht sein Preis: Ohne ihn kostete
   * dieses Netz das Vierfache seiner Kosten, also ueber 800 Franken.
   */
  assert.ok(estimateNetChf(250, 250) < 4 * selbstkostenChf(250, 250))
})

pruefe('Die Marge faellt mit der Groesse, nie umgekehrt', () => {
  let vorher = 101
  for (const [b, h] of [[60, 100], [100, 150], [140, 200], [180, 250], [250, 250]]) {
    const m = margeProzent(b, h)
    assert.ok(m <= vorher, `${b} x ${h}: ${m} Prozent nach ${vorher}`)
    vorher = m
  }
})

pruefe('Der schmale Rahmen kostet die Kundschaft mehr', () => {
  for (const [b, h] of [[60, 100], [100, 150], [150, 250]]) {
    assert.ok(estimateNetChf(b, h, '1.5') >= estimateNetChf(b, h, '2.8'),
      `${b} x ${h}: schmal ${estimateNetChf(b, h, '1.5')}, normal ${estimateNetChf(b, h, '2.8')}`)
  }
  assert.ok(estimateNetChf(100, 150, '1.5') > estimateNetChf(100, 150, '2.8'),
    'bei mittleren Formaten muss der Unterschied durchschlagen')
})

pruefe('Ein Altwert in der Rahmendicke rechnet wie der normale Rahmen', () => {
  assert.equal(estimateNetChf(100, 150, '3-4 cm'), estimateNetChf(100, 150, '2.8'))
  assert.equal(estimateNetChf(100, 150, undefined), estimateNetChf(100, 150, '2.8'))
})

pruefe('Ohne Masse gibt es keinen Preis statt eines erfundenen', () => {
  assert.equal(estimateNetChf(0, 150), 0)
  assert.equal(estimateNetChf(100, 0), 0)
  assert.equal(margeProzent(0, 0), null)
})


/* --- Ergebnis ---------------------------------------------------------------- */

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
