import { useState } from 'react'
import type { Bestellung, BestellAenderung, BestellPosition, BestellStatus } from '../../types'
import type { AdminTexte } from './sprache'
import { formatChf } from '../../lib/format'
import {
  artText,
  quelleText,
  datum,
  montageBetrag,
  positionDetail,
  positionenSumme,
  tag,
  tageSeit,
  zahlungsdifferenz,
  zahlungstext,
} from './hilfen'
import { NetzEditor } from './NetzEditor'
import { fuelle, useSprache } from './sprache'

/**
 * Eine Bestellung in der Arbeitsliste.
 *
 * Eine Bestellung ist ein Eintrag, die einzelnen Netze stecken darin. Im
 * eingeklappten Zustand steht deshalb nur, was man zum Sortieren braucht –
 * wer, wie viele Netze, wie viel. Die Netze selbst kommen beim Aufklappen,
 * und dort lassen sie sich auch aendern.
 *
 * Die Schritte bleiben immer sichtbar. Sie sind die taegliche Arbeit; sie
 * hinter einem Klick zu verstecken hiesse, jeden Tag zweimal zu klicken.
 */

interface BestellKarteProps {
  bestellung: Bestellung
  montageProNetz: number
  onStatus: (id: string, status: BestellStatus) => void
  onAendern: (id: string, aenderung: BestellAenderung) => Promise<void>
  onLoeschen: (id: string) => void
  /** Fuer die Lieferrunde gewaehlt. Fehlt bei abgeschlossenen Eintraegen. */
  gewaehlt?: boolean
  onWahl?: (id: string, gewaehlt: boolean) => void
}

/**
 * Welche Schritte von hier aus möglich sind. Vorwärts ist der Normalfall,
 * zurück steht bewusst auch offen: Wer versehentlich klickt, soll das ohne
 * Umweg über die Datenbank geraderücken können.
 */
function schritte(b: Bestellung, t: AdminTexte): { status: BestellStatus; text: string; art: 'haupt' | 'still' }[] {
  switch (b.status) {
    case 'neu':
      return [
        // Beim Sondermass geht es zuerst zum Ausmessen und Offerieren; eine
        // feste Bestellung aus dem Warenkorb kann direkt zum Lieferanten.
        { status: 'offerte', text: t.schrittOfferieren, art: b.art === 'bestellung' ? 'still' : 'haupt' },
        {
          status: 'bestellt',
          text: b.art === 'bestellung' ? t.schrittBestellt : t.schrittAngenommen,
          art: b.art === 'bestellung' ? 'haupt' : 'still',
        },
        { status: 'geloescht', text: b.art === 'bestellung' ? t.schrittStorniert : t.schrittAbgesagt, art: 'still' },
      ]
    case 'offerte':
      return [
        { status: 'bestellt', text: t.schrittZugesagt, art: 'haupt' },
        { status: 'neu', text: t.schrittZurueckNeu, art: 'still' },
        { status: 'geloescht', text: t.schrittAbgesagt, art: 'still' },
      ]
    case 'bestellt':
      return [
        { status: 'erledigt', text: t.schrittErledigt, art: 'haupt' },
        { status: 'offerte', text: t.schrittZurueckOfferte, art: 'still' },
        { status: 'geloescht', text: t.schrittDochStorniert, art: 'still' },
      ]
    default:
      return [{ status: 'bestellt', text: t.schrittWiederOeffnen, art: 'still' }]
  }
}

/** Wie viele Netze in der Bestellung stecken. Sets zaehlen als eine Position. */
function netzZahl(positionen: BestellPosition[]): number {
  return positionen.reduce((summe, p) => summe + p.menge, 0)
}

