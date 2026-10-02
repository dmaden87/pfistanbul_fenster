/** Prueft das ausgelieferte HTML: Kopfangaben, JSON-LD, Sitemap, robots.txt. */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { windowTypes, netSets, activeUeberbauung } from '../src/data/catalog.ts'
import { raumbeispiele } from '../src/data/beispiele.ts'
import { estimateNetChf } from '../src/lib/estimate.ts'
import { absolut, seiten, site, startseite, unterseiten } from '../src/data/site.ts'
import { operator } from '../src/data/operator.ts'
import { shopConfig } from '../src/data/shopConfig.ts'

const html = readFileSync('dist/index.html', 'utf8')
const pruefungen = []
const pruefe = (name, ok, zusatz = '') => pruefungen.push({ name, ok, zusatz })

// --- Kopfangaben ---
//
// Adressen kommen aus site.ts und stehen hier NICHT nochmals als Text. Beim
// Wechsel auf die eigene Domain waren genau diese beiden Zeilen die letzten,
// die noch auf die alte Adresse zeigten - gefunden hat sie diese Pruefung
// selbst, aber eine Suche im Quelltext hatte sie uebersehen, weil die
// Adresse in einem regulaeren Ausdruck maskiert war.
for (const [name, teil] of [
  ['canonical', `<link rel="canonical" href="${absolut('/')}">`],
  ['og:title', 'property="og:title"'],
  ['og:description', 'property="og:description"'],
  ['og:url', `property="og:url" content="${absolut('/')}"`],
  ['og:image', `property="og:image" content="${absolut(site.vorschaubild)}"`],
  ['og:image:width 1200', 'property="og:image:width" content="1200"'],
  ['og:locale de_CH', 'property="og:locale" content="de_CH"'],
  ['twitter:card', 'name="twitter:card" content="summary_large_image"'],
]) pruefe(name, html.includes(teil), teil)

// --- JSON-LD ---
const roh = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1]
pruefe('JSON-LD vorhanden', Boolean(roh))
const daten = JSON.parse(roh)
const graph = daten['@graph']
pruefe('@context ist schema.org', daten['@context'] === 'https://schema.org')

const nachId = new Map(graph.filter((k) => k['@id']).map((k) => [k['@id'], k]))
// Jeder Verweis muss auf einen Knoten zeigen, den es gibt.
const offen = []
const wandern = (wert, weg) => {
  if (Array.isArray(wert)) return wert.forEach((w, i) => wandern(w, `${weg}[${i}]`))
  if (wert && typeof wert === 'object') {
    const schluessel = Object.keys(wert)
    if (schluessel.length === 1 && schluessel[0] === '@id' && !nachId.has(wert['@id'])) offen.push(`${weg} -> ${wert['@id']}`)
    for (const [k, v] of Object.entries(wert)) if (k !== '@id') wandern(v, `${weg}.${k}`)
  }
}
graph.forEach((k, i) => wandern(k, k['@type'] ?? `#${i}`))
pruefe('alle Verweise treffen einen Knoten', offen.length === 0, offen.join(', '))

const produkte = graph.filter((k) => k['@type'] === 'Product')
pruefe('sechs Produkte', produkte.length === 6, String(produkte.length))

// Preise gegen den Katalog
const erwartet = new Map([
  ...windowTypes.map((t) => [`Insektenschutz-Plissee ${t.label}`, t.priceChf]),
  ...netSets.map((s) => [`Insektenschutz-Plissee ${s.label}`, s.priceChf]),
])
const falsch = produkte.filter((p) => Number(p.offers.price) !== erwartet.get(p.name))
pruefe('Preise stimmen mit dem Katalog', falsch.length === 0, falsch.map((p) => p.name).join(', '))
pruefe('alle Preise in CHF', produkte.every((p) => p.offers.priceCurrency === 'CHF'))
pruefe('keine MwSt-Behauptung', !JSON.stringify(graph).includes('valueAddedTaxIncluded'))
// Nie "InStock": Wir haben kein Lager, jedes Netz wird auf Bestellung
// gefertigt. Im Normalbetrieb "BackOrder" (bestellbar, Lieferung folgt),
// davor "PreOrder".
const erwarteteLage = shopConfig.operational ? '/BackOrder' : '/PreOrder'
pruefe(
  `Verfuegbarkeit ist ${erwarteteLage.slice(1)}`,
  produkte.every((p) => p.offers.availability.endsWith(erwarteteLage)),
  produkte[0]?.offers?.availability,
)
pruefe('nirgends "auf Lager" behauptet', !JSON.stringify(graph).includes('/InStock'))
pruefe('Ruecknahme 14 Tage', produkte.every((p) => p.offers.hasMerchantReturnPolicy.merchantReturnDays === 14))
pruefe('Garantie 2 Jahre', produkte.every((p) => p.offers.warranty.durationOfWarranty.value === 2))

