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
    body: 'Unser Plissee liegt in feinen Falten in einer schmalen Schiene. Sie ziehen es mit einem Finger zu und genauso leicht wieder auf. Kein Aushängen, kein Verstauen im Keller – es bleibt das ganze Jahr montiert und stört trotzdem nie die Aussicht.',
  },
  {
    id: 'pollen',
    headline: 'Ruhigere Nächte in der Pollensaison',
    body: 'Mit dem feinen Pollenschutzgewebe kommt spürbar weniger Blütenstaub durchs offene Fenster. Wer im Frühling schlecht schläft, merkt den Unterschied zuerst im Schlafzimmer.',
    meta: 'Optional',
  },
  {
    id: 'preis',
    headline: 'Ehrlich gerechnet statt teuer verkauft',
    body: 'Wir haben keinen Showroom, keine Aussendienstprovision und keinen Anfahrtsweg – wir wohnen hier. Was wir dadurch sparen, steht direkt im Preis statt in der Marge.',
  },
  {
    id: 'bohren',
    headline: 'Ohne einen einzigen Dübel',
    body: 'Alles wird geklemmt, nichts wird gebohrt. Das heisst: keine Rückfrage bei der Verwaltung, keine Löcher, kein Ärger bei der Wohnungsabgabe.',
  },
  {
    id: 'kleintiere',
    headline: 'Nicht nur Mücken bleiben draussen',
    body: 'Wespen an der Fruchtschale, Spinnen im Schlafzimmer, Motten in der Küche – das Gewebe hält alles zurück, was sonst durchs Fenster hereinkommt. Auch der Ahornsamen im Herbst.',
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
