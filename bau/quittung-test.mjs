/**
 * Prueft die Quittung ueber einen bezahlten Auftrag.
 *
 * DER KERN IST EINE EINZIGE AUSSAGE: Was auf der Quittung als erhalten
 * dasteht, muss das sein, was die Kundin bezahlt hat - `summeChf`. Eine
 * Quittung ist eine schriftliche Behauptung ueber Geld. Weicht sie ab, ist
 * sie kein Schoenheitsfehler, sondern ein falscher Beleg, und zwar einer mit
 * unserem Namen drauf.
 *
 * Die Gefahr ist nicht theoretisch: Die Betraege werden aus mehreren Feldern
 * zusammengesetzt (Netze, Anfahrt, Montage, Rabatt), und jedes davon kennt
 * Sonderfaelle - Anfahrt aktiv mit null, Montage als Haken ohne Betrag,
 * Rabatt mit eigenem Wort. Hier wird jeder davon gegen die Summe gehalten,
 * die der Server gerechnet hat.
 */
import { readFileSync } from 'node:fs'
import { quittungPosten, quittungZahlart } from '../src/components/admin/hilfen.ts'
import { abgeschlossen } from '../src/lib/phasen.ts'
import { demoSaat } from '../api/_demo.ts'
import { shopConfig } from '../src/data/shopConfig.ts'

let gut = 0
let schlecht = 0
function pruefe(name, bedingung, hinweis = '') {
  if (bedingung) { gut += 1; console.log(`ok    ${name}`) }
  else { schlecht += 1; console.log(`FEHL  ${name}${hinweis ? ' – ' + hinweis : ''}`) }
}

const ANSATZ = shopConfig.montageChf

/* --- Gegen die echten Demodaten -------------------------------------------- */

const alle = demoSaat()
const fertige = alle.filter(abgeschlossen)

pruefe('Es gibt abgeschlossene Auftraege zum Pruefen', fertige.length >= 3, `${fertige.length}`)

for (const b of fertige) {
  const { totalChf } = quittungPosten(b, ANSATZ)
  pruefe(
    `${b.referenz}: die Quittung nennt genau den bezahlten Betrag`,
    Math.abs(totalChf - b.summeChf) < 0.005,
    `Quittung ${totalChf}, bezahlt ${b.summeChf}`,
  )
}

/*
 * UND NUR FUER DIESE GIBT ES SIE. Eine Quittung ueber Geld, das noch nicht
 * da ist, waere eine Falschaussage - deshalb haengt der Knopf an derselben
 * Bedingung wie die Bitte um eine Bewertung.
 */
for (const b of alle.filter((x) => !abgeschlossen(x))) {
  pruefe(
    `${b.referenz}: noch keine Quittung, solange nicht uebergeben und bezahlt`,
    !abgeschlossen(b),
  )
}

/* --- Die Sonderfaelle der einzelnen Posten --------------------------------- */

const netz = (preis, menge = 1) => ({ id: 'n', bezeichnung: 'Zimmer', preisChf: preis, menge })

/*
 * DIE VORLAGE RECHNET IHRE SUMME SELBST. Mein erster Anlauf schrieb
 * summeChf von Hand daneben - und damit pruefte der Test eine Bestellung,
 * die es so nie gibt: 150 Franken Netze, 20 Rabatt und trotzdem 150 Summe.
 * Der Rueckschluss auf die Montage fand dann 20 Franken, die niemand
 * verlangt hatte, und der Test zeigte rot auf eine Zeile, die stimmte.
 */
const auftrag = (mehr = {}) => {
  const b = {
    referenz: 'PF-T001', status: 'ausliefern',
    ausgeliefertAm: '2026-09-01', bezahltAm: '2026-09-01',
    positionen: [netz(150)], preiseFestgelegtAm: '2026-08-20',
    ...mehr,
  }
  const netze = b.positionen.reduce((s, p) => s + p.preisChf * p.menge, 0)
  const anfahrt = b.anfahrt === true ? (b.anfahrtChf ?? 0) : 0
  b.summeChf = Math.round((netze + (b.montageChf ?? 0) + anfahrt - (b.rabattChf ?? 0)) * 100) / 100
  return b
}

pruefe('Zwei gleiche Netze zaehlen doppelt',
  quittungPosten(auftrag({ positionen: [netz(150, 2)] }), ANSATZ).totalChf === 300)

pruefe('Der Rabatt zieht ab',
  quittungPosten(auftrag({ rabatt: true, rabattChf: 20 }), ANSATZ).totalChf === 130)

/* Und bei jeder Vorlage gilt dieselbe Aussage wie bei den echten Daten. */
for (const [was, b] of [
  ['schlicht', auftrag()],
  ['mit Rabatt', auftrag({ rabatt: true, rabattChf: 20 })],
  ['mit gratis Anfahrt', auftrag({ anfahrt: true, anfahrtChf: 0 })],
  ['mit Anfahrt-Pauschale', auftrag({ anfahrt: true, anfahrtChf: 40 })],
  ['mit Montage', auftrag({ montage: true, montageChf: 45 })],
  ['mit allem', auftrag({ montage: true, montageChf: 30, anfahrt: true, anfahrtChf: 40, rabatt: true, rabattChf: 10 })],
]) {
  pruefe(`Vorlage ${was}: Quittung und bezahlte Summe stimmen ueberein`,
    Math.abs(quittungPosten(b, ANSATZ).totalChf - b.summeChf) < 0.005,
    `${quittungPosten(b, ANSATZ).totalChf} vs ${b.summeChf}`)
}

