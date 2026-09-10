/**
 * Testlauf fuer src/lib/phasen.ts und api/_phasen.ts.
 *
 * Der wichtigste Teil ist die Abbildung ALTER Statuswerte: Drei Generationen
 * liegen im produktiven Speicher, und jede muss in der richtigen Phase
 * landen – ohne dass ein Feld verloren geht. Ein Fehler hier heisst nicht
 * "sieht falsch aus", sondern "eine echte Bestellung steht im falschen
 * Abschnitt und wird uebersehen".
 */
import assert from 'node:assert/strict'
import {
  PHASEN,
  abgeschlossen,
  abschnittFuer,
  bezahltAm,
  nachAbschnitt,
  naechstePhase,
  ohneEinkauf,
  phaseNachWiederoeffnen,
  restbetragChf,
  zahlungAusstehend,
} from '../src/lib/phasen.ts'
import { PHASEN as PHASEN_API, phaseVon, startPhase, vereinheitlichen } from '../api/_phasen.ts'

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

const best = (felder = {}) => ({
  id: 'b1',
  art: 'anfrage',
  status: 'neu',
  positionen: [{ id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 150 }],
  summeChf: 150,
  zahlung: 'uebergabe',
  eingang: '2026-01-01T00:00:00.000Z',
  geaendert: '2026-01-05T00:00:00.000Z',
  ...felder,
})
const runde = (status, ids = ['b1']) => ({ status, bestellungIds: ids, erstellt: '2026-01-02T00:00:00.000Z' })

/* --- Beide Fassungen bleiben gleich ---------------------------------------- */

pruefe('PHASEN sind auf beiden Seiten dieselben', () => {
  assert.deepEqual([...PHASEN, 'abgesagt'], PHASEN_API)
})

pruefe('Katalogware startet bei "bestellen", alles andere bei "neu"', () => {
  assert.equal(startPhase('bestellung'), 'bestellen')
  assert.equal(startPhase('anfrage'), 'neu')
  assert.equal(startPhase('zahlung'), 'neu')
  assert.equal(startPhase(undefined), 'neu')
})

/* --- Abbildung alter Werte: die Generation von gestern --------------------- */

pruefe('Gestern: neu ohne Runde bleibt neu, mit Aufmass wird es klaerung', () => {
  assert.equal(phaseVon(best({ status: 'neu' }), []), 'neu')
  assert.equal(phaseVon(best({ status: 'neu', ausgemessenAm: 'x' }), []), 'klaerung')
})

pruefe('Gestern: neu in einer Runde folgt der Runde', () => {
  assert.equal(phaseVon(best({ status: 'neu' }), [runde('entwurf')]), 'kosten')
  assert.equal(phaseVon(best({ status: 'neu' }), [runde('angefragt')]), 'kosten')
  assert.equal(phaseVon(best({ status: 'neu' }), [runde('preise')]), 'offerte')
  assert.equal(phaseVon(best({ status: 'neu' }), [runde('bestellt')]), 'bestellen')
  assert.equal(phaseVon(best({ status: 'neu' }), [runde('geliefert')]), 'ausliefern')
})

pruefe('Gestern: offeriert wird offerte, zugesagt wird bestellen', () => {
  assert.equal(phaseVon(best({ status: 'offeriert' }), []), 'offerte')
  assert.equal(phaseVon(best({ status: 'zugesagt' }), []), 'bestellen')
  assert.equal(phaseVon(best({ status: 'zugesagt' }), [runde('geliefert')]), 'ausliefern')
  assert.equal(phaseVon(best({ status: 'abgesagt' }), []), 'abgesagt')
})

pruefe('Gestern: Katalogware unter "neu" war nie in Phase 1', () => {
  // Vor gestern startete auch der Warenkorb bei "neu".
  assert.equal(phaseVon(best({ status: 'neu', art: 'bestellung' }), []), 'bestellen')
  assert.equal(phaseVon(best({ status: 'neu', art: 'bestellung' }), [runde('geliefert')]), 'ausliefern')
})

/* --- Abbildung alter Werte: die ganz alte Generation ------------------------ */

