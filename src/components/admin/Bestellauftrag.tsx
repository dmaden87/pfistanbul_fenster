import { useState } from 'react'
import type { Bestellung } from '../../types'
import { auftragAufbauen, kennungFuer, pakete, type AuftragsNetz } from '../../lib/bestellauftrag'
import {
  ABSENDER,
  GANZE_LIEFERUNG,
  MASSREGEL,
  MECHANISMEN,
  NETZFARBEN,
  OEFFNUNGEN,
  PREISHINWEIS,
  RAHMENFARBEN,
  RICHTUNGSREGEL,
  TEXTE,
  beschriften,
  type Beschriftung,
} from '../../data/produktion'
import { useSprache } from './sprache'
import { useDokumentName, useSeitenformat } from './seitenformat'
import './Bestellauftrag.css'

/**
 * Der Auftrag an den Produzenten – als Preisanfrage oder als Bestellung.
 *
 * Es ist dasselbe Dokument. Der Unterschied: Die Anfrage hat eine leere
 * Preisspalte, damit er sie fuellt, und einen offenen Liefertermin. Die
 * Bestellung nennt unseren erwarteten Termin und enthaelt KEINE Zahlen zum
 * Geld.
 *
 * WARUM AUF DER BESTELLUNG KEINE KOSTEN MEHR STEHEN. Das Blatt trug einmal
 * eine Stueckpreisspalte, eine Frachtspalte je Paket und ein theoretisch
 * gerechnetes Packmass ("ca. 162 × 11 × 11 cm"). Drei Dinge, die beim Bauen
 * eines Netzes nicht helfen: Was die Lieferung kostet, traegt Bora nach der
 * Bestellung direkt in unsere Buchhaltung ein, und wie dick ein Buendel
 * Stangen wirklich wird, weiss er besser als unsere Schaetzung. Was bleibt,
 * ist eine Fertigungs- und Packanweisung – und die liest sich jetzt auf
 * einen Blick.
 *
 * ZUM PDF: ueber die Druckfunktion des Browsers ("Als PDF sichern"). Das
 * spart eine Programmbibliothek, funktioniert auf dem Telefon genauso und
 * bricht nicht, wenn irgendwo eine Abhaengigkeit veraltet.
 *
 * DIE SPRACHE steht ausschliesslich in src/data/produktion.ts. Der Auftrag
 * geht auf Tuerkisch raus; dieser Entwurf zeigt Deutsch, damit wir ihn
 * pruefen koennen.
 */

type Art = 'anfrage' | 'bestellung'

/**
 * Die Sprache des Blatts. Der Auftrag geht auf Tuerkisch raus; Deutsch bleibt
 * zum Pruefen, bevor er abgeschickt wird. Umgeschaltet wird nur, welches Feld
 * jeder Beschriftung genommen wird – der Aufbau ist derselbe.
 */
type Sprache = 'deutsch' | 'tuerkisch'

interface BestellauftragProps {
  /** Die Auftraege auf dem Blatt – einer, oder die eines Pakets. */
  bestellungen: Bestellung[]
  /** Preisanfrage (Phase 3) oder verbindliche Bestellung (Phase 5). */
  art: Art
  /** Was oben rechts steht: die Referenz des Auftrags oder das Paket-Etikett. */
  nummer: string
  /**
   * Folgt dieses Blatt einer Sendung, die schon bestellt ist?
   *
   * Dann steht nur das Neue darauf, und es MUSS daraufstehen, dass das Alte
   * nicht noch einmal gebaut werden soll. Ein zweites Blatt zur selben
   * Sendung ohne diesen Satz ist eine Aufforderung, alles zu wiederholen.
   */
  nachtrag?: boolean
  onZurueck: () => void
}

function mass(wert: number | undefined): string {
  return wert === undefined ? '—' : String(wert)
}

function netzZeile(n: AuftragsNetz, s: Sprache) {
  return {
    breite: mass(n.breiteCm),
    hoehe: mass(n.hoeheCm),
    dicke: n.rahmendicke ?? '—',
    rahmen: beschriften(RAHMENFARBEN, n.rahmenfarbe, s) ?? '—',
    netz: beschriften(NETZFARBEN, n.netzfarbe, s) ?? '—',
    mechanismus: beschriften(MECHANISMEN, n.mechanismus, s) ?? '—',
    oeffnung: beschriften(OEFFNUNGEN, n.oeffnung, s) ?? '—',
  }
}

