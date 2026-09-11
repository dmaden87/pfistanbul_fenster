import { useState } from 'react'
import type { AbsageGrund, Bestellung, BestellAenderung, BestellPosition } from '../../types'
import type { AdminTexte } from './sprache'
import { formatChf } from '../../lib/format'
import {
  artText,
  quelleText,
  datum,
  grundText,
  montageBetrag,
  positionDetail,
  positionenSumme,
  tag,
  zahlungsdifferenz,
  zahlungstext,
} from './hilfen'
import { margeFuer } from '../../lib/einkauf'
import { auftragAufbauen } from '../../lib/bestellauftrag'
import {
  abgeschlossen,
  bezahltAm,
  ohneEinkauf,
  phaseNachWiederoeffnen,
  phasenEntfallen,
  restbetragChf,
  tageSeit,
  zahlungAusstehend,
  type Abschnitt,
} from '../../lib/phasen'
import { NetzEditor } from './NetzEditor'
import { PreisFestlegen } from './PreisFestlegen'
import { KostenEditor } from './KostenEditor'
import { fuelle, useSprache } from './sprache'

/**
 * Eine Bestellung in ihrer Phase.
 *
 * Eine Bestellung ist ein Eintrag, die einzelnen Netze stecken darin. Im
 * eingeklappten Zustand steht deshalb nur, was man zum Sortieren braucht –
 * wer, wie viele Netze, wie viel. Die Netze selbst kommen beim Aufklappen,
 * und dort lassen sie sich auch aendern.
 *
 * Die Knoepfe bleiben immer sichtbar. Sie sind die taegliche Arbeit; sie
 * hinter einem Klick zu verstecken hiesse, jeden Tag zweimal zu klicken.
 * Genau ein Hauptknopf je Phase – der Schritt vorwaerts –, der Rest leise.
 */

/**
 * Was ein Knopf tut: die Offerte oeffnen, die Absage-Frage stellen, oder
 * eine Aenderung an der Bestellung schicken. Als Daten und nicht als
 * Rueckruf, damit die Liste je Phase eine reine Tabelle bleibt.
 */
type KartenKnopf = {
  tat: 'offerte' | 'absagen' | 'anfrageBlatt' | 'bestellBlatt' | 'kosten' | BestellAenderung
  text: string
  art: 'haupt' | 'still'
  /** Warum der Knopf gerade nicht geht – steht daneben, statt dass er fehlt. */
  gesperrt?: string
}

interface BestellKarteProps {
  bestellung: Bestellung
  /** Der Abschnitt, in dem die Karte steht. Bestimmt die Uebersicht, nicht die Karte. */
  abschnitt: Abschnitt
  /** Die Auftraege im selben Paket, diesen eingeschlossen. Ohne Paket: nur er. */
  paket: Bestellung[]
  montageProNetz: number
  onAendern: (id: string, aenderung: BestellAenderung) => Promise<void>
  onLoeschen: (id: string) => void
  /** Oeffnet die Offerte an die Kundschaft. */
  onOfferte: (id: string) => void
  /** Oeffnet den Talon an Bora: Preisanfrage oder Bestellung, fuer diese Auftraege. */
  onBlatt: (ids: string[], art: 'anfrage' | 'bestellung', nummer: string) => void
  /** Fuers Paket gewaehlt. Nur in "Bestellen". */
  gewaehlt?: boolean
  onWahl?: (id: string, gewaehlt: boolean) => void
}

/** Die Gruende fuer eine Absage, in der Reihenfolge, in der sie vorkommen. */
const ABSAGE_GRUENDE: AbsageGrund[] = ['spam', 'doppelt', 'keineAntwort', 'kunde', 'zuTeuer', 'storno']

/** Wie viele Angaben dem Produzenten fuer diese Bestellung noch fehlen. */
function fehlendeAngaben(b: Bestellung): number {
  return auftragAufbauen([b]).luecken.reduce((n, l) => n + l.fehlt.length, 0)
}

/**
 * Was von dieser Phase aus zu tun ist.
 *
 * Der Hauptknopf ist immer der Schritt VORWAERTS im Workflow. Zurueck geht
 * es leise und mit Grund. "Absagen" gibt es ueberall ausser im Archiv –
 * eine Bestellung kann in jeder Phase sterben.
 */
