/**
 * Schneidet die Beitragsbilder fuer Instagram zu.
 *
 * Format 4:5, also 1080 x 1350. Das ist das hoechste Bild, das Instagram im
 * Feed ungeschnitten zeigt – ein Beitrag im Quadrat verschenkt ein Viertel
 * der Flaeche, ein noch hoeheres wird beschnitten.
 *
 * `blick` gibt an, welcher Teil des Originals erhalten bleibt: 0 ist ganz
 * oben beziehungsweise links, 1 ganz unten beziehungsweise rechts, 0.5 die
 * Mitte. Die Werte stehen hier, weil sie am Bild geprueft und nicht geraten
 * sind – bei der Fassade liegt das Hauptfenster rechts der Mitte, beim
 * Teamfoto sitzen die Gesichter oben.
 *
 * Aufruf: node instagram/erzeuge.mjs
 */
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const BREITE = 1080
const HOEHE = 1350
const QUELLE = 'public/fotos'
const ZIEL = 'instagram'

const BEITRAEGE = [
  { name: '1-fenster', datei: 'fenster-geschlossen-1600.jpg', blick: 0.5 },
  { name: '2-gewebe', datei: 'gewebe-detail-1600.jpg', blick: 0.5 },
  { name: '3-aussen', datei: 'fassade-aussen-1600.jpg', blick: 0.62 },
  { name: '5-team', datei: 'team-1600.jpg', blick: 0.32 },
]

await mkdir(ZIEL, { recursive: true })

for (const beitrag of BEITRAEGE) {
  const bild = sharp(`${QUELLE}/${beitrag.datei}`)
  const { width, height } = await bild.metadata()

  // Der groesste 4:5-Ausschnitt, der ins Original passt
  let breite = width
  let hoehe = Math.round(width * (HOEHE / BREITE))
  if (hoehe > height) {
    hoehe = height
    breite = Math.round(height * (BREITE / HOEHE))
  }

  // Bei hohen Bildern wird oben und unten geschnitten, bei breiten links und
  // rechts – `blick` entscheidet jeweils ueber die verbleibende Richtung.
  const links = Math.round((width - breite) * beitrag.blick)
  const oben = Math.round((height - hoehe) * beitrag.blick)

  await bild
    .extract({ left: links, top: oben, width: breite, height: hoehe })
    .resize(BREITE, HOEHE)
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(`${ZIEL}/beitrag-${beitrag.name}.jpg`)

  console.log(`${beitrag.name.padEnd(12)} aus ${width}×${height} → Ausschnitt ${breite}×${hoehe} bei ${beitrag.blick}`)
}
