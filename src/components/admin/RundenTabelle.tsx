import { useState } from 'react'
import type { Bestellung, BestellPosition, Lieferung, LieferungZeile, OpeningDirection } from '../../types'
import { fehlendeAngaben, kennungFuer, zeilenDerRunde, zeilenSchluessel, type AuftragsZeile } from '../../lib/bestellauftrag'
import { schluesselUmbenennen, zeileAendern, zeileEntfernen } from '../../lib/zeilenBearbeiten'
import {
  MECHANISMEN,
  NETZFARBEN,
  OEFFNUNGEN,
  RAHMENFARBEN,
  STANDARD,
  type Mechanismus,
  type Netzfarbe,
  type Rahmenfarbe,
} from '../../data/produktion'
import { fuelle, useSprache } from './sprache'
import './RundenTabelle.css'

/**
 * Die Zeilen einer Lieferrunde kontrollieren, bevor der Auftrag rausgeht.
 *
 * Was die Tabelle zeigt, ist genau das, was auf dem Dokument stehen wird –
 * ein Plissee je Zeile. Drei Eingriffe gibt es, und sie bedeuten
 * Verschiedenes:
 *
 *  - ÄNDERN schreibt in die Bestellung. Eine falsche Breite ist ueberall
 *    falsch; stuende die Korrektur nur in der Runde, ginge die richtige Zahl
 *    an den Produzenten und bei der Montage laege die alte vor.
 *  - AUS DER LIEFERUNG NEHMEN betrifft nur diese Runde. Das Netz bleibt in
 *    der Bestellung und kommt in die naechste.
 *  - LÖSCHEN entfernt das Netz aus der Bestellung. Die Kundschaft bekommt es
 *    nicht mehr.
 *
 * Die Reihenfolge ist bewusst die der Bestellungen und nicht die des
 * Dokuments. Nach Bauart sortiert spraenge einem beim Tippen die Zeile unter
 * dem Finger weg; das Dokument sortiert erst beim Erzeugen um.
 */

interface RundenTabelleProps {
  lieferung: Lieferung
  bestellungen: Bestellung[]
  onBestellungAendern: (id: string, positionen: BestellPosition[]) => Promise<void>
  onLieferungAendern: (aenderung: Pick<Partial<Lieferung>, 'zusatz' | 'ausgeschlossen'>) => Promise<void>
}

const LEERE_ZUSATZZEILE = (): LieferungZeile => ({
  nummer: 0,
  kennung: 'EXTRA',
  bezeichnung: '',
  rahmendicke: STANDARD.rahmendicke,
  rahmenfarbe: STANDARD.rahmenfarbe,
  netzfarbe: STANDARD.netzfarbe,
  mechanismus: STANDARD.mechanismus,
})

