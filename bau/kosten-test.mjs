/**
 * Prueft den Kostenrechner gegen Boras echte Preise.
 *
 * DIE SIEBEN MESSPUNKTE SIND DIE QUELLE. Kommen neue Preise, gehoeren sie
 * hier hinein – und wenn die Formel sie nicht mehr trifft, geht dieser Test
 * rot, bevor jemand mit falschen Margen rechnet.
 */
import { umfangM, herstellungEur, herstellungChf, herstellungFuer, einfuhrsteuerChf } from '../src/lib/kosten.ts'
import { kostenConfig } from '../src/data/kostenConfig.ts'

let gut = 0
let schlecht = 0
function pruefe(name, bedingung, hinweis = '') {
  if (bedingung) { gut += 1; console.log(`ok    ${name}`) }
  else { schlecht += 1; console.log(`FEHL  ${name}${hinweis ? ' – ' + hinweis : ''}`) }
}

/* Breite cm, Hoehe cm, Preis EUR – von Bora, Oktober 2026. */
const MESSPUNKTE = [
  [68, 203, 36], [128, 182, 42], [128, 96, 30], [64, 96, 22],
  [160.5, 122, 37], [117, 82, 27], [72, 122, 27],
]

/*
 * DIE TOLERANZ IST DAS EIGENTLICHE VERSPRECHEN. Eine Formel, die "ungefaehr"
 * stimmt, ist wertlos, wenn niemand sagt, wie ungefaehr. Groesste gemessene
 * Abweichung war 0.76 EUR; 1.00 laesst etwas Luft, ohne eine schlechtere
 * Formel durchzulassen. Mit dem Flaechenmodell (Abweichung bis 3.94) ginge
 * dieser Test rot – genau so soll es sein.
 */
const TOLERANZ_EUR = 1.0

let groesste = 0
for (const [b, h, preis] of MESSPUNKTE) {
  const gerechnet = herstellungEur(b, h)
  const ab = Math.abs(gerechnet - preis)
  groesste = Math.max(groesste, ab)
  pruefe(`${b} x ${h} kostet ${preis} EUR, gerechnet ${gerechnet.toFixed(2)}`,
    ab <= TOLERANZ_EUR, `${ab.toFixed(2)} EUR daneben`)
}
pruefe(`groesste Abweichung ${groesste.toFixed(2)} EUR bleibt unter ${TOLERANZ_EUR}`, groesste <= TOLERANZ_EUR)

pruefe('Umfang: 100 x 50 sind 3 Meter', umfangM(100, 50) === 3)
pruefe('Sockel allein: ein Netz ohne Groesse kostet nichts', herstellungEur(0, 0) === 0)
pruefe('negative Masse ergeben nichts', herstellungEur(-100, 50) === 0)

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
