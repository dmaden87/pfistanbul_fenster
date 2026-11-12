/**
 * Rendert die Seiten einmal fertig und legt das Ergebnis als richtiges HTML ab.
 *
 * Aufruf: npm run vorrendern
 *
 * WARUM UEBER DEN BROWSER UND NICHT SERVERSEITIG: Ein echter Browser hat ein
 * window, ein document und einen localStorage. Damit entfaellt die ganze
 * Klasse von Fehlern, an der serverseitiges Rendern sonst haengt - kein
 * "window is not defined", keine Sonderbehandlung fuer Komponenten, die beim
 * Aufbau etwas messen.
 *
 * WARUM DAS FUER MENSCHEN NICHTS AENDERT: main.tsx benutzt createRoot, nicht
 * hydrateRoot. Ein echter Browser wirft das vorgerenderte Markup also weg und
 * baut die Seite auf wie bisher. Es gibt kein Abgleichen zwischen
 * vorgerendertem und echtem Baum - und damit auch nicht die Fehlerklasse, bei
 * der beide auseinanderlaufen und es flackert oder springt. Das fertige HTML
 * ist Futter fuer Crawler; der Mensch sieht dieselbe Anwendung wie vorher.
 *
 * WARUM DAS ERGEBNIS IM REPOSITORY LIEGT: Auf den Bauservern von Vercel gibt
 * es keinen Browser. Gerendert wird deshalb hier, eingesetzt wird dort - von
 * bau/vorgerendert.ts, das auch prueft, ob die Kopie noch zum Build passt.
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, normalize } from 'node:path'
import { absolut, kopfdatenFuer, seiten } from '../src/data/site.ts'
import { quellstand } from './quellstand.mjs'

// Der Pfad wechselt mit jeder Playwright-Fassung. /opt/pw-browsers/chromium
// ist ein Verweis, der immer auf die installierte zeigt; mit CHROMIUM=...
// laesst sich ein anderer Browser angeben.
const CHROMIUM = process.env.CHROMIUM
  ?? [
    '/opt/pw-browsers/chromium',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ].find((pfad) => existsSync(pfad))
  ?? '/opt/pw-browsers/chromium'
const DIST = 'dist'
const ZIEL = 'vorgerendert'

/**
 * Ein Stueck Text, das auf der fertigen Seite stehen MUSS.
 *
 * Chromium gibt den Baum aus, sobald das Ladeereignis durch ist. React ist
 * dann in aller Regel fertig - aber "in aller Regel" reicht hier nicht: Eine
 * halb gerenderte Seite waere eine stille Verschlechterung. Faellt die Probe
 * durch, bricht der Lauf ab, statt eine leere Datei einzuchecken.
 */
const PROBE = {
  '/': 'Insektenschutz-Plissee nach Mass',
  '/siedlungen': 'Einmal ausgemessen',
  '/impressum': 'Verantwortlich für diese Website',
  '/agb': '8. Anwendbares Recht und Gerichtsstand',
  '/datenschutz': 'Welche Daten wir bearbeiten',
}

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
}

/**
 * Kleiner Server nur fuer diesen Lauf. Adressen ohne Endung bekommen die
 * index.html - so startet die Anwendung auch im Browser, bevor es die
 * vorgerenderten Dateien gibt.
 */
function serviere() {
  return createServer(async (anfrage, antwort) => {
    const pfad = decodeURIComponent(new URL(anfrage.url, 'http://x').pathname)
    const endung = pfad.includes('.') ? pfad.slice(pfad.lastIndexOf('.')) : ''
    const datei = endung ? join(DIST, normalize(pfad).replace(/^(\.\.[/\\])+/, '')) : join(DIST, 'index.html')
    try {
      const inhalt = await readFile(datei)
      antwort.setHeader('Content-Type', TYPEN[endung] ?? TYPEN['.html'])
      antwort.end(inhalt)
    } catch {
      antwort.statusCode = 404
      antwort.end('nicht gefunden')
    }
  })
}

/**
 * Strukturierte Daten auf die jeweilige Seite zuschneiden.
 *
 * Auf der Startseite steht der ganze Graph. Auf einer Rechtsseite haetten
 * Produkte und Preise nichts zu suchen: Strukturierte Daten sollen
 * beschreiben, was auf DIESER Seite steht, sonst melden Suchmaschinen zu
 * Recht einen Widerspruch. Uebrig bleiben Organisation, Website und die
 * Seite selbst - Titel, Beschreibung und canonical hat die Anwendung beim
 * Rendern bereits auf die jeweilige Seite gesetzt (src/lib/adresse.ts).
 */
