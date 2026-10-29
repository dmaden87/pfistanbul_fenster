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
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
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
 * Der gewoehnliche Rahmen kommt zuerst - er ist der Normalfall, und wer ein
 * Blatt aus dem Rucksack zieht, soll ihn oben haben und nicht blaettern.
 */
export const DICKEN = ['2.8', '1.5']

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
 * HTML zu PDF, mit zwei Gegenproben.
 *
 * DIE ERSTE: Chromium meldet auch dann Erfolg, wenn es eine leere Datei
 * schreibt - etwa wenn eine Schrift fehlt und das Rendern stehenbleibt.
 *
 * DIE ZWEITE UND WICHTIGERE: die Seitenzahl. Laeuft eine Tabelle ueber,
 * schiebt der Druck die letzten Zeilen auf ein weiteres Blatt, und das
 * faellt sonst erst auf, wenn jemand mit der halben Liste am Fenster steht.
 * Beim ersten Anlauf des Rasters war genau das der Fall: vier Seiten statt
 * zwei. Wer das Blatt umbaut, soll es hier erfahren und nicht dort.
 */
export function alsPdf({ html, name, seiten }) {
  mkdirSync(ZIEL, { recursive: true })
  const profil = join(ZIEL, `profil-${name}`)
  rmSync(profil, { recursive: true, force: true })
  mkdirSync(profil, { recursive: true })

  const quelle = join(ZIEL, `${name}.html`)
  const pdf = join(ZIEL, `${name}.pdf`)
  writeFileSync(quelle, html)

  execFileSync(CHROMIUM, [
    '--headless=new', '--disable-gpu', '--no-sandbox',
    `--user-data-dir=${profil}`, '--no-first-run',
    '--no-pdf-header-footer', `--print-to-pdf=${pdf}`,
    quelle,
  ], { stdio: ['ignore', 'ignore', 'pipe'] })

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
  rmSync(profil, { recursive: true, force: true })

  return { pdf, groesse, seiten: gezaehlt }
}