// Google verlangt fuer Haendlereintraege ein Bild und eine Marke als eigenes
// Objekt. Beides fehlte zuerst - die Search Console meldete "Feld image fehlt"
// und "Ungueltiger Objekttyp fuer Feld brand".
pruefe('jedes Produkt hat Bilder', produkte.every((p) => Array.isArray(p.image) && p.image.length > 0))
pruefe(
  'Bildadressen sind absolut und zeigen auf vorhandene Fotos',
  produkte.every((p) => p.image.every((b) => b.startsWith(absolut('/fotos/')) && existsSync(`public${new URL(b).pathname}`))),
)
pruefe('Marke ist ein eigenes Objekt, kein Verweis', produkte.every((p) => p.brand?.['@type'] === 'Brand'))
pruefe('jedes Produkt hat eine Artikelnummer', produkte.every((p) => typeof p.sku === 'string' && p.sku.length > 3))
pruefe('keine erfundenen Bewertungen', !JSON.stringify(graph).includes('aggregateRating'))

const org = graph.find((k) => k['@type'] === 'Organization')
// Aus operator.ts gelesen, nicht abgetippt: Beim Wechsel der Mailadresse war
// diese Zeile die einzige, die noch die alte kannte.
pruefe(
  'Impressumsangaben stimmen mit operator.ts ueberein',
  org.email === operator.email && org.address.postalCode === operator.people[0].zip,
  `${org.email} / ${org.address.postalCode}`,
)
// Es darf genau EINE Mailadresse ausgeliefert werden. Beim Wechsel auf die
// eigene Domain waere eine uebersehene Stelle still geblieben - Kundschaft
// haette an ein Postfach geschrieben, das niemand mehr liest.
const alleSeiten = ['index', 'impressum', 'agb', 'datenschutz']
  .map((n) => readFileSync(`dist/${n}.html`, 'utf8'))
  .join('\n')
const adressen = [...new Set(alleSeiten.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [])]
pruefe(
  'nur die eine Mailadresse im ganzen Ergebnis',
  adressen.length === 1 && adressen[0] === operator.email,
  adressen.join(', ') || '(keine)',
)

pruefe('Mailadresse steht als Text im Impressum', readFileSync('dist/impressum.html', 'utf8').includes(operator.email))
pruefe(
  'Instagram-Profil als sameAs verknuepft',
  Array.isArray(org.sameAs) && org.sameAs.includes(operator.instagram),
  JSON.stringify(org.sameAs),
)
pruefe('Instagram-Link steht auch sichtbar auf der Seite', html.includes(operator.instagram))
pruefe('beide Gruender genannt', org.founder.length === 2)
const fragen = graph.find((k) => k['@type'] === 'FAQPage')
pruefe('elf Fragen mit Antwort', fragen.mainEntity.length === 11 && fragen.mainEntity.every((f) => f.acceptedAnswer.text.length > 40))

// --- Sitemap und robots ---
const sitemap = readFileSync('dist/sitemap.xml', 'utf8')
/*
 * Die erwartete Zahl kommt aus `seiten` und wird nicht mehr von Hand
 * zusammengezaehlt. Vorher stand hier "1 + rechtsseiten.length"; als die
 * Siedlungsseite dazukam, haette diese Pruefung eine richtige Sitemap als
 * falsch gemeldet.
 */
