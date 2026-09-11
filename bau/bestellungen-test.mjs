/**
 * Testlauf fuer api/bestellungen.ts.
 *
 * Aufruf: npm run test:bestellungen
 *
 * Hier haengt Geld dran, und zwei Stellen sind still gefaehrlich:
 *
 *  - Die Summe wird beim Aendern der Netze neu gerechnet. Bei Eintraegen aus
 *    der Zeit vor dem Feld `montageChf` muss die Montage aus der Differenz
 *    hergeleitet werden. Geht das schief, verschwinden pro Fenster 15 Franken
 *    aus der Bestellung - ohne Fehlermeldung, ohne dass es jemandem auffaellt.
 *  - `bezahlung` darf ueber diesen Weg NICHT setzbar sein. Der Zahlungsstand
 *    kommt allein von Stripe. Kaeme er von hier durch, koennte ein Fehlklick
 *    eine unbezahlte Bestellung als bezahlt markieren, und sie wuerde
 *    ausgeliefert.
 *
 * Der Speicher ist eine Attrappe im Arbeitsspeicher: Das Ziel ist die Logik
 * des Handlers, nicht Upstash.
 */
import assert from 'node:assert/strict'

/* --- Attrappe fuer den Upstash-Speicher ------------------------------------ */

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
    case 'INCR': {
      const wert = Number(tabelle.get('#') ?? 0) + 1
      tabelle.set('#', String(wert))
      return wert
    }
    case 'EXPIRE':
      return 1
    default:
      throw new Error(`Unbekannter Befehl in der Attrappe: ${befehl}`)
  }
}

