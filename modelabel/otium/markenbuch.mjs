// Baut das Markenbuch von OTIUM.
// node modelabel/otium/markenbuch.mjs [ziel-für-artifact.html]
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zeichen, PUR } from '../logo/formen.mjs'

const hier = dirname(fileURLToPath(import.meta.url))
let n = 0
const pur = zeichen({ ...PUR, strich: 6 })
const purNeben = zeichen({ ...PUR, strich: 7.5 })
const marke = () => pur(`m${n++}`)
const markeNeben = () => purNeben(`q${n++}`)

const farben = [
  { name: 'Porzellan', hex: '#F1EDE5', text: 'Das Weiss des Untersetzers. Grundton für Basics und Verpackung.', hell: true },
  { name: 'Rinde', hex: '#A8A391', text: 'Das gefleckte Grau-Oliv der Platanenrinde.', hell: true },
  { name: 'Schatten', hex: '#2E2F2B', text: 'Der kühle Schatten unter der Krone. Statt Schwarz.' },
  { name: 'Demtee', hex: '#7A3426', text: 'Die Farbe von gut gezogenem Tee. Sparsam, als Akzent.' },
  { name: 'Löffel', hex: '#B08D57', text: 'Das gedämpfte Messing des Teelöffels. Nur für Details wie Prägung oder Faden.' },
]

const kollektion = [
  { gruppe: 'Erwachsene', teile: [
    ['Sweatshirt', 'Schwerer Bio-Baumwoll-Loopback, innen ungeraut, leicht überschnitten'],
    ['Hose', 'Gleicher Loopback, gerades Bein, breiter Bund mit Kordel'],
    ['T-Shirt', 'Dichter Single-Jersey, schwer und matt, hält die Form'],
    ['Strickpullover', 'Feiner Merino, Rundhals, für den Abend im Teegarten'],
  ] },
  { gruppe: 'Kinder', teile: [
    ['Sweatshirt', 'Derselbe Stoff wie bei den Grossen, etwas weicher gewaschen'],
    ['Hose', 'Mit Bündchen und Raum zum Wachsen'],
    ['T-Shirt', 'Derselbe Jersey, kleiner Schnitt'],
  ] },
  { gruppe: 'Baby', teile: [
    ['Body', 'Weicher Bio-Jersey, Knöpfe statt Druckknöpfe aus Metall'],
    ['Strickjäckchen', 'Merino, mit Holz- oder Steinnussknöpfen'],
    ['Mütze', 'Rippstrick'],
    ['Decke', 'Die «Teegarten-Decke»: Strick, gross genug für den Kinderwagen und die Wiese'],
  ] },
]