export function Bestellauftrag({ bestellungen, art, nummer, nachtrag = false, onZurueck }: BestellauftragProps) {
  // Die Sprache des BLATTS. Sie hat mit der Sprache der Maske nichts zu tun:
  // Das Blatt geht in die Tuerkei, die Maske bedient, wer hier sitzt.
  const [sprache, setSprache] = useState<Sprache>('tuerkisch')
  const { t: m } = useSprache()
  useSeitenformat('quer')

  /*
   * Termin und Bemerkung gehoeren zum Blatt, nicht zum Auftrag: Sie werden
   * fuer diesen Ausdruck getippt und nicht gespeichert. Ein Blatt ist ein
   * Ausdruck; was Bora zurueckmeldet, landet auf der Karte des Auftrags.
   */
  const [termin, setTermin] = useState('')
  const [bemerkung, setBemerkung] = useState('')

  /*
   * Der Dateiname beim Sichern als PDF.
   *
   * Beim Drucken aus dem Browser gibt es dafuer genau einen Hebel: den Titel
   * des Dokuments. Chrome und Safari schlagen ihn als Dateinamen vor. Deshalb
   * wird er gesetzt, solange dieses Blatt offen ist, und danach wieder auf
   * den alten zurueckgestellt – sonst steht er noch im Reiter, wenn laengst
   * wieder die Bestellliste zu sehen ist.
   */
  useDokumentName(
    `pfistanbul_${art === 'anfrage' ? 'talep' : 'siparis'}_${nummer.trim().replace(/[^A-Za-z0-9-]/g, '') || 'x'}`,
  )

  const auftrag = auftragAufbauen(bestellungen)
  const paketliste = pakete(auftrag.zeilen)
  const anzahl = auftrag.zeilen.length
  const notizen = bestellungen.filter((b) => b.notiz?.trim()).map((b) => [kennungFuer(b), b.notiz!.trim()] as const)

  /*
   * Die Preisspalte gibt es nur auf der ANFRAGE, und sie ist immer leer: Sie
   * ist die Frage. Auf der Bestellung steht keine Zahl zum Geld – was die
   * Lieferung kostet, traegt Bora danach in unsere Buchhaltung ein.
   */
  const mitPreisspalte = art === 'anfrage'
  /** Kuerzel fuer "nimm die Fassung in der gewaehlten Sprache". */
  const w = (b: Beschriftung) => b[sprache]
  const heute = new Date().toLocaleDateString(sprache === 'tuerkisch' ? 'tr-TR' : 'de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <>
      {/* Die Einstellungen werden nicht mitgedruckt. */}
      <div className="auftrag__steuerung">
        <div className="auftrag__wahl">
          <label className="admin__haken">
            <input type="radio" name="sprache" checked={sprache === 'tuerkisch'} onChange={() => setSprache('tuerkisch')} />
            <span>{m.tuerkisch}</span>
          </label>
          <label className="admin__haken">
            <input type="radio" name="sprache" checked={sprache === 'deutsch'} onChange={() => setSprache('deutsch')} />
            <span>{m.deutschNurPruefen}</span>
          </label>
        </div>
        <div className="auftrag__felder">
          <label className="admin__termin">
            <span>{m.terminFuersBlatt}</span>
            <input className="input" value={termin} onChange={(e) => setTermin(e.target.value)} placeholder="z. B. Ende Oktober 2026" />
          </label>
          <label className="admin__termin admin__termin--breit">
            <span>{m.bemerkungFuersBlatt}</span>
            <input className="input" value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} />
          </label>
        </div>
        <div className="auftrag__schritte">
          <button type="button" className="btn" onClick={() => window.print()} disabled={auftrag.luecken.length > 0}>
            {m.druckenAlsPdf}
          </button>
          <button type="button" className="btn btn--quiet" onClick={onZurueck}>
            {m.zurueckZurLieferung}
          </button>
        </div>

        {/*
          Kein Auftrag mit einer Annahme darin. Eine Lieferung aus der Tuerkei,
          die nicht passt, kostet Wochen – diese Meldung kostet fuenf Minuten.
        */}
        {auftrag.luecken.length > 0 && (
          <div className="auftrag__luecken">
            <strong>{m.auftragKannNichtRaus}</strong>
            <ul>
              {auftrag.luecken.map((l, i) => (
                <li key={i}>
                  <code>{l.kennung}</code>, {l.netz}: {l.fehlt.join(', ')}
                </li>
              ))}
            </ul>
            <p>{m.angabenImNetzEditor}</p>
          </div>
        )}
      </div>

      {/* Ab hier das Dokument, das gedruckt wird. Querformat. */}
      <article className="blatt" data-druckblatt>
        <header className="blatt__kopf">
          {/*
            Keine Anschrift: Das Blatt ist ein Arbeitspapier zwischen drei
            Parteien, die einander kennen, und jede Lieferung geht ohnehin an
            uns. Nur der Name bleibt, damit das Blatt nicht anonym ist.
          */}
          <p className="blatt__marke">{ABSENDER.firma}</p>
          <div className="blatt__rechts">
            {/*
              Zwei Blaetter, zwei Titel: "Preisanfrage" oder "Definitive
              Bestellung". Was Bora tun soll, steht als Satz darunter.
            */}
            <h1>{w(art === 'anfrage' ? TEXTE.titelAnfrage : TEXTE.titelBestellung)}</h1>
            <p className="blatt__stand">{w(art === 'anfrage' ? TEXTE.untertitelAnfrage : TEXTE.untertitelBestellung)}</p>
            {/*
              "Sendung" vor der Nummer: Auf diesem Blatt gibt es die Lieferung
              als Ganzes und das Buendel je Auftrag. Beide hiessen "Paket",
              bis hier ein Wort stand.
            */}
            <p className="blatt__zeile">
              {nummer && (
                <strong>
                  {w(TEXTE.sendung)} {nummer}
                  {/*
                    DAS WORT GEHOERT DEM BLATT, nicht der Maske. Es stand
                    zuerst im Etikett, das von aussen hereinkam - und damit
                    auf Deutsch auf einem tuerkischen Blatt.
                  */}
                  {nachtrag ? ` · ${w(TEXTE.nachtrag)}` : ''} ·{' '}
                </strong>
              )}
              {heute}
            </p>
          </div>
        </header>

        {nachtrag && (
          <section className="blatt__regeln blatt__regeln--nachtrag">
            <p><strong>{w(TEXTE.nachtragSatz)}</strong></p>
          </section>
        )}

        <section className="blatt__regeln">
          <p>
            <strong>{w(MASSREGEL)}</strong>
          </p>
          <p>{w(RICHTUNGSREGEL)}</p>
        </section>

        {/*
          Der Termin. Auf der Anfrage ein leeres Feld, das er fuellt; auf der
          Bestellung unsere Erwartung – und wenn keine getippt wurde, steht
          die Zeile gar nicht erst da. "Erwarteter Liefertermin: —" auf einem
          verbindlichen Auftrag sagt nichts und sieht aus, als waere etwas
          verlorengegangen.
        */}
        {(art === 'anfrage' || termin.trim()) && (
          <section className="blatt__termin">
            {art === 'anfrage' ? (
              <p>
                {w(TEXTE.terminOffen)}: <span className="blatt__leer" />
              </p>
            ) : (
              <p>
                {w(TEXTE.terminGesetzt)}: <strong>{termin.trim()}</strong>
              </p>
            )}
          </section>
        )}

        {bemerkung && <p className="blatt__bemerkung">{bemerkung}</p>}

        {/*
          Die interne Notiz jedes Auftrags geht mit – dort stehen die
          Sonderwuensche und Fragen, die Bora wissen muss. Bei mehreren
          Auftraegen auf dem Blatt steht die Paketkennung davor.
        */}
        {notizen.length > 0 && (
          <section className="blatt__notizen">
            <h2>{w(TEXTE.notizen)}</h2>
            {notizen.map(([kennung, text]) => (
              <p className="blatt__bemerkung" key={kennung}>
                {bestellungen.length > 1 && <strong>{kennung}: </strong>}
                {text}
              </p>
            ))}
          </section>
        )}

        <section>
          <h2>
            {anzahl} {w(anzahl === 1 ? TEXTE.plissee : TEXTE.plissees)} · {w(TEXTE.stueckHinweis)}
          </h2>
          {/*
            EINE Tabelle, nicht zwei. Jede Zeile ist ein Plissee und traegt
            seine Paketkennung – damit ist die Liste zugleich die Fertigungs-
            und die Packanweisung. Gleiche Bauarten stehen hintereinander,
            damit er sie in einem Zug fertigen kann.
          */}
          <table className="blatt__tabelle blatt__tabelle--handschrift">
            <thead>
              <tr>
                <th className="blatt__eng">{w(TEXTE.nummer)}</th>
                <th>{w(TEXTE.buendel)}</th>
                <th>{w(TEXTE.fenster)}</th>
                <th className="blatt__eng">{w(TEXTE.breite)}</th>
                <th className="blatt__eng">{w(TEXTE.hoehe)}</th>
                <th>{w(TEXTE.rahmendicke)}</th>
                <th>{w(TEXTE.rahmen)}</th>
                <th>{w(TEXTE.netz)}</th>
                <th>{w(TEXTE.mechanismus)}</th>
                <th>{w(TEXTE.oeffnung)}</th>
                {mitPreisspalte && <th className="blatt__preis">{w(TEXTE.stueckpreis)}</th>}
              </tr>
            </thead>
            <tbody>
              {auftrag.zeilen.map((z) => {
                const z2 = netzZeile(z, sprache)
                return (
                  <tr key={z.nummer}>
                    <td className="blatt__zahl">{z.nummer}</td>
                    <td className="blatt__paketzelle">{z.kennung}</td>
                    <td className="blatt__raum">{z.bezeichnung}</td>
                    <td className="blatt__zahl">{z2.breite}</td>
                    <td className="blatt__zahl">{z2.hoehe}</td>
                    <td>{z2.dicke}</td>
                    <td>{z2.rahmen}</td>
                    <td>{z2.netz}</td>
                    <td>{z2.mechanismus}</td>
                    <td>{z2.oeffnung}</td>
                    {mitPreisspalte && <td className="blatt__preis blatt__leer-feld" />}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="blatt__hinweis">
            {w(TEXTE.masseinheit)}
            {/* Die Bitte, Preise einzutragen, gehoert nur auf die Anfrage. */}
            {art === 'anfrage' && ` ${w(PREISHINWEIS)}`}
          </p>
        </section>

        {/*
          Die Pakete zum Nachzaehlen beim Packen – und nur dann, wenn es
          mehrere sind. Bei einem einzigen Paket stand hier eine Zeile und
          darunter dieselbe Zahl als "ganze Lieferung": zwei Zeilen, die
          dasselbe sagen.

          Das ungefaehre Packmass und die Frachtspalte sind raus. Beides war
          eine Rechnung von uns ueber etwas, das er besser weiss, und die
          Kosten gehoeren nach der Bestellung in unsere Buchhaltung.
        */}
        {paketliste.length > 1 && (
          <section className="blatt__pakete">
            <h2>{w(TEXTE.buendelTitel)}</h2>
            <table className="blatt__tabelle blatt__paketliste">
              <thead>
                <tr>
                  <th>{w(TEXTE.buendel)}</th>
                  <th className="blatt__eng">{w(TEXTE.stueck)}</th>
                </tr>
              </thead>
              <tbody>
                {paketliste.map((block) => (
                  <tr key={block.kennung}>
                    <td>
                      <span className="blatt__kennung">{block.kennung}</span>
                    </td>
                    <td className="blatt__zahl">{block.anzahl}</td>
                  </tr>
                ))}
                <tr className="blatt__gesamt">
                  <td>{w(GANZE_LIEFERUNG)}</td>
                  <td className="blatt__zahl">{anzahl}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

      </article>
    </>
  )
}