function knoepfe(b: Bestellung, abschnitt: Abschnitt, t: AdminTexte): KartenKnopf[] {
  const absagen: KartenKnopf = { tat: 'absagen', text: t.knopfAbsagen, art: 'still' }
  const zurueck = (phase: Bestellung['status'], name: string): KartenKnopf => ({
    tat: { status: phase },
    text: fuelle(t.knopfZurueck, { phase: name }),
    art: 'still',
  })

  switch (abschnitt) {
    case 'neu':
      return [{ tat: { status: 'klaerung' }, text: t.knopfAngenommen, art: 'haupt' }, absagen]
    case 'klaerung': {
      const fehlt = b.positionen.length === 0 ? 1 : fehlendeAngaben(b)
      return [
        {
          tat: { status: 'kosten' },
          text: t.knopfKlaerungFertig,
          art: 'haupt',
          gesperrt: fehlt > 0 ? fuelle(t.angabenFehlenMarke, { n: fehlt }) : undefined,
        },
        absagen,
      ]
    }
    case 'kosten': {
      // Preisanfrage raus, Boras Antwort abtippen, dann weiter. Solange
      // Preise fehlen, ist "Kosten eintragen" die Arbeit dieser Phase.
      const offen = ohneEinkauf(b)
      return [
        {
          tat: { status: 'offerte' },
          text: t.knopfKostenDa,
          art: 'haupt',
          gesperrt:
            b.positionen.length === 0
              ? t.nochKeineNetze
              : offen > 0
                ? fuelle(t.einkaufspreiseStand, { da: b.positionen.length - offen, alle: b.positionen.length })
                : undefined,
        },
        { tat: 'kosten', text: offen > 0 ? t.kostenEintragen : t.kostenAendern, art: offen > 0 ? 'haupt' : 'still' },
        { tat: 'anfrageBlatt', text: t.preisanfrageAnzeigen, art: 'still' },
        zurueck('klaerung', t.phaseKlaerung),
        absagen,
      ]
    }
    case 'offerte':
      // Erst die Verkaufspreise, dann die Offerte: Solange die Richtpreise
      // drinstehen, ist der Hauptknopf der Block "Verkaufspreise festlegen".
      // "Offerte ist raus" ist der Schritt vorwaerts – ins Warten.
      return [
        { tat: 'offerte', text: t.knopfOfferteAnzeigen, art: b.preiseFestgelegtAm ? 'haupt' : 'still' },
        { tat: { status: 'zusage', offerteVersendet: true }, text: t.knopfOfferteRaus, art: b.preiseFestgelegtAm ? 'haupt' : 'still' },
        { tat: { status: 'klaerung' }, text: t.knopfAenderungswunsch, art: 'still' },
        absagen,
      ]
    case 'zusage':
      // Beim Kunden. Drei Ausgaenge: Zusage nach vorn, Nachbessern zurueck
      // zum Angebot, Absage ins Archiv – und der Aenderungswunsch zur Klaerung.
      return [
        { tat: { status: 'bestellen', zusage: true }, text: t.knopfKundeZugesagt, art: 'haupt' },
        { tat: 'offerte', text: t.knopfOfferteAnzeigen, art: 'still' },
        { tat: { status: 'offerte' }, text: t.knopfNachbessern, art: 'still' },
        { tat: { status: 'klaerung' }, text: t.knopfAenderungswunsch, art: 'still' },
        absagen,
      ]
    case 'bestellen': {
      // Erst der Talon an Bora, dann die Stempel (bestellt, unterwegs) in
      // der Reihe darueber, zuletzt "angekommen" – der Schritt nach Phase 6.
      const liste: KartenKnopf[] = [
        { tat: 'bestellBlatt', text: b.paket ? t.bestelltalonPaket : t.bestelltalonAnzeigen, art: b.bestelltAm ? 'still' : 'haupt' },
      ]
      if (b.bestelltAm) liste.push({ tat: { status: 'ausliefern' }, text: t.knopfAngekommen, art: 'haupt' })
      liste.push({ tat: 'kosten', text: ohneEinkauf(b) > 0 ? t.kostenEintragen : t.kostenAendern, art: 'still' })
      if (b.paket) liste.push({ tat: { paket: '' }, text: t.paketAufloesen, art: 'still' })
      if (!phasenEntfallen(b)) liste.push({ tat: { status: 'zusage', zusage: false }, text: t.knopfZusageZurueck, art: 'still' })
      liste.push(absagen)
      return liste
    }
    case 'ausliefern': {
      const bezahlt = Boolean(bezahltAm(b))
      const uebergeben = Boolean(b.ausgeliefertAm)
      const liste: KartenKnopf[] = []
      if (!uebergeben && !bezahlt) {
        liste.push({ tat: { ausgeliefert: true, bezahlt: true }, text: t.knopfUebergeben, art: 'haupt' })
        liste.push({ tat: { ausgeliefert: true }, text: t.knopfNurAusgeliefert, art: 'still' })
      } else if (!uebergeben) {
        liste.push({ tat: { ausgeliefert: true }, text: t.knopfNurAusgeliefert, art: 'haupt' })
      } else if (!bezahlt) {
        liste.push({ tat: { bezahlt: true }, text: t.knopfBezahlt, art: 'haupt' })
      }
      // Der Zoll kommt Wochen nach der Ware – deshalb auch hier noch.
      liste.push({ tat: 'kosten', text: t.kostenAendern, art: 'still' })
      liste.push(zurueck('bestellen', t.phaseBestellen))
      liste.push(absagen)
      return liste
    }
    case 'archiv':
      if (b.status === 'abgesagt') {
        return [{ tat: { status: phaseNachWiederoeffnen(b) }, text: t.knopfWiederOeffnen, art: 'still' }]
      }
      return [{ tat: { ausgeliefert: false, bezahlt: false }, text: t.knopfWiederOeffnen, art: 'still' }]
    default:
      return []
  }
}

