/**
 * Testlauf fuer src/lib/nachrichten.ts – die Vorlagen A bis I.
 *
 * Festgehalten wird, was nicht still kippen darf: welche Vorlage in welcher
 * Phase empfohlen ist, dass Offerten erst mit festgelegten Preisen rausgehen,
 * welcher Schritt nach "Gesendet?" folgt, und dass Links und Umlaute in
 * WhatsApp und Mail heil ankommen.
 */
import assert from 'node:assert/strict'
import { mailLink, nachfassenAb, nachfassenFaellig, nachricht, offerteLink, vorlagenFuer, whatsappLink } from '../src/lib/nachrichten.ts'

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

const TAG = 86_400_000
const jetzt = Date.parse('2026-11-06T10:00:00Z')
const vor = (tage) => new Date(jetzt - tage * TAG).toISOString()
const netz = { menge: 2, bezeichnung: 'Küche', detail: '', preisChf: 150, breiteCm: 100, hoeheCm: 120 }
const auftrag = (status, extra = {}) => ({
  id: 'x1', referenz: 'PF-D004', art: 'anfrage', status, quelle: 'whatsapp', eingang: vor(20), geaendert: vor(1), phaseSeit: vor(1),
  kunde: { name: 'Anita Lüthi', email: 'a@example.ch', telefon: '079 000 00 00', strasse: '', plz: '', ort: '', bemerkung: '' },
  positionen: [netz], montage: false, zahlung: 'uebergabe', zahlungswunsch: false, summeChf: 300, ...extra,
})
const empfohlen = (b) => vorlagenFuer(b, jetzt).find((v) => v.empfohlen)?.id

pruefe('Empfohlen je Phase: A, B, E, F/G, H, I', () => {
  assert.equal(empfohlen(auftrag('neu')), 'A')
  assert.equal(empfohlen(auftrag('offerte', { preiseFestgelegtAm: vor(1) })), 'B')
  assert.equal(empfohlen(auftrag('bestellen')), 'E')
  assert.equal(empfohlen(auftrag('bora')), 'F')
  assert.equal(empfohlen(auftrag('bora', { versandAm: vor(2) })), 'G')
  assert.equal(empfohlen(auftrag('ausliefern')), 'H')
  assert.equal(empfohlen(auftrag('ausliefern', { ausgeliefertAm: vor(1), bezahltAm: vor(1) })), 'I')
})

pruefe('Ohne festgelegte Preise keine Offerte', () => {
  const v = vorlagenFuer(auftrag('offerte'), jetzt)
  assert.ok(v.every((x) => x.gesperrt))
  assert.equal(empfohlen(auftrag('offerte')), undefined)
})

pruefe('Nachfassen erst nach 5 Tagen, und das Nachfassen setzt die Frist neu', () => {
  assert.equal(nachfassenFaellig(auftrag('zusage', { offerteAm: vor(4) }), jetzt), false)
  assert.equal(nachfassenFaellig(auftrag('zusage', { offerteAm: vor(5) }), jetzt), true)
  assert.equal(empfohlen(auftrag('zusage', { offerteAm: vor(6) })), 'C')
  const nachgefasst = auftrag('zusage', { offerteAm: vor(9), nachgefasstAm: vor(2) })
  assert.equal(nachfassenAb(nachgefasst), vor(2))
  assert.equal(nachfassenFaellig(nachgefasst, jetzt), false)
  assert.deepEqual(nachricht(nachgefasst, 'C').danach, { nachgefasst: true })
})

pruefe('Quittung erst nach Uebergabe und Zahlung', () => {
  const i = vorlagenFuer(auftrag('ausliefern', { ausgeliefertAm: vor(1) }), jetzt).find((v) => v.id === 'I')
  assert.ok(i.gesperrt)
})

pruefe('Schritte nach "Gesendet?" wie die Knoepfe', () => {
  assert.deepEqual(nachricht(auftrag('neu'), 'A').danach, { status: 'klaerung' })
  assert.equal(nachricht(auftrag('klaerung'), 'A').danach, null)
  assert.deepEqual(nachricht(auftrag('offerte'), 'B').danach, { status: 'zusage', offerteVersendet: true })
  assert.deepEqual(nachricht(auftrag('bestellen'), 'E').danach, { status: 'bora', bestellt: true })
  assert.equal(nachricht(auftrag('bestellen', { paket: 'P-1' }), 'E').danach, null, 'Pakete gehen ueber den Talon')
  assert.deepEqual(nachricht(auftrag('bora'), 'G').danach, { status: 'ausliefern' })
  assert.equal(nachricht(auftrag('ausliefern'), 'I').danach, null)
})

pruefe('Offerte: Link, Anzahl, Total und Gueltigkeit im Text', () => {
  const link = offerteLink('abc_DEF-123456789012345')
  assert.equal(link, 'https://pfistanbul.ch/offerte/abc_DEF-123456789012345')
  const m = nachricht(auftrag('offerte'), 'B', { link })
  assert.ok(m.mitLink)
  assert.ok(m.text.startsWith('Guten Tag Anita Lüthi'))
  assert.ok(m.text.includes(link))
  assert.ok(m.text.includes('2 Plissees'))
  assert.match(m.text, /300\.00/)
  assert.ok(m.text.includes('30 Tage'))
  assert.ok(m.betreff.includes('PF-D004'))
})

pruefe('Ohne Link steht ein sichtbarer Platzhalter', () => {
  assert.ok(nachricht(auftrag('offerte'), 'B').text.includes('[Link zur Offerte]'))
})

pruefe('Abschluss: Quittung und Bewertungslink', () => {
  const m = nachricht(auftrag('ausliefern'), 'I', { link: 'https://pfistanbul.ch/offerte/x' })
  assert.ok(m.text.includes('https://pfistanbul.ch/bewerten'))
  assert.ok(m.text.includes('/offerte/x'))
})

pruefe('Montage oder Uebergabe – je nach Auftrag', () => {
  assert.ok(nachricht(auftrag('bora'), 'G').text.includes('Übergabe'))
  assert.ok(nachricht(auftrag('bora', { montage: true }), 'G').text.includes('Montage'))
  assert.ok(nachricht(auftrag('ausliefern', { montageTermin: '2026-11-12' }), 'H').text.includes('12. November'))
})

pruefe('WhatsApp und Mail: Text und Betreff kodiert, Umlaute heil', () => {
  const w = whatsappLink('41790000000', 'Grüsse & Dank\nZeile 2')
  assert.equal(w, 'https://wa.me/41790000000?text=Gr%C3%BCsse%20%26%20Dank%0AZeile%202')
  assert.equal(decodeURIComponent(new URL(w).searchParams.get('text')), 'Grüsse & Dank\nZeile 2')
  assert.equal(whatsappLink(null, 'x'), null)
  const m = mailLink(' a@example.ch ', 'Ihre Offerte', 'Text & mehr')
  assert.equal(m, 'mailto:a@example.ch?subject=Ihre%20Offerte&body=Text%20%26%20mehr')
  assert.equal(mailLink('', 'x', 'y'), null)
})

console.log(`\n${bestanden} bestanden, ${fehler.length} fehlgeschlagen`)
if (fehler.length) process.exit(1)
