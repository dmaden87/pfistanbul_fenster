/** Prueft das ausgelieferte HTML: Kopfangaben, JSON-LD, Sitemap, robots.txt. */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { windowTypes, netSets, activeUeberbauung } from '../src/data/catalog.ts'
import { raumbeispiele } from '../src/data/beispiele.ts'
import { estimateNetChf } from '../src/lib/estimate.ts'
import { absolut, seiten, site, startseite, unterseiten } from '../src/data/site.ts'
import { operator } from '../src/data/operator.ts'
import { preisHinweis, preisHinweisKurz, richtpreisHinweisKurz, shopConfig } from '../src/data/shopConfig.ts'

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
  const preis = estimateNetChf(beispiel.breiteCm, beispiel.hoeheCm)
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

// --- Woraus sich ein Preis zusammensetzt -------------------------------------
//
// Netz, Montage, Anfahrt - immer dieselben drei Teile. Die Aussage stand
// einmal an sechs Stellen im Wortlaut und war an vieren veraltet: "inklusive
// Lieferung", "im Pfisterhoelzli enthalten, ausserhalb kommt die Anfahrt
// dazu", "im uebrigen Kanton Zuerich nach Absprache". Drei verschiedene
// Versprechen auf derselben Seite, und gelesen haette der Kunde das
// freundlichste. Jetzt kommt der Satz aus shopConfig - geprueft wird beides:
// dass er ankommt, und dass keine alte Fassung daneben stehen blieb.
const ausgeliefert = [['/', html], ...unterseiten.map((s) => [s.pfad, readFileSync(`dist${s.pfad}.html`, 'utf8')])]

/*
 * Geschuetzte Leerzeichen gleichziehen. formatChf setzt zwischen "CHF" und
 * den Betrag ein U+00A0, damit die Zahl nicht umbricht. nurText fasst
 * Leerraum mit \s+ zusammen, und \s schliesst U+00A0 ein - auf der Seite
 * steht danach ein gewoehnliches Leerzeichen, im erwarteten Satz immer noch
 * das geschuetzte. Im ausgelieferten HTML steht es ausserdem als Entity
 * &nbsp; und nicht als Zeichen - nurText entfernt Tags, keine Entities.
 * Ohne diese Zeile vergleicht man zwei Saetze, die gleich aussehen und es
 * nicht sind.
 */
const schmal = (t) => t.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ')

for (const [pfad, seite] of [
  ['/', html],
  ['/agb', readFileSync('dist/agb.html', 'utf8')],
]) {
  pruefe(
    `${pfad} nennt die Preiszusammensetzung aus shopConfig`,
    schmal(nurText(seite)).includes(schmal(preisHinweis)),
    preisHinweis,
  )
}
/*
 * Im FUSS gesucht und nicht auf der ganzen Seite: Die Kurzform ist ein
 * Teilstueck des langen Satzes. Eine Suche ueber das ganze Dokument meldete
 * auch dann gruen, wenn die Fusszeile die Zusage gar nicht mehr traegt -
 * und auf /impressum oder /datenschutz steht sie nirgends sonst.
 */
const fussVon = (seite) => {
  const von = seite.indexOf('site-footer__base')
  return von < 0 ? '' : nurText(seite.slice(von))
}
const ohneFuss = ausgeliefert
  .filter(([, seite]) => !schmal(fussVon(seite)).includes(schmal(preisHinweisKurz)))
  .map(([pfad]) => pfad)
pruefe('jede Seite traegt die Kurzform im Fuss', ohneFuss.length === 0, ohneFuss.join(', '))

/*
 * Die ueberholten Fassungen namentlich. Eine allgemeine Regel fuer "sagt
 * etwas anderes ueber die Lieferung" gibt es nicht; was es gibt, sind genau
 * diese Saetze, die hier einmal standen. Wer einen davon wieder schreibt,
 * soll es gemeldet bekommen.
 *
 * "Lieferung innerhalb der Siedlung kostenlos" fehlt hier bewusst: Das gilt
 * weiterhin und widerspricht nichts - in der Siedlung liefern wir an die
 * Wohnungstuer, und die liegt im Kanton Zuerich.
 */
