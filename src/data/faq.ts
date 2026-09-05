/**
 * Die haeufigen Fragen. Steht hier und nicht in der Komponente, weil der
 * Build sie mitlesen muss: vite.config.ts erzeugt daraus die strukturierten
 * Daten (FAQPage), die Suchmaschinen und KI-Werkzeuge ohne JavaScript lesen
 * koennen. Eine zweite, von Hand gepflegte Kopie wuerde frueher oder spaeter
 * etwas anderes behaupten als die Seite selbst.
 */
export interface FaqItem {
  q: string
  a: string
}

export const faq: FaqItem[] = [
  {
    q: 'Muss ich für die Montage bohren – und braucht es die Zustimmung der Verwaltung?',
    a: 'In aller Regel nicht. Der Rahmen wird von aussen in den äusseren Fensterrahmen gedrückt und hält dort rundum mit doppelseitigem Klebeband. Dann entsteht kein einziges Loch, also keine bauliche Veränderung – und bei einem Umzug nehmen Sie alles wieder mit. Pauschal versprechen können wir es aber nicht: Manche Fenster haben zu wenig ebene Klebefläche, oder eine Dichtung sitzt genau dort, wo das Band hin müsste. Das sehen wir beim Messen und sagen es Ihnen vor der Bestellung – gebohrt wird deswegen nichts, dann suchen wir eine andere Lösung. Und weil der Rahmen von aussen sichtbar ist: Bei einer strengen Hausordnung fragen Sie besser trotzdem kurz bei der Verwaltung nach.',
  },
  {
    q: 'Woher wissen Sie, welche Grösse zu meiner Wohnung passt?',
    a: 'Wir haben sie ausgemessen. Die Siedlung wurde Anfang der Siebzigerjahre als Ganzes gebaut, entsprechend wiederholen sich vier Fensterformate über alle Wohnungen: Bad, Küche, Zimmer und Balkontüre. Weil ab 1993 etappenweise saniert wurde, können einzelne Rahmenprofile abweichen – messen Sie vor dem Bestellen einmal nach. Weil das Mass von uns stammt, gilt hier unsere Passgarantie: Passt es nicht, tauschen wir kostenlos.',
  },
  {
    q: 'Warum kostet das Zimmer-Netz kaum mehr als das Badfenster?',
    a: 'Weil unser Preis nicht nur der Fläche folgt. Das Zimmer-Netz ist mit knapp zwei Quadratmetern mehr als doppelt so gross wie das Badfenster, kostet aber nur zwanzig Franken mehr – pro Quadratmeter ist es damit das mit Abstand günstigste im Sortiment. Das ist Absicht: Von diesem Format hängen drei bis vier Stück in jeder Wohnung, dort soll es niemandem weh tun.',
  },
  {
    q: 'Wie schnell habe ich das Netz?',
    a: 'Wir haben keine Lagerhalle – jedes Netz wird auf Bestellung gefertigt und wir bündeln die Bestellungen zu einer Lieferung. Genau daher kommt der tiefe Preis. Den Liefertermin nennen wir Ihnen mit der Bestätigung und melden uns, falls sich etwas verschiebt.',
  },
  {
    q: 'Wie und wann bezahle ich?',
    a: 'Bei der Übergabe, in bar oder mit TWINT. Keine Anzahlung, keine Rechnung im Voraus. Im Webshop selbst werden keine Zahlungsdaten erfasst und nichts abgebucht.',
  },
  {
    q: 'Was, wenn der Betrag gerade nicht auf einmal liegt?',
    a: 'Dann sagen Sie es uns. Wir machen eine Zahlung ab, die für Sie aufgeht – in Raten oder zu einem späteren Zeitpunkt, zinslos und ohne Gebühren. Das entscheiden wir von Fall zu Fall im Gespräch, es gibt kein Kreditformular und keine Prüfung über Sie. Melden Sie sich über den Abschnitt "Zahlung nach Absprache" oder setzen Sie im Bestellablauf das Häkchen dafür; Ihre Bestellung wird dann zu einer Anfrage, und verbindlich ist erst, was wir miteinander abgemacht haben.',
  },
  {
    q: 'Bekomme ich für ein Sondermass vorher einen Preis?',
    a: 'Ja, sofort. Sobald Sie im Anfrageformular Breite, Höhe und Anzahl eintragen, rechnen wir Ihnen direkt auf der Seite einen Richtpreis aus – hochgerechnet aus den Preisen unseres ausgemessenen Sortiments, mit einem Zuschlag für die Unsicherheit. Das ist eine Schätzung und keine Offerte: Den verbindlichen Preis nennen wir Ihnen, nachdem wir Ihre Masse angeschaut haben, und er liegt erfahrungsgemäss eher darunter. Uns ist wichtig, dass Sie eine Hausnummer kennen, bevor Sie überhaupt anfragen.',
  },
  {
    q: 'Und wenn es doch nicht passt oder mir nicht gefällt?',
    a: 'Netze aus einem ausgemessenen Sortiment nehmen wir innerhalb von 14 Tagen zurück oder tauschen sie, solange sie unbeschädigt sind. Bei Sondermassen kommt es darauf an, woher das Mass stammt: Haben wir gemessen, ist ein Fehler unsere Sache. Haben Sie uns die Masse durchgegeben, können wir ein angefertigtes Netz nicht zurücknehmen – deshalb bieten wir das Nachmessen kostenlos an.',
  },
  {
    q: 'Kann ich das Netz im Winter abnehmen?',
    a: 'Es muss gar nicht weg. Zusammengezogen verschwindet das Plissee in einer schmalen Leiste am Fensterrand und stört auch im Winter nicht. Wer es trotzdem abnehmen will: Der Rahmen lässt sich aushängen.',
  },
  {
    q: 'Wie reinige ich das Gewebe?',
    a: 'Absaugen mit weicher Bürste oder mit einem feuchten Tuch abwischen. Keine Hochdruckreiniger, keine scharfen Mittel. Einmal pro Saison reicht.',
  },
  {
    q: 'Ich wohne nicht im Pfisterhölzli – bekomme ich trotzdem etwas?',
    a: 'Ja, und das ist ausdrücklich erwünscht. Wir fertigen jedes Netz nach Mass; das ausgemessene Sortiment ist nur die Abkürzung für eine Siedlung, in der wir selbst wohnen. Im ganzen Kanton Zürich liefern und montieren wir gleich wie bei uns im Haus – Sie stellen eine Anfrage mit Ihren Massen, auf Wunsch kommen wir vorher zum Ausmessen vorbei. Den Richtpreis sehen Sie schon im Formular, den festen Preis nennen wir in der Offerte; darin stehen dann auch Lieferung und allfällige Anfahrt. Ausserhalb des Kantons fragen Sie uns einfach – meistens findet sich ein Weg, versprechen können wir es aber nicht.',
  },
]
