import { useState } from 'react'
import type { Bestellung, BestellAenderung, BestellPosition, Lieferung } from '../../types'
import type { Arbeitsschritt } from '../../lib/arbeitsschritt'
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
import { margeFuer } from '../../lib/einkauf'
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

/**
 * Was ein Knopf tut: entweder die Offerte oeffnen, oder eine Aenderung an der
 * Bestellung schicken. Beides als Daten und nicht als Rueckruf, damit die
 * Liste oben eine reine Tabelle bleibt und sich testen laesst.
 */
type KartenKnopf = {
  tat: 'offerte' | BestellAenderung
  text: string
  art: 'haupt' | 'still'
}

interface BestellKarteProps {
  bestellung: Bestellung
  /** Der Schritt, in dem die Karte steht. Bestimmt die Uebersicht, nicht die Karte. */
  schritt: Arbeitsschritt
  /** Die Runde, in der die Bestellung steckt – nur zur Anzeige. */
  runde?: Lieferung
  montageProNetz: number
  onAendern: (id: string, aenderung: BestellAenderung) => Promise<void>
  onLoeschen: (id: string) => void
  /** Oeffnet die Offerte an die Kundschaft. */
  onOfferte: (id: string) => void
  /** Fuer die Lieferrunde gewaehlt. Fehlt bei abgeschlossenen Eintraegen. */
  gewaehlt?: boolean
  onWahl?: (id: string, gewaehlt: boolean) => void
}

/**
 * Was von diesem Schritt aus zu tun ist.
 *
 * Genau ein Hauptknopf je Abschnitt, der Rest leise. Frueher standen hier
 * drei gleich laute Knoepfe nebeneinander ("Ausmessen & offerieren",
 * "Beim Lieferanten bestellt", "Storniert"), und man musste jedes Mal lesen,
 * welcher gemeint ist.
 *
 * Zwei Schritte haben ABSICHTLICH keinen Knopf: Bei "Preisanfrage laeuft" und
 * "Bestellt, unterwegs" warten wir auf Bora. Es gibt dort nichts zu tun, und
 * ein Knopf, der das Gegenteil suggeriert, ist schlimmer als keiner. Was sich
 * dort aendert, aendert man in der Runde.
 *
 * "Neu" und "Bereit zum Bestellen" haben auch keinen: Dort ist die Aktion das
 * Kaestchen fuer die Lieferrunde oben an der Karte.
 */
function knoepfe(schritt: Arbeitsschritt, t: AdminTexte): KartenKnopf[] {
  switch (schritt) {
    case 'neu':
      return [{ tat: { status: 'abgesagt' }, text: t.knopfAbsagen, art: 'still' }]
    case 'offerteRechnen':
      return [
        { tat: 'offerte', text: t.knopfOfferteAnzeigen, art: 'haupt' },
        { tat: { status: 'offeriert', offerteVersendet: true }, text: t.knopfOfferteRaus, art: 'still' },
        { tat: { status: 'abgesagt' }, text: t.knopfAbsagen, art: 'still' },
      ]
    case 'offerteDraussen':
      return [
        { tat: { status: 'zugesagt' }, text: t.knopfKundeZugesagt, art: 'haupt' },
        /*
         * Der Weg zurueck. Er fehlte, und eine Bestellung, die
         * faelschlicherweise als offeriert galt, sass fest: Von hier fuehrte
         * nur noch die Zusage oder die Absage weg – beides gelogen.
         */
        { tat: { status: 'neu', offerteVersendet: false }, text: t.knopfZurueckNeu, art: 'still' },
        { tat: { status: 'abgesagt' }, text: t.knopfAbsagen, art: 'still' },
      ]
    case 'bereitZuBestellen':
      return [{ tat: { status: 'abgesagt' }, text: t.knopfAbsagen, art: 'still' }]
    case 'ausliefern':
      return [
        { tat: { ausgeliefert: true, bezahlt: true }, text: t.knopfUebergeben, art: 'haupt' },
        { tat: { ausgeliefert: true }, text: t.knopfNurAusgeliefert, art: 'still' },
      ]
    case 'zahlungOffen':
      return [{ tat: { bezahlt: true }, text: t.knopfBezahlt, art: 'haupt' }]
    case 'abgeschlossen':
      return [{ tat: { ausgeliefert: false, bezahlt: false }, text: t.knopfWiederOeffnen, art: 'still' }]
    case 'abgesagt':
      return [{ tat: { status: 'neu' }, text: t.knopfWiederOeffnen, art: 'still' }]
    default:
      // anfrageLaeuft und beimLieferanten: wir warten.
      return []
  }
}

/** Wie viele Netze in der Bestellung stecken. Sets zaehlen als eine Position. */
function netzZahl(positionen: BestellPosition[]): number {
  return positionen.reduce((summe, p) => summe + p.menge, 0)
}

