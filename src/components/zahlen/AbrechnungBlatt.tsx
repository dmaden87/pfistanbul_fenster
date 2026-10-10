import type { Abrechnung } from '../../types'
import { beteiligte } from '../../data/kostenConfig'
import { formatChf } from '../../lib/format'
import type { AdminTexte } from '../admin/sprache'

/**
 * Eine Abrechnung als Blatt: woraus sie besteht und was herauskommt.
 *
 * EIN BAUTEIL FUER ENTWURF UND HISTORIE, und das mit Absicht. Was im
 * Entwurf steht, muss nach dem Abschliessen genau gleich aussehen - sonst
 * prueft man eine Darstellung und bekommt eine andere. Deshalb liest es nur
 * den Datensatz und kennt den Unterschied gar nicht.
 *
 * DIE ZAHLEN KOMMEN AUS DEM DATENSATZ, nicht aus einer Rechnung. Bei einer
 * abgeschlossenen Abrechnung sind sie die von damals; waeren sie gerechnet,
 * aenderte sich ein alter Beleg, sobald jemand einen Preis korrigiert.
 */
interface Props {
  abrechnung: Abrechnung
  t: AdminTexte
}

const LEUTE = ['bora', 'ufuk', 'deniz'] as const

export function AbrechnungBlatt({ abrechnung: a, t }: Props) {
  const KOSTENTITEL: Record<string, string> = {
    herstellung: t.zHerstellung,
    lieferung: t.zLieferkosten,
    mwst: t.zEinfuhrsteuer,
    weiteres: t.zWeitereKosten,
    auslage: t.zBetriebskosten,
  }

  return (
    <div className="abrechnung">
      {a.auftraege.length > 0 && (
        <>
          <h4 className="zahlen__unterkopf">{t.zAuftraegeDarin}</h4>
          <div className="zahlen__rollen"><table className="zahlen__tabelle">
            <thead>
              <tr>
                <th>{t.zAuftrag}</th>
                <th className="zahlen__zahl">{t.zWare}</th>
                <th className="zahlen__zahl">{t.montageSumme}</th>
                <th className="zahlen__zahl">{t.zErloes}</th>
              </tr>
            </thead>
            <tbody>
              {a.auftraege.map((x) => (
                <tr key={x.bestellungId}>
                  <td data-titel={t.zAuftrag}>
                    {x.kunde}
                    <span className="zahlen__klein">{x.referenz}</span>
                  </td>
                  <td data-titel={t.zWare} className="zahlen__zahl">{formatChf(x.warenerloesChf)}</td>
                  <td data-titel={t.montageSumme} className="zahlen__zahl">{formatChf(x.montageerloesChf)}</td>
                  <td data-titel={t.zErloes} className="zahlen__zahl">{formatChf(x.erloesChf)}</td>
                </tr>
              ))}
              <tr className="zahlen__strich">
                <td><strong>{t.zZusammen}</strong></td>
                <td className="zahlen__zahl"><strong>{formatChf(a.warenerloesChf)}</strong></td>
                <td className="zahlen__zahl"><strong>{formatChf(a.montageerloesChf)}</strong></td>
                <td className="zahlen__zahl"><strong>{formatChf(a.erloesChf)}</strong></td>
              </tr>
            </tbody>
          </table></div>
        </>
      )}

      {a.posten.length > 0 && (
        <>
          <h4 className="zahlen__unterkopf">{t.zKostenDarin}</h4>
          <div className="zahlen__rollen"><table className="zahlen__tabelle">
            <thead>
              <tr>
                <th>{t.zPosten}</th>
                <th>{t.zWer}</th>
                <th className="zahlen__zahl">{t.zBetrag}</th>
              </tr>
            </thead>
            <tbody>
              {a.posten.map((p) => (
                <tr key={`${p.bestellungId ?? p.auslageId ?? ''}:${p.postenId}`}>
                  <td data-titel={t.zPosten}>
                    {p.bezeichnung ?? KOSTENTITEL[p.art] ?? p.art}
                    {p.kunde && <span className="zahlen__klein">{p.kunde}</span>}
                  </td>
                  <td data-titel={t.zWer}>{beteiligte[p.traeger]}</td>
                  <td data-titel={t.zBetrag} className="zahlen__zahl">{formatChf(p.betragChf)}</td>
                </tr>
              ))}
              <tr className="zahlen__strich">
                <td colSpan={2}><strong>{t.zZusammen}</strong></td>
                <td className="zahlen__zahl"><strong>{formatChf(a.rueckzahlungChf)}</strong></td>
              </tr>
            </tbody>
          </table></div>
        </>
      )}

      <div className="zahlen__rollen"><table className="zahlen__tabelle zahlen__tabelle--schmal">
        <tbody>
          <tr>
            <td>{t.zEinkassiertWare}</td>
            <td className="zahlen__zahl">{formatChf(a.warenerloesChf)}</td>
          </tr>
          <tr>
            <td>{t.zEinkassiertMontage}</td>
            <td className="zahlen__zahl">{formatChf(a.montageerloesChf)}</td>
          </tr>
          <tr>
            <td>{t.zWarenkostenDieser}</td>
            <td className="zahlen__zahl">− {formatChf(a.warenkostenChf)}</td>
          </tr>
          <tr>
            <td>{t.zBetriebskosten}</td>
            <td className="zahlen__zahl">− {formatChf(a.betriebskostenChf)}</td>
          </tr>
          <tr className="zahlen__strich">
            <td>{t.zTopfWare}</td>
            <td className="zahlen__zahl">{formatChf(a.warengewinnChf)}</td>
          </tr>
          <tr>
            <td>{t.zTopfMontage}</td>
            <td className="zahlen__zahl">{formatChf(a.montagegewinnChf)}</td>
          </tr>
        </tbody>
      </table></div>

      <div className="zahlen__rollen"><table className="zahlen__tabelle zahlen__tabelle--schmal">
        <thead>
          <tr>
            <th>{t.zWer}</th>
            <th className="zahlen__zahl">{t.zRueckzahlung}</th>
            <th className="zahlen__zahl">{t.zAnteil}</th>
            <th className="zahlen__zahl">{t.zZusammenSpalte}</th>
          </tr>
        </thead>
        <tbody>
          {LEUTE.map((wer) => (
            <tr key={wer}>
              <td data-titel={t.zWer}>{beteiligte[wer]}</td>
              <td data-titel={t.zRueckzahlung} className="zahlen__zahl">{formatChf(a.rueckzahlung[wer])}</td>
              <td data-titel={t.zAnteil} className="zahlen__zahl">{formatChf(a.anteile[wer])}</td>
              <td data-titel={t.zZusammenSpalte} className="zahlen__zahl">
                <strong>{formatChf(a.summe[wer])}</strong>
              </td>
            </tr>
          ))}
          <tr className="zahlen__strich">
            <td><strong>{t.zZusammen}</strong></td>
            <td className="zahlen__zahl"><strong>{formatChf(a.rueckzahlungChf)}</strong></td>
            <td className="zahlen__zahl"><strong>{formatChf(a.verteilbarChf)}</strong></td>
            <td className="zahlen__zahl">
              <strong>{formatChf(a.rueckzahlungChf + a.verteilbarChf)}</strong>
            </td>
          </tr>
        </tbody>
      </table></div>

      {a.verteilbarChf === 0 && <p className="zahlen__hinweis">{t.zNichtsZuVerteilen}</p>}
    </div>
  )
}
