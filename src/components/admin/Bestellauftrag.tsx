import { useEffect, useState } from 'react'
import type { Bestellung, Lieferung } from '../../types'
import { auftragAufbauen, pakete, type AuftragsNetz, type AuftragsZeile, type Luecke } from '../../lib/bestellauftrag'
import {
  ABSENDER,
  GANZE_LIEFERUNG,
  LIEFERKOSTEN,
  PACKMASS_TITEL,
  MASSREGEL,
  MECHANISMEN,
  NETZFARBEN,
  OEFFNUNGEN,
  PREISHINWEIS,
  RAHMENFARBEN,
  RICHTUNGSREGEL,
  TEXTE,
  type Beschriftung,
} from '../../data/produktion'
import { useSprache } from './sprache'
import './Bestellauftrag.css'

/**
 * Der Auftrag an den Produzenten – als Preisanfrage oder als Bestellung.
 *
 * Es ist dasselbe Dokument. Der Unterschied steht gross im Titel und in einer
 * Spalte: Bei der Anfrage bleibt der Stueckpreis leer, damit er ihn eintraegt,
 * und der Liefertermin ist ein leeres Feld. Bei der Bestellung steht unser
 * erwarteter Termin gedruckt da und es gibt nichts auszufuellen.
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
  /**
   * Die Runde, zu der das Blatt gehoert. Aus ihrem Zustand ergibt sich, ob
   * es eine Anfrage oder eine Bestellung ist – der Titel wird nicht mehr von
   * Hand gewaehlt, er folgt dem Lebenslauf.
   */
  lieferung: Lieferung
  /** Die Bestellungen der Runde. Nur noetig, solange die Zeilen nicht stehen. */
  bestellungen: Bestellung[]
  onZurueck: () => void
}

/**
 * Die Zeilen des Blatts.
 *
 * Stehen sie in der Runde, gelten sie – auch wenn inzwischen jemand ein Netz
 * geaendert hat. Bora bezieht seine Preise auf die laufende Nummer, und die
 * darf sich nach dem Versand nicht mehr verschieben. Erst im Entwurf werden
 * sie aus den Bestellungen gerechnet.
 */
function zeilenFuer(lieferung: Lieferung, bestellungen: Bestellung[]): { zeilen: AuftragsZeile[]; luecken: Luecke[] } {
  if (lieferung.zeilen.length > 0) {
    return {
      zeilen: lieferung.zeilen.map((z) => ({
        ...z,
        menge: 1,
        rahmenfarbe: z.rahmenfarbe as AuftragsZeile['rahmenfarbe'],
        netzfarbe: z.netzfarbe as AuftragsZeile['netzfarbe'],
        mechanismus: z.mechanismus as AuftragsZeile['mechanismus'],
        oeffnung: z.oeffnung as AuftragsZeile['oeffnung'],
      })),
      luecken: [],
    }
  }
  return auftragAufbauen(bestellungen)
}

function mass(wert: number | undefined): string {
  return wert === undefined ? '—' : String(wert)
}

function netzZeile(n: AuftragsNetz, s: Sprache) {
  return {
    breite: mass(n.breiteCm),
    hoehe: mass(n.hoeheCm),
    dicke: n.rahmendicke ?? '—',
    rahmen: n.rahmenfarbe ? RAHMENFARBEN[n.rahmenfarbe][s] : '—',
    netz: n.netzfarbe ? NETZFARBEN[n.netzfarbe][s] : '—',
    mechanismus: n.mechanismus ? MECHANISMEN[n.mechanismus][s] : '—',
    oeffnung: n.oeffnung ? OEFFNUNGEN[n.oeffnung][s] : '—',
  }
}