pruefe(`Sitemap nennt ${seiten.length} Adressen`, (sitemap.match(/<loc>/g) ?? []).length === seiten.length)
for (const seite of unterseiten) {
  pruefe(`Sitemap kennt ${seite.pfad}`, sitemap.includes(`<loc>${absolut(seite.pfad)}</loc>`))
}
pruefe('Sitemap ohne erfundenes lastmod', !sitemap.includes('lastmod'))
const robots = readFileSync('dist/robots.txt', 'utf8')
pruefe('robots.txt sperrt niemanden aus', /User-agent: \*\nAllow: \//.test(robots))
pruefe('robots.txt schuetzt /api/', robots.includes('Disallow: /api/'))
pruefe('robots.txt zeigt auf die Sitemap', robots.includes(absolut('/sitemap.xml')))

// --- Vorgerenderte Seiten ---------------------------------------------------
//
// Ohne sie waere die Seite fuer Crawler wieder das, was sie vorher war: ein
// Kilobyte mit einem leeren <div>. Geprueft wird deshalb nicht nur, DASS die
// Dateien da sind, sondern dass jede ihren eigenen Kopf traegt und wirklich
// Text enthaelt.
const bundeldateien = (t) => [...t.matchAll(/\/assets\/[A-Za-z0-9._-]+/g)].map((m) => m[0]).sort().join('|')
const nurText = (t) => t.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

const startText = nurText(html)
pruefe('Startseite traegt echten Text', startText.split(' ').length > 2500, `${startText.split(' ').length} Woerter`)
pruefe('Startseite nennt einen Preis im Text', startText.includes('130'))

/*
 * DER UMBAU, ALS PRUEFUNG.
 *
 * Sondermass ist der Standard, die Siedlung das Nebenangebot. Das ist eine
 * Aussage ueber die Reihenfolge, und nur die laesst sich pruefen: Der Aufruf
 * zum Ausrechnen muss VOR dem Namen der Ueberbauung stehen. Wer das eines
 * Tages umstellt, soll es absichtlich tun und nicht aus Versehen.
 *
 * Der Verweis auf /siedlungen muss ein echtes <a href> sein, in Kopf und
 * Fuss. Ein Knopf, der die Adresse nur im Browser wechselt, ist fuer einen
 * Crawler nicht vorhanden - und die Adresse soll auf Flyer gedruckt werden.
 */
pruefe(
  'Startseite fuehrt mit Sondermass, nicht mit der Siedlung',
  startText.indexOf('ausrechnen') < startText.indexOf(activeUeberbauung.name),
  `ausrechnen bei ${startText.indexOf('ausrechnen')}, ${activeUeberbauung.name} bei ${startText.indexOf(activeUeberbauung.name)}`,
)
/*
 * DER BEISPIELRECHNER steht vorgerendert auf der Seite, mit Preis. Das ist
 * mehr als Kosmetik: Wer ohne Javascript ankommt - ein Crawler, ein
 * Textbrowser, jemand mit blockierten Skripten -, sieht die vier Raeume und
 * vier Zahlen und nicht vier leere Kaesten. Geprueft wird gegen dieselbe
 * Funktion, die der Rechner benutzt; eine zweite Preisliste faellt damit auf.
 */
/*
 * Die Beispielfelder werden am Anfang des naechsten aufgetrennt, nicht mit
 * einem Ausdruck fuer "bis zum schliessenden div". Ein Feld enthaelt weitere
 * divs; ein nicht-gieriger Ausdruck endet dann am ersten inneren Schluss und
 * schneidet genau das weg, was geprueft werden soll.
 */
const anfaenge = [...html.matchAll(/<div([^>]*class="rechner__held")>/g)]
const felder = anfaenge.map((m, i) => {
  const von = m.index + m[0].length
  const bis = i + 1 < anfaenge.length ? anfaenge[i + 1].index : html.indexOf('rechner__hinweis', von)
  const roh = html.slice(von, bis)
  return {
    kopf: m[1],
    text: nurText(roh),
    /* Die Masse stehen im value-Attribut des Eingabefelds und nicht im Text -
       nurText wirft sie mit den Tags weg. */
    werte: [...roh.matchAll(/value="([^"]*)"/g)].map((v) => v[1]),
  }
})
pruefe(`Rechner hat ${raumbeispiele.length} Beispiele`, felder.length === raumbeispiele.length, String(felder.length))
/*
 * Eines sichtbar, drei versteckt. Beide Haelften zaehlen: Faellt `hidden`
 * weg, stehen vier Beispiele uebereinander auf der Seite, bis Javascript
 * laedt. Verschwinden die drei ganz aus dem HTML, sieht ein Crawler nur noch
 * ein Fenster statt vier.
 */
pruefe(
  'genau ein Beispiel ist offen, die anderen stehen versteckt im HTML',
  felder.filter((f) => !f.kopf.includes('hidden')).length === 1,
  `${felder.filter((f) => !f.kopf.includes('hidden')).length} offen von ${felder.length}`,
)
raumbeispiele.forEach((beispiel, i) => {
  const karte = felder[i] ?? { text: '', werte: [] }
  const preis = estimateNetChf((beispiel.breiteCm / 100) * (beispiel.hoeheCm / 100))
  /*
   * Je Karte geprueft, nicht gegen die ganze Seite: Bad und Kueche kommen
   * beide auf denselben Betrag. Eine Suche ueber das ganze Dokument wuerde
   * auch dann noch gruen melden, wenn eine Karte ihren Preis verloren hat.
   */
  pruefe(
    `Rechner zeigt ${beispiel.bauart} (${beispiel.raumKurz}) mit Mass und Richtpreis`,
    karte.text.includes(beispiel.bauart) &&
      karte.text.includes(beispiel.raum) &&
      karte.text.includes(preis.toFixed(2)) &&
      karte.werte.includes(String(beispiel.breiteCm)) &&
      karte.werte.includes(String(beispiel.hoeheCm)),
    `${beispiel.breiteCm}x${beispiel.hoeheCm}, ${preis.toFixed(2)}`,
  )
})

/*
 * Die Balken nennen Bauart und Raumbeispiel. Der Preis gehoert NICHT hinein:
 * Er steht im Richtwert darueber und gross im Beispiel selbst - dreimal
 * dieselbe Zahl macht sie nicht wichtiger, und wer sie wieder einbaut, soll
 * es absichtlich tun.
 */
const balkenText = [...html.matchAll(/<button[^>]*class="rechner__balken[^"]*"[\s\S]*?<\/button>/g)].map((m) =>
  nurText(m[0]),
)
pruefe(`Rechner hat ${raumbeispiele.length} Balken`, balkenText.length === raumbeispiele.length, String(balkenText.length))
raumbeispiele.forEach((beispiel, i) => {
  const balken = balkenText[i] ?? ''
  pruefe(
    `Balken ${beispiel.bauart} nennt die Bauart und das Beispiel, ohne Preis`,
    balken.includes(beispiel.bauart) && balken.includes(beispiel.raumKurz) && !/CHF/.test(balken),
    balken,
  )
})

pruefe(
  'Startseite verlinkt /siedlungen in Kopf und Fuss',
  (html.match(/href="\/siedlungen"/g) ?? []).length >= 2,
  String((html.match(/href="\/siedlungen"/g) ?? []).length),
)

/*
 * Die Schleife laeuft ueber ALLE Unterseiten, nicht mehr nur die rechtlichen.
 * Die Siedlungsseite muss dieselben Zusicherungen erfuellen - eigener Titel,
 * eigenes canonical, echter Text -, denn sie ist die Adresse, die auf Flyer
 * gedruckt wird. Die Produktdaten liegen weiterhin nur auf der Startseite;
 * das Sortiment auf /siedlungen ist derselbe Warenkorb, aber ohne eigenen
 * Markup-Graphen - sonst stuenden dieselben Produkte zweimal im Index.
 */
for (const seite of unterseiten) {
  const datei = `dist${seite.pfad}.html`
  let inhalt
  try {
    inhalt = readFileSync(datei, 'utf8')
  } catch {
    pruefe(`${seite.pfad} ist vorgerendert`, false, 'Datei fehlt')
    continue
  }
  const text = nurText(inhalt)
  pruefe(`${seite.pfad} ist vorgerendert`, true)
  pruefe(`${seite.pfad} hat einen eigenen Titel`, inhalt.includes(`<title>${seite.titel}</title>`))
  pruefe(`${seite.pfad} zeigt auf sich selbst (canonical)`, inhalt.includes(`href="${absolut(seite.pfad)}"`))
  pruefe(`${seite.pfad} traegt echten Text`, text.split(' ').length > 150, `${text.split(' ').length} Woerter`)
  pruefe(`${seite.pfad} nutzt dieselben Bundle-Dateien`, bundeldateien(inhalt) === bundeldateien(html))

  const graph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(inhalt)[1])['@graph']
  const typen = new Set(graph.map((k) => k['@type']))
  pruefe(`${seite.pfad} ohne Produktdaten`, !typen.has('Product') && !typen.has('FAQPage'), [...typen].join(', '))
  pruefe(`${seite.pfad} nennt die Organisation`, typen.has('Organization'))
}

