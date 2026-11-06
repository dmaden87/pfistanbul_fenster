/**
 * Testlauf fuer src/lib/aktionen.ts – welcher Knopf in welcher Phase.
 *
 * Die Tabelle steuert Web-Admin UND App. Aendert sich ein Schritt hier,
 * aendert er sich in beiden; dieser Test haelt fest, was gilt.
 */
import assert from 'node:assert/strict'
import { knoepfe, ABSAGE_GRUENDE } from '../src/lib/aktionen.ts'
import { texteFuer } from '../src/components/admin/sprache.ts'

const t = texteFuer('deutsch')
let bestanden = 0
const fehler = []
function pruefe(name, lauf) {
  try {
    lauf()
    bestanden++
    console.log(`ok    ${name}`)
  } catch (f) {
    fehler.push(name)
    console.log(`FEHLT ${name}\n      ${f.message.split('\n')[0]}`)
  }
}

const netz = { menge: 1, bezeichnung: 'Sondermass', detail: '', preisChf: 150, breiteCm: 100, hoeheCm: 120, rahmendicke: '1.5', netzart: 'normal', rahmenfarbe: 'weiss', netzfarbe: 'grau', mechanismus: 'plissee', oeffnung: 'nach-links' }
const auftrag = (status, extra = {}) => ({
  id: 'x', referenz: 'P-1', art: 'anfrage', status, quelle: 'whatsapp', eingang: '2026-11-01', geaendert: '2026-11-02',
  kunde: { name: 'Test', email: '', telefon: '079 000 00 00', strasse: '', plz: '', ort: '', bemerkung: '' },
  positionen: [netz], montage: false, zahlung: 'uebergabe', zahlungswunsch: false, summeChf: 150, ...extra,
})
const haupt = (liste) => liste.filter((k) => k.art === 'haupt')
const tat = (liste, text) => liste.find((k) => k.text === text)?.tat

pruefe('Neu: annehmen fuehrt in die Klaerung', () => {
  assert.deepEqual(haupt(knoepfe(auftrag('neu'), 'neu', t, false))[0].tat, { status: 'klaerung' })
})

pruefe('Neu, Katalogware aus dem Webshop: direkt zum Bestellen, mit Zusage', () => {
  const k = knoepfe(auftrag('neu', { art: 'bestellung', quelle: 'web' }), 'neu', t, false)
  assert.deepEqual(haupt(k)[0].tat, { status: 'bestellen', zusage: true })
})

pruefe('Klaerung ohne Netze: Weg zum Angebot gesperrt, mit Grund', () => {
  const k = knoepfe(auftrag('klaerung', { positionen: [] }), 'klaerung', t, false)
  assert.ok(haupt(k)[0].gesperrt)
})

pruefe('Angebot erstellen: «Offerte ist raus» setzt Warten auf Zusage und stempelt den Versand', () => {
  const k = knoepfe(auftrag('offerte'), 'offerte', t, false)
  assert.deepEqual(tat(k, t.knopfOfferteRaus), { status: 'zusage', offerteVersendet: true })
})

pruefe('Warten auf Zusage: Hauptknopf ist die Zusage, mit Stempel', () => {
  assert.deepEqual(haupt(knoepfe(auftrag('zusage'), 'zusage', t, false))[0].tat, { status: 'bestellen', zusage: true })
})

pruefe('Bereit zum Bestellen: «bei Bora bestellt» ist ein eigener Schritt (ganzes Paket)', () => {
  assert.equal(haupt(knoepfe(auftrag('bestellen'), 'bestellen', t, false))[0].tat, 'boraBestellt')
})

pruefe('Ausliefern, weder uebergeben noch bezahlt: beides auf einmal', () => {
  assert.deepEqual(haupt(knoepfe(auftrag('ausliefern'), 'ausliefern', t, false))[0].tat, { ausgeliefert: true, bezahlt: true })
})

pruefe('Absagen gibt es in jeder aktiven Phase', () => {
  for (const p of ['neu', 'klaerung', 'offerte', 'zusage', 'bestellen', 'bora', 'ausliefern']) {
    assert.ok(knoepfe(auftrag(p), p, t, false).some((k) => k.tat === 'absagen'), p)
  }
})

pruefe('Abgesagt: wieder oeffnen, nicht absagen', () => {
  const k = knoepfe(auftrag('abgesagt', { absageGrund: 'spam' }), 'archiv', t, false)
  assert.ok(!k.some((x) => x.tat === 'absagen'))
  assert.equal(k.length, 1)
})

pruefe('Sechs Absagegruende', () => assert.equal(ABSAGE_GRUENDE.length, 6))

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length) process.exit(1)