function daten(html, istStartseite) {
  const muster = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  const treffer = muster.exec(html)
  if (!treffer) throw new Error('Im gerenderten HTML fehlen die strukturierten Daten.')
  if (istStartseite) return html

  const graph = JSON.parse(treffer[1])
  graph['@graph'] = graph['@graph'].filter((k) => ['Organization', 'WebSite', 'WebPage'].includes(k['@type']))
  return html.replace(muster, `<script type="application/ld+json">${JSON.stringify(graph, null, 2)}</script>`)
}

/**
 * Was der Browser zur Laufzeit selbst einhaengt, darf nicht mitgebacken
 * werden - sonst stuende es beim naechsten Aufruf zweimal da.
 */
function aufraeumen(html) {
  return html.replace(/<script[^>]*\/_vercel\/insights[^>]*><\/script>/g, '')
}

/**
 * Ruft eine Adresse im Browser auf und schreibt den fertigen Baum in eine
 * Datei.
 *
 * UEBER DAS DEVTOOLS-PROTOKOLL, NICHT UEBER --dump-dom. Der Schalter hat
 * jahrelang gereicht; mit Chromium 1243 kehrt er bei jeder echten Seite
 * nicht mehr zurueck - auch nicht bei einer Datei mit drei Zeilen, waehrend
 * about:blank weiter geht. Das sah aus wie ein haengender Seitenaufbau und
 * war keiner: Der Browser rendert, er gibt nur nichts mehr aus.
 *
 * Ueber das Protokoll fragen wir den Baum selbst ab. Das ist ein paar
 * Zeilen mehr, haengt aber nicht an einem Schalter, der sich mit der
 * naechsten Fassung wieder anders verhaelt.
 *
 * DREI FALLEN STECKEN HIER DRIN, alle haben Zeit gekostet:
 *
 * 1. NICHT synchron ausfuehren. Der kleine Server oben laeuft im selben
 *    Node-Prozess; ein execFileSync blockiert die Ereignisschleife, der
 *    Server kann waehrenddessen nichts ausliefern, und der Browser wartet auf
 *    Dateien, die nie kommen. Eine Verklemmung, die wie ein haengender
 *    Browser aussieht.
 *
 * 2. Der Port steht in DevToolsActivePort im Profilordner, nicht auf der
 *    Standardausgabe. Mit Port 0 sucht sich Chromium einen freien - zwei
 *    Laeufe nebeneinander stolpern sonst uebereinander.
 *
 * 3. Kein --virtual-time-budget: Der Schalter haengt sich an der Endlos-
 *    Animation im Hero auf. Gewartet wird stattdessen auf das Ladeereignis
 *    und danach eine kurze Weile auf React - ob wirklich alles da ist,
 *    prueft die Probe weiter unten.
 */
const schlafen = (ms) => new Promise((fertig) => setTimeout(fertig, ms))

/** Eine Verbindung zum Protokoll, mit Aufrufen, die auf ihre Antwort warten. */
async function verbinde(url) {
  const draht = new WebSocket(url)
  await new Promise((fertig, scheitern) => {
    draht.onopen = fertig
    draht.onerror = () => scheitern(new Error(`Keine Verbindung zu ${url}.`))
  })
  let nummer = 0
  const offen = new Map()
  draht.onmessage = (nachricht) => {
    const antwort = JSON.parse(nachricht.data)
    const warter = antwort.id && offen.get(antwort.id)
    if (!warter) return
    offen.delete(antwort.id)
    if (antwort.error) warter.scheitern(new Error(antwort.error.message))
    else warter.fertig(antwort.result)
  }
  return {
    ruf(methode, parameter = {}) {
      const id = ++nummer
      return new Promise((fertig, scheitern) => {
        offen.set(id, { fertig, scheitern })
        draht.send(JSON.stringify({ id, method: methode, params: parameter }))
      })
    },
    zu: () => draht.close(),
  }
}

async function starteBrowser(adresse, zieldatei) {
  const profil = join(arbeitsordner, `profil-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const browser = spawn(
    CHROMIUM,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--remote-debugging-port=0',
      `--user-data-dir=${profil}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  )
  const wecker = setTimeout(() => browser.kill('SIGKILL'), 180000)

  try {
    let port
    for (let versuch = 0; versuch < 400 && !port; versuch += 1) {
      try {
        port = Number(readFileSync(join(profil, 'DevToolsActivePort'), 'utf8').split('\n')[0])
      } catch {
        await schlafen(50)
      }
    }
    if (!port) throw new Error(`Chromium meldet keinen Port fuer ${adresse}.`)

    const fassung = await fetch(`http://127.0.0.1:${port}/json/version`).then((a) => a.json())
    const leitung = await verbinde(fassung.webSocketDebuggerUrl)
    const { targetId } = await leitung.ruf('Target.createTarget', { url: 'about:blank' })
    const blatt = await verbinde(`ws://127.0.0.1:${port}/devtools/page/${targetId}`)

    await blatt.ruf('Page.enable')
    await blatt.ruf('Page.navigate', { url: adresse })
    /* React haengt seinen Baum erst nach dem Ladeereignis ein. */
    await schlafen(2500)
    const { result } = await blatt.ruf('Runtime.evaluate', {
      returnByValue: true,
      expression: 'document.documentElement.outerHTML',
    })
    blatt.zu()
    leitung.zu()
    if (typeof result?.value !== 'string' || result.value.length < 500) {
      throw new Error(`Chromium liefert keinen Baum fuer ${adresse}.`)
    }
    await writeFile(zieldatei, `<!doctype html>\n${result.value}`, 'utf8')
  } finally {
    clearTimeout(wecker)
    browser.kill()
  }
}

