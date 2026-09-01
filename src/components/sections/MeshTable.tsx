import { meshOptions } from '../../data/catalog'
import { shopConfig } from '../../data/shopConfig'
import './MeshTable.css'

/**
 * ACHTUNG – VOM BETREIBER ZU PRÜFEN:
 * Maschenweite und offene Fläche sind marktübliche Richtwerte für die jeweilige
 * Gewebeart, nicht das Datenblatt des eingekauften Materials. Jede Werbeaussage
 * muss im Streitfall bewiesen werden können – die Beweislast liegt beim
 * Werbenden (Art. 13a UWG). Vor der Veröffentlichung durch die echten Werte des
 * Lieferanten ersetzen. Markennamen wie Transpatec, Polltec oder Petscreen nur
 * verwenden, wenn genau dieses Material verbaut wird.
 */
export function MeshTable() {
  const rows = meshOptions.filter((mesh) => mesh.id !== 'pollen' || shopConfig.pollenEnabled)

  return (
    <section className="section mesh-table" id="gewebe">
      <div className="shell">
        <div className="section__intro">
          <span className="section__eyebrow">Was drin steckt</span>
          <h2>Das Gewebe entscheidet – mitsamt den ehrlichen Nachteilen.</h2>
          <p className="section__lead">
            Je feiner ein Gewebe, desto weniger Luft und Licht kommt durch. Das ist Physik und lässt sich nicht
            wegwerben. Deshalb legen wir die Zahlen offen, statt „extra fein“ auf alles zu schreiben.
          </p>
        </div>

        <div className="mesh-table__scroll">
          <table>
            <caption className="visually-hidden">
              Vergleich der Gewebearten nach Maschenweite, offener Fläche, Schutzwirkung und Aufpreis
            </caption>
            <thead>
              <tr>
                <th scope="col">Gewebe</th>
                <th scope="col">Maschenweite</th>
                <th scope="col">Offene Fläche</th>
                <th scope="col">Hält ab</th>
                <th scope="col">Aufpreis</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((mesh) => (
                <tr key={mesh.id}>
                  <th scope="row">
                    <span className={`mesh-swatch mesh-swatch--${mesh.id}`} aria-hidden="true" />
                    <span>
                      {mesh.name}
                      <em>{mesh.tradeoff}</em>
                    </span>
                  </th>
                  <td>{mesh.spec}</td>
                  <td>{mesh.openArea}</td>
                  <td>{mesh.stops}</td>
                  <td className="mesh-table__price">
                    {mesh.surchargePerM2 === 0 ? '–' : `+ CHF ${mesh.surchargePerM2}/m²`}
                  </td>
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
            Angaben sind marktübliche Richtwerte für die jeweilige Gewebeart.
            {shopConfig.pollenEnabled && (
              <>
                {' '}
                Pollenschutzgitter sind Teil der Vorbeugung und ersetzen keine medizinische Behandlung; einen
                vollständigen Schutz gegen Pollen gibt es nicht.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  )
}
