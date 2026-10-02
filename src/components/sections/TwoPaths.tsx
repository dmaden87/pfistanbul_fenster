import { activeUeberbauung, netSets, windowTypes } from '../../data/catalog'
import { formatChf } from '../../lib/format'
import './TwoPaths.css'

interface TwoPathsProps {
  onCustomClick: () => void
  onSiedlungenClick: () => void
}

/**
 * Das Siedlungsangebot als Band auf der Startseite.
 *
 * HIER STANDEN FRUEHER ZWEI GLEICHWERTIGE WEGE nebeneinander, die Siedlung
 * zuerst. Das bildete das Geschaeft nicht mehr ab: Die meisten Anfragen
 * kommen von Fenstern, die niemand ausgemessen hat. Das Angebot bleibt
 * vollstaendig - es steht jetzt auf /siedlungen und wird von hier aus
 * genannt, statt die Startseite zu bestimmen.
 *
 * Es steht BEWUSST WEIT UNTEN und trotzdem nicht im Kleingedruckten: Wer
 * einen Flyer im Briefkasten hatte und auf der Startseite landet, muss sein
 * Angebot finden, ohne zu suchen - deshalb ein ganzes Band mit Namen, Preis
 * und Knopf und nicht bloss ein Satz mit Verweis.
 */
export function TwoPaths({ onCustomClick, onSiedlungenClick }: TwoPathsProps) {
  const guenstigstes = Math.min(...windowTypes.map((typ) => typ.priceChf))
  const guenstigstesSet = Math.min(...netSets.map((set) => set.priceChf))

  return (
    <section className="section two-paths" id="wege">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Ausgemessene Siedlungen</span>
          <h2>Wohnen Sie in einer Siedlung, die wir schon kennen?</h2>
          <p className="section__lead">
            Eine Überbauung wird als Ganzes gebaut – dieselben Fensterformate wiederholen sich über alle Wohnungen.
            Wo wir sie einmal ausgemessen haben, gibt es feste Preise und Sets für die ganze Wohnung. Dann müssen
            Sie gar nichts messen.
          </p>
        </div>

        <div className="two-paths__band">
          <div className="two-paths__text">
            <span className="pill">Bereits ausgemessen</span>
            <h3>{activeUeberbauung.name}</h3>
            <p>
              {activeUeberbauung.place}. {windowTypes.length} Fensterformate, einzelnes Netz ab{' '}
              {formatChf(guenstigstes)}, ganze Wohnung ab {formatChf(guenstigstesSet)} – mit Lieferung an die
              Wohnungstür und Passgarantie.
            </p>
          </div>

          <div className="two-paths__aktion">
            <button type="button" className="btn btn--lg" onClick={onSiedlungenClick}>
              Zu den Siedlungen
            </button>
            <button type="button" className="btn btn--ghost" onClick={onCustomClick}>
              Nicht dabei? Nach Mass rechnen
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