globalThis.fetch = async (_url, optionen) =>
  new Response(JSON.stringify({ result: befehlAusfuehren(JSON.parse(optionen.body)) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

const { default: handler } = await import('../api/bestellungen.ts')
const { TABELLE_BESTELLUNGEN } = await import('../api/_speicher.ts')

/**
 * Direkter Griff in den gespeicherten Datensatz. Nur fuer die Faelle, in
 * denen genau das geprueft wird, was NICHT ueber die API hineinkommt – etwa
 * alte Statuswerte aus der Zeit vor dieser Fassung.
 */
const gespeichert = {
  lies: (id) => JSON.parse(tabellen.get(TABELLE_BESTELLUNGEN).get(id)),
  schreib: (id, wert) => tabellen.get(TABELLE_BESTELLUNGEN).set(id, JSON.stringify(wert)),
}

/* --- Attrappen fuer Anfrage und Antwort ------------------------------------ */

function antwortAttrappe() {
  const antwort = { code: 0, daten: null, koepfe: {} }
  antwort.status = (code) => {
    antwort.code = code
    return antwort
  }
  antwort.json = (daten) => {
    antwort.daten = daten
    return antwort
  }
  antwort.setHeader = (name, wert) => {
    antwort.koepfe[name] = wert
    return antwort
  }
  return antwort
}

async function ruf({ method = 'GET', aktion = '', body, cookie }) {
  const antwort = antwortAttrappe()
  await handler({ method, query: aktion ? { aktion } : {}, body, headers: { cookie } }, antwort)
  return antwort
}

/* --- Testgeruest ------------------------------------------------------------ */

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

const kunde = { name: 'Testperson', email: 'test@example.com', telefon: '079 000 00 00' }

/* --- Anmeldung -------------------------------------------------------------- */

let cookie
await pruefe('Anmeldung mit richtigem Passwort setzt einen Cookie', async () => {
  const a = await ruf({ method: 'POST', aktion: 'anmelden', body: { passwort: 'testpasswort' } })
  assert.equal(a.code, 200)
  cookie = a.koepfe['Set-Cookie'].split(';')[0]
  assert.ok(cookie.startsWith('pf_admin='))
})

await pruefe('Anmeldung mit falschem Passwort scheitert', async () => {
  const a = await ruf({ method: 'POST', aktion: 'anmelden', body: { passwort: 'daneben!' } })
  assert.equal(a.code, 401)
})

/* --- Der offene Weg: das Bestellformular ------------------------------------ */

await pruefe('Bestellung von der Seite landet als "bestellen" und Quelle "web"', async () => {
  const a = await ruf({
    method: 'POST',
    body: { art: 'bestellung', referenz: 'PF-1', kunde, positionen: [], summeChf: 130 },
  })
  assert.equal(a.code, 201)
  const liste = (await ruf({ method: 'GET', cookie })).daten.bestellungen
  const b = liste.find((x) => x.referenz === 'PF-1')
  // An der Kasse ist zugesagt worden – sie wartet nur noch auf die Bestellrunde.
  assert.equal(b.status, 'bestellen')
  assert.equal(b.quelle, 'web')
})

await pruefe('Der offene Weg darf Status und Quelle NICHT setzen', async () => {
  await ruf({
    method: 'POST',
    body: { art: 'bestellung', referenz: 'PF-2', kunde, status: 'ausliefern', quelle: 'instagram', summeChf: 0 },
  })
  const liste = (await ruf({ method: 'GET', cookie })).daten.bestellungen
  const b = liste.find((x) => x.referenz === 'PF-2')
  // "bestellen" ist der Startpunkt einer Warenkorbbestellung, nicht der Wert
  // aus dem Koerper – der haette "ausliefern" gesagt.
  assert.equal(b.status, 'bestellen', 'Status aus dem Koerper wurde uebernommen')
  assert.equal(b.quelle, 'web', 'Quelle aus dem Koerper wurde uebernommen')
})

await pruefe('Eine Sondermass-Anfrage von der Seite bleibt "neu"', async () => {
  await ruf({
    method: 'POST',
    body: { art: 'anfrage', referenz: 'H-1', kunde, summeChf: 0 },
  })
  const liste = (await ruf({ method: 'GET', cookie })).daten.bestellungen
  assert.equal(liste.find((x) => x.referenz === 'H-1').status, 'neu')
})

await pruefe('Der offene Weg verlangt eine E-Mail', async () => {
  const a = await ruf({
    method: 'POST',
    body: { art: 'bestellung', kunde: { name: 'Ohne Mail', telefon: '079 111 11 11' } },
  })
  assert.equal(a.code, 400)
})

/* --- Auflisten ist geschuetzt ----------------------------------------------- */

await pruefe('Ohne Anmeldung keine Liste', async () => {
  assert.equal((await ruf({ method: 'GET' })).code, 401)
})

/* --- Von Hand erfassen ------------------------------------------------------ */

await pruefe('Erfassen ohne Anmeldung wird abgewiesen', async () => {
  const a = await ruf({ method: 'POST', aktion: 'erfassen', body: { art: 'bestellung', kunde } })
  assert.equal(a.code, 401)
})

let vonHand
await pruefe('Erfassen: Telefon allein genuegt, Status und Quelle greifen', async () => {
  const a = await ruf({
    method: 'POST',
    aktion: 'erfassen',
    cookie,
    body: {
      art: 'anfrage',
      quelle: 'whatsapp',
      status: 'offerte',
      referenz: 'H-ABCD',
      kunde: { name: 'Nachbarin', telefon: '079 222 22 22' },
      positionen: [
        { menge: 2, bezeichnung: 'Schlafzimmer', breiteCm: 120, hoeheCm: 140, preisChf: 150 },
        { menge: 1, bezeichnung: 'Küche', breiteCm: 80, hoeheCm: 100, preisChf: 130 },
      ],
      montage: true,
      montageChf: 45,
      summeChf: 999999,
    },
  })
  assert.equal(a.code, 201)
  vonHand = a.daten.bestellung
  assert.equal(vonHand.status, 'offerte')
  assert.equal(vonHand.quelle, 'whatsapp')
  assert.equal(vonHand.kunde.email, '')
})

await pruefe('Erfassen rechnet die Summe selbst und uebernimmt keine mitgeschickte', () => {
  // 2 × 150 + 1 × 130 + 45 Montage = 475. Die 999999 aus dem Koerper zaehlen nicht.
  assert.equal(vonHand.summeChf, 475)
})

await pruefe('Erfassen behaelt die Masse als Zahlen', () => {
  assert.equal(vonHand.positionen[0].breiteCm, 120)
  assert.equal(vonHand.positionen[0].hoeheCm, 140)
})

await pruefe('Erfassen ohne Namen wird abgewiesen', async () => {
  const a = await ruf({ method: 'POST', aktion: 'erfassen', cookie, body: { kunde: { telefon: '079' } } })
  assert.equal(a.code, 400)
})

/* --- Aendern ---------------------------------------------------------------- */

await pruefe('Die Phase laesst sich setzen, und der Wechsel wird gestempelt', async () => {
  const a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, status: 'klaerung' } })
  assert.equal(a.code, 200)
  assert.equal(a.daten.bestellung.status, 'klaerung')
  assert.ok(a.daten.bestellung.phaseSeit, 'phaseSeit fehlt')
  // Zurueck auf "offerte", damit der Rest der Pruefungen den Stand vorfindet.
  await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, status: 'offerte' } })
})

