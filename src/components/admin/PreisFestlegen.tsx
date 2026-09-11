import { useState } from 'react'
import type { Bestellung, BestellPosition } from '../../types'
import { formatChf } from '../../lib/format'
import { montageBetrag, positionDetail } from './hilfen'
import { fuelle, useSprache } from './sprache'

/**
 * Phase 4, der eigentliche Schritt: Aus Boras Kosten den Verkaufspreis
 * machen.
 *
 * Bis hierher tragen die Positionen den RICHTPREIS aus der Anfrage – eine
 * Schaetzung von der Webseite, die dem Kunden als unverbindlich genannt
 * wurde. Die Offerte darf nicht auf dieser Zahl stehen; sie braucht eine
 * Zahl, die jemand mit dem Einkauf daneben festgelegt hat. Deshalb steht
 * dieser Block offen auf der Karte, solange das nicht geschehen ist, und
 * der Weg zur Offerte fuehrt hindurch.
 *
 * Je Netz: was Bora verlangt, was wir verlangen, was bleibt. Unten die
 * Montage und das Total. Gearbeitet wird auf einem Entwurf, gespeichert
 * auf Knopfdruck – wie im Netz-Editor, und aus demselben Grund: Beim
 * Tippen von "180" steht kurz "18" im Feld.
 */

interface PreisFestlegenProps {
  bestellung: Bestellung
  montageProNetz: number
  onSpeichern: (positionen: BestellPosition[], montageChf: number, rabattChf: number, rabattText: string) => Promise<void>
  onAbbrechen?: () => void
}

