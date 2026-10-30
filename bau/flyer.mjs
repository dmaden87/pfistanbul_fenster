/**
 * Der Flyer fuer WhatsApp, als Bild.
 *
 * Aufruf: npm run flyer
 *
 * Heraus kommt drucksachen/flyer.png, 1080 x 1350 - das Hochformat, das
 * WhatsApp in der Unterhaltung ganz zeigt, ohne es zu beschneiden. Wer ein
 * quadratisches oder breites Bild schickt, bekommt im Chat einen Streifen
 * und muss darauf tippen, damit jemand den Text liest.
 *
 * DAS BILD TRAEGT DIE AUSSAGE, nicht der Text. Ein Fenster, durch das man
 * den Baum sieht - und davor liegt das Netz. Das ist der ganze Einwand, den
 * Leute gegen Insektenschutz haben ("dann sehe ich ja nichts mehr"), und er
 * laesst sich in einem Foto ausraeumen, wofuer drei Saetze nicht reichen.
 *
 * DER PREIS STEHT KLEIN UND UNTEN. Nicht, weil er schlecht waere, sondern
 * weil ein Flyer, der mit dem Preis anfaengt, zuerst die Frage stellt, ob
 * es zu teuer ist. Zuerst kommt, was man davon hat.
 *
 * DIE ADRESSE STEHT TROTZDEM DRAUF, obwohl Deniz den Link von Hand
 * daneben schickt: Ein Bild wird weitergeleitet, die Nachricht daneben
 * nicht. Wer es von einer Nachbarin bekommt, hat sonst nichts in der Hand.
 *
 * ES ERFINDET KEINE ZAHLEN. Spanne, Montage und Liefergebiet kommen aus
 * priceRange und shopConfig - dieselben Zahlen wie auf der Seite. Ein Flyer
 * mit einem Preis, den die Seite nicht kennt, ist schlimmer als keiner.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { priceRange } from '../src/data/catalog.ts'
import { shopConfig } from '../src/data/shopConfig.ts'
import { operator } from '../src/data/operator.ts'
import { site } from '../src/data/site.ts'
import { CHROMIUM, ZIEL, schriften } from './drucksache.mjs'

const BREITE = 1080
const HOEHE = 1350
const MASSSTAB = 2

/* Luft unter der Kante, nur zum Pruefen - sie wird weggeschnitten. */
const LUFT = 400

/*
 * DAS FOTO: ein Fenster mit geschlossenem Netz und freiem Blick nach
 * draussen. Es gibt schoenere Bilder in public/fotos - die Fassade, das
 * Team -, aber keines beantwortet die Frage, die gestellt wird.
 */
const FOTO = 'public/fotos/fenster-geschlossen-1600.jpg'

const PUNKTE = [
  ['Nach Mass gefertigt', 'Jedes Fenster wird ausgemessen, jedes Netz dafür gebaut.'],
  ['Meist ohne Bohren', 'Der Rahmen klemmt im Fensterrahmen. Für Mietwohnungen gemacht.'],
  ['Bleibt das ganze Jahr', 'Zum Auf- und Zuziehen wie eine Jalousie. Kein Ein- und Ausbauen.'],
]

const alsDaten = (pfad, typ) =>
  `data:${typ};base64,${readFileSync(pfad).toString('base64')}`