await pruefe('Datumsfelder: ISO-Datum setzt, leer loescht, Unsinn wird nicht gespeichert', async () => {
  let a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, klaerungTermin: '2026-10-03' } })
  assert.equal(a.daten.bestellung.klaerungTermin, '2026-10-03')
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, montageTermin: '2026-11-20T09:00' } })
  assert.equal(a.daten.bestellung.montageTermin, '2026-11-20T09:00')
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, klaerungTermin: 'irgendwann' } })
  assert.equal(a.daten.bestellung.klaerungTermin, undefined, 'Unsinn wurde als Termin gespeichert')
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, montageTermin: '' } })
  assert.equal(a.daten.bestellung.montageTermin, undefined)
})

await pruefe('Zusage, bestellt, unterwegs, Paket und Zahlungskommentar', async () => {
  let a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, zusage: true } })
  assert.ok(a.daten.bestellung.zusageAm)
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, zusage: false } })
  assert.equal(a.daten.bestellung.zusageAm, undefined)
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, bestellt: true, versand: true } })
  assert.ok(a.daten.bestellung.bestelltAm)
  assert.ok(a.daten.bestellung.versandAm)
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, bestellt: false, versand: false } })
  assert.equal(a.daten.bestellung.bestelltAm, undefined)
  assert.equal(a.daten.bestellung.versandAm, undefined)
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, paket: 'P-2026-01' } })
  assert.equal(a.daten.bestellung.paket, 'P-2026-01')
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, paket: '' } })
  assert.equal(a.daten.bestellung.paket, undefined)
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, zahlungKommentar: 'Rate 1 bar, Rest TWINT' } })
  assert.equal(a.daten.bestellung.zahlungKommentar, 'Rate 1 bar, Rest TWINT')
})

await pruefe('Boras Kosten von Hand: je Position, Fracht, Zoll; null loescht; fremde Kennung zaehlt nicht', async () => {
  const a = await ruf({ method: 'POST', aktion: 'erfassen', cookie, body: {
    art: 'anfrage', referenz: 'PF-EK', kunde: { name: 'Einkauf', telefon: '079' },
    positionen: [
      { menge: 2, bezeichnung: 'Bad', breiteCm: 80, hoeheCm: 100, preisChf: 120 },
      { menge: 1, bezeichnung: 'Küche', breiteCm: 90, hoeheCm: 110, preisChf: 130 },
    ], montage: false, montageChf: 0,
  } })
  const b = a.daten.bestellung
  const [p1, p2] = b.positionen
  let n = await ruf({ method: 'PATCH', cookie, body: {
    id: b.id, einkauf: { jePosition: { [p1.id]: 45, [p2.id]: 50, fremd: 99 }, lieferkostenChf: 30, zollChf: 12.5 },
  } })
  assert.equal(n.code, 200)
  assert.deepEqual(n.daten.bestellung.positionen.map((p) => p.einkaufChf), [45, 50])
  assert.equal(n.daten.bestellung.lieferkostenChf, 30)
  assert.equal(n.daten.bestellung.zollChf, 12.5)
  assert.ok(n.daten.bestellung.einkaufAm)
  // Der Verkaufspreis und die Summe bleiben unberuehrt.
  assert.equal(n.daten.bestellung.summeChf, 370)
  n = await ruf({ method: 'PATCH', cookie, body: { id: b.id, einkauf: { jePosition: { [p2.id]: null }, zollChf: null } } })
  assert.deepEqual(n.daten.bestellung.positionen.map((p) => p.einkaufChf), [45, undefined])
  assert.equal(n.daten.bestellung.zollChf, undefined)
  assert.equal(n.daten.bestellung.lieferkostenChf, 30, 'Fracht ohne Angabe wurde angefasst')
  // Ein leeres Kosten-Objekt ist keine Aenderung.
  n = await ruf({ method: 'PATCH', cookie, body: { id: b.id, einkauf: {} } })
  assert.equal(n.code, 200)
})

await pruefe('Absagen traegt Grund und Zeitpunkt, Wiederoeffnen loescht beides', async () => {
  let a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, status: 'abgesagt', absageGrund: 'zuTeuer' } })
  assert.equal(a.daten.bestellung.status, 'abgesagt')
  assert.equal(a.daten.bestellung.absageGrund, 'zuTeuer')
  assert.ok(a.daten.bestellung.absageAm)
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, status: 'abgesagt', absageGrund: 'quatsch' } })
  assert.equal(a.daten.bestellung.absageGrund, 'zuTeuer', 'ein unbekannter Grund hat den bekannten ueberschrieben')
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, status: 'offerte' } })
  assert.equal(a.daten.bestellung.absageGrund, undefined)
  assert.equal(a.daten.bestellung.absageAm, undefined)
})