function zahl(wert: string): number {
  const n = Number(wert.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0
}

const runde2 = (n: number) => Math.round(n * 100) / 100

export function PreisFestlegen({ bestellung: b, montageProNetz, onSpeichern, onAbbrechen }: PreisFestlegenProps) {
  const { t } = useSprache()
  const [preise, setPreise] = useState<Record<string, string>>(() =>
    Object.fromEntries(b.positionen.map((p, i) => [p.id ?? `#${i}`, p.preisChf > 0 ? String(p.preisChf) : ''])),
  )
  const [montage, setMontage] = useState(String(montageBetrag(b)))
  const [rabatt, setRabatt] = useState(b.rabattChf ? String(b.rabattChf) : '')
  const [rabattText, setRabattText] = useState(b.rabattText ?? '')
  const [aufschlag, setAufschlag] = useState('100')
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const schluessel = (p: BestellPosition, i: number) => p.id ?? `#${i}`
  const verkauf = (p: BestellPosition, i: number) => zahl(preise[schluessel(p, i)] ?? '')
  const netzeChf = runde2(b.positionen.reduce((s, p, i) => s + verkauf(p, i) * p.menge, 0))
  // Der Rabatt auf die ganze Bestellung – nie mehr als Netze und Montage zusammen.
  const rabattChf = Math.min(zahl(rabatt), runde2(netzeChf + zahl(montage)))
  const einkaufChf = runde2(b.positionen.reduce((s, p) => s + (p.einkaufChf ?? 0) * p.menge, 0))
  const frachtChf = b.lieferkostenChf ?? 0
  const margeChf = runde2(netzeChf - rabattChf - einkaufChf - frachtChf)
  const margeProzent = netzeChf > 0 ? Math.round((margeChf / netzeChf) * 1000) / 10 : null
  const unvollstaendig = b.positionen.some((p, i) => verkauf(p, i) <= 0)

  /*
   * Ein Aufschlag auf alle: der haeufige Fall, wenn Bora fuer jedes Netz
   * etwa dasselbe verlangt. Danach wird einzeln nachgebessert – deshalb
   * schreibt der Knopf nur in den Entwurf, nicht auf den Server.
   */
  const aufschlagAnwenden = () => {
    const faktor = 1 + zahl(aufschlag) / 100
    setPreise(
      Object.fromEntries(
        b.positionen.map((p, i) => [
          schluessel(p, i),
          typeof p.einkaufChf === 'number' ? String(Math.ceil(p.einkaufChf * faktor)) : (preise[schluessel(p, i)] ?? ''),
        ]),
      ),
    )
  }

  const speichern = async () => {
    if (unvollstaendig) {
      setFehler(t.preisFehltSatz)
      return
    }
    setSendet(true)
    setFehler(null)
    try {
      // Die Positionen bleiben, wie sie sind – nur der Verkaufspreis wird
      // neu. Die Kennung geht mit, sonst verloere der Server Boras Preis.
      await onSpeichern(
        b.positionen.map((p, i) => ({ ...p, preisChf: verkauf(p, i) })),
        zahl(montage),
        rabattChf,
        rabattChf > 0 ? rabattText.trim() : '',
      )
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Fehler')
    } finally {
      setSendet(false)
    }
  }

  return (
    <div className="preise">
      <div className="preise__kopf">
        <h4>{t.verkaufspreiseTitel}</h4>
        <p className="admin__detail">{t.verkaufspreiseSatz}</p>
      </div>

      <table className="netze__tabelle preise__tabelle">
        <thead>
          <tr>
            <th>{t.netzSpalte}</th>
            <th className="preise__zahl">{t.einkaufJeStueck}</th>
            <th className="preise__zahl">{t.verkaufJeStueck}</th>
            <th className="preise__zahl">{t.margeZeile}</th>
          </tr>
        </thead>
        <tbody>
          {b.positionen.map((p, i) => {
            const v = verkauf(p, i)
            const marge = typeof p.einkaufChf === 'number' ? runde2((v - p.einkaufChf) * p.menge) : null
            return (
              <tr key={schluessel(p, i)}>
                <td>
                  {p.menge}× {p.bezeichnung}
                  {positionDetail(p) && <span className="admin__detail"> {positionDetail(p)}</span>}
                </td>
                <td className="preise__zahl">
                  {typeof p.einkaufChf === 'number' ? formatChf(p.einkaufChf) : <span className="admin__marke admin__marke--warnung">—</span>}
                </td>
                <td className="preise__zahl">
                  <input
                    className="input netze__feld preise__feld"
                    inputMode="decimal"
                    aria-label={`${t.verkaufJeStueck} ${p.bezeichnung}`}
                    value={preise[schluessel(p, i)] ?? ''}
                    onChange={(e) => setPreise((alt) => ({ ...alt, [schluessel(p, i)]: e.target.value }))}
                  />
                </td>
                <td className={`preise__zahl ${marge !== null && marge < 0 ? 'preise__schlecht' : ''}`}>
                  {marge === null ? '—' : formatChf(marge)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="preise__werkzeug">
        <label className="admin__termin">
          <span>{t.aufschlagSatz}</span>
          <input
            className="input netze__feld preise__feld"
            inputMode="decimal"
            aria-label={t.aufschlagSatz}
            value={aufschlag}
            onChange={(e) => setAufschlag(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn--quiet" onClick={aufschlagAnwenden}>
          {t.aufschlagAnwenden}
        </button>
        <label className="admin__termin">
          <span>{t.montageInsgesamt}</span>
          <input
            className="input netze__feld preise__feld"
            inputMode="decimal"
            aria-label={t.montageInsgesamt}
            value={montage}
            onChange={(e) => setMontage(e.target.value)}
          />
        </label>
        <span className="admin__detail">{fuelle(t.montageProFenster, { preis: formatChf(montageProNetz) })}</span>
      </div>

      {/*
        Der Rabatt gilt fuer die ganze Bestellung und traegt ein Wort: Auf der
        Offerte steht er als Posten mit genau diesem Wort, damit die Kundschaft
        weiss, warum sie weniger zahlt.
      */}
      <div className="preise__werkzeug">
        <label className="admin__termin">
          <span>{t.rabattBetrag}</span>
          <input
            className="input netze__feld preise__feld"
            inputMode="decimal"
            aria-label={t.rabattBetrag}
            placeholder="0"
            value={rabatt}
            onChange={(e) => setRabatt(e.target.value)}
          />
        </label>
        <label className="admin__termin admin__termin--breit">
          <span>{t.rabattText}</span>
          <input
            className="input"
            aria-label={t.rabattText}
            placeholder={t.rabattTextBeispiel}
            value={rabattText}
            onChange={(e) => setRabattText(e.target.value)}
          />
        </label>
      </div>

      <dl className="preise__summen">
        <div>
          <dt>{t.netzeSumme}</dt>
          <dd>{formatChf(netzeChf)}</dd>
        </div>
        {rabattChf > 0 && (
          <div>
            <dt>{rabattText.trim() || t.rabattSumme}</dt>
            <dd>−{formatChf(rabattChf)}</dd>
          </div>
        )}
        <div>
          <dt>{t.einkaufSumme}</dt>
          <dd>{formatChf(einkaufChf)}</dd>
        </div>
        {frachtChf > 0 && (
          <div>
            <dt>
              {t.frachtAnteil}
              {b.lieferkostenGeschaetzt && <span className="admin__detail"> · {t.frachtGeschaetzt}</span>}
            </dt>
            <dd>{formatChf(frachtChf)}</dd>
          </div>
        )}
        <div className={margeChf < 0 ? 'preise__schlecht' : 'preise__stark'}>
          <dt>{t.marge}</dt>
          <dd>
            {formatChf(margeChf)}
            {margeProzent !== null && <span className="admin__detail"> · {margeProzent} %</span>}
          </dd>
        </div>
        <div className="preise__stark">
          <dt>{t.montageSumme}</dt>
          <dd>{formatChf(zahl(montage))}</dd>
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
