/**
 * Testlauf fuer api/lieferungen.ts und die Margenrechnung.
 *
 * Aufruf: npm test
 *
 * Drei Dinge muessen stimmen, und keines davon faellt am Bildschirm auf:
 *
 *  - DIE ZEILEN SIND AB DEM VERSAND EINGEFROREN. Bora traegt seine Preise mit
 *    Bezug auf die laufende Nummer ein. Verschiebt sich die Nummerierung
 *    danach, landen seine Preise am falschen Netz.
 *  - DER UEBERGANG NACH "BESTELLT" ZIEHT DIE BESTELLUNGEN MIT, aber er darf
 *    keinen Status ueberschreiben, den jemand schon weitergesetzt hat.
 *  - DIE MARGE RECHNET DIE MONTAGE NICHT ZUM ERLOES. Sie ist unsere Arbeit,
 *    nicht Ware; wer sie mitrechnet, sieht eine Marge, die es nicht gibt.
 */
import assert from 'node:assert/strict'

const tabellen = new Map()

function befehlAusfuehren(teile) {
  const [befehl, schluessel, ...rest] = teile
  const tabelle = tabellen.get(schluessel) ?? new Map()
  tabellen.set(schluessel, tabelle)
  switch (befehl) {
    case 'HSET':
      tabelle.set(rest[0], rest[1])
      return 1
    case 'HGET':
      return tabelle.get(rest[0]) ?? null
    case 'HGETALL': {
      const flach = []
      for (const [feld, wert] of tabelle) flach.push(feld, wert)
      return flach
    }
    case 'HDEL':
      return tabelle.delete(rest[0]) ? 1 : 0
    default:
      return 1
  }
}

globalThis.fetch = async (_url, optionen) =>
  new Response(JSON.stringify({ result: befehlAusfuehren(JSON.parse(optionen.body)) }), { status: 200 })

const { default: handler } = await import('../api/lieferungen.ts')
const { default: bestellHandler } = await import('../api/bestellungen.ts')
const { rechne, lieferkosten } = await import('../src/lib/lieferung.ts')

function antwortAttrappe() {
  const a = { code: 0, daten: null, koepfe: {} }
  a.status = (c) => ((a.code = c), a)
  a.json = (d) => ((a.daten = d), a)
  a.setHeader = (n, w) => ((a.koepfe[n] = w), a)
  return a
}

async function ruf(h, { method = 'GET', aktion = '', body, cookie }) {
  const a = antwortAttrappe()
  await h({ method, query: aktion ? { aktion } : {}, body, headers: { cookie } }, a)
  return a
}

let bestanden = 0
const fehler = []

async function pruefe(name, lauf) {
  try {
    await lauf()
    bestanden++
    console.log(`ok    ${name}`)
  } catch (f) {
    fehler.push(`${name}: ${f.message}`)
    console.log(`FEHLT ${name}\n      ${f.message.split('\n')[0]}`)
  }
}

/* --- Anmelden und zwei Bestellungen anlegen -------------------------------- */

let cookie
const a = await ruf(bestellHandler, { method: 'POST', aktion: 'anmelden', body: { passwort: 'testpasswort' } })
cookie = a.koepfe['Set-Cookie'].split(';')[0]

async function bestellungAnlegen(referenz, summeChf, montageChf) {
  const antwort = await ruf(bestellHandler, {
    method: 'POST',
    aktion: 'erfassen',
    cookie,
    body: {
      art: 'bestellung',
      referenz,
      kunde: { name: 'Test ' + referenz, telefon: '079 000 00 00' },
      positionen: [{ menge: 1, bezeichnung: 'Zimmer', breiteCm: 120, hoeheCm: 180, preisChf: summeChf - montageChf }],
      montage: montageChf > 0,
      montageChf,
    },
  })
  return antwort.daten.bestellung
}

const b1 = await bestellungAnlegen('PF-1', 165, 15)
const b2 = await bestellungAnlegen('PF-2', 165, 15)

/* --- Anmeldung ------------------------------------------------------------- */

await pruefe('Ohne Anmeldung geht gar nichts', async () => {
  assert.equal((await ruf(handler, { method: 'GET' })).code, 401)
  assert.equal((await ruf(handler, { method: 'POST', body: { bestellungIds: [b1.id] } })).code, 401)
})

/* --- Anlegen --------------------------------------------------------------- */

let runde
await pruefe('Eine Runde bekommt eine Nummer und beginnt als Entwurf', async () => {
  const antwort = await ruf(handler, { method: 'POST', cookie, body: { bestellungIds: [b1.id, b2.id] } })
  assert.equal(antwort.code, 201)
  runde = antwort.daten.lieferung
  assert.equal(runde.status, 'entwurf')
  assert.match(runde.nummer, /^L-\d{4}-01$/)
  assert.equal(runde.zeilen.length, 0, 'im Entwurf sind die Zeilen noch nicht eingefroren')
})

await pruefe('Die naechste Runde zaehlt weiter', async () => {
  const antwort = await ruf(handler, { method: 'POST', cookie, body: { bestellungIds: [b1.id] } })
  assert.match(antwort.daten.lieferung.nummer, /^L-\d{4}-02$/)
  await ruf(handler, { method: 'DELETE', cookie, body: { id: antwort.daten.lieferung.id } })
})

await pruefe('Eine Runde ohne Bestellungen wird abgewiesen', async () => {
  assert.equal((await ruf(handler, { method: 'POST', cookie, body: { bestellungIds: [] } })).code, 400)
})

/* --- Einfrieren ------------------------------------------------------------ */

