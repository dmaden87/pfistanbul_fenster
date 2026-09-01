import './MeshTable.css'

/**
 * ACHTUNG – VOM BETREIBER ZU PRUEFEN:
 * Die Gewebedaten sind marktuebliche Richtwerte. Vor dem Live-Gang müssen sie
 * gegen das Datenblatt des tatsächlich eingekauften Gewebes geprüft und
 * ersetzt werden. Markennamen wie Transpatec, Polltec oder Petscreen dürfen
 * nur stehen, wenn genau dieses Material verbaut wird.
 */

interface MeshRow {
  id: string
  name: string
  mesh: string
  open: string
  stops: string
  note: string
}

const ROWS: MeshRow[] = [
  {
    id: 'standard',
    name: 'Standard Fiberglas',
    mesh: 'ca. 1,4 × 1,6 mm',
    open: 'ca. 60 %',
    stops: 'Stechmücken, Fliegen, Wespen, Hornissen, Motten',
    note: 'Das Gewebe für den Alltag. Viel Luft, kaum sichtbar, sehr langlebig.',
  },
  {
    id: 'fein',
    name: 'Feinmaschgewebe',
    mesh: 'ca. 0,7 × 0,7 mm',
    open: 'ca. 65 %',
    stops: 'zusätzlich Gnitzen, Kriebelmücken, Trauermücken, Gewittertierchen',
    note: 'Sinnvoll in Seenähe und im Erdgeschoss neben den Familiengärten.',
  },
  {
    id: 'pollen',
    name: 'Pollenschutzgewebe',
    mesh: 'beschichtet, längliche Masche',
    open: 'ca. 33 %',
    stops: 'Insekten plus ein erheblicher Teil des Blütenstaubs',
    note: 'Hält Pollen durch Anhaftung, nicht durch die Maschenweite. Dafür deutlich weniger Luft und Durchsicht.',
  },
  {
    id: 'katze',
    name: 'Katzenschutzgewebe',
    mesh: 'ca. 1,5 × 2,5 mm',
    open: 'ca. 36 %',
    stops: 'Insekten, und es hält dem Gewicht einer Katze stand',
    note: 'Rund siebenmal reissfester als Standardgewebe. Gröbere Masche, dafür belastbar.',
  },
]

export function MeshTable() {
  return (
    <section className="section mesh-table" id="gewebe">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Was drin steckt</span>
          <h2>Vier Gewebe, vier Aufgaben – und die ehrlichen Nachteile dazu.</h2>
          <p className="section__lead">
            Je feiner ein Gewebe, desto weniger Luft und Licht kommt durch. Das ist Physik und lässt sich nicht
            wegwerben. Deshalb legen wir die Zahlen offen, statt „extra fein“ auf alles zu schreiben.
          </p>
        </div>

        <div className="mesh-table__scroll">
          <table>
            <caption className="visually-hidden">
              Vergleich der vier Gewebearten nach Maschenweite, offener Fläche und Schutzwirkung
            </caption>
            <thead>
              <tr>
                <th scope="col">Gewebe</th>
                <th scope="col">Maschenweite</th>
                <th scope="col">Offene Fläche</th>
                <th scope="col">Hält ab</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    <span className={`mesh-swatch mesh-swatch--${row.id}`} aria-hidden="true" />
                    <span>
                      {row.name}
                      <em>{row.note}</em>
                    </span>
                  </th>
                  <td data-label="Maschenweite">{row.mesh}</td>
                  <td data-label="Offene Fläche">{row.open}</td>
                  <td data-label="Hält ab">{row.stops}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mesh-table__notes">
          <p>
            <strong>Dichtung schlägt Gewebe.</strong> Ein Spalt von zwei Millimetern zwischen Rahmen und Laibung macht
            das beste Gewebe wirkungslos. Deshalb ist bei uns jeder Rahmen umlaufend mit einer Bürstendichtung
            versehen – das haben Klettband- und Magnetlösungen prinzipbedingt nicht.
          </p>
          <p className="mesh-table__disclaimer">
            Angaben sind marktübliche Richtwerte für die jeweilige Gewebeart. Pollenschutzgitter sind Teil der
            Vorbeugung und ersetzen keine medizinische Behandlung; einen vollständigen Schutz gegen Pollen gibt es
            nicht.
          </p>
        </div>
      </div>
    </section>
  )
}
