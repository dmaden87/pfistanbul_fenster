/** Prueft das ausgelieferte HTML: Kopfangaben, JSON-LD, Sitemap, robots.txt. */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { windowTypes, netSets } from '../src/data/catalog.ts'
import { absolut, rechtsseiten, site, startseite } from '../src/data/site.ts'
import { operator } from '../src/data/operator.ts'

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
pruefe('Verfuegbarkeit ist Vorbestellung', produkte.every((p) => p.offers.availability.endsWith('/PreOrder')))
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
pruefe('Mailadresse steht als Text im Impressum', readFileSync('dist/impressum.html', 'utf8').includes(operator.email))
pruefe('beide Gruender genannt', org.founder.length === 2)
const fragen = graph.find((k) => k['@type'] === 'FAQPage')
pruefe('elf Fragen mit Antwort', fragen.mainEntity.length === 11 && fragen.mainEntity.every((f) => f.acceptedAnswer.text.length > 40))

// --- Sitemap und robots ---
const sitemap = readFileSync('dist/sitemap.xml', 'utf8')
const erwarteteAdressen = 1 + rechtsseiten.length
pruefe(`Sitemap nennt ${erwarteteAdressen} Adressen`, (sitemap.match(/<loc>/g) ?? []).length === erwarteteAdressen)
for (const seite of rechtsseiten) {
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

for (const seite of rechtsseiten) {
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
