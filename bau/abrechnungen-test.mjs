/**
 * Testlauf fuer api/abrechnungen.ts.
 *
 * EINE ABGESCHLOSSENE ABRECHNUNG IST EIN BELEG. Sie sagt, wer wie viel
 * bekommen hat, und danach ist sie zu. Drei Stellen sind still gefaehrlich:
 *
 *  - Ohne Anmeldung darf nichts herein und nichts heraus.
 *  - Eine erledigte Abrechnung darf sich nicht mehr aendern lassen und auch
 *    nicht loeschen. Sonst aendert jemand eine Auszahlung, die laengst
 *    geflossen ist.
 *  - Es darf nur EINEN Entwurf geben. Zwei offene koennten denselben Auftrag
 *    enthalten, und das Geld waere zweimal verteilt.
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

const { default: handler } = await import('../api/abrechnungen.ts')
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

/* Eine Abrechnung, wie der Browser sie schickt: Zeilen und fertige Summen. */
const gueltig = {
  nummer: 'A-2026-01',
  auftraege: [{ bestellungId: 'b1', referenz: 'PF-1', kunde: 'Muster',
    erloesChf: 180, warenerloesChf: 165, montageerloesChf: 15 }],
  posten: [{ bestellungId: 'b1', postenId: 'k1', art: 'herstellung',
    betragChf: 40, traeger: 'bora' }],
  erloesChf: 180, warenerloesChf: 165, montageerloesChf: 15,
  warenkostenChf: 40, betriebskostenChf: 0, rueckzahlungChf: 40,
  rueckzahlung: { bora: 40, ufuk: 0, deniz: 0 },
  warengewinnChf: 125, montagegewinnChf: 15, verteilbarChf: 140,
  anteile: { bora: 25, ufuk: 57.5, deniz: 57.5 },
  summe: { bora: 65, ufuk: 57.5, deniz: 57.5 },
}

/* --- Die Tuere ------------------------------------------------------------- */

await pruefe('ohne Anmeldung kommt nichts heraus', async () => {
  assert.equal((await ruf({ method: 'GET', cookie: '' })).code, 401)
})

await pruefe('ohne Anmeldung kommt nichts herein', async () => {
  assert.equal((await ruf({ method: 'POST', body: gueltig, cookie: '' })).code, 401)
  const liste = await ruf({ method: 'GET' })
  assert.equal(liste.daten.abrechnungen.length, 0)
})

/* --- Anlegen --------------------------------------------------------------- */

await pruefe('eine Abrechnung laesst sich anlegen und wiederfinden', async () => {
  const a = await ruf({ method: 'POST', body: gueltig })
  assert.equal(a.code, 201)
  assert.ok(a.daten.abrechnung.id, 'ohne Kennung')
  assert.equal(a.daten.abrechnung.nummer, 'A-2026-01')
  assert.equal(a.daten.abrechnung.erledigtAm, undefined, 'frisch ist sie ein Entwurf')
  const liste = await ruf({ method: 'GET' })
  assert.equal(liste.daten.abrechnungen.length, 1)
})

await pruefe('die Zeilen und die Summen kommen beide mit', async () => {
  const liste = await ruf({ method: 'GET' })
  const a = liste.daten.abrechnungen[0]
  assert.equal(a.auftraege.length, 1)
  assert.equal(a.posten.length, 1)
  assert.equal(a.summe.bora, 65)
  assert.equal(a.rueckzahlung.bora, 40)
})

await pruefe('nur ein Entwurf zur Zeit', async () => {
  /*
   * ZWEI OFFENE KOENNTEN DENSELBEN AUFTRAG ENTHALTEN. Die Oberflaeche zeigt
   * den Entwurf statt der Auswahl und laesst es gar nicht erst zu - der
   * Riegel steht trotzdem hier, weil zwei Fenster offen sein koennen.
   */
  const a = await ruf({ method: 'POST', body: { ...gueltig, nummer: 'A-2026-02' } })
  assert.equal(a.code, 409)
})

await pruefe('eine Abrechnung ohne Zeilen wird abgewiesen', async () => {
  /*
   * ERST DEN ENTWURF WEG. Der Riegel "nur einer zur Zeit" greift VOR der
   * Pruefung des Inhalts - und das ist richtig so: Wer bei offenem Entwurf
   * noch einen schickt, soll das erfahren und nicht lesen, sein Inhalt sei
   * leer. Beim ersten Lauf hat genau das den Test rot gemacht, nicht der
   * Handler.
   */
  const liste = await ruf({ method: 'GET' })
  const entwurf = liste.daten.abrechnungen.find((x) => !x.erledigtAm)
  if (entwurf) await ruf({ method: 'DELETE', body: { id: entwurf.id } })
  const leer = { ...gueltig, nummer: 'A-2026-09', auftraege: [], posten: [] }
  assert.equal((await ruf({ method: 'POST', body: leer })).code, 400)
  /* Und wieder einen anlegen, damit die folgenden Tests ihren Entwurf haben. */
  await ruf({ method: 'POST', body: gueltig })
})

/* --- Erledigen ------------------------------------------------------------- */