// Frische Huelle bauen. Die Umgebungsvariable haelt bau/vorgerendert.ts davon
// ab, dabei das Ergebnis des letzten Laufs einzusetzen.
execFileSync('npx', ['vite', 'build'], {
  stdio: ['ignore', 'ignore', 'inherit'],
  env: { ...process.env, PFISTANBUL_VORRENDERN: '1' },
})

await mkdir(ZIEL, { recursive: true })

const arbeitsordner = await mkdtemp(join(tmpdir(), 'vorrendern-'))

const server = serviere()
await new Promise((fertig) => server.listen(0, '127.0.0.1', fertig))
const port = server.address().port

try {
  for (const seite of seiten) {
    const name = seite.pfad === '/' ? 'index' : seite.pfad.slice(1)
    /*
     * Die Ausgabe geht in eine DATEI, nicht in eine Pipe. Chromium startet
     * Kindprozesse (Zygote, Absturzbehandlung), die den Ausgabekanal erben und
     * offen halten - bei einer Pipe wartet Node danach ewig auf das Ende des
     * Stroms, obwohl der Browser laengst fertig ist. Eine Datei kennt dieses
     * Problem nicht.
     */
    const ausgabe = join(arbeitsordner, `${name}.html`)
    await starteBrowser(`http://127.0.0.1:${port}${seite.pfad}`, ausgabe)
    const roh = await readFile(ausgabe, 'utf8')

    // Der Rumpf muss den erwarteten Text tragen ...
    const erwartet = PROBE[seite.pfad]
    if (!erwartet) throw new Error(`Fuer ${seite.pfad} ist keine Probe hinterlegt.`)
    if (!roh.includes(erwartet)) {
      throw new Error(`${seite.pfad}: "${erwartet}" fehlt im Ergebnis (${roh.length} Zeichen). Nicht fertig gerendert.`)
    }

    /*
     * ... und der Kopf muss zur Seite gehoeren. Diese Probe gibt es, weil
     * genau das einmal danebenging: Der Rumpf zeigte das Impressum, der Titel
     * aber den der Startseite - ein Rennen zwischen React-Effekt und
     * Ladeereignis, das in zwei von drei Laeufen gut ausging. Seit main.tsx
     * die Kopfdaten vor dem ersten Rendern setzt, kann das nicht mehr
     * passieren; die Probe bleibt, damit es auffliegt, falls doch.
     */
    const { titel } = kopfdatenFuer(seite.pfad)
    if (!roh.includes(`<title>${titel}</title>`)) {
      const gefunden = /<title>([^<]*)<\/title>/.exec(roh)?.[1] ?? '(keiner)'
      throw new Error(`${seite.pfad}: Titel ist "${gefunden}", erwartet war "${titel}".`)
    }
    if (!roh.includes(`<link rel="canonical" href="${absolut(seite.pfad)}">`)) {
      throw new Error(`${seite.pfad}: Der canonical-Verweis zeigt nicht auf diese Seite.`)
    }

    const html = aufraeumen(daten(roh, seite.pfad === '/'))
    await writeFile(join(ZIEL, `${name}.html`), html)
    await writeFile(join(DIST, `${name}.html`), html)

    const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')
    const woerter = text.replace(/\s+/g, ' ').trim().split(' ').length
    const gezeigt = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '?'
    console.log(`${seite.pfad.padEnd(14)} → ${(name + '.html').padEnd(18)} ${String(Math.round(html.length / 1024)).padStart(3)} kB, ${String(woerter).padStart(4)} Wörter   ${gezeigt}`)
  }
  /*
   * Der Stand der Quellen, aus denen diese Seiten entstanden sind. Daran
   * erkennt bau/vorgerendert.ts spaeter, ob sie noch passen - unabhaengig
   * davon, auf welcher Maschine gebaut wird.
   */
  const quelle = await quellstand()
  await writeFile(join(ZIEL, 'stand.json'), JSON.stringify({ quelle, erzeugt: new Date().toISOString() }, null, 2) + '\n')
  console.log(`stand.json      → Quellstand ${quelle.slice(0, 12)}`)
} finally {
  server.close()
  await rm(arbeitsordner, { recursive: true, force: true })
}
