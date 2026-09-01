import './HowItWorks.css'

const STEPS = [
  {
    n: '01',
    title: 'Grösse anklicken',
    text: 'Ihr Fenster ist mit hoher Wahrscheinlichkeit in der Liste. Falls nicht: eine Anfrage genügt.',
  },
  {
    n: '02',
    title: 'Wir melden uns',
    text: 'Innerhalb eines Werktags bestätigen wir die Bestellung und sagen, wann wir vorbeikommen.',
  },
  {
    n: '03',
    title: 'Übergabe an der Tür',
    text: 'Kein Paketdienst, kein Abholtermin im Baumarkt. Wir bringen es Ihnen und zeigen den Einbau.',
  },
  {
    n: '04',
    title: 'In fünf Minuten montiert',
    text: 'Geklemmt statt gebohrt. Wenn Sie möchten, machen wir es gleich selber – ohne Aufpreis.',
  },
]

export function HowItWorks() {
  return (
    <section className="section how" id="ablauf">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">So läuft es ab</span>
          <h2>Von der Bestellung bis zum montierten Netz: meist unter einer Woche.</h2>
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
