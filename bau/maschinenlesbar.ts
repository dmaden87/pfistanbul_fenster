import type { Plugin } from 'vite'
import { netSets, netsInSet, regularPriceOfSet, windowTypes } from '../src/data/catalog'
import { faq } from '../src/data/faq'
import { operator } from '../src/data/operator'
import { shopConfig } from '../src/data/shopConfig'
import { absolut, seiten, site, startseite } from '../src/data/site'

/**
 * Macht die Seite fuer Maschinen lesbar.
 *
 * Der Anlass war eine Probe: Ein KI-Werkzeug, das wie ein Kaeufer nach uns
 * gefragt wurde, konnte weder Preise noch Impressum noch Zahlungsarten
 * nennen. Kein Wunder - die ausgelieferte Datei ist rund ein Kilobyte gross
 * und besteht im Rumpf aus einem leeren <div>. Alles Uebrige entsteht erst,
 * wenn ein Browser das JavaScript ausfuehrt, und genau das tun die Crawler
 * dieser Werkzeuge in aller Regel nicht.
 *
 * Dieses Plugin legt deshalb drei Dinge daneben, die ohne JavaScript lesbar
 * sind: strukturierte Daten (JSON-LD) im Kopf der Seite, eine sitemap.xml und
 * eine robots.txt.
 *
 * ENTSCHEIDEND IST, DASS ES ERZEUGT UND NICHT GEPFLEGT WIRD. Die Zahlen
 * stammen aus denselben Dateien, aus denen die Seite ihre Anzeige speist. Eine
 * von Hand geschriebene zweite Fassung wuerde spaetestens bei der naechsten
 * Preisaenderung etwas anderes behaupten als die Seite - und ein falscher
 * Preis in maschinenlesbarer Form ist schlimmer als gar keiner.
 */

/** Kuerzel fuer die Knoten, damit sie aufeinander verweisen koennen. */
const ID = {
  organisation: `${site.adresse}/#organisation`,
  website: `${site.adresse}/#website`,
  seite: `${site.adresse}/#seite`,
  fragen: `${site.adresse}/#fragen`,
} as const

/**
 * Verfuegbarkeit.
 *
 * BEWUSST NICHT "InStock", auch im Normalbetrieb nicht. Wir haben kein Lager:
 * Jedes Netz wird auf Bestellung gefertigt, und wir buendeln die Bestellungen
 * zu einer Lieferung - genau daher kommt der tiefe Preis. "Auf Lager" liesse
 * eine sofortige Lieferung erwarten und waere damit eine unrichtige Angabe im
 * Sinne des UWG.
 *
 * "BackOrder" trifft es: bestellbar, aber nicht vorraetig, Lieferung folgt.
 * Vor dem Live-Gang war es "PreOrder" - da nahmen wir Bestellungen entgegen,
 * ohne schon zu liefern.
 */
const verfuegbarkeit = shopConfig.operational
  ? 'https://schema.org/BackOrder'
  : 'https://schema.org/PreOrder'

/**
 * Zahlungsarten als Text und nicht als Aufzaehlungswert. Fuer TWINT gibt es
 * im Schema keinen Begriff, und eine halb kodierte Liste waere schlechter
 * lesbar als eine ganze in Worten.
 */
const zahlungsarten = ['Bar bei der Übergabe', 'TWINT bei der Übergabe']
if (shopConfig.onlinePayment) zahlungsarten.push('Kreditkarte online über Stripe')
if (shopConfig.flexiblePayment) zahlungsarten.push('Ratenzahlung nach persönlicher Absprache, zinslos')

/**
 * Ruecknahme und Garantie. Beides beantwortet eine Frage, die ein Kaeufer
 * tatsaechlich stellt - und beides steht bereits so in den AGB.
 */
const ruecknahme = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'CH',
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: shopConfig.returnDays,
  returnFees: 'https://schema.org/FreeReturn',
}

const garantie = {
  '@type': 'WarrantyPromise',
  durationOfWarranty: { '@type': 'QuantitativeValue', value: shopConfig.warrantyYears, unitCode: 'ANN' },
  warrantyScope: 'https://schema.org/WarrantyScope',
}

/**
 * Ein Angebot. Bewusst OHNE `valueAddedTaxIncluded`: Wir sind nicht
 * mehrwertsteuerpflichtig. Beide moeglichen Werte waeren irrefuehrend - true
 * behauptet eine enthaltene Steuer, false laesst eine erwarten, die noch
 * dazukommt. Weglassen ist die einzige richtige Angabe.
 */
function angebot(preisChf: number) {
  return {
    '@type': 'Offer',
    price: preisChf.toFixed(2),
    priceCurrency: 'CHF',
    availability: verfuegbarkeit,
    itemCondition: 'https://schema.org/NewCondition',
    url: absolut('/'),
    seller: { '@id': ID.organisation },
    acceptedPaymentMethod: zahlungsarten,
    hasMerchantReturnPolicy: ruecknahme,
    warranty: garantie,
  }
}

