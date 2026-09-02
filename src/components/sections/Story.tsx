import { useState } from 'react'
import { operator } from '../../data/operator'
import './Story.css'

/**
 * Wie es angefangen hat. Der einzige Vertrauensanker, den es sonst nirgends
 * zu kaufen gibt – deshalb steht die Geschichte in der Ich-Form und mit Foto.
 *
 * Das Foto liegt unter public/ (Pfad in operator.teamPhoto). Fehlt die Datei,
 * erscheint automatisch ein ruhiger Platzhalter statt eines kaputten Bildes.
 */
export function Story() {
  const [photoFailed, setPhotoFailed] = useState(false)

  return (
    <section className="section story" id="ueberuns">
      <div className="shell story__inner">
        <figure className="story__photo">
          {photoFailed ? (
            <div className="story__photo-fallback">
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <circle cx="17" cy="19" r="6" />
                <circle cx="32" cy="21" r="5" />
                <path d="M6 40c1.6-6.6 6-10.4 11-10.4S26.4 33.4 28 40" strokeLinecap="round" />
                <path d="M28 40c1.2-4.8 4.6-7.6 8-7.6S43.2 35.2 44 40" strokeLinecap="round" />
              </svg>
              <p>Foto folgt</p>
            </div>
          ) : (
            <img
              src={operator.teamPhoto}
              alt={`${operator.people[0].name} und ${operator.people[1].name}, die beiden Gründer von ${operator.businessName}`}
              loading="lazy"
              onError={() => setPhotoFailed(true)}
            />
          )}
          <figcaption>
            {operator.people[0].name} und {operator.people[1].name}
          </figcaption>
        </figure>

        <div className="story__copy">
          <span className="section__eyebrow">Wie es angefangen hat</span>
          <h2>Es begann mit einem Kaffee.</h2>

          <p className="story__lead">
            Diesen Sommer habe ich mir in der Türkei Fliegennetze machen lassen. Mücken, Bienen und Fliegen hatten mir
            das offene Fenster gründlich verleidet.
          </p>
          <p>
            Noch während der Montage kam Ufuk auf einen Kaffee vorbei. Er schaute sich die Netze an, war begeistert und
            fragte, ob ich ihm nächstes Jahr auch welche mitbringen könne. Bis der Kaffee ausgetrunken war, hatten sich
            zwei weitere Nachbarn gemeldet – ob es für sie auch welche gäbe.
          </p>
          <p>
            Da haben wir uns hingesetzt. Mit Lieferanten telefoniert, mit Transporteuren gerechnet, hin und her
            überlegt. Herausgekommen ist Pfistanbul Fenster: kein Unternehmen, das in die Siedlung hinein verkauft,
            sondern zwei Nachbarn, die etwas für die Siedlung organisieren.
          </p>
          <p className="story__signature">
            {operator.people[0].name} und {operator.people[1].name}
            <span>
              {operator.people[0].street.replace(/ \d+$/, '')}, {operator.people[0].city}
            </span>
          </p>
        </div>
      </div>
    </section>
  )
}
