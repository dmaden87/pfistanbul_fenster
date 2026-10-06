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
 * Sechs Auftraege, einer je Phase – damit jeder Schritt ohne Vorarbeit
 * ausprobiert werden kann. DREI davon stehen im Backlog: zwei, weil ein Paket
 * mindestens zwei braucht, und ein dritter, damit sich auch ausprobieren
 * laesst, einen Nachzuegler in ein bestehendes Paket zu legen.
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
    /*
     * DIE WERTE MUESSEN AUS src/data/produktion.ts STAMMEN. Hier stand
     * `mechanismus: 'plissee'` – das gibt es nicht; gueltig sind "akkordeon"
     * und "fix". Auf dem Blatt an Bora erschien daraufhin das rohe Wort
     * "plissee" statt "Akkordeon, verschiebbar", weil `beschriften()`
     * Unbekanntes anzeigt, statt es zu verschlucken. Genau dafuer ist diese
     * Anzeige da – und hier hat sie den Fehler gezeigt.
     *
     * api/ darf nicht aus src/ importieren (siehe bau/api-test.mjs), also
     * stehen die Werte als Text da. bau/demo-test.mjs prueft sie gegen die
     * echten Tabellen.
     */
    ...(fertig
      ? { rahmendicke: '60 mm', rahmenfarbe: 'weiss', netzfarbe: 'grau', mechanismus: 'akkordeon' }
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

    /* 6. Der Nachzuegler: kam zu spaet fuers Paket und soll noch dazu. */
    {
      id: 'demo-6',
      referenz: 'PF-D006',
      art: 'anfrage',
      status: 'bestellen',
      eingang: tage(11),
      geaendert: tage(1),
      phaseSeit: tage(1),
      ausgemessenAm: tage(7),
      preiseFestgelegtAm: tage(3),
      offerteAm: tage(3),
      zusageAm: tage(1),
      kunde: kunde('Anita Lüthi', 'a.luethi@example.ch', '079 000 00 06', 'Kirchbühlstrasse 6', '8606 Greifensee'),
      positionen: [netz('d6p1', 'Küche', 70, 120, 140, 'nach-oben')],
      montage: true,
      montageChf: 15,
      anfahrt: true,
      anfahrtChf: 0,
      rabatt: false,
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      summeChf: 155,
      quelle: 'web',
    },

    /*
     * 7. und 8. ABGESCHLOSSEN – erst damit hat der Bereich "Zahlen" etwas zu
     * rechnen. Ohne gelieferte Auftraege waere dort jede Tabelle leer, und
     * man koennte die Erfolgsrechnung nicht ausprobieren.
     *
     * Die beiden unterscheiden sich in genau einem Punkt: Die eine ist
     * bezahlt, die andere nicht. So steht links "eingenommen" und rechts
     * "schuldet man uns", und man sieht, dass die Trennung wirkt.
     */
    {
      id: 'demo-7',
      referenz: 'PF-D007',
      art: 'anfrage',
      status: 'ausliefern',
      eingang: tage(95),
      geaendert: tage(60),
      phaseSeit: tage(60),
      ausgemessenAm: tage(88),
      preiseFestgelegtAm: tage(80),
      offerteAm: tage(80),
      zusageAm: tage(75),
      bestelltAm: tage(70),
      versandAm: tage(66),
      ausgeliefertAm: tage(62),
      bezahltAm: tage(60),
      kunde: kunde('Rolf Benz', 'r.benz@example.ch', '079 000 00 07', 'Seestrasse 14', '8606 Greifensee'),
      positionen: [
        netz('d7p1', 'Schlafzimmer', 128, 96, 150, 'mitte'),
        netz('d7p2', 'Bad', 64, 96, 130, 'nach-oben'),
      ],
      montage: true,
      montageChf: 30,
      anfahrt: true,
      anfahrtChf: 0,
      rabatt: false,
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      summeChf: 310,
      quelle: 'web',
      paket: 'P-2026-01',
      kosten: [
        { id: 'd7k1', art: 'herstellung', betragChf: 52.9, traeger: 'bora', bezahlt: true, erfasstAm: tage(60) },
        { id: 'd7k2', art: 'lieferung', betragChf: 24, traeger: 'bora', bezahlt: true, erfasstAm: tage(60) },
        { id: 'd7k3', art: 'mwst', betragChf: 4.28, traeger: 'deniz', erfasstAm: tage(60) },
      ],
    },
    {
      id: 'demo-8',
      referenz: 'PF-D008',
      art: 'bestellung',
      status: 'ausliefern',
      eingang: tage(45),
      geaendert: tage(18),
      phaseSeit: tage(18),
      preiseFestgelegtAm: tage(40),
      offerteAm: tage(40),
      zusageAm: tage(36),
      bestelltAm: tage(32),
      versandAm: tage(24),
      ausgeliefertAm: tage(18),
      kunde: kunde('Maria Keller', 'm.keller@example.ch', '079 000 00 08', 'Im Hagacker 3', '8606 Greifensee'),
      positionen: [netz('d8p1', 'Balkontüre', 68, 203, 150, 'mitte')],
      montage: true,
      montageChf: 15,
      anfahrt: true,
      anfahrtChf: 20,
      rabatt: true,
      rabattChf: 10,
      rabattText: 'Kennenlernrabatt',
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      summeChf: 175,
      quelle: 'web',
      paket: 'P-2026-01',
    },

    /*
     * 9. und 10. WEIT ZURUECK, damit die Jahresansicht etwas zu zeigen hat.
     *
     * Ohne sie lagen alle Beispiele in drei Monaten: Das Jahr bestand aus
     * einer einzigen Zeile, das Quartal aus zwei, und ob die Gruppierung
     * ueberhaupt stimmt, liess sich nicht sehen. Nummer 10 liegt bewusst im
     * Vorjahr - nur so faellt auf, wenn ein abgelaufenes Jahr faelschlich
     * "bis heute" heisst.
     */
    {
      id: 'demo-9',
      referenz: 'PF-D009',
      art: 'bestellung',
      status: 'ausliefern',
      eingang: tage(215),
      geaendert: tage(196),
      phaseSeit: tage(196),
      preiseFestgelegtAm: tage(210),
      offerteAm: tage(210),
      zusageAm: tage(206),
      bestelltAm: tage(204),
      versandAm: tage(199),
      ausgeliefertAm: tage(196),
      bezahltAm: tage(195),
      kunde: kunde('Peter Vogel', 'p.vogel@example.ch', '079 000 00 09', 'Mattenweg 7', '8606 Greifensee'),
      positionen: [
        netz('d9p1', 'Wohnzimmer', 160, 122, 170, 'mitte'),
        netz('d9p2', 'Schlafzimmer', 117, 82, 140, 'nach-oben'),
        netz('d9p3', 'Bad', 64, 96, 130, 'nach-oben'),
      ],
      montage: true,
      montageChf: 45,
      anfahrt: true,
      anfahrtChf: 0,
      rabatt: false,
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      summeChf: 485,
      quelle: 'persoenlich',
      paket: 'P-2025-04',
      kosten: [
        { id: 'd9k1', art: 'herstellung', betragChf: 85.6, traeger: 'bora', bezahlt: true, erfasstAm: tage(196) },
        { id: 'd9k2', art: 'lieferung', betragChf: 31, traeger: 'bora', bezahlt: true, erfasstAm: tage(196) },
        { id: 'd9k3', art: 'mwst', betragChf: 6.93, traeger: 'deniz', bezahlt: true, erfasstAm: tage(196) },
      ],
    },
    {
      id: 'demo-10',
      referenz: 'PF-D010',
      art: 'anfrage',
      status: 'ausliefern',
      eingang: tage(345),
      geaendert: tage(330),
      phaseSeit: tage(330),
      ausgemessenAm: tage(340),
      preiseFestgelegtAm: tage(338),
      offerteAm: tage(338),
      zusageAm: tage(336),
      bestelltAm: tage(335),
      versandAm: tage(332),
      ausgeliefertAm: tage(330),
      bezahltAm: tage(329),
      kunde: kunde('Erika Stutz', 'e.stutz@example.ch', '079 000 00 10', 'Rebbergstrasse 2', '8606 Greifensee'),
      positionen: [netz('d10p1', 'Küche', 128, 96, 150, 'mitte')],
      montage: false,
      anfahrt: true,
      anfahrtChf: 20,
      rabatt: false,
      zahlung: 'uebergabe',
      zahlungswunsch: false,
      summeChf: 170,
      quelle: 'web',
      kosten: [
        { id: 'd10k1', art: 'herstellung', betragChf: 28.8, traeger: 'bora', bezahlt: true, erfasstAm: tage(330) },
        { id: 'd10k2', art: 'lieferung', betragChf: 14, traeger: 'bora', bezahlt: true, erfasstAm: tage(330) },
        { id: 'd10k3', art: 'mwst', betragChf: 2.33, traeger: 'deniz', bezahlt: true, erfasstAm: tage(330) },
      ],
    },
  ]
}