await pruefe('erledigen stempelt den Zeitpunkt', async () => {
  const liste = await ruf({ method: 'GET' })
  const id = liste.daten.abrechnungen[0].id
  const a = await ruf({ method: 'PATCH', body: { id, erledigt: true } })
  assert.equal(a.code, 200)
  assert.ok(a.daten.abrechnung.erledigtAm, 'kein Zeitpunkt')
})

await pruefe('eine erledigte Abrechnung laesst sich nicht mehr aendern', async () => {
  const liste = await ruf({ method: 'GET' })
  const id = liste.daten.abrechnungen[0].id
  const a = await ruf({ method: 'PATCH', body: { id, notiz: 'doch anders' } })
  assert.equal(a.code, 409, 'ein Beleg, der sich nachtraeglich aendert, ist keiner')
})

await pruefe('eine erledigte Abrechnung laesst sich nicht loeschen', async () => {
  const liste = await ruf({ method: 'GET' })
  const id = liste.daten.abrechnungen[0].id
  assert.equal((await ruf({ method: 'DELETE', body: { id } })).code, 409)
  assert.equal((await ruf({ method: 'GET' })).daten.abrechnungen.length, 1, 'sie steht noch da')
})

await pruefe('nach dem Erledigen geht wieder ein Entwurf', async () => {
  const a = await ruf({ method: 'POST', body: { ...gueltig, nummer: 'A-2026-02' } })
  assert.equal(a.code, 201)
})

/* --- Entwurf verwerfen ----------------------------------------------------- */

await pruefe('ein Entwurf laesst sich verwerfen', async () => {
  const liste = await ruf({ method: 'GET' })
  const entwurf = liste.daten.abrechnungen.find((x) => !x.erledigtAm)
  assert.ok(entwurf, 'kein Entwurf da')
  assert.equal((await ruf({ method: 'DELETE', body: { id: entwurf.id } })).code, 200)
  const nachher = await ruf({ method: 'GET' })
  assert.equal(nachher.daten.abrechnungen.length, 1, 'die erledigte bleibt')
})

await pruefe('eine Notiz laesst sich am Entwurf aendern', async () => {
  await ruf({ method: 'POST', body: { ...gueltig, nummer: 'A-2026-03' } })
  const liste = await ruf({ method: 'GET' })
  const entwurf = liste.daten.abrechnungen.find((x) => !x.erledigtAm)
  const a = await ruf({ method: 'PATCH', body: { id: entwurf.id, notiz: 'Oktoberlieferung' } })
  assert.equal(a.daten.abrechnung.notiz, 'Oktoberlieferung')
  /* Und die Zeilen bleiben dabei stehen. */
  assert.equal(a.daten.abrechnung.auftraege.length, 1)
  assert.equal(a.daten.abrechnung.summe.bora, 65)
})

/* --- Was hereinkommt, wird zurechtgestutzt --------------------------------- */

await pruefe('eine erfundene Kostenart faellt weg', async () => {
  const liste = await ruf({ method: 'GET' })
  const entwurf = liste.daten.abrechnungen.find((x) => !x.erledigtAm)
  await ruf({ method: 'DELETE', body: { id: entwurf.id } })
  const a = await ruf({ method: 'POST', body: {
    ...gueltig, nummer: 'A-2026-04',
    posten: [{ bestellungId: 'b1', postenId: 'k1', art: 'schmuggel', betragChf: 40, traeger: 'bora' }],
  } })
  assert.equal(a.daten.abrechnung.posten.length, 0, 'die Zeile ist weg')
})

await pruefe('ein erfundener Traeger faellt weg', async () => {
  const liste = await ruf({ method: 'GET' })
  const entwurf = liste.daten.abrechnungen.find((x) => !x.erledigtAm)
  await ruf({ method: 'DELETE', body: { id: entwurf.id } })
  const a = await ruf({ method: 'POST', body: {
    ...gueltig, nummer: 'A-2026-05',
    posten: [{ bestellungId: 'b1', postenId: 'k1', art: 'herstellung', betragChf: 40, traeger: 'nachbar' }],
  } })
  assert.equal(a.daten.abrechnung.posten.length, 0)
})

await pruefe('ein negativer Topf bleibt negativ', async () => {
  /*
   * ANDERS ALS BEI DEN AUSLAGEN. Ein Topf im Minus ist eine gueltige
   * Aussage - die Auslagen waren groesser als das, was hereinkam. Wer sie
   * bei null abschneidet, zeigt eine Abrechnung, die aufzugehen scheint.
   */
  const liste = await ruf({ method: 'GET' })
  const entwurf = liste.daten.abrechnungen.find((x) => !x.erledigtAm)
  await ruf({ method: 'DELETE', body: { id: entwurf.id } })
  const a = await ruf({ method: 'POST', body: { ...gueltig, nummer: 'A-2026-06', warengewinnChf: -12.5 } })
  assert.equal(a.daten.abrechnung.warengewinnChf, -12.5)
})

await pruefe('eine unbekannte Kennung ist ein 404', async () => {
  assert.equal((await ruf({ method: 'PATCH', body: { id: 'gibtsnicht', erledigt: true } })).code, 404)
})

await pruefe('eine unbekannte Methode wird abgewiesen', async () => {
  const a = await ruf({ method: 'PUT', body: {} })
  assert.equal(a.code, 405)
  assert.ok(a.koepfe.Allow.includes('PATCH'))
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
