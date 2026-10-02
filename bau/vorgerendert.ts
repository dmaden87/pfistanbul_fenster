import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { quellstand } from './quellstand.mjs'

/**
 * Setzt die vorgerenderten Seiten in den Build ein.
 *
 * WARUM ZWEI SCHRITTE: Das Vorabrendern braucht einen Browser, und auf den
 * Bauservern von Vercel gibt es keinen. Gerendert wird deshalb hier, das
 * Ergebnis liegt als fertiges HTML im Repository (Ordner `vorgerendert/`) -
 * genau wie die Flyer-PDFs und die Instagram-Bilder auch. Vercel kopiert es
 * nur noch.
 *
 * DIE GEFAHR DABEI ist eine veraltete Kopie: Aendert jemand den Code, ohne
 * neu zu rendern, traegt die ausgelieferte Datei den alten Inhalt - und zeigt
 * auf Bundle-Dateien, die es gar nicht mehr gibt. Die Seite bliebe weiss.
 *
 * FRUEHER wurde das am Namen der Bundle-Datei erkannt: Stimmte er nicht mit
 * dem ueberein, was der Build gerade erzeugte, brach der Build ab. Das war
 * ein Vergleich von Pruefsummen ZWEIER MASCHINEN - und es ging schief, sobald
 * gerendert und gebaut nicht am selben Ort geschah. Auf dem Bauserver von
 * Vercel kam derselbe Quelltext mit einem anderen Abhaengigkeitsbaum heraus,
 * also mit einem anderen Bundle-Namen; der Build scheiterte, obwohl nichts
 * veraltet war, und das Deployment blieb liegen. Von hier aus war es nicht
 * einmal zu reparieren: Man muesste eine fremde Pruefsumme treffen.
 *
 * STATTDESSEN ZWEI SACHEN:
 *
 *  - Veraltet oder nicht entscheidet ein Fingerabdruck der QUELLEN
 *    (bau/quellstand.mjs). Gleicher Quelltext, gleicher Wert - auf jedem
 *    Rechner. Passt er nicht, scheitert der Build wie bisher, und zwar
 *    ueberall gleich.
 *  - Die Verweise auf die Bundle-Dateien werden nicht verglichen, sondern
 *    auf die Dateien DIESES Builds umgeschrieben. Damit kann eine
 *    ausgelieferte Seite gar nicht mehr auf ein Bundle zeigen, das es nicht
 *    gibt - die weisse Seite ist als Fehlerbild ausgeschlossen, statt nur
 *    bemerkt zu werden.
 */

const ORDNER = 'vorgerendert'

/** Die Bundle-Dateien, auf die eine Seite verweist. */
function verweise(html: string): string[] {
  return [...html.matchAll(/\/assets\/[A-Za-z0-9._-]+/g)].map((treffer) => treffer[0]).sort()
}

/**
 * Schreibt die Verweise auf die Bundle-Dateien auf die dieses Builds um.
 *
 * Zugeordnet wird nach Dateiendung und Reihenfolge. Das traegt, solange es je
 * Endung genau eine Datei gibt - der Fall hier. Sobald der Build das Bundle
 * aufteilt, ist die Zuordnung nicht mehr eindeutig; dann wird NICHT geraten,
 * sondern der Aufrufer bekommt null und faellt auf die strenge Pruefung
 * zurueck.
 */
function verweiseUmschreiben(html: string, frisch: string[]): string | null {
  const endung = (pfad: string) => pfad.slice(pfad.lastIndexOf('.'))
  const nachEndung = new Map<string, string[]>()
  for (const datei of frisch) nachEndung.set(endung(datei), [...(nachEndung.get(endung(datei)) ?? []), datei])
  if ([...nachEndung.values()].some((liste) => liste.length > 1)) return null

  let unbekannt = false
  const neu = html.replace(/\/assets\/[A-Za-z0-9._-]+/g, (alt) => {
    const ziel = nachEndung.get(endung(alt))?.[0]
    if (!ziel) unbekannt = true
    return ziel ?? alt
  })
  return unbekannt ? null : neu
}