/**
 * Beispiele fuer die laufenden Betriebskosten.
 *
 * Drei Eintraege reichen: einer bezahlt, zwei offen, zwei verschiedene
 * Traeger. Damit zeigt die Tabelle "wem wir was schulden" etwas, und man
 * sieht, dass die Spalte nicht nur Zierat ist.
 */
export function demoAuslagen(): Record<string, unknown>[] {
  const tag = (zurueck: number) => new Date(Date.now() - zurueck * 86400000).toISOString().slice(0, 10)
  return [
    { id: 'demo-al-1', am: tag(70), bezeichnung: 'Musterbuch drucken', kategorie: 'marketing',
      betragChf: 148.5, traeger: 'deniz', erfasstAm: new Date(Date.now() - 70 * 86400000).toISOString() },
    { id: 'demo-al-2', am: tag(40), bezeichnung: 'Aufkleber für die Schienen', kategorie: 'material',
      betragChf: 62, traeger: 'ufuk', erfasstAm: new Date(Date.now() - 40 * 86400000).toISOString() },
    { id: 'demo-al-4', am: tag(333), bezeichnung: 'Visitenkarten und Flyer', kategorie: 'marketing',
      betragChf: 95, traeger: 'ufuk', bezahlt: true, erfasstAm: new Date(Date.now() - 333 * 86400000).toISOString() },
    { id: 'demo-al-3', am: tag(12), bezeichnung: 'Domain und Hosting', kategorie: 'infrastruktur',
      betragChf: 38.4, traeger: 'deniz', bezahlt: true, erfasstAm: new Date(Date.now() - 12 * 86400000).toISOString() },
  ]
}