pruefe('Ganz alt: offerte entscheidet sich am Haken und an der Runde', () => {
  assert.equal(phaseVon(best({ status: 'offerte', offerteAm: 'x' }), []), 'offerte')
  assert.equal(phaseVon(best({ status: 'offerte' }), []), 'neu')
  assert.equal(phaseVon(best({ status: 'offerte', ausgemessenAm: 'x' }), []), 'klaerung')
  assert.equal(phaseVon(best({ status: 'offerte' }), [runde('angefragt')]), 'kosten')
  assert.equal(phaseVon(best({ status: 'offerte' }), [runde('preise')]), 'offerte')
})

pruefe('Heutiges "offerte" bleibt offerte – erkennbar am Stempel, nicht an der Runde', () => {
  // Die Kosten kamen von Hand (einkaufAm), nicht aus einer Runde: kein
  // Grund, die Bestellung fuer eine uralte zu halten und nach "neu" zu schieben.
  assert.equal(phaseVon(best({ status: 'offerte', phaseSeit: '2026-09-01T00:00:00.000Z' }), []), 'offerte')
  assert.equal(phaseVon(best({ status: 'offerte', einkaufAm: '2026-09-01T00:00:00.000Z' }), []), 'offerte')
  const bepreist = best({ status: 'offerte', positionen: [{ id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 150, einkaufChf: 40 }] })
  assert.equal(phaseVon(bepreist, []), 'offerte')
})

pruefe('Ganz alt: bestellt, erledigt, geloescht', () => {
  assert.equal(phaseVon(best({ status: 'bestellt' }), []), 'bestellen')
  assert.equal(phaseVon(best({ status: 'erledigt' }), []), 'ausliefern')
  assert.equal(phaseVon(best({ status: 'geloescht' }), []), 'abgesagt')
})

pruefe('vereinheitlichen gibt dasselbe Objekt zurueck, wenn nichts zu tun ist', () => {
  const b = best({ status: 'kosten' })
  assert.equal(vereinheitlichen(b, []), b)
})

pruefe('vereinheitlichen loescht kein Feld und ueberschreibt nur den Status', () => {
  const b = best({ status: 'zugesagt', notiz: 'bleibt', ausgemessenAm: 'x', offerteAm: 'y' })
  const v = vereinheitlichen(b, [])
  assert.equal(v.status, 'bestellen')
  assert.equal(v.notiz, 'bleibt')
  assert.equal(v.ausgemessenAm, 'x')
  assert.equal(v.offerteAm, 'y')
  assert.equal(b.status, 'zugesagt', 'das Original wurde veraendert')
})

pruefe('Ganz alt: erledigt wird zu ausliefern MIT beiden Haken', () => {
  const v = vereinheitlichen(best({ status: 'erledigt' }), [])
  assert.equal(v.status, 'ausliefern')
  assert.equal(v.ausgeliefertAm, '2026-01-05T00:00:00.000Z')
  assert.equal(v.bezahltAm, '2026-01-05T00:00:00.000Z')
  assert.equal(abgeschlossen(v), true)
})

pruefe('Die neueste Runde gewinnt', () => {
  const alt = { ...runde('geliefert'), erstellt: '2026-01-01T00:00:00.000Z' }
  const neu = { ...runde('angefragt'), erstellt: '2026-03-01T00:00:00.000Z' }
  assert.equal(phaseVon(best({ status: 'neu' }), [alt, neu]), 'kosten')
  assert.equal(phaseVon(best({ status: 'neu' }), [neu, alt]), 'kosten')
})

/* --- Bezahlt, abgeschlossen, Abschnitte ------------------------------------- */

pruefe('Stripe zaehlt nur, wenn der Betrag die Summe noch deckt', () => {
  const bezahlung = { status: 'bezahlt', betragChf: 150, zeitpunkt: 'z', sitzung: 's' }
  assert.equal(bezahltAm(best({ bezahlung })), 'z')
  // Netze nach der Zahlung teurer geworden: nicht mehr bezahlt, Rest sichtbar.
  const teurer = best({ bezahlung, summeChf: 200 })
  assert.equal(bezahltAm(teurer), undefined)
  assert.equal(restbetragChf(teurer), 50)
  // Rappenrundung darf nicht kippen.
  assert.equal(bezahltAm(best({ bezahlung: { ...bezahlung, betragChf: 149.999 } })), 'z')
})

