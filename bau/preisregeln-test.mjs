/**
 * Testlauf fuer src/lib/netzentwurf.ts und src/lib/angebot.ts – die
 * Preisregeln, die Web-Admin und App teilen.
 *
 * Hier haengt Geld dran: Ein festgelegter Preis darf beim Korrigieren einer
 * Bezeichnung nicht verschwinden, der Richtpreis (was die Kundschaft gesehen
 * hat) nicht nebenbei ueberschrieben werden, der Rabatt das Total nicht
 * unter null druecken.
 */
import assert from 'node:assert/strict'
import { ausEntwurf, leer, netzeMitPreis, netzeZumSpeichern, zuEntwurf } from '../src/lib/netzentwurf.ts'
import { angebotAenderung, angebotRechnung, angebotStart } from '../src/lib/angebot.ts'
import { gerechneterPreis } from '../src/components/admin/hilfen.ts'
import { kostenStart, kostenZumSpeichern, weitererKostenposten } from '../src/lib/kostenentwurf.ts'

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

const vorschlag = gerechneterPreis(120, 140, 'normal')
const netz = (extra = {}) => ({ id: 'n1', menge: 1, bezeichnung: 'Sondermass', detail: '', preisChf: 0, breiteCm: 120, hoeheCm: 140, rahmendicke: '1.8', netzart: 'normal', ...extra })
const bestellung = (positionen, extra = {}) => ({ id: 'b', status: 'offerte', positionen, montage: false, summeChf: 0, kunde: {}, ...extra })

/* --- Netze ---------------------------------------------------------------- */

pruefe('Rechner liefert fuer 120 × 140 einen Vorschlag', () => assert.ok(vorschlag > 0))

pruefe('Neues Netz mit Massen: Preis und Richtpreis aus dem Rechner', () => {
  const e = { ...leer(), bezeichnung: 'Küche', breiteCm: '120', hoeheCm: '140' }
  const [p] = netzeMitPreis([e], [], false)
  // Ein neues Netz startet mit den Standardwerten (Rahmendicke, Gewebe).
  const erwartet = gerechneterPreis(120, 140, e.rahmendicke, e.netzart)
  assert.ok(erwartet > 0)
  assert.equal(p.preisChf, erwartet)
  assert.equal(p.richtpreisChf, erwartet)
})

pruefe('Festgelegter Preis bleibt, wenn nur die Bezeichnung aendert', () => {
  const alt = netz({ preisChf: 185 })
  const e = { ...zuEntwurf(alt), bezeichnung: 'Küche links' }
  assert.equal(netzeMitPreis([e], [alt], false)[0].preisChf, 185)
})

pruefe('Andere Masse: neu gerechnet, der alte Preis gehoerte zu einem anderen Fenster', () => {
  const alt = netz({ preisChf: 185 })
  const e = { ...zuEntwurf(alt), breiteCm: '90' }
  assert.equal(netzeMitPreis([e], [alt], false)[0].preisChf, gerechneterPreis(90, 140, 'normal'))
})

pruefe('Katalogware: Preis aus dem Katalog, unangetastet', () => {
  const e = { ...leer(), bezeichnung: 'Bad', typId: 'bad', preisChf: '130', breiteCm: '117', hoeheCm: '82.5' }
  assert.equal(netzeMitPreis([e], [], true)[0].preisChf, 130)
})

pruefe('Kennung geht mit – sonst verloere der Server Einkauf und Richtpreis', () => {
  assert.equal(ausEntwurf(zuEntwurf(netz())).id, 'n1')
})

pruefe('Schweizer Schreibweise: 1\'234 ist keine Null; Masse auf den Millimeter', () => {
  const p = ausEntwurf({ ...leer(), bezeichnung: 'x', breiteCm: '128.64', hoeheCm: "1'000", preisChf: "1'234.50" })
  assert.equal(p.breiteCm, 128.6)
  assert.equal(p.hoeheCm, 600, 'gedeckelt bei 600 cm')
  assert.equal(p.preisChf, 1234.5)
})

pruefe('Leere Zeile faellt weg, Zeile ohne Bezeichnung ist ein Fehler', () => {
  assert.equal(netzeZumSpeichern([ausEntwurf(leer())], false).netze.length, 0)
  assert.equal(netzeZumSpeichern([ausEntwurf({ ...leer(), breiteCm: '100' })], false).fehler, 'bezeichnungFehlt')
})

