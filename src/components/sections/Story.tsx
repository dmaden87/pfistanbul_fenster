import { Foto } from '../media/Foto'
import { fotos } from '../../data/fotos'
import { operator } from '../../data/operator'
import { shopConfig } from '../../data/shopConfig'
import './Story.css'

/**
 * Wie es angefangen hat. Der einzige Vertrauensanker, den es sonst nirgends
 * zu kaufen gibt – deshalb steht die Geschichte in der Ich-Form und mit Foto.
 *
 * Das Foto kommt wie die uebrigen aus scripts/bilder.mjs. Solange dort keines
 * hinterlegt ist, erscheint ein ruhiger Platzhalter statt eines Lochs im
 * Layout.
 */
export function Story() {
  const photoFehlt = fotos.team === undefined

  return (
    <section className="section story" id="ueberuns">
      <div className="shell story__inner">
        <figure className="story__photo">
          {photoFehlt ? (
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
            <Foto
              name="team"
              alt={`${operator.people[0].name} und ${operator.people[1].name}, die beiden Gründer von ${operator.businessName}`}
              sizes="(max-width: 60rem) 92vw, min(28rem, 40vw)"
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
            sondern zwei Nachbarn, die etwas für die Nachbarschaft organisieren.
          </p>
          <p>
            Inzwischen hat es sich herumgesprochen. Es fragen nicht mehr nur Leute aus unserem Haus, sondern auch
            Freunde und Bekannte. Am Vorgehen ändert das nichts: Wir messen selbst, wir liefern selbst, wir bringen es
            vorbei. Nur fahren wir dafür nicht durch die halbe Schweiz – vorerst bleiben wir im{' '}
            {shopConfig.serviceArea}.
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
