/**
 * Karte und QR-Code fuer die Google-Bewertung.
 *
 * Aufruf: npm run bewertung -- "<Adresse der Google-Bewertung>"
 *
 * Heraus kommen zwei Dateien in drucksachen/:
 *   bewertung-karte.png  A6 (105 x 148 mm) bei 300 dpi, 1240 x 1748 Pixel -
 *                        die Karte, die bei der Uebergabe mitgeht
 *   bewertung-qr.png     der nackte Code fuer Aufkleber, Rechnung, Story
 *
 * DER CODE ENTSTEHT HIER, nicht bei einem Onlinedienst. Zwei Gruende: Die
 * Adresse geht niemanden etwas an, und ein Code von einem Gratisdienst ist in
 * aller Regel eine Weiterleitung ueber deren Server - die kann abgeschaltet
 * werden oder Geld kosten. Gedruckt ist gedruckt: Der Code muss in fuenf
 * Jahren noch dorthin fuehren, wohin er heute fuehrt. Deshalb steht die
 * Google-Adresse unveraendert im Code drin.
 *
 * WOHER DIE ADRESSE KOMMT: Google Unternehmensprofil oeffnen, "Rezensionen"
 * -> "Mehr Rezensionen erhalten" -> Link kopieren. Er sieht aus wie
 * https://g.page/r/XXXXXXXXXXXX/review und oeffnet direkt das Sternefenster.
 *
 * Ohne eine solche Adresse rendert die Karte mit einem Musterbalken - wie der
 * ENTWURF-Balken auf dem Blatt an Bora, und aus demselben Grund: Ein falsches
 * Ziel faellt sonst erst auf, wenn hundert Karten gedruckt sind.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import jsQR from 'jsqr'
import QRCode from 'qrcode'
import sharp from 'sharp'

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ZIEL = 'drucksachen'

// A6 (105 x 148 mm) bei 300 dpi.
const BREITE = 1240
const HOEHE = 1748

/*
 * Hoeher rendern als gebraucht und danach zuschneiden - aus demselben Grund
 * wie beim Vorschaubild: Bei einem Fenster von genau der Zielhoehe skaliert
 * Chromium die Darstellung, ohne dass etwas fehlschlaegt. Mit Luft nach unten
 * stimmt der Massstab, und der Zuschnitt ist eine reine Rechnung.
 */
const FENSTERHOEHE = 1900

const ADRESSE = process.argv[2] ?? 'https://g.page/r/BEISPIEL-NOCH-NICHT-ECHT/review'

/*
 * Die Form allein genuegt nicht: Ein Platzhalter hat dieselbe Form wie eine
 * echte Kennung. Die Adresse muss uebergeben worden sein UND darf kein
 * Platzhalterwort tragen.
 */
const ECHT = /^https:\/\/(g\.page\/r\/[\w-]+\/review|search\.google\.com\/local\/writereview\?|maps\.app\.goo\.gl\/)/
const PLATZHALTER = /beispiel|muster|xxxx|todo|placeholder/i
const istEcht = Boolean(process.argv[2]) && ECHT.test(ADRESSE) && !PLATZHALTER.test(ADRESSE)

const schrift = (datei) =>
  `url(data:font/woff2;base64,${readFileSync(`public/fonts/${datei}`).toString('base64')}) format('woff2')`

/*
 * Fehlerkorrektur H: Der Code vertraegt rund 30 Prozent Verlust. Das braucht
 * es, weil das Signet in der Mitte sitzt - und weil eine Karte, die ein Jahr
 * in der Kueche haengt, Flecken bekommt.
 */
const qrDaten = await QRCode.toDataURL(ADRESSE, {
  errorCorrectionLevel: 'H',
  margin: 0,
  scale: 20,
  color: { dark: '#0f3b34ff', light: '#ffffffff' },
})

