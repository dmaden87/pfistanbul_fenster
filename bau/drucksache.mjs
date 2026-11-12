/**
 * Was alle Drucksachen gemeinsam haben: Schriften, der Weg zum PDF und die
 * Gegenproben danach.
 *
 * WARUM EIN EIGENES MODUL: Es gibt jetzt zwei Blaetter aus denselben
 * Zahlen - das Raster (bau/referenzpreise.mjs) und die Liste
 * (bau/referenzliste.mjs). Stuende der Aufruf von Chromium in beiden, waere
 * die naechste Aenderung an einem davon still an der anderen vorbeigegangen.
 * Genauso das Raster der Masse: Zwei Blaetter, die verschiedene Formate
 * zeigen und beide "Referenzpreise" heissen, sind schlimmer als keines.
 *
 * DAS BILD-PREISBLATT FUER BORA BLEIBT DRAUSSEN. Es ist ein PNG fuer
 * WhatsApp und schneidet sich selbst zu; es teilt mit diesen beiden nur die
 * Schriften, und dafuer lohnt kein gemeinsamer Unterbau.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/*
 * Der Pfad wechselt mit jeder Playwright-Fassung - /opt/pw-browsers/chromium
 * ist ein Verweis, der immer auf die installierte zeigt. Hier stand die
 * Fassung 1194 ausgeschrieben, und als der Container auf 1243 wechselte,
 * fand kein Blatt mehr einen Browser. Dieselbe Suche wie in
 * bau/vorrendern.mjs; mit CHROMIUM=... laesst sich ein anderer angeben.
 */
export const CHROMIUM = process.env.CHROMIUM
  ?? [
    '/opt/pw-browsers/chromium',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  ].find((pfad) => existsSync(pfad))
  ?? '/opt/pw-browsers/chromium'
export const ZIEL = 'drucksachen'

/*
 * DAS RASTER DECKT AB, WAS VORKOMMT. Unter 50 cm gibt es kaum ein Fenster,
 * und ueber 200 Breite faellt ein Plissee ohnehin in die Beratung. Die
 * Schritte von zehn Zentimetern sind grob genug fuer ein Blatt und fein
 * genug zum Ablesen: Wer 137 misst, liest 140 und liegt nie zu tief, weil
 * der Preis mit der Flaeche steigt.
 */
export const BREITEN = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]
export const HOEHEN = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250]

/*
 * JE GEWEBE EIN BLATT, nicht mehr je Rahmendicke: Seit November 2026
 * kosten der schmale und der gewoehnliche Rahmen dasselbe, und was den
 * Preis bewegt, ist das Gewebe. Zwei Blaetter fuer zwei Rahmen zeigten
 * zweimal dieselben Zahlen.
 *
 * Das gewoehnliche Gewebe kommt zuerst - es ist der Normalfall, und wer
 * ein Blatt aus dem Rucksack zieht, soll es oben haben und nicht
 * blaettern.
 */
export const GEWEBE = ['normal', 'engmaschig']

/** Die Formate, an denen sich Kosten und Marge im Ueberblick ablesen lassen. */
export const ECKPUNKTE = [[100, 100], [100, 150], [100, 200], [150, 200], [200, 250]]

export const chf = (x) => x.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const flaecheM2 = (b, h) => (b / 100) * (h / 100)

export const monat = () =>
  new Date().toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })

/**
 * Eine Schrift als Daten-URL.
 *
 * latin-ext ist Pflicht: ohne sie faellt jedes ş und ğ auf eine
 * Ersatzschrift - und die Blaetter nennen tuerkische Namen.
 */
export const schrift = (datei) =>
  `url(data:font/woff2;base64,${readFileSync(`public/fonts/${datei}`).toString('base64')}) format('woff2')`

/** Der Schriftblock fuer den Kopf jeder Drucksache. */
export const schriften = () => `
  @font-face { font-family: 'Fraunces'; font-weight: 700; src: ${schrift('fraunces-normal-700-latin-ext.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 400; src: ${schrift('inter-normal-400-latin-ext.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 600; src: ${schrift('inter-normal-600-latin-ext.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 700; src: ${schrift('inter-normal-700-latin-ext.woff2')}; }`

