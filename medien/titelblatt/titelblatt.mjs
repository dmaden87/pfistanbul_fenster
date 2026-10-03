/**
 * Baut das Titelblatt von Pfistanbul Fenster als Bilddatei.
 *
 *   node titelblatt.mjs            # alle Motive
 *   node titelblatt.mjs falten     # nur eines
 *
 * Ergebnis: titelblatt-<motiv>.jpg, A4 hoch bei 300 dpi (2480 x 3508).
 *
 * Die fertigen Blaetter liegen ANDERS ALS BEIM REEL im Repository. Zwei
 * Gruende: Sie sind klein, und sie gehen aus dem Haus – an eine Druckerei,
 * in eine Offerte, auf ein Papier. Was wir weitergeben, soll auffindbar
 * sein und nicht davon abhaengen, dass jemand Chromium in genau dieser
 * Fassung zur Hand hat. In arbeit/ bleibt nur Wegwerfzeug.
 *
 * WARUM CHROMIUM UND NICHT EIN BILDWERKZEUG: Die Schriften der Marke liegen
 * als woff2 im Projekt. Nur der Browser liest die; ImageMagick und ffmpeg
 * koennen nur TTF/OTF. Ein Titelblatt in einer anderen Schrift als die
 * Webseite waere ein fremdes Titelblatt. Denselben Weg geht das Reel.
 *
 * WARUM UEBER DAS DEVTOOLS-PROTOKOLL und nicht ueber --screenshot: Der
 * Schalter kann nur PNG. Gefragt ist eine Fotodatei, und JPEG liefert der
 * Browser nur ueber Page.captureScreenshot. Dort laesst sich ausserdem
 * `clip.scale` setzen – damit rastert Chromium die Seite in doppelter
 * Aufloesung, statt ein fertiges Bild hochzurechnen: Schrift und Linien
 * kommen echt bei 300 dpi heraus.
 */
import { execFile } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, join } from 'node:path'

const HIER = import.meta.dirname
const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const SCHRIFTEN = resolve(HIER, '../../public/fonts')
const ROH = resolve(HIER, '../roh')
const ARBEIT = join(HIER, 'arbeit')

/* A4 hoch. Die Seite wird in 150 dpi gesetzt und in doppelter Aufloesung
   aufgenommen – das ergibt 300 dpi und haelt die Zahlen im Stil lesbar. */
const B = 1240
const H = 1754
const DPI = 300

/* --- Die Motive -------------------------------------------------------------
 *
 * `pos` und `groesse` sind nach Augenschein gesetzt, nicht gerechnet: Bei
 * jedem Bild liegt das Motiv woanders, und der Verlauf unten frisst rund 45
 * Prozent der Hoehe. Wer ein Motiv austauscht, schaut sich das Ergebnis an.
 */
const MOTIVE = {
  /* Die montierte Balkontuere, mit Ufuk an der Tuere. Zeigt in einem Blick,
     was die Firma macht – deshalb das Titelblatt. Der Ausschnitt ist eng
     gezogen: Auf dem ganzen Bild stehen Velohelm, Kuehlbox und ein paar
     Schuhe herum, und die gehoeren nicht auf ein Titelblatt. */
  tuere: {
    bild: 'balkontuere-montiert-person.jpg',
    pos: '62% 34%',
    groesse: '150%',
  },
  /* Die zweite Fassung: ruhig, grafisch, ohne Person. Fuer Anlaesse, bei
     denen das Blatt neben anderen liegt und nicht erzaehlen muss. */
  falten: {
    bild: 'plissees-angelehnt-falten.jpg',
    /* NICHT `cover`: Das Bild ist fast so hoch wie A4, bei `cover` bleibt
       senkrecht nichts zu schieben – `pos` waere wirkungslos, und oben steht
       ein Streifen Zimmerdecke. Mit 124 Prozent entsteht Spielraum. */
    groesse: '124%',
    pos: '46% 64%',
  },
  /* NICHT VERWENDEN ohne neuen Ausschnitt: Auf der Schiene klebt der echte
     Aufkleber mit dem Schriftzug – und der landet neben dem gesetzten
     Schriftzug. Derselbe Name zweimal nebeneinander, in zwei Groessen. */
  schiene: {
    bild: 'unterschiene-logo.jpg',
    pos: '64% 50%',
    groesse: 'cover',
  },
}

