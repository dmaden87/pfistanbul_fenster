/**
 * Meldet die Adressen der Seite bei den Suchmaschinen an, die IndexNow
 * unterstuetzen: Bing, Yandex, Seznam und Naver. Google macht NICHT mit -
 * dort geht es weiterhin ueber die Search Console und ueber Geduld.
 *
 * Aufruf: npm run melden
 *
 * WARUM ES DAS BRAUCHT: Eine neue Seite, auf die niemand verlinkt, findet
 * kein Crawler von selbst. Sie kann technisch perfekt sein - wenn sie in
 * keinem Index steht, kann ein KI-Werkzeug sie nicht nachschlagen. Genau
 * daran ist unsere Probe mit Perplexity gescheitert. IndexNow dreht die
 * Richtung um: Statt zu warten, bis jemand vorbeikommt, klopfen wir an.
 *
 * WARUM VON HAND UND NICHT BEIM BAUEN: Die Meldung sagt "hier ist etwas
 * Neues, hol es ab". Wuerde sie beim Bauen laufen, holten die Crawler die
 * Seite ab, bevor Vercel sie ueberhaupt ausgeliefert hat. Also erst pushen,
 * warten, bis die Aenderung live ist - und dann melden.
 *
 * DER SCHLUESSEL beweist, dass die Meldung von jemandem kommt, der die
 * Seite kontrolliert: Er liegt als Datei im Wurzelverzeichnis, und die
 * Suchmaschine holt sie sich zur Kontrolle ab. Deshalb ist er kein
 * Geheimnis - er ist oeffentlich lesbar und soll es sein.
 */
import { readdir } from 'node:fs/promises'
import { absolut, seiten, site } from '../src/data/site.ts'

const DIENST = 'https://api.indexnow.org/indexnow'

/*
 * Der Schluessel steht nicht hier, sondern ergibt sich aus dem Dateinamen im
 * public-Ordner. So gibt es keine zweite Stelle, die man beim Wechsel
 * vergessen koennte - und ein falsch abgetippter Schluessel faellt sofort auf,
 * statt still zu einer abgelehnten Meldung zu fuehren.
 */
const dateien = (await readdir('public')).filter((name) => /^[0-9a-f]{32}\.txt$/.test(name))
if (dateien.length !== 1) {
  throw new Error(
    `In public/ muss genau eine Schluesseldatei liegen, gefunden: ${dateien.length}. ` +
      'Erwartet wird ein Name aus 32 Hexzeichen mit der Endung .txt.',
  )
}
const schluessel = dateien[0].replace('.txt', '')
const schluesselAdresse = absolut(`/${dateien[0]}`)

// Die Datei muss oeffentlich erreichbar sein, sonst weist der Dienst die
// Meldung ab. Lieber hier scheitern als eine Meldung ins Leere schicken.
const probe = await fetch(schluesselAdresse)
const inhalt = (await probe.text()).trim()
if (!probe.ok || inhalt !== schluessel) {
  throw new Error(
    `${schluesselAdresse} liefert nicht den Schluessel (Status ${probe.status}, Inhalt "${inhalt.slice(0, 40)}"). ` +
      'Wurde die Aenderung schon deployed?',
  )
}

const adressen = seiten.map((s) => absolut(s.pfad))
const antwort = await fetch(DIENST, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: new URL(site.adresse).host,
    key: schluessel,
    keyLocation: schluesselAdresse,
    urlList: adressen,
  }),
})

/*
 * 200 heisst angenommen, 202 heisst angenommen und der Schluessel wird noch
 * geprueft. Beides ist in Ordnung; alles andere nicht.
 */
const text = await antwort.text().catch(() => '')
if (antwort.status !== 200 && antwort.status !== 202) {
  throw new Error(`IndexNow antwortete mit ${antwort.status}${text ? `: ${text.slice(0, 300)}` : ''}`)
}

console.log(`Gemeldet an IndexNow (Bing, Yandex, Seznam, Naver): Status ${antwort.status}`)
for (const adresse of adressen) console.log(`  ${adresse}`)
console.log('\nGoogle nimmt an IndexNow nicht teil - dort laeuft es ueber die Search Console.')