await pruefe('Die alten Statuswerte werden beim Lesen abgebildet', async () => {
  // Gespeicherte Bestellungen tragen noch das alte Vokabular. Sie duerfen
  // nicht als "unbekannt" durchfallen, sonst verschwinden sie aus der Liste.
  const roh = gespeichert.lies(vonHand.id)
  for (const [alt, neu] of [['bestellt', 'bestellen'], ['geloescht', 'abgesagt'], ['zugesagt', 'bestellen'], ['offeriert', 'zusage']]) {
    gespeichert.schreib(vonHand.id, { ...roh, status: alt })
    const liste = (await ruf({ method: 'GET', cookie })).daten.bestellungen
    assert.equal(liste.find((b) => b.id === vonHand.id).status, neu, alt)
  }
  gespeichert.schreib(vonHand.id, roh)
})

await pruefe('Altes "offerte" entscheidet sich am Haken "Offerte versendet"', async () => {
  /*
   * "offerte" hiess nur "im Offert-Abschnitt". Ob die Offerte wirklich
   * draussen war, stand im Haken. Wer das ignoriert, schiebt jede
   * Altbestellung zum Kunden, obwohl sie noch bei uns liegt.
   */
  const roh = gespeichert.lies(vonHand.id)
  // Ein ECHT alter Datensatz traegt keinen Stempel der heutigen Fassung.
  const alt = { ...roh, status: 'offerte', offerteAm: undefined, phaseSeit: undefined, einkaufAm: undefined }

  gespeichert.schreib(vonHand.id, alt)
  let liste = (await ruf({ method: 'GET', cookie })).daten.bestellungen
  assert.equal(liste.find((b) => b.id === vonHand.id).status, 'neu', 'ohne Haken zum Kunden geschoben')

  // Derselbe Wert mit Stempel ist die heutige Phase 4 – egal, ob ein Haken da ist.
  gespeichert.schreib(vonHand.id, { ...alt, phaseSeit: '2026-09-01T10:00:00.000Z' })
  liste = (await ruf({ method: 'GET', cookie })).daten.bestellungen
  assert.equal(liste.find((b) => b.id === vonHand.id).status, 'offerte', 'die heutige Phase 4 wurde fuer alt gehalten')

  // Mit Haken "Offerte versendet" wartet sie auf den Kunden – eigene Phase.
  gespeichert.schreib(vonHand.id, { ...alt, offerteAm: '2026-05-01T10:00:00.000Z' })
  liste = (await ruf({ method: 'GET', cookie })).daten.bestellungen
  assert.equal(liste.find((b) => b.id === vonHand.id).status, 'zusage')

  gespeichert.schreib(vonHand.id, roh)
})

await pruefe('"erledigt" wird zu beiden Haken', async () => {
  const roh = gespeichert.lies(vonHand.id)
  gespeichert.schreib(vonHand.id, { ...roh, status: 'erledigt' })
  const b = (await ruf({ method: 'GET', cookie })).daten.bestellungen.find((x) => x.id === vonHand.id)
  assert.equal(b.status, 'ausliefern')
  assert.equal(b.ausgeliefertAm, roh.geaendert)
  assert.equal(b.bezahltAm, roh.geaendert)
  gespeichert.schreib(vonHand.id, roh)
})

/* --- Netze speichern darf Boras Preise nicht verwerfen ---------------------- */