/** Die strukturierten Daten einer Seite, als vergleichbare Knotenliste. */
function knoten(html: string): Record<string, unknown>[] {
  const roh = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1]
  if (!roh) return []
  try {
    return (JSON.parse(roh)['@graph'] as Record<string, unknown>[]) ?? []
  } catch {
    return []
  }
}

/**
 * Die Kopfangaben einer Seite, auf ihren Kern reduziert.
 *
 * Verglichen wird nicht der Text der Tags - Browser serialisieren anders als
 * die Quelldatei -, sondern was ein Tag AUSSAGT: bei <link> das Verhaeltnis
 * und das Ziel, bei <meta> der Name und der Inhalt.
 *
 * Ausgenommen sind die Angaben, die sich pro Seite unterscheiden SOLLEN.
 * Die setzt die Anwendung zur Laufzeit (src/lib/adresse.ts), damit
 * /impressum seinen eigenen Titel und canonical-Verweis traegt.
 */
const PRO_SEITE = new Set(['canonical', 'description', 'og:title', 'og:description', 'og:url'])

function kopfangaben(html: string): string[] {
  const kopf = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? ''
  const merkmal = (tag: string) => {
    const attribut = (name: string) => new RegExp(`\\b${name}=["']([^"']*)["']`, 'i').exec(tag)?.[1]
    if (/^<link/i.test(tag)) {
      const rel = attribut('rel') ?? ''
      return PRO_SEITE.has(rel) ? null : `link ${rel} ${attribut('href') ?? ''} ${attribut('sizes') ?? ''}`.trim()
    }
    const name = attribut('name') ?? attribut('property') ?? ''
    if (!name || PRO_SEITE.has(name)) return null
    return `meta ${name} ${attribut('content') ?? ''}`.trim()
  }
  return [...kopf.matchAll(/<(?:link|meta)\b[^>]*>/gi)]
    .map((t) => merkmal(t[0]))
    .filter((t): t is string => t !== null)
    .sort()
}

