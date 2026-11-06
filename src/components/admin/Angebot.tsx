import { useState } from 'react'
import type { BestellAenderung, Bestellung } from '../../types'
import { shopConfig } from '../../data/shopConfig'
import { formatChf } from '../../lib/format'
import { positionDetail, vorschlagFuer } from './hilfen'
import {
  abweichendeStempel,
  angebotAenderung,
  angebotRechnung,
  angebotStart,
  preiseAusVorschlaegen,
  preiseNeuGerechnet,
  schluesselFuer,
} from '../../lib/angebot'
import { fuelle, useSprache } from './sprache'

/**
 * Das Angebot zusammenstellen – der Schritt der Phase "Angebot erstellen".
 *
 * WAS SICH GEAENDERT HAT. Vorher hiess dieser Block "Verkaufspreise
 * festlegen" und stand neben Boras Einkaufspreisen: je Netz sein Preis,
 * unser Preis, die Marge. Das setzte voraus, dass vorher jemand Bora gefragt
 * hat – eine eigene Phase, in der nur gewartet wurde. Die Kostenstruktur ist
 * inzwischen bekannt, und der Rechner der Webseite trifft sie. Also faengt
 * das Angebot nicht bei null an, sondern bei seinem Vorschlag.
 *
 * DER VORSCHLAG BLEIBT STEHEN, auch wenn er ueberschrieben wird. Er ist die
 * einzige Antwort auf "haben wir hier nachgelassen, und wie viel?" – und
 * nachtraeglich nicht mehr zu rekonstruieren, sobald jemand die Katalogpreise
 * anfasst, aus denen der Rechner ihn ableitet. Deshalb steht er in einer
 * eigenen Spalte, die Abweichung daneben, und beides geht mit in den
 * Datensatz (`richtpreisChf`, vom Server bewahrt).
 *
 * DREI POSTEN, JEDER AN- UND ABSCHALTBAR: Montage (Ansatz je Netz), Anfahrt
 * (im Liefergebiet null – und das ist eine Aussage, kein fehlender Posten)
 * und Rabatt mit dem Wort, das auf der Offerte stehen soll.
 *
 * Gearbeitet wird auf einem Entwurf, gespeichert auf Knopfdruck – wie im
 * Netz-Editor, und aus demselben Grund: Beim Tippen von "180" steht kurz
 * "18" im Feld.
 */

interface AngebotProps {
  bestellung: Bestellung
  onSpeichern: (aenderung: BestellAenderung) => Promise<void>
  onAbbrechen?: () => void
}

/*
 * Die drei Zahlen der Preisregel kommen direkt aus shopConfig und nicht als
 * Eigenschaft von oben: Es ist dieselbe Quelle, aus der die Webseite ihren
 * Satz baut ("Montage 15 pro Netz, Anfahrt im Kanton Zuerich gratis"). Ueber
 * eine Prop-Kette liesse sich hier eine andere Zahl hereingeben als die, die
 * draussen steht - und genau das war schon einmal der Fehler.
 */
const { montageChf: MONTAGE_PRO_NETZ, anfahrtspauschaleChf: ANFAHRT_PAUSCHALE, serviceArea: LIEFERGEBIET } = shopConfig

const runde2 = (n: number) => Math.round(n * 100) / 100

