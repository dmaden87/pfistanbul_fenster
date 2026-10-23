/**
 * Prueft den Kostenrechner gegen Boras m2-Vereinbarung.
 *
 * HIER STANDEN SIEBEN GEMESSENE PREISE und eine Formel ueber den Umfang,
 * die sie auf 0.37 EUR genau traf. Beides ist abgeloest: Weil Boras Preise
 * von Netz zu Netz uneinheitlich waren - der Satz je Quadratmeter schwankte
 * zwischen 17.90 und 35.81 -, wurde im Oktober 2026 ein fester m2-Preis
 * vereinbart. Die alten Punkte stehen bewusst nicht mehr hier: Sie wuerden
 * die Formel gegen eine Preisliste pruefen, die niemand mehr anwendet, und
 * dieser Test waere rot, obwohl alles stimmt.
 *
 * Geprueft wird jetzt die Vereinbarung selbst - Flaeche mal Satz, der
 * Aufschlag fuer den schmalen Rahmen, und die Rueckfaelle fuer das, was in
 * alten Datensaetzen steht.
 */
import { umfangM, flaecheM2, satzEur, herstellungEur, herstellungChf, herstellungFuer, einfuhrsteuerChf } from '../src/lib/kosten.ts'
import { kostenConfig } from '../src/data/kostenConfig.ts'

let gut = 0
let schlecht = 0
function pruefe(name, bedingung, hinweis = '') {
  if (bedingung) { gut += 1; console.log(`ok    ${name}`) }
  else { schlecht += 1; console.log(`FEHL  ${name}${hinweis ? ' – ' + hinweis : ''}`) }
}

/*
 * BORAS PREISLISTE, STAND OKTOBER 2026. Zwei Zahlen statt sieben Messpunkte
 * - das ist der ganze Unterschied zwischen einer zurueckgerechneten Formel
 * und einer Vereinbarung.
 */
const SATZ = { '1.5': 35, '2.8': 30 }

pruefe('Flaeche: 100 x 50 sind ein halber Quadratmeter', flaecheM2(100, 50) === 0.5)

for (const [dicke, satz] of Object.entries(SATZ)) {
  pruefe(`${dicke}er Rahmen: ein Quadratmeter kostet ${satz} EUR`,
    herstellungEur(100, 100, dicke) === satz, String(herstellungEur(100, 100, dicke)))
  pruefe(`${dicke}er Rahmen: zwei Quadratmeter kosten doppelt`,
    herstellungEur(200, 100, dicke) === satz * 2, String(herstellungEur(200, 100, dicke)))
}

pruefe('Der schmale Rahmen ist teurer als der normale',
  herstellungEur(100, 150, '1.5') > herstellungEur(100, 150, '2.8'))

/*
 * DER RUECKFALL IST KEIN SCHOENHEITSFEHLER. Alteintraege tragen im Feld
 * Rahmendicke freien Text ("3-4 cm", "60 mm"), und es gab damals nur einen
 * Rahmen: den gewoehnlichen. Wer daraus null machte, stellte einen Auftrag
 * ohne Warenkosten in die Marge.
 */
pruefe('Ein Altwert rechnet mit dem Normalsatz',
  herstellungEur(100, 100, '3-4 cm') === SATZ['2.8'])
pruefe('Fehlt die Angabe ganz, ebenso',
  herstellungEur(100, 100) === SATZ['2.8'])
pruefe('Der Satz zu einem unbekannten Wert ist der Normalsatz',
  satzEur('irgendwas') === kostenConfig.proM2StandardEur)

/*
 * ENGMASCHIG KOSTET NOCH NICHT MEHR, weil Bora den Aufschlag erst nennt.
 * Eine geratene Zahl waere schlimmer als Gleichstand: Sie saehe aus wie ein
 * Preis. Wird der Faktor gesetzt, faellt dieser Test auf - und dann gehoert
 * er umgeschrieben, nicht geloescht.
 */
pruefe('Engmaschig rechnet vorerst gleich wie normal',
  herstellungEur(100, 150, '2.8', 'engmaschig') === herstellungEur(100, 150, '2.8', 'normal'),
  `Faktor steht auf ${kostenConfig.engmaschigFaktor}`)

pruefe('Ein Netz ohne Groesse kostet nichts', herstellungEur(0, 0) === 0)
pruefe('negative Masse ergeben nichts', herstellungEur(-100, 50) === 0)

/* Der Umfang geht nicht mehr in den Preis ein, das Mass gibt es aber weiter. */
pruefe('Umfang: 100 x 50 sind 3 Meter', umfangM(100, 50) === 3)

const eur = herstellungEur(100, 100)
pruefe('Franken sind Euro mal Kurs',
  herstellungChf(100, 100) === Math.round(eur * kostenConfig.eurChf * 100) / 100,
  `${herstellungChf(100, 100)} statt ${eur * kostenConfig.eurChf}`)

/* Die Menge zaehlt. Zwei gleiche Netze kosten doppelt. */
const einzeln = herstellungChf(120, 100)
pruefe('zwei gleiche Netze kosten doppelt',
  herstellungFuer([{ bezeichnung: 'x', breiteCm: 120, hoeheCm: 100, menge: 2, preisChf: 0 }]) === Math.round(einzeln * 2 * 100) / 100)

pruefe('eine leere Bestellung kostet nichts', herstellungFuer([]) === 0)

/*
 * EIN NETZ OHNE MASSE DARF NICHT STILL MITZAEHLEN. Es liefert 0, und die
 * Luecke faellt in der Auswertung auf – eine erfundene Zahl taete das nicht.
 */
pruefe('ein Netz ohne Masse liefert nichts',
  herstellungFuer([{ bezeichnung: 'x', breiteCm: 0, hoeheCm: 0, menge: 1, preisChf: 0 }]) === 0)

pruefe('Einfuhrsteuer sind 8,1 Prozent vom Warenwert', einfuhrsteuerChf(1000) === 81)
pruefe('Einfuhrsteuer auf nichts ist nichts', einfuhrsteuerChf(0) === 0)

console.log(`\n${gut}/${gut + schlecht} bestanden`)
if (schlecht > 0) process.exit(1)
