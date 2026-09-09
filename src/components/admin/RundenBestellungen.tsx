import { useState } from 'react'
import type { AustrittsGrund, Bestellung, Lieferung } from '../../types'
import { formatChf } from '../../lib/format'
import { kennungFuer } from '../../lib/bestellauftrag'
import { useSprache } from './sprache'

/**
 * Welche Bestellungen in einer Runde stecken – und der Weg hinaus.
 *
 * Bis hierher war die Runde eine Liste von Netzzeilen. Das ist die
 * Arbeitssicht fuer den Produzenten, aber nicht die, in der man
 * entscheidet: Entschieden wird je Bestellung, denn eine Bestellung ist
 * immer ganz drin oder ganz draussen.
 *
 * ZWEI AUSGAENGE, weil sie an verschiedene Orte fuehren. Der Unterschied
 * kostet im Zweifel eine ganze Anfragerunde bei Bora, deshalb steht er
 * ausgeschrieben da und nicht als zwei gleich aussehende Knoepfe.
 */

interface RundenBestellungenProps {
  lieferung: Lieferung
  /** Alle Bestellungen; die der Runde werden hier herausgesucht. */
  bestellungen: Bestellung[]
  onEntfernen: (bestellungId: string, grund: AustrittsGrund) => Promise<void>
  /** Im Entwurf entscheidet die Auswahl oben, nicht dieser Abschnitt. */
  aenderbar: boolean
}

export function RundenBestellungen({
  lieferung,
  bestellungen,
  onEntfernen,
  aenderbar,
}: RundenBestellungenProps) {
  const { t } = useSprache()
  const [frage, setFrage] = useState<string | null>(null)
  const [sendet, setSendet] = useState(false)

  const dabei = bestellungen.filter((b) => lieferung.bestellungIds.includes(b.id))
  const raus = (lieferung.entfernt ?? [])
    .map((a) => ({ austritt: a, bestellung: bestellungen.find((b) => b.id === a.bestellungId) }))
    .filter((x) => x.bestellung)

  const ohneZusage = dabei.filter((b) => b.status !== 'zugesagt')

  const nehmen = async (bestellungId: string, grund: AustrittsGrund) => {
    setSendet(true)
    try {
      await onEntfernen(bestellungId, grund)
      setFrage(null)
    } finally {
      setSendet(false)
    }
  }

  return (
    <section className="lieferung__block">
      <h2>{t.bestellungenDerRunde}</h2>
      <p className="admin__zusammenfassung">{t.bestellungenDerRundeSatz}</p>

      <ul className="runden-best">
        {dabei.map((b) => (
          <li key={b.id} className="runden-best__zeile">
            <span className="runden-best__kennung">{kennungFuer(b)}</span>
            <span className="runden-best__name">{b.kunde.name}</span>
            {b.status !== 'zugesagt' && (
              <span className="admin__marke admin__marke--warnung">{t.ohneZusageMarke}</span>
            )}
            <span className="runden-best__preis">{formatChf(b.summeChf)}</span>

            {aenderbar &&
              (frage === b.id ? (
                <div className="runden-best__frage">
                  <strong>{t.ausDerRundeFrage}</strong>
                  {/*
                    Die Folgen stehen unter jedem Knopf. Wer "Aenderung"
                    waehlt, wo "keine Zusage" gemeint war, schickt Bora eine
                    zweite Anfrage fuer dieselben Masse.
                  */}
                  <button
                    type="button"
                    className="btn btn--quiet"
                    disabled={sendet}
                    onClick={() => nehmen(b.id, 'keineZusage')}
                  >
                    {t.grundKeineZusage}
                  </button>
                  <p className="admin__detail">{t.grundKeineZusageSatz}</p>
                  <button
                    type="button"
                    className="btn btn--quiet admin__gefahr"
                    disabled={sendet}
                    onClick={() => nehmen(b.id, 'aenderung')}
                  >
                    {t.grundAenderung}
                  </button>
                  <p className="admin__detail">{t.grundAenderungSatz}</p>
                  <button type="button" className="btn btn--quiet" onClick={() => setFrage(null)}>
                    {t.abbrechen}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => setFrage(b.id)}
                  disabled={sendet}
                >
                  {t.ausDerRunde}
                </button>
              ))}
          </li>
        ))}
      </ul>

      {ohneZusage.length > 0 && lieferung.status === 'preise' && (
        <p className="lieferung__warnung">
          {t.bestellenNurZugesagte} {dabei.length - ohneZusage.length} {t.vonInsgesamt} {dabei.length}
        </p>
      )}

      {raus.length > 0 && (
        <div className="runden-best__raus">
          <h3>{t.ausgestiegen}</h3>
          <p className="admin__detail">{t.ausgestiegenSatz}</p>
          <ul className="runden-best">
            {raus.map(({ austritt, bestellung }) => (
              <li key={austritt.bestellungId} className="runden-best__zeile runden-best__zeile--raus">
                <span className="runden-best__kennung">{kennungFuer(bestellung!)}</span>
                <span className="runden-best__name">{bestellung!.kunde.name}</span>
                <span className="admin__detail">
                  {austritt.grund === 'keineZusage' ? t.grundKeineZusage : t.grundAenderung}
                  {austritt.notiz && ` · ${austritt.notiz}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