export function Bestellauftrag({ lieferung, bestellungen, onZurueck }: BestellauftragProps) {
  // Die Sprache des BLATTS. Sie hat mit der Sprache der Maske nichts zu tun:
  // Das Blatt geht in die Tuerkei, die Maske bedient, wer hier sitzt.
  const [sprache, setSprache] = useState<Sprache>('tuerkisch')
  const { t: m } = useSprache()

  // Alles Uebrige kommt aus der Runde. Was auf dem Blatt steht, ist damit
  // dasselbe, was gespeichert ist – nicht etwas, das nur im Browser existiert.
  const art: Art = lieferung.status === 'bestellt' || lieferung.status === 'geliefert' ? 'bestellung' : 'anfrage'
  const nummer = lieferung.nummer
  const termin = lieferung.termin ?? ''
  const bemerkung = lieferung.bemerkung ?? ''

  /*
   * Der Dateiname beim Sichern als PDF.
   *
   * Beim Drucken aus dem Browser gibt es dafuer genau einen Hebel: den Titel
   * des Dokuments. Chrome und Safari schlagen ihn als Dateinamen vor. Deshalb
   * wird er gesetzt, solange dieses Blatt offen ist, und danach wieder auf
   * den alten zurueckgestellt – sonst steht er noch im Reiter, wenn laengst
   * wieder die Bestellliste zu sehen ist.
   */
  useEffect(() => {
    const vorher = document.title
    const kennung = nummer.trim().replace(/[^A-Za-z0-9-]/g, '') || 'entwurf'
    document.title = `pfistanbul_talep_siparis_${kennung}`
    return () => {
      document.title = vorher
    }
  }, [nummer])

  const auftrag = zeilenFuer(lieferung, bestellungen)
  const paketliste = pakete(auftrag.zeilen)
  const anzahl = auftrag.zeilen.length
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
      <article className="blatt">
        <header className="blatt__kopf">
          {/*
            Keine Anschrift: Das Blatt ist ein Arbeitspapier zwischen drei
            Parteien, die einander kennen, und jede Lieferung geht ohnehin an
            uns. Nur der Name bleibt, damit das Blatt nicht anonym ist.
          */}
          <p className="blatt__marke">{ABSENDER.firma}</p>
          <div className="blatt__rechts">
            {/*
              Ein Titel fuer beide Zustaende – dasselbe Blatt geht als Anfrage
              raus und wird spaeter zur Bestellung. Der Zustand steht darunter
              und nicht im Titel, aber er steht da: Ob eine Zahl erfragt oder
              ein Auftrag erteilt wird, ist der Unterschied zwischen "was
              kostet das" und "bitte anfangen".
            */}
            <h1>{w(TEXTE.formular)}</h1>
            <p className="blatt__stand">
              {w(TEXTE.zustand)}: <strong>{w(art === 'anfrage' ? TEXTE.preisanfrage : TEXTE.bestellung)}</strong>
            </p>
            <p className="blatt__zeile">
              {nummer && <strong>{nummer} · </strong>}
              {heute}
            </p>
          </div>
        </header>

        <section className="blatt__regeln">
          <p>
            <strong>{w(MASSREGEL)}</strong>
          </p>
          <p>{w(RICHTUNGSREGEL)}</p>
        </section>

        <section className="blatt__termin">
          {art === 'anfrage' ? (
            <p>
              {w(TEXTE.terminOffen)}: <span className="blatt__leer" />
            </p>
          ) : (
            <p>
              {w(TEXTE.terminGesetzt)}: <strong>{termin || '—'}</strong>
            </p>
          )}
        </section>

        {bemerkung && <p className="blatt__bemerkung">{bemerkung}</p>}

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
                <th>{w(TEXTE.paket)}</th>
                <th>{w(TEXTE.fenster)}</th>
                <th className="blatt__eng">{w(TEXTE.breite)}</th>
                <th className="blatt__eng">{w(TEXTE.hoehe)}</th>
                <th>{w(TEXTE.rahmendicke)}</th>
                <th>{w(TEXTE.rahmen)}</th>
                <th>{w(TEXTE.netz)}</th>
                <th>{w(TEXTE.mechanismus)}</th>
                <th>{w(TEXTE.oeffnung)}</th>
                {/*
                  Der Preis wird NIE gedruckt, auch nicht auf der Bestellung.
                  Er ist veraenderlich – bei groesseren Mengen guenstiger – und
                  wird beim Produzenten ausgehandelt. Eine gedruckte Zahl waere
                  entweder falsch oder eine Behauptung.
                */}
                <th className="blatt__preis">{w(TEXTE.stueckpreis)}</th>
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
                    <td className="blatt__preis blatt__leer-feld" />
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="blatt__hinweis">
            {w(TEXTE.masseinheit)} {w(PREISHINWEIS)}
          </p>
        </section>

        {/*
          Die Pakete zum Nachzaehlen beim Packen – die einzelnen Netze stehen
          oben und tragen ihre Kennung selbst.

          Die Lieferkosten sind etwas anderes als der Stueckpreis und stehen
          deshalb hier. Eintragbar je Paket ODER fuer die ganze Lieferung, je
          nachdem, wie er rechnet: Beides anzubieten kostet eine Zeile und
          erspart eine Rueckfrage nach Istanbul.
        */}
        <section className="blatt__pakete">
          <h2>{w(TEXTE.paketeTitel)}</h2>
          <table className="blatt__tabelle blatt__tabelle--handschrift blatt__paketliste">
            <thead>
              <tr>
                <th>{w(TEXTE.paket)}</th>
                <th className="blatt__eng">{w(TEXTE.stueck)}</th>
                {/*
                  Nur eine Groessenordnung fuers Abschaetzen der Fracht, keine
                  Frachtangabe: Wie dick ein flach gepacktes Plissee wirklich
                  auftraegt, weiss der Produzent. Die Annahmen stehen in
                  src/data/produktion.ts und gehoeren nach der ersten Lieferung
                  korrigiert. Darum steht "ca." davor.
                */}
                <th>{w(PACKMASS_TITEL)}</th>
                <th className="blatt__preis">{w(LIEFERKOSTEN)}</th>
              </tr>
            </thead>
            <tbody>
              {paketliste.map((block) => (
                <tr key={block.kennung}>
                  <td>
                    <span className="blatt__kennung">{block.kennung}</span>
                  </td>
                  <td className="blatt__zahl">{block.anzahl}</td>
                  <td className="blatt__packmass">
                    {block.packmass
                      ? `${block.packmass.laengeCm} × ${block.packmass.seiteCm} × ${block.packmass.seiteCm} cm`
                      : '—'}
                  </td>
                  <td className="blatt__preis blatt__leer-feld" />
                </tr>
              ))}
              <tr className="blatt__gesamt">
                <td>{w(GANZE_LIEFERUNG)}</td>
                <td className="blatt__zahl">{anzahl}</td>
                <td />
                <td className="blatt__preis blatt__leer-feld" />
              </tr>
            </tbody>
          </table>
        </section>

      </article>
    </>
  )
}
