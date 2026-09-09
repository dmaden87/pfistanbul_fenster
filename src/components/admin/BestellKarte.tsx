import { useState } from 'react'
import type { Bestellung, BestellAenderung, BestellPosition, BestellStatus } from '../../types'
import { formatChf } from '../../lib/format'
import {
  ART_TEXT,
  QUELLE_TEXT,
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
}

/**
 * Welche Schritte von hier aus möglich sind. Vorwärts ist der Normalfall,
 * zurück steht bewusst auch offen: Wer versehentlich klickt, soll das ohne
 * Umweg über die Datenbank geraderücken können.
 */
function schritte(b: Bestellung): { status: BestellStatus; text: string; art: 'haupt' | 'still' }[] {
  switch (b.status) {
    case 'neu':
      return [
        // Beim Sondermass geht es zuerst zum Ausmessen und Offerieren; eine
        // feste Bestellung aus dem Warenkorb kann direkt zum Lieferanten.
        { status: 'offerte', text: 'Ausmessen & offerieren', art: b.art === 'bestellung' ? 'still' : 'haupt' },
        {
          status: 'bestellt',
          text: b.art === 'bestellung' ? 'Beim Lieferanten bestellt' : 'Angenommen, bestellt',
          art: b.art === 'bestellung' ? 'haupt' : 'still',
        },
        { status: 'geloescht', text: b.art === 'bestellung' ? 'Storniert' : 'Abgesagt', art: 'still' },
      ]
    case 'offerte':
      return [
        { status: 'bestellt', text: 'Zugesagt, beim Lieferanten bestellt', art: 'haupt' },
        { status: 'neu', text: 'Zurück zu neu', art: 'still' },
        { status: 'geloescht', text: 'Abgesagt', art: 'still' },
      ]
    case 'bestellt':
      return [
        { status: 'erledigt', text: 'Ausgeliefert, erledigt', art: 'haupt' },
        { status: 'offerte', text: 'Zurück zur Offerte', art: 'still' },
        { status: 'geloescht', text: 'Doch storniert', art: 'still' },
      ]
    default:
      return [{ status: 'bestellt', text: 'Wieder öffnen', art: 'still' }]
  }
}

/** Wie viele Netze in der Bestellung stecken. Sets zaehlen als eine Position. */
function netzZahl(positionen: BestellPosition[]): number {
  return positionen.reduce((summe, p) => summe + p.menge, 0)
}

export function BestellKarte({ bestellung: b, montageProNetz, onStatus, onAendern, onLoeschen }: BestellKarteProps) {
  const [offen, setOffen] = useState(false)
  const [bearbeitet, setBearbeitet] = useState(false)
  const [loeschFrage, setLoeschFrage] = useState(false)
  const [notiz, setNotiz] = useState(b.notiz ?? '')

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
        <span className={`admin__art admin__art--${b.art}`}>{ART_TEXT[b.art]}</span>
        <span className="admin__referenz">{b.referenz || b.id}</span>
        <span className="admin__datum">{datum(b.eingang)}</span>
        {b.quelle && b.quelle !== 'web' && <span className="admin__marke">{QUELLE_TEXT[b.quelle]}</span>}
        {b.bezahlung?.status === 'bezahlt' && (
          <span className="admin__marke admin__marke--gut">bezahlt · {formatChf(b.bezahlung.betragChf)}</span>
        )}
        {b.status === 'geloescht' && <span className="admin__marke">abgesagt</span>}
        {b.status === 'erledigt' && <span className="admin__marke admin__marke--gut">erledigt</span>}
      </div>

      <div className="admin__zeile">
        <strong>{b.kunde.name}</strong>
        <span className="admin__detail">
          {anzahl > 0 ? `${anzahl} ${anzahl === 1 ? 'Netz' : 'Netze'}` : 'noch keine Netze'}
          {b.montage && ' · mit Montage'}
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
              Ausgemessen
              {b.ausgemessenAm && <span className="admin__detail"> am {tag(b.ausgemessenAm)}</span>}
            </span>
          </label>
          <label className="admin__haken">
            <input
              type="checkbox"
              checked={Boolean(b.offerteAm)}
              onChange={(e) => onAendern(b.id, { offerteVersendet: e.target.checked })}
            />
            <span>
              Offerte versendet
              {b.offerteAm && <span className="admin__detail"> am {tag(b.offerteAm)}</span>}
            </span>
          </label>
          {offerteTage !== null && offerteTage >= 7 && (
            <span className="admin__marke admin__marke--warnung">seit {offerteTage} Tagen ohne Antwort</span>
          )}
        </div>
      )}

      <button type="button" className="admin__aufklappen" aria-expanded={offen} onClick={() => setOffen((o) => !o)}>
        {offen ? 'Zuklappen' : `Netze und Angaben anzeigen${anzahl > 0 ? ` (${anzahl})` : ''}`}
      </button>

      {offen && (
        <div className="admin__karte-inhalt">
          <div className="admin__kunde">
            <a href={`mailto:${b.kunde.email}`}>{b.kunde.email || 'keine E-Mail'}</a>
            {b.kunde.telefon && <a href={`tel:${b.kunde.telefon}`}>{b.kunde.telefon}</a>}
            {b.kunde.strasse && (
              <span>
                {b.kunde.strasse}
                {b.kunde.plz || b.kunde.ort ? `, ${b.kunde.plz} ${b.kunde.ort}`.trimEnd() : ''}
              </span>
            )}
            <span className="admin__detail">Eingang {datum(b.eingang)}</span>
            {b.geaendert !== b.eingang && <span className="admin__detail">zuletzt geändert {datum(b.geaendert)}</span>}
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
                  <p className="admin__detail">Noch keine Netze erfasst.</p>
                )}

                <p className="admin__summe">
                  <span>
                    Netze {formatChf(positionenSumme(b.positionen))}
                    {montage > 0 && ` · Montage ${formatChf(montage)}`} · {zahlungstext(b)}
                    {b.zahlungswunsch && ' · Ratenwunsch'}
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
                    Achtung: Bezahlt wurden {formatChf(b.bezahlung!.betragChf)}, die Bestellung steht jetzt auf{' '}
                    {formatChf(b.summeChf)} – {differenz > 0 ? 'offen' : 'zu viel bezahlt'}{' '}
                    {formatChf(Math.abs(differenz))}. Über Stripe nachbuchen oder zurückerstatten.
                  </p>
                )}

                <button type="button" className="btn btn--quiet" onClick={() => setBearbeitet(true)}>
                  Netze bearbeiten
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
            Interne Notiz
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
              Notiz speichern
            </button>
          )}
        </div>
      )}

      {!offen && b.notiz && <p className="admin__bemerkung admin__bemerkung--notiz">{b.notiz}</p>}

      <div className="admin__schritte">
        {schritte(b).map((s) => (
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
              Endgültig löschen?
              <button type="button" className="btn btn--quiet admin__gefahr" onClick={() => onLoeschen(b.id)}>
                Ja, Daten entfernen
              </button>
              <button type="button" className="btn btn--quiet" onClick={() => setLoeschFrage(false)}>
                Abbrechen
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn--quiet admin__gefahr" onClick={() => setLoeschFrage(true)}>
              Daten löschen
            </button>
          ))}
      </div>
    </li>
  )
}