/** Das Zeichen der Marke – dieselbe Zeichnung wie in public/favicon.svg,
 *  nur hell auf dem Bild statt dunkel auf Papier. */
const ZEICHEN = `
<svg viewBox="0 0 32 32" width="78" height="78" aria-hidden="true">
  <rect width="32" height="32" rx="7" fill="rgba(244,247,245,0.96)"/>
  <g stroke="#0f3b34" stroke-linecap="round" fill="none">
    <rect x="7.5" y="7.5" width="17" height="17" rx="2.5" stroke-width="2.6"/>
    <path d="M7.5 16h17M16 7.5v17" stroke-width="2.2"/>
  </g>
</svg>`

function seite(motiv) {
  const m = MOTIVE[motiv]
  return `<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><style>
  @font-face { font-family:'Fraunces'; src:url('file://${SCHRIFTEN}/fraunces-normal-700-latin.woff2') format('woff2'); font-weight:700; font-style:normal; font-display:block; }
  @font-face { font-family:'Fraunces'; src:url('file://${SCHRIFTEN}/fraunces-italic-600-latin.woff2') format('woff2'); font-weight:600; font-style:italic; font-display:block; }
  @font-face { font-family:'Inter'; src:url('file://${SCHRIFTEN}/inter-normal-400-latin.woff2') format('woff2'); font-weight:400; font-style:normal; font-display:block; }
  @font-face { font-family:'Inter'; src:url('file://${SCHRIFTEN}/inter-normal-600-latin.woff2') format('woff2'); font-weight:600; font-style:normal; font-display:block; }

  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${B}px; height:${H}px; background:#0d2621; }
  .blatt { position:relative; width:${B}px; height:${H}px; overflow:hidden; background:#0d2621; }

  .bild {
    position:absolute; inset:0;
    background-image:url('file://${ROH}/${m.bild}');
    background-size:${m.groesse}; background-position:${m.pos}; background-repeat:no-repeat;
    /* Leicht entsaettigt und etwas kraeftiger im Kontrast: Die Aufnahmen
       kommen aus dem Telefon und sind von Haus aus bunt. */
    filter:saturate(0.92) contrast(1.05);
  }
  /* Die Ecken ein wenig abdunkeln. Haelt den Blick auf der Mitte und laesst
     das Foto gesetzt wirken statt zufaellig. */
  .vignette {
    position:absolute; inset:0;
    background:radial-gradient(130% 95% at 50% 38%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.42) 100%);
  }
  /* Der Verlauf traegt die Schrift. Ohne ihn steht Weiss auf Weiss, und
     genau unten sitzt bei allen drei Motiven etwas Helles. */
  /* Der Verlauf traegt die Schrift. Er muss unten FAST DECKEND werden, nicht
     nur dunkel: Bei der Tuere lag Ufuks Arm hinter dem Schriftzug und war bei
     0,94 noch zu sehen – ein Schriftzug auf einem Ellbogen. Die letzte
     Spanne bleibt knapp unter 1, damit oben keine Kante entsteht. */
  .schleier {
    position:absolute; inset:auto 0 0 0; height:64%;
    background:linear-gradient(to bottom,
      rgba(13,38,33,0) 0%,
      rgba(13,38,33,0.45) 30%,
      rgba(13,38,33,0.88) 58%,
      rgba(13,38,33,0.985) 76%,
      rgba(13,38,33,0.99) 100%);
  }
  /* Oben links steht das Zeichen hell auf hell – bei allen drei Motiven ist
     dort Wand oder Decke. Ohne diesen Schleier verschwindet es. */
  .kopfschleier {
    position:absolute; inset:0 0 auto 0; height:320px;
    background:linear-gradient(to bottom, rgba(13,38,33,0.62) 0%, rgba(13,38,33,0) 100%);
  }

  .zeichen { position:absolute; left:100px; top:96px; display:block; }

  .fuss { position:absolute; left:100px; right:100px; bottom:104px; }
  .marke {
    font-family:'Fraunces', serif; font-weight:700; font-size:146px; line-height:0.98;
    letter-spacing:-0.025em; color:#f4f7f5;
  }
  .sparte {
    margin-top:14px;
    font-family:'Inter', sans-serif; font-weight:600; font-size:37px;
    letter-spacing:0.42em; text-transform:uppercase; color:#7ee0c4;
  }
  .strich { margin:52px 0 46px; width:132px; height:2px; background:rgba(126,224,196,0.55); }
  .satz {
    font-family:'Fraunces', serif; font-weight:600; font-style:italic;
    font-size:60px; line-height:1.2; color:#f4f7f5;
  }
  .zeile {
    margin-top:44px;
    font-family:'Inter', sans-serif; font-weight:400; font-size:29px; line-height:1.55;
    letter-spacing:0.01em; color:rgba(244,247,245,0.66);
  }
</style></head><body><div class="blatt">
  <div class="bild"></div>
  <div class="vignette"></div>
  <div class="kopfschleier"></div>
  <div class="schleier"></div>
  <div class="zeichen">${ZEICHEN}</div>
  <div class="fuss">
    <div class="marke">Pfistanbul</div>
    <div class="sparte">Fenster</div>
    <div class="strich"></div>
    <div class="satz">Insektenschutz-Plissee<br>nach Mass</div>
    <div class="zeile">Greifensee ZH · im ganzen Kanton Zürich · pfistanbul.ch</div>
  </div>
</div></body></html>`
}

