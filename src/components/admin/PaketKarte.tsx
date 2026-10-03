import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Bestellung, BestellAenderung } from '../../types'
import type { Abschnitt } from '../../lib/phasen'
import { netzZahl, summeVon } from '../../lib/phasen'
import { formatChf } from '../../lib/format'
import { tag } from './hilfen'
import { fuelle, useSprache } from './sprache'

/**
 * Ein Paket als EIN Eintrag in der Liste.
 *
 * Ein Paket geht als Ganzes zu Bora, kommt als Ganzes zurueck und traegt eine
 * Sendungsnummer. In der Liste standen seine Auftraege trotzdem einzeln
 * untereinander – bei vier Auftraegen vier fast gleiche Karten mit denselben
 * Knoepfen und derselben Paketmarke. Die Frage "was liegt eigentlich bei
 * Bora?" war damit nicht auf einen Blick zu beantworten.
 *
 * Zugeklappt steht hier, was man zum Ueberblick braucht: wie das Paket
 * heisst, wie viele Bestellungen und Netze darin sind, was es einbringt, und
 * ob es unterwegs ist. Aufgeklappt stehen die Bestellungen darin, genau wie
 * sonst – samt ihren Knoepfen. Die Arbeit am einzelnen Auftrag aendert sich
 * nicht, nur der Weg dorthin ist einen Klick laenger.
 *
 * ZUGEKLAPPT IST DER AUSGANGSZUSTAND. Wer ein Paket geschnuert hat, will es
 * danach als eine Zeile sehen; wer hineinmuss, weiss das und klickt.
 */

interface PaketKarteProps {
  paket: string
  bestellungen: Bestellung[]
  /** Der Abschnitt, in dem das Paket steht. Entscheidet, was im Kopf steht. */
  abschnitt: Abschnitt
  /** Aendert EINE Bestellung. Das Paket ruft es fuer jede seiner auf. */
  onAendern: (id: string, aenderung: BestellAenderung) => Promise<void>
  /** Oeffnet den gemeinsamen Bestelltalon. */
  onBlatt: (ids: string[], art: 'anfrage' | 'bestellung', nummer: string) => void
  /** Die Karten der enthaltenen Bestellungen. */
  children: ReactNode
}

