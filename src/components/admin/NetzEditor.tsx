import { useState } from 'react'
import type { BestellPosition, OpeningDirection } from '../../types'
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
import { formatChf, formatSize } from '../../lib/format'
import { netSets, netsInSet, setById, typeById, windowTypes } from '../../data/catalog'
import { positionenSumme } from './hilfen'
import { fuelle, useSprache } from './sprache'

/**
 * Die Netze einer Bestellung bearbeiten: ergaenzen, aendern, entfernen.
 *
 * Gearbeitet wird auf einem Entwurf, gespeichert wird auf Knopfdruck. Der
 * naheliegende Weg – jede Eingabe sofort zum Server – waere hier falsch:
 * Wer eine Breite von 120 auf 130 aendert, tippt zwischendurch "13", und
 * eine Bestellung mit 13 cm Breite darf keine Sekunde in der Tabelle stehen.
 * Ausserdem gibt es so ein Abbrechen, das wirklich abbricht.
 *
 * Alle Felder sind Text und nicht Zahl, obwohl Zahlen herauskommen. Ein
 * `number`-Zustand kann das leere Feld nicht darstellen: Wer die Menge
 * loeschen will, um sie neu zu tippen, bekaeme sofort eine 0 zurueck.
 *
 * Die zweite Zeile je Netz ist das, was der Produzent braucht. Sie steht hier
 * und nicht erst im Bestellauftrag, weil sie am Fenster erhoben wird – wer
 * beim Ausmessen steht, soll sie gleich eintragen koennen.
 */

interface Entwurf {
  menge: string
  bezeichnung: string
  breiteCm: string
  hoeheCm: string
  preisChf: string
  rahmendicke: string
  rahmenfarbe: Rahmenfarbe
  netzfarbe: Netzfarbe
  mechanismus: Mechanismus
  oeffnung: OpeningDirection | ''
  typId?: string
  setId?: string
  /**
   * Die Kennung MUSS mit. Ohne sie vergibt der Server beim Speichern neue
   * Kennungen, und damit reisst alles ab, was an der alten haengt: die
   * eingefrorenen Zeilen der Lieferrunde (herkunft.positionId) und Boras
   * Einkaufspreis, den der Server nur je Kennung wiederfindet. Ein
   * korrigierter Verkaufspreis loeschte so die ganze Marge – still.
   */
  id?: string
}

interface NetzEditorProps {
  positionen: BestellPosition[]
  montageChf: number
  /** Nur zur Anzeige: Was die Montage pro Netz kostet. */
  montageProNetz: number
  onSpeichern: (positionen: BestellPosition[], montageChf: number) => Promise<void>
  onAbbrechen: () => void
  /** Beschriftung des Knopfs. Beim Anlegen heisst er anders als beim Aendern. */
  speichernText?: string
  /** Gruende ausserhalb der Netze, die das Speichern noch verhindern. */
  deaktiviert?: boolean
  /**
   * Katalogware: Jedes Netz ist ein Katalogprodukt aus dem Dropdown. Masse,
   * Bauart und Preis kommen aus dem Katalog und sind hier nicht aenderbar –
   * sonst hiesse "Bestellung" nur noch, dass jemand die Felder anders fuellt.
   */
  katalog?: boolean
}

/** Der Wert des Katalog-Dropdowns: Typ oder Set. */
function katalogWert(e: Entwurf): string {
  return e.setId ? `set:${e.setId}` : e.typId ? `typ:${e.typId}` : ''
}

/** Fuellt einen Entwurf aus dem Katalog. Leer, wenn nichts gewaehlt ist. */
function ausKatalog(wert: string, vorher: Entwurf): Entwurf {
  const [art, id] = wert.split(':')
  if (art === 'typ') {
    const typ = typeById(id)
    if (!typ) return { ...leer(), menge: vorher.menge }
    return {
      ...leer(),
      menge: vorher.menge,
      id: vorher.id,
      typId: typ.id,
      bezeichnung: typ.label,
      breiteCm: String(typ.widthCm),
      hoeheCm: String(typ.heightCm),
      preisChf: String(typ.priceChf),
      rahmendicke: typ.rahmendicke,
      oeffnung: typ.opening,
    }
  }
  if (art === 'set') {
    const set = setById(id)
    if (!set) return { ...leer(), menge: vorher.menge }
    return { ...leer(), menge: vorher.menge, id: vorher.id, setId: set.id, bezeichnung: set.label, preisChf: String(set.priceChf) }
  }
  return { ...leer(), menge: vorher.menge, id: vorher.id }
}