pruefe('Abgeschlossen nur in der letzten Phase mit beiden Haken', () => {
  assert.equal(abgeschlossen(best({ status: 'ausliefern', ausgeliefertAm: 'a', bezahltAm: 'b' })), true)
  assert.equal(abgeschlossen(best({ status: 'ausliefern', ausgeliefertAm: 'a' })), false)
  assert.equal(abgeschlossen(best({ status: 'bestellen', ausgeliefertAm: 'a', bezahltAm: 'b' })), false)
})

pruefe('Zahlung ausstehend: online gewaehlt, nichts eingegangen', () => {
  assert.equal(zahlungAusstehend(best({ zahlung: 'online' })), true)
  assert.equal(zahlungAusstehend(best({ zahlung: 'online', bezahlung: { status: 'abgebrochen', betragChf: 0, zeitpunkt: 'z', sitzung: 's' } })), true)
  assert.equal(zahlungAusstehend(best({ zahlung: 'online', bezahlung: { status: 'bezahlt', betragChf: 150, zeitpunkt: 'z', sitzung: 's' } })), false)
  assert.equal(zahlungAusstehend(best({ zahlung: 'uebergabe' })), false)
})

pruefe('Abschnitt: Phasen bleiben, abgesagt und abgeschlossen gehen ins Archiv', () => {
  for (const p of PHASEN) assert.equal(abschnittFuer(best({ status: p })), p)
  assert.equal(abschnittFuer(best({ status: 'abgesagt' })), 'archiv')
  assert.equal(abschnittFuer(best({ status: 'ausliefern', ausgeliefertAm: 'a', bezahltAm: 'b' })), 'archiv')
})

pruefe('Gruppieren verliert keine Bestellung und kennt jeden Abschnitt', () => {
  const liste = [best({ id: 'a', status: 'neu' }), best({ id: 'b', status: 'kosten' }), best({ id: 'c', status: 'abgesagt' })]
  const g = nachAbschnitt(liste)
  assert.equal([...g.values()].reduce((n, l) => n + l.length, 0), 3)
  assert.deepEqual([...g.keys()], [...PHASEN, 'archiv'])
})

pruefe('Naechste Phase folgt der Reihenfolge und endet nach ausliefern', () => {
  assert.equal(naechstePhase('neu'), 'klaerung')
  assert.equal(naechstePhase('offerte'), 'bestellen')
  assert.equal(naechstePhase('ausliefern'), undefined)
  assert.equal(naechstePhase('abgesagt'), undefined)
})

pruefe('Wiederoeffnen fuehrt dorthin, wo die Bestellung war', () => {
  assert.equal(phaseNachWiederoeffnen(best({ status: 'abgesagt' })), 'neu')
  assert.equal(phaseNachWiederoeffnen(best({ status: 'abgesagt', ausgemessenAm: 'x' })), 'klaerung')
  assert.equal(phaseNachWiederoeffnen(best({ status: 'abgesagt', einkaufAusRunde: 'L-1' })), 'kosten')
  const bepreist = best({ status: 'abgesagt', positionen: [{ id: 'p1', menge: 1, bezeichnung: 'A', detail: '', preisChf: 150, einkaufChf: 40 }] })
  assert.equal(phaseNachWiederoeffnen(bepreist), 'offerte')
  assert.equal(phaseNachWiederoeffnen(best({ status: 'abgesagt', offerteAm: 'x' })), 'offerte')
  assert.equal(phaseNachWiederoeffnen(best({ status: 'abgesagt', zusageAm: 'x' })), 'bestellen')
  assert.equal(phaseNachWiederoeffnen(best({ status: 'abgesagt', art: 'bestellung' })), 'bestellen')
  assert.equal(ohneEinkauf(bepreist), 0)
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
