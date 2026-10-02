/**
 * Der Fingerabdruck der Quellen, aus denen die vorgerenderten Seiten
 * entstehen.
 *
 * WOZU: bau/vorgerendert.ts muss erkennen, ob die abgelegten Seiten noch zum
 * Code passen. Frueher diente dafuer der Name der Bundle-Datei - der ist eine
 * Pruefsumme des fertigen Bundles. Das ging so lange gut, wie dieselbe
 * Maschine rendert und baut. Auf dem Bauserver von Vercel kommt derselbe
 * Quelltext aber mit einem anderen Abhaengigkeitsbaum heraus, und damit mit
 * einem anderen Bundle-Namen. Die Pruefung schlug dann an, obwohl nichts
 * veraltet war, und liess das Deployment scheitern.
 *
 * Dieser Fingerabdruck haengt NUR an den Dateien, die den gerenderten Inhalt
 * bestimmen. Gleicher Quelltext ergibt denselben Wert - auf jedem Rechner,
 * mit jedem Abhaengigkeitsbaum.
 */
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

/** Was in den Fingerabdruck eingeht. Alles, was den Inhalt der Seiten formt. */
const QUELLEN = ['src']
const EINZELN = ['index.html']

async function dateien(ordner) {
  const eintraege = await readdir(ordner, { withFileTypes: true })
  const raus = []
  for (const eintrag of eintraege) {
    const pfad = join(ordner, eintrag.name)
    if (eintrag.isDirectory()) raus.push(...(await dateien(pfad)))
    else raus.push(pfad)
  }
  return raus
}

/**
 * Sha256 ueber Pfad und Inhalt jeder Quelldatei, nach Pfad sortiert.
 *
 * Sortiert, weil readdir keine Reihenfolge zusichert - unsortiert kaeme auf
 * zwei Rechnern ein anderer Wert heraus, und die Pruefung waere wieder so
 * unzuverlaessig wie die alte.
 */
export async function quellstand() {
  const alle = []
  for (const ordner of QUELLEN) alle.push(...(await dateien(ordner)))
  alle.push(...EINZELN)
  alle.sort()

  const hash = createHash('sha256')
  for (const pfad of alle) {
    hash.update(pfad)
    hash.update('\0')
    hash.update(await readFile(pfad))
    hash.update('\0')
  }
  return hash.digest('hex')
}