/** Wie viele Netze in der Bestellung stecken. Sets zaehlen als eine Position. */
function netzZahl(positionen: BestellPosition[]): number {
  return positionen.reduce((summe, p) => summe + p.menge, 0)
}

/**
 * Ein Datumsfeld, das erst beim Verlassen speichert. Ein Datumsfeld feuert
 * beim Tippen fuer jeden gueltigen Zwischenstand – drei Speichervorgaenge
 * fuer ein Datum waeren drei Zeitstempel "geaendert".
 */
function Datumsfeld({
  id,
  wert,
  text,
  onSpeichern,
}: {
  id: string
  wert: string | undefined
  text: string
  onSpeichern: (wert: string) => Promise<void>
}) {
  const [entwurf, setEntwurf] = useState(wert ?? '')
  return (
    <label className="admin__termin" htmlFor={id}>
      <span>{text}</span>
      <input
        id={id}
        className="input"
        type="date"
        value={entwurf}
        onChange={(e) => setEntwurf(e.target.value)}
        onBlur={() => {
          if (entwurf !== (wert ?? '')) void onSpeichern(entwurf)
        }}
      />
    </label>
  )
}

export function BestellKarte({
  bestellung: b,
  abschnitt,
  paket,
  montageProNetz,
  onAendern,
  onLoeschen,
  onOfferte,
  onBlatt,
  gewaehlt,
  onWahl,
}: BestellKarteProps) {
  const [offen, setOffen] = useState(false)
  const [bearbeitet, setBearbeitet] = useState(false)
  const [loeschFrage, setLoeschFrage] = useState(false)
  const [absageFrage, setAbsageFrage] = useState(false)
  const [preiseBearbeiten, setPreiseBearbeiten] = useState(false)
  const [kostenOffen, setKostenOffen] = useState(false)
  const [notiz, setNotiz] = useState(b.notiz ?? '')
  const [zahlungNotiz, setZahlungNotiz] = useState(b.zahlungKommentar ?? '')
  const { t, ort } = useSprache()

  const montage = montageBetrag(b)
  const differenz = zahlungsdifferenz(b)
  const anzahl = netzZahl(b.positionen)
  const offerteTage = tageSeit(b.offerteAm)
  const phaseTage = tageSeit(b.phaseSeit)
  const marge = margeFuer(b)
  const fertig = abgeschlossen(b)
  const rest = restbetragChf(b)

  const speichereNetze = async (positionen: BestellPosition[], montageChf: number) => {
    await onAendern(b.id, { positionen, montageChf })
    setBearbeitet(false)
  }

  const speicherePreise = async (positionen: BestellPosition[], montageChf: number) => {
    await onAendern(b.id, { positionen, montageChf, preiseFestgelegt: true })
    setPreiseBearbeiten(false)
  }

  const klick = async (k: KartenKnopf) => {
    if (k.tat === 'offerte') onOfferte(b.id)
    else if (k.tat === 'absagen') setAbsageFrage(true)
    else if (k.tat === 'kosten') setKostenOffen(true)
    else if (k.tat === 'anfrageBlatt') onBlatt([b.id], 'anfrage', b.referenz || b.id)
    else if (k.tat === 'bestellBlatt') onBlatt(paket.map((x) => x.id), 'bestellung', b.paket ?? (b.referenz || b.id))
    else await onAendern(b.id, k.tat)
  }

  const mitgenossen = paket.filter((x) => x.id !== b.id)

  const klasse =
    abschnitt === 'archiv' ? (fertig ? 'admin__karte--abgeschlossen' : 'admin__karte--abgesagt') : `admin__karte--${abschnitt}`

  return (
    <li className={`admin__karte ${klasse}`}>
      <div className="admin__karte-kopf">
        {onWahl && (
          <label className="admin__wahl">
            <input type="checkbox" checked={Boolean(gewaehlt)} onChange={(e) => onWahl(b.id, e.target.checked)} />
            <span className="admin__wahl-text">{t.fuerPaket}</span>
          </label>
        )}
        <span className={`admin__art admin__art--${b.art}`}>{artText(b.art, t)}</span>
        <span className="admin__referenz">{b.referenz || b.id}</span>
        <span className="admin__datum">{datum(b.eingang)}</span>
        {b.quelle && b.quelle !== 'web' && <span className="admin__marke">{quelleText(b.quelle, t)}</span>}
        {b.bezahlung?.status === 'bezahlt' && (
          <span className="admin__marke admin__marke--gut">{t.bezahltMarke} · {formatChf(b.bezahlung.betragChf)}</span>
        )}
        {b.paket && (abschnitt === 'bestellen' || abschnitt === 'ausliefern') && (
          <span className="admin__marke">
            {t.paketMarke} {b.paket}
            {mitgenossen.length > 0 && ` · ${t.imPaketMit} ${mitgenossen.map((x) => x.referenz || x.id).join(', ')}`}
          </span>
        )}
        {phasenEntfallen(b) && (abschnitt === 'bestellen' || abschnitt === 'ausliefern') && (
          <span className="admin__marke">{t.entfaelltMarke}</span>
        )}
        {b.zusageAm && (abschnitt === 'bestellen' || abschnitt === 'ausliefern') && (
          <span className="admin__marke admin__marke--gut">{t.zugesagtMarke} {tag(b.zusageAm, ort)}</span>
        )}
        {zahlungAusstehend(b) && abschnitt !== 'archiv' && (
          <span className="admin__marke admin__marke--warnung">{t.zahlungAusstehendMarke}</span>
        )}
        {rest > 0 && b.bezahlung?.status === 'bezahlt' && !fertig && (
          <span className="admin__marke admin__marke--warnung">{t.restbetrag} {formatChf(rest)}</span>
        )}
        {/*
          Der Datensatz ist unvollstaendig, sobald eine Position keinen
          Einkaufspreis hat. Das faellt sonst nicht auf: Die Marge sieht dann
          BESSER aus, nicht schlechter. Gezeigt ab der Phase, in der die
          Preise da sein muessten.
        */}
        {!marge.vollstaendig && (abschnitt === 'bestellen' || abschnitt === 'ausliefern' || fertig) && (
          <span className="admin__marke admin__marke--warnung">{t.datensatzUnvollstaendig}</span>
        )}
        {phaseTage !== null && phaseTage >= 7 && abschnitt !== 'archiv' && (
          <span className="admin__marke">{fuelle(t.seitTagen, { n: phaseTage })}</span>
        )}
        {abschnitt === 'offerte' && !b.preiseFestgelegtAm && (
          <span className="admin__marke admin__marke--warnung">{t.richtpreisMarke}</span>
        )}
        {abschnitt === 'archiv' && b.status === 'abgesagt' && (
          <span className="admin__marke">
            {t.abgesagtMarke} · {grundText(b.absageGrund, t)}
            {b.absageAm && ` · ${tag(b.absageAm, ort)}`}
          </span>
        )}
        {fertig && <span className="admin__marke admin__marke--gut">{t.erledigtMarke}</span>}
      </div>

      <div className="admin__zeile">
        <strong>{b.kunde.name}</strong>
        <span className="admin__detail">
          {anzahl > 0 ? `${anzahl} ${anzahl === 1 ? t.netz : t.netzeMehrzahl}` : t.nochKeineNetze}
          {b.montage && ` · ${t.mitMontage}`}
        </span>
        <strong className="admin__preis">{formatChf(b.summeChf)}</strong>
      </div>

      {kostenOffen && (
        <KostenEditor
          bestellung={b}
          mitZoll={abschnitt === 'bestellen' || abschnitt === 'ausliefern'}
          onSpeichern={async (einkauf) => {
            await onAendern(b.id, { einkauf })
            setKostenOffen(false)
          }}
          onSchliessen={() => setKostenOffen(false)}
        />
      )}

      {/* Phase 5: zwei Stempel, von Hand. Angekommen ist der Knopf unten. */}
      {abschnitt === 'bestellen' && (
        <div className="admin__haken-reihe">
          <label className="admin__haken">
            <input type="checkbox" checked={Boolean(b.bestelltAm)} onChange={(e) => onAendern(b.id, { bestellt: e.target.checked })} />
            <span>
              {t.bestelltBeiBora}
              {b.bestelltAm && <span className="admin__detail"> {t.am} {tag(b.bestelltAm, ort)}</span>}
            </span>
          </label>
          <label className="admin__haken">
            <input type="checkbox" checked={Boolean(b.versandAm)} onChange={(e) => onAendern(b.id, { versand: e.target.checked })} />
            <span>
              {t.unterwegs}
              {b.versandAm && <span className="admin__detail"> {t.am} {tag(b.versandAm, ort)}</span>}
            </span>
          </label>
        </div>
      )}

      {/*
        Phase 2: der Termin beim Kunden und der Haken "ausgemessen". Der
        Haken nur beim Sondermass – Katalogware wird nicht ausgemessen.
      */}
      {abschnitt === 'klaerung' && (
        <div className="admin__haken-reihe">
          <Datumsfeld
            id={`klaerung-${b.id}`}
            wert={b.klaerungTermin}
            text={t.klaerungTermin}
            onSpeichern={(wert) => onAendern(b.id, { klaerungTermin: wert })}
          />
          {b.art === 'anfrage' && (
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
          )}
        </div>
      )}

      {/* Phase 4, erster Teil: aus Boras Kosten den Verkaufspreis machen. */}
      {abschnitt === 'offerte' && (!b.preiseFestgelegtAm || preiseBearbeiten) && (
        <PreisFestlegen
          bestellung={b}
          montageProNetz={montageProNetz}
          onSpeichern={speicherePreise}
          onAbbrechen={preiseBearbeiten ? () => setPreiseBearbeiten(false) : undefined}
        />
      )}

      {/* Phase 4, zweiter Teil: die festgelegten Preise, aenderbar. */}
      {abschnitt === 'offerte' && b.preiseFestgelegtAm && !preiseBearbeiten && (
        <div className="admin__haken-reihe">
          <span className="admin__marke admin__marke--gut">
            {t.preiseFestgelegtAm} {tag(b.preiseFestgelegtAm, ort)}
          </span>
          <button type="button" className="btn btn--quiet" onClick={() => setPreiseBearbeiten(true)}>
            {t.knopfPreiseAendern}
          </button>
        </div>
      )}

      {/* Phase 5: seit wann die Offerte beim Kunden liegt. */}
      {abschnitt === 'zusage' && (
        <div className="admin__haken-reihe">
          <span className="admin__marke admin__marke--gut">
            {t.offerteVersendet}
            {b.offerteAm && <span className="admin__detail"> {t.am} {tag(b.offerteAm, ort)}</span>}
          </span>
          {offerteTage !== null && offerteTage >= 7 && (
            <span className="admin__marke admin__marke--warnung">{fuelle(t.ohneAntwortSeit, { n: offerteTage })}</span>
          )}
        </div>
      )}

      {/* Phase 6: der Termin, die beiden Haken und eine Notiz zur Zahlung. */}
      {abschnitt === 'ausliefern' && (
        <div className="admin__haken-reihe">
          <Datumsfeld
            id={`montage-${b.id}`}
            wert={b.montageTermin}
            text={t.montageTermin}
            onSpeichern={(wert) => onAendern(b.id, { montageTermin: wert })}
          />
          {b.ausgeliefertAm && (
            <span className="admin__marke admin__marke--gut">
              {t.knopfNurAusgeliefert} · {tag(b.ausgeliefertAm, ort)}
            </span>
          )}
          {bezahltAm(b) && (
            <span className="admin__marke admin__marke--gut">
              {t.bezahltMarke} · {tag(bezahltAm(b), ort)}
            </span>
          )}
          <label className="admin__termin admin__termin--breit" htmlFor={`zahlung-${b.id}`}>
            <span>{t.zahlungKommentar}</span>
            <input
              id={`zahlung-${b.id}`}
              className="input"
              value={zahlungNotiz}
              onChange={(e) => setZahlungNotiz(e.target.value)}
            />
          </label>
          {zahlungNotiz !== (b.zahlungKommentar ?? '') && (
            <button type="button" className="btn btn--quiet" onClick={() => onAendern(b.id, { zahlungKommentar: zahlungNotiz })}>
              {t.speichern}
            </button>
          )}
        </div>
      )}
      {abschnitt === 'archiv' && b.zahlungKommentar && (
        <p className="admin__bemerkung admin__bemerkung--notiz">{t.zahlungKommentar}: {b.zahlungKommentar}</p>
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
            {b.klaerungTermin && abschnitt !== 'klaerung' && (
              <span className="admin__detail">{t.klaerungTermin}: {tag(b.klaerungTermin, ort)}</span>
            )}
            {b.montageTermin && abschnitt !== 'ausliefern' && (
              <span className="admin__detail">{t.montageTermin}: {tag(b.montageTermin, ort)}</span>
            )}
          </div>

          <div className="admin__positionen">
            {bearbeitet ? (
              <NetzEditor
                katalog={b.art === 'bestellung'}
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
                            {typeof p.einkaufChf === 'number' && (
                              <span className="admin__detail"> · {t.einkauf} {formatChf(p.einkaufChf)}</span>
                            )}
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
                {(marge.einkaufChf > 0 || marge.lieferkostenChf > 0 || (b.zollChf ?? 0) > 0) && (
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
                      {typeof b.zollChf === 'number' && (
                        <div>
                          <dt>{t.zoll}</dt>
                          <dd>{formatChf(b.zollChf)}</dd>
                        </div>
                      )}
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
        {absageFrage ? (
          /*
           * Der Grund gehoert zur Absage. Spam und Doppel sind keine
           * verlorenen Auftraege – ohne Grund saehe das Archiv aus, als
           * sagte jeder zweite Kunde ab.
           */
          <span className="admin__absage">
            <strong>{t.absageWarum}</strong>
            {ABSAGE_GRUENDE.map((grund) => (
              <button
                key={grund}
                type="button"
                className="btn btn--quiet"
                onClick={async () => {
                  await onAendern(b.id, { status: 'abgesagt', absageGrund: grund })
                  setAbsageFrage(false)
                }}
              >
                {grundText(grund, t)}
              </button>
            ))}
            <button type="button" className="btn btn--quiet" onClick={() => setAbsageFrage(false)}>
              {t.abbrechen}
            </button>
          </span>
        ) : (
          knoepfe(b, abschnitt, t).map((k) => (
            <span key={k.text} className="admin__schritt">
              <button
                type="button"
                className={k.art === 'haupt' ? 'btn' : 'btn btn--quiet'}
                disabled={Boolean(k.gesperrt)}
                onClick={() => klick(k)}
              >
                {k.text}
              </button>
              {k.gesperrt && <span className="admin__marke admin__marke--warnung">{k.gesperrt}</span>}
            </span>
          ))
        )}

        {/*
          Endgueltiges Loeschen gibt es nur im Archiv und nur nach einer
          Rueckfrage. Es ist der Weg, das Loeschversprechen aus der
          Datenschutzerklaerung einzuloesen.
        */}
        {abschnitt === 'archiv' &&
          !absageFrage &&
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
