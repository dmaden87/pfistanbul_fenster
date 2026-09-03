import './HowItWorks.css'

const STEPS = [
  {
    n: '01',
    title: 'Mass wählen oder angeben',
    text: 'Ist Ihre Überbauung ausgemessen, klicken Sie das Format an. Sonst schicken Sie uns Ihre Masse.',
  },
  {
    n: '02',
    title: 'Wir melden uns',
    text: 'Innerhalb von ein bis drei Arbeitstagen bestätigen wir die Bestellung und nennen Ihnen den Liefertermin.',
  },
  {
    n: '03',
    title: 'Übergabe an der Tür',
    text: 'Kein Paketdienst, kein Abholtermin im Baumarkt. Wir bringen es Ihnen und zeigen den Einbau.',
  },
  {
    n: '04',
    title: 'Selber montieren – oder nicht',
    text: 'Geklemmt statt gebohrt, in aller Regel ganz ohne Werkzeug. Beim ersten Fenster braucht es trotzdem etwas Geduld, bis alles sauber sitzt; danach geht es zügig. Wer keine Lust darauf hat, lässt es uns machen.',
  },
]

export function HowItWorks() {
  return (
    <section className="section how" id="ablauf">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">So läuft es ab</span>
          <h2>Von der Bestellung bis zum montierten Netz.</h2>
        </div>

        <ol className="how__steps">
          {STEPS.map((step) => (
            <li className="how-step" key={step.n}>
              <span className="how-step__n">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
