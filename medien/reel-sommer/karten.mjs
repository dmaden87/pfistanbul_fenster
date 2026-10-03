/**
 * Rendert die Textkarten des Reels in Chromium.
 *
 * WARUM NICHT drawtext von ffmpeg: Das kann nur TTF/OTF, und unsere Schriften
 * liegen als woff2 im Projekt. Der Browser liest sie, kann Ligaturen,
 * Sperrung und Schattenverlaeufe – und es ist dieselbe Schrift wie auf der
 * Webseite. Eine Werbung in einer anderen Schrift als die Seite, auf die sie
 * fuehrt, ist eine fremde Werbung.
 *
 * Die Textkarten sind durchsichtig und werden spaeter ueber das Bild gelegt.
 * Der Abspann ist deckend.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const SCHRIFTEN = resolve(import.meta.dirname, '../../public/fonts')
const B = 1080
const H = 1920

/*
 * Der sichere Bereich von Instagram: oben verdeckt nichts, unten liegen
 * Name, Bildunterschrift und Knoepfe. Text gehoert deshalb nach OBEN –
 * zwischen 240 und etwa 900 Pixel ist er auf jedem Geraet zu lesen.
 */
const OBEN = 300

const KOPF = `
<meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Fraunces';
    src: url('file://${SCHRIFTEN}/fraunces-normal-700-latin.woff2') format('woff2');
    font-weight: 700; font-style: normal; font-display: block;
  }
  @font-face {
    font-family: 'Fraunces';
    src: url('file://${SCHRIFTEN}/fraunces-italic-600-latin.woff2') format('woff2');
    font-weight: 600; font-style: italic; font-display: block;
  }
  @font-face {
    font-family: 'Inter';
    src: url('file://${SCHRIFTEN}/inter-normal-400-latin.woff2') format('woff2');
    font-weight: 400; font-style: normal; font-display: block;
  }
  @font-face {
    font-family: 'Inter';
    src: url('file://${SCHRIFTEN}/inter-normal-600-latin.woff2') format('woff2');
    font-weight: 600; font-style: normal; font-display: block;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${B}px; height: ${H}px; }
  body { background: transparent; }
  .blatt { position: relative; width: ${B}px; height: ${H}px; overflow: hidden; }
  /*
   * Der Schleier. Ohne ihn verschwindet weisse Schrift im hellen Himmel und
   * im weissen Fensterrahmen - und genau dort steht sie.
   */
  .schleier {
    position: absolute; inset: 0 0 auto 0; height: 1000px;
    background: linear-gradient(to bottom, rgba(10,20,18,0.82) 0%, rgba(10,20,18,0.55) 50%, rgba(10,20,18,0) 100%);
  }
  .text { position: absolute; left: 90px; right: 90px; top: ${OBEN}px; }
  .zeile {
    font-family: 'Fraunces', serif; font-weight: 700;
    font-size: 104px; line-height: 1.05; letter-spacing: -0.01em;
    color: #ffffff; text-shadow: 0 4px 24px rgba(0,0,0,0.45);
  }
  .zeile--kursiv { font-weight: 600; font-style: italic; color: #7ee0c4; }
  .unter {
    margin-top: 28px;
    font-family: 'Inter', sans-serif; font-weight: 400;
    font-size: 40px; line-height: 1.35; color: rgba(255,255,255,0.92);
    text-shadow: 0 2px 14px rgba(0,0,0,0.5);
  }
</style>`

/** Eine durchsichtige Textkarte: grosse Zeile, darunter eine kleine. */
function textkarte({ zeile, kursiv, unter }) {
  return `<!doctype html><html>${KOPF}<body><div class="blatt">
    <div class="schleier"></div>
    <div class="text">
      <div class="zeile">${zeile}</div>
      ${kursiv ? `<div class="zeile zeile--kursiv">${kursiv}</div>` : ''}
      ${unter ? `<div class="unter">${unter}</div>` : ''}
    </div>
  </div></body></html>`
}

/**
 * Der Abspann. Deckend, in den Farben der Seite – dunkles Gruen, Minze,
 * dieselbe Anzeigeschrift. Der Preis steht klein und zuletzt: Er ist die
 * Randbemerkung, nicht das Argument.
 */