export function BestellKarte({
  bestellung: b,
  schritt,
  runde,
  montageProNetz,
  onAendern,
  onLoeschen,
  onOfferte,
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
  const marge = margeFuer(b)

  const speichereNetze = async (positionen: BestellPosition[], montageChf: number) => {
    await onAendern(b.id, { positionen, montageChf })
    setBearbeitet(false)
  }

  return (
    <li className={`admin__karte admin__karte--${schritt}`}>
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
        {/*
          Die Runde steht im Kopf, weil die Karte frueher nicht wusste, in
          welcher sie steckt – und man dafuer in die andere Ansicht springen
          musste. Genau daran ist die alte Uebersicht gescheitert.
        */}
        {runde && <span className="admin__marke">{t.inRunde} {runde.nummer}</span>}
        {/*
          Der Datensatz ist unvollstaendig, sobald eine Position keinen
          Einkaufspreis hat. Das faellt sonst nicht auf: Die Marge sieht dann
          BESSER aus, nicht schlechter, denn es fehlen Kosten – nicht
          Erloese. Gezeigt wird die Marke erst ab dem Punkt, an dem Preise
          ueberhaupt vorliegen koennen.
        */}
        {!marge.vollstaendig && schritt !== 'neu' && schritt !== 'anfrageLaeuft' && schritt !== 'abgesagt' && (
          <span className="admin__marke admin__marke--warnung">{t.datensatzUnvollstaendig}</span>
        )}
        {schritt === 'abgesagt' && <span className="admin__marke">{t.abgesagtMarke}</span>}
        {schritt === 'abgeschlossen' && <span className="admin__marke admin__marke--gut">{t.erledigtMarke}</span>}
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

        Nur beim Sondermass: Eine Bestellung aus dem Warenkorb wird nicht
        ausgemessen und bekommt keine Offerte. Dort waeren die beiden Haken
        zwei Kaestchen, die nie jemand ankreuzt.
      */}
      {b.art === 'anfrage' &&
        (schritt === 'neu' || schritt === 'offerteRechnen' || schritt === 'offerteDraussen') && (
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

                {/*
                  Einkauf und Marge. Sie stehen nur da, wenn wenigstens eine
                  Zahl vorliegt – ein Block aus lauter Nullen sagt nichts und
                  sieht aus wie ein Verlust.
                */}
                {(marge.einkaufChf > 0 || marge.lieferkostenChf > 0) && (
                  <div className="admin__einkauf">
                    <h4>
                      {t.einkaufTitel}
                      {b.einkaufAusRunde && (
                        <span className="admin__detail">
                          {' '}
                          {t.ausRunde} {b.einkaufAusRunde}
                        </span>
                      )}
                    </h4>
                    <dl>
                      <div>
                        <dt>{t.einkaufSumme}</dt>
                        <dd>{formatChf(marge.einkaufChf)}</dd>
                      </div>
                      <div>
                        <dt>
                          {t.frachtAnteil}
                          {b.lieferkostenGeschaetzt && (
                            <span className="admin__detail"> · {t.frachtGeschaetzt}</span>
                          )}
                        </dt>
                        <dd>{formatChf(marge.lieferkostenChf)}</dd>
                      </div>
                      <div>
                        <dt>{t.warenerloes}</dt>
                        <dd>{formatChf(marge.warenerloesChf)}</dd>
                      </div>
                      <div className="admin__einkauf-marge">
                        <dt>{t.marge}</dt>
                        <dd>
                          {formatChf(marge.margeChf)}
                          {marge.margeProzent !== null && (
                            <span className="admin__detail"> · {marge.margeProzent}%</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                    {!marge.vollstaendig && (
                      <p className="admin__abweichung">{fuelle(t.einkaufFehltSatz, { n: marge.ohnePreis })}</p>
                    )}
                  </div>
                )}

                <div className="admin__karte-knoepfe">
                  <button type="button" className="btn btn--quiet" onClick={() => setBearbeitet(true)}>
                    {t.netzeBearbeiten}
                  </button>
                  <button type="button" className="btn btn--quiet" onClick={() => onOfferte(b.id)}>
                    {t.offerteAnzeigen}
                  </button>
                </div>
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
        {knoepfe(schritt, t).map((k) => (
          <button
            key={k.text}
            type="button"
            className={k.art === 'haupt' ? 'btn' : 'btn btn--quiet'}
            onClick={() => (k.tat === 'offerte' ? onOfferte(b.id) : onAendern(b.id, k.tat))}
          >
            {k.text}
          </button>
        ))}

        {/*
          Endgueltiges Loeschen gibt es nur bei abgeschlossenen Eintraegen und
          nur nach einer Rueckfrage. Es ist der Weg, das Loeschversprechen aus
          der Datenschutzerklaerung einzuloesen.
        */}
        {(schritt === 'abgeschlossen' || schritt === 'abgesagt') &&
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
