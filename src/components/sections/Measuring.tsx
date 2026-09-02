import { Foto } from '../media/Foto'
import './Measuring.css'

/**
 * Der Netzrahmen ist rund 5 cm breit und wird von aussen in den äusseren
 * Fensterrahmen gedrückt, wo er rundum mit doppelseitigem Klebeband hält.
 * Gemessen wird deshalb die lichte Öffnung im äusseren Rahmen – nicht die
 * Laibung und nicht das Glas.
 */
export function Measuring() {
  return (
    <section className="section measuring" id="montage">
      <div className="shell measuring__inner">
        <div className="measuring__copy">
          <span className="section__eyebrow">Messen &amp; Montage</span>
          <h2>Einmal richtig messen – und danach nie wieder.</h2>
          <p className="section__lead">
            Der Netzrahmen ist rund fünf Zentimeter breit und wird von aussen in den äusseren Fensterrahmen gedrückt.
            Dort klebt er rundum mit doppelseitigem Band. Gemessen wird deshalb genau diese Öffnung:
          </p>

          <ol className="measuring__steps">
            <li>
              <strong>Im äusseren Fensterrahmen messen.</strong> Von Rahmeninnenkante zu Rahmeninnenkante – nicht die
              Laibung, nicht das Glas.
            </li>
            <li>
              <strong>An drei Stellen messen.</strong> Die Breite oben, in der Mitte und unten; die Höhe links, in der
              Mitte und rechts. Es zählt der kleinste Wert.
            </li>
            <li>
              <strong>Auf ganze Zentimeter abrunden.</strong> Nach unten, nie auf.
            </li>
            <li>
              <strong>Klebefläche prüfen.</strong> Rundum braucht es rund fünf Zentimeter ebene, saubere Fläche. Sitzt
              dort eine Dichtung, ein Griff oder ein Rollladen im Weg, sagen Sie uns Bescheid.
            </li>
          </ol>

          <p className="measuring__reassure">
            Unsicher? Wir kommen vorbei und messen nach, bevor produziert wird. Kostet nichts und verpflichtet zu
            nichts – und dann übernehmen wir auch die Verantwortung fürs Mass.
          </p>
        </div>

        <figure className="measuring__diagram">
          <svg viewBox="0 0 360 320" role="img" aria-labelledby="measuring-title measuring-desc">
            <title id="measuring-title">Skizze: Wo am Fenster gemessen wird</title>
            <desc id="measuring-desc">
              Ein Fenster von aussen. Der rund fünf Zentimeter breite Netzrahmen sitzt innerhalb des äusseren
              Fensterrahmens und klebt dort rundum. Gemessen wird die lichte Breite und Höhe dieser Öffnung.
            </desc>

            <rect x="20" y="20" width="320" height="230" rx="10" className="m-wall" />
            <rect x="70" y="46" width="220" height="178" rx="4" className="m-frame" />
            <rect x="84" y="60" width="192" height="150" className="m-band" />
            <rect x="100" y="76" width="160" height="118" className="m-mesh" />

            <g className="m-dim">
              <line x1="84" y1="240" x2="276" y2="240" />
              <line x1="84" y1="233" x2="84" y2="247" />
              <line x1="276" y1="233" x2="276" y2="247" />
              <text x="180" y="262" textAnchor="middle">
                Breite
              </text>
            </g>

            <g className="m-dim">
              <line x1="48" y1="60" x2="48" y2="210" />
              <line x1="41" y1="60" x2="55" y2="60" />
              <line x1="41" y1="210" x2="55" y2="210" />
              <text x="30" y="135" textAnchor="middle" transform="rotate(-90 30 135)">
                Höhe
              </text>
            </g>

            <g className="m-callout">
              <line x1="92" y1="68" x2="150" y2="292" />
              <circle cx="92" cy="68" r="3" />
              <text x="155" y="296">ca. 5 cm Rahmen, klebt rundum</text>
            </g>
          </svg>
        </figure>

        {/*
          Die Skizze erklaert das Mass, das Foto zeigt das Ergebnis: ein Netz
          montiert, das Fenster daneben offen, die Storen darueber weiterhin
          benutzbar. Genau danach wird immer wieder gefragt.
        */}
        <figure className="measuring__photo">
          <Foto
            name="zimmer-storen"
            alt="Zwei nebeneinanderliegende Fenster von innen, an beiden ist ein Insektenschutz-Plissee montiert; am linken ist es teilweise zugezogen. Über beiden sind die Lamellenstoren hochgezogen."
            sizes="(max-width: 60rem) 92vw, min(70rem, 90vw)"
          />
          <figcaption>
            Denizʼ Wohnung im Pfisterhölzli: Das Netz sitzt vor dem Fenster, die Storen darüber lassen sich weiterhin
            ganz normal bedienen.
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