for (const alt of [
  'im übrigen Kanton Zürich nach Absprache',
  'Im Pfisterhölzli ist die Lieferung enthalten',
  'inklusive Lieferung, ohne Montage',
  'Lieferung im Kanton Zürich inbegriffen',
  'Richtpreise pro Netz, ohne Montage',
  // Die alte Pauschale. Sie stand nie oeffentlich, aber wer sie wieder
  // einsetzt, tut es vermutlich mit der alten Zahl.
  'CHF&nbsp;80.00',
]) {
  const betroffen = ausgeliefert.filter(([, seite]) => seite.includes(alt)).map(([pfad]) => pfad)
  pruefe(`keine Seite sagt mehr "${alt}"`, betroffen.length === 0, betroffen.join(', '))
}

/*
 * DIE REIHENFOLGE DER STARTSEITE, als Pruefung.
 *
 * Ueber 80 Prozent kommen mit dem Handy (Vercel Analytics). Dort ist die
 * Reihenfolge keine Geschmacksfrage: Jeder Abschnitt vor dem Preis sind
 * Bildschirme, die jemand scrollt, bevor er weiss, ob er sich das leisten
 * kann. Gemessen auf 390 x 664: Mit "Vorteile" davor stand der Richtwert bei
 * 7,2 Bildschirmen, danach bei 3,2.
 *
 * Und der Preisbeleg muss VOR der Zeichnung stehen. Im Quelltext steht er
 * das ohnehin; die Zeichnung wurde frueher per CSS nach oben gezogen, und
 * genau das hat auf dem Handy die Ueberschrift aus dem ersten Bildschirm
 * geschoben. Eine Pruefung kann kein Layout messen - sie haelt hier fest,
 * dass die Reihenfolge im Dokument stimmt, damit niemand sie aus Versehen
 * dreht.
 */
pruefe(
  'Preis und Anfrage stehen vor der Begruendung',
  html.indexOf('id="anfrage"') < html.indexOf('id="vorteile"'),
  `anfrage bei ${html.indexOf('id="anfrage"')}, vorteile bei ${html.indexOf('id="vorteile"')}`,
)
pruefe(
  'der Preisbeleg steht vor der Zeichnung',
  html.indexOf('hero__proof') < html.indexOf('hero__visual'),
  `proof bei ${html.indexOf('hero__proof')}, visual bei ${html.indexOf('hero__visual')}`,
)

/*
 * EIN GROSSER KNOPF IM HERO, nicht zwei. Daneben stand bis vor Kurzem die
 * Siedlung als gleich breiter zweiter Knopf - auf dem Handy untereinander,
 * beide ueber die volle Breite. Das las sich als zwei gleichwertige Wege und
 * schob ausserdem den Preisbeleg aus dem ersten Bildschirm. Der Weg zur
 * Siedlung ist nicht weg, er ist eine Zeile; dass es ihn noch gibt, prueft
 * die Zeile darunter.
 */
const heroHtml = html.slice(html.indexOf('class="hero'), html.indexOf('trust-bar'))
const grosse = (heroHtml.match(/class="[^"]*btn--lg/g) ?? []).length
pruefe('der Hero hat genau einen grossen Knopf', grosse === 1, `${grosse} gefunden`)
pruefe(
  'der Weg zur Siedlung steht im Hero als leise Zeile',
  heroHtml.includes('hero__nebenweg') && /btn--quiet/.test(heroHtml),
)
pruefe(
  'unter dem Rechner zweigt es zur Siedlung ab',
  html.includes('custom-request__abzweig'),
)

/*
 * Der Montagepreis steht jetzt auch auf der Sondermass-Seite und nicht mehr
 * nur im Sortiment. Zwei Orte, eine Zahl: Sie muss aus shopConfig kommen.
 */