await pruefe('Netze speichern bewahrt den Einkaufspreis je Position', async () => {
  /*
   * Der Fehler, den das hier abfaengt: Der Browser schickt die Positionen
   * ohne einkaufChf, und der Server uebernahm sie so. Jeder korrigierte
   * Verkaufspreis war das Ende der Marge – alle Einkaufspreise weg, ohne
   * dass jemand etwas geloescht haette.
   */
  const roh = gespeichert.lies(vonHand.id)
  const mitEinkauf = {
    ...roh,
    positionen: roh.positionen.map((p, i) => ({ ...p, einkaufChf: 40 + i })),
    einkaufAusRunde: 'L-2026-01',
  }
  gespeichert.schreib(vonHand.id, mitEinkauf)

  // Nur der Verkaufspreis aendert sich – wie beim Rechnen der Offerte.
  const geschickt = mitEinkauf.positionen.map((p) => {
    const { einkaufChf: _weg, ...ohne } = p
    return { ...ohne, preisChf: p.preisChf + 10 }
  })
  const a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, positionen: geschickt } })
  assert.equal(a.code, 200)
  const b = a.daten.bestellung
  assert.equal(b.positionen[0].einkaufChf, 40, 'Einkaufspreis der ersten Position verworfen')
  assert.equal(b.positionen[1].einkaufChf, 41, 'Einkaufspreis der zweiten Position verworfen')
  assert.equal(b.positionen[0].preisChf, mitEinkauf.positionen[0].preisChf + 10)
  assert.equal(b.positionen[0].id, mitEinkauf.positionen[0].id, 'die Kennung wurde neu vergeben')
})

await pruefe('Neue Masse heissen: dieser Preis gilt nicht mehr – nur fuer dieses Netz', async () => {
  const roh = gespeichert.lies(vonHand.id)
  const geschickt = roh.positionen.map((p, i) => {
    const { einkaufChf: _weg, ...ohne } = p
    return i === 0 ? { ...ohne, breiteCm: (p.breiteCm ?? 100) + 5 } : ohne
  })
  const a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, positionen: geschickt } })
  const b = a.daten.bestellung
  assert.equal(b.positionen[0].einkaufChf, undefined, 'Preis zu Massen, die es nicht mehr gibt')
  assert.equal(b.positionen[1].einkaufChf, 41, 'das unveraenderte Netz hat seinen Preis verloren')
})

await pruefe('Ein neues Netz hat keinen Einkaufspreis, und der Browser kann keinen setzen', async () => {
  const roh = gespeichert.lies(vonHand.id)
  const geschickt = [
    ...roh.positionen.map((p) => {
      const { einkaufChf: _weg, ...ohne } = p
      return ohne
    }),
    // Ohne Kennung, dafuer mit einem frech mitgeschickten Einkaufspreis.
    { menge: 1, bezeichnung: 'Dazu', breiteCm: 90, hoeheCm: 120, preisChf: 140, einkaufChf: 1 },
  ]
  const a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, positionen: geschickt } })
  const b = a.daten.bestellung
  assert.equal(b.positionen.length, 3)
  assert.equal(b.positionen[2].einkaufChf, undefined, 'der Browser durfte einen Einkaufspreis setzen')
  assert.equal(b.positionen[1].einkaufChf, 41)
  // Zurueck auf den Stand davor, damit die folgenden Pruefungen unberuehrt sind.
  gespeichert.schreib(vonHand.id, roh)
})

await pruefe('Uebergabe und Zahlung lassen sich getrennt haken', async () => {
  let a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, ausgeliefert: true } })
  assert.equal(a.code, 200)
  assert.ok(a.daten.bestellung.ausgeliefertAm)
  assert.equal(a.daten.bestellung.bezahltAm, undefined)

  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, bezahlt: true } })
  assert.ok(a.daten.bestellung.bezahltAm)

  // Und wieder zurueck – ein Fehlklick muss sich geraderuecken lassen.
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, ausgeliefert: false, bezahlt: false } })
  assert.equal(a.daten.bestellung.ausgeliefertAm, undefined)
  assert.equal(a.daten.bestellung.bezahltAm, undefined)
})

await pruefe('Unbekannter Status wird abgewiesen', async () => {
  const a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, status: 'irgendwas' } })
  assert.equal(a.code, 400)
})

await pruefe('Ein Haken setzt einen Zeitpunkt, kein Ja/Nein', async () => {
  const a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, ausgemessen: true } })
  assert.ok(a.daten.bestellung.ausgemessenAm, 'ausgemessenAm fehlt')
  assert.ok(!Number.isNaN(Date.parse(a.daten.bestellung.ausgemessenAm)), 'kein gueltiger Zeitpunkt')
})

await pruefe('Haken wieder entfernen loescht den Zeitpunkt', async () => {
  const a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, ausgemessen: false } })
  assert.equal(a.daten.bestellung.ausgemessenAm, undefined)
})

await pruefe('Offerte versendet wird getrennt gefuehrt', async () => {
  const a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, ausgemessen: true, offerteVersendet: true } })
  assert.ok(a.daten.bestellung.ausgemessenAm)
  assert.ok(a.daten.bestellung.offerteAm)
})

