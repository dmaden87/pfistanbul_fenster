/**
 * Testlauf fuer api/auslagen.ts.
 *
 * Hier haengt Geld dran, das spaeter jemandem zurueckgezahlt wird. Zwei
 * Stellen sind still gefaehrlich:
 *
 *  - Ohne Anmeldung darf nichts herein und nichts heraus. Die Auslagen sagen,
 *    wer wem was schuldet; das geht niemanden sonst etwas an.
 *  - Beim Aendern darf ein Haken am Bezahlt-Feld nicht nebenbei den Betrag
 *    oder den Traeger loeschen. Genau das passiert, wenn man das Alte nicht
 *    als Grundlage nimmt.
 *
 * Der Speicher ist eine Attrappe im Arbeitsspeicher – wie in
 * bau/bestellungen-test.mjs; das Ziel ist der Handler, nicht Upstash.
 */
import assert from 'node:assert/strict'

const tabellen = new Map()

function befehlAusfuehren(teile) {
  const [befehl, schluessel, ...rest] = teile
  const tabelle = tabellen.get(schluessel) ?? new Map()
  tabellen.set(schluessel, tabelle)
  switch (befehl) {
    case 'HSET': tabelle.set(rest[0], rest[1]); return 1
    case 'HGET': return tabelle.get(rest[0]) ?? null
    case 'HGETALL': {
      const flach = []
      for (const [feld, wert] of tabelle) flach.push(feld, wert)
      return flach
    }
    case 'HDEL': return tabelle.delete(rest[0]) ? 1 : 0
    case 'EXPIRE': return 1
    default: throw new Error(`Unbekannter Befehl in der Attrappe: ${befehl}`)
  }
}

globalThis.fetch = async (_url, optionen) =>
  new Response(JSON.stringify({ result: befehlAusfuehren(JSON.parse(optionen.body)) }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })

const { default: handler } = await import('../api/auslagen.ts')
const { anmeldeCookie } = await import('../api/_sitzung.ts')

/* Ein gueltiges Sitzungscookie, wie es der Browser nach dem Anmelden hat. */
const COOKIE = anmeldeCookie().split(';')[0]

function antwortAttrappe() {
  const antwort = { code: 0, daten: null, koepfe: {} }
  antwort.status = (code) => { antwort.code = code; return antwort }
  antwort.json = (daten) => { antwort.daten = daten; return antwort }
  antwort.setHeader = (name, wert) => { antwort.koepfe[name] = wert; return antwort }
  return antwort
}

/*
 * `cookie: undefined` wuerde die Vorgabe ausloesen und die Anfrage waere
 * angemeldet - der Test gruen, obwohl er nichts geprueft hat. Deshalb der
 * leere String fuer "kein Cookie".
 */
async function ruf({ method = 'GET', body, cookie = COOKIE, query = {} }) {
  const antwort = antwortAttrappe()
  await handler({ method, query, body, headers: { cookie } }, antwort)
  return antwort
}

let bestanden = 0
const fehler = []
async function pruefe(name, lauf) {
  try { await lauf(); bestanden++; console.log(`ok    ${name}`) }
  catch (f) { fehler.push(`${name}: ${f.message}`); console.log(`FEHL  ${name}\n      ${f.message.split('\n')[0]}`) }
}

const gueltig = {
  am: '2026-02-14', bezeichnung: 'Aufkleber drucken', kategorie: 'marketing',
  betragChf: 86.5, traeger: 'deniz',
}

/* --- Die Tuere ------------------------------------------------------------- */

await pruefe('ohne Anmeldung kommt nichts heraus', async () => {
  const a = await ruf({ method: 'GET', cookie: '' })
  assert.equal(a.code, 401)
})

await pruefe('ohne Anmeldung kommt nichts herein', async () => {
  const a = await ruf({ method: 'POST', body: gueltig, cookie: '' })
  assert.equal(a.code, 401)
  const liste = await ruf({ method: 'GET' })
  assert.equal(liste.daten.auslagen.length, 0, 'es darf nichts gespeichert worden sein')
})

/* --- Anlegen --------------------------------------------------------------- */

let id
await pruefe('eine Auslage anlegen', async () => {
  const a = await ruf({ method: 'POST', body: gueltig })
  assert.equal(a.code, 201)
  assert.equal(a.daten.auslage.betragChf, 86.5)
  assert.equal(a.daten.auslage.traeger, 'deniz')
  assert.ok(a.daten.auslage.id, 'eine Kennung muss vergeben werden')
  assert.ok(a.daten.auslage.erfasstAm, 'der Erfassungszeitpunkt gehoert dazu')
  id = a.daten.auslage.id
})

