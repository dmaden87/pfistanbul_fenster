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
import { estimateNetChf, margeProzent, selbstkostenChf } from '../src/lib/estimate.ts'
import { einfuhrsteuerChf, herstellungChf } from '../src/lib/kosten.ts'
import { kostenConfig } from '../src/data/kostenConfig.ts'
import { priceRange } from '../src/data/catalog.ts'
import { startseite } from '../src/data/site.ts'
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

pruefe('Der Richtpreis ist Sockel plus Faktor mal Selbstkosten', () => {
  /*
   * DIE GANZE FORMEL NOCH EINMAL AUSGESCHRIEBEN. Wer sie in estimate.ts
   * aendert, soll diesen Test rot sehen und nicht erst die Startseite.
   * Sockel und Faktor stehen hier als Zahlen, weil sie die Vereinbarung
   * sind - der frueher hier gepruefte Deckel war abgeleitet, diese beiden
   * sind gesetzt.
   */
  for (const [b, h] of [[100, 150], [160, 122], [150, 250], [250, 250]]) {
    const k = selbstkostenChf(b, h)
    const erwartet = Math.ceil(Math.max(65 + Math.round(1.6 * k * 100) / 100, 125) / 5 - 1e-9) * 5
    assert.equal(estimateNetChf(b, h), erwartet, `${b} x ${h}`)
  }
})

pruefe('Die Preisgerade steht, wo sie nach Boras Satz stehen muss', () => {
  /*
   * DIE ANKER SIND DIE VEREINBARUNG, nicht die Formel: 1 m² = 140,
   * 1.5 = 160, 2 = 185, 3 = 235. Sockel und Faktor sind daraus gerechnet.
   *
   * GETROFFEN HABEN SIE BEI 30 EUR/m². Seit Bora den normalen Rahmen auf
   * 28 gesenkt hat, liegt die ganze Gerade tiefer - fuenf bis zehn Franken,
   * je nach Groesse. Das ist kein Fehler, sondern die Entscheidung: Der
   * guenstigere Einkauf geht an die Kundschaft. Wer die alten Preise
   * zurueckwollte, muesste den Warenfaktor von 1.6 auf 1.68 heben.
   *
   * ZWEI AUSSAGEN STEHEN DESHALB HIER. Die erste haelt die heutigen Zahlen
   * fest, damit eine unbeabsichtigte Aenderung an der Formel auffaellt. Die
   * zweite ist die dauerhafte: Die Gerade darf sich vom Anker loesen, aber
   * nicht weit - hoechstens fuenfzehn Franken darunter und nie darueber.
   * Wandert sie weiter, ist das eine Preisentscheidung und keine Rechnung,
   * und dann gehoeren hier neue Zahlen hin statt eines groesseren
   * Spielraums.
   */
  const anker = [[1.0, 140], [1.5, 160], [2.0, 185], [3.0, 235]]
  const heute = [135, 155, 180, 225]

  anker.forEach(([flaeche], i) => {
    assert.equal(estimateNetChf(100, (flaeche * 10000) / 100), heute[i], `${flaeche} m²`)
  })

  for (const [flaeche, ziel] of anker) {
    const preis = estimateNetChf(100, (flaeche * 10000) / 100)
    assert.ok(preis <= ziel && preis >= ziel - 15,
      `${flaeche} m²: ${preis} liegt nicht mehr beim Anker ${ziel}`)
  }
})

pruefe('Die Selbstkosten sind Ware plus Fracht plus Einfuhrsteuer', () => {
  const ware = herstellungChf(100, 150)
  assert.equal(selbstkostenChf(100, 150),
    Math.round((ware + kostenConfig.frachtProNetzChf + einfuhrsteuerChf(ware)) * 100) / 100)
})

pruefe('Unter den Mindestpreis faellt kein Netz', () => {
  for (const [b, h] of [[30, 40], [40, 60], [50, 70], [60, 80]]) {
    assert.ok(estimateNetChf(b, h) >= 125, `${b} x ${h} kostet ${estimateNetChf(b, h)}`)
  }
  /*
   * UND ER IST DIESELBE ZAHL WIE AUF DER STARTSEITE. Was wir ankuendigen,
   * soll die Untergrenze dessen sein, was herauskommt - sonst unterbietet
   * der Rechner die eigene Ankuendigung.
   */
  assert.equal(estimateNetChf(30, 40), priceRange.minChf)
})