await pruefe('Offerte raus → zusage; nachbessern → offerte und der Haken faellt', async () => {
  let a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, status: 'offerte' } })
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, status: 'zusage', offerteVersendet: true } })
  assert.equal(a.daten.bestellung.status, 'zusage')
  assert.ok(a.daten.bestellung.offerteAm)
  a = await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id, status: 'offerte' } })
  assert.equal(a.daten.bestellung.status, 'offerte')
  assert.equal(a.daten.bestellung.offerteAm, undefined, 'die alte Offerte gilt beim Nachbessern noch')
  // Beim naechsten Lesen bleibt sie in "offerte" – ohne Haken kein Warten.
  const liste = (await ruf({ method: 'GET', cookie })).daten.bestellungen
  assert.equal(liste.find((b) => b.id === vonHand.id).status, 'offerte')
})

await pruefe('Netze aendern rechnet die Summe neu und behaelt die Montage', async () => {
  const a = await ruf({
    method: 'PATCH',
    cookie,
    body: {
      id: vonHand.id,
      positionen: [{ menge: 1, bezeichnung: 'Nur noch eines', breiteCm: 120, hoeheCm: 140, preisChf: 150 }],
    },
  })
  // 150 Netz + 45 Montage, die Montage stand als eigenes Feld da.
  assert.equal(a.daten.bestellung.summeChf, 195)
  assert.equal(a.daten.bestellung.montageChf, 45)
})

await pruefe('Ein Netz laesst sich ergaenzen', async () => {
  const a = await ruf({
    method: 'PATCH',
    cookie,
    body: {
      id: vonHand.id,
      positionen: [
        { menge: 1, bezeichnung: 'Nur noch eines', breiteCm: 120, hoeheCm: 140, preisChf: 150 },
        { menge: 3, bezeichnung: 'Neu dazu', breiteCm: 90, hoeheCm: 110, preisChf: 140 },
      ],
    },
  })
  assert.equal(a.daten.bestellung.positionen.length, 2)
  assert.equal(a.daten.bestellung.summeChf, 150 + 420 + 45)
})

await pruefe('Masse behalten die Nachkommastelle', async () => {
  // 128.6 auf 129 gerundet ist ein Netz, das nicht passt.
  const a = await ruf({
    method: 'PATCH', cookie,
    body: { id: vonHand.id, positionen: [{ menge: 1, bezeichnung: 'Wohnzimmer', breiteCm: 128.6, hoeheCm: 182.5, preisChf: 170 }] },
  })
  assert.equal(a.daten.bestellung.positionen[0].breiteCm, 128.6)
  assert.equal(a.daten.bestellung.positionen[0].hoeheCm, 182.5)
})

await pruefe('Die Angaben fuer den Produzenten kommen durch', async () => {
  const a = await ruf({
    method: 'PATCH', cookie,
    body: {
      id: vonHand.id,
      positionen: [{
        menge: 1, bezeichnung: 'Wohnzimmer', breiteCm: 128.6, hoeheCm: 182.5, preisChf: 170,
        rahmendicke: '3-4 cm', rahmenfarbe: 'weiss', netzfarbe: 'grau', mechanismus: 'akkordeon',
        oeffnung: 'nach-links', typId: 'zimmer',
      }],
    },
  })
  const p = a.daten.bestellung.positionen[0]
  assert.equal(p.rahmenfarbe, 'weiss')
  assert.equal(p.mechanismus, 'akkordeon')
  assert.equal(p.oeffnung, 'nach-links')
  assert.equal(p.typId, 'zimmer')
})

await pruefe('Unsinnige Masse fallen weg statt als 0 zu erscheinen', async () => {
  const a = await ruf({
    method: 'PATCH',
    cookie,
    body: { id: vonHand.id, positionen: [{ menge: 1, bezeichnung: 'X', breiteCm: 0, hoeheCm: 'abc', preisChf: 10 }] },
  })
  const p = a.daten.bestellung.positionen[0]
  assert.equal(p.breiteCm, undefined)
  assert.equal(p.hoeheCm, undefined)
})

await pruefe('Eine leere Aenderung wird abgewiesen', async () => {
  assert.equal((await ruf({ method: 'PATCH', cookie, body: { id: vonHand.id } })).code, 400)
})

await pruefe('Aendern ohne Anmeldung wird abgewiesen', async () => {
  assert.equal((await ruf({ method: 'PATCH', body: { id: vonHand.id, status: 'bestellen' } })).code, 401)
})

/* --- Der wichtigste Test: der Zahlungsstand ist von hier nicht setzbar ------ */