/* --- Chromium ueber das DevTools-Protokoll ---------------------------------- */

function starte(profil) {
  const kind = execFile(CHROMIUM, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--allow-file-access-from-files', '--force-device-scale-factor=1',
    '--remote-debugging-port=0', `--user-data-dir=${profil}`,
    '--no-first-run', '--no-default-browser-check',
    'about:blank',
  ], () => {})
  return kind
}

async function hafen(profil) {
  // Chromium schreibt den gewaehlten Port in diese Datei, sobald es bereit
  // ist. Abfragen ist zuverlaessiger als eine feste Wartezeit.
  const datei = join(profil, 'DevToolsActivePort')
  for (let i = 0; i < 200; i++) {
    try {
      const [port] = readFileSync(datei, 'utf8').split('\n')
      if (port) return Number(port)
    } catch { /* noch nicht da */ }
    await new Promise((f) => setTimeout(f, 50))
  }
  throw new Error('Chromium meldet keinen Port')
}

/** Eine Verbindung zum Protokoll, mit laufender Nummer je Befehl. */
function verbinde(url) {
  const ws = new WebSocket(url)
  const offen = new Map()
  let nr = 0
  const bereit = new Promise((f, r) => { ws.onopen = () => f(); ws.onerror = r })
  ws.onmessage = (e) => {
    const n = JSON.parse(e.data)
    if (n.id && offen.has(n.id)) {
      const { f, r } = offen.get(n.id)
      offen.delete(n.id)
      n.error ? r(new Error(n.error.message)) : f(n.result)
    }
  }
  return {
    bereit,
    async ruf(methode, params = {}) {
      await bereit
      const id = ++nr
      return new Promise((f, r) => { offen.set(id, { f, r }); ws.send(JSON.stringify({ id, method: methode, params })) })
    },
    zu: () => ws.close(),
  }
}

/* --- JPEG: die Aufloesung in den Dateikopf schreiben ------------------------
 *
 * Chromium legt JFIF mit "1:1 ohne Einheit" an. Dann weiss kein Druckprogramm,
 * wie gross das Bild sein soll, und legt 72 dpi zugrunde – aus A4 wird ein
 * Plakat. Die drei Zahlen stehen an fester Stelle im APP0-Segment.
 */
