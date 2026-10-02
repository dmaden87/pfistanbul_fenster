/**
 * Angaben ueber die Seite als Ganzes.
 *
 * Gebraucht werden sie an Stellen, die es ohne absolute Adresse nicht tut:
 * in der Vorschau eines geteilten Links, im canonical-Verweis, in der
 * sitemap.xml und in den strukturierten Daten. Innerhalb der Seite bleiben
 * Verweise relativ - hier geht es nur um die Faelle, in denen jemand von
 * aussen auf uns zeigt.
 *
 * DIESE EINE ZEILE IST DIE QUELLE. Aendert die Domain, aendert sich hier
 * genau `adresse`, danach einmal `npm run vorrendern` - Sitemap, canonical,
 * Open Graph, robots.txt und die strukturierten Daten ziehen von selbst nach.
 *
 * Die alte Adresse pfistanbul.vercel.app bleibt bestehen und leitet dauerhaft
 * hierher um. Das muss so: Auf den gedruckten Flyern steht sie im QR-Code.
 * Zwei Adressen, die beide dieselbe Seite ausliefern, waeren dagegen
 * schaedlich - sie machten sich bei Suchmaschinen gegenseitig Konkurrenz.
 */
export const site = {
  adresse: 'https://pfistanbul.ch',
  sprache: 'de-CH',
  /** Bild, das erscheint, wenn jemand den Link in einem Chat teilt. */
  vorschaubild: '/vorschau.jpg',
  vorschaubildBreite: 1200,
  vorschaubildHoehe: 630,
} as const

/**
 * Titel und Beschreibung der Startseite.
 *
 * Stehen hier und nicht in der index.html, weil sie an drei Stellen
 * gebraucht werden: im Kopf der ausgelieferten Datei, in der Vorschau eines
 * geteilten Links und zur Laufzeit, wenn jemand von einer Rechtsseite wieder
 * zurueckkommt und der Fenstertitel wieder stimmen muss.
 */
/*
 * Titel und Beschreibung der Startseite.
 *
 * FRUEHER STAND HIER "fuers Pfisterhoelzli". Das war richtig, solange die
 * Siedlung das Geschaeft war - es kostete aber jede Suche nach
 * "Insektenschutz Zuerich" den Treffer, und genau von dort kommen
 * inzwischen die meisten Anfragen. Der Name der Siedlung steht jetzt auf
 * /siedlungen, wo er hingehoert und wo ihn auch findet, wer danach sucht.
 */
export const startseite = {
  titel: 'Insektenschutz-Plissee nach Mass – Kanton Zürich | Pfistanbul Fenster',
  beschreibung:
    'Fliegengitter nach Mass für jedes Fenster: Plissee zum Auf- und Zuziehen, Aluminiumrahmen, ' +
    'meist ohne Bohren. Richtwert CHF 100–200 pro Fenster, Lieferung im Kanton Zürich. ' +
    'Für ausgemessene Siedlungen gibt es feste Preise.',
} as const

/** Die rechtlichen Seiten. Jede hat eine eigene Adresse. */
export type LegalKey = 'impressum' | 'datenschutz' | 'agb'

/** Alles, was eine eigene Adresse hat - rechtlich oder inhaltlich. */
export type SeitenSchluessel = LegalKey | 'siedlungen'

export interface Unterseite {
  schluessel: SeitenSchluessel
  pfad: string
  titel: string
  beschreibung: string
  /** Rangfolge in der sitemap.xml, 0 bis 1. Nur ein Hinweis, keine Zusage. */
  gewicht: number
}

/** Fruehere Schreibweise, damit bestehende Aufrufe weiter lesbar bleiben. */
export type Rechtsseite = Unterseite