export function PaketKarte({ paket, bestellungen, abschnitt, onAendern, onBlatt, children }: PaketKarteProps) {
  const [offen, setOffen] = useState(false)
  const { t, ort } = useSprache()

  const anzahl = bestellungen.length
  const netze = netzZahl(bestellungen)
  const summe = summeVon(bestellungen)

  /*
   * Der Stand der SENDUNG, nicht der einzelnen Auftraege: Beides gilt fuer
   * das ganze Paket (siehe BestellKarte), also genuegt der erste, der ihn
   * traegt. Steht hier nichts, ist das Paket noch nicht losgeschickt.
   */
  const unterwegsAm = bestellungen.find((b) => b.versandAm)?.versandAm
  const sendungsnummer = bestellungen.find((b) => b.sendungsnummer)?.sendungsnummer
  const bestelltAm = bestellungen.find((b) => b.bestelltAm)?.bestelltAm
  const [sendung, setSendung] = useState(sendungsnummer ?? '')

  /**
   * Eine Aenderung fuer alle Auftraege des Pakets. Bestellt wird das Paket
   * als Ganzes, unterwegs ist es als Ganzes, und es kommt als Ganzes an –
   * jeder dieser Schritte einzeln angeklickt waere eine Einladung, den
   * dritten zu vergessen.
   */
  const fuersPaket = async (aenderung: BestellAenderung) => {
    for (const b of bestellungen) await onAendern(b.id, aenderung)
  }

  const talon = () => onBlatt(bestellungen.map((b) => b.id), 'bestellung', paket)

  return (
    <li className={`admin__karte admin__paket admin__karte--${abschnitt}`}>
      {/*
        Der Pfeil ist eine eigene Spalte am rechten Rand und nicht das letzte
        Stueck einer umbrechenden Reihe: Schmal rutschte er sonst allein in
        eine dritte Zeile und stand dort links, als gehoerte er zu nichts.
      */}
      <button type="button" className="admin__paket-kopf" aria-expanded={offen} onClick={() => setOffen((o) => !o)}>
        <span className="admin__paket-text">
        <span className="admin__paket-zeile">
          <span className="admin__marke admin__marke--paket">
            {t.paketMarke} {paket}
          </span>
          <span className="admin__detail">
            {fuelle(t.paketInhalt, {
              auftraege: anzahl,
              auftragWort: anzahl === 1 ? t.bestellung : t.bestellungen,
              netze,
              netzWort: netze === 1 ? t.netz : t.netzeMehrzahl,
            })}
          </span>
          <strong className="admin__preis">{formatChf(summe)}</strong>
        </span>

        {/*
          Die Marken des Pakets. Sie stehen im Kopf und nicht nur in den
          Karten darunter: Zugeklappt waeren sie sonst nicht zu sehen, und
          "ist die Ware eigentlich unterwegs?" ist genau die Frage, die man an
          eine zugeklappte Zeile stellt.
        */}
        <span className="admin__paket-marken">
          {abschnitt === 'bora' && bestelltAm && (
            <span className="admin__marke admin__marke--gut">
              {t.bestelltBeiBora} · {tag(bestelltAm, ort)}
            </span>
          )}
          {unterwegsAm && (
            <span className="admin__marke admin__marke--gut">
              {t.unterwegs} · {tag(unterwegsAm, ort)}
            </span>
          )}
          {sendungsnummer && <span className="admin__marke">{sendungsnummer}</span>}
        </span>
        </span>
        <span className="admin__paket-pfeil" aria-hidden="true">
          {offen ? '▾' : '▸'}
        </span>
      </button>

      {/*
        DIE SCHRITTE DES PAKETS. Sie stehen hier und nicht auf den Karten
        darin: Bestellt wird das Paket als Ganzes, unterwegs ist es als
        Ganzes, und es kommt als Ganzes an. Auf jeder Karte wiederholt waeren
        es bei vier Auftraegen viermal dieselben Knoepfe – und sie waeren nur
        zu erreichen, wenn das Paket aufgeklappt ist.
      */}
      <div className="admin__paket-schritte">
        {abschnitt === 'bestellen' && (
          <>
            <button type="button" className="btn" onClick={() => fuersPaket({ status: 'bora', bestellt: true })}>
              {t.knopfPaketBestellt}
            </button>
            <button type="button" className="btn btn--quiet" onClick={talon}>
              {t.bestelltalonPaket}
            </button>
          </>
        )}

        {abschnitt === 'bora' && (
          <>
            <button type="button" className="btn" onClick={() => fuersPaket({ status: 'ausliefern' })}>
              {t.knopfAngekommen}
            </button>
            <button type="button" className="btn btn--quiet" onClick={talon}>
              {t.bestelltalonPaket}
            </button>
          </>
        )}
      </div>

      {/* Der Stand der Sendung – ebenfalls fuer das ganze Paket. */}
      {abschnitt === 'bora' && (
        <div className="admin__haken-reihe admin__paket-sendung">
          <label className="admin__haken">
            <input
              type="checkbox"
              checked={Boolean(unterwegsAm)}
              onChange={(e) => fuersPaket({ versand: e.target.checked })}
            />
            <span>{t.unterwegs}</span>
          </label>
          <label className="admin__termin admin__termin--breit" htmlFor={`sendung-${paket}`}>
            <span>{t.sendungsnummer}</span>
            <input
              id={`sendung-${paket}`}
              className="input"
              value={sendung}
              onChange={(e) => setSendung(e.target.value)}
            />
          </label>
          {sendung !== (sendungsnummer ?? '') && (
            <button type="button" className="btn btn--quiet" onClick={() => fuersPaket({ sendungsnummer: sendung })}>
              {t.speichern}
            </button>
          )}
        </div>
      )}

      {!offen && <p className="admin__paket-satz">{t.paketZugeklapptSatz}</p>}

      {offen && <ul className="admin__karten admin__paket-liste">{children}</ul>}
    </li>
  )
}