await pruefe('bezahlung laesst sich ueber PATCH nicht setzen', async () => {
  const a = await ruf({
    method: 'PATCH',
    cookie,
    body: {
      id: vonHand.id,
      status: 'bestellen',
      bezahlung: { status: 'bezahlt', betragChf: 475, zeitpunkt: new Date().toISOString(), sitzung: 'cs_gefaelscht' },
    },
  })
  assert.equal(a.code, 200)
  assert.equal(a.daten.bestellung.bezahlung, undefined, 'Der Zahlungsstand kam durch – das darf nicht sein.')
})

await pruefe('Referenz, Eingang und Art bleiben unveraendert', async () => {
  const a = await ruf({
    method: 'PATCH',
    cookie,
    body: { id: vonHand.id, referenz: 'GEFAELSCHT', art: 'zahlung', eingang: '1999-01-01T00:00:00.000Z', notiz: 'x' },
  })
  assert.equal(a.daten.bestellung.referenz, 'H-ABCD')
  assert.equal(a.daten.bestellung.art, 'anfrage')
  assert.equal(a.daten.bestellung.eingang, vonHand.eingang)
})

/* --- Alteintraege ohne montageChf ------------------------------------------- */

await pruefe('Alteintrag: die Montage wird aus der Differenz hergeleitet', async () => {
  // So sah eine Bestellung vor dem Feld `montageChf` aus: 2 Netze zu 150,
  // Summe 330 – die 30 Franken darin sind zweimal Montage.
  const alt = {
    id: 'alt-1',
    referenz: 'PF-ALT',
    art: 'bestellung',
    status: 'neu',
    eingang: '2026-08-01T10:00:00.000Z',
    geaendert: '2026-08-01T10:00:00.000Z',
    kunde: { name: 'Alt', email: 'alt@example.com', telefon: '', strasse: '', plz: '', ort: '', bemerkung: '' },
    positionen: [{ menge: 2, bezeichnung: 'Zimmer', detail: '', preisChf: 150 }],
    montage: true,
    zahlung: 'uebergabe',
    zahlungswunsch: false,
    summeChf: 330,
  }
  befehlAusfuehren(['HSET', 'pf:bestellungen', 'alt-1', JSON.stringify(alt)])

  const a = await ruf({
    method: 'PATCH',
    cookie,
    body: { id: 'alt-1', positionen: [{ menge: 3, bezeichnung: 'Zimmer', preisChf: 150 }] },
  })
  // 3 × 150 = 450, dazu die aus der Differenz hergeleiteten 30 Montage.
  assert.equal(a.daten.bestellung.montageChf, 30, 'Montage falsch hergeleitet')
  assert.equal(a.daten.bestellung.summeChf, 480, 'Die Montage ist beim Aendern verschwunden')
})

/* --- Loeschen ---------------------------------------------------------------- */

await pruefe('Verkaufspreise festlegen: neuer Preis, Boras Einkauf bleibt, Stempel gesetzt', async () => {
  const a = await ruf({ method: 'POST', aktion: 'erfassen', cookie, body: {
    art: 'anfrage', referenz: 'PF-VK', kunde: { name: 'Verkauf', telefon: '079' },
    positionen: [{ menge: 2, bezeichnung: 'Bad', breiteCm: 80, hoeheCm: 100, preisChf: 120 }], montage: false, montageChf: 0,
  } })
  const b = a.daten.bestellung
  // Bora hat geantwortet (wie es die Runde zurueckschreibt).
  await ruf({ method: 'PATCH', cookie, body: { id: b.id, status: 'kosten' } })
  const roh = gespeichert.lies(b.id)
  roh.positionen[0].einkaufChf = 45
  gespeichert.schreib(b.id, roh)

  const neu = await ruf({ method: 'PATCH', cookie, body: {
    id: b.id, status: 'offerte', preiseFestgelegt: true, montageChf: 40,
    positionen: [{ ...b.positionen[0], preisChf: 180 }],
  } })
  assert.equal(neu.code, 200)
  assert.equal(neu.daten.bestellung.positionen[0].preisChf, 180)
  assert.equal(neu.daten.bestellung.positionen[0].einkaufChf, 45, 'der Einkaufspreis ging beim Verkaufspreis verloren')
  assert.equal(neu.daten.bestellung.summeChf, 400)
  assert.ok(neu.daten.bestellung.preiseFestgelegtAm)
  const weg = await ruf({ method: 'PATCH', cookie, body: { id: b.id, preiseFestgelegt: false } })
  assert.equal(weg.daten.bestellung.preiseFestgelegtAm, undefined)
})