function zuEntwurf(p: BestellPosition): Entwurf {
  return {
    id: p.id,
    menge: String(p.menge),
    bezeichnung: p.bezeichnung,
    breiteCm: p.breiteCm ? String(p.breiteCm) : '',
    hoeheCm: p.hoeheCm ? String(p.hoeheCm) : '',
    preisChf: String(p.preisChf),
    rahmendicke: p.rahmendicke ?? STANDARD.rahmendicke,
    rahmenfarbe: p.rahmenfarbe ?? STANDARD.rahmenfarbe,
    netzfarbe: p.netzfarbe ?? STANDARD.netzfarbe,
    mechanismus: p.mechanismus ?? STANDARD.mechanismus,
    // Die Oeffnungsrichtung wird NICHT vorbelegt. Sie sieht man nur am
    // Fenster, und ein falsch geratener Standard liefert die halbe Runde
    // spiegelverkehrt.
    oeffnung: p.oeffnung ?? '',
    typId: p.typId,
    setId: p.setId,
  }
}

function leer(): Entwurf {
  return {
    menge: '1',
    bezeichnung: '',
    breiteCm: '',
    hoeheCm: '',
    preisChf: '',
    rahmendicke: STANDARD.rahmendicke,
    rahmenfarbe: STANDARD.rahmenfarbe,
    netzfarbe: STANDARD.netzfarbe,
    mechanismus: STANDARD.mechanismus,
    oeffnung: '',
  }
}