/**
 * Bilder zu den Produkten.
 *
 * Google verlangt fuer Haendlereintraege ein `image` - ohne das gibt es keine
 * Produktdarstellung in der Suche. Wir haben aber kein Studiofoto je Format,
 * sondern fuenf echte Aufnahmen aus der Siedlung.
 *
 * Zugeordnet ist deshalb, was WIRKLICH passt: Das Kuechenfenster ist das
 * Kuechenfenster, das Zimmerfenster das Zimmerfenster. Fuer Bad und
 * Balkontuere gibt es noch keine eigene Aufnahme; dort steht die
 * Fensteraufnahme stellvertretend - dasselbe Produkt in einem anderen Format,
 * und das genaue Mass steht in der Beschreibung. Als zweites Bild kommt
 * ueberall die Gewebeaufnahme dazu, denn das Gewebe ist in jedem Netz dasselbe.
 *
 * SOBALD IHR BEI NACHBARN MONTIERT HABT: je eine Aufnahme pro Format machen
 * und hier eintragen. Ein echtes Bild des jeweiligen Formats ist besser als
 * ein stellvertretendes.
 */
const FOTO_JE_TYP: Record<string, string> = {
  bad: 'fenster-geschlossen',
  kueche: 'fenster-geschlossen',
  zimmer: 'zimmer-storen',
  balkontuer: 'fenster-geschlossen',
}

function bilder(name: string): string[] {
  return [absolut(`/fotos/${name}-1600.jpg`), absolut('/fotos/gewebe-detail-1600.jpg')]
}

function mass(wert: number) {
  return { '@type': 'QuantitativeValue', value: wert, unitCode: 'CMT' }
}

function produkte() {
  const einzeln = windowTypes.map((typ) => ({
    '@type': 'Product',
    '@id': `${site.adresse}/#produkt-${typ.id}`,
    name: `Insektenschutz-Plissee ${typ.label}`,
    description:
      `Plissee-Insektenschutz für das Fensterformat «${typ.label}» der Überbauung Am Pfisterhölzli in ` +
      `Greifensee ZH: ${typ.widthCm} × ${typ.heightCm} cm, für ${typ.room}. ${typ.openingLabel}. ` +
      'Fiberglasgewebe in Grau, umlaufende Bürstendichtung, Montage in den meisten Fällen ohne Bohren.',
    category: 'Insektenschutz für Fenster',
    material: 'Fiberglasgewebe, Aluminiumrahmen',
    width: mass(typ.widthCm),
    height: mass(typ.heightCm),
    // Als eigenes Objekt und nicht als Verweis auf die Organisation: Googles
    // Pruefung loest die Kennung nicht auf und meldet sonst einen ungueltigen
    // Objekttyp.
    brand: { '@type': 'Brand', name: operator.businessName },
    sku: `PF-${typ.id.toUpperCase()}`,
    image: bilder(FOTO_JE_TYP[typ.id] ?? 'fenster-geschlossen'),
    offers: angebot(typ.priceChf),
  }))

  const gebuendelt = netSets.map((satz) => ({
    '@type': 'Product',
    '@id': `${site.adresse}/#produkt-${satz.id}`,
    name: `Insektenschutz-Plissee ${satz.label}`,
    description:
      `${satz.description} Statt ${regularPriceOfSet(satz)} Franken einzeln. ` +
      `Enthält ${netsInSet(satz)} Netze in den ausgemessenen Formaten der Überbauung Am Pfisterhölzli.`,
    category: 'Insektenschutz für Fenster',
    brand: { '@type': 'Brand', name: operator.businessName },
    sku: `PF-${satz.id.toUpperCase()}`,
    // Ein Set besteht ueberwiegend aus Zimmernetzen - deshalb diese Aufnahme.
    image: bilder('zimmer-storen'),
    isRelatedTo: satz.items.map((teil) => ({ '@id': `${site.adresse}/#produkt-${teil.typeId}` })),
    offers: angebot(satz.priceChf),
  }))

  return [...einzeln, ...gebuendelt]
}

/** Montage ist eine Leistung, kein Gegenstand - und eine haeufige Frage. */
function montage() {
  return {
    '@type': 'Service',
    '@id': `${site.adresse}/#montage`,
    name: 'Montage durch uns',
    serviceType: 'Montage von Insektenschutz',
    description:
      'Wir bringen die Netze bei Ihnen an. Preis pro Fenster, zusätzlich zum Netz. ' +
      'Wer selbst montiert, zahlt nichts dazu – die Netze sind dafür gemacht.',
    provider: { '@id': ID.organisation },
    areaServed: { '@type': 'AdministrativeArea', name: shopConfig.serviceArea },
    offers: {
      '@type': 'Offer',
      price: shopConfig.montageChf.toFixed(2),
      priceCurrency: 'CHF',
      availability: verfuegbarkeit,
      url: absolut('/'),
      seller: { '@id': ID.organisation },
      eligibleQuantity: { '@type': 'QuantitativeValue', unitText: 'Fenster' },
    },
  }
}

