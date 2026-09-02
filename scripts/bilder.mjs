/**
 * Erzeugt aus den Originalfotos die Fassungen für den Browser.
 *
 * Die Originale kommen direkt aus dem Handy: rund 5700 × 4300 Pixel und
 * mehrere Megabyte pro Bild. So etwas gehört weder ins Repository noch auf
 * eine Seite, die schnell laden soll. Dieses Skript legt aus jedem Original
 * drei Breiten in drei Formaten ab (AVIF, WebP, JPEG als Rückfallebene) und
 * schreibt nebenbei die echten Bildmasse nach src/data/fotos.ts, damit im
 * Layout von Anfang an der richtige Platz reserviert ist und beim Laden
 * nichts springt.
 *
 * Zwei Dinge, die hier bewusst passieren:
 *
 * 1. `.rotate()` ohne Argument rechnet die EXIF-Orientierung in die Pixel
 *    ein. Mehrere der Fotos sind Hochformat, liegen in der Datei aber quer
 *    und tragen die Drehung nur als Vermerk. Ohne diesen Schritt lägen sie
 *    auf der Seite auf der Seite.
 * 2. sharp gibt die Metadaten standardmässig nicht weiter. Damit fallen
 *    Aufnahmeort, Gerät und Zeitpunkt weg – nichts davon geht die Besucher
 *    etwas an.
 *
 * Aufruf: npm run bilder
 */
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const QUELLE = 'bilder-original'
const ZIEL = 'public/fotos'
const BREITEN = [640, 1024, 1600]

/**
 * Aufgenommen ist mehr, als die Seite zeigt. Was hier nicht steht, ist
 * bewusst aussortiert – ein Foto muss etwas belegen, sonst kostet es nur
 * Ladezeit.
 *
 * Nicht verwendet: das Bild der beiden Rahmen auf dem Bett. Es zeigt das
 * Produkt als Gegenstand, was reizvoll wäre, spielt aber in einem
 * Kinderzimmer – mit Zeichnungen samt Namen an der Wand. Der Zuschnitt
 * `{ links: 0, oben: 0.2, breite: 1, hoehe: 0.8 }` schneidet die Wand weg,
 * übrig bleibt trotzdem ein Produkt auf einem ungemachten Bett. Wer es
 * wieder aufnehmen will, ergänzt die Zeile mit genau diesem Zuschnitt.
 *
 * `zuschnitt` versteht sich als Anteile des gedrehten Bildes (0–1).
 */
const BILDER = [
  // `drehung` in Grad, im Uhrzeigersinn. Das Fensterfoto ist aus der Hand
  // aufgenommen und haengt knapp zwei Grad; ohne Korrektur laeuft der
  // Fensterrahmen sichtbar schief durchs Bild.
  { datei: 'fenster-geschlossen.jpg', name: 'fenster-geschlossen', drehung: 1.8 },
  { datei: 'gewebe-detail.jpg', name: 'gewebe-detail' },
  { datei: 'fassade-aussen.jpg', name: 'fassade-aussen' },
  { datei: 'zimmer-storen.jpg', name: 'zimmer-storen' },
  { datei: 'team.jpg', name: 'team' },
]

/**
 * Nach einer Drehung stehen an den Ecken leere Keile. Diese Funktion liefert
 * das groesste achsenparallele Rechteck, das noch vollstaendig im gedrehten
 * Bild liegt – so bleibt kein Rand uebrig, und der Zuschnitt ist gerechnet
 * statt geraten.
 */
function groesstesRechteck(w, h, grad) {
  const a = Math.abs((grad * Math.PI) / 180)
  const sin = Math.abs(Math.sin(a))
  const cos = Math.abs(Math.cos(a))
  const laenger = Math.max(w, h)
  const kuerzer = Math.min(w, h)

  if (kuerzer <= 2 * sin * cos * laenger || Math.abs(sin - cos) < 1e-10) {
    const x = 0.5 * kuerzer
    return w >= h ? { breite: x / sin, hoehe: x / cos } : { breite: x / cos, hoehe: x / sin }
  }

  const cos2a = cos * cos - sin * sin
  return { breite: (w * cos - h * sin) / cos2a, hoehe: (h * cos - w * sin) / cos2a }
}

