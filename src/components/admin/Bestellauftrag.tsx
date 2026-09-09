import { useState } from 'react'
import type { Bestellung } from '../../types'
import { auftragAufbauen, type AuftragsNetz } from '../../lib/bestellauftrag'
import { MASSREGEL, MECHANISMEN, NETZFARBEN, OEFFNUNGEN, RAHMENFARBEN, RICHTUNGSREGEL } from '../../data/produktion'
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
          {art === 'bestellung' && (
            <label className="auftrag__termin">
              <span>Erwarteter Liefertermin</span>
              <input className="input auftrag__feld" value={termin} onChange={(e) => setTermin(e.target.value)} placeholder="z. B. Ende Oktober 2026" />
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

      {/* Ab hier das Dokument, das gedruckt wird. */}
      <article className="blatt">
        <header className="blatt__kopf">
          <div>
            <p className="blatt__marke">{operator.businessName}</p>
            <p className="blatt__zeile">
              {operator.people[0].street}, {operator.people[0].zip} {operator.people[0].city} · {operator.email}
            </p>
          </div>
          <div className="blatt__rechts">
            <h1>{art === 'anfrage' ? 'Preisanfrage' : 'Bestellung'}</h1>
            <p className="blatt__zeile">{heute}</p>
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
            Zu fertigen · {auftrag.anzahl} {auftrag.anzahl === 1 ? 'Plissee' : 'Plissees'}
          </h2>
          <table className="blatt__tabelle">
            <thead>
              <tr>
                <th className="blatt__eng">Anz.</th>
                <th className="blatt__eng">Breite</th>
                <th className="blatt__eng">Höhe</th>
                <th>Rahmendicke</th>
                <th>Rahmen</th>
                <th>Netz</th>
                <th>Mechanismus</th>
                <th>Öffnungsrichtung</th>
                {art === 'anfrage' && <th className="blatt__preis">Stückpreis</th>}
              </tr>
            </thead>
            <tbody>
              {auftrag.fertigung.map((n, i) => {
                const z = netzZeile(n)
                return (
                  <tr key={i}>
                    <td className="blatt__zahl">{n.menge} ×</td>
                    <td className="blatt__zahl">{z.breite}</td>
                    <td className="blatt__zahl">{z.hoehe}</td>
                    <td>{z.dicke}</td>
                    <td>{z.rahmen}</td>
                    <td>{z.netz}</td>
                    <td>{z.mechanismus}</td>
                    <td>{z.oeffnung}</td>
                    {art === 'anfrage' && <td className="blatt__preis blatt__leer-feld" />}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="blatt__hinweis">Alle Masse in Zentimetern, Breite × Höhe.</p>
        </section>

        {/*
          Die Pakete. Der Produzent fertigt nach der Tabelle oben und packt
          nach dieser Liste. Die Kennung kommt auf das Paket – ohne sie ist
          bei der Ankunft nicht mehr zu erkennen, welches Netz zu wem gehoert.
        */}
        <section className="blatt__pakete">
          <h2>Pakete · bitte getrennt verpacken und beschriften</h2>
          {auftrag.bloecke.map((block) => (
            <div className="blatt__paket" key={block.bestellung.id}>
              <h3>
                <span className="blatt__kennung">{block.kennung}</span>
                <span className="blatt__anzahl">
                  {block.anzahl} {block.anzahl === 1 ? 'Plissee' : 'Plissees'}
                </span>
              </h3>
              <table className="blatt__tabelle">
                <tbody>
                  {block.netze.map((n, i) => {
                    const z = netzZeile(n)
                    return (
                      <tr key={i}>
                        <td className="blatt__zahl">{n.menge} ×</td>
                        {/*
                          Der Raum steht nur in der Paketliste, nicht in der
                          Fertigungstabelle: Der Produzent fertigt nach Mass,
                          wir packen nach Raum aus. Ohne diese Spalte waere
                          bei der Ankunft nicht mehr zu erkennen, welches der
                          drei gleich grossen Netze ins Schlafzimmer gehoert.
                        */}
                        <td className="blatt__raum">{n.bezeichnung}</td>
                        <td className="blatt__zahl">{z.breite}</td>
                        <td className="blatt__zahl">{z.hoehe}</td>
                        <td>{z.dicke}</td>
                        <td>{z.rahmen}</td>
                        <td>{z.netz}</td>
                        <td>{z.mechanismus}</td>
                        <td>{z.oeffnung}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
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