/** Wie viele Seiten ein fertiges PDF hat. */
export function seitenZahl(pdf) {
  return (readFileSync(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length
}

/**
 * Chromium aufmachen, eine Seite laden und daran arbeiten.
 *
 * UEBER DAS DEVTOOLS-PROTOKOLL, NICHT UEBER --print-to-pdf oder
 * --screenshot. Beide Schalter haben jahrelang gereicht; seit Chromium 1243
 * kehren sie bei jeder echten Seite nicht mehr zurueck - auch nicht bei
 * einer Datei mit drei Zeilen. Das sah aus wie ein haengender Seitenaufbau
 * und war keiner: Der Browser rendert, er gibt nur nichts mehr aus.
 *
 * Dieselbe Umstellung wie in bau/vorrendern.mjs, und aus demselben Grund:
 * Was ueber das Protokoll laeuft, haengt nicht an einem Schalter, der sich
 * mit der naechsten Fassung wieder anders verhaelt.
 */
const schlafen = (ms) => new Promise((fertig) => setTimeout(fertig, ms))

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

/**
 * Laedt `quelle` in einem frischen Browser und gibt `arbeit(blatt)` zurueck.
 * `blatt.ruf` spricht das Protokoll; aufgeraeumt wird in jedem Fall.
 */
export async function imBrowser(quelle, arbeit, { breite, hoehe, massstab } = {}) {
  mkdirSync(ZIEL, { recursive: true })
  const profil = join(ZIEL, `profil-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  rmSync(profil, { recursive: true, force: true })
  mkdirSync(profil, { recursive: true })

  const browser = spawn(CHROMIUM, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profil}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] })

  try {
    let port
    for (let versuch = 0; versuch < 400 && !port; versuch += 1) {
      try {
        port = Number(readFileSync(join(profil, 'DevToolsActivePort'), 'utf8').split('\n')[0])
      } catch {
        await schlafen(50)
      }
    }
    if (!port) throw new Error('Chromium meldet keinen Port.')

    const fassung = await fetch(`http://127.0.0.1:${port}/json/version`).then((a) => a.json())
    const leitung = await verbinde(fassung.webSocketDebuggerUrl)
    const { targetId } = await leitung.ruf('Target.createTarget', { url: 'about:blank' })
    const blatt = await verbinde(`ws://127.0.0.1:${port}/devtools/page/${targetId}`)

    await blatt.ruf('Page.enable')
    if (breite && hoehe) {
      await blatt.ruf('Emulation.setDeviceMetricsOverride', {
        width: breite, height: hoehe, deviceScaleFactor: massstab ?? 1, mobile: false,
      })
    }
    await blatt.ruf('Page.navigate', { url: `file://${resolve(quelle)}` })
    /* Die Schriften stecken als Daten-URL im Dokument; kurz reicht. */
    await schlafen(1500)
    const ergebnis = await arbeit(blatt)
    blatt.zu()
    leitung.zu()
    return ergebnis
  } finally {
    browser.kill()
    /*
     * ERST WARTEN, DANN WEGRAEUMEN, und wenn es nicht klappt, stehen
     * lassen. Chromium schreibt beim Beenden noch in sein Profil; ein
     * sofortiges Loeschen scheitert mit ENOTEMPTY und riss den ganzen Lauf
     * mit - wegen eines Ordners, den niemand vermisst. Er liegt unter
     * drucksachen/ und damit ausserhalb der Versionsverwaltung.
     */
    await schlafen(300)
    try { rmSync(profil, { recursive: true, force: true }) } catch { /* bleibt liegen */ }
  }
}

/**
 * HTML zu PDF, mit zwei Gegenproben.
 *
 * DIE ERSTE: Ein PDF unter zwanzig Kilobyte hat keine Tabelle drin - so
 * sieht es aus, wenn das Rendern stehenbleibt, etwa weil eine Schrift
 * fehlt.
 *
 * DIE ZWEITE UND WICHTIGERE: die Seitenzahl. Laeuft eine Tabelle ueber,
 * schiebt der Druck die letzten Zeilen auf ein weiteres Blatt, und das
 * faellt sonst erst auf, wenn jemand mit der halben Liste am Fenster steht.
 * Beim ersten Anlauf des Rasters war genau das der Fall: vier Seiten statt
 * zwei. Wer das Blatt umbaut, soll es hier erfahren und nicht dort.
 */
export async function alsPdf({ html, name, seiten }) {
  mkdirSync(ZIEL, { recursive: true })
  const quelle = join(ZIEL, `${name}.html`)
  const pdf = join(ZIEL, `${name}.pdf`)
  writeFileSync(quelle, html)

  /* preferCSSPageSize: Format und Rand stehen im Blatt als @page. */
  const { data } = await imBrowser(quelle, (blatt) => blatt.ruf('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
  }))
  writeFileSync(pdf, Buffer.from(data, 'base64'))

  const groesse = statSync(pdf).size
  if (groesse < 20_000) {
    console.error(`${pdf} ist nur ${groesse} Bytes gross – da steht nichts drin.`)
    process.exit(1)
  }

  const gezaehlt = seitenZahl(pdf)
  if (gezaehlt !== seiten) {
    console.error(`${pdf} hat ${gezaehlt} Seiten statt ${seiten} – die Tabelle passt nicht aufs Blatt.`)
    process.exit(1)
  }

  /* HTML_BEHALTEN=1 laesst die Quelle stehen, um am Satz zu arbeiten. */
  if (!process.env.HTML_BEHALTEN) rmSync(quelle)

  return { pdf, groesse, seiten: gezaehlt }
}

/**
 * HTML zu PNG, in einem Fenster fester Groesse.
 *
 * `captureBeyondViewport` nimmt auch mit, was unter der Fensterkante liegt -
 * wer ein zu knappes Fenster setzt, bekommt sonst ein beschnittenes Bild
 * statt eines zu langen, und das faellt niemandem auf.
 */
export async function alsBild({ html, name, breite, hoehe, massstab = 2 }) {
  mkdirSync(ZIEL, { recursive: true })
  const quelle = join(ZIEL, `${name}.html`)
  const bild = join(ZIEL, `${name}.png`)
  writeFileSync(quelle, html)

  const { data } = await imBrowser(
    quelle,
    (blatt) => blatt.ruf('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }),
    { breite, hoehe, massstab },
  )
  writeFileSync(bild, Buffer.from(data, 'base64'))

  if (!process.env.HTML_BEHALTEN) rmSync(quelle)
  return { bild }
}