function masszahl(wert: string): number | undefined {
  const n = Number(wert.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? Math.min(600, Math.round(n * 10) / 10) : undefined
}

export function RundenTabelle({
  lieferung,
  bestellungen,
  onBestellungAendern,
  onLieferungAendern,
}: RundenTabelleProps) {
  const [sendet, setSendet] = useState<string | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [loeschFrage, setLoeschFrage] = useState<string | null>(null)
  const { t, sprache } = useSprache()

  const dabei = bestellungen.filter((b) => lieferung.bestellungIds.includes(b.id))
  const zeilen = zeilenDerRunde(dabei, lieferung)
  const ausgeschlossen = lieferung.ausgeschlossen ?? []

  const mitFehler = async (name: string, lauf: () => Promise<void>) => {
    setSendet(name)
    setFehler(null)
    try {
      await lauf()
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Fehler')
    } finally {
      setSendet(null)
    }
  }

  /** Ein Feld einer Zeile ändern – das schreibt in die Bestellung. */
  const aendere = (zeile: AuftragsZeile, aenderung: Partial<BestellPosition>) => {
    if (!zeile.herkunft) {
      // Zusatzzeile der Runde: gehoert zu keiner Bestellung.
      const zusatz = (lieferung.zusatz ?? []).map((z) =>
        z.nummer === zeile.nummer && z.kennung === zeile.kennung ? { ...z, ...aenderung } : z,
      )
      return mitFehler(`z${zeile.nummer}`, () => onLieferungAendern({ zusatz }))
    }
    const bestellung = dabei.find((b) => b.id === zeile.herkunft!.bestellungId)
    if (!bestellung) return
    const ergebnis = zeileAendern(bestellung, zeile.herkunft, aenderung)
    return mitFehler(`z${zeile.nummer}`, async () => {
      await onBestellungAendern(bestellung.id, ergebnis.positionen)
      const neu = schluesselUmbenennen(ausgeschlossen, ergebnis.umbenennung)
      if (neu.join('|') !== ausgeschlossen.join('|')) await onLieferungAendern({ ausgeschlossen: neu })
    })
  }

  const ausLieferung = (zeile: AuftragsZeile) => {
    if (!zeile.herkunft) {
      const zusatz = (lieferung.zusatz ?? []).filter((z) => !(z.nummer === zeile.nummer && z.kennung === zeile.kennung))
      return mitFehler(`x${zeile.nummer}`, () => onLieferungAendern({ zusatz }))
    }
    const schluessel = zeilenSchluessel(zeile.herkunft)
    return mitFehler(`x${zeile.nummer}`, () => onLieferungAendern({ ausgeschlossen: [...ausgeschlossen, schluessel] }))
  }

  const ausBestellung = (zeile: AuftragsZeile) => {
    if (!zeile.herkunft) return ausLieferung(zeile)
    const bestellung = dabei.find((b) => b.id === zeile.herkunft!.bestellungId)
    if (!bestellung) return
    const ergebnis = zeileEntfernen(bestellung, zeile.herkunft)
    setLoeschFrage(null)
    return mitFehler(`d${zeile.nummer}`, async () => {
      await onBestellungAendern(bestellung.id, ergebnis.positionen)
      const neu = schluesselUmbenennen(ausgeschlossen, ergebnis.umbenennung)
      if (neu.join('|') !== ausgeschlossen.join('|')) await onLieferungAendern({ ausgeschlossen: neu })
    })
  }

  const zurueckholen = (schluessel: string) =>
    mitFehler('zurueck', () => onLieferungAendern({ ausgeschlossen: ausgeschlossen.filter((s) => s !== schluessel) }))

  const zusatzHinzufuegen = () =>
    mitFehler('neu', () => onLieferungAendern({ zusatz: [...(lieferung.zusatz ?? []), LEERE_ZUSATZZEILE()] }))

  const luecken = zeilen.reduce((summe, z) => summe + (fehlendeAngaben(z).length > 0 ? 1 : 0), 0)

  return (
    <section className="lieferung__block">
      <h2 className="tabelle__titel">
        {t.zeilenDerLieferung} <span className="admin__zahl">{zeilen.length}</span>
      </h2>
      <p className="admin__zusammenfassung">{t.zeilenSatz}</p>
      {luecken > 0 && (
        <p className="lieferung__warnung">{fuelle(t.zeilenLuecken, { n: luecken })}</p>
      )}
      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      <div className="tabelle__rahmen">
        <table className="tabelle">
          <thead>
            <tr>
              <th>{t.paket}</th>
              <th>{t.fenster}</th>
              <th className="tabelle__eng">{t.breiteCm}</th>
              <th className="tabelle__eng">{t.hoeheCm}</th>
              <th className="tabelle__eng">{t.dicke}</th>
              <th>{t.rahmen}</th>
              <th>{t.netzSpalte}</th>
              <th>{t.mechanismus}</th>
              <th>{t.oeffnung}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => {
              const fehlt = new Set(fehlendeAngaben(zeile))
              const beschaeftigt = sendet !== null
              const loeschen = loeschFrage === String(zeile.nummer)
              /*
                Der Schluessel ist die Herkunft und NICHT die laufende Nummer.
                Die Nummern ruecken nach, sobald eine Zeile wegfaellt – React
                haelt die Zeile dann fuer dieselbe und laesst die Werte der
                unkontrollierten Felder stehen. Sichtbar wurde das erst beim
                Durchspielen: Nach dem Ausschliessen einer Zeile zeigte die
                Tabelle Werte, die zu den Daten nicht mehr passten.
              */
              return (
                <tr
                  key={zeile.herkunft ? zeilenSchluessel(zeile.herkunft) : `zusatz-${zeile.nummer}`}
                  className={zeile.herkunft ? undefined : 'tabelle__zusatz'}
                >
                  <td className="tabelle__kennung">{zeile.kennung}</td>
                  <td>
                    <input
                      className="input tabelle__feld tabelle__feld--breit"
                      aria-label={`${t.bezeichnungRaum} ${zeile.nummer}`}
                      defaultValue={zeile.bezeichnung}
                      onBlur={(e) => e.target.value !== zeile.bezeichnung && aendere(zeile, { bezeichnung: e.target.value })}
                      disabled={beschaeftigt}
                    />
                  </td>
                  <td>
                    <input
                      className={`input tabelle__feld ${fehlt.has('Breite') ? 'tabelle__fehlt' : ''}`}
                      inputMode="decimal"
                      aria-label={`${t.breiteCm} ${zeile.nummer}`}
                      defaultValue={zeile.breiteCm ?? ''}
                      onBlur={(e) => {
                        const wert = masszahl(e.target.value)
                        if (wert !== zeile.breiteCm) aendere(zeile, { breiteCm: wert })
                      }}
                      disabled={beschaeftigt}
                    />
                  </td>
                  <td>
                    <input
                      className={`input tabelle__feld ${fehlt.has('Höhe') ? 'tabelle__fehlt' : ''}`}
                      inputMode="decimal"
                      aria-label={`${t.hoeheCm} ${zeile.nummer}`}
                      defaultValue={zeile.hoeheCm ?? ''}
                      onBlur={(e) => {
                        const wert = masszahl(e.target.value)
                        if (wert !== zeile.hoeheCm) aendere(zeile, { hoeheCm: wert })
                      }}
                      disabled={beschaeftigt}
                    />
                  </td>
                  <td>
                    <input
                      className={`input tabelle__feld ${fehlt.has('Rahmendicke') ? 'tabelle__fehlt' : ''}`}
                      aria-label={`${t.rahmendicke} ${zeile.nummer}`}
                      defaultValue={zeile.rahmendicke ?? ''}
                      onBlur={(e) => e.target.value !== zeile.rahmendicke && aendere(zeile, { rahmendicke: e.target.value })}
                      disabled={beschaeftigt}
                    />
                  </td>
                  <td>
                    <select
                      className={`input tabelle__feld ${fehlt.has('Rahmenfarbe') ? 'tabelle__fehlt' : ''}`}
                      aria-label={`${t.rahmen} ${zeile.nummer}`}
                      value={zeile.rahmenfarbe ?? ''}
                      onChange={(e) => aendere(zeile, { rahmenfarbe: e.target.value as Rahmenfarbe })}
                      disabled={beschaeftigt}
                    >
                      <option value="">—</option>
                      {Object.entries(RAHMENFARBEN).map(([wert, b]) => (
                        <option key={wert} value={wert}>
                          {b[sprache]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className={`input tabelle__feld ${fehlt.has('Netzfarbe') ? 'tabelle__fehlt' : ''}`}
                      aria-label={`${t.netzSpalte} ${zeile.nummer}`}
                      value={zeile.netzfarbe ?? ''}
                      onChange={(e) => aendere(zeile, { netzfarbe: e.target.value as Netzfarbe })}
                      disabled={beschaeftigt}
                    >
                      <option value="">—</option>
                      {Object.entries(NETZFARBEN).map(([wert, b]) => (
                        <option key={wert} value={wert}>
                          {b[sprache]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className={`input tabelle__feld ${fehlt.has('Mechanismus') ? 'tabelle__fehlt' : ''}`}
                      aria-label={`${t.mechanismus} ${zeile.nummer}`}
                      value={zeile.mechanismus ?? ''}
                      onChange={(e) => aendere(zeile, { mechanismus: e.target.value as Mechanismus })}
                      disabled={beschaeftigt}
                    >
                      <option value="">—</option>
                      {Object.entries(MECHANISMEN).map(([wert, b]) => (
                        <option key={wert} value={wert}>
                          {b[sprache]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className={`input tabelle__feld tabelle__feld--breit ${fehlt.has('Öffnungsrichtung') ? 'tabelle__fehlt' : ''}`}
                      aria-label={`${t.oeffnung} ${zeile.nummer}`}
                      value={zeile.oeffnung ?? ''}
                      onChange={(e) => aendere(zeile, { oeffnung: e.target.value as OpeningDirection })}
                      disabled={beschaeftigt}
                    >
                      <option value="">—</option>
                      {Object.entries(OEFFNUNGEN).map(([wert, b]) => (
                        <option key={wert} value={wert}>
                          {b[sprache]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="tabelle__schritte">
                    {loeschen ? (
                      <span className="tabelle__frage">
                        {t.ausBestellungLoeschen}
                        <button type="button" className="btn btn--quiet admin__gefahr" onClick={() => ausBestellung(zeile)}>
                          {t.ja}
                        </button>
                        <button type="button" className="btn btn--quiet" onClick={() => setLoeschFrage(null)}>
                          {t.nein}
                        </button>
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="tabelle__knopf"
                          title={t.ausLieferungHilfe}
                          onClick={() => ausLieferung(zeile)}
                          disabled={beschaeftigt}
                        >
                          {t.ausLieferung}
                        </button>
                        <button
                          type="button"
                          className="tabelle__knopf tabelle__knopf--gefahr"
                          title={t.loeschenHilfe}
                          onClick={() => setLoeschFrage(String(zeile.nummer))}
                          disabled={beschaeftigt}
                        >
                          {t.loeschen}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="tabelle__unten">
        <button type="button" className="btn btn--quiet" onClick={zusatzHinzufuegen} disabled={sendet !== null}>
          {t.zeileOhneBestellung}
        </button>
        <span className="admin__detail">{t.zeileOhneBestellungSatz}</span>
      </div>

      {/*
        Was aus der Lieferung genommen wurde, bleibt sichtbar. Sonst waere
        nicht zu erkennen, ob ein Netz vergessen ging oder absichtlich in der
        naechsten Runde landen soll.
      */}
      {ausgeschlossen.length > 0 && (
        <div className="tabelle__ausgenommen">
          <strong>
            {t.nichtInDieserLieferung} ({ausgeschlossen.length})
          </strong>
          <p className="admin__detail">{t.nichtInDieserLieferungSatz}</p>
          <ul>
            {ausgeschlossen.map((schluessel) => {
              // Die Kennung des Pakets, nicht die interne Id der Bestellung.
              const bestellung = dabei.find((b) => b.id === schluessel.split('#')[0])
              return (
                <li key={schluessel}>
                  <code>{bestellung ? kennungFuer(bestellung) : '—'}</code>
                  <span className="admin__detail">{bestellung?.kunde.name}</span>
                  <button type="button" className="tabelle__knopf" onClick={() => zurueckholen(schluessel)}>
                    {t.zurueckInDieLieferung}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