/**
 * Die Siedlungen als eigene Seite.
 *
 * WARUM NICHT MEHR AUF DER STARTSEITE: Das Siedlungsangebot ist der
 * Sonderfall geworden, nicht der Normalfall - die meisten Anfragen kommen
 * von ausserhalb. Es bleibt vollstaendig bestehen, mitsamt Warenkorb und
 * Onlinezahlung, nur eben unter eigener Adresse. Die laesst sich drucken,
 * verschicken und verlinken: Wer einen Flyer im Briefkasten hatte, kommt
 * mit pfistanbul.ch/siedlungen direkt an sein Angebot, ohne an der neuen
 * Startseite vorbeizumuessen.
 */
export const siedlungsseite: Unterseite = {
  schluessel: 'siedlungen',
  pfad: '/siedlungen',
  titel: 'Ausgemessene Siedlungen – feste Preise ohne Ausmessen | Pfistanbul Fenster',
  beschreibung:
    'Für ausgemessene Überbauungen gibt es feste Formate, feste Preise und Sets für die ganze ' +
    'Wohnung – ohne selber zu messen. Heute: Am Pfisterhölzli, Greifensee ZH.',
  gewicht: 0.8,
}

export const rechtsseiten: Unterseite[] = [
  {
    schluessel: 'impressum',
    pfad: '/impressum',
    titel: 'Impressum – Pfistanbul Fenster',
    beschreibung:
      'Wer hinter Pfistanbul Fenster steht: Deniz Maden und Ufuk Soruklu, Am Pfisterhölzli in ' +
      'Greifensee ZH. Anschrift, Kontakt und Angaben zur Mehrwertsteuer.',
    gewicht: 0.3,
  },
  {
    schluessel: 'agb',
    pfad: '/agb',
    titel: 'Allgemeine Geschäftsbedingungen – Pfistanbul Fenster',
    beschreibung:
      'Bestellung, Lieferung, Zahlung, Rückgabe und Garantie für Insektenschutz-Plissees von ' +
      'Pfistanbul Fenster. Gerichtsstand Greifensee ZH.',
    gewicht: 0.3,
  },
  {
    schluessel: 'datenschutz',
    pfad: '/datenschutz',
    titel: 'Datenschutzerklärung – Pfistanbul Fenster',
    beschreibung:
      'Welche Daten wir bei einer Bestellung erheben, wie lange wir sie aufbewahren und welche ' +
      'Dienste dabei mitwirken.',
    gewicht: 0.3,
  },
]

/** Alle Seiten mit eigener Adresse, ausser der Startseite. */
export const unterseiten: Unterseite[] = [siedlungsseite, ...rechtsseiten]

/**
 * Die Adressen, die es wirklich gibt - und nur die. Eine sitemap.xml, die auf
 * Adressen zeigt, die mit 404 antworten, schadet mehr, als sie nuetzt.
 *
 * Warenkorb, Bestellablauf und Adminbereich haben bewusst KEINE eigene
 * Adresse: Sie haengen an Warenkorbinhalt, Anmeldung und der Rueckkehr von
 * Stripe. Jede weitere Adresse waere ein weiterer Weg, auf dem der
 * funktionierende Bestellablauf kaputtgehen kann - und zu holen gibt es dort
 * fuer eine Suchmaschine ohnehin nichts.
 */
export interface Seite {
  pfad: string
  /** Rangfolge untereinander, 0 bis 1. Nur ein Hinweis, keine Zusage. */
  gewicht: number
}

export const seiten: Seite[] = [
  { pfad: '/', gewicht: 1 },
  ...unterseiten.map((seite) => ({ pfad: seite.pfad, gewicht: seite.gewicht })),
]

/** Titel und Beschreibung zu einem Pfad. Faellt auf die Startseite zurueck. */
export function kopfdatenFuer(pfad: string) {
  const treffer = unterseiten.find((seite) => seite.pfad === pfad)
  return treffer ?? { pfad: '/', titel: startseite.titel, beschreibung: startseite.beschreibung }
}

/** Absolute Adresse zu einem Pfad. */
export function absolut(pfad: string): string {
  return `${site.adresse}${pfad === '/' ? '/' : pfad}`
}