// --- IndexNow ---------------------------------------------------------------
//
// Der Schluessel weist uns gegenueber Bing und Yandex als Betreiber aus. Liegt
// die Datei nicht im ausgelieferten Ergebnis oder stimmt ihr Inhalt nicht mit
// dem Dateinamen ueberein, werden Meldungen still abgelehnt.
const schluesseldateien = readdirSync('dist').filter((name) => /^[0-9a-f]{32}\.txt$/.test(name))
pruefe('genau eine IndexNow-Schluesseldatei', schluesseldateien.length === 1, `${schluesseldateien.length} gefunden`)
if (schluesseldateien.length === 1) {
  const name = schluesseldateien[0]
  pruefe(
    'Schluesseldatei enthaelt ihren eigenen Namen',
    readFileSync(`dist/${name}`, 'utf8').trim() === name.replace('.txt', ''),
  )
}

pruefe('Startseite behaelt ihren Titel', html.includes(`<title>${startseite.titel}</title>`))

for (const p of pruefungen) console.log(`${p.ok ? 'ok  ' : 'FEHL'}  ${p.name}${p.ok ? '' : '   -> ' + p.zusatz}`)
console.log(`\n${pruefungen.filter((p) => p.ok).length}/${pruefungen.length} bestanden`)
process.exit(pruefungen.every((p) => p.ok) ? 0 : 1)