export function vorgerendertEinsetzen(): Plugin {
  return {
    name: 'pfistanbul-vorgerendert',
    apply: 'build',

    async closeBundle() {
      // Beim Rendern selbst muss das hier ausbleiben, sonst rendern wir das
      // Ergebnis des letzten Laufs erneut statt der frischen Huelle.
      if (process.env.PFISTANBUL_VORRENDERN === '1') {
        this.warn('Vorgerenderte Seiten werden diesmal nicht eingesetzt (Renderlauf).')
        return
      }

      const ziel = 'dist'
      const frisch = verweise(await readFile(join(ziel, 'index.html'), 'utf8'))

      /*
       * Erste Probe, und die einzige, die ueber "veraltet" entscheidet: Sind
       * die Quellen noch dieselben wie beim Rendern? Der Wert haengt nur an
       * den Dateien, nicht an der Maschine - deshalb faellt diese Probe hier
       * und auf dem Bauserver gleich aus.
       */
      let stand: { quelle?: string } = {}
      try {
        stand = JSON.parse(await readFile(join(ORDNER, 'stand.json'), 'utf8')) as { quelle?: string }
      } catch {
        throw new Error(
          `${ORDNER}/stand.json fehlt. Ohne diese Datei laesst sich nicht feststellen, ob die ` +
            'vorgerenderten Seiten noch zum Code passen. Bitte `npm run vorrendern` ausfuehren.',
        )
      }
      const jetzt = await quellstand()
      if (stand.quelle !== jetzt) {
        throw new Error(
          `Die vorgerenderten Seiten stammen von einem anderen Stand des Quelltextes ` +
            `(abgelegt ${String(stand.quelle).slice(0, 12)}, jetzt ${jetzt.slice(0, 12)}). ` +
            'Sie wuerden den alten Inhalt ausliefern. Bitte `npm run vorrendern` ausfuehren und neu einchecken.',
        )
      }

      let dateien: string[]
      try {
        dateien = (await readdir(ORDNER)).filter((name) => name.endsWith('.html'))
      } catch {
        throw new Error(
          `Der Ordner ${ORDNER}/ fehlt. Ohne ihn haben Impressum, AGB und Datenschutz keine ` +
            'eigene Adresse. Einmal `npm run vorrendern` ausfuehren und das Ergebnis mit einchecken.',
        )
      }
      if (dateien.length === 0) throw new Error(`${ORDNER}/ ist leer. Bitte \`npm run vorrendern\` ausfuehren.`)

      /*
       * Zweite Probe, und sie hat ihren Preis in Lehrgeld: Die Verweisprobe
       * allein reicht NICHT. Aendert man nur die erzeugten Kopfdaten - etwa
       * die strukturierten Daten in maschinenlesbar.ts -, bleiben die
       * Bundle-Namen gleich. Die veraltete Kopie ueberschrieb dann still die
       * frische, und die Korrektur landete nie auf der Seite. Aufgefallen ist
       * es nur, weil eine andere Pruefung nach den Bildern fragte.
       *
       * Verglichen wird deshalb auch der Inhalt: Jeder Knoten der abgelegten
       * Seite muss unveraendert im frischen Build vorkommen. Rechtsseiten
       * tragen bewusst nur einen Teil des Graphen - deshalb "enthalten" und
       * nicht "gleich".
       */
      const frischesIndex = await readFile(join(ziel, 'index.html'), 'utf8')
      const frischeKnoten = new Set(knoten(frischesIndex).map((k) => JSON.stringify(k)))
      const frischerKopf = kopfangaben(frischesIndex)

      for (const name of dateien) {
        const abgelegt = await readFile(join(ORDNER, name), 'utf8')
        /*
         * Die Verweise auf dieses Bundle umbiegen. Die Quellen stimmen laut
         * Fingerabdruck; was sich unterscheiden kann, sind allein die Namen
         * der Bundle-Dateien, und die sind mechanisch.
         */
        const umgeschrieben = verweiseUmschreiben(abgelegt, frisch)
        if (umgeschrieben === null) {
          throw new Error(
            `${ORDNER}/${name} laesst sich nicht auf dieses Bundle umschreiben: Die Seite verweist auf ` +
              `${verweise(abgelegt).join(', ') || '(nichts)'}, dieser Build erzeugt ${frisch.join(', ')}. ` +
              'Vermutlich ist das Bundle neu aufgeteilt - die Zuordnung muss dann in bau/vorgerendert.ts ' +
              'nachgezogen werden.',
          )
        }
        const html = umgeschrieben

        /*
         * Dritte Probe. Die ersten beiden griffen nicht, als nur die
         * Kopfangaben wechselten - beim Ergaenzen der Symbole blieben
         * Bundle-Namen und strukturierte Daten gleich, und die veraltete
         * Kopie waere ohne die neuen Verweise ausgeliefert worden.
         */
        const fehlend = frischerKopf.filter((eintrag) => !kopfangaben(html).includes(eintrag))
        if (fehlend.length > 0) {
          throw new Error(
            `${ORDNER}/${name} fehlen Kopfangaben aus diesem Build: ${fehlend.join(' | ')}. ` +
              'Bitte `npm run vorrendern` ausfuehren und neu einchecken.',
          )
        }

        const fremd = knoten(html).filter((k) => !frischeKnoten.has(JSON.stringify(k)))
        if (fremd.length > 0) {
          const namen = fremd.map((k) => (k.name as string) ?? (k['@type'] as string)).join(', ')
          throw new Error(
            `${ORDNER}/${name} hat veraltete strukturierte Daten (${namen}). Dieser Build erzeugt ` +
              'andere. Bitte `npm run vorrendern` ausfuehren und neu einchecken.',
          )
        }

        await writeFile(join(ziel, name), html)
      }
    },
  }
}