function dichteSetzen(jpeg, dpi) {
  for (let i = 2; i < jpeg.length - 1; ) {
    if (jpeg[i] !== 0xff) { i++; continue }
    const kennung = jpeg[i + 1]
    if (kennung === 0xd8 || kennung === 0x01 || (kennung >= 0xd0 && kennung <= 0xd7)) { i += 2; continue }
    const laenge = jpeg.readUInt16BE(i + 2)
    if (kennung === 0xe0 && jpeg.toString('latin1', i + 4, i + 8) === 'JFIF') {
      jpeg[i + 11] = 1                      // Einheit: Punkte pro Zoll
      jpeg.writeUInt16BE(dpi, i + 12)       // waagrecht
      jpeg.writeUInt16BE(dpi, i + 14)       // senkrecht
      return jpeg
    }
    if (kennung === 0xda) break             // ab hier kommen die Bilddaten
    i += 2 + laenge
  }
  // Kein JFIF-Segment: eines einsetzen, direkt hinter dem Dateianfang.
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
    0x01, 0x02, 0x01, dpi >> 8, dpi & 0xff, dpi >> 8, dpi & 0xff, 0x00, 0x00])
  return Buffer.concat([jpeg.subarray(0, 2), app0, jpeg.subarray(2)])
}

/* --- Ablauf ----------------------------------------------------------------- */

const gewuenscht = process.argv.slice(2)
const motive = gewuenscht.length ? gewuenscht : Object.keys(MOTIVE)
for (const motiv of motive) {
  if (!MOTIVE[motiv]) throw new Error(`Unbekanntes Motiv: ${motiv}. Da sind: ${Object.keys(MOTIVE).join(', ')}`)
}

mkdirSync(ARBEIT, { recursive: true })
const profil = join(ARBEIT, 'browserprofil')
rmSync(profil, { recursive: true, force: true })
mkdirSync(profil, { recursive: true })

const kind = starte(profil)
const port = await hafen(profil)
const browser = await fetch(`http://127.0.0.1:${port}/json/version`).then((a) => a.json())
const sitzung = verbinde(browser.webSocketDebuggerUrl)

const { targetId } = await sitzung.ruf('Target.createTarget', { url: 'about:blank' })
const seiteWs = verbinde(`ws://127.0.0.1:${port}/devtools/page/${targetId}`)
await seiteWs.ruf('Page.enable')
await seiteWs.ruf('Emulation.setDeviceMetricsOverride', {
  width: B, height: H, deviceScaleFactor: 1, mobile: false,
})

for (const motiv of motive) {
  const html = join(ARBEIT, `${motiv}.html`)
  writeFileSync(html, seite(motiv))
  await seiteWs.ruf('Page.navigate', { url: `file://${html}` })

  // Auf Schriften UND Bild warten. Allein die Ladeanzeige reicht nicht: Das
  // Hintergrundbild steht im Stil, und Schriften mit font-display:block
  // kommen spaeter. Kaeme der Schnappschuss zu frueh, waere die Schrift die
  // Ersatzschrift und das Foto ein gruenes Rechteck.
  await new Promise((f) => setTimeout(f, 400))
  await seiteWs.ruf('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      await document.fonts.ready
      const bild = new Image()
      bild.src = getComputedStyle(document.querySelector('.bild')).backgroundImage.slice(5, -2)
      if (!bild.complete) await bild.decode()
      await new Promise((f) => requestAnimationFrame(() => requestAnimationFrame(f)))
    })()`,
  })

  const { data } = await seiteWs.ruf('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 96,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: B, height: H, scale: 2 },
  })
  const ziel = join(HIER, `titelblatt-${motiv}.jpg`)
  writeFileSync(ziel, dichteSetzen(Buffer.from(data, 'base64'), DPI))
  const kb = Math.round(readFileSync(ziel).length / 1024)
  console.log(`${ziel}  ${B * 2} x ${H * 2} · ${DPI} dpi · ${kb} kB`)
}

seiteWs.zu()
sitzung.zu()
kind.kill()
