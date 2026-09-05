# Maschinenlesbar

Was hier liegt, ist nicht für Menschen gedacht – sondern für Suchmaschinen und
für die Crawler der KI-Werkzeuge.

## Warum

Wir haben die Probe gemacht: Perplexity wurde wie von einem Kaufinteressenten
nach unserem Angebot gefragt. Die Antwort fiel vernichtend aus, und zwar nicht,
weil das Angebot schlecht wäre – das Werkzeug konnte schlicht **nichts** lesen:
weder Impressum noch Preise noch Zahlungsarten noch Garantien.

Der Grund steht in einer Zahl. Die ausgelieferte `index.html` war **1'027 Bytes**
gross, und ihr Rumpf bestand aus einer einzigen leeren Zeile:

```html
<body><div id="root"></div></body>
```

Die **3'274 Wörter**, die ein Mensch auf der Seite liest, entstehen erst, wenn
ein Browser das JavaScript ausführt. Google rendert nach; die Crawler der
KI-Werkzeuge tun das in aller Regel nicht. Sie holen die Datei und lesen, was
drinsteht – bei uns also den Titel und einen Satz.

Nicht die Ursache waren übrigens: ein `noindex` (gibt es nicht) oder eine
sperrende `robots.txt` (gab es gar nicht, und eine fehlende bedeutet «alles
erlaubt»). Uns hat niemand ausgesperrt. Es war nur nichts da.

## Was jetzt danebenliegt

`maschinenlesbar.ts` ist ein Vite-Plugin und erzeugt beim Bauen drei Dinge:

| | |
|---|---|
| **JSON-LD** im Kopf der Seite | Organisation, Website, Produkte mit Preisen, Montage als Leistung, alle häufigen Fragen |
| **`sitemap.xml`** | heute nur die Startseite – die Seite hat noch keine weiteren Adressen |
| **`robots.txt`** | sperrt niemanden aus, zeigt auf die Sitemap, hält Crawler von `/api/` fern |

Dazu Open-Graph-Angaben, damit ein geteilter Link nicht als grauer Kasten
erscheint, und ein `canonical`-Verweis.

**Das Entscheidende: Es wird erzeugt, nicht gepflegt.** Alle Zahlen stammen aus
`src/data/` – denselben Dateien, aus denen die Seite ihre Anzeige speist. Eine
von Hand geschriebene zweite Fassung würde spätestens bei der nächsten
Preisänderung etwas anderes behaupten als die Seite selbst, und ein falscher
Preis in maschinenlesbarer Form ist schlimmer als gar keiner.

Zwei Dinge stehen bewusst **nicht** drin:

- **Keine Mehrwertsteuerangabe.** Wir sind nicht steuerpflichtig. `true` würde
  eine enthaltene Steuer behaupten, `false` eine erwarten lassen, die noch
  dazukommt. Weglassen ist die einzige richtige Angabe.
- **Keine Lieferkosten.** Innerhalb der Überbauung ist die Lieferung frei,
  ausserhalb läuft sie über die Offerte. Eine pauschale Zusage wäre falsch.

Die Verfügbarkeit steht auf `PreOrder`, solange `shopConfig.operational` false
ist. Das ist die ehrliche Angabe: Wir nehmen Bestellungen entgegen und liefern
später. `InStock` wäre gelogen – wir haben bewusst kein Lager.

## Vorschaubild

`vorschau.html` + `vorschau.mjs` erzeugen `public/vorschau.jpg` im Format
1200 × 630 – das Bild, das erscheint, wenn jemand den Link in einem Chat teilt.

Über den Browser gerendert und nicht über sharp, weil librsvg eingebettete
woff2-Schriften stillschweigend ignoriert; der Text käme in einer Ersatzschrift
heraus, ohne dass etwas fehlschlägt. Ausführlicher steht das in
`marke/LIESMICH.md`.

Gerendert wird mit **900 Pixel Fensterhöhe und danach auf 630 zugeschnitten**.
Bei einem Fenster von genau 1200 × 630 skaliert Chromium die Darstellung auf
rund 87 Prozent – das Preisband lief unten aus dem Bild, ohne dass irgendetwas
fehlschlug.

```
npm run vorschau
```

## Prüfen

```
npm run pruefen
```

