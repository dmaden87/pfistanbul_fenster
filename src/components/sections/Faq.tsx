import { useState } from 'react'
import './Faq.css'

interface FaqItem {
  q: string
  a: string
}

const FAQ: FaqItem[] = [
  {
    q: 'Muss ich für die Montage bohren – und braucht es die Zustimmung der Verwaltung?',
    a: 'Nein und nein. Unsere Rahmen werden mit Klemmwinkeln in der Fensterlaibung gehalten, es entsteht kein einziges Loch. Damit ist es keine bauliche Veränderung, und Sie können bei einem Umzug alles rückstandslos mitnehmen.',
  },
  {
    q: 'Woher kennen Sie die Masse meiner Fenster?',
    a: 'Weil wir selber hier wohnen. Die Siedlung wurde Anfang der Siebzigerjahre als Ganzes gebaut, entsprechend wiederholen sich dieselben Fenstertypen über die Häuser hinweg. Weil seither etappenweise saniert wurde, kann es einzelne Abweichungen geben – deshalb gilt: Wenn ein Mass wider Erwarten nicht passt, tauschen wir kostenlos.',
  },
  {
    q: 'Was genau ist der Unterschied zwischen Plissee und Spannrahmen?',
    a: 'Der Spannrahmen ist ein fester Rahmen, der vor dem Fenster hängt – günstig und robust, aber immer im Bild. Das Plissee liegt in Falten in einer schmalen Schiene: Sie ziehen es zu, wenn Sie lüften, und wieder auf, wenn Sie freie Sicht wollen. Für Fenster, die täglich benutzt werden, lohnt sich das Plissee fast immer.',
  },
  {
    q: 'Hilft das wirklich gegen Pollen?',
    a: 'Das kommt aufs Gewebe an. Ein normales Insektengitter hält Pollen praktisch nicht zurück – Blütenpollen sind so klein, dass sie durch jede Insektenschutzmasche passen. Beim Pollenschutzgewebe wirkt nicht die Masche, sondern eine Beschichtung, an der die Pollen hängen bleiben. Das reduziert den Pollenflug ins Zimmer spürbar, aber es ist kein vollständiger Schutz und ersetzt keine medizinische Behandlung. Zwei Dinge gehören zur Ehrlichkeit dazu: Das Gewebe lässt weniger Luft und Licht durch, und die Beschichtung lässt über die Jahre nach.',
  },
  {
    q: 'Wie schnell habe ich das Netz?',
    a: 'Standardgrössen haben wir vorrätig oder innerhalb weniger Tage. Sonderanfertigungen dauern in der Regel ein bis zwei Wochen ab Ihrer Zusage. Den genauen Termin nennen wir bei der Bestätigung.',
  },
  {
    q: 'Wie und wann bezahle ich?',
    a: 'Erst wenn die Netze bei Ihnen sind – bar bei der Übergabe oder per Rechnung mit TWINT beziehungsweise Einzahlungsschein. Im Webshop selbst werden keine Zahlungsdaten erfasst und nichts abgebucht.',
  },
  {
    q: 'Und wenn es doch nicht passt oder mir nicht gefällt?',
    a: 'Bei Standardgrössen tauschen oder nehmen wir innerhalb von 14 Tagen zurück, solange das Netz unbeschädigt ist. Bei Sonderanfertigungen messen wir vorher gemeinsam nach – wenn dabei etwas schiefgeht, ist es unser Fehler und unsere Sache.',
  },
  {
    q: 'Kann ich das Netz im Winter abnehmen?',
    a: 'Beim Spannrahmen: ja, in einer Minute ausgehängt. Beim Plissee muss es gar nicht weg – zusammengezogen verschwindet es in einer schmalen Leiste am Fensterrand und stört auch im Winter nicht.',
  },
  {
    q: 'Wie reinige ich das Gewebe?',
    a: 'Absaugen mit weicher Bürste oder mit einem feuchten Tuch abwischen. Keine Hochdruckreiniger, keine scharfen Mittel. Einmal pro Saison reicht.',
  },
  {
    q: 'Ich wohne nicht im Pfisterhölzli – bekomme ich trotzdem etwas?',
    a: 'Ja. Die Standardgrössen sind auf unsere Siedlung zugeschnitten, passen aber in viele Wohnungen der Umgebung. Wenn Sie unsicher sind, stellen Sie einfach eine Anfrage mit Ihren Massen. Die Lieferung ausserhalb der Siedlung sprechen wir individuell ab.',
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