const html = `<!doctype html>
<html lang="de-CH"><head><meta charset="utf-8">
<style>
  @font-face { font-family: 'Fraunces'; font-weight: 700; font-style: normal; src: ${schrift('fraunces-normal-700-latin.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 400; font-style: normal; src: ${schrift('inter-normal-400-latin.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 600; font-style: normal; src: ${schrift('inter-normal-600-latin.woff2')}; }
  @font-face { font-family: 'Inter'; font-weight: 700; font-style: normal; src: ${schrift('inter-normal-700-latin.woff2')}; }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  /* A6 bei 300 dpi. Der Rand ist Schnittzugabe: rund 8 mm ringsum. */
  body {
    width: 1240px; height: 1748px;
    background: #10302b; color: #f4f7f5;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden; position: relative;
    display: flex; flex-direction: column;
    padding: 118px 96px 96px;
    text-align: center;
  }

  .marke { display: flex; align-items: center; justify-content: center; gap: 20px; }
  .marke__zeichen { width: 56px; height: 56px; }
  .marke__name {
    font-family: 'Fraunces', serif; font-weight: 700;
    font-size: 38px; letter-spacing: -0.01em;
  }

  h1 {
    margin-top: 64px;
    font-family: 'Fraunces', serif; font-weight: 700;
    font-size: 116px; line-height: 0.98; letter-spacing: -0.025em;
  }
  .lead {
    margin-top: 26px;
    font-size: 34px; line-height: 1.38; color: #cfe0d9;
  }

  /* Der Code sitzt auf Weiss: Kontrast ist beim Scannen alles. */
  .code {
    margin: 56px auto 0;
    width: 720px; height: 720px;
    padding: 40px; border-radius: 32px;
    background: #ffffff;
    position: relative;
  }
  .code img { width: 100%; height: 100%; display: block; }
  /*
   * Das Signet in der Mitte deckt knapp vier Prozent der Flaeche - weit
   * innerhalb dessen, was die Fehlerkorrektur traegt.
   */
  .code__signet {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 128px; height: 128px;
    border-radius: 22px;
    border: 12px solid #ffffff;
    background: #0f3b34;
  }
  .code__signet svg { width: 100%; height: 100%; display: block; }

  .anleitung {
    margin-top: 44px;
    font-size: 32px; line-height: 1.4; color: #cfe0d9;
  }
  .anleitung strong { color: #ffffff; font-weight: 600; }

  .fuss { margin-top: auto; }
  .adresse {
    font-family: 'Fraunces', serif; font-weight: 700;
    font-size: 46px; letter-spacing: -0.02em;
  }
  .namen { margin-top: 12px; font-size: 27px; color: #8fb3a8; }
  .strich {
    margin: 26px auto 0; height: 6px; width: 140px; border-radius: 999px;
    background: #d98324;
  }

  .muster {
    position: absolute; left: -180px; right: -180px; top: 620px;
    transform: rotate(-14deg);
    padding: 22px 0;
    background: #d98324; color: #241200;
    font-size: 44px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    border-top: 4px solid #241200; border-bottom: 4px solid #241200;
  }
</style></head>
<body>
  <div class="marke">
    <svg class="marke__zeichen" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#f7fbf9"/>
      <g stroke="#10302b" stroke-linecap="round" fill="none">
        <rect x="7.5" y="7.5" width="17" height="17" rx="2.5" stroke-width="2.6"/>
        <path d="M7.5 16h17M16 7.5v17" stroke-width="2.2"/>
      </g>
    </svg>
    <span class="marke__name">Pfistanbul Fenster</span>
  </div>

  <h1>Zufrieden?</h1>
  <p class="lead">Dann sag es weiter. Es dauert eine Minute<br>und hilft uns mehr als alles andere.</p>

  <div class="code">
    <img src="${qrDaten}" alt="QR-Code zur Google-Bewertung">
    <span class="code__signet">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <g stroke="#f7fbf9" stroke-linecap="round" fill="none">
          <rect x="8.5" y="8.5" width="15" height="15" rx="2.5" stroke-width="2.4"/>
          <path d="M8.5 16h15M16 8.5v15" stroke-width="2"/>
        </g>
      </svg>
    </span>
  </div>

  <p class="anleitung">
    Kamera öffnen, Code scannen,<br><strong>Sterne vergeben.</strong>
  </p>

  ${istEcht ? '' : '<div class="muster">Muster – Adresse fehlt</div>'}

  <div class="fuss">
    <div class="adresse">pfistanbul.ch</div>
    <div class="namen">Deniz, Ufuk &amp; Bora · Greifensee</div>
    <div class="strich"></div>
  </div>
</body></html>`