const seite = `<title>OTIUM Markenbuch</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Jost:wght@400;500&display=swap">
<style>
/* Layout: ruhiges Buch, eine Spalte mit breiten Ausreissern für Zeichen, Farben und Kollektion */
:root {
  --porzellan: #f1ede5; --papier: #f7f5f0; --tinte: #2e2f2b; --leise: #6e6b62; --linie: #e2ddd2;
  --rinde: #a8a391; --tee: #7a3426; --loeffel: #b08d57; --flaeche: #ffffff;
  --antiqua: 'Cormorant Garamond', 'Garamond', 'Baskerville', Georgia, serif;
  --text: 'Jost', 'Futura', 'Avenir Next', system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --papier: #1c1d1a; --flaeche: #242521; --tinte: #ece8df; --leise: #a7a296; --linie: #34352f; --tee: #b45a45; color-scheme: dark } }
:root[data-theme="dark"] { --papier: #1c1d1a; --flaeche: #242521; --tinte: #ece8df; --leise: #a7a296; --linie: #34352f; --tee: #b45a45; color-scheme: dark }
body { background: var(--papier); color: var(--tinte); font-family: var(--text); font-size: 17px; line-height: 1.65 }
.buch { max-width: 1040px; margin: 0 auto; padding-inline: 20px; padding-block: 0 96px }
.spalte { max-width: 640px; margin-inline: auto }
.titel { display: grid; justify-items: center; text-align: center; gap: 22px; padding-block: 88px 72px; border-bottom: 1px solid var(--linie) }
.titel svg { width: 132px; height: auto; color: var(--tinte) }
.wortmarke { font-family: var(--antiqua); font-weight: 500; font-size: clamp(44px, 9vw, 76px); letter-spacing: .24em; margin-right: -.24em; line-height: 1 }
.claim { font-family: var(--antiqua); font-style: italic; font-size: 24px; color: var(--leise); margin: 0 }
section { padding-block: 64px; border-bottom: 1px solid var(--linie) }
.rubrik { font-size: 12px; letter-spacing: .18em; text-transform: uppercase; color: var(--leise); margin: 0 0 10px }
h2 { font-family: var(--antiqua); font-weight: 500; font-size: clamp(32px, 5vw, 44px); line-height: 1.1; margin: 0 0 24px; text-wrap: balance }
h3 { font-family: var(--antiqua); font-weight: 500; font-size: 26px; margin: 0 0 6px }
p { margin: 0 0 16px }
.gross { font-family: var(--antiqua); font-size: 26px; line-height: 1.45 }
.leise { color: var(--leise) }
.platzhalter { background: color-mix(in srgb, var(--loeffel) 18%, transparent); border-left: 2px solid var(--loeffel); padding: 12px 16px; font-size: 15px }
.zitat { font-family: var(--antiqua); font-style: italic; font-size: 30px; line-height: 1.3; text-align: center; margin: 32px auto; max-width: 30ch }
.zitat small { display: block; font-family: var(--text); font-style: normal; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise); margin-top: 10px }

.zeichen { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 40px; align-items: center; margin-top: 8px }
.zeichen-bild { display: grid; place-items: center; background: var(--flaeche); border: 1px solid var(--linie); border-radius: 4px; padding: 48px; color: var(--tinte) }
.zeichen-bild svg { width: 100%; max-width: 220px; height: auto }
.teile { display: grid; gap: 14px; margin: 0; padding: 0; list-style: none }
.teile li { display: grid; grid-template-columns: 110px 1fr; gap: 12px; border-top: 1px solid var(--linie); padding-top: 12px }
.teile b { font-weight: 500 }

.grundsaetze { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 28px 32px; margin-top: 8px }
.grundsaetze div { border-top: 1px solid var(--tinte); padding-top: 14px }
.grundsaetze p { color: var(--leise); font-size: 15.5px }

.kollektion { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 20px; margin-top: 8px }
.gruppe { background: var(--flaeche); border: 1px solid var(--linie); border-radius: 4px; padding: 24px }
.gruppe ul { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 12px }
.gruppe li { display: grid; gap: 2px }
.gruppe li span:first-child { font-weight: 500 }
.gruppe li span:last-child { color: var(--leise); font-size: 15px }
.zahl { font-variant-numeric: tabular-nums }

.farben { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 170px), 1fr)); gap: 16px; margin-top: 8px }
.farbe { display: grid; gap: 8px }
.feld { aspect-ratio: 4 / 5; max-width: 100%; border-radius: 3px; border: 1px solid var(--linie); display: grid; align-content: end; padding: 12px }
.feld span { font-size: 12px; letter-spacing: .1em; font-variant-numeric: tabular-nums }
.farbe p { font-size: 14.5px; color: var(--leise); margin: 0 }
.farbe h3 { font-size: 22px; margin: 0 }

.schrift { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 20px; margin-top: 8px }
.schrift > div { background: var(--flaeche); border: 1px solid var(--linie); border-radius: 4px; padding: 24px }
.probe-antiqua { font-family: var(--antiqua); font-size: 46px; line-height: 1.1; margin-bottom: 8px }
.probe-text { font-size: 22px; margin-bottom: 8px }

.ton { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; margin-top: 8px }
.ton > div { border-radius: 4px; padding: 20px 22px; background: var(--flaeche); border: 1px solid var(--linie) }
.ton h3 { font-family: var(--text); font-size: 12px; letter-spacing: .16em; text-transform: uppercase; font-weight: 500; color: var(--leise) }
.ton ul { margin: 8px 0 0; padding-left: 18px; display: grid; gap: 8px }
.ton .ja h3 { color: var(--tinte) }
.ton .nein li { color: var(--leise) }

.anwendung { display: flex; flex-wrap: wrap; gap: 24px; align-items: end; margin-block: 8px 28px }
.anwendung figure { margin: 0; display: grid; gap: 8px; justify-items: center }
.anwendung figcaption { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--leise) }
.etikett { display: inline-flex; align-items: center; gap: .55em; background: var(--tinte); color: var(--porzellan); padding: 18px 28px; border-radius: 2px; font-family: var(--antiqua); font-weight: 500; font-size: 15px; letter-spacing: .24em }
.etikett svg { width: 1.7em; height: auto }
.anhaenger { position: relative; background: var(--porzellan); color: #2e2f2b; border: 1px solid var(--linie); border-radius: 3px; padding: 40px 30px 26px; display: grid; justify-items: center; gap: 10px; width: 170px; text-align: center }
.anhaenger::before { content: ''; position: absolute; top: 14px; width: 9px; height: 9px; border-radius: 50%; background: var(--papier); box-shadow: inset 0 0 0 1px rgba(0,0,0,.18) }
.anhaenger svg { width: 46px; height: auto }
.anhaenger b { font-family: var(--antiqua); font-weight: 500; letter-spacing: .24em; margin-right: -.24em; font-size: 16px }
.anhaenger i { font-family: var(--antiqua); font-size: 15px; color: #6e6b62 }
.nackenband { font-family: var(--antiqua); font-style: italic; font-size: 15px; letter-spacing: .06em; background: var(--porzellan); color: #2e2f2b; border: 1px solid var(--linie); padding: 8px 18px; border-radius: 2px }
.liste { margin: 0; padding-left: 20px; display: grid; gap: 10px }
.schritte { counter-reset: s; list-style: none; padding: 0; margin: 0; display: grid; gap: 14px }
.schritte li { counter-increment: s; display: grid; grid-template-columns: 34px 1fr; gap: 8px }
.schritte li::before { content: counter(s); font-family: var(--antiqua); font-size: 24px; line-height: 1.3; color: var(--tee) }
@media (max-width: 720px) { .zeichen, .ton { grid-template-columns: 1fr } .teile li { grid-template-columns: 1fr; gap: 2px } }
</style>
<div class="buch">
  <header class="titel">
    ${marke()}
    <div class="wortmarke" aria-label="OTIUM">OTIUM</div>
    <p class="claim">Kleidung für die Musse.</p>
  </header>

  <section class="spalte">
    <p class="rubrik">Die Idee</p>
    <h2>Ein Glas Tee im Schatten der Platane</h2>
    <p class="gross">In türkischen Teegärten steht oft eine alte Platane, eine Çınar. Unter ihrer Krone sitzen Grosseltern, Eltern und Kinder an denselben Tischen. Das Glas Tee kostet fast nichts, und trotzdem ist es der beste Moment des Tages.</p>
    <p>Niemand dort hat es eilig. Wer hier sitzt, muss niemandem mehr etwas beweisen. Man trägt, was bequem ist und gut gemacht. Man spricht leise. Man bleibt.</p>
    <p>Die Römer hatten dafür ein Wort: <em>otium</em>. Gemeint war die freie Zeit derer, die angekommen sind. Keine Faulheit, sondern kultivierte Musse: Zeit für Familie, Gespräche, Gedanken und die schönen Dinge. Cicero nannte das Ideal <em>otium cum dignitate</em>, Musse mit Würde.</p>
    <p>OTIUM macht Kleidung für genau diese Zeit. Für die Stunden, in denen man nichts muss. Für Menschen, die Qualität erkennen, ohne dass jemand sie ihnen zeigen muss.</p>
    <p class="zitat">Otium cum dignitate.<small>Musse mit Würde · Cicero</small></p>
    <p class="platzhalter"><b>Hier gehört deine eigene Geschichte hin.</b> Woher du kommst, welche Erinnerung du mit Teegarten und Çınar verbindest, warum du OTIUM gründest. Zwei oder drei ehrliche Sätze von dir machen die Marke stärker als jeder Text von mir.</p>
  </section>

  <section>
    <div class="spalte"><p class="rubrik">Das Zeichen</p><h2>Ein Kreis, ein Glas, ein Teller</h2></div>
    <div class="zeichen">
      <div class="zeichen-bild">${marke()}</div>
      <div>
        <ul class="teile">
          <li><b>Der Kreis</b><span>Die Krone der Platane, die Schatten spendet. Für manche ist er Sonne, für andere Mond. Beides passt: OTIUM gehört dem Nachmittag und dem Abend.</span></li>
          <li><b>Das Glas</b><span>Das schlanke türkische Teeglas mit vollem Bauch. Der Moment, in dem man innehält.</span></li>
          <li><b>Der Teller</b><span>Der Untersetzer, auf dem alles ruht. Boden, Halt, Ankommen.</span></li>
        </ul>
        <p class="leise" style="margin-top:20px">Das Zeichen ist eine einzige feine Linie, ohne Füllung und ohne Farbe. So bleibt es leise, auch wenn es gross gedruckt ist.</p>
      </div>
    </div>
  </section>

  <section>
    <div class="spalte"><p class="rubrik">Haltung</p><h2>Woran wir uns halten</h2></div>
    <div class="grundsaetze">
      <div><h3>Weniger, dafür richtig</h3><p>Eine kleine Kollektion, die nicht jede Saison neu erfunden wird. Jedes Teil muss seinen Platz verdienen.</p></div>
      <div><h3>Bequem ist kein Kompromiss</h3><p>Weiche Stoffe, Raum zum Bewegen, keine kratzenden Etiketten. Bequemlichkeit gehört zur Qualität.</p></div>
      <div><h3>Reichtum zeigt sich im Detail</h3><p>Nicht im Logo. Im Gewicht des Stoffs, in der Naht, im Knopf, darin, wie ein Teil nach fünf Jahren aussieht.</p></div>
      <div><h3>Drei Generationen, ein Tisch</h3><p>Dieselben Stoffe und Farben für Baby, Kind und Erwachsene. Familien tragen OTIUM gemeinsam, ohne verkleidet auszusehen.</p></div>
    </div>
  </section>

  <section class="spalte">
    <p class="rubrik">Für wen</p>
    <h2>Für Menschen, die angekommen sind</h2>
    <p>OTIUM ist für Menschen, die gute Dinge kennen und das nicht zeigen müssen. Sie kaufen seltener, aber besser. Sie wollen sich zu Hause, am Wochenende und auf Reisen wohlfühlen und dabei angezogen aussehen.</p>
    <p>Und für ihre Kinder und Enkel. Wer Qualität schätzt, will sie auch für die Kleinsten: weiche, ehrliche Stoffe, die man weitergeben kann.</p>
    <p class="leise">Der Stil liegt zwischen Casual und Rich: Basics, die man zum Sonntagsfrühstück trägt und genauso ins Restaurant.</p>
  </section>

  <section>
    <div class="spalte"><p class="rubrik">Kollektion 01</p><h2>Der erste Aufguss</h2>
      <p>Elf Teile, alle aus wenigen Stoffen und in denselben Farben. Jedes Teil gibt es für die ganze Familie, wo es Sinn ergibt.</p></div>
    <div class="kollektion">
      ${kollektion.map(g => `<div class="gruppe"><h3>${g.gruppe} <span class="leise zahl">· ${g.teile.length}</span></h3><ul>${g.teile.map(([t, b]) => `<li><span>${t}</span><span>${b}</span></li>`).join('')}</ul></div>`).join('\n      ')}
    </div>
    <div class="spalte" style="margin-top:28px">
      <h3>Material</h3>
      <p>Vorschlag für den Anfang: schwere Bio-Baumwolle (Loopback und Jersey), feiner Merino und für Baby besonders weiche, ungefärbte oder schonend gefärbte Garne. Wo möglich mit nachprüfbaren Zertifikaten wie GOTS oder Responsible Wool Standard. Welche Stoffe es am Ende werden, entscheiden Muster und Lieferanten.</p>
    </div>
  </section>

  <section>
    <div class="spalte"><p class="rubrik">Farben</p><h2>Aus dem Teegarten</h2>
      <p>Fünf Töne, alle aus dem Bild unter der Çınar. Kollektionen bleiben in diesen Farben, damit alles zueinander passt, auch über Jahre.</p></div>
    <div class="farben">
      ${farben.map(f => `<div class="farbe"><div class="feld" style="background:${f.hex};color:${f.hell ? '#2e2f2b' : '#f1ede5'}"><span>${f.hex}</span></div><h3>${f.name}</h3><p>${f.text}</p></div>`).join('\n      ')}
    </div>
  </section>

  <section>
    <div class="spalte"><p class="rubrik">Schrift</p><h2>Eine klassische Antiqua, eine ruhige Grotesk</h2></div>
    <div class="schrift">
      <div><div class="probe-antiqua">Otium cum dignitate</div><p class="leise">Antiqua für den Namen, Überschriften und kurze Sätze. Im Namen immer in Versalien mit weitem Abstand. Jetzt noch Platzhalter (Cormorant Garamond). Die finale Wortmarke wird von Hand ausgeglichen.</p></div>
      <div><div class="probe-text">Schwerer Loopback, weich gewaschen.</div><p class="leise">Grotesk für alles, was gelesen wird: Produkttexte, Etiketten, Website (Platzhalter Jost). Sachlich, gut lesbar, nie laut.</p></div>
    </div>
  </section>

  <section>
    <div class="spalte"><p class="rubrik">Tonalität</p><h2>Wir sprechen, wie man im Teegarten spricht</h2>
      <p>Ruhig, warm, knapp. Wir erklären lieber das Material als das Lebensgefühl. Wir übertreiben nie.</p></div>
    <div class="ton">
      <div class="ja"><h3>So klingt OTIUM</h3><ul>
        <li>«Schwerer Loopback, innen ungeraut. Wird mit jeder Wäsche weicher.»</li>
        <li>«Für lange Sonntage.»</li>
        <li>«Gleicher Stoff, drei Grössen: für dich, dein Kind und das Baby.»</li>
        <li>«Nimm dir eine Pause.»</li>
      </ul></div>
      <div class="nein"><h3>So nicht</h3><ul>
        <li>«Der ultimative Must-have-Hoodie!!!»</li>
        <li>«Nur heute: 50 % auf alles»</li>
        <li>«Luxus pur für echte Trendsetter»</li>
        <li>Ausrufezeichen, Superlative, Countdowns</li>
      </ul></div>
    </div>
  </section>

  <section>
    <div class="spalte"><p class="rubrik">Details</p><h2>Woran man OTIUM erkennt</h2></div>
    <div class="anwendung">
      <figure><span class="etikett">${markeNeben()}OTIUM</span><figcaption>Webetikett am Saum</figcaption></figure>
      <figure><div class="anhaenger">${marke()}<b>OTIUM</b><i>Für lange Sonntage.</i></div><figcaption>Anhänger</figcaption></figure>
      <figure><span class="nackenband">otium cum dignitate</span><figcaption>Nackenband innen</figcaption></figure>
    </div>
    <div class="spalte">
      <ul class="liste">
        <li><b>Kein Logo aussen</b>, nur ein kleines gewebtes Etikett am Saum. Wer es kennt, erkennt es.</li>
        <li><b>Innen am Nacken</b> gedruckt statt eingenäht: «otium cum dignitate». Nichts kratzt.</li>
        <li><b>Knöpfe und Prägungen</b> in Löffel-Messing, wo ein Teil Metall braucht.</li>
        <li><b>Verpackung</b>: ein Baumwollbeutel in Porzellan, darin eine Karte mit «Nimm dir eine Pause.» Als Geste vielleicht ein Beutel türkischer Tee.</li>
      </ul>
    </div>
  </section>

  <section class="spalte">
    <p class="rubrik">Claim</p>
    <h2>Ein Satz für alles</h2>
    <p class="gross">Kleidung für die Musse.</p>
    <p class="leise">Alternativen: «Für lange Sonntage.» · «Die Zeit dazwischen.» · «Angekommen.»</p>
    <p class="leise">Zur Aussprache: international «O-ti-um». Im deutschsprachigen Schullatein sagt man oft «Ozium». Beides ist richtig. Für die Marke würde ich «O-ti-um» festlegen.</p>
  </section>

  <section class="spalte" style="border-bottom:0">
    <p class="rubrik">Nächste Schritte</p>
    <h2>Bevor es losgeht</h2>
    <ol class="schritte">
      <li><span><b>Marke prüfen und schützen.</b> Recherche für Bekleidung (Klasse 25) bei Swissreg, EUIPO und WIPO. Lateinische Wörter sind beliebt, darum zuerst prüfen, dann anmelden.</span></li>
      <li><span><b>Domain und Handles sichern</b>, zum Beispiel otium.ch oder mit Zusatz wie otium-studio.</span></li>
      <li><span><b>Deine Geschichte schreiben</b>, für den Platzhalter oben.</span></li>
      <li><span><b>Wortmarke finalisieren:</b> Buchstaben nachzeichnen, Abstände ausgleichen, Zeichen und Name in festen Proportionen.</span></li>
      <li><span><b>Stoffmuster bestellen</b> und die Kollektion 01 an echten Stoffen festlegen.</span></li>
    </ol>
  </section>
</div>
`

if (process.argv[2]) writeFileSync(process.argv[2], seite) // nur der Inhalt, ohne Gerüst
writeFileSync(join(hier, 'markenbuch.html'), `<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${seite}</html>\n`)
console.log('fertig: markenbuch.html')