function abspann() {
  return `<!doctype html><html>${KOPF}<style>
    /*
     * Die Farbe gehoert auf html UND body, nicht nur auf das Blatt: Chromium
     * liefert den Schnappschuss ein paar Pixel hoeher als die Seite, und
     * darunter stand sonst ein weisser Streifen - im fertigen Film ein
     * Blitzer am Ende.
     */
    html, body { background: #10302b; }
    .blatt { background: #10302b; }
    .mitte {
      position: absolute; left: 90px; right: 90px; top: 560px; text-align: center;
    }
    .marke {
      font-family: 'Fraunces', serif; font-weight: 700; font-size: 124px;
      line-height: 1.0; color: #f4f7f5; letter-spacing: -0.015em;
    }
    .zusatz {
      margin-top: 18px;
      font-family: 'Inter', sans-serif; font-weight: 600; font-size: 40px;
      letter-spacing: 0.38em; text-transform: uppercase; color: #7ee0c4;
    }
    .satz {
      margin-top: 72px;
      font-family: 'Fraunces', serif; font-weight: 600; font-style: italic;
      font-size: 60px; line-height: 1.25; color: #f4f7f5;
    }
    .fuss {
      position: absolute; left: 90px; right: 90px; top: 1180px; text-align: center;
      font-family: 'Inter', sans-serif; font-weight: 400; font-size: 34px;
      line-height: 1.5; color: rgba(244,247,245,0.62);
    }
    .strich {
      position: absolute; left: 50%; top: 1120px; width: 120px; height: 2px;
      margin-left: -60px; background: rgba(126,224,196,0.5);
    }
  </style><body><div class="blatt">
    <div class="mitte">
      <div class="marke">Pfistanbul</div>
      <div class="zusatz">Fenster</div>
      <div class="satz">Insektenschutz<br>nach Mass</div>
    </div>
    <div class="strich"></div>
    <div class="fuss">
      Greifensee ZH · wir messen gratis aus<br>
      ab CHF 100 pro Fenster · pfistanbul.ch
    </div>
  </div></body></html>`
}

const ordner = mkdtempSync(join(tmpdir(), 'karten-'))

function rendere(name, html, durchsichtig = true) {
  const seite = join(ordner, `${name}.html`)
  writeFileSync(seite, html)
  execFileSync(CHROMIUM, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--force-device-scale-factor=1',
    `--window-size=${B},${H}`,
    // Ohne Wartezeit sind die Schriften noch nicht geladen und der Text
    // kaeme in der Ersatzschrift heraus - derselbe Grund wie in bau/vorschau.mjs.
    '--virtual-time-budget=4000',
    ...(durchsichtig ? ['--default-background-color=00000000'] : []),
    `--screenshot=${name}.png`,
    `file://${seite}`,
  ], { stdio: 'ignore' })
  console.log(`${name}.png`)
}

rendere('text-1', textkarte({ zeile: 'D’Türe blibt', kursiv: 'offe.', unter: 'Den ganzen Sommer.' }))
/*
 * ZEILE UND BILD MUESSEN ZUSAMMENPASSEN. Hier stand "Du gsehsch es chuum."
 * ueber einer Makroaufnahme, auf der man jeden einzelnen Faden sieht - der
 * Text sagte das Gegenteil des Bildes. Jetzt benennt er, was zu sehen ist,
 * und die Pointe kommt in der zweiten Zeile.
 */
rendere('text-2', textkarte({ zeile: 'Feines Gewebe.', kursiv: 'Vo wiitem<br>unsichtbar.' }))
rendere('text-3', textkarte({ zeile: 'Nach Mass.', kursiv: 'Für jedes Fenster.', unter: 'Wir messen bei dir aus – gratis.' }))
/*
 * DIE UMBRUECHE STEHEN VON HAND DRIN. Dem Browser ueberlassen, brach
 * "Alles andere bliibt dusse." nach dem vorletzten Wort um - die letzte
 * Zeile bestand aus einem einzigen Wort und sah aus wie ein Versehen.
 */
rendere('text-4', textkarte({ zeile: 'Luft ine.', kursiv: 'Alles andere<br>bliibt dusse.' }))
rendere('abspann', abspann(), false)