Baut und prüft danach 25 Punkte am ausgelieferten Ergebnis: Kopfangaben,
Aufbau des JSON-LD, ob jeder interne Verweis einen Knoten trifft, und ob die
Preise mit `src/data/catalog.ts` übereinstimmen. Nach jeder Preisänderung
einmal laufen lassen.

## Wenn eine eigene Domain dazukommt

Nur `adresse` in `src/data/site.ts` ändern und neu bauen. Alles Weitere –
Sitemap, canonical, Open Graph, die Kennungen im JSON-LD – leitet sich daraus
ab.

## Echte Adressen und Vorabrendern

Vorher war die ganze Seite **eine einzige Adresse** mit umschaltbaren
Ansichten. `/impressum` antwortete mit 404, `/agb` auch. Selbst ein Werkzeug,
das JavaScript ausführt, konnte unser Impressum weder verlinken noch zitieren.

Eine eigene Adresse haben jetzt die Startseite und die drei rechtlichen
Seiten. Warenkorb, Bestellablauf und Adminbereich bewusst **nicht**: Die
hängen an Warenkorbinhalt, Anmeldung und der Rückkehr von Stripe. Jede weitere
Adresse wäre ein weiterer Weg, auf dem der funktionierende Bestellablauf
kaputtgehen kann – und für eine Suchmaschine gibt es dort nichts zu holen.
Sie laufen weiter unter `/`.

`vorrendern.mjs` baut eine frische Hülle, ruft jede Adresse einmal im Browser
auf und legt das fertige HTML ab.

```
npm run vorrendern
```

**Warum über den Browser und nicht serverseitig:** Ein echter Browser hat ein
`window`, ein `document` und einen `localStorage`. Damit entfällt die ganze
Fehlerklasse, an der serverseitiges Rendern sonst hängt.

**Warum das für Menschen nichts ändert:** `main.tsx` benutzt `createRoot`,
nicht `hydrateRoot`. Ein echter Browser wirft das vorgerenderte Markup weg und
baut die Seite auf wie bisher. Es gibt kein Abgleichen zwischen vorgerendertem
und echtem Baum – und damit auch nicht die Fehlerklasse, bei der beide
auseinanderlaufen und es flackert. Belegt ist das mit Aufnahmen der ganzen
Seite vor und nach dem Umbau, bei 1440 und bei 390 Pixel Breite.

**Warum das Ergebnis im Repository liegt (`vorgerendert/`):** Auf den
Bauservern von Vercel gibt es keinen Browser. Gerendert wird hier, eingesetzt
wird dort – von `vorgerendert.ts`, genau wie die Flyer-PDFs und die
Instagram-Bilder auch hier erzeugt und eingecheckt werden.

Die Gefahr dabei ist eine **veraltete Kopie**: Ändert jemand den Code, ohne neu
zu rendern, zeigt die abgelegte Datei auf Bundle-Dateien, die es nicht mehr
gibt – die Seite bliebe weiss. `vorgerendert.ts` vergleicht deshalb die
Verweise und lässt den Build lieber scheitern, als das auszuliefern. Wer diese
Fehlermeldung sieht, führt `npm run vorrendern` aus und checkt das Ergebnis
mit ein.

Zwei Fallen, die beim Bauen Zeit gekostet haben und in den Dateien
dokumentiert sind:

- `--virtual-time-budget` **hängt** an der Endlos-Animation im Hero. Ohne den
  Schalter gibt Chromium den Baum nach dem Ladeereignis aus, und das genügt.
- Die Ausgabe muss in eine **Datei** gehen, nicht in eine Pipe. Chromium
  startet Kindprozesse, die den Ausgabekanal erben und offen halten; bei einer
  Pipe wartet Node danach ewig auf ein Ende, das nie kommt.

Weil sich auf ein Ladeereignis kein Verlass gründen lässt, prüft der Renderer
für jede Seite ein Stück Text, das dort stehen **muss**. Fehlt es, bricht der
Lauf ab, statt eine halb gerenderte Datei einzuchecken.

## Was noch fehlt

Nichts Dringendes. Wenn eine eigene Domain kommt, siehe oben – eine Zeile.

Offen bleibt nur, ob `vercel.json` mit `cleanUrls` irgendwann durch echte
Weiterleitungen ersetzt werden sollte, falls Adressen dazukommen.
