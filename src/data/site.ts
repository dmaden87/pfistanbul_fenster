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
 * Titel und Beschreibung der Startseite.
 *
 * Stehen hier und nicht in der index.html, weil sie an drei Stellen
 * gebraucht werden: im Kopf der ausgelieferten Datei, in der Vorschau eines
 * geteilten Links und zur Laufzeit, wenn jemand von einer Rechtsseite wieder
 * zurueckkommt und der Fenstertitel wieder stimmen muss.
 */
export const startseite = {
  titel: 'Pfistanbul Fenster – Insektenschutz nach Mass fürs Pfisterhölzli',
  beschreibung:
    'Fliegennetze für die Wohnungen im Pfisterhölzli: passgenaue Standardgrössen ab Lager, ' +
    'Plissee-Technik zum Auf- und Zuziehen, faire Preise. Sonderanfertigungen auf Anfrage.',
} as const

/** Die rechtlichen Seiten. Jede hat eine eigene Adresse. */
export type LegalKey = 'impressum' | 'datenschutz' | 'agb'

export interface Rechtsseite {
  schluessel: LegalKey
  pfad: string
  titel: string
  beschreibung: string
}

export const rechtsseiten: Rechtsseite[] = [
  {
    schluessel: 'impressum',
    pfad: '/impressum',
    titel: 'Impressum – Pfistanbul Fenster',
    beschreibung:
      'Wer hinter Pfistanbul Fenster steht: Deniz Maden und Ufuk Soruklu, Am Pfisterhölzli in ' +
      'Greifensee ZH. Anschrift, Kontakt und Angaben zur Mehrwertsteuer.',
  },
  {
    schluessel: 'agb',
    pfad: '/agb',
    titel: 'Allgemeine Geschäftsbedingungen – Pfistanbul Fenster',
    beschreibung:
      'Bestellung, Lieferung, Zahlung, Rückgabe und Garantie für Insektenschutz-Plissees von ' +
      'Pfistanbul Fenster. Gerichtsstand Greifensee ZH.',
  },
  {
    schluessel: 'datenschutz',
    pfad: '/datenschutz',
    titel: 'Datenschutzerklärung – Pfistanbul Fenster',
    beschreibung:
      'Welche Daten wir bei einer Bestellung erheben, wie lange wir sie aufbewahren und welche ' +
      'Dienste dabei mitwirken.',
  },
]

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
  ...rechtsseiten.map((seite) => ({ pfad: seite.pfad, gewicht: 0.3 })),
]

/** Titel und Beschreibung zu einem Pfad. Faellt auf die Startseite zurueck. */
export function kopfdatenFuer(pfad: string) {
  const treffer = rechtsseiten.find((seite) => seite.pfad === pfad)
  return treffer ?? { pfad: '/', titel: startseite.titel, beschreibung: startseite.beschreibung }
}

/** Absolute Adresse zu einem Pfad. */
export function absolut(pfad: string): string {
  return `${site.adresse}${pfad === '/' ? '/' : pfad}`
}
