import './Promises.css'

/**
 * ACHTUNG – VOM BETREIBER ZU FÜLLEN:
 * Die Fristen und Garantiedauern unten sind Vorschläge und müssen mit dem
 * entsprechen, was tatsächlich gehalten werden kann. Der Vorstellungsblock
 * ist bewusst ein sichtbarer Platzhalter: ein echter Name und ein echtes
 * Foto sind hier der stärkste Vertrauensgewinn – eine erfundene Person wäre
 * der grösste Schaden.
 */

const PROMISES = [
  {
    title: 'Passgarantie',
    text: 'Sie haben nach unserer Grössenempfehlung bestellt und es passt trotzdem nicht? Dann ist das unser Fehler. Wir passen einmalig kostenlos an oder tauschen.',
  },
  {
    title: '14 Tage Rückgabe',
    text: 'Auf Standardgrössen, unbeschädigt, ohne Begründung. Das Schweizer Recht verlangt das im Fernabsatz nicht – wir machen es trotzdem.',
  },
  {
    title: '2 Jahre Garantie',
    text: 'Auf Rahmen, Gewebe und Mechanik. Reisst eine Naht oder klemmt die Schiene, kommen wir vorbei.',
  },
  {
    title: 'Lieferung in 5 Werktagen',
    text: 'Standardgrössen liefern wir innerhalb von fünf Werktagen an Ihre Wohnungstür. Sonderanfertigungen in zwei Wochen ab Ihrer Zusage.',
  },
]

export function Promises() {
  return (
    <section className="section promises" id="versprechen">
      <div className="shell promises__inner">
        <div className="promises__copy">
          <span className="section__eyebrow">Unsere Versprechen</span>
          <h2>Vier Zusagen, die wir schriftlich geben.</h2>
          <p className="section__lead">
            Wir sind neu und haben noch keine langen Bewertungslisten. Was wir stattdessen anbieten: klare Zusagen,
            eine Adresse in der Siedlung und die Möglichkeit, uns an der Wohnungstür anzusprechen.
          </p>

          <div className="promises__owner">
            <div className="promises__avatar" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="24" cy="18" r="8" />
                <path d="M8 42c1.8-8.4 8.4-13 16-13s14.2 4.6 16 13" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="promises__owner-name">
                <mark>[Vorname Nachname]</mark>
              </p>
              <p className="promises__owner-text">
                <mark>[Ein bis zwei Sätze in der Ich-Form: seit wann Sie hier wohnen, warum Sie damit angefangen
                haben, und ein Foto.]</mark>{' '}
                Ein echter Name mit Gesicht bringt in einer Siedlung mehr als jedes Gütesiegel – deshalb steht hier
                bewusst ein Platzhalter statt einer erfundenen Person.
              </p>
            </div>
          </div>
        </div>

        <ul className="promises__list">
          {PROMISES.map((promise) => (
            <li key={promise.title}>
              <h3>{promise.title}</h3>
              <p>{promise.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