pruefe(
  `Startseite nennt die Montage mit ${shopConfig.montageChf}.-`,
  startText.includes(`${shopConfig.montageChf}.00`),
  `${shopConfig.montageChf}.00`,
)

/*
 * Die Anfahrtspauschale steht an zwei oeffentlichen Stellen: im Preissatz
 * und in der FAQ. Beide ziehen sie aus shopConfig - geprueft wird, dass die
 * Seite auch wirklich die Zahl aus der Konfiguration traegt und nicht eine,
 * die jemand danebengeschrieben hat.
 */
pruefe(
  `Startseite nennt die Anfahrtspauschale mit ${shopConfig.anfahrtspauschaleChf}.-`,
  schmal(startText).includes(`CHF ${shopConfig.anfahrtspauschaleChf}.00 pauschal`),
  `CHF ${shopConfig.anfahrtspauschaleChf}.00 pauschal`,
)
pruefe(
  'Startseite sagt, dass das Ausmessen gratis ist',
  /Ausmessen ist (immer|in jedem Fall) gratis/.test(startText),
)

/*
 * ZWEI SAETZE, DIE IM QUELLTEXT GESUCHT WERDEN und nicht im HTML.
 *
 * Der Hinweis auf zu grosse Flaechen stand im Rechner neben dem Preis und im
 * Formular neben der Summe - beide Male als Warnung genau dort, wo jemand
 * gerade eine Zahl wissen wollte. Er ist raus; was er sagen sollte, steht
 * einmal und ruhig beim Richtwert.
 *
 * Er erschien nur, wenn jemand grosse Masse eintippt, also nie in den
 * vorgerenderten Seiten. Eine Suche im ausgelieferten HTML waere deshalb
 * immer gruen gewesen, egal was im Code steht - eine Pruefung, die nichts
 * prueft. Gesucht wird darum in den Bauteilen selbst.
 */
const bauteile = ['src/components/sections/Beispielrechner.tsx', 'src/components/forms/CustomRequestForm.tsx'].map(
  (pfad) => [pfad, readFileSync(pfad, 'utf8')],
)
for (const satz of ['über unserem Erfahrungsbereich', 'Dort ist die Schätzung ungenauer']) {
  /* Die Begruendung, warum der Satz weg ist, nennt ihn - in einem Kommentar.
     Gesucht wird deshalb ausserhalb der Kommentare. */
  const treffer = bauteile
    .filter(([, text]) => text.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, '').includes(satz))
    .map(([pfad]) => pfad)
  pruefe(`kein Bauteil zeigt wieder "${satz}"`, treffer.length === 0, treffer.join(', '))
}

/*
 * DIE ZUSAGE STEHT NEBEN DER ZAHL, nicht nur im Kleingedruckten.
 *
 * Wer einen Richtpreis liest, entscheidet in dem Moment, ob er ihm zu hoch
 * ist. Dass der feste Preis erfahrungsgemaess darunter liegt, gehoert darum
 * dorthin - und nicht einen Bildschirm weiter unten, wo es liest, wer schon
 * geblieben ist. Beim naechsten Aufraeumen faellt so ein Satz leicht weg,
 * weil er nach Fuellung aussieht; er ist aber das, was den Spielraum fuer
 * einen Nachlass offenhaelt.
 *
 * Gesucht wird im ausgelieferten HTML der Startseite: Der Rechner steht
 * vorgerendert darin, mit Zahl und Satz.
 */
pruefe(
  'der Rechner sagt bei der Zahl, dass der feste Preis darunter liegt',
  html.includes(richtpreisHinweisKurz),
  richtpreisHinweisKurz,
)

