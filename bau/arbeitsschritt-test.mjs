/**
 * Testlauf fuer src/lib/arbeitsschritt.ts.
 *
 * Diese Funktion entscheidet, in welchem Abschnitt der Uebersicht eine
 * Bestellung landet – und damit, ob Deniz sie ueberhaupt sieht. Ein Fehler
 * hier bedeutet nicht "sieht falsch aus", sondern "eine Bestellung ist
 * verschwunden". Deshalb wird jede Kombination geprueft, die im Betrieb
 * vorkommt, und ausdruecklich auch die, die sich widersprechen.
 */
import assert from 'node:assert/strict'
import {
  BLOCK_VON,
  SCHRITTE,
  arbeitsschritt,
  bezahltAm,
  nachSchritt,
  rundeFuer,
} from '../src/lib/arbeitsschritt.ts'

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

/** Eine Bestellung mit den Feldern, die der Schritt anschaut. */
function best(felder = {}) {
  return { id: 'b1', status: 'neu', positionen: [], ...felder }
}

function runde(status, ids = ['b1'], erstellt = '2026-01-01T00:00:00.000Z') {
  return { id: 'l1', nummer: 'L-2026-01', status, bestellungIds: ids, zeilen: [], erstellt }
}

/* --- Ohne Runde: die Kundenspur allein -------------------------------------- */

pruefe('Ohne Runde entscheidet die Kundenspur', () => {
  assert.equal(arbeitsschritt(best({ status: 'neu' })), 'neu')
  assert.equal(arbeitsschritt(best({ status: 'offeriert' })), 'offerteDraussen')
  assert.equal(arbeitsschritt(best({ status: 'zugesagt' })), 'bereitZuBestellen')
  assert.equal(arbeitsschritt(best({ status: 'abgesagt' })), 'abgesagt')
})

pruefe('Eine Warenkorbbestellung startet bei "bereit zu bestellen"', () => {
  // Sie kommt mit status "zugesagt" herein: An der Kasse ist zugesagt worden.
  assert.equal(arbeitsschritt(best({ status: 'zugesagt', art: 'bestellung' })), 'bereitZuBestellen')
})

/* --- Mit Runde: die Lieferantenspur gewinnt --------------------------------- */

pruefe('Eine laufende Anfrage schlaegt die Kundenspur', () => {
  for (const status of ['neu', 'offeriert', 'zugesagt']) {
    assert.equal(arbeitsschritt(best({ status }), runde('angefragt')), 'anfrageLaeuft', status)
  }
})

pruefe('Bestellt und geliefert schlagen die Kundenspur ebenso', () => {
  for (const status of ['neu', 'offeriert', 'zugesagt']) {
    assert.equal(arbeitsschritt(best({ status }), runde('bestellt')), 'beimLieferanten', status)
    assert.equal(arbeitsschritt(best({ status }), runde('geliefert')), 'ausliefern', status)
  }
})

pruefe('Bei "Preise da" entscheidet die Kundenspur', () => {
  assert.equal(arbeitsschritt(best({ status: 'neu' }), runde('preise')), 'offerteRechnen')
  assert.equal(arbeitsschritt(best({ status: 'offeriert' }), runde('preise')), 'offerteDraussen')
  assert.equal(arbeitsschritt(best({ status: 'zugesagt' }), runde('preise')), 'bereitZuBestellen')
})

pruefe('Ein Rundenentwurf nimmt nichts aus der Arbeitsliste', () => {
  // Sonst verschwaende eine Bestellung, nur weil jemand ein Kaestchen
  // angekreuzt hat.
  assert.equal(arbeitsschritt(best({ status: 'neu' }), runde('entwurf')), 'neu')
  assert.equal(arbeitsschritt(best({ status: 'zugesagt' }), runde('entwurf')), 'bereitZuBestellen')
})

/* --- Die beiden Haken am Ende ----------------------------------------------- */

pruefe('Ausgeliefert nimmt die Bestellung aus der Ausliefer-Liste', () => {
  const b = best({ status: 'zugesagt', ausgeliefertAm: '2026-05-01T10:00:00.000Z' })
  assert.equal(arbeitsschritt(b, runde('geliefert')), 'zahlungOffen')
})

pruefe('Beide Haken heissen abgeschlossen', () => {
  const b = best({
    status: 'zugesagt',
    ausgeliefertAm: '2026-05-01T10:00:00.000Z',
    bezahltAm: '2026-05-01T10:00:00.000Z',
  })
  assert.equal(arbeitsschritt(b, runde('geliefert')), 'abgeschlossen')
})