function zahl(wert: string): number {
  const n = Number(wert.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Auf den Millimeter, nicht auf den Zentimeter: 128.6 gerundet passt nicht. */
function masszahl(wert: string): number | undefined {
  const n = zahl(wert)
  return n > 0 ? Math.min(600, Math.round(n * 10) / 10) : undefined
}

function ausEntwurf(e: Entwurf): BestellPosition {
  const position: BestellPosition = {
    menge: Math.min(99, Math.max(1, Math.round(zahl(e.menge)) || 1)),
    bezeichnung: e.bezeichnung.trim(),
    detail: '',
    preisChf: Math.round(zahl(e.preisChf) * 100) / 100,
    rahmendicke: e.rahmendicke.trim() || undefined,
    rahmenfarbe: e.rahmenfarbe,
    netzfarbe: e.netzfarbe,
    mechanismus: e.mechanismus,
  }
  const breite = masszahl(e.breiteCm)
  const hoehe = masszahl(e.hoeheCm)
  if (breite !== undefined) position.breiteCm = breite
  if (hoehe !== undefined) position.hoeheCm = hoehe
  if (e.oeffnung) position.oeffnung = e.oeffnung
  if (e.typId) position.typId = e.typId
  if (e.setId) {
    position.setId = e.setId
    // Wie im Warenkorb: Das Set ist eine Preiszeile, sein Inhalt steht als Text.
    const set = setById(e.setId)
    if (set) {
      const inhalt = set.items.map((i) => `${i.count}× ${typeById(i.typeId)?.label ?? i.typeId}`).join(', ')
      position.detail = `${netsInSet(set)} Netze: ${inhalt}`
    }
  } else if (e.typId && breite && hoehe) {
    position.detail = formatSize(breite, hoehe)
  }
  if (e.id) position.id = e.id
  return position
}

export function NetzEditor({
  positionen,
  montageChf,
  montageProNetz,
  onSpeichern,
  onAbbrechen,
  speichernText,
  deaktiviert = false,
  katalog = false,
}: NetzEditorProps) {
  const { t, sprache } = useSprache()
  const [entwuerfe, setEntwuerfe] = useState<Entwurf[]>(() =>
    positionen.length > 0 ? positionen.map(zuEntwurf) : [leer()],
  )
  const [montage, setMontage] = useState(String(montageChf))
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const aendere = (index: number, teil: Partial<Entwurf>) => {
    setEntwuerfe((liste) => liste.map((e, i) => (i === index ? { ...e, ...teil } : e)))
  }

  const netze = entwuerfe.map(ausEntwurf)
  const summeNetze = positionenSumme(netze)
  const summe = Math.round((summeNetze + zahl(montage)) * 100) / 100

  const speichern = async () => {
    // Katalog: Nur, was aus dem Katalog kommt, zaehlt. Eine leere Zeile mit
    // "— waehlen —" ist kein Netz, aber auch kein Fehler – sie faellt weg.
    const gefuellt = katalog
      ? netze.filter((p) => p.typId || p.setId)
      : netze.filter((p) => p.bezeichnung || p.preisChf > 0 || p.breiteCm || p.hoeheCm)
    if (katalog && gefuellt.length === 0 && netze.length > 0) {
      setFehler(t.katalogFehlt)
      return
    }
    if (gefuellt.some((p) => !p.bezeichnung)) {
      setFehler(t.bezeichnungFehlt)
      return
    }
    setFehler(null)
    setSendet(true)
    try {
      await onSpeichern(gefuellt, Math.round(zahl(montage) * 100) / 100)
    } catch (f) {
      setFehler(f instanceof Error ? f.message : 'Fehler')
      setSendet(false)
    }
  }

  return (
    <div className="netze">
      {katalog && <p className="netze__hinweis">{t.katalogSatz}</p>}
      {entwuerfe.map((e, i) => (
        <fieldset className="netz" key={i}>
          <legend className="netz__nummer">
            {t.netzNummer} {i + 1}
            {e.setId && <span className="netz__quelle">{t.setAusKatalog}</span>}
          </legend>

          {katalog && (
            <div className="netz__reihe">
              <label className="netz__feld netz__feld--breit">
                <span>{t.katalogprodukt}</span>
                <select
                  className={katalogWert(e) ? 'input' : 'input netz__fehlt'}
                  aria-label={`${t.katalogprodukt} ${i + 1}`}
                  value={katalogWert(e)}
                  onChange={(ev) => setEntwuerfe((liste) => liste.map((x, j) => (j === i ? ausKatalog(ev.target.value, x) : x)))}
                >
                  <option value="">{t.bitteWaehlen}</option>
                  <optgroup label={t.einzelneNetze}>
                    {windowTypes.map((typ) => (
                      <option key={typ.id} value={`typ:${typ.id}`}>
                        {typ.label} · {formatSize(typ.widthCm, typ.heightCm)} · {formatChf(typ.priceChf)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t.setsGruppe}>
                    {netSets.map((set) => (
                      <option key={set.id} value={`set:${set.id}`}>
                        {set.label} · {netsInSet(set)} {t.netzeMehrzahl} · {formatChf(set.priceChf)}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
            </div>
          )}

          <div className="netz__reihe">
            <label className="netz__feld netz__feld--winzig">
              <span>{t.anzahlKurz}</span>
              <input className="input" inputMode="numeric" value={e.menge} onChange={(ev) => aendere(i, { menge: ev.target.value })} />
            </label>
            <label className="netz__feld netz__feld--breit">
              <span>{t.bezeichnungRaum}</span>
              <input
                className="input"
                placeholder="z. B. Schlafzimmer Süd"
                value={e.bezeichnung}
                onChange={(ev) => aendere(i, { bezeichnung: ev.target.value })}
              />
            </label>
            <label className="netz__feld netz__feld--klein">
              <span>{t.breiteCm}</span>
              <input className="input" inputMode="decimal" placeholder="128.6" value={e.breiteCm} disabled={katalog} onChange={(ev) => aendere(i, { breiteCm: ev.target.value })} />
            </label>
            <label className="netz__feld netz__feld--klein">
              <span>{t.hoeheCm}</span>
              <input className="input" inputMode="decimal" placeholder="182.5" value={e.hoeheCm} disabled={katalog} onChange={(ev) => aendere(i, { hoeheCm: ev.target.value })} />
            </label>
            <label className="netz__feld netz__feld--klein">
              <span>{t.preisChf}</span>
              <input className="input" inputMode="decimal" value={e.preisChf} disabled={katalog} onChange={(ev) => aendere(i, { preisChf: ev.target.value })} />
            </label>
            <button
              type="button"
              className="netze__weg"
              aria-label={`${t.netzNummer} ${i + 1} ${t.netzEntfernen}`}
              onClick={() => setEntwuerfe((liste) => liste.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>

          {/* Was der Produzent braucht. Er kennt unser Sortiment nicht. */}
          <div className="netz__reihe netz__reihe--produktion">
            <label className="netz__feld netz__feld--klein">
              <span>{t.rahmendicke}</span>
              <input className="input" value={e.rahmendicke} disabled={katalog} onChange={(ev) => aendere(i, { rahmendicke: ev.target.value })} />
            </label>
            <label className="netz__feld netz__feld--klein">
              <span>{t.rahmen}</span>
              <select className="input" value={e.rahmenfarbe} disabled={katalog} onChange={(ev) => aendere(i, { rahmenfarbe: ev.target.value as Rahmenfarbe })}>
                {Object.entries(RAHMENFARBEN).map(([wert, b]) => (
                  <option key={wert} value={wert}>
                    {b[sprache]}
                  </option>
                ))}
              </select>
            </label>
            <label className="netz__feld netz__feld--klein">
              <span>{t.netzSpalte}</span>
              <select className="input" value={e.netzfarbe} disabled={katalog} onChange={(ev) => aendere(i, { netzfarbe: ev.target.value as Netzfarbe })}>
                {Object.entries(NETZFARBEN).map(([wert, b]) => (
                  <option key={wert} value={wert}>
                    {b[sprache]}
                  </option>
                ))}
              </select>
            </label>
            <label className="netz__feld">
              <span>{t.mechanismus}</span>
              <select className="input" value={e.mechanismus} disabled={katalog} onChange={(ev) => aendere(i, { mechanismus: ev.target.value as Mechanismus })}>
                {Object.entries(MECHANISMEN).map(([wert, b]) => (
                  <option key={wert} value={wert}>
                    {b[sprache]}
                  </option>
                ))}
              </select>
            </label>
            <label className="netz__feld netz__feld--breit">
              <span>{t.oeffnungVonInnen}</span>
              <select
                className={e.oeffnung || katalog ? 'input' : 'input netz__fehlt'}
                value={e.oeffnung}
                disabled={katalog}
                onChange={(ev) => aendere(i, { oeffnung: ev.target.value as OpeningDirection | '' })}
              >
                <option value="">{t.nochOffen}</option>
                {Object.entries(OEFFNUNGEN).map(([wert, b]) => (
                  <option key={wert} value={wert}>
                    {b[sprache]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      ))}

      <button type="button" className="btn btn--quiet" onClick={() => setEntwuerfe((l) => [...l, leer()])}>
        {t.netzHinzufuegen}
      </button>

      <div className="netze__montage">
        <label className="field__label" htmlFor="netze-montage">
          {t.montageInsgesamt}
        </label>
        <input
          id="netze-montage"
          className="input netze__feld"
          inputMode="decimal"
          value={montage}
          onChange={(e) => setMontage(e.target.value)}
        />
        <span className="netze__hinweis">{fuelle(t.montageProFenster, { preis: formatChf(montageProNetz) })}</span>
      </div>

      <p className="netze__summe">
        <span>
          {t.netzeSumme} {formatChf(summeNetze)}
          {zahl(montage) > 0 && ` · ${t.montageSumme} ${formatChf(zahl(montage))}`}
        </span>
        <strong>{formatChf(summe)}</strong>
      </p>

      {fehler && <p className="form-status form-status--error">{fehler}</p>}

      <div className="netze__schritte">
        <button type="button" className="btn" onClick={speichern} disabled={sendet || deaktiviert}>
          {sendet ? t.wirdGespeichert : (speichernText ?? t.netzeSpeichern)}
        </button>
        <button type="button" className="btn btn--quiet" onClick={onAbbrechen} disabled={sendet}>
          {t.abbrechen}
        </button>
      </div>
    </div>
  )
}
