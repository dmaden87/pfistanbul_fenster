/**
 * Die Testumgebung: Adminbereich ohne Anmeldung, mit Beispieldaten.
 *
 * WOZU. Am Adminbereich wird oft gearbeitet, und jede Aenderung muss jemand
 * durchklicken, der kein Entwickler ist. Auf dem Vorschau-Deployment ginge
 * das nur mit dem Produktivpasswort – und dann klickt man auf echten
 * Bestellungen von Nachbarn herum, verschiebt sie aus Versehen in die
 * falsche Phase oder loescht eine. Deshalb hat die Testumgebung ihre eigenen
 * Daten.
 *
 * ZWEI RIEGEL, DAMIT DAS NIE AUF DER ECHTEN SEITE PASSIERT:
 *
 *   1. VERCEL_ENV muss etwas anderes sein als "production". Die Seite
 *      pfistanbul.ch laeuft als Produktions-Deployment; dort ist dieser
 *      Modus nicht einschaltbar, mit welcher Umgebungsvariable auch immer.
 *   2. Der Zweigname muss auf "demo" enden, abgesetzt durch "-" oder "/"
 *      ("claude/admin-umbau-demo", "demo"). Der Produktionszweig tut das
 *      nicht, und dass er es nie tut, sieht man an seinem Namen – es braucht
 *      keine Einstellung in Vercel, die jemand versehentlich umlegt. Ein
 *      Zweig wie "demonstration" zaehlt nicht: Die Endung muss die Absicht
 *      sein, nicht ein Zufall im Wort.
 *
 * Beide Bedingungen muessen zutreffen. Eine Attrappe, die man mit einem
 * Haken scharf schalten kann, ist keine.
 *
 * WAS DER MODUS TUT:
 *   - Jede Anfrage gilt als angemeldet. Die Anmeldemaske entfaellt.
 *   - Gelesen und geschrieben wird in einer EIGENEN Tabelle. Die
 *     Produktivdaten werden nicht gelesen, nicht geschrieben, nicht
 *     geloescht – auch nicht versehentlich, denn der Tabellenname kommt aus
 *     derselben Entscheidung wie die Anmeldung.
 *   - Ist die Tabelle leer, wird sie mit den Beispielen unten gefuellt. Ein
 *     Knopf im Adminbereich setzt sie zurueck.
 *
 * Das Vorschau-Deployment ist zusaetzlich durch Vercels eigene Anmeldung
 * geschuetzt (SSO fuer alle *.vercel.app-Adressen) – die Beispieldaten sind
 * also nicht einmal oeffentlich erreichbar. Erfundene Namen sind sie
 * trotzdem.
 */

const umgebung = process.env.VERCEL_ENV
const zweig = process.env.VERCEL_GIT_COMMIT_REF ?? ''

/** True, wenn beide Riegel offen sind. */
export const demoModus = umgebung !== 'production' && /(^|[/-])demo$/.test(zweig)

/* --- Die Beispieldaten ------------------------------------------------------ */

/**
 * Fuenf Auftraege, einer je Phase – damit jeder Schritt ohne Vorarbeit
 * ausprobiert werden kann. Zwei davon stehen im Backlog, denn ein Paket
 * braucht mindestens zwei.
 *
 * Die Richtpreise sind nicht geraten, sondern die Zahlen, die
 * `estimateNetChf` fuer diese Flaechen liefert – dieselbe Rechnung wie auf
 * der Startseite. Sonst zeigte die Spalte "Abweichung" bei unberuehrten
 * Auftraegen eine Abweichung, und man wuerde dem Rechner misstrauen, statt
 * den Daten.
 *
 * Alle Namen und Adressen sind erfunden. Die Strassen gibt es in Greifensee,
 * die Hausnummern nicht.
 */
function tage(zurueck: number): string {
  return new Date(Date.now() - zurueck * 86_400_000).toISOString()
}

/** Ein Netz im Sondermass, mit allem, was der Produzent braucht. */
function netz(
  id: string,
  bezeichnung: string,
  breiteCm: number,
  hoeheCm: number,
  preisChf: number,
  oeffnung: string,
  fertig = true,
  /** Weicht der Verkaufspreis vom Vorschlag ab, steht der Vorschlag hier. */
  richtpreisChf = preisChf,
) {
  return {
    id,
    menge: 1,
    bezeichnung,
    detail: '',
    preisChf,
    richtpreisChf,
    breiteCm,
    hoeheCm,
    oeffnung,
    // "fertig" heisst: Die Angaben fuer Bora sind da. Ohne sie bleibt der
    // Weg aus der Klaerung gesperrt – und genau das soll sich testen lassen.
    ...(fertig
      ? { rahmendicke: '60 mm', rahmenfarbe: 'weiss', netzfarbe: 'grau', mechanismus: 'plissee' }
      : {}),
  }
}

function kunde(name: string, email: string, telefon: string, strasse: string, ort: string, bemerkung = '') {
  const [plz, stadt] = ort.split(' ')
  return { name, email, telefon, strasse, plz, ort: stadt, bemerkung }
}

