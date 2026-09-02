import { useState } from 'react'
import './Faq.css'

interface FaqItem {
  q: string
  a: string
}

const FAQ: FaqItem[] = [
  {
    q: 'Muss ich für die Montage bohren – und braucht es die Zustimmung der Verwaltung?',
    a: 'Nein und nein. Der Rahmen wird von aussen in den äusseren Fensterrahmen gedrückt und hält dort rundum mit doppelseitigem Klebeband. Es entsteht kein einziges Loch, also keine bauliche Veränderung – und bei einem Umzug nehmen Sie alles wieder mit.',
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
    a: 'Ja. Wir fertigen jedes Netz nach Mass – das ausgemessene Sortiment ist nur die Abkürzung für eine Siedlung, die wir kennen. Stellen Sie einfach eine Anfrage mit Ihren Massen. Als Richtwert liegen gängige Fensterformate bei CHF 100 bis 200 pro Stück; den festen Preis nennen wir in der Offerte. Die Lieferung ausserhalb der Siedlung sprechen wir individuell ab.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="section faq" id="faq">
      <div className="shell faq__inner">
        <div className="faq__head">
          <span className="section__eyebrow">Häufige Fragen</span>
          <h2>Was Nachbarn uns am häufigsten fragen.</h2>
          <p className="section__lead">
            Ist Ihre Frage nicht dabei? Schreiben Sie sie einfach ins Bemerkungsfeld der Anfrage – wir antworten
            persönlich.
          </p>
        </div>

        <div className="faq__list">
          {FAQ.map((item, index) => {
            const isOpen = open === index
            return (
              <div className={`faq-item${isOpen ? ' faq-item--open' : ''}`} key={item.q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    id={`faq-button-${index}`}
                    onClick={() => setOpen(isOpen ? null : index)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-item__sign" aria-hidden="true" />
                  </button>
                </h3>
                <div
                  className="faq-item__panel"
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-button-${index}`}
                  hidden={!isOpen}
                >
                  <p>{item.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