async function verarbeite(bild) {
  const basis = sharp(join(QUELLE, bild.datei)).rotate()

  // metadata() liefert die Masse der Datei, nicht die der gedrehten Ansicht:
  // `.rotate()` wird erst beim Schreiben ausgefuehrt. Bei den Orientierungen
  // 5 bis 8 kippt das Bild um 90 Grad, also gehoeren Breite und Hoehe
  // getauscht - sonst rechnet der Zuschnitt unten mit den falschen Zahlen.
  const roh = await sharp(join(QUELLE, bild.datei)).metadata()
  const gekippt = (roh.orientation ?? 1) >= 5
  const width = gekippt ? roh.height : roh.width
  const height = gekippt ? roh.width : roh.height

  let quelle = basis
  let w = width
  let h = height

  if (bild.drehung) {
    // Die Drehung muss vor allem Weiteren geschehen und in Pixel gegossen
    // werden, damit sich der spaetere Zuschnitt auf das gerade Bild bezieht.
    const gedreht = await basis.rotate(bild.drehung, { background: '#000000' }).toBuffer()
    const m = await sharp(gedreht).metadata()
    const r = groesstesRechteck(width, height, bild.drehung)
    w = Math.floor(r.breite)
    h = Math.floor(r.hoehe)
    quelle = sharp(gedreht).extract({
      left: Math.round((m.width - w) / 2),
      top: Math.round((m.height - h) / 2),
      width: w,
      height: h,
    })
  }

  if (bild.zuschnitt) {
    const z = bild.zuschnitt
    w = Math.round(width * z.breite)
    h = Math.round(height * z.hoehe)
    quelle = basis.extract({
      left: Math.round(width * z.links),
      top: Math.round(height * z.oben),
      width: w,
      height: h,
    })
  }

  const dateien = []
  for (const breite of BREITEN) {
    if (breite > w) continue
    const skaliert = quelle.clone().resize({ width: breite })
    await skaliert.clone().avif({ quality: 55 }).toFile(join(ZIEL, `${bild.name}-${breite}.avif`))
    await skaliert.clone().webp({ quality: 72 }).toFile(join(ZIEL, `${bild.name}-${breite}.webp`))
    await skaliert.clone().jpeg({ quality: 76, mozjpeg: true }).toFile(join(ZIEL, `${bild.name}-${breite}.jpg`))
    dateien.push(breite)
  }

  return { name: bild.name, breite: w, hoehe: h, groessen: dateien }
}

const ergebnis = []
await mkdir(ZIEL, { recursive: true })
for (const bild of BILDER) ergebnis.push(await verarbeite(bild))

const zeilen = ergebnis
  .map((r) => `  '${r.name}': { breite: ${r.breite}, hoehe: ${r.hoehe}, groessen: [${r.groessen.join(', ')}] },`)
  .join('\n')

await writeFile(
  'src/data/fotos.ts',
  `/**
 * Erzeugt von scripts/bilder.mjs – nicht von Hand ändern.
 *
 * Die Masse stammen aus den Originalen und dienen dem Seitenverhältnis, damit
 * beim Nachladen eines Bildes nichts im Layout springt.
 */
export interface FotoMasse {
  breite: number
  hoehe: number
  groessen: number[]
}

export const fotos: Record<string, FotoMasse> = {
${zeilen}
}

export type FotoName = keyof typeof fotos
`,
  'utf8',
)

console.log(`${ergebnis.length} Bilder verarbeitet:`)
for (const r of ergebnis) console.log(`  ${r.name.padEnd(22)} ${r.breite}×${r.hoehe}  Breiten ${r.groessen.join(', ')}`)
