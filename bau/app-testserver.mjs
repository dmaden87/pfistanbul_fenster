/**
 * Testumgebung fuer die App «PF Admin» – ohne Handy, ohne APK.
 *
 * Startet einen Server auf http://localhost:8090, der
 *   - die App als Web-Fassung ausliefert (app/dist-web, siehe unten), und
 *   - die echten Handler aus api/ ausfuehrt: im Demo-Modus, mit den
 *     Beispielauftraegen aus api/_demo.ts und einem Speicher im
 *     Arbeitsspeicher statt Upstash.
 *
 * Wozu: Jede neue Fassung der App als APK zu bauen und aufs Telefon zu
 * spielen, kostet eine Viertelstunde. So laesst sich jeder Bildschirm hier
 * durchklicken und fotografieren (bau/app-bildschirme.mjs), und gebaut wird
 * gesammelt fuer ein Release.
 *
 * Aufruf:
 *   cd app && npm run web:bauen && npm run testserver
 * Fuer den Offerte-Link (/offerte/<geheim>) zusaetzlich im Hauptordner
 * `npx vite build` – der Server nimmt die Seite aus dist/.
 *
 * Nicht dasselbe wie das Telefon: PDF teilen, WhatsApp und der Datumswaehler
 * gibt es im Browser nicht. Was davon abhaengt, prueft der Emulator-Test
 * im Release-Lauf.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

// Die beiden Riegel aus api/_demo.ts – hier absichtlich geoeffnet.
process.env.VERCEL_ENV = 'development'
process.env.VERCEL_GIT_COMMIT_REF = 'lokal-demo'
process.env.ADMIN_PASSWORT ??= 'testpasswort'
process.env.KV_REST_API_URL = 'http://speicher-attrappe'
process.env.KV_REST_API_TOKEN = 'attrappe'

/* --- Speicher im Arbeitsspeicher (wie in bau/bestellungen-test.mjs) -------- */

const tabellen = new Map()
function befehlAusfuehren([befehl, schluessel, ...rest]) {
  const tabelle = tabellen.get(schluessel) ?? new Map()
  tabellen.set(schluessel, tabelle)
  switch (befehl) {
    case 'HSET':
      tabelle.set(rest[0], rest[1])
      return 1
    case 'HGET':
      return tabelle.get(rest[0]) ?? null
    case 'HGETALL':
      return [...tabelle].flat()
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
      throw new Error(`Unbekannter Befehl: ${befehl}`)
  }
}
const echtesFetch = globalThis.fetch
globalThis.fetch = async (url, optionen) => {
  if (String(url).startsWith(process.env.KV_REST_API_URL)) {
    return new Response(JSON.stringify({ result: befehlAusfuehren(JSON.parse(optionen.body)) }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return echtesFetch(url, optionen)
}

const handler = {
  bestellungen: (await import('../api/bestellungen.ts')).default,
  auslagen: (await import('../api/auslagen.ts')).default,
  abrechnungen: (await import('../api/abrechnungen.ts')).default,
}

/* --- Node-Anfrage → Vercel-Anfrage ------------------------------------------ */

async function koerper(req) {
  let text = ''
  for await (const teil of req) text += teil
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function vercelAntwort(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (daten) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(daten))
    return res
  }
  res.send = (daten) => {
    res.end(typeof daten === 'string' || Buffer.isBuffer(daten) ? daten : JSON.stringify(daten))
    return res
  }
  return res
}

const TYPEN = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' }
const WEB = new URL('../app/dist-web/', import.meta.url).pathname
// Die Webseite (npm run build) – fuer den Offerte-Link /offerte/<geheim>.
const SEITE = new URL('../dist/', import.meta.url).pathname

async function datei(pfad, res) {
  const sicher = normalize(pfad).replace(/^(\.\.[/\\])+/, '')
  const kandidaten = sicher.startsWith('/offerte/')
    ? [join(SEITE, 'offerte.html')]
    : [join(WEB, sicher), join(SEITE, sicher), join(WEB, `${sicher}.html`), join(WEB, 'index.html')]
  for (const kandidat of kandidaten) {
    try {
      if ((await stat(kandidat)).isFile()) {
        res.setHeader('Content-Type', TYPEN[extname(kandidat)] ?? 'application/octet-stream')
        return res.end(await readFile(kandidat))
      }
    } catch {
      // naechster Kandidat
    }
  }
  res.statusCode = 404
  res.end('Nicht gefunden – app/dist-web fehlt? Siehe Kopf dieser Datei.')
}

const port = Number(process.env.PORT ?? 8090)
createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`)
  const name = url.pathname.match(/^\/api\/([a-z-]+)$/)?.[1]
  if (name && handler[name]) {
    const anfrage = Object.assign(req, { query: Object.fromEntries(url.searchParams), body: await koerper(req) })
    try {
      await handler[name](anfrage, vercelAntwort(res))
    } catch (f) {
      console.error(f)
      if (!res.headersSent) res.statusCode = 500
      res.end(String(f))
    }
    console.log(`${req.method} ${url.pathname}${url.search} → ${res.statusCode}`)
    return
  }
  await datei(decodeURIComponent(url.pathname), res)
}).listen(port, () => console.log(`App-Testserver: http://localhost:${port}  (Demo-Daten, Passwort ${process.env.ADMIN_PASSWORT})`))
