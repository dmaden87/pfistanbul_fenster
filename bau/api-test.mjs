/**
 * Laedt jede Serverless-Funktion unter Vercels Bedingungen.
 *
 * WARUM ES DIESEN TEST GIBT: Der Adminbereich zeigte einmal nur noch
 * "Status 500" und keine einzige Bestellung. Der Grund war kein Fehler in
 * der Logik, sondern ein Import: `api/lieferungen.ts` holte eine Funktion
 * aus `src/lib/`, und die Dateien dort importieren einander ohne
 * Dateiendung ("./bestellauftrag"). Das kann Vite, weil es buendelt. Node
 * kann es nicht – die Funktion starb beim Laden, bevor eine Zeile Code
 * lief.
 *
 * Kein anderer Test faellt darauf herein: Der Testlauf und der Probeserver
 * benutzen `bau/ts-aufloeser.mjs`, der endungslose Importe aufloest, damit
 * die Testdateien die Quellen unter src/ direkt lesen koennen. Genau diese
 * Bequemlichkeit versteckte den Fehler.
 *
 * Deshalb laedt dieser Test OHNE diesen Aufloeser: nur die Abbildung
 * .js -> .ts, die auch Vercel macht. Was hier laedt, laedt auch dort.
 */
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const hier = dirname(fileURLToPath(import.meta.url))
const apiOrdner = join(hier, '..', 'api')

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

const dateien = readdirSync(apiOrdner).filter((d) => d.endsWith('.ts'))

await pruefe('Es gibt ueberhaupt Funktionen zu pruefen', () => {
  assert.ok(dateien.length > 0, 'im Ordner api/ liegt keine einzige .ts-Datei')
})

for (const datei of dateien) {
  await pruefe(`api/${datei} laedt wie auf Vercel`, async () => {
    // Der Kindprozess laeuft ohne bau/ts-aufloeser.mjs – nur mit der
    // Abbildung .js -> .ts, so wie die Funktion spaeter wirklich startet.
    const { spawnSync } = await import('node:child_process')
    const ergebnis = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        '--import',
        pathToFileURL(join(hier, 'nur-js-endung.mjs')).href,
        '-e',
        `import(${JSON.stringify(pathToFileURL(join(apiOrdner, datei)).href)})
           .then(() => process.exit(0))
           .catch((f) => { console.error(f.code ?? '', f.message); process.exit(1) })`,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          KV_REST_API_URL: 'http://attrappe',
          KV_REST_API_TOKEN: 'attrappe',
          ADMIN_PASSWORT: 'testpasswort',
        },
      },
    )
    assert.equal(
      ergebnis.status,
      0,
      `laesst sich nicht laden:\n${(ergebnis.stderr || '').trim()}\n` +
        'Meist ein Import aus src/ oder ein relativer Import ohne .js-Endung.',
    )
  })
}

await pruefe('Keine Funktion importiert aus src/', async () => {
  // Die Zusatzpruefung sagt es deutlicher als ein ERR_MODULE_NOT_FOUND und
  // faengt auch den Fall, in dem es zufaellig einmal aufginge.
  const { readFileSync } = await import('node:fs')
  const suender = dateien.filter((d) =>
    /from\s+'\.\.\/src\//.test(readFileSync(join(apiOrdner, d), 'utf8')),
  )
  assert.deepEqual(suender, [], 'api/ darf nicht aus src/ importieren – siehe api/_einkauf.ts')
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) {
  console.error(`\n${fehler.length} fehlgeschlagen:`)
  for (const f of fehler) console.error(`  ${f}`)
  process.exit(1)
}