pruefe('Eine Onlinezahlung zaehlt als bezahlt', () => {
  const bezahlung = { status: 'bezahlt', betragChf: 420, zeitpunkt: '2026-04-01T09:00:00.000Z', sitzung: 'cs_1' }
  assert.equal(bezahltAm(best({ bezahlung })), '2026-04-01T09:00:00.000Z')
  const b = best({ status: 'zugesagt', ausgeliefertAm: '2026-05-01T10:00:00.000Z', bezahlung })
  assert.equal(arbeitsschritt(b), 'abgeschlossen')
})

pruefe('Eine abgebrochene Zahlung zaehlt nicht', () => {
  const bezahlung = { status: 'abgebrochen', betragChf: 420, zeitpunkt: '2026-04-01T09:00:00.000Z', sitzung: 'cs_1' }
  assert.equal(bezahltAm(best({ bezahlung })), undefined)
  assert.equal(arbeitsschritt(best({ ausgeliefertAm: '2026-05-01T10:00:00.000Z', bezahlung })), 'zahlungOffen')
})

pruefe('Bezahlt allein schliesst nicht ab – die Ware muss raus', () => {
  const b = best({ status: 'zugesagt', bezahltAm: '2026-04-01T09:00:00.000Z' })
  assert.equal(arbeitsschritt(b, runde('geliefert')), 'ausliefern')
})

/* --- Widersprueche: was weiter hinten steht, gewinnt ------------------------- */

pruefe('Uebergeben schlaegt eine nicht nachgefuehrte Runde', () => {
  const b = best({ status: 'zugesagt', ausgeliefertAm: '2026-05-01T10:00:00.000Z' })
  assert.equal(arbeitsschritt(b, runde('bestellt')), 'zahlungOffen')
})

pruefe('Abgesagt schlaegt alles', () => {
  const b = best({ status: 'abgesagt', ausgeliefertAm: '2026-05-01T10:00:00.000Z' })
  assert.equal(arbeitsschritt(b, runde('geliefert')), 'abgesagt')
})

/* --- Die Runde heraussuchen ------------------------------------------------- */

pruefe('Ohne passende Runde kommt nichts zurueck', () => {
  assert.equal(rundeFuer(best(), []), undefined)
  assert.equal(rundeFuer(best(), [runde('bestellt', ['b2'])]), undefined)
})

pruefe('Die neuere Runde gewinnt', () => {
  const alt = { ...runde('geliefert'), id: 'alt', erstellt: '2026-01-01T00:00:00.000Z' }
  const neu = { ...runde('angefragt'), id: 'neu', erstellt: '2026-03-01T00:00:00.000Z' }
  assert.equal(rundeFuer(best(), [alt, neu]).id, 'neu')
  // Reihenfolge der Liste darf nichts aendern.
  assert.equal(rundeFuer(best(), [neu, alt]).id, 'neu')
})

/* --- Bloecke und Gruppierung ------------------------------------------------ */

pruefe('Jeder Schritt hat genau einen Block', () => {
  for (const schritt of SCHRITTE) {
    assert.ok(BLOCK_VON[schritt], `Block fehlt fuer ${schritt}`)
  }
  assert.equal(Object.keys(BLOCK_VON).length, SCHRITTE.length)
})

pruefe('Warten hat keinen Knopf – die Bloecke stimmen', () => {
  assert.equal(BLOCK_VON.anfrageLaeuft, 'beimLieferanten')
  assert.equal(BLOCK_VON.beimLieferanten, 'beimLieferanten')
  assert.equal(BLOCK_VON.offerteDraussen, 'beimKunden')
  assert.equal(BLOCK_VON.neu, 'beiDir')
  assert.equal(BLOCK_VON.ausliefern, 'beiDir')
  assert.equal(BLOCK_VON.zahlungOffen, 'beiDir')
})

pruefe('Gruppieren verliert keine Bestellung', () => {
  const bestellungen = [
    best({ id: 'a', status: 'neu' }),
    best({ id: 'b', status: 'offeriert' }),
    best({ id: 'c', status: 'zugesagt' }),
    best({ id: 'd', status: 'abgesagt' }),
    best({ id: 'e', status: 'zugesagt' }),
  ]
  const gruppen = nachSchritt(bestellungen, [runde('bestellt', ['e'])])
  const summe = [...gruppen.values()].reduce((n, liste) => n + liste.length, 0)
  assert.equal(summe, bestellungen.length)
  assert.deepEqual(
    gruppen.get('beimLieferanten').map((b) => b.id),
    ['e'],
  )
  assert.deepEqual(
    gruppen.get('bereitZuBestellen').map((b) => b.id),
    ['c'],
  )
})

pruefe('Jeder Schritt taucht als Gruppe auf, auch leer', () => {
  const gruppen = nachSchritt([], [])
  for (const schritt of SCHRITTE) {
    assert.deepEqual(gruppen.get(schritt), [], schritt)
  }
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