await pruefe('Katalogware von Hand startet im Angebot mit festgelegten Preisen', async () => {
  const a = await ruf({ method: 'POST', aktion: 'erfassen', cookie, body: {
    art: 'bestellung', quelle: 'whatsapp', referenz: 'PF-KAT', status: 'offerte', preiseFestgelegt: true,
    kunde: { name: 'Katalog', telefon: '079' },
    positionen: [{ menge: 2, bezeichnung: 'Zimmer', typId: 'zimmer', breiteCm: 160.5, hoeheCm: 122, preisChf: 150, oeffnung: 'mitte' }],
    montage: false, montageChf: 0,
  } })
  assert.equal(a.code, 201)
  assert.equal(a.daten.bestellung.status, 'offerte')
  assert.ok(a.daten.bestellung.preiseFestgelegtAm)
  assert.equal(a.daten.bestellung.positionen[0].typId, 'zimmer')
  assert.equal(a.daten.bestellung.summeChf, 300)
  // Beim Lesen bleibt sie im Angebot: Von Hand erfasste Katalogware ueberspringt nichts.
  const liste = (await ruf({ method: 'GET', cookie })).daten.bestellungen
  assert.equal(liste.find((b) => b.id === a.daten.bestellung.id).status, 'offerte')
  // Ohne die Angabe bleibt der Stempel weg – wie bei jeder Anfrage.
  const b = await ruf({ method: 'POST', aktion: 'erfassen', cookie, body: {
    art: 'anfrage', referenz: 'PF-ANF', kunde: { name: 'Anfrage', telefon: '079' }, positionen: [], montage: false, montageChf: 0,
  } })
  assert.equal(b.daten.bestellung.status, 'neu')
  assert.equal(b.daten.bestellung.preiseFestgelegtAm, undefined)
})

await pruefe('Rabatt auf die Bestellung: mit Wort, in der Summe, gedeckelt, ohne Betrag weg', async () => {
  const a = await ruf({ method: 'POST', aktion: 'erfassen', cookie, body: {
    art: 'anfrage', referenz: 'PF-RAB', kunde: { name: 'Rabatt', telefon: '079' },
    positionen: [{ menge: 2, bezeichnung: 'A', preisChf: 100 }], montage: true, montageChf: 30,
  } })
  const id = a.daten.bestellung.id
  let n = await ruf({ method: 'PATCH', cookie, body: { id, rabattChf: 25, rabattText: 'Kennenlernrabatt' } })
  assert.equal(n.daten.bestellung.rabattChf, 25)
  assert.equal(n.daten.bestellung.rabattText, 'Kennenlernrabatt')
  assert.equal(n.daten.bestellung.summeChf, 205, '200 + 30 − 25')
  assert.equal(n.daten.bestellung.montageChf, 30, 'die Montage ging beim Rabatt verloren')
  // Netze aendern rechnet den Rabatt weiter mit.
  n = await ruf({ method: 'PATCH', cookie, body: { id, positionen: [{ menge: 1, bezeichnung: 'A', preisChf: 100 }] } })
  assert.equal(n.daten.bestellung.summeChf, 105)
  // Mehr Rabatt als Bestellung gibt es nicht.
  n = await ruf({ method: 'PATCH', cookie, body: { id, rabattChf: 999 } })
  assert.equal(n.daten.bestellung.rabattChf, 130)
  assert.equal(n.daten.bestellung.summeChf, 0)
  // Ohne Betrag kein Rabatt – und kein Wort.
  n = await ruf({ method: 'PATCH', cookie, body: { id, rabattChf: 0 } })
  assert.equal(n.daten.bestellung.rabattChf, undefined)
  assert.equal(n.daten.bestellung.rabattText, undefined)
  assert.equal(n.daten.bestellung.summeChf, 130)
})

await pruefe('Endgueltiges Loeschen entfernt den Eintrag', async () => {
  assert.equal((await ruf({ method: 'DELETE', cookie, body: { id: 'alt-1' } })).code, 200)
  const liste = (await ruf({ method: 'GET', cookie })).daten.bestellungen
  assert.ok(!liste.some((b) => b.id === 'alt-1'))
})

await pruefe('Loeschen ohne Anmeldung wird abgewiesen', async () => {
  assert.equal((await ruf({ method: 'DELETE', body: { id: vonHand.id } })).code, 401)
})

/* --- Ergebnis ---------------------------------------------------------------- */

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