function organisation() {
  const [ich] = operator.people
  return {
    '@type': 'Organization',
    '@id': ID.organisation,
    name: operator.businessName,
    url: absolut('/'),
    email: operator.email,
    description:
      'Insektenschutz-Plissee nach Mass, von zwei Nachbarn aus der Überbauung Am Pfisterhölzli in ' +
      'Greifensee. Für die vier ausgemessenen Fensterformate der Siedlung gibt es feste Preise; ' +
      'alles andere wird nach Mass gefertigt.',
    // Die Adresse steht ohnehin im Impressum - Art. 3 Abs. 1 lit. s UWG
    // verlangt sie dort. Hier steht sie nochmals maschinenlesbar.
    address: {
      '@type': 'PostalAddress',
      streetAddress: ich.street,
      postalCode: ich.zip,
      addressLocality: ich.city,
      addressCountry: 'CH',
    },
    areaServed: { '@type': 'AdministrativeArea', name: shopConfig.serviceArea },
    founder: operator.people.map((person) => ({ '@type': 'Person', name: person.name })),
    knowsLanguage: ['de-CH', 'tr'],
    logo: absolut(site.vorschaubild),
  }
}

function fragen() {
  return {
    '@type': 'FAQPage',
    '@id': ID.fragen,
    inLanguage: site.sprache,
    isPartOf: { '@id': ID.website },
    mainEntity: faq.map((eintrag) => ({
      '@type': 'Question',
      name: eintrag.q,
      acceptedAnswer: { '@type': 'Answer', text: eintrag.a },
    })),
  }
}

function graph(titel: string, beschreibung: string) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organisation(),
      {
        '@type': 'WebSite',
        '@id': ID.website,
        url: absolut('/'),
        name: operator.businessName,
        inLanguage: site.sprache,
        publisher: { '@id': ID.organisation },
      },
      {
        '@type': 'WebPage',
        '@id': ID.seite,
        url: absolut('/'),
        name: titel,
        description: beschreibung,
        inLanguage: site.sprache,
        isPartOf: { '@id': ID.website },
        about: { '@id': ID.organisation },
        primaryImageOfPage: absolut(site.vorschaubild),
      },
      ...produkte(),
      montage(),
      fragen(),
    ],
  }
}

function sitemap(): string {
  /*
   * Ohne <lastmod>: Der Zeitpunkt des Bauens ist nicht der Zeitpunkt, zu dem
   * sich der Inhalt geaendert hat. Ein bei jedem Deployment neu gesetztes
   * Datum behauptet eine Aenderung, die es nicht gab - Crawler lernen das und
   * glauben dem Feld dann gar nicht mehr.
   */
  const eintraege = seiten
    .map((s) => `  <url>\n    <loc>${absolut(s.pfad)}</loc>\n    <priority>${s.gewicht.toFixed(1)}</priority>\n  </url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${eintraege}\n</urlset>\n`
}

function robots(): string {
  return `# ${operator.businessName}
#
# Diese Datei sperrt niemanden aus. Ohne robots.txt gilt ohnehin "alles
# erlaubt" - sie steht hier, damit die Sitemap gefunden wird.
#
# Ausdruecklich eingeschlossen sind die Crawler der KI-Werkzeuge. Viele Leute
# fragen heute zuerst ihr Programm und erst danach eine Suchmaschine.

User-agent: *
Allow: /

# Die Serverfunktionen nehmen Bestellungen entgegen und empfangen die
# Zahlungsmeldungen von Stripe. Dort gibt es nichts zu lesen.
Disallow: /api/

Sitemap: ${absolut('/sitemap.xml')}
`
}

export function maschinenlesbar(): Plugin {
  return {
    name: 'pfistanbul-maschinenlesbar',

    transformIndexHtml(html) {
      const { titel, beschreibung } = startseite
      const bild = absolut(site.vorschaubild)

      return {
        html,
        tags: [
          { tag: 'title', children: titel, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'description', content: beschreibung }, injectTo: 'head' },
          { tag: 'link', attrs: { rel: 'canonical', href: absolut('/') }, injectTo: 'head' },
          // Vorschau, wenn jemand den Link in einem Chat oder in sozialen
          // Netzen teilt. Ohne diese Angaben zeigen die meisten Dienste einen
          // grauen Kasten mit der nackten Adresse.
          { tag: 'meta', attrs: { property: 'og:type', content: 'website' }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:site_name', content: operator.businessName }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:locale', content: 'de_CH' }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:title', content: titel }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:description', content: beschreibung }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:url', content: absolut('/') }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image', content: bild }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image:width', content: String(site.vorschaubildBreite) }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image:height', content: String(site.vorschaubildHoehe) }, injectTo: 'head' },
          {
            tag: 'meta',
            attrs: { property: 'og:image:alt', content: 'Ein Insektenschutz-Plissee am Küchenfenster, daneben der Name Pfistanbul Fenster.' },
            injectTo: 'head',
          },
          { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
          {
            tag: 'script',
            attrs: { type: 'application/ld+json' },
            children: JSON.stringify(graph(titel, beschreibung), null, 2),
            injectTo: 'head',
          },
        ],
      }
    },

    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() })
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots() })
    },
  }
}