await pruefe('Die Zeilen lassen sich einfrieren', async () => {
  const zeilen = [
    { nummer: 1, kennung: 'PF-1', bezeichnung: 'Zimmer', breiteCm: 120, hoeheCm: 180 },
    { nummer: 2, kennung: 'PF-2', bezeichnung: 'Zimmer', breiteCm: 120, hoeheCm: 180 },
  ]
  const antwort = await ruf(handler, { method: 'PATCH', cookie, body: { id: runde.id, status: 'angefragt', zeilen } })
  assert.equal(antwort.code, 200)
  runde = antwort.daten.lieferung
  assert.equal(runde.zeilen.length, 2)
  assert.equal(runde.zeilen[0].nummer, 1)
})

await pruefe('Nummer, Anlagezeitpunkt und Id bleiben unveraenderbar', async () => {
  const antwort = await ruf(handler, {
    method: 'PATCH',
    cookie,
    body: { id: runde.id, nummer: 'GEFAELSCHT', erstellt: '1999-01-01T00:00:00.000Z', termin: 'Ende Oktober' },
  })
  assert.equal(antwort.daten.lieferung.nummer, runde.nummer)
  assert.equal(antwort.daten.lieferung.erstellt, runde.erstellt)
  assert.equal(antwort.daten.lieferung.termin, 'Ende Oktober')
})

await pruefe('Preise landen an der Zeile', async () => {
  const zeilen = runde.zeilen.map((z, i) => ({ ...z, einkaufChf: i === 0 ? 42.5 : 40 }))
  const antwort = await ruf(handler, { method: 'PATCH', cookie, body: { id: runde.id, status: 'preise', zeilen } })
  runde = antwort.daten.lieferung
  assert.equal(runde.zeilen[0].einkaufChf, 42.5)
})

/* --- Der Uebergang nach "bestellt" ----------------------------------------- */

await pruefe('"Bestellt" zieht die Bestellungen mit', async () => {
  const antwort = await ruf(handler, { method: 'PATCH', cookie, body: { id: runde.id, status: 'bestellt' } })
  assert.equal(antwort.daten.mitgezogen, 2)
  const liste = (await ruf(bestellHandler, { method: 'GET', cookie })).daten.bestellungen
  assert.ok(liste.filter((b) => [b1.id, b2.id].includes(b.id)).every((b) => b.status === 'bestellt'))
})

await pruefe('Ein schon erledigter Eintrag wird NICHT zurueckgesetzt', async () => {
  // Sonst wuerde eine laengst ausgelieferte Bestellung wieder als offen gelten.
  await ruf(bestellHandler, { method: 'PATCH', cookie, body: { id: b1.id, status: 'erledigt' } })
  const antwort = await ruf(handler, { method: 'PATCH', cookie, body: { id: runde.id, status: 'bestellt' } })
  assert.equal(antwort.daten.mitgezogen, 0, 'es wurde etwas ueberschrieben')
  const liste = (await ruf(bestellHandler, { method: 'GET', cookie })).daten.bestellungen
  assert.equal(liste.find((b) => b.id === b1.id).status, 'erledigt')
})

/* --- Die Rechnung ---------------------------------------------------------- */

const bestellungen = (await ruf(bestellHandler, { method: 'GET', cookie })).daten.bestellungen

await pruefe('Die Montage zaehlt NICHT zum Warenerloes', () => {
  // Zwei Bestellungen zu je 165, davon 15 Montage: 300 Ware.
  const r = rechne(runde, bestellungen)
  assert.equal(r.warenerloesChf, 300, 'die Montage ist im Erloes gelandet')
})

await pruefe('Einsatz und Marge stimmen', () => {
  const mitFracht = { ...runde, lieferkostenChf: 60 }
  const r = rechne(mitFracht, bestellungen)
  assert.equal(r.einkaufChf, 82.5)
  assert.equal(r.einsatzChf, 142.5)
  assert.equal(r.margeChf, 157.5)
  assert.equal(r.einsatzJeNetzChf, 71.25)
})

await pruefe('Fehlende Einkaufspreise werden gezaehlt, nicht geschaetzt', () => {
  const luecke = { ...runde, zeilen: [{ ...runde.zeilen[0] }, { ...runde.zeilen[1], einkaufChf: undefined }] }
  const r = rechne(luecke, bestellungen)
  assert.equal(r.zeilenOhnePreis, 1)
  assert.equal(r.einkaufChf, 42.5, 'die fehlende Zeile wurde hochgerechnet')
})

await pruefe('Der Gesamtbetrag der Fracht gilt vor den Einzelbetraegen', () => {
  const beides = { ...runde, lieferkostenJePaket: { 'PF-1': 30, 'PF-2': 30 }, lieferkostenChf: 50 }
  const f = lieferkosten(beides)
  assert.equal(f.betrag, 50, 'es wurde doppelt gezaehlt')
  assert.equal(f.doppelt, true, 'die Doppelangabe wird nicht gemeldet')
})

await pruefe('Ohne Gesamtbetrag zaehlen die Einzelbetraege zusammen', () => {
  const jePaket = { ...runde, lieferkostenJePaket: { 'PF-1': 30, 'PF-2': 25 } }
  assert.equal(lieferkosten(jePaket).betrag, 55)
  assert.equal(lieferkosten(jePaket).doppelt, false)
})

/* --- Loeschen -------------------------------------------------------------- */

await pruefe('Eine Runde laesst sich loeschen', async () => {
  assert.equal((await ruf(handler, { method: 'DELETE', cookie, body: { id: runde.id } })).code, 200)
  assert.equal((await ruf(handler, { method: 'GET', cookie })).daten.lieferungen.length, 0)
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
