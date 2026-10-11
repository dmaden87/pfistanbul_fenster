/**
 * Prueft die Weiterleitung /bewerten auf die Google-Bewertung.
 *
 * WARUM DAS EIN TEST IST UND KEINE ZEILE IN EINER DATEI: Diese Adresse steht
 * auf gedruckten Karten. Geht sie kaputt, merkt es niemand - der Kunde sieht
 * eine Fehlerseite, sagt nichts, und bewertet nicht. Es gibt keinen Alarm,
 * nur ausbleibende Sterne. Also muss der Bau rot werden, nicht der Kunde.
 *
 * HIER STEHT DIE EINZIGE KOPIE DER GOOGLE-ADRESSE. Alles andere - Karte,
 * Admin, WhatsApp - zeigt auf pfistanbul.ch/bewerten. Zieht Google die
 * Kennung um, ist es eine Zeile in vercel.json und kein Nachdruck.
 */
import { readFileSync } from 'node:fs'
import { whatsappNummer } from '../src/components/admin/hilfen.ts'
import { operator } from '../src/data/operator.ts'
import { abgeschlossen, abschnittFuer } from '../src/lib/phasen.ts'

let gut = 0
let schlecht = 0
function pruefe(name, bedingung, hinweis = '') {
  if (bedingung) { gut += 1; console.log(`ok    ${name}`) }
  else { schlecht += 1; console.log(`FEHL  ${name}${hinweis ? ' – ' + hinweis : ''}`) }
}

const konfig = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
const regeln = konfig.redirects ?? []
const bewerten = regeln.find((r) => r.source === '/bewerten')

pruefe('Es gibt eine Weiterleitung fuer /bewerten', bewerten !== undefined)

if (bewerten) {
  pruefe(
    'Sie zeigt auf eine echte Google-Bewertungsadresse',
    /^https:\/\/(g\.page\/r\/[\w-]+\/review|search\.google\.com\/local\/writereview\?)/.test(bewerten.destination),
    bewerten.destination,
  )
  pruefe(
    'Die Adresse traegt kein Platzhalterwort',
    !/beispiel|muster|xxxx|todo|placeholder/i.test(bewerten.destination),
    bewerten.destination,
  )
  /*
   * NICHT PERMANENT, UND ZWAR ABSICHTLICH. Eine 308 bleibt im Browser des
   * Kunden stehen, oft fuer immer. Wer dann die Google-Kennung wechselt,
   * erreicht genau die Leute nicht mehr, die schon einmal gescannt haben -
   * und das sind die zufriedenen. Der Gewinn dieser Weiterleitung ist, dass
   * sie sich aendern laesst; permanent zu sein wuerde ihn wegwerfen.
   */
  pruefe('Sie ist nicht permanent, damit sie sich spaeter umbiegen laesst', bewerten.permanent === false)
}

/* Saubere Adressen und kein Schraegstrich am Ende - sonst zielt /bewerten daneben. */
pruefe('cleanUrls ist an', konfig.cleanUrls === true)
pruefe('trailingSlash ist aus', konfig.trailingSlash === false)

/* --- Die Nummer fuer WhatsApp ------------------------------------------- */

pruefe('Schweizer Nummer mit Leerzeichen wird international',
  whatsappNummer('079 123 45 67') === '41791234567')
pruefe('Schon internationale Nummer bleibt, wie sie ist',
  whatsappNummer('+41 79 123 45 67') === '41791234567')
pruefe('Doppelnull wird zur Vorwahl', whatsappNummer('0041791234567') === '41791234567')
pruefe('Eine deutsche Nummer wird nicht zur Schweizer',
  whatsappNummer('+49 151 12345678') === '4915112345678')
pruefe('Festnetz mit Bindestrichen geht auch', whatsappNummer('044-123-45-67') === '41441234567')
/*
 * LIEBER KEIN KNOPF ALS EIN FALSCHER. Was sich nicht eindeutig lesen laesst,
 * gibt null - dann zeigt die Karte den Knopf gar nicht erst an, statt eine
 * Nachricht an jemand Fremden vorzubereiten.
 */
pruefe('Zu kurze Nummer gibt nichts', whatsappNummer('079 123') === null)
pruefe('Nummer ohne Null und ohne Vorwahl gibt nichts', whatsappNummer('791234567') === null)
pruefe('Leeres Feld gibt nichts', whatsappNummer('') === null)
pruefe('Fehlendes Feld gibt nichts', whatsappNummer(undefined) === null)

/* --- Die Adresse steht nur an einer Stelle ------------------------------- */

pruefe('Der Admin schickt auf unsere eigene Adresse, nicht zu Google',
  operator.reviewUrl === 'https://pfistanbul.ch/bewerten', operator.reviewUrl)
pruefe('Und genau diese Adresse wird auch weitergeleitet',
  bewerten !== undefined && operator.reviewUrl.endsWith(bewerten.source))

/* --- Wann der Block erscheint ------------------------------------------- */

/*
 * DAS WAR DER FEHLER, DEN KEIN TEST GESEHEN HAT. Die Karte zeigte den Block
 * unter `abschnitt === 'ausliefern' && geliefert && bezahlt` - und genau das
 * gibt es nie: Wer geliefert und bezahlt hat, steht im Archiv, nicht mehr in
 * Ausliefern. Typen und Tests waren zufrieden, der Block waere nie
 * erschienen. Hier steht deshalb die Bedingung selbst.
 */
const auftrag = (mehr) => ({
  status: 'ausliefern', ausgeliefertAm: '2026-10-01', bezahltAm: '2026-10-02', ...mehr,
})

pruefe('Geliefert und bezahlt gilt als abgeschlossen', abgeschlossen(auftrag()))
pruefe('Und steht damit im Archiv', abschnittFuer(auftrag()) === 'archiv')
pruefe('Geliefert, aber nicht bezahlt: noch nicht fragen',
  !abgeschlossen(auftrag({ bezahltAm: undefined })))
pruefe('Bezahlt, aber nicht geliefert: auch nicht',
  !abgeschlossen(auftrag({ ausgeliefertAm: undefined })))
pruefe('Eine abgesagte Bestellung wird nie um eine Bewertung gebeten',
  !abgeschlossen(auftrag({ status: 'abgesagt' })))

console.log(`\n${gut}/${gut + schlecht} bestanden`)
if (schlecht > 0) process.exit(1)