pruefe('Der Preis waechst gleichmaessig, ohne Knick', () => {
  /*
   * DER KNICK WAR DAS PROBLEM DER ALTEN FORMEL: Bis 1 m² wuchs der Preis um
   * 100 Franken je m², danach nur noch um 20 bis 30 - die mittleren
   * Formate sassen zu hoch auf dem Knick, die grossen zu tief darunter.
   * Eine Gerade hat ueberall denselben Zuwachs.
   */
  const punkte = [1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0]
    .map((flaeche) => ({ flaeche, preis: estimateNetChf(100, (flaeche * 10000) / 100) }))
  const schritte = punkte.slice(1).map((x, i) =>
    (x.preis - punkte[i].preis) / (x.flaeche - punkte[i].flaeche))
  const kleinster = Math.min(...schritte)
  const groesster = Math.max(...schritte)
  assert.ok(groesster - kleinster <= 12,
    `Zuwachs schwankt zwischen ${kleinster.toFixed(0)} und ${groesster.toFixed(0)} CHF je m²`)
})

pruefe('Die Marge faellt mit der Groesse, weil der Sockel sich verteilt', () => {
  /*
   * KEIN DECKEL MEHR, und er fehlt nicht aus Versehen: Die Marge faellt von
   * selbst, weil der Sockel von 65 Franken sich ueber mehr Flaeche
   * verteilt. Beim kleinsten Netz traegt der Preis ueber 75 Prozent, beim
   * groessten unter 55 - aber nie unter 40, sonst waere die Gerade zu flach.
   */
  assert.ok(margeProzent(60, 80) >= 75, `60 x 80 traegt ${margeProzent(60, 80)} Prozent`)
  assert.ok(margeProzent(250, 250) < 55, `250 x 250 traegt ${margeProzent(250, 250)} Prozent`)
  assert.ok(margeProzent(250, 250) > 40)

  let vorher = 101
  for (const [b, h] of [[60, 80], [100, 150], [140, 200], [180, 250], [250, 250]]) {
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

/* --- Der Richtwert auf der Startseite --------------------------------------- */

/*
 * DIE SPANNE IST EIN VERSPRECHEN. Sie steht auf der Seite, bevor jemand
 * Masse eintippt - und wer dann rechnet, soll keine Zahl ausserhalb davon
 * sehen. Die beiden Zahlen wissen nichts von estimate.ts; wer am Deckel
 * dreht, verschiebt die Rechnung und nicht das Versprechen. Genau das ist
 * schon passiert: Die Spanne stand auf 100 bis 200, als der Rechner laengst
 * 130 bis 360 lieferte.
 */
pruefe('Kein Format im beworbenen Feld faellt aus der beworbenen Spanne', () => {
  const draussen = []
  for (let b = 40; b <= 220; b += 5) {
    for (let h = 40; h <= 260; h += 5) {
      const flaeche = (b / 100) * (h / 100)
      if (flaeche > priceRange.maxAreaM2) continue
      const preis = estimateNetChf(b, h)
      if (preis > priceRange.maxChf) draussen.push(`${b} x ${h} kostet ${preis}`)
    }
  }
  assert.deepEqual(draussen, [],
    `ueber dem beworbenen Maximum von ${priceRange.maxChf}:\n      ${draussen.slice(0, 5).join('\n      ')}`)
})

/*
 * NACH UNTEN WIRD NUR GEWARNT, NICHT GEPRUEFT: Ein Netz, das weniger kostet
 * als angekuendigt, ist eine angenehme Ueberraschung und kein Fehler. Dass
 * die Spanne dort vorsichtig ist, steht in catalog.ts.
 */
pruefe('Das beworbene Maximum liegt nicht absurd ueber der Rechnung', () => {
  let groesster = 0
  for (let b = 40; b <= 220; b += 5) {
    for (let h = 40; h <= 260; h += 5) {
      if ((b / 100) * (h / 100) > priceRange.maxAreaM2) continue
      groesster = Math.max(groesster, estimateNetChf(b, h))
    }
  }
  assert.ok(priceRange.maxChf <= groesster * 1.25,
    `beworben bis ${priceRange.maxChf}, gerechnet hoechstens ${groesster} - die Spanne verspricht zu viel`)
})

/*
 * DIE SPANNE STAND AN ZWEI STELLEN. In priceRange, woher die Seite sie
 * nimmt - und ausgeschrieben in der Beschreibung der Startseite, die
 * Suchmaschinen lesen und die niemand von uns je wieder anschaut. Als die
 * Spanne von 100-200 auf 125-225 ging, zog nur die eine nach; die
 * vorgerenderte Seite trug beide Zahlen gleichzeitig.
 */
pruefe('Die Beschreibung der Startseite nennt dieselbe Spanne', () => {
  assert.ok(startseite.beschreibung.includes(`CHF ${priceRange.minChf}–${priceRange.maxChf}`),
    `in der Beschreibung steht: ${startseite.beschreibung}`)
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