export function demoSaat(): Record<string, unknown>[] {
  return [
    /* 1. Frisch hereingekommen, noch nichts geschehen. */
    {
      id: 'demo-1',
      referenz: 'PF-D001',
      art: 'anfrage',
      status: 'neu',
      eingang: tage(1),
      geaendert: tage(1),
      phaseSeit: tage(1),
      kunde: kunde(
        'Marlène Hofstetter',
        'm.hofstetter@example.ch',
        '079 000 00 01',
        'Mösliweg 4',
        '8606 Greifensee',
        'Guten Tag, wir hätten gern drei Netze. Am liebsten vor den Sommerferien. Besten Dank!',
      ),
      positionen: [
        netz('d1p1', 'Bad', 120, 80, 140, 'nach-links', false),
        netz('d1p2', 'Küche', 70, 120, 140, 'nach-oben', false),
        netz('d1p3', 'Wohnzimmer', 160, 120, 170, 'mitte', false),
      ],
      montage: true,
      montageChf: 0,
      anfahrt: false,
      rabatt: false,
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      summeChf: 450,
      quelle: 'web',
    },

    /* 2. Termin steht, ausgemessen, Angaben vollstaendig – bereit fuers Angebot. */
    {
      id: 'demo-2',
      referenz: 'PF-D002',
      art: 'anfrage',
      status: 'klaerung',
      eingang: tage(9),
      geaendert: tage(2),
      phaseSeit: tage(2),
      klaerungTermin: tage(-3).slice(0, 10),
      ausgemessenAm: tage(2),
      kunde: kunde('Reto Bächler', 'r.baechler@example.ch', '079 000 00 02', 'Rebbergstrasse 17', '8606 Greifensee'),
      positionen: [
        netz('d2p1', 'Balkontüre', 90, 210, 170, 'nach-rechts'),
        netz('d2p2', 'Schlafzimmer', 120, 80, 140, 'nach-links'),
      ],
      montage: true,
      montageChf: 0,
      anfahrt: false,
      rabatt: false,
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      summeChf: 310,
      quelle: 'whatsapp',
    },

    /* 3. Das Angebot ist zusammenzustellen: Vorschlaege stehen, nichts ist festgelegt. */
    {
      id: 'demo-3',
      referenz: 'PF-D003',
      art: 'anfrage',
      status: 'offerte',
      eingang: tage(14),
      geaendert: tage(3),
      phaseSeit: tage(3),
      ausgemessenAm: tage(4),
      kunde: kunde('Familie Odermatt-Pérez', 'odermatt@example.ch', '079 000 00 03', 'Im Wolfacker 2', '8610 Uster'),
      positionen: [
        netz('d3p1', 'Kinderzimmer Nord', 140, 110, 160, 'nach-links'),
        netz('d3p2', 'Kinderzimmer Süd', 140, 110, 160, 'nach-rechts'),
        netz('d3p3', 'WC', 65, 95, 130, 'nach-oben'),
      ],
      montage: true,
      montageChf: 0,
      anfahrt: false,
      rabatt: false,
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      summeChf: 450,
      quelle: 'web',
    },

    /* 4. und 5. Zugesagt, im Backlog – aus den zwei laesst sich ein Paket machen. */
    {
      id: 'demo-4',
      referenz: 'PF-D004',
      art: 'anfrage',
      status: 'bestellen',
      eingang: tage(28),
      geaendert: tage(5),
      phaseSeit: tage(5),
      ausgemessenAm: tage(20),
      preiseFestgelegtAm: tage(12),
      offerteAm: tage(12),
      zusageAm: tage(5),
      kunde: kunde('Sibylle Grunder', 's.grunder@example.ch', '079 000 00 04', 'Blumenaustrasse 9', '8606 Greifensee'),
      positionen: [
        netz('d4p1', 'Wohnzimmer links', 160, 120, 170, 'mitte'),
        netz('d4p2', 'Wohnzimmer rechts', 160, 120, 170, 'mitte'),
      ],
      montage: true,
      montageChf: 30,
      anfahrt: true,
      anfahrtChf: 0,
      rabatt: false,
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      summeChf: 370,
      quelle: 'persoenlich',
    },
    {
      id: 'demo-5',
      referenz: 'PF-D005',
      art: 'anfrage',
      status: 'bestellen',
      eingang: tage(24),
      geaendert: tage(6),
      phaseSeit: tage(6),
      ausgemessenAm: tage(18),
      preiseFestgelegtAm: tage(10),
      offerteAm: tage(10),
      zusageAm: tage(6),
      kunde: kunde('Dragan Mitrović', 'd.mitrovic@example.ch', '079 000 00 05', 'Seestrasse 31', '8606 Greifensee'),
      /*
       * Hier wurde der Vorschlag von Hand erhoeht: 170 gerechnet, 180
       * verlangt. So ist die Spalte "Abweichung" im Angebot nicht nur
       * theoretisch zu sehen.
       */
      positionen: [netz('d5p1', 'Balkontüre', 90, 210, 180, 'nach-links', true, 170)],
      montage: false,
      montageChf: 0,
      anfahrt: true,
      anfahrtChf: 0,
      // Ein Rabatt, damit die Offerte mit Rabattzeile zu sehen ist.
      rabatt: true,
      rabattChf: 20,
      rabattText: 'Kennenlernrabatt',
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      summeChf: 160,
      quelle: 'instagram',
      notiz: 'Wohnt im Erdgeschoss, Leiter nicht nötig.',
    },
  ]
}
