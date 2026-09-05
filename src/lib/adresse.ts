import { absolut, kopfdatenFuer, rechtsseiten, type LegalKey } from '../data/site'

/**
 * Die Adresszeile und was die Seite gerade zeigt, in Einklang bringen.
 *
 * Bis hierhin war die Seite eine einzige Adresse mit umschaltbaren Ansichten.
 * Das hatte zwei Folgen: `/impressum` antwortete mit 404, und niemand konnte
 * auf unser Impressum verlinken oder es zitieren - auch keine Suchmaschine.
 *
 * Eine eigene Adresse bekommen deshalb die Startseite und die drei
 * rechtlichen Seiten. Bewusst NICHT der Warenkorb, der Bestellablauf und der
 * Adminbereich: Die haengen an Warenkorbinhalt, Anmeldung und der Rueckkehr
 * von Stripe. Jede weitere Adresse waere ein weiterer Weg, auf dem der
 * funktionierende Bestellablauf kaputtgehen kann, und zu holen gibt es dort
 * fuer eine Suchmaschine ohnehin nichts. Sie laufen weiter unter "/".
 */

/** Zu welcher Rechtsseite eine Adresse gehoert - oder zu keiner. */
export function rechtsseiteAusPfad(pfad: string): LegalKey | null {
  // Ein angehaengter Schraegstrich soll nicht ins Leere fuehren.
  const sauber = pfad.length > 1 && pfad.endsWith('/') ? pfad.slice(0, -1) : pfad
  return rechtsseiten.find((seite) => seite.pfad === sauber)?.schluessel ?? null
}

/**
 * Der Pfad, unter dem eine Adresse gefuehrt wird. Alles, was keine
 * Rechtsseite ist - auch ein Tippfehler in der Adresszeile -, gilt als
 * Startseite.
 */
export function pfadNormalisiert(pfad: string): string {
  const seite = rechtsseiteAusPfad(pfad)
  return seite ? pfadFuerRechtsseite(seite) : '/'
}

/** Die Adresse einer Rechtsseite. */
export function pfadFuerRechtsseite(schluessel: LegalKey): string {
  return rechtsseiten.find((seite) => seite.schluessel === schluessel)?.pfad ?? '/'
}

/** Setzt oder legt ein Element im Kopf an und traegt einen Wert ein. */
function kopfeintrag(auswahl: string, erzeugen: () => HTMLElement, feld: string, wert: string) {
  let element = document.head.querySelector(auswahl)
  if (!element) {
    element = erzeugen()
    document.head.appendChild(element)
  }
  element.setAttribute(feld, wert)
}

/**
 * Bringt Fenstertitel, Beschreibung und die Angaben fuer geteilte Links auf
 * den Stand der gerade gezeigten Seite.
 *
 * Das nuetzt zweimal. Zur Laufzeit steht im Browsertab "Impressum" statt
 * immer derselbe Shop-Titel. Und beim Vorabrendern (bau/vorrendern.mjs) wird
 * genau dieser Zustand eingefroren - die ausgelieferte Datei zu /impressum
 * traegt deshalb ihren eigenen Titel und ihren eigenen canonical-Verweis
 * statt vier Kopien der Startseite.
 *
 * ERSTMALS AUFGERUFEN WIRD DAS IN main.tsx, VOR dem ersten Rendern, nicht
 * erst in einem Effekt. Grund: Chromium gibt beim Vorabrendern den Baum aus,
 * sobald das Ladeereignis durch ist, und ein Effekt laeuft manchmal frueher,
 * manchmal spaeter. Drei Probelaeufe auf /impressum ergaben zweimal den
 * richtigen und einmal den Titel der Startseite - ein Rennen, das man nicht
 * ausliefern darf. Hier gesetzt, steht es fest, bevor der erste Baustein der
 * Anwendung laeuft.
 */
export function setzeKopfdaten(rohpfad: string) {
  const pfad = pfadNormalisiert(rohpfad)
  const { titel, beschreibung } = kopfdatenFuer(pfad)
  const adresse = absolut(pfad)

  document.title = titel
  kopfeintrag('meta[name="description"]', () => {
    const m = document.createElement('meta')
    m.setAttribute('name', 'description')
    return m
  }, 'content', beschreibung)

  kopfeintrag('link[rel="canonical"]', () => {
    const l = document.createElement('link')
    l.setAttribute('rel', 'canonical')
    return l
  }, 'href', adresse)

  for (const [eigenschaft, wert] of [
    ['og:title', titel],
    ['og:description', beschreibung],
    ['og:url', adresse],
  ]) {
    kopfeintrag(`meta[property="${eigenschaft}"]`, () => {
      const m = document.createElement('meta')
      m.setAttribute('property', eigenschaft)
      return m
    }, 'content', wert)
  }
}
