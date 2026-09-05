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
import { closeSync, openSync } from 'node:fs'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, normalize } from 'node:path'
import { kopfdatenFuer, seiten } from '../src/data/site.ts'

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
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
 * ZWEI FALLEN STECKEN HIER DRIN, beide haben Zeit gekostet:
 *
 * 1. NICHT synchron ausfuehren. Der kleine Server oben laeuft im selben
 *    Node-Prozess; ein execFileSync blockiert die Ereignisschleife, der
 *    Server kann waehrenddessen nichts ausliefern, und der Browser wartet auf
 *    Dateien, die nie kommen. Eine Verklemmung, die wie ein haengender
 *    Browser aussieht.
 *
 * 2. Die Ausgabe geht in eine DATEI, nicht in eine Pipe. Chromium startet
 *    Kindprozesse (Zygote, Absturzbehandlung), die den Ausgabekanal erben und
 *    offen halten - bei einer Pipe wartet Node danach auf ein Ende des
 *    Stroms, das nie kommt.
 *
 * Kein --virtual-time-budget: Der Schalter haengt sich an der Endlos-
 * Animation im Hero auf. Ohne ihn gibt Chromium den Baum aus, sobald das
 * Ladeereignis durch ist - ob wirklich alles da ist, prueft danach die Probe.
 */
function starteBrowser(adresse, zieldatei) {
  return new Promise((fertig, scheitern) => {
    const kanal = openSync(zieldatei, 'w')
    const browser = spawn(
      CHROMIUM,
      [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--no-first-run',
        `--user-data-dir=${join(arbeitsordner, 'profil')}`,
        '--dump-dom',
        adresse,
      ],
      { stdio: ['ignore', kanal, 'ignore'] },
    )
    const wecker = setTimeout(() => browser.kill('SIGKILL'), 180000)
    const schliessen = () => {
      clearTimeout(wecker)
      closeSync(kanal)
    }
    browser.on('error', (fehler) => {
      schliessen()
      scheitern(fehler)
    })
    browser.on('close', (code) => {
      schliessen()
      if (code === 0) fertig()
      else scheitern(new Error(`Chromium endete mit ${code} bei ${adresse}.`))
    })
  })
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
    if (!roh.includes(`<link rel="canonical" href="https://pfistanbul.vercel.app${seite.pfad === '/' ? '/' : seite.pfad}">`)) {
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
} finally {
  server.close()
  await rm(arbeitsordner, { recursive: true, force: true })
}
