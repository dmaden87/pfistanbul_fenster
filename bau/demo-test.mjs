/**
 * Testlauf fuer api/_demo.ts – die Riegel der Testumgebung.
 *
 * WARUM DIESER TEST WICHTIGER IST, ALS ER AUSSIEHT: Der Demomodus schaltet
 * die Anmeldung des Adminbereichs ab. Waere er auf der echten Seite
 * einschaltbar, koennte jede Person die Namen, Adressen und Telefonnummern
 * unserer Nachbarn lesen. Es gibt keinen Fehler in diesem Projekt, der
 * teurer waere.
 *
 * Geprueft wird deshalb nicht der Quelltext, sondern das Verhalten: Fuer jede
 * Kombination aus Umgebung und Zweigname startet ein eigener Node-Prozess mit
 * genau diesen Umgebungsvariablen und sagt, was `demoModus` dort ergibt. Ein
 * Modul, das seine Entscheidung beim Laden trifft, laesst sich anders nicht
 * ehrlich pruefen – im selben Prozess stuende sie schon fest.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const hier = dirname(fileURLToPath(import.meta.url))

let bestanden = 0
const fehler = []

/*
 * ASYNCHRON, obwohl die ersten Pruefungen es nicht braeuchten: Zwei von ihnen
 * importieren Module und sind damit Versprechen. Ein `pruefe`, das nicht
 * wartet, zaehlt deren Fehler nicht – der Lauf meldete "5/5 bestanden" und
 * warf den Fehler erst danach als unbehandelte Ablehnung aus. Eine Pruefung,
 * die nicht rot werden kann, ist schlimmer als keine.
 */
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

/** Laedt api/_demo.ts in einem eigenen Prozess und gibt `demoModus` zurueck. */
function demoModusBei(umgebung, zweig) {
  const pfad = pathToFileURL(join(hier, '..', 'api', '_demo.ts')).href
  const ergebnis = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '-e', `import(${JSON.stringify(pfad)}).then((m) => console.log(m.demoModus))`],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        // Leerer String statt Loeschen: So laesst sich auch "nicht gesetzt"
        // vom "gesetzt, aber leer" unterscheiden, und beides muss false sein.
        VERCEL_ENV: umgebung ?? '',
        VERCEL_GIT_COMMIT_REF: zweig ?? '',
      },
    },
  )
  if (ergebnis.status !== 0) throw new Error(`Laden fehlgeschlagen: ${ergebnis.stderr.split('\n')[0]}`)
  const ausgabe = ergebnis.stdout.trim()
  assert.ok(ausgabe === 'true' || ausgabe === 'false', `unerwartete Ausgabe: ${ausgabe}`)
  return ausgabe === 'true'
}

/* --- Der erste Riegel: niemals in der Produktion ---------------------------- */

await pruefe('In der Produktion ist der Demomodus unter keinem Zweignamen an', () => {
  // Auch nicht, wenn der Zweig alles dafuer tut. Die Seite pfistanbul.ch
  // laeuft als Produktions-Deployment; hier ist Schluss.
  assert.equal(demoModusBei('production', 'claude/admin-umbau-demo'), false)
  assert.equal(demoModusBei('production', 'demo'), false)
  assert.equal(demoModusBei('production', 'claude/fliegennetze-webshop-planning-hqqsny'), false)
})

/* --- Der zweite Riegel: nur auf einem Demo-Zweig ----------------------------- */

await pruefe('Auf der Vorschau entscheidet der Zweigname', () => {
  assert.equal(demoModusBei('preview', 'claude/admin-umbau-demo'), true)
  assert.equal(demoModusBei('preview', 'demo'), true)
  assert.equal(demoModusBei('preview', 'claude/etwas/demo'), true)
  // Der Produktionszweig nicht – und er kann es nicht werden, ohne dass
  // jemand ihn umbenennt.
  assert.equal(demoModusBei('preview', 'claude/fliegennetze-webshop-planning-hqqsny'), false)
  // "demo" muss die Endung sein, nicht ein Zufall im Wort.
  assert.equal(demoModusBei('preview', 'demonstration'), false)
  assert.equal(demoModusBei('preview', 'claude/demo-umbau'), false)
})

await pruefe('Ohne Umgebungsvariablen bleibt der Demomodus aus', () => {
  // So laeuft es auf einem fremden Rechner, in einem Testlauf, in einem
  // Skript. Der sichere Zustand ist der ohne Angaben.
  assert.equal(demoModusBei(undefined, undefined), false)
  assert.equal(demoModusBei('', ''), false)
  assert.equal(demoModusBei(undefined, 'claude/admin-umbau-demo'), true, 'ohne VERCEL_ENV zaehlt der Zweig')
})

