import { useState } from 'react'
import type { Bestellung, BestellAenderung, BestellPosition } from '../../types'
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
  whatsappNummer,
} from './hilfen'
import { ABSAGE_GRUENDE, knoepfe, type KartenKnopf } from '../../lib/aktionen'
import { operator } from '../../data/operator'
import {
  abgeschlossen,
  bezahltAm,
  phasenEntfallen,
  preisAenderbar,
  restbetragChf,
  tageSeit,
  zahlungAusstehend,
  PREISPHASEN,
  type Abschnitt,
} from '../../lib/phasen'
import { NetzEditor } from './NetzEditor'
import { Angebot } from './Angebot'
import { KontaktEditor } from './KontaktEditor'
import { KostenEditor } from '../zahlen/KostenEditor'
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
 *
 * WAS HIER NICHT STEHT: Einkauf, Fracht, Zoll, Marge. Diese Karte ist das
 * Verkaufs-CRM und zeigt nur, was hereinkommt – Verkaufspreise fuer die
 * Kundschaft, Erloese fuer uns. Die Felder dazu bleiben im Datensatz
 * (`einkaufChf`, `lieferkostenChf`, `zollChf`) und werden vom Server
 * weiterhin bewahrt; sie gehoeren in die Buchhaltung, und die steht als
 * eigener Bereich daneben. Ein Blatt, auf dem beides steht, laedt dazu ein,
 * dem Kunden die Marge zu zeigen.
 */

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
  onQuittung: (id: string) => void
  /** Oeffnet den Talon an Bora: Preisanfrage oder Bestellung, fuer diese Auftraege. */
  onBlatt: (ids: string[], art: 'anfrage' | 'bestellung', nummer: string) => void
  /** Fuers Paket gewaehlt. Nur in "Bestellen". */
  gewaehlt?: boolean
  onWahl?: (id: string, gewaehlt: boolean) => void
  /**
   * Die Karte steht INNERHALB einer Paketkarte. Dann fehlen ihr alles, was
   * das ganze Paket betrifft – die Paketmarke, der Haken "unterwegs", die
   * Sendungsnummer und die Knoepfe fuers Paket. Das steht einmal im Kopf
   * darueber und nicht auf jeder Karte noch einmal.
   */
  imPaket?: boolean
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
  onQuittung,
  onBlatt,
  gewaehlt,
  onWahl,
  imPaket = false,
}: BestellKarteProps) {
  const [offen, setOffen] = useState(false)
  const [bearbeitet, setBearbeitet] = useState(false)
  const [loeschFrage, setLoeschFrage] = useState(false)
  const [absageFrage, setAbsageFrage] = useState(false)
  const [preiseBearbeiten, setPreiseBearbeiten] = useState(false)
  const [kopiert, setKopiert] = useState(false)
  const [kontaktBearbeiten, setKontaktBearbeiten] = useState(false)
  const [kostenOffen, setKostenOffen] = useState(false)

  /*
   * DIE NACHRICHT AN DIE KUNDSCHAFT IST IMMER DEUTSCH, auch wenn Ufuk den
   * Adminbereich auf Tuerkisch bedient. Die Sprache der Maske sagt etwas
   * ueber den, der sie bedient - nicht ueber den, der die Nachricht liest.
   * Derselbe Grund wie beim Bestellblatt an Bora, nur andersherum: dort
   * Tuerkisch, hier Deutsch, und beides unabhaengig davon, wer gerade tippt.
   */
  const bewertungsText =
    `Guten Tag ${b.kunde.name}, danke für Ihr Vertrauen! Wenn Sie mit unseren ` +
    `Plissees zufrieden sind, freuen wir uns sehr über eine kurze Bewertung – ` +
    `das dauert eine Minute und hilft uns mehr als alles andere: ${operator.reviewUrl}`

  const nummer = whatsappNummer(b.kunde.telefon)
  const whatsappZiel = nummer
    ? `https://wa.me/${nummer}?text=${encodeURIComponent(bewertungsText)}`
    : null

  /*
   * Die Zwischenablage darf fehlschlagen - ohne HTTPS, ohne Erlaubnis, in
   * manchen eingebetteten Ansichten. Dann bleibt der Knopf einfach stumm,
   * statt die Karte mit einem Fehler zu behelligen: Die Adresse steht als
   * Verweis gleich daneben und laesst sich von Hand nehmen.
   */
  const linkKopieren = () => {
    navigator.clipboard?.writeText(operator.reviewUrl).then(
      () => { setKopiert(true); setTimeout(() => setKopiert(false), 2000) },
      () => {},
    )
  }

  /*
   * BIS ZUR BEZAHLUNG LAESST SICH DER PREIS AENDERN, und zwar in jeder Phase
   * ab dem Angebot.
   *
   * Vorher hing dieser Block an `abschnitt === 'offerte'` allein. Das
   * unterstellt, dass nach dem Verschicken der Offerte nichts mehr passiert -
   * und das stimmt nicht: Ein Netz hat einen Mangel und wir erhoehen den
   * Rabatt, es aendert sich etwas Wesentliches, wir zeigen Goodwill, es
   * braucht Zusatzmaterial. Wer das nicht hier aendern kann, aendert es
   * nirgends und traegt die Differenz im Kopf.
   *
   * Die Grenze ist die ZAHLUNG, nicht die Phase. Ist das Geld da, ist der
   * Preis eine Tatsache; was danach kaeme, waere eine Rueckerstattung und
   * kein neuer Preis.
   */
  const bezahlt = Boolean(bezahltAm(b))
  const preisOffen = preisAenderbar(b, abschnitt)
  const [notiz, setNotiz] = useState(b.notiz ?? '')
  const [zahlungNotiz, setZahlungNotiz] = useState(b.zahlungKommentar ?? '')
  const [sendung, setSendung] = useState(b.sendungsnummer ?? '')
  const { t, ort } = useSprache()

  const montage = montageBetrag(b)
  const differenz = zahlungsdifferenz(b)
  const anzahl = netzZahl(b.positionen)
  const offerteTage = tageSeit(b.offerteAm)
  const phaseTage = tageSeit(b.phaseSeit)
  const fertig = abgeschlossen(b)
  const rest = restbetragChf(b)

  const speichereNetze = async (positionen: BestellPosition[], montageChf: number) => {
    await onAendern(b.id, { positionen, montageChf })
    setBearbeitet(false)
  }

  const speichereAngebot = async (aenderung: BestellAenderung) => {
    await onAendern(b.id, aenderung)
    setPreiseBearbeiten(false)
  }

  /**
   * Alles, was die SENDUNG betrifft, gilt fuer das ganze Paket: ob sie
   * unterwegs ist und unter welcher Nummer. Ein Paket ist eine Kiste – sie
   * kann nicht fuer den einen Auftrag unterwegs sein und fuer den anderen
   * nicht, und sie hat nicht zwei Nummern.
   *
   * Das war erst nicht so, und es sah im Datensatz genau so falsch aus, wie
   * es ist: beide Auftraege mit derselben Sendungsnummer, der eine
   * "unterwegs", der andere nicht.
   */
  const fuersPaket = async (aenderung: BestellAenderung) => {
    for (const auftrag of paket) await onAendern(auftrag.id, aenderung)
  }

  const klick = async (k: KartenKnopf) => {
    if (k.tat === 'offerte') onOfferte(b.id)
    else if (k.tat === 'absagen') setAbsageFrage(true)
    else if (k.tat === 'anfrageBlatt') onBlatt([b.id], 'anfrage', b.referenz || b.id)
    else if (k.tat === 'bestellBlatt') onBlatt(paket.map((x) => x.id), 'bestellung', b.paket ?? (b.referenz || b.id))
    else if (k.tat === 'boraBestellt') {
      // Das ganze Paket geht gemeinsam zu Bora – siehe knoepfe().
      for (const auftrag of paket) await onAendern(auftrag.id, { status: 'bora', bestellt: true })
    } else await onAendern(b.id, k.tat)
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
        {b.paket && !imPaket && (abschnitt === 'bestellen' || abschnitt === 'bora' || abschnitt === 'ausliefern') && (
          <span className="admin__marke">
            {t.paketMarke} {b.paket}
            {mitgenossen.length > 0 && ` · ${t.imPaketMit} ${mitgenossen.map((x) => x.referenz || x.id).join(', ')}`}
          </span>
        )}
        {phasenEntfallen(b) &&
          (abschnitt === 'neu' || abschnitt === 'bestellen' || abschnitt === 'bora' || abschnitt === 'ausliefern') && (
            <span className="admin__marke">{t.entfaelltMarke}</span>
          )}
        {b.zusageAm && (abschnitt === 'bestellen' || abschnitt === 'bora' || abschnitt === 'ausliefern') && (
          <span className="admin__marke admin__marke--gut">{t.zugesagtMarke} {tag(b.zusageAm, ort)}</span>
        )}
        {zahlungAusstehend(b) && abschnitt !== 'archiv' && (
          <span className="admin__marke admin__marke--warnung">{t.zahlungAusstehendMarke}</span>
        )}
        {rest > 0 && b.bezahlung?.status === 'bezahlt' && !fertig && (
          <span className="admin__marke admin__marke--warnung">{t.restbetrag} {formatChf(rest)}</span>
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

      {/*
        BEI BORA: der Haken "unterwegs" und die Sendungsnummer. Beides nur
        hier – im Backlog ist noch nichts bestellt, und nach der Ankunft
        interessiert die Nummer niemanden mehr.
      */}
      {abschnitt === 'bora' && !imPaket && (
        <div className="admin__haken-reihe">
          {b.bestelltAm && (
            <span className="admin__marke admin__marke--gut">
              {t.bestelltBeiBora} · {tag(b.bestelltAm, ort)}
            </span>
          )}
          <label className="admin__haken">
            <input type="checkbox" checked={Boolean(b.versandAm)} onChange={(e) => fuersPaket({ versand: e.target.checked })} />
            <span>
              {b.paket ? t.unterwegsPaket : t.unterwegs}
              {b.versandAm && <span className="admin__detail"> {t.am} {tag(b.versandAm, ort)}</span>}
            </span>
          </label>
          {/*
            Freiwillig, und deshalb ohne Sperre: Bora schickt ueber wechselnde
            Spediteure, manchmal gibt es gar keine Nummer. Gespeichert wird
            erst auf Knopfdruck, wie bei der Notiz – ein Feld, das bei jedem
            Zeichen speichert, schreibt fuer eine Nummer zwanzig Mal.
          */}
          <label className="admin__termin admin__termin--breit" htmlFor={`sendung-${b.id}`}>
            <span>{b.paket ? t.sendungsnummerPaket : t.sendungsnummer}</span>
            <input
              id={`sendung-${b.id}`}
              className="input"
              value={sendung}
              onChange={(e) => setSendung(e.target.value)}
            />
          </label>
          {sendung !== (b.sendungsnummer ?? '') && (
            <button type="button" className="btn btn--quiet" onClick={() => fuersPaket({ sendungsnummer: sendung })}>
              {t.speichern}
            </button>
          )}
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

      {/* Das Angebot: Vorschlag des Rechners, Verkaufspreise, die drei Posten. */}
      {preisOffen && (!b.preiseFestgelegtAm || preiseBearbeiten) && (
        <Angebot
          bestellung={b}
          onSpeichern={speichereAngebot}
          onAbbrechen={preiseBearbeiten ? () => setPreiseBearbeiten(false) : undefined}
        />
      )}

      {/* Steht es, bleibt nur der Weg zurueck hinein. */}
      {preisOffen && b.preiseFestgelegtAm && !preiseBearbeiten && (
        <div className="admin__haken-reihe">
          <span className="admin__marke admin__marke--gut">
            {t.preiseFestgelegtAm} {tag(b.preiseFestgelegtAm, ort)}
          </span>
          <button type="button" className="btn btn--quiet" onClick={() => setPreiseBearbeiten(true)}>
            {abschnitt === 'offerte' ? t.knopfPreiseAendern : t.knopfPreisAendern}
          </button>
          {abschnitt !== 'offerte' && <span className="admin__detail">{t.preisAenderbarSatz}</span>}
        </div>
      )}

      {/* Bezahlt: Der Preis steht. Hier wird nichts mehr verhandelt. */}
      {PREISPHASEN.includes(abschnitt) && b.preiseFestgelegtAm && bezahlt && (
        <p className="admin__detail">{t.preisGesperrtSatz}</p>
      )}

      {/* Warten: seit wann die Offerte beim Kunden liegt. */}
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

      {/* Ausliefern: der Termin, die beiden Haken und eine Notiz zur Zahlung. */}
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

      {/*
        DIE BITTE UM EINE BEWERTUNG, und zwar erst wenn geliefert UND bezahlt
        ist. Vorher ist sie unverschaemt, und ein Kunde mit offener Rechnung
        vergibt keine fuenf Sterne. Danach verfliegt der Moment schnell: Wer
        drei Wochen spaeter fragt, bekommt ein Ja und nie eine Bewertung.

        GENAU DAS IST `abgeschlossen()` - und genau deshalb steht hier nicht
        `abschnitt === 'ausliefern'`. Eine uebergebene und bezahlte Bestellung
        wandert im selben Augenblick ins Archiv (abschnittFuer in phasen.ts).
        Die Bedingung "in Ausliefern UND geliefert UND bezahlt" beschreibt
        also die leere Menge: Der Block erschiene nie, und niemand haette es
        gemerkt - Tests und Typen sind damit zufrieden.
      */}
      {/*
        DIE QUITTUNG STEHT VOR DER BITTE UM EINE BEWERTUNG, weil das die
        Reihenfolge der Uebergabe ist: erst den Beleg geben, dann um Sterne
        bitten. Und sie steht ausserhalb der Klappe - wer bar bezahlt hat,
        wartet unter Umstaenden daneben darauf.
      */}
      {abgeschlossen(b) && (
        <div className="admin__quittung-reihe">
          <button type="button" className="btn btn--quiet" onClick={() => onQuittung(b.id)}>
            {t.quittungAnzeigen}
          </button>
          <span className="admin__detail">{t.quittungSatz}</span>
        </div>
      )}

      {abgeschlossen(b) && (
        <div className="admin__bewertung">
          <div className="admin__bewertung-kopf">
            <strong>{t.bewertungTitel}</strong>
            <span className="admin__detail">{t.bewertungSatz}</span>
          </div>
          <div className="admin__bewertung-knoepfe">
            <a className="btn btn--quiet" href={operator.reviewUrl} target="_blank" rel="noreferrer">
              {operator.reviewUrl.replace('https://', '')}
            </a>
            <button type="button" className="btn btn--quiet" onClick={linkKopieren}>
              {kopiert ? t.bewertungKopiert : t.bewertungKopieren}
            </button>
            {whatsappZiel && (
              <a className="btn btn--haupt" href={whatsappZiel} target="_blank" rel="noreferrer">
                {t.bewertungWhatsapp}
              </a>
            )}
          </div>
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
          {/*
            KONTAKTDATEN AENDERN, IN JEDER PHASE - ohne Bedingung an den
            Abschnitt. Eine Adresse ist kein Zustand des Auftrags, sondern
            eine Angabe ueber einen Menschen, und die veraltet unabhaengig
            davon, wie weit der Auftrag ist.
          */}
          {kontaktBearbeiten ? (
            <KontaktEditor
              bestellung={b}
              onSpeichern={(aenderung) => onAendern(b.id, aenderung)}
              onAbbrechen={() => setKontaktBearbeiten(false)}
            />
          ) : (
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
            <button type="button" className="admin__kontakt-knopf" onClick={() => setKontaktBearbeiten(true)}>
              {t.kontaktBearbeiten}
            </button>
          </div>
          )}

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
                    {montage > 0 && ` · ${t.montageSumme} ${formatChf(montage)}`}
                    {b.anfahrt && ` · ${t.anfahrtSumme} ${(b.anfahrtChf ?? 0) > 0 ? formatChf(b.anfahrtChf ?? 0) : t.kostenlos}`}
                    {b.rabattChf ? ` · ${b.rabattText || t.rabattSumme} −${formatChf(b.rabattChf)}` : ''} · {zahlungstext(b, t, ort)}
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

                <div className="admin__karte-knoepfe">
                  <button type="button" className="btn btn--quiet" onClick={() => setBearbeitet(true)}>
                    {t.netzeBearbeiten}
                  </button>
                  <button type="button" className="btn btn--quiet" onClick={() => onOfferte(b.id)}>
                    {t.offerteAnzeigen}
                  </button>
                  {abgeschlossen(b) && (
                    <button type="button" className="btn btn--quiet" onClick={() => onQuittung(b.id)}>
                      {t.quittungAnzeigen}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {offen && b.kunde.bemerkung && <p className="admin__bemerkung">{b.kunde.bemerkung}</p>}

      {/*
        DIE KOSTEN - IN JEDER PHASE, ABER EINGEKLAPPT.
        
        Sie standen hier einmal nicht, und der Grund dafuer gilt weiter: Diese
        Karte ist das Verkaufs-CRM, und man haelt sie beim Ausmessen der
        Kundschaft hin. Boras Einkaufspreis offen daneben waere ein Klick vom
        Kunden entfernt.
        
        Deshalb zwei Tueren statt keiner: Der Block liegt schon hinter "Netze
        und Angaben anzeigen", und die Kosten noch einmal hinter einem eigenen
        Knopf. Wer sie braucht, kommt in zwei Klicks hin; wer die Karte
        herumzeigt, sieht sie nie.
        
        Ohne Phasenbedingung, weil Kosten nicht auf eine Phase warten: Eine
        Fahrt zum Ausmessen, Mustermaterial, eine Anfrage, aus der nichts
        wurde - das kostet, bevor ueberhaupt bestellt ist. In die
        Erfolgsrechnung geht davon nichts, bis der Auftrag in einer festen
        Phase steht; das entscheidet `inRechnung`, nicht dieses Formular.
      */}
      {offen && (
        <div className={kostenOffen ? 'admin__kosten admin__kosten--offen' : 'admin__kosten'}>
          {kostenOffen ? (
            <>
              <p className="admin__kosten-titel">{t.kostenErfassen}</p>
              <KostenEditor
                bestellung={b}
                onSpeichern={(kosten) => onAendern(b.id, { kosten })}
                onSchliessen={() => setKostenOffen(false)}
              />
            </>
          ) : (
            <button type="button" className="admin__kontakt-knopf" onClick={() => setKostenOffen(true)}>
              {t.kostenErfassen}
            </button>
          )}
        </div>
      )}

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
          knoepfe(b, abschnitt, t, imPaket).map((k) => (
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
