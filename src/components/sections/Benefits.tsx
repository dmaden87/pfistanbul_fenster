import './Benefits.css'

interface Benefit {
  id: string
  headline: string
  body: string
  meta?: string
}

const BENEFITS: Benefit[] = [
  {
    id: 'schlafen',
    headline: 'Endlich wieder bei offenem Fenster schlafen',
    body: 'Kein Summen um drei Uhr morgens, kein Suchen an der Decke, keine Stiche am Morgen. Die Nacht bleibt kühl und trotzdem ruhig – das ist der eigentliche Grund, warum man so ein Netz kauft.',
    meta: 'Der Hauptgrund',
  },
  {
    id: 'akkordeon',
    headline: 'Auf- und zuziehen wie ein Akkordeon',
    body: 'Unser Plissee liegt in feinen Falten in einer schmalen Schiene. Sie ziehen es mit einem Finger zu und genauso leicht wieder auf. Und im Herbst bleibt es einfach hängen: kein Aushängen, kein Verstauen im Keller, kein Suchen und Wiederanbringen im Frühling, wie man es von den üblichen Spannrahmen kennt. Zusammengeschoben verschwindet es am Fensterrand und stört auch im Winter nicht.',
  },
  {
    id: 'preis',
    headline: 'Ehrlich gerechnet statt teuer verkauft',
    body: 'Wir kaufen direkt beim Hersteller und bündeln die Bestellungen der Nachbarschaft zu einer Fracht. Kein Zwischenhandel, kein Showroom, kein Anfahrtsweg – wir wohnen hier. Ein Fachbetrieb verlangt für vergleichbare Plissees nach Mass ein Mehrfaches.',
  },
  {
    id: 'bohren',
    headline: 'Fast immer ohne einen einzigen Dübel',
    body: 'Das Netz klebt rundum im äusseren Fensterrahmen. Wo das aufgeht – und das ist bei den allermeisten Fenstern der Fall –, entsteht kein einziges Loch: keine bauliche Veränderung, nichts, was bei der Wohnungsabgabe auffällt. Ist die Klebefläche zu schmal oder sitzt eine Dichtung an der falschen Stelle, sagen wir Ihnen das vor der Bestellung, statt Sie damit zu überraschen.',
  },
  {
    id: 'kleintiere',
    headline: 'Nicht nur Mücken bleiben draussen',
    body: 'Wespen an der Fruchtschale, Spinnen im Schlafzimmer, Motten in der Küche – das Gewebe hält alles zurück, was in dieser Grössenordnung durchs Fenster kommt. Für die ganz kleinen Plagegeister wie Gnitzen oder Gewittertierchen bräuchte es ein feineres Gewebe; fragen Sie uns, wenn das bei Ihnen ein Thema ist.',
  },
]

export function Benefits() {
  return (
    <section className="section benefits" id="vorteile">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Warum überhaupt</span>
          <h2>Ein Sommer ohne Kompromiss zwischen Lüften und Ruhe.</h2>
          <p className="section__lead">
            Ein gutes Insektengitter merkt man nur daran, dass man nicht mehr darüber nachdenkt. Genau darauf sind
            unsere Netze gebaut.
          </p>
        </div>

        <div className="benefits__grid">
          {BENEFITS.map((benefit, index) => (
            <article className={`benefit${index === 0 ? ' benefit--lead' : ''}`} key={benefit.id}>
              {benefit.meta && <span className="pill">{benefit.meta}</span>}
              <h3>{benefit.headline}</h3>
              <p>{benefit.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
