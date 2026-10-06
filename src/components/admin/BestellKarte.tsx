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
import { auftragAufbauen } from '../../lib/bestellauftrag'
import {
  abgeschlossen,
  bezahltAm,
  phaseNachWiederoeffnen,
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

/**
 * Was ein Knopf tut: die Offerte oeffnen, die Absage-Frage stellen, oder
 * eine Aenderung an der Bestellung schicken. Als Daten und nicht als
 * Rueckruf, damit die Liste je Phase eine reine Tabelle bleibt.
 */
type KartenKnopf = {
  tat: 'offerte' | 'absagen' | 'anfrageBlatt' | 'bestellBlatt' | 'boraBestellt' | BestellAenderung
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
  /**
   * Die Karte steht INNERHALB einer Paketkarte. Dann fehlen ihr alles, was
   * das ganze Paket betrifft – die Paketmarke, der Haken "unterwegs", die
   * Sendungsnummer und die Knoepfe fuers Paket. Das steht einmal im Kopf
   * darueber und nicht auf jeder Karte noch einmal.
   */
  imPaket?: boolean
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
function knoepfe(b: Bestellung, abschnitt: Abschnitt, t: AdminTexte, imPaket: boolean): KartenKnopf[] {
  const absagen: KartenKnopf = { tat: 'absagen', text: t.knopfAbsagen, art: 'still' }
  const zurueck = (phase: Bestellung['status'], name: string): KartenKnopf => ({
    tat: { status: phase },
    text: fuelle(t.knopfZurueck, { phase: name }),
    art: 'still',
  })

  switch (abschnitt) {
    case 'neu':
      /*
       * Katalogware ist im Webshop bestellt: Masse, Bauart und Preis stehen
       * fest, der Kunde hat an der Kasse zugesagt. Nach der Kontrolle geht
       * sie deshalb direkt ans Bestellen. Der Weg ueber die Klaerung bleibt
       * leise daneben – manchmal steht in der Bemerkung doch eine Frage.
       */
      if (phasenEntfallen(b)) {
        return [
          { tat: { status: 'bestellen', zusage: true }, text: t.knopfGeprueftBestellen, art: 'haupt' },
          { tat: { status: 'klaerung' }, text: t.knopfAngenommen, art: 'still' },
          absagen,
        ]
      }
      return [{ tat: { status: 'klaerung' }, text: t.knopfAngenommen, art: 'haupt' }, absagen]
    case 'klaerung': {
      /*
       * Von hier geht es direkt ans Angebot: Die Zwischenphase "Kosten
       * klaeren" gibt es nicht mehr. Gesperrt bleibt der Weg, solange dem
       * Produzenten Angaben fehlen – ein Angebot ueber ein Netz, das so
       * nicht gebaut werden kann, ist keines.
       */
      const fehlt = b.positionen.length === 0 ? 1 : fehlendeAngaben(b)
      return [
        {
          tat: { status: 'offerte' },
          text: t.knopfKlaerungFertig,
          art: 'haupt',
          gesperrt: fehlt > 0 ? fuelle(t.angabenFehlenMarke, { n: fehlt }) : undefined,
        },
        absagen,
      ]
    }
    case 'offerte':
      /*
       * Erst das Angebot zusammenstellen, dann die Offerte: Solange niemand
       * die Preise bestaetigt hat, stehen Vorschlaege drin, und der
       * Hauptknopf ist der Block darueber. "Offerte ist raus" ist der Schritt
       * vorwaerts – ins Warten.
       *
       * Die Preisanfrage an Bora steht leise daneben. Sie ist keine Phase
       * mehr, aber manchmal ist ein Netz so ungewoehnlich, dass man vorher
       * fragt – dafuer braucht es ein Blatt und keinen Workflow.
       */
      return [
        { tat: 'offerte', text: t.knopfOfferteAnzeigen, art: b.preiseFestgelegtAm ? 'haupt' : 'still' },
        { tat: { status: 'zusage', offerteVersendet: true }, text: t.knopfOfferteRaus, art: b.preiseFestgelegtAm ? 'haupt' : 'still' },
        { tat: 'anfrageBlatt', text: t.preisanfrageAnzeigen, art: 'still' },
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
      /*
       * DER BACKLOG. Hier liegt alles, was zugesagt ist und noch nicht bei
       * Bora – und hier wird gebuendelt: Ein Paket geht als Ganzes zu ihm,
       * mit einem gemeinsamen Talon.
       *
       * Der Hauptknopf ist der Talon, denn ohne ihn wird nichts bestellt.
       * Erst danach kommt "bei Bora bestellt" – der Schritt in die naechste
       * Phase, und zwar fuer das ganze Paket auf einmal: Wer ein Paket
       * zusammenstellt und dann jeden Auftrag einzeln weiterklicken muesste,
       * vergisst den dritten.
       */
      /*
       * Genau EIN Hauptknopf, und das ist der Schritt vorwaerts. Der Talon
       * steht leise daneben: Zwei dunkle Knoepfe uebereinander sahen auf dem
       * Telefon aus wie zwei gleich wichtige Wege, und die Karte wurde zur
       * Wand aus Knoepfen.
       */
      /*
       * IM PAKET STEHEN DIESE BEIDEN OBEN, nicht hier. Sie betreffen das
       * ganze Paket; auf jeder Karte wiederholt waeren sie bei vier
       * Auftraegen viermal derselbe Knopf, der viermal dasselbe tut.
       */
      const liste: KartenKnopf[] = imPaket
        ? []
        : [
            { tat: 'boraBestellt', text: t.knopfBeiBoraBestellt, art: 'haupt' },
            { tat: 'bestellBlatt', text: t.bestelltalonAnzeigen, art: 'still' },
          ]
      if (b.paket) liste.push({ tat: { paket: '' }, text: t.paketAufloesen, art: 'still' })
      if (!phasenEntfallen(b)) liste.push({ tat: { status: 'zusage', zusage: false }, text: t.knopfZusageZurueck, art: 'still' })
      liste.push(absagen)
      return liste
    }
    case 'bora': {
      /*
       * BEI BORA. Zwei Dinge sind hier zu wissen: ob die Ware unterwegs ist
       * (Haken in der Reihe darueber) und unter welcher Nummer. Der Schritt
       * vorwaerts ist "angekommen".
       */
      // Auch hier gilt: Was die ganze Sendung betrifft, steht im Paketkopf.
      const liste: KartenKnopf[] = imPaket
        ? []
        : [
            { tat: { status: 'ausliefern' }, text: t.knopfAngekommen, art: 'haupt' },
            { tat: 'bestellBlatt', text: t.bestelltalonAnzeigen, art: 'still' },
          ]
      if (b.paket) liste.push({ tat: { paket: '' }, text: t.paketAufloesen, art: 'still' })
      if (!imPaket) liste.push(zurueck('bestellen', t.phaseBestellen))
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
      liste.push(zurueck('bora', t.phaseBora))
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
  imPaket = false,
}: BestellKarteProps) {
  const [offen, setOffen] = useState(false)
  const [bearbeitet, setBearbeitet] = useState(false)
  const [loeschFrage, setLoeschFrage] = useState(false)
  const [absageFrage, setAbsageFrage] = useState(false)
  const [preiseBearbeiten, setPreiseBearbeiten] = useState(false)

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
