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
import { estimateNetChf, priceModel } from '../src/lib/estimate.ts'
import { einfuhrsteuerChf, herstellungChf, umfangM } from '../src/lib/kosten.ts'
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

pruefe('Der Richtpreis folgt dem Umfang, nicht der Flaeche', () => {
  /*
   * DER FEHLER, DER HIER JAHRELANG STAND: Zwei Netze mit derselben Flaeche
   * bekamen denselben Preis, obwohl das eine anderthalbmal so viel Rahmen,
   * Schiene und Buerstendichtung braucht. 30 x 300 und 95 x 95 haben beide
   * rund 0.9 m², aber 6.6 gegen 3.8 Meter Umfang.
   */
  const schmalHoch = estimateNetChf(30, 300)
  const quadratisch = estimateNetChf(95, 95)
  assert.ok(schmalHoch > quadratisch,
    `gleiche Flaeche, mehr Umfang muss mehr kosten: ${schmalHoch} gegen ${quadratisch}`)
})

pruefe('Mehr Umfang kostet nie weniger', () => {
  let vorher = 0
  for (let seite = 20; seite <= 300; seite += 5) {
    const preis = estimateNetChf(seite, seite)
    assert.ok(preis >= vorher, `${seite} x ${seite} faellt auf ${preis} nach ${vorher}`)
    vorher = preis
  }
})

pruefe('Das Modell trifft die vier Katalogpreise auf wenige Franken', () => {
  /*
   * Nicht genau, und das soll es auch nicht: Der Richtpreis traegt die
   * Sicherheitsmarge und liegt darum ueber dem Siedlungspreis. Aber die
   * ROHE Gerade muss nahe an den Preisen liegen, aus denen sie stammt -
   * sonst beschreibt sie etwas anderes als unser Sortiment.
   */
  for (const t of windowTypes) {
    const roh = priceModel.baseChf + priceModel.proMeterChf * umfangM(t.widthCm, t.heightCm)
    assert.ok(Math.abs(roh - t.priceChf) <= 3,
      `${t.label}: Modell ${roh.toFixed(2)}, Katalog ${t.priceChf}`)
  }
})

pruefe('Sondermass ist nie billiger als derselbe Siedlungspreis', () => {
  /*
   * Sonst lohnte es sich, das ausgemessene Format als Sondermass zu
   * bestellen - und die Siedlungspreise, die wir nicht anfassen, waeren
   * ausgehebelt.
   */
  for (const t of windowTypes) {
    const rechner = estimateNetChf(t.widthCm, t.heightCm)
    assert.ok(rechner >= t.priceChf, `${t.label}: Rechner ${rechner}, Siedlung ${t.priceChf}`)
  }
})

pruefe('Gerundet wird auf fuenf Franken, und nur nach oben', () => {
  for (const [b, h] of [[20, 20], [63, 97], [100, 100], [128, 182], [250, 250], [300, 300]]) {
    const preis = estimateNetChf(b, h)
    assert.equal(preis % 5, 0, `${b} x ${h} ergibt ${preis}`)
    const roh = (priceModel.baseChf + priceModel.proMeterChf * umfangM(b, h)) * 1.05
    assert.ok(preis >= roh - 1e-9, `${b} x ${h}: ${preis} liegt unter der Rechnung ${roh.toFixed(2)}`)
    assert.ok(preis - roh < 5, `${b} x ${h}: ${preis} liegt mehr als eine Stufe darueber`)
  }
})

pruefe('Die Sicherheitsmarge liegt wirklich drauf', () => {
  /* Fuenf Prozent, bevor gerundet wird - sonst ist es keine Marge. */
  const roh = priceModel.baseChf + priceModel.proMeterChf * umfangM(100, 100)
  assert.ok(estimateNetChf(100, 100) >= roh * 1.05 - 1e-9)
})

pruefe('Kein Format im erlaubten Feld verkauft sich unter der Haelfte Marge', () => {
  /*
   * DER WAECHTER ZWISCHEN DEN ZWEI RECHNUNGEN. Preis und Kosten stehen in
   * verschiedenen Dateien und werden verschieden gepflegt; dass sie
   * zueinander passen, prueft sonst niemand. Heute liegt die duennste Stelle
   * bei 67 Prozent - 50 laesst Luft und faengt trotzdem jeden Umbau ab, der
   * die beiden auseinanderlaufen laesst.
   */
  let duennste = { marge: 1, format: '' }
  for (let b = 20; b <= 300; b += 10) {
    for (let h = 20; h <= 300; h += 10) {
      const preis = estimateNetChf(b, h)
      const ware = herstellungChf(b, h)
      const kosten = ware + einfuhrsteuerChf(ware)
      const marge = (preis - kosten) / preis
      if (marge < duennste.marge) duennste = { marge, format: `${b} x ${h}` }
    }
  }
  assert.ok(duennste.marge >= 0.5,
    `duennste Marge ${Math.round(duennste.marge * 1000) / 10} % bei ${duennste.format}`)
})

/* --- Ergebnis ---------------------------------------------------------------- */

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