/*
 * ANFAHRT AKTIV MIT NULL IST ETWAS ANDERES ALS KEINE ANFAHRT. Das eine sagt
 * der Kundin "kostenlos" und steht als Posten da, das andere steht gar
 * nicht. Am Total aendert beides nichts - aber die Quittung muss den Posten
 * zeigen, sonst fehlt auf dem Beleg eine Leistung, die erbracht wurde.
 */
const gratisAnfahrt = quittungPosten(auftrag({ anfahrt: true, anfahrtChf: 0 }), ANSATZ)
pruefe('Kostenlose Anfahrt steht als Posten, ohne das Total zu aendern',
  gratisAnfahrt.mitAnfahrt === true && gratisAnfahrt.totalChf === 150)
pruefe('Ohne Anfahrt gibt es den Posten nicht',
  quittungPosten(auftrag({}), ANSATZ).mitAnfahrt === false)
pruefe('Die Anfahrt-Pauschale kommt dazu',
  quittungPosten(auftrag({ anfahrt: true, anfahrtChf: 40 }), ANSATZ).totalChf === 190)

/*
 * DER ZWILLING. montageBetrag() steht zweimal da - in
 * src/components/admin/hilfen.ts und in api/bestellungen.ts -, weil api/
 * nicht aus src/ importieren darf. Genau so ist die Anfahrt einmal zur
 * Montage geworden: Der Server zog beim Anfahrt-Umbau nach, der Browser
 * nicht, und niemand sah es, weil beide fuer sich schluessig blieben.
 *
 * Die Formel hier abzuschreiben waere eine dritte Kopie und damit dieselbe
 * Falle. Stattdessen werden die beiden Zeilen im Quelltext verglichen: Wer
 * eine aendert und die andere vergisst, bekommt diesen Test rot.
 */
const formel = (datei) => {
  const text = readFileSync(new URL(`../${datei}`, import.meta.url), 'utf8')
  const treffer = text.match(/const rest = b\.summeChf[^\n]*/)
  return treffer ? treffer[0].trim() : null
}
const imBrowser = formel('src/components/admin/hilfen.ts')
const imServer = formel('api/bestellungen.ts')

pruefe('Die Montage-Herleitung steht im Browser', imBrowser !== null)
pruefe('Die Montage-Herleitung steht auf dem Server', imServer !== null)
pruefe('Und beide lauten gleich', imBrowser === imServer, `${imBrowser} | ${imServer}`)
pruefe('Sie zieht die Anfahrt ab - sonst heisst die Anfahrt "Montage"',
  imBrowser !== null && imBrowser.includes('anfahrtChf'), imBrowser ?? '')

pruefe('Die Montage kommt mit ihrem Betrag aus dem Auftrag',
  quittungPosten(auftrag({ montage: true, montageChf: 45 }), ANSATZ).totalChf === 195)

/*
 * EIN FESTGELEGTES ANGEBOT MIT NULL MONTAGE HEISST "INBEGRIFFEN". Die
 * Quittung darf dann keine fuenfzehn Franken je Netz erfinden - dasselbe
 * Riegel wie bei der Offerte.
 */
pruefe('Montage-Haken ohne Betrag erfindet nichts, wenn der Preis festgelegt ist',
  quittungPosten(auftrag({ montage: true }), ANSATZ).montageChf === 0)

/* Alles zusammen, so wie es auf einem echten Beleg vorkommt. */
const voll = quittungPosten(
  auftrag({ positionen: [netz(150), netz(130)], montage: true, montageChf: 30,
            anfahrt: true, anfahrtChf: 0, rabatt: true, rabattChf: 10, summeChf: 300 }),
  ANSATZ,
)
pruefe('Netze, Montage, gratis Anfahrt und Rabatt ergeben zusammen das Total',
  voll.totalChf === 300, String(voll.totalChf))

/* --- Wie die Zahlung benannt wird ------------------------------------------ */

pruefe('Bei der Uebergabe steht genau das',
  quittungZahlart(auftrag({ zahlung: 'uebergabe' })) === 'Bei der Übergabe bezahlt')
pruefe('Eine Onlinezahlung steht als solche da',
  quittungZahlart(auftrag({ zahlung: 'online' })) === 'Online bezahlt (Karte oder Twint)')
/*
 * KEINE ERFUNDENE ZAHLUNGSART. Ob bar oder mit Twint bezahlt wurde, steht
 * nirgends im Datensatz - also darf es auch auf keinem Beleg stehen.
 */
pruefe('Der Beleg behauptet nie "bar"',
  !['uebergabe', 'online'].some((z) => /\bbar\b/i.test(quittungZahlart(auftrag({ zahlung: z })))))

console.log(`\n${gut}/${gut + schlecht} bestanden`)
if (schlecht > 0) process.exit(1)