export function BestellKarte({
  bestellung: b,
  montageProNetz,
  onStatus,
  onAendern,
  onLoeschen,
  gewaehlt,
  onWahl,
}: BestellKarteProps) {
  const [offen, setOffen] = useState(false)
  const [bearbeitet, setBearbeitet] = useState(false)
  const [loeschFrage, setLoeschFrage] = useState(false)
  const [notiz, setNotiz] = useState(b.notiz ?? '')
  const { t, ort } = useSprache()

  const montage = montageBetrag(b)
  const differenz = zahlungsdifferenz(b)
  const anzahl = netzZahl(b.positionen)
  const offerteTage = tageSeit(b.offerteAm)

  const speichereNetze = async (positionen: BestellPosition[], montageChf: number) => {
    await onAendern(b.id, { positionen, montageChf })
    setBearbeitet(false)
  }

  return (
    <li className={`admin__karte admin__karte--${b.status}`}>
      <div className="admin__karte-kopf">
        {onWahl && (
          <label className="admin__wahl">
            <input type="checkbox" checked={Boolean(gewaehlt)} onChange={(e) => onWahl(b.id, e.target.checked)} />
            <span className="admin__wahl-text">{t.fuerDieLieferrunde}</span>
          </label>
        )}
        <span className={`admin__art admin__art--${b.art}`}>{artText(b.art, t)}</span>
        <span className="admin__referenz">{b.referenz || b.id}</span>
        <span className="admin__datum">{datum(b.eingang)}</span>
        {b.quelle && b.quelle !== 'web' && <span className="admin__marke">{quelleText(b.quelle, t)}</span>}
        {b.bezahlung?.status === 'bezahlt' && (
          <span className="admin__marke admin__marke--gut">{t.bezahltMarke} · {formatChf(b.bezahlung.betragChf)}</span>
        )}
        {b.status === 'geloescht' && <span className="admin__marke">{t.abgesagtMarke}</span>}
        {b.status === 'erledigt' && <span className="admin__marke admin__marke--gut">{t.erledigtMarke}</span>}
      </div>

      <div className="admin__zeile">
        <strong>{b.kunde.name}</strong>
        <span className="admin__detail">
          {anzahl > 0 ? `${anzahl} ${anzahl === 1 ? t.netz : t.netzeMehrzahl}` : t.nochKeineNetze}
          {b.montage && ` · ${t.mitMontage}`}
        </span>
        <strong className="admin__preis">{formatChf(b.summeChf)}</strong>
      </div>

      {/*
        Die beiden Haken des Offert-Abschnitts. Absichtlich Haken und nicht
        zwei Radiobuttons: Ausgemessen und offeriert schliessen einander nicht
        aus, sondern folgen aufeinander. Mit Radiobuttons wuerde das Setzen
        von "Offerte versendet" die Information loeschen, dass ausgemessen
        wurde – und beim Sondermass nach Kundenmass kommt die Offerte auch
        ganz ohne Messtermin zustande.
      */}
      {b.status === 'offerte' && (
        <div className="admin__haken-reihe">
          <label className="admin__haken">
            <input
              type="checkbox"
              checked={Boolean(b.ausgemessenAm)}
              onChange={(e) => onAendern(b.id, { ausgemessen: e.target.checked })}
            />
            <span>
              {t.ausgemessen}
              {b.ausgemessenAm && <span className="admin__detail"> {t.am} {tag(b.ausgemessenAm, ort)}</span>}
            </span>
          </label>
          <label className="admin__haken">
            <input
              type="checkbox"
              checked={Boolean(b.offerteAm)}
              onChange={(e) => onAendern(b.id, { offerteVersendet: e.target.checked })}
            />
            <span>
              {t.offerteVersendet}
              {b.offerteAm && <span className="admin__detail"> {t.am} {tag(b.offerteAm, ort)}</span>}
            </span>
          </label>
          {offerteTage !== null && offerteTage >= 7 && (
            <span className="admin__marke admin__marke--warnung">{fuelle(t.ohneAntwortSeit, { n: offerteTage })}</span>
          )}
        </div>
      )}

      <button type="button" className="admin__aufklappen" aria-expanded={offen} onClick={() => setOffen((o) => !o)}>
        {offen ? t.zuklappen : `${t.netzeAnzeigen}${anzahl > 0 ? ` (${anzahl})` : ''}`}
      </button>

      {offen && (
        <div className="admin__karte-inhalt">
          <div className="admin__kunde">
            <a href={`mailto:${b.kunde.email}`}>{b.kunde.email || t.keineEmail}</a>
            {b.kunde.telefon && <a href={`tel:${b.kunde.telefon}`}>{b.kunde.telefon}</a>}
            {b.kunde.strasse && (
              <span>
                {b.kunde.strasse}
                {b.kunde.plz || b.kunde.ort ? `, ${b.kunde.plz} ${b.kunde.ort}`.trimEnd() : ''}
              </span>
            )}
            <span className="admin__detail">{t.eingang} {datum(b.eingang, ort)}</span>
            {b.geaendert !== b.eingang && <span className="admin__detail">{t.zuletztGeaendert} {datum(b.geaendert, ort)}</span>}
          </div>

          <div className="admin__positionen">
            {bearbeitet ? (
              <NetzEditor
                positionen={b.positionen}
                montageChf={montage}
                montageProNetz={montageProNetz}
                onSpeichern={speichereNetze}
                onAbbrechen={() => setBearbeitet(false)}
              />
            ) : (
              <>
                {b.positionen.length > 0 ? (
                  <table>
                    <tbody>
                      {b.positionen.map((p, i) => (
                        <tr key={`${b.id}-${i}`}>
                          <td>
                            {p.menge}× {p.bezeichnung}
                            {positionDetail(p) && <span className="admin__detail"> {positionDetail(p)}</span>}
                          </td>
                          <td className="admin__preis">{formatChf(p.preisChf * p.menge)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="admin__detail">{t.keineNetzeErfasst}</p>
                )}

                <p className="admin__summe">
                  <span>
                    {t.netzeSumme} {formatChf(positionenSumme(b.positionen))}
                    {montage > 0 && ` · ${t.montageSumme} ${formatChf(montage)}`} · {zahlungstext(b, t, ort)}
                    {b.zahlungswunsch && ` · ${t.ratenwunsch}`}
                  </span>
                  <strong>{formatChf(b.summeChf)}</strong>
                </p>

                {/*
                  Nach einer Onlinezahlung koennen Netze weiter geaendert
                  werden – nur darf die Abweichung nicht still im Datensatz
                  stehen. Stripe hat einen Betrag abgebucht, und der aendert
                  sich hier nicht mit.
                */}
                {differenz !== null && (
                  <p className="admin__abweichung">
                    {fuelle(t.achtungBezahlt, {
                      bezahlt: formatChf(b.bezahlung!.betragChf),
                      summe: formatChf(b.summeChf),
                      richtung: differenz > 0 ? t.offenRichtung : t.zuVielRichtung,
                      differenz: formatChf(Math.abs(differenz)),
                    })}
                  </p>
                )}

                <button type="button" className="btn btn--quiet" onClick={() => setBearbeitet(true)}>
                  {t.netzeBearbeiten}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {offen && b.kunde.bemerkung && <p className="admin__bemerkung">{b.kunde.bemerkung}</p>}

      {offen && (
        <div className="field admin__notiz">
          <label className="field__label" htmlFor={`notiz-${b.id}`}>
            {t.interneNotiz}
          </label>
          <textarea
            id={`notiz-${b.id}`}
            className="input"
            rows={2}
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
          />
          {notiz !== (b.notiz ?? '') && (
            <button type="button" className="btn btn--quiet" onClick={() => onAendern(b.id, { notiz })}>
              {t.notizSpeichern}
            </button>
          )}
        </div>
      )}

      {!offen && b.notiz && <p className="admin__bemerkung admin__bemerkung--notiz">{b.notiz}</p>}

      <div className="admin__schritte">
        {schritte(b, t).map((s) => (
          <button
            key={s.status + s.text}
            type="button"
            className={s.art === 'haupt' ? 'btn' : 'btn btn--quiet'}
            onClick={() => onStatus(b.id, s.status)}
          >
            {s.text}
          </button>
        ))}

        {/*
          Endgueltiges Loeschen gibt es nur bei abgeschlossenen Eintraegen und
          nur nach einer Rueckfrage. Es ist der Weg, das Loeschversprechen aus
          der Datenschutzerklaerung einzuloesen.
        */}
        {(b.status === 'erledigt' || b.status === 'geloescht') &&
          (loeschFrage ? (
            <span className="admin__loeschfrage">
              {t.endgueltigLoeschen}
              <button type="button" className="btn btn--quiet admin__gefahr" onClick={() => onLoeschen(b.id)}>
                {t.jaDatenEntfernen}
              </button>
              <button type="button" className="btn btn--quiet" onClick={() => setLoeschFrage(false)}>
                {t.abbrechen}
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn--quiet admin__gefahr" onClick={() => setLoeschFrage(true)}>
              {t.datenLoeschen}
            </button>
          ))}
      </div>
    </li>
  )
}