/*
 * JEDE LISTE OHNE PUNKTE SAGT, WIE WEIT SIE EINRUECKT.
 *
 * `list-style: none` nimmt die Aufzaehlungspunkte weg, nicht die rund 40 px,
 * die ein <ul> vom Browser mitbekommt. Im Hero stand der Trennstrich deshalb
 * ganz links und die vier Belege 40 px weiter rechts - das sah aus, als waere
 * der Abschnitt rechtsbuendig, und niemand hatte es so gebaut.
 *
 * Geprueft wird nicht, DASS der Einzug null ist - bei der Zahlungsliste ist
 * er gewollt, dort sitzen Balken am Rand. Geprueft wird, dass er DASTEHT:
 * Wer die Punkte abschaltet, soll einmal entscheiden, wie weit eingerueckt
 * wird, statt es dem Browser zu ueberlassen.
 */
const stilblaetter = []
const sammeln = (ordner) => {
  for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
    const pfad = `${ordner}/${eintrag.name}`
    if (eintrag.isDirectory()) sammeln(pfad)
    else if (pfad.endsWith('.css')) stilblaetter.push(pfad)
  }
}
sammeln('src')

const ohneEinzug = []
for (const pfad of stilblaetter) {
  const text = readFileSync(pfad, 'utf8')
  for (const regel of text.matchAll(/([^{}]*)\{([^}]*)\}/g)) {
    if (!/list-style:\s*none/.test(regel[2])) continue
    if (/padding(-inline(-start)?)?\s*:/.test(regel[2])) continue
    ohneEinzug.push(`${pfad} ${regel[1].trim().split('\n').pop().trim()}`)
  }
}
pruefe('jede punktlose Liste nennt ihren Einzug', ohneEinzug.length === 0, ohneEinzug.join(', '))

/*
 * DER AKZENT AUF DER GEDREHTEN FLAECHE MUSS LESBAR SEIN.
 *
 * Der Trust-Balken liegt auf --surface-invert: im Hellmodus dunkelgruen, im
 * Dunkelmodus hell. Die Zeichen darauf nahmen --footer-accent, eine feste
 * helle Minze - die im Dunkelmodus auf hellem Grund verschwand. Gemessen:
 * 1,38 : 1 gegen das Band, 1,10 : 1 gegen den getoenten Kreis. Gefordert sind
 * 3 : 1 fuer Zeichen, die etwas bedeuten.
 *
 * Eine Auslieferungspruefung sieht keine Farben auf dem Bildschirm, aber sie
 * kann rechnen: Hier werden die Wertepaare aus tokens.css gelesen und ihr
 * Kontrast bestimmt - fuer jedes Farbschema einzeln. Wer eines der beiden
 * aendert, bekommt es gesagt, bevor es jemand mit dem Auge findet.
 */
const tokens = readFileSync('src/styles/tokens.css', 'utf8')
const blöcke = [...tokens.matchAll(/\{([\s\S]*?)\}/g)].map((m) => m[1])
const paare = blöcke
  .map((b) => [/--surface-invert:\s*(#[0-9a-f]{6})/i.exec(b)?.[1], /--invert-accent:\s*(#[0-9a-f]{6})/i.exec(b)?.[1]])
  .filter(([flaeche, akzent]) => flaeche && akzent)

const kanal = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16)
const helligkeit = (h) =>
  [0, 1, 2]
    .map((i) => { const v = kanal(h, i) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    .reduce((summe, v, i) => summe + v * [0.2126, 0.7152, 0.0722][i], 0)
const kontrast = (a, b) => {
  const [hoch, tief] = [helligkeit(a), helligkeit(b)].sort((x, y) => y - x)
  return (hoch + 0.05) / (tief + 0.05)
}

pruefe('beide Farbschemen setzen --invert-accent', paare.length === 3, `${paare.length} von 3 Bloecken`)
for (const [flaeche, akzent] of paare) {
  const wert = kontrast(flaeche, akzent)
  pruefe(`${akzent} auf ${flaeche} ist lesbar`, wert >= 3, `${wert.toFixed(2)} : 1`)
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