export function Angebot({ bestellung: b, onSpeichern, onAbbrechen }: AngebotProps) {
  const { t } = useSprache()
  const schluessel = schluesselFuer
  // Vorbelegung: src/lib/angebot.ts, `angebotStart` (Begruendung dort und oben).
  const [start] = useState(() => angebotStart(b))
  const [preise, setPreise] = useState<Record<string, string>>(start.preise)
  const [montage, setMontage] = useState(start.montage)
  const [montageChf, setMontageChf] = useState(start.montageChf)
  const [anfahrt, setAnfahrt] = useState(start.anfahrt)
  const [anfahrtChf, setAnfahrtChf] = useState(start.anfahrtChf)
  const [rabatt, setRabatt] = useState(start.rabatt)
  const [rabattChf, setRabattChf] = useState(start.rabattChf)
  const [rabattText, setRabattText] = useState(start.rabattText)
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)
  /*
   * Soll der gestempelte Richtpreis beim Speichern ERSETZT werden?
   *
   * Nur ueber den Knopf daneben, nie nebenbei. Der Stempel ist sonst die
   * Zahl, die die Kundschaft gesehen hat; wer ihn ueberschreibt, loescht den
   * einzigen Beleg dafuer, dass wir nachgelassen haben.
   */
  const [stempelErsetzen, setStempelErsetzen] = useState(false)

  const entwurf = { preise, montage, montageChf, anfahrt, anfahrtChf, rabatt, rabattChf, rabattText }
  const abweichend = abweichendeStempel(b)
  const { verkauf, netzeChf, montageSumme, anfahrtSumme, rabattSumme, totalChf, unvollstaendig } = angebotRechnung(b, entwurf)

  const neuRechnen = () => {
    setStempelErsetzen(true)
    setPreise(preiseNeuGerechnet(b, preise))
  }

  const vorschlaegeUebernehmen = () => setPreise(preiseAusVorschlaegen(b, preise))

  const speichern = async () => {
    if (unvollstaendig) {
      setFehler(t.preisFehltSatz)
      return
    }
    setSendet(true)
    setFehler(null)
    try {
      /*
       * Die Positionen bleiben, wie sie sind – nur der Verkaufspreis wird
       * neu. Die Kennung geht mit, sonst verloere der Server den bewahrten
       * Richtpreis. Und der Vorschlag geht mit: Steht er noch nicht im
       * Datensatz, wird er hier zum ersten Mal gestempelt.
       */
      await onSpeichern(angebotAenderung(b, entwurf, stempelErsetzen))
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Fehler')
    } finally {
      setSendet(false)
    }
  }

  return (
    <div className="preise">
      <div className="preise__kopf">
        <h4>{t.angebotTitel}</h4>
        <p className="admin__detail">{t.angebotSatz}</p>
        {/*
          Wegweiser. Wer hier steht, offeriert gerade - und genau dann faellt
          auf, dass ein Netz zu viel drin ist. Diese Liste kann nur Preise;
          entfernt wird im Netz-Editor, und der liegt zwei Klicks entfernt
          hinter einer Klappe. Ohne diesen Satz sucht man ihn nicht.
        */}
        <p className="admin__detail">{t.netzZuVielSatz}</p>
      </div>

      {/*
        Die Tabelle rollt waagrecht, statt die Seite zu sprengen. Vier Spalten
        mit Betraegen passen auf einem Telefon nicht in 390 Pixel, und ohne
        diesen Rahmen schob sie die ganze Karte nach rechts: Die Summe stand
        ausserhalb des Bildschirms, und man scrollte die Seite seitwaerts, um
        sie zu lesen. Gestapelt gehen Zahlenspalten nicht – dann steht neben
        jedem Betrag, was er bedeutet, und die Spalte ist nicht mehr
        vergleichbar.
      */}
      <div className="preise__rollen">
        <table className="netze__tabelle preise__tabelle">
          <thead>
            <tr>
              <th>{t.netzSpalte}</th>
              <th className="preise__zahl">{t.richtpreisSpalte}</th>
              <th className="preise__zahl">{t.verkaufJeStueck}</th>
              <th className="preise__zahl">{t.abweichungSpalte}</th>
            </tr>
          </thead>
          <tbody>
            {b.positionen.map((p, i) => {
              const vorschlag = vorschlagFuer(p)
              const v = verkauf(p, i)
              // Die Abweichung bezieht sich auf die ganze Zeile, nicht auf das
              // Stueck: Bei drei Netzen ist das Dreifache der Unterschied, der
              // am Ende auf der Offerte steht.
              const abweichung = vorschlag !== null && v > 0 ? runde2((v - vorschlag) * p.menge) : null
              return (
                <tr key={schluessel(p, i)}>
                  <td className="preise__netz">
                    {p.menge}× {p.bezeichnung}
                    {positionDetail(p) && <span className="admin__detail"> {positionDetail(p)}</span>}
                  </td>
                  <td className="preise__zahl" data-titel={t.richtpreisSpalte}>
                    {vorschlag !== null ? (
                      formatChf(vorschlag)
                    ) : (
                      <span className="admin__detail" title={t.keinVorschlag}>
                        —
                      </span>
                    )}
                  </td>
                  <td className="preise__zahl" data-titel={t.verkaufJeStueck}>
                    <input
                      className="input netze__feld preise__feld"
                      inputMode="decimal"
                      aria-label={`${t.verkaufJeStueck} ${p.bezeichnung}`}
                      value={preise[schluessel(p, i)] ?? ''}
                      onChange={(e) => setPreise((alt) => ({ ...alt, [schluessel(p, i)]: e.target.value }))}
                    />
                  </td>
                  <td
                    className={`preise__zahl ${abweichung !== null && abweichung < 0 ? 'preise__schlecht' : ''}`}
                    data-titel={t.abweichungSpalte}
                  >
                    {abweichung === null || abweichung === 0 ? '—' : `${abweichung > 0 ? '+' : '−'}${formatChf(Math.abs(abweichung))}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="preise__werkzeug">
        <button type="button" className="btn btn--quiet" onClick={vorschlaegeUebernehmen}>
          {t.richtpreiseUebernehmen}
        </button>
        {/*
          DER ZWEITE KNOPF IST NICHT DERSELBE. Der erste uebernimmt den
          Vorschlag, wie er dasteht - also den Stempel, wenn es einen gibt.
          Dieser verwirft den Stempel und rechnet neu. Das ist der Fall
          "nie eine Zahl gezeigt", und er ist selten genug, um einen eigenen
          Knopf und einen Satz daneben zu verdienen.
        */}
        <button type="button" className="btn btn--quiet" onClick={neuRechnen}>
          {t.richtpreiseNeuRechnen}
        </button>
      </div>
      {stempelErsetzen ? (
        <p className="admin__detail">{t.richtpreiseNeuAktiv}</p>
      ) : (
        abweichend > 0 && (
          <p className="admin__detail">
            {fuelle(t.richtpreiseAbweichendSatz, { n: abweichend })}
          </p>
        )
      )}

      {/*
        DIE DREI POSTEN. Jeder mit Kaestchen: Das Kaestchen entscheidet, ob er
        auf der Offerte steht, der Betrag daneben, mit welcher Zahl. Ein
        aktiver Posten mit 0.00 ist Absicht – bei der Anfahrt heisst er
        "kostenlos" und ist ein Verkaufsargument.
      */}
      <fieldset className="posten">
        <legend className="posten__titel">{t.postenTitel}</legend>

        <div className="posten__zeile">
          <label className="admin__haken">
            <input type="checkbox" checked={montage} onChange={(e) => setMontage(e.target.checked)} />
            <span>{t.montageDurchUns}</span>
          </label>
          <label className="admin__termin">
            <span>{t.montageInsgesamt}</span>
            <input
              className="input netze__feld preise__feld"
              inputMode="decimal"
              aria-label={t.montageInsgesamt}
              disabled={!montage}
              value={montageChf}
              onChange={(e) => setMontageChf(e.target.value)}
            />
          </label>
          <span className="admin__detail">{fuelle(t.montageProFenster, { preis: formatChf(MONTAGE_PRO_NETZ) })}</span>
        </div>

        <div className="posten__zeile">
          <label className="admin__haken">
            <input type="checkbox" checked={anfahrt} onChange={(e) => setAnfahrt(e.target.checked)} />
            <span>{t.postenAnfahrt}</span>
          </label>
          <label className="admin__termin">
            <span>{t.anfahrtBetrag}</span>
            <input
              className="input netze__feld preise__feld"
              inputMode="decimal"
              aria-label={t.anfahrtBetrag}
              disabled={!anfahrt}
              value={anfahrtChf}
              onChange={(e) => setAnfahrtChf(e.target.value)}
            />
          </label>
          <span className="admin__detail">
            {fuelle(t.anfahrtSatz, { gebiet: LIEFERGEBIET, preis: formatChf(ANFAHRT_PAUSCHALE) })}
          </span>
        </div>

        <div className="posten__zeile">
          <label className="admin__haken">
            <input type="checkbox" checked={rabatt} onChange={(e) => setRabatt(e.target.checked)} />
            <span>{t.postenRabatt}</span>
          </label>
          <label className="admin__termin">
            <span>{t.rabattBetrag}</span>
            <input
              className="input netze__feld preise__feld"
              inputMode="decimal"
              aria-label={t.rabattBetrag}
              placeholder="0"
              disabled={!rabatt}
              value={rabattChf}
              onChange={(e) => setRabattChf(e.target.value)}
            />
          </label>
          {/*
            Das Wort gehoert zum Rabatt: Auf der Offerte steht er als Posten
            mit genau diesem Wort, damit die Kundschaft weiss, warum sie
            weniger zahlt.
          */}
          <label className="admin__termin admin__termin--breit">
            <span>{t.rabattText}</span>
            <input
              className="input"
              aria-label={t.rabattText}
              placeholder={t.rabattTextBeispiel}
              disabled={!rabatt}
              value={rabattText}
              onChange={(e) => setRabattText(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <dl className="preise__summen">
        <div>
          <dt>{t.netzeSumme}</dt>
          <dd>{formatChf(netzeChf)}</dd>
        </div>
        {montage && (
          <div>
            <dt>{t.montageSumme}</dt>
            <dd>{formatChf(montageSumme)}</dd>
          </div>
        )}
        {anfahrt && (
          <div>
            <dt>{t.anfahrtSumme}</dt>
            <dd>{anfahrtSumme > 0 ? formatChf(anfahrtSumme) : t.kostenlos}</dd>
          </div>
        )}
        {rabattSumme > 0 && (
          <div>
            <dt>{rabattText.trim() || t.rabattSumme}</dt>
            <dd>−{formatChf(rabattSumme)}</dd>
          </div>
        )}
        <div className="preise__stark">
          <dt>{t.totalSumme}</dt>
          <dd>{formatChf(totalChf)}</dd>
        </div>
      </dl>

      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      <div className="netze__schritte">
        <button type="button" className="btn" onClick={speichern} disabled={sendet}>
          {sendet ? t.wirdGespeichert : t.knopfPreiseFestlegen}
        </button>
        {onAbbrechen && (
          <button type="button" className="btn btn--quiet" onClick={onAbbrechen} disabled={sendet}>
            {t.abbrechen}
          </button>
        )}
      </div>
    </div>
  )
}