/* --- Angebot -------------------------------------------------------------- */

pruefe('Vorbelegung: ohne Verkaufspreis steht der Vorschlag im Feld', () => {
  const b = bestellung([netz()])
  assert.equal(angebotStart(b).preise.n1, String(vorschlag))
})

pruefe('Anfahrt beim ersten Mal an, danach wie gespeichert', () => {
  assert.equal(angebotStart(bestellung([netz()])).anfahrt, true)
  assert.equal(angebotStart(bestellung([netz()], { preiseFestgelegtAm: '2026-11-01', anfahrt: false })).anfahrt, false)
})

pruefe('Rabatt nie hoeher als das Total', () => {
  const b = bestellung([netz({ preisChf: 100 })])
  const e = { ...angebotStart(b), preise: { n1: '100' }, montage: false, anfahrt: false, rabatt: true, rabattChf: '500' }
  const r = angebotRechnung(b, e)
  assert.equal(r.rabattSumme, 100)
  assert.equal(r.totalChf, 0)
})

pruefe('Festlegen stempelt den Richtpreis, wenn noch keiner da ist', () => {
  const b = bestellung([netz()])
  const a = angebotAenderung(b, { ...angebotStart(b), preise: { n1: '200' } }, false)
  assert.equal(a.positionen[0].preisChf, 200)
  assert.equal(a.positionen[0].richtpreisChf, vorschlag)
  assert.equal(a.preiseFestgelegt, true)
})

pruefe('Ein vorhandener Richtpreis bleibt – ausser er wird ausdruecklich ersetzt', () => {
  const b = bestellung([netz({ richtpreisChf: 99 })])
  const e = angebotStart(b)
  assert.equal(angebotAenderung(b, e, false).positionen[0].richtpreisChf, 99)
  const ersetzt = angebotAenderung(b, e, true)
  assert.equal(ersetzt.positionen[0].richtpreisChf, vorschlag)
  assert.equal(ersetzt.richtpreiseNeu, true)
})

pruefe('Ohne Rabatt kein Rabatttext', () => {
  const b = bestellung([netz({ preisChf: 100 })])
  const a = angebotAenderung(b, { ...angebotStart(b), rabatt: false, rabattText: 'Nachbarn' }, false)
  assert.equal(a.rabattText, '')
})

/* --- Kosten -------------------------------------------------------------- */

pruefe('Kosten: ohne gespeicherte Posten Schaetzung fuer Herstellung, als neu markiert', () => {
  const z = kostenStart(bestellung([netz()]))
  assert.deepEqual(z.map((k) => k.art), ['herstellung', 'lieferung', 'mwst'])
  assert.ok(z[0].neu && z[0].betragChf > 0)
})

pruefe('Kosten: Gespeichertes geht vor, weitere Posten bleiben', () => {
  const kosten = [
    { id: 'h', art: 'herstellung', betragChf: 80, traeger: 'bora', erfasstAm: '2026-11-01' },
    { id: 'w', art: 'weiteres', bezeichnung: 'Benzin', betragChf: 12, traeger: 'deniz', erfasstAm: '2026-11-01' },
  ]
  const z = kostenStart(bestellung([netz()], { kosten }))
  assert.equal(z.find((k) => k.art === 'herstellung').betragChf, 80)
  assert.ok(z.some((k) => k.bezeichnung === 'Benzin'))
})

pruefe('Kosten speichern: leere Zeilen fallen weg, Herstellung bleibt auch bei null, «neu» nicht im Datensatz', () => {
  const z = kostenStart(bestellung([netz()])).map((k) => ({ ...k, betragText: k.art === 'herstellung' ? '0' : '' }))
  const w = { ...weitererKostenposten(), bezeichnung: 'Kleber', betragText: "1'200" }
  const gespeichert = kostenZumSpeichern([...z, w])
  assert.deepEqual(gespeichert.map((k) => k.art), ['herstellung', 'weiteres'])
  assert.equal(gespeichert[1].betragChf, 1200)
  assert.ok(!('neu' in gespeichert[0]))
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length) process.exit(1)
