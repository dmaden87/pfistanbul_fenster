import { useState } from 'react'
import type { Bestellung } from '../../types'
import { auftragAufbauen, type AuftragsNetz } from '../../lib/bestellauftrag'
import {
  ABSENDER,
  GANZE_LIEFERUNG,
  LIEFERKOSTEN,
  MASSREGEL,
  MECHANISMEN,
  NETZFARBEN,
  OEFFNUNGEN,
  PREISHINWEIS,
  RAHMENFARBEN,
  RICHTUNGSREGEL,
} from '../../data/produktion'
import { operator } from '../../data/operator'
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

interface BestellauftragProps {
  bestellungen: Bestellung[]
  onZurueck: () => void
}

function mass(wert: number | undefined): string {
  return wert === undefined ? '—' : String(wert)
}

function netzZeile(n: AuftragsNetz) {
  return {
    breite: mass(n.breiteCm),
    hoehe: mass(n.hoeheCm),
    dicke: n.rahmendicke ?? '—',
    rahmen: n.rahmenfarbe ? RAHMENFARBEN[n.rahmenfarbe].deutsch : '—',
    netz: n.netzfarbe ? NETZFARBEN[n.netzfarbe].deutsch : '—',
    mechanismus: n.mechanismus ? MECHANISMEN[n.mechanismus].deutsch : '—',
    oeffnung: n.oeffnung ? OEFFNUNGEN[n.oeffnung].deutsch : '—',
  }
}