await pruefe('ohne Bezeichnung geht nichts', async () => {
  const a = await ruf({ method: 'POST', body: { ...gueltig, bezeichnung: '  ' } })
  assert.equal(a.code, 400)
})

await pruefe('ohne Betrag geht nichts', async () => {
  const a = await ruf({ method: 'POST', body: { ...gueltig, betragChf: 0 } })
  assert.equal(a.code, 400)
})

await pruefe('ein negativer Betrag ist kein Betrag', async () => {
  const a = await ruf({ method: 'POST', body: { ...gueltig, betragChf: -20 } })
  assert.equal(a.code, 400)
})

await pruefe('ein erfundenes Datum wird abgewiesen', async () => {
  const a = await ruf({ method: 'POST', body: { ...gueltig, am: '2026-02-30' } })
  assert.equal(a.code, 400, '30. Februar gibt es nicht')
})

await pruefe('eine erfundene Kategorie wird abgewiesen', async () => {
  const a = await ruf({ method: 'POST', body: { ...gueltig, kategorie: 'schnaps' } })
  assert.equal(a.code, 400)
})

await pruefe('ein erfundener Traeger wird abgewiesen', async () => {
  const a = await ruf({ method: 'POST', body: { ...gueltig, traeger: 'jemand' } })
  assert.equal(a.code, 400)
})

await pruefe('der Betrag wird auf Rappen gerundet', async () => {
  const a = await ruf({ method: 'POST', body: { ...gueltig, betragChf: 12.3456 } })
  assert.equal(a.daten.auslage.betragChf, 12.35)
})

/* --- Aendern --------------------------------------------------------------- */

await pruefe('als bezahlt markieren laesst alles andere stehen', async () => {
  const a = await ruf({ method: 'PATCH', body: { id, bezahlt: true } })
  assert.equal(a.code, 200)
  assert.equal(a.daten.auslage.bezahlt, true)
  assert.equal(a.daten.auslage.betragChf, 86.5, 'der Betrag darf nicht verschwinden')
  assert.equal(a.daten.auslage.bezeichnung, 'Aufkleber drucken')
  assert.equal(a.daten.auslage.traeger, 'deniz')
})

await pruefe('der Erfassungszeitpunkt bleibt beim Aendern stehen', async () => {
  const vorher = (await ruf({ method: 'GET' })).daten.auslagen.find((x) => x.id === id)
  const a = await ruf({ method: 'PATCH', body: { id, betragChf: 90 } })
  assert.equal(a.daten.auslage.erfasstAm, vorher.erfasstAm)
})

await pruefe('eine unbekannte Kennung ist ein 404', async () => {
  const a = await ruf({ method: 'PATCH', body: { id: 'gibtsnicht', betragChf: 10 } })
  assert.equal(a.code, 404)
})

/* --- Auflisten und loeschen ------------------------------------------------ */

await pruefe('die Liste kommt neueste zuerst', async () => {
  await ruf({ method: 'POST', body: { ...gueltig, am: '2026-05-01', bezeichnung: 'Server' } })
  await ruf({ method: 'POST', body: { ...gueltig, am: '2026-01-01', bezeichnung: 'Klebeband' } })
  const liste = (await ruf({ method: 'GET' })).daten.auslagen
  const daten = liste.map((x) => x.am)
  assert.deepEqual([...daten].sort().reverse(), daten, `nicht sortiert: ${daten}`)
})

await pruefe('loeschen entfernt den Eintrag', async () => {
  const vorher = (await ruf({ method: 'GET' })).daten.auslagen.length
  const a = await ruf({ method: 'DELETE', body: { id } })
  assert.equal(a.code, 200)
  const nachher = (await ruf({ method: 'GET' })).daten.auslagen.length
  assert.equal(nachher, vorher - 1)
})

await pruefe('eine kaputte Zeile verhindert nicht die ganze Liste', async () => {
  const { TABELLE_AUSLAGEN } = await import('../api/_speicher.ts')
  tabellen.get(TABELLE_AUSLAGEN).set('kaputt', '{ das ist kein JSON')
  const a = await ruf({ method: 'GET' })
  assert.equal(a.code, 200)
  assert.ok(a.daten.auslagen.length >= 2, 'die heilen Zeilen muessen durchkommen')
})

await pruefe('eine unbekannte Methode wird abgewiesen', async () => {
  const a = await ruf({ method: 'PUT', body: {} })
  assert.equal(a.code, 405)
  assert.ok(a.koepfe.Allow, 'der Allow-Kopf gehoert dazu')
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) process.exit(1)