const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<style>
  ${schriften()}

  * { margin: 0; padding: 0; box-sizing: border-box; }
  /*
   * KEINE FESTE HOEHE UND KEIN FLEX AUF DEM KOERPER. Hier stand
   * height: 1350px mit overflow: hidden und .inhalt als flex: 1 - im Satz
   * sah das richtig aus, im Schnappschuss wurde die Adresszeile mitten
   * durch die Buchstaben abgeschnitten. Das Blatt waechst jetzt mit seinem
   * Inhalt; auf das Format bringt es der Zuschnitt unten, und der prueft,
   * dass nichts darunter liegen bleibt.
   */
  body {
    width: ${BREITE}px;
    font-family: 'Inter', sans-serif;
    background: #10302b; color: #f7fbf9;
    -webkit-font-smoothing: antialiased;
  }

  .bild { position: relative; height: 650px; overflow: hidden; }
  .bild img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 42%; display: block; }
  /* Der Verlauf naeht Foto und Flaeche zusammen, damit keine harte Kante bleibt. */
  .bild::after {
    content: ''; position: absolute; inset: auto 0 0 0; height: 180px;
    background: linear-gradient(to bottom, rgba(16,48,43,0), #10302b);
  }

  .inhalt {
    padding: 0 64px 52px;
    /* ueber dem Foto, sonst verschwindet der Markenname hinter dessen Kante */
    position: relative; z-index: 1;
  }

  .marke { display: flex; align-items: center; gap: 16px; margin-top: -20px; }
  .marke img { width: 62px; height: 62px; border-radius: 14px; }
  .marke-name { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 700; line-height: 1; }
  .marke-zusatz {
    font-size: 15px; font-weight: 600; letter-spacing: 0.26em;
    text-transform: uppercase; color: #7ee0c4; margin-top: 5px;
  }

  h1 {
    font-family: 'Fraunces', serif; font-size: 72px; font-weight: 700;
    line-height: 0.98; letter-spacing: -0.025em; margin-top: 28px;
  }
  h1 .akzent { color: #7ee0c4; }

  .lead { margin-top: 18px; font-size: 23px; line-height: 1.45; color: #cfe3dc; }

  .punkte { margin-top: 26px; display: flex; flex-direction: column; gap: 15px; }
  .punkt { display: flex; gap: 17px; align-items: flex-start; }
  .haken {
    flex: none; width: 29px; height: 29px; margin-top: 3px; border-radius: 50%;
    background: #7ee0c4; color: #10302b;
    font-size: 17px; font-weight: 700; line-height: 29px; text-align: center;
  }
  .punkt-titel { font-size: 23px; font-weight: 700; line-height: 1.25; }
  .punkt-text { font-size: 19px; line-height: 1.35; color: #a9c7bd; margin-top: 2px; }

  /*
   * FESTER ABSTAND, KEIN margin-top: auto. Mit auto schob der Fuss sich an
   * den unteren Rand des Kastens - und die Adresszeile landete dabei
   * ausserhalb und wurde von overflow: hidden weggeschnitten. Sichtbar war
   * das nur daran, dass sie fehlte: Auf dunklem Grund sieht ein zu kurzes
   * Blatt nicht falsch aus, sondern bloss leer.
   */
  .fuss { margin-top: 34px; padding-top: 24px; border-top: 1px solid rgba(126,224,196,0.28); }
  .preis { font-size: 20px; line-height: 1.5; color: #a9c7bd; }
  .preis strong { color: #f7fbf9; font-weight: 600; }
  .adresse {
    margin-top: 14px; display: flex; align-items: baseline; justify-content: space-between; gap: 24px;
  }
  .web { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 700; color: #7ee0c4; }
  .ort { font-size: 18px; line-height: 1.35; color: #a9c7bd; text-align: right; }
</style></head><body>
  <div class="bild"><img src="${alsDaten(FOTO, 'image/jpeg')}" alt=""></div>

  <div class="inhalt">
    <div class="marke">
      <img src="${alsDaten('public/favicon.svg', 'image/svg+xml')}" alt="">
      <div>
        <div class="marke-name">${operator.businessName.replace(' Fenster', '')}</div>
        <div class="marke-zusatz">Fenster</div>
      </div>
    </div>

    <h1>Fenster auf.<br><span class="akzent">Mücken draussen.</span></h1>

    <p class="lead">
      Insektenschutz-Plissee nach Mass – ein Netz, das in Falten in einer schmalen
      Schiene liegt. Von Freunden und Nachbarn für Freunde und Nachbarn.
    </p>

    <div class="punkte">
      ${PUNKTE.map(([titel, text]) => `
      <div class="punkt">
        <span class="haken">✓</span>
        <div>
          <div class="punkt-titel">${titel}</div>
          <div class="punkt-text">${text}</div>
        </div>
      </div>`).join('')}
    </div>

    <div class="fuss">
      <p class="preis">
        Richtwert <strong>CHF ${priceRange.minChf}–${priceRange.maxChf} pro Fenster</strong>.
        Ausmessen kostet nichts, Montage CHF ${shopConfig.montageChf} je Netz.
      </p>
      <div class="adresse">
        <span class="web">${site.adresse.replace('https://', '')}</span>
        <span class="ort">${shopConfig.serviceArea} · ${operator.people[0].zip} ${operator.people[0].city}</span>
      </div>
    </div>
  </div>
</body></html>`

mkdirSync(ZIEL, { recursive: true })
const profil = join(ZIEL, 'profil-flyer')
rmSync(profil, { recursive: true, force: true })
mkdirSync(profil, { recursive: true })
const quelle = join(ZIEL, 'flyer.html')
const bild = join(ZIEL, 'flyer.jpg')
writeFileSync(quelle, html)

/*
 * KEIN ZUSCHNITT HINTERHER. Anders als das Preisblatt hat der Flyer ein
 * festes Format - das Fenster IST das Bild. Passt der Inhalt nicht hinein,
 * soll das auffallen und nicht weggeschnitten werden.
 */
/*
 * ABSICHTLICH ZU HOCH AUFGENOMMEN. Was unter der Kante des Flyers liegt,
 * soll sichtbar sein und nicht verschwinden - nur so laesst sich pruefen,
 * ob der Inhalt hineinpasst. Zugeschnitten wird danach.
 */
const roh = join(ZIEL, 'flyer-roh.png')
execFileSync(CHROMIUM, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--user-data-dir=${profil}`, '--no-first-run',
  `--window-size=${BREITE},${HOEHE + LUFT}`, `--force-device-scale-factor=${MASSSTAB}`,
  `--screenshot=${roh}`,
  quelle,
], { stdio: ['ignore', 'ignore', 'pipe'] })

const breit = BREITE * MASSSTAB
const hoch = HOEHE * MASSSTAB

/* Unterhalb der Kante darf nichts mehr stehen - sonst schneidet der Zuschnitt es ab. */
const roheMasse = await sharp(roh).metadata()
const darunter = await (async () => {
  const puffer = await sharp(roh)
    .extract({ left: 0, top: hoch, width: breit, height: Math.min(LUFT * MASSSTAB, roheMasse.height - hoch) })
    .greyscale().raw().toBuffer()
  let hell = 0
  for (const wert of puffer) if (wert > 120) hell += 1
  return hell
})()
if (darunter > 300) {
  console.error(`Unter der Kante stehen ${darunter} helle Punkte – der Inhalt ist zu hoch fuer ${BREITE} x ${HOEHE}.`)
  process.exit(1)
}

/*
 * ALS JPEG, NICHT ALS PNG. Das halbe Blatt ist ein Foto, und PNG speichert
 * jedes Blatt Laub einzeln - fuenf Megabyte statt einem halben. WhatsApp
 * rechnet ohnehin in JPEG um; es gleich so zu liefern spart einen
 * Umweg und eine Generation Qualitaetsverlust.
 */
await sharp(roh)
  .extract({ left: 0, top: 0, width: breit, height: hoch })
  .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
  .toFile(bild)
const { width, height } = await sharp(bild).metadata()
if (width !== breit || height !== hoch) {
  console.error(`${bild} ist ${width} x ${height} statt ${breit} x ${hoch}.`)
  process.exit(1)
}

/*
 * ZWEI GEGENPROBEN AM UNTEREN RAND, und sie zielen auf verschiedene Fehler.
 *
 * DIE ERSTE: In dem Band, in dem die Adresse steht, muss Text sein. Laeuft
 * der Inhalt ueber, schiebt die Fusszeile aus dem Bild - und weil der
 * Hintergrund dunkel ist, sieht ein zu kleines Bild nicht falsch aus,
 * sondern bloss leer. Genau das ist beim ersten Anlauf passiert.
 *
 * DIE ZWEITE: Ganz unten darf KEIN Text mehr stehen. Faende sich dort
 * welcher, waere er am Rand abgeschnitten - eine halbe Zeile Adresse ist
 * schlimmer als gar keine.
 */
const band = async (von, hoch) => {
  const roh = await sharp(bild)
    .extract({ left: 0, top: von, width, height: hoch })
    .greyscale()
    .raw()
    .toBuffer()
  let hell = 0
  for (const wert of roh) if (wert > 120) hell += 1
  return hell
}

/*
 * Das Band, in dem die Adresszeile liegt. Zweimal hat dieses Blatt sie
 * verloren - einmal an margin-top: auto, einmal an einer Pruefung, die zu
 * weit unten suchte und darum nichts fand. Beide Male sah das Bild nicht
 * falsch aus, nur leer.
 */
const imFuss = await band(Math.round(height * 0.9), Math.round(height * 0.06))
if (imFuss < 1500) {
  console.error(`Im Adressband stehen nur ${imFuss} helle Punkte – die Fusszeile fehlt.`)
  process.exit(1)
}

/* Und ganz unten darf nichts mehr stehen: eine halbe Zeile ist schlimmer als keine. */
const amRand = await band(height - 40, 34)
if (amRand > 300) {
  console.error(`Am unteren Rand stehen ${amRand} helle Punkte – da wird Text abgeschnitten.`)
  process.exit(1)
}

rmSync(roh)
if (!process.env.HTML_BEHALTEN) rmSync(quelle)
rmSync(profil, { recursive: true, force: true })

console.log(`${bild} geschrieben – ${width} x ${height} Pixel, ${(statSync(bild).size / 1024).toFixed(0)} kB`)
console.log(`Spanne CHF ${priceRange.minChf}–${priceRange.maxChf} · Montage CHF ${shopConfig.montageChf} · ${shopConfig.serviceArea}`)
