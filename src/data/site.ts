/**
 * Angaben ueber die Seite als Ganzes.
 *
 * Gebraucht werden sie an Stellen, die es ohne absolute Adresse nicht tut:
 * in der Vorschau eines geteilten Links, im canonical-Verweis, in der
 * sitemap.xml und in den strukturierten Daten. Innerhalb der Seite bleiben
 * Verweise relativ - hier geht es nur um die Faelle, in denen jemand von
 * aussen auf uns zeigt.
 *
 * WENN EINE EIGENE DOMAIN DAZUKOMMT: Nur `adresse` aendern und einmal neu
 * bauen. Alles Weitere leitet sich daraus ab. Solange Flyer und QR-Code auf
 * die Vercel-Adresse zeigen, bleibt sie stehen - zwei Adressen fuer dieselbe
 * Seite waeren fuer Suchmaschinen schlechter als eine unschoene.
 */
export const site = {
  adresse: 'https://pfistanbul.vercel.app',
  sprache: 'de-CH',
  /** Bild, das erscheint, wenn jemand den Link in einem Chat teilt. */
  vorschaubild: '/vorschau.jpg',
  vorschaubildBreite: 1200,
  vorschaubildHoehe: 630,
} as const

/**
 * Die Adressen, die es wirklich gibt.
 *
 * Heute ist das eine einzige: Die Seite ist eine Anwendung, die ihre
 * Ansichten umschaltet, ohne die Adresszeile zu aendern. Deshalb steht hier
 * auch nur "/" - eine sitemap.xml, die auf Adressen zeigt, die mit 404
 * antworten, schadet mehr, als sie nuetzt.
 *
 * Sobald die rechtlichen Seiten eigene Adressen haben, kommen sie hier dazu
 * und erscheinen von selbst in der sitemap.xml.
 */
export interface Seite {
  pfad: string
  /** Rangfolge untereinander, 0 bis 1. Nur ein Hinweis, keine Zusage. */
  gewicht: number
}

export const seiten: Seite[] = [{ pfad: '/', gewicht: 1 }]

/** Absolute Adresse zu einem Pfad. */
export function absolut(pfad: string): string {
  return `${site.adresse}${pfad === '/' ? '/' : pfad}`
}