/* --- Die Tabellen koennen sich nicht vermischen ------------------------------ */

await pruefe('Die Testumgebung hat eine eigene Tabelle', async () => {
  const { TABELLE_BESTELLUNGEN, TABELLE_DEMO } = await import('../api/_speicher.ts')
  assert.notEqual(TABELLE_DEMO, TABELLE_BESTELLUNGEN)
  assert.ok(TABELLE_DEMO.includes('demo'), 'der Name soll verraten, was drinliegt')
})

/* --- Die Beispieldaten sind brauchbar --------------------------------------- */

await pruefe('Die Beispieldaten decken jede Phase ab und rechnen auf', async () => {
  const { demoSaat } = await import('../api/_demo.ts')
  const saat = demoSaat()
  assert.ok(saat.length >= 3, 'zu wenige Beispiele, um etwas durchzuklicken')

  const runde2 = (n) => Math.round(n * 100) / 100
  const ids = new Set()
  for (const b of saat) {
    assert.ok(b.id && !ids.has(b.id), `doppelte oder fehlende Id: ${b.id}`)
    ids.add(b.id)
    assert.ok(b.kunde?.name, `${b.id}: ohne Namen`)
    // Die Summe MUSS zu den Posten passen. Sonst zeigt die Testumgebung
    // Zahlen, die nicht aufgehen, und man sucht den Fehler im Code.
    const netze = runde2(b.positionen.reduce((s, p) => s + p.preisChf * p.menge, 0))
    const soll = runde2(netze + (b.montageChf ?? 0) + (b.anfahrtChf ?? 0) - (b.rabattChf ?? 0))
    assert.equal(b.summeChf, soll, `${b.id}: Summe ${b.summeChf} statt ${soll}`)
    // Jedes Netz traegt den Vorschlag des Rechners – sonst zeigte die Spalte
    // "Abweichung" einen Unterschied, den niemand gemacht hat.
    for (const p of b.positionen) assert.ok(p.richtpreisChf > 0, `${b.id}: Netz ohne Richtpreis`)
  }

  const phasen = saat.map((b) => b.status)
  for (const phase of ['neu', 'klaerung', 'offerte', 'bestellen']) {
    assert.ok(phasen.includes(phase), `keine Beispielbestellung in "${phase}"`)
  }
  /*
   * Drei im Backlog, und das ist kein Zufall: Zwei braucht ein Paket
   * ueberhaupt, der dritte ist der Nachzuegler, an dem sich "einem
   * bestehenden Paket hinzufuegen" ausprobieren laesst. Mit zweien waere
   * nach dem Buendeln nichts mehr da, was man hinzufuegen koennte.
   */
  assert.ok(
    phasen.filter((p) => p === 'bestellen').length >= 3,
    'fuer Paket UND Nachzuegler braucht es drei im Backlog',
  )
})

await pruefe('Die Beispieldaten benutzen nur Werte, die es wirklich gibt', async () => {
  /*
   * DER GRUND: In den Beispielen stand `mechanismus: 'plissee'`. Diesen Wert
   * gibt es nicht – gueltig sind "akkordeon" und "fix". Auf dem Blatt an Bora
   * erschien daraufhin das rohe Wort statt "Akkordeon, verschiebbar".
   *
   * Auffallen konnte das nur jemandem, der das Blatt liest: api/_demo.ts darf
   * nicht aus src/ importieren, also kann TypeScript die Texte dort nicht
   * pruefen. Dieser Testlauf darf es – er laeuft nicht auf Vercel.
   */
  const { demoSaat } = await import('../api/_demo.ts')
  const { MECHANISMEN, NETZFARBEN, OEFFNUNGEN, RAHMENFARBEN } = await import('../src/data/produktion.ts')
  const tabellen = {
    mechanismus: MECHANISMEN,
    netzfarbe: NETZFARBEN,
    oeffnung: OEFFNUNGEN,
    rahmenfarbe: RAHMENFARBEN,
  }
  for (const b of demoSaat()) {
    for (const p of b.positionen) {
      for (const [feld, tabelle] of Object.entries(tabellen)) {
        if (p[feld] === undefined) continue
        assert.ok(
          p[feld] in tabelle,
          `${b.id}/${p.id}: ${feld} = "${p[feld]}" gibt es nicht. Erlaubt: ${Object.keys(tabelle).join(', ')}`,
        )
      }
    }
  }
})

/* --- Ergebnis ---------------------------------------------------------------- */

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
