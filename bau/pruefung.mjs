/** Prueft das ausgelieferte HTML: Kopfangaben, JSON-LD, Sitemap, robots.txt. */
import { readFileSync } from 'node:fs'
import { windowTypes, netSets } from '../src/data/catalog.ts'
import { rechtsseiten, startseite } from '../src/data/site.ts'

const html = readFileSync('dist/index.html', 'utf8')
const pruefungen = []
const pruefe = (name, ok, zusatz = '') => pruefungen.push({ name, ok, zusatz })

// --- Kopfangaben ---
for (const [name, muster] of [
  ['canonical', /<link rel="canonical" href="https:\/\/pfistanbul\.vercel\.app\/">/],
  ['og:title', /property="og:title"/],
  ['og:description', /property="og:description"/],
  ['og:image', /property="og:image" content="https:\/\/pfistanbul\.vercel\.app\/vorschau\.jpg"/],
  ['og:image:width 1200', /property="og:image:width" content="1200"/],
  ['og:locale de_CH', /property="og:locale" content="de_CH"/],
  ['twitter:card', /name="twitter:card" content="summary_large_image"/],
]) pruefe(name, muster.test(html))

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

const org = graph.find((k) => k['@type'] === 'Organization')
pruefe('Impressumsangaben in der Organisation', org.email === 'pfistanbul34@gmail.com' && org.address.postalCode === '8606')
pruefe('beide Gruender genannt', org.founder.length === 2)
const fragen = graph.find((k) => k['@type'] === 'FAQPage')
pruefe('elf Fragen mit Antwort', fragen.mainEntity.length === 11 && fragen.mainEntity.every((f) => f.acceptedAnswer.text.length > 40))

// --- Sitemap und robots ---
const sitemap = readFileSync('dist/sitemap.xml', 'utf8')
const erwarteteAdressen = 1 + rechtsseiten.length
pruefe(`Sitemap nennt ${erwarteteAdressen} Adressen`, (sitemap.match(/<loc>/g) ?? []).length === erwarteteAdressen)
for (const seite of rechtsseiten) {
  pruefe(`Sitemap kennt ${seite.pfad}`, sitemap.includes(`<loc>https://pfistanbul.vercel.app${seite.pfad}</loc>`))
}
pruefe('Sitemap ohne erfundenes lastmod', !sitemap.includes('lastmod'))
const robots = readFileSync('dist/robots.txt', 'utf8')
pruefe('robots.txt sperrt niemanden aus', /User-agent: \*\nAllow: \//.test(robots))
pruefe('robots.txt schuetzt /api/', robots.includes('Disallow: /api/'))
pruefe('robots.txt zeigt auf die Sitemap', robots.includes('https://pfistanbul.vercel.app/sitemap.xml'))

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
  pruefe(`${seite.pfad} zeigt auf sich selbst (canonical)`, inhalt.includes(`href="https://pfistanbul.vercel.app${seite.pfad}"`))
  pruefe(`${seite.pfad} traegt echten Text`, text.split(' ').length > 150, `${text.split(' ').length} Woerter`)
  pruefe(`${seite.pfad} nutzt dieselben Bundle-Dateien`, bundeldateien(inhalt) === bundeldateien(html))

  const graph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(inhalt)[1])['@graph']
  const typen = new Set(graph.map((k) => k['@type']))
  pruefe(`${seite.pfad} ohne Produktdaten`, !typen.has('Product') && !typen.has('FAQPage'), [...typen].join(', '))
  pruefe(`${seite.pfad} nennt die Organisation`, typen.has('Organization'))
}

pruefe('Startseite behaelt ihren Titel', html.includes(`<title>${startseite.titel}</title>`))

for (const p of pruefungen) console.log(`${p.ok ? 'ok  ' : 'FEHL'}  ${p.name}${p.ok ? '' : '   -> ' + p.zusatz}`)
console.log(`\n${pruefungen.filter((p) => p.ok).length}/${pruefungen.length} bestanden`)
process.exit(pruefungen.every((p) => p.ok) ? 0 : 1)
