import type { useCart } from '../../hooks/useCart'
import { netSets, priceRange, ueberbauungen, activeUeberbauung, netsInSet } from '../../data/catalog'
import { formatChf } from '../../lib/format'
import { Shop } from './Shop'
import './Siedlungen.css'

/**
 * Die Siedlungen unter eigener Adresse.
 *
 * WARUM DIESE SEITE: Bis hierher stand das Siedlungsangebot mitten auf der
 * Startseite und bestimmte sie. Die Wirklichkeit sieht anders aus - die
 * meisten Anfragen kommen von ausserhalb einer ausgemessenen Ueberbauung.
 * Das Angebot verschwindet deshalb nicht, es zieht um: vollstaendig, mit
 * Warenkorb und Onlinezahlung, nur eben dorthin, wo es jemand gezielt
 * aufruft. pfistanbul.ch/siedlungen laesst sich drucken und verschicken.
 *
 * DIE LISTE KOMMT AUS DEM KATALOG, nicht aus diesem Bauteil: Sobald eine
 * zweite Ueberbauung ausgemessen ist, steht sie hier, ohne dass jemand die
 * Seite anfasst.
 *
 * DER RICHTWERT UNTEN KOMMT AUS priceRange, nicht aus den Preisen dieser
 * Siedlung. Hier stand zuerst die Spanne der Siedlungsformate - das las sich
 * plausibel und war trotzdem falsch: Siedlungspreise gelten fuer vier
 * ausgemessene Formate, das Sondermass rechnet nach Flaeche. Die Startseite
 * nennt dieselbe Spanne aus derselben Quelle; zwei Zahlen fuer dieselbe
 * Sache waeren auf der Seite nicht aufgefallen, beim Kunden schon.
 *
 * NOCH NICHT GELOEST, und darum hier offen benannt: Das Sortiment unten
 * zeigt die Formate der AKTIVEN Ueberbauung. Solange es eine gibt, stimmt
 * das. Bei der zweiten muss der Warenkorb wissen, zu welcher Siedlung eine
 * Zeile gehoert - das haengt an den Stripe-Preisen und wird gemacht, wenn
 * es soweit ist, nicht auf Verdacht.
 */

interface SiedlungenProps {
  cart: ReturnType<typeof useCart>
  onOpenCart: () => void
  /** Zurueck zur Startseite, zum Sondermass-Abschnitt. */
  onSondermassClick: () => void
}

export function Siedlungen({ cart, onOpenCart, onSondermassClick }: SiedlungenProps) {
  const guenstigstesSet = Math.min(...netSets.map((set) => set.priceChf))

  return (
    <>
      <section className="section siedlungen">
        <div className="shell">
          <div className="section__intro">
            <span className="section__eyebrow">Ausgemessene Siedlungen</span>
            <h1>Einmal ausgemessen. Für alle.</h1>
            <p className="section__lead">
              Eine Überbauung wird als Ganzes gebaut – dieselben Fensterformate wiederholen sich über alle
              Wohnungen. Wo wir sie einmal ausgemessen haben, gibt es feste Grössen, feste Preise und Sets für die
              ganze Wohnung. Sie wählen aus, wir liefern an die Wohnungstür. Messen müssen Sie nichts.
            </p>
          </div>

          <ul className="siedlungen__liste">
            {ueberbauungen.map((ueberbauung) => (
              <li key={ueberbauung.id} className="siedlung">
                <div className="siedlung__kopf">
                  <h2>{ueberbauung.name}</h2>
                  <span className="pill">{ueberbauung.place}</span>
                </div>
                <p className="siedlung__satz">
                  {ueberbauung.windowTypes.length} Fensterformate, {ueberbauung.sets.length} Sets für ganze
                  Wohnungen. Einzelnes Netz ab {formatChf(Math.min(...ueberbauung.windowTypes.map((t) => t.priceChf)))},
                  ganze Wohnung ab {formatChf(Math.min(...ueberbauung.sets.map((s) => s.priceChf)))}.
                </p>
                <ul className="siedlung__fakten">
                  <li>Lieferung gratis an die Wohnungstür</li>
                  <li>Passgarantie: passt es nicht, tauschen wir</li>
                  <li>
                    Sets mit {Math.min(...ueberbauung.sets.map(netsInSet))} bis{' '}
                    {Math.max(...ueberbauung.sets.map(netsInSet))} Netzen
                  </li>
                </ul>
                <a className="btn btn--ghost siedlung__sprung" href="#groessen">
                  Sortiment und Preise ansehen
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Shop cart={cart} onOpenCart={onOpenCart} onRequestClick={onSondermassClick} />

      <section className="section siedlungen__fehlt">
        <div className="shell">
          <div className="section__intro">
            <h2>Ihre Siedlung ist nicht dabei?</h2>
            <p className="section__lead">
              Dann fertigen wir nach Mass – dasselbe Produkt, nur mit Ihren Zahlen statt unseren.
              Richtwert CHF {priceRange.minChf}–{priceRange.maxChf} pro Fenster für gängige Formate bis rund{' '}
              {priceRange.maxAreaM2} m², und wenn Sie wollen, kommen wir zum Ausmessen vorbei.
            </p>
          </div>
          <button type="button" className="btn btn--lg" onClick={onSondermassClick}>
            Mein Fenster ausrechnen
          </button>
          <p className="siedlungen__hinweis">
            Sie wohnen in einer Überbauung, in der mehrere dasselbe bräuchten? Schreiben Sie uns – ab fünf
            Wohnungen messen wir sie aus und sie bekommt hier ihren eigenen Eintrag, mit festen Preisen für alle.
            Günstigstes Set heute: {formatChf(guenstigstesSet)} für {activeUeberbauung.shortName}.
          </p>
        </div>
      </section>
    </>
  )
}
