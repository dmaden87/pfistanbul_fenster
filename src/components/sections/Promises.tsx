import './Promises.css'

/**
 * ACHTUNG – VOM BETREIBER ZU PRÜFEN: Die Fristen und Garantiedauern sind
 * Vorschläge und müssen dem entsprechen, was tatsächlich gehalten werden kann.
 */

const PROMISES = [
  {
    title: 'Passgarantie auf unsere Masse',
    text: 'Wenn das Mass von uns stammt – aus einem ausgemessenen Sortiment oder weil wir bei Ihnen nachgemessen haben – und es passt trotzdem nicht, ist das unser Fehler: Wir passen einmalig kostenlos an oder tauschen. Bei Massen, die Sie uns selbst durchgeben, können wir das naturgemäss nicht zusagen.',
  },
  {
    title: '14 Tage Rückgabe',
    text: 'Auf Netze aus dem Standardsortiment, unbeschädigt, ohne Begründung. Das Schweizer Recht verlangt das im Fernabsatz nicht – wir machen es trotzdem.',
  },
  {
    title: '2 Jahre Garantie',
    text: 'Auf Rahmen, Gewebe und Mechanik. Reisst eine Naht oder klemmt die Schiene, kommen wir vorbei.',
  },
  {
    title: 'Offene Karten beim Termin',
    text: 'Mit der Bestätigung nennen wir Ihnen den Liefertermin – und melden uns von selbst, wenn sich etwas verschiebt. Lieber eine ehrliche Woche mehr als eine Frist, die wir nicht halten.',
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
            zwei Adressen mit Namen im Impressum und zwei Leute, die selbst vorbeikommen – statt einer Nummer, die
            niemand abnimmt.
          </p>

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