// Das HTML ist Zwischenschritt, nicht Ergebnis - es liegt im Temp und geht
// nach dem Bild wieder weg.
const ordner = await mkdtemp(join(tmpdir(), 'bewertung-'))
const quelle = join(ordner, 'karte.html')
const roh = join(ordner, 'roh.png')
await writeFile(quelle, html)

execFileSync(CHROMIUM, [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  `--window-size=${BREITE},${FENSTERHOEHE}`,
  // Ohne Wartezeit sind die Schriften noch nicht geladen und der Text kaeme
  // in der Ersatzschrift heraus.
  '--virtual-time-budget=4000',
  `--screenshot=${roh}`,
  `file://${quelle}`,
])

const { width, height } = await sharp(roh).metadata()
if (width !== BREITE || height !== FENSTERHOEHE) {
  throw new Error(`Chromium lieferte ${width}×${height} statt ${BREITE}×${FENSTERHOEHE}.`)
}

const karte = await sharp(roh).extract({ left: 0, top: 0, width: BREITE, height: HOEHE }).png().toBuffer()
await rm(ordner, { recursive: true, force: true })

/*
 * Gegenprobe: den fertig gerenderten Code wieder auslesen.
 *
 * Das Signet sitzt MITTEN AUF dem Code. Die Fehlerkorrektur traegt das - aber
 * "traegt das" ist eine Annahme, und eine Annahme ist beim Drucken zu wenig.
 * Wird hier nicht genau die Adresse zurueckgelesen, die oben hineinging,
 * entsteht gar keine Datei. Eine Karte, die nicht scannt, faellt sonst erst
 * beim Kunden auf.
 *
 * Die Musterkarte nimmt die Probe nicht: Der Balken deckt den Code zu, und
 * genau das ist seine Aufgabe. Sie ist ein Entwurf zum Anschauen, kein
 * Druckstueck.
 */
if (istEcht) {
  const bild = await sharp(karte).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const gelesen = jsQR(new Uint8ClampedArray(bild.data), bild.info.width, bild.info.height)
  if (gelesen?.data !== ADRESSE) {
    throw new Error(
      `Der gerenderte Code liest sich als ${gelesen ? `"${gelesen.data}"` : 'gar nichts'}, nicht als "${ADRESSE}". Nichts geschrieben.`,
    )
  }
}

await mkdir(ZIEL, { recursive: true })
await writeFile(`${ZIEL}/bewertung-karte.png`, karte)

await QRCode.toFile(`${ZIEL}/bewertung-qr.png`, ADRESSE, {
  errorCorrectionLevel: 'H',
  margin: 2,
  scale: 24,
  color: { dark: '#0f3b34ff', light: '#ffffffff' },
})

console.log(`Adresse: ${ADRESSE}`)
if (istEcht) console.log('Gegenprobe: Der Code auf der Karte liest sich als genau diese Adresse.')
console.log(
  istEcht
    ? 'Echte Google-Adresse - die Karte ist druckbar.'
    : 'KEINE Google-Adresse - die Karte traegt den Musterbalken. Adresse als Argument uebergeben.',
)
console.log(`${ZIEL}/bewertung-karte.png (A6, 300 dpi) und ${ZIEL}/bewertung-qr.png geschrieben`)