export function Bestellauftrag({ bestellungen, onZurueck }: BestellauftragProps) {
  const [art, setArt] = useState<Art>('anfrage')
  const [nummer, setNummer] = useState('')
  const [termin, setTermin] = useState('')
  const [bemerkung, setBemerkung] = useState('')

  const auftrag = auftragAufbauen(bestellungen)
  const heute = new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <>
      {/* Die Einstellungen werden nicht mitgedruckt. */}
      <div className="auftrag__steuerung">
        <div className="auftrag__wahl">
          <label className="admin__haken">
            <input type="radio" name="auftragsart" checked={art === 'anfrage'} onChange={() => setArt('anfrage')} />
            <span>Preisanfrage</span>
          </label>
          <label className="admin__haken">
            <input type="radio" name="auftragsart" checked={art === 'bestellung'} onChange={() => setArt('bestellung')} />
            <span>Bestellung</span>
          </label>
          <label className="auftrag__termin">
            <span>Lieferung Nr.</span>
            <input
              className="input auftrag__feld auftrag__feld--kurz"
              value={nummer}
              onChange={(e) => setNummer(e.target.value)}
              placeholder="L-2026-01"
            />
          </label>
          {art === 'bestellung' && (
            <label className="auftrag__termin">
              <span>Erwarteter Liefertermin</span>
              <input
                className="input auftrag__feld"
                value={termin}
                onChange={(e) => setTermin(e.target.value)}
                placeholder="z. B. Ende Oktober 2026"
              />
            </label>
          )}
        </div>
        <label className="field">
          <span className="field__label">Bemerkung an den Produzenten (freiwillig)</span>
          <textarea className="input" rows={2} value={bemerkung} onChange={(e) => setBemerkung(e.target.value)} />
        </label>
        <div className="auftrag__schritte">
          <button type="button" className="btn" onClick={() => window.print()} disabled={auftrag.luecken.length > 0}>
            Drucken / als PDF sichern
          </button>
          <button type="button" className="btn btn--quiet" onClick={onZurueck}>
            Zurück zur Liste
          </button>
        </div>

        {/*
          Kein Auftrag mit einer Annahme darin. Eine Lieferung aus der Tuerkei,
          die nicht passt, kostet Wochen – diese Meldung kostet fuenf Minuten.
        */}
        {auftrag.luecken.length > 0 && (
          <div className="auftrag__luecken">
            <strong>So kann der Auftrag nicht raus – es fehlen Angaben:</strong>
            <ul>
              {auftrag.luecken.map((l, i) => (
                <li key={i}>
                  <code>{l.kennung}</code>, {l.netz}: {l.fehlt.join(', ')}
                </li>
              ))}
            </ul>
            <p>Die Angaben stehen im Netz-Editor der jeweiligen Bestellung. Danach hier nochmals aufrufen.</p>
          </div>
        )}
      </div>

      {/* Ab hier das Dokument, das gedruckt wird. Querformat. */}
      <article className="blatt">
        <header className="blatt__kopf">
          <address className="blatt__absender">
            <strong>{ABSENDER.firma}</strong>
            <span>{ABSENDER.person}</span>
            <span>{ABSENDER.strasse}</span>
            <span>
              {ABSENDER.ort} ({ABSENDER.land.deutsch})
            </span>
          </address>
          <div className="blatt__rechts">
            <h1>{art === 'anfrage' ? 'Preisanfrage' : 'Bestellung'}</h1>
            <p className="blatt__zeile">
              {nummer && <strong>{nummer} · </strong>}
              {heute}
            </p>
          </div>
        </header>

        <section className="blatt__regeln">
          <p>
            <strong>{MASSREGEL.deutsch}</strong>
          </p>
          <p>{RICHTUNGSREGEL.deutsch}</p>
        </section>

        <section className="blatt__termin">
          {art === 'anfrage' ? (
            <p>
              Ungefährer Liefertermin: <span className="blatt__leer" />
            </p>
          ) : (
            <p>
              Erwarteter Liefertermin: <strong>{termin || '—'}</strong>
            </p>
          )}
        </section>

        {bemerkung && <p className="blatt__bemerkung">{bemerkung}</p>}

        <section>
          <h2>
            {auftrag.anzahl} {auftrag.anzahl === 1 ? 'Plissee' : 'Plissees'} · jede Zeile ist ein Stück
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
                <th className="blatt__eng">Nr.</th>
                <th>Paket</th>
                <th>Fenster</th>
                <th className="blatt__eng">Breite</th>
                <th className="blatt__eng">Höhe</th>
                <th>Rahmendicke</th>
                <th>Rahmen</th>
                <th>Netz</th>
                <th>Mechanismus</th>
                <th>Öffnungsrichtung</th>
                {/*
                  Der Preis wird NIE gedruckt, auch nicht auf der Bestellung.
                  Er ist veraenderlich – bei groesseren Mengen guenstiger – und
                  wird beim Produzenten ausgehandelt. Eine gedruckte Zahl waere
                  entweder falsch oder eine Behauptung.
                */}
                <th className="blatt__preis">Stückpreis</th>
              </tr>
            </thead>
            <tbody>
              {auftrag.zeilen.map((z) => {
                const w = netzZeile(z)
                return (
                  <tr key={z.nummer}>
                    <td className="blatt__zahl">{z.nummer}</td>
                    <td className="blatt__paketzelle">{z.kennung}</td>
                    <td className="blatt__raum">{z.bezeichnung}</td>
                    <td className="blatt__zahl">{w.breite}</td>
                    <td className="blatt__zahl">{w.hoehe}</td>
                    <td>{w.dicke}</td>
                    <td>{w.rahmen}</td>
                    <td>{w.netz}</td>
                    <td>{w.mechanismus}</td>
                    <td>{w.oeffnung}</td>
                    <td className="blatt__preis blatt__leer-feld" />
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="blatt__hinweis">Alle Masse in Zentimetern, Breite × Höhe. {PREISHINWEIS.deutsch}</p>
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
          <h2>Pakete · bitte getrennt verpacken und beschriften</h2>
          <table className="blatt__tabelle blatt__tabelle--handschrift blatt__paketliste">
            <thead>
              <tr>
                <th>Paket</th>
                <th className="blatt__eng">Stück</th>
                <th className="blatt__preis">{LIEFERKOSTEN.deutsch}</th>
              </tr>
            </thead>
            <tbody>
              {auftrag.bloecke.map((block) => (
                <tr key={block.bestellung.id}>
                  <td>
                    <span className="blatt__kennung">{block.kennung}</span>
                  </td>
                  <td className="blatt__zahl">{block.anzahl}</td>
                  <td className="blatt__preis blatt__leer-feld" />
                </tr>
              ))}
              <tr className="blatt__gesamt">
                <td>{GANZE_LIEFERUNG.deutsch}</td>
                <td className="blatt__zahl">{auftrag.anzahl}</td>
                <td className="blatt__preis blatt__leer-feld" />
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="blatt__fuss">
          <p>
            Fragen an {operator.people[0].name}, {operator.email}
            {operator.phone ? ` · ${operator.phone}` : ''}
          </p>
        </footer>
      </article>
    </>
  )
}
