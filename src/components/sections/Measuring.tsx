import './Measuring.css'

export function Measuring() {
  return (
    <section className="section measuring" id="montage">
      <div className="shell measuring__inner">
        <div className="measuring__copy">
          <span className="section__eyebrow">Messen &amp; Montage</span>
          <h2>Sie brauchen nur ein Massband – und auch das nur einmal.</h2>
          <p className="section__lead">
            Einmal nachmessen genügt – und danach nie wieder. Es dauert zwei Minuten und erspart Ihnen die einzige
            Enttäuschung, die bei so einem Kauf möglich ist:
          </p>

          <ol className="measuring__steps">
            <li>
              <strong>Breite innen messen.</strong> Von Laibung zu Laibung, dort wo das Fenster sitzt – nicht über den
              Rahmen.
            </li>
            <li>
              <strong>Höhe innen messen.</strong> Vom oberen Anschlag bis zum Fenstersims.
            </li>
            <li>
              <strong>Auf ganze Zentimeter runden.</strong> Nach unten. Den Rest übernimmt der Klemmspielraum.
            </li>
            <li>
              <strong>An drei Stellen messen.</strong> Oben, in der Mitte und unten. Alte Fenster sind selten exakt
              rechtwinklig – es zählt der kleinste Wert.
            </li>
          </ol>

          <p className="measuring__reassure">
            Unsicher? Kein Problem: Wir kommen vorbei und messen nach, bevor produziert wird. Kostet nichts und
            verpflichtet zu nichts.
          </p>
        </div>

        <figure className="measuring__diagram">
          <svg viewBox="0 0 320 300" role="img" aria-labelledby="measuring-title measuring-desc">
            <title id="measuring-title">Skizze: Breite und Höhe der Fensteröffnung messen</title>
            <desc id="measuring-desc">
              Ein Fenster in der Laibung. Die Breite wird waagrecht zwischen den inneren Laibungskanten gemessen, die
              Höhe senkrecht vom oberen Anschlag bis zum Fenstersims.
            </desc>

            <rect x="12" y="12" width="296" height="252" rx="10" className="m-wall" />
            <rect x="52" y="48" width="216" height="180" rx="4" className="m-reveal" />
            <rect x="64" y="60" width="192" height="156" rx="2" className="m-glass" />
            <line x1="160" y1="60" x2="160" y2="216" className="m-sash" />

            <g className="m-dim">
              <line x1="52" y1="252" x2="268" y2="252" />
              <line x1="52" y1="244" x2="52" y2="260" />
              <line x1="268" y1="244" x2="268" y2="260" />
              <text x="160" y="245" textAnchor="middle">Breite</text>
            </g>

            <g className="m-dim">
              <line x1="30" y1="48" x2="30" y2="228" />
              <line x1="22" y1="48" x2="38" y2="48" />
              <line x1="22" y1="228" x2="38" y2="228" />
              <text x="30" y="138" textAnchor="middle" transform="rotate(-90 30 138)">Höhe</text>
            </g>

            <rect x="46" y="228" width="228" height="10" rx="3" className="m-sill" />
            <text x="160" y="286" textAnchor="middle" className="m-note">innen gemessen, ohne Rahmen</text>
          </svg>
        </figure>
      </div>
    </section>
  )
}
