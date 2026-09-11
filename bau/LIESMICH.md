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

## Karte für die Google-Bewertung

`bewertung.mjs` erzeugt die Karte mit dem QR-Code auf unsere Google-Bewertung,
A6 bei 300 dpi, dazu den nackten Code für Aufkleber oder Rechnung. Beides
landet in `drucksachen/` und liegt nicht im Repository.

```
npm run bewertung -- "https://g.page/r/XXXXXXXXXXXX/review"
```

Die Adresse steht im Google-Unternehmensprofil unter „Rezensionen“ →
„Mehr Rezensionen erhalten“.

Zwei Dinge sind Absicht:

**Der Code entsteht hier, nicht bei einem Onlinedienst.** Ein Gratis-Generator
liefert in aller Regel eine Weiterleitung über dessen Server – die kann
abgeschaltet werden oder später Geld kosten. Gedruckt ist gedruckt; der Code
muss in fünf Jahren noch dorthin führen, wohin er heute führt. Deshalb steht
die Google-Adresse unverändert im Code.

**Der fertige Code wird wieder ausgelesen.** Das Signet sitzt mitten auf dem
Code; die Fehlerkorrektur trägt das, aber „trägt das“ ist eine Annahme. Liest
sich der gerenderte Code nicht als genau die Adresse, die hineinging, entsteht
gar keine Datei. Ohne Adresse rendert die Karte mit einem Musterbalken – wie
der ENTWURF-Balken auf dem Blatt an Bora, und aus demselben Grund.

## Prüfen

```
npm run pruefen
```

Baut und prüft danach 65 Punkte am ausgelieferten Ergebnis: Kopfangaben,
Aufbau des JSON-LD, ob jeder interne Verweis einen Knoten trifft, und ob die
Preise mit `src/data/catalog.ts` übereinstimmen. Nach jeder Preisänderung
einmal laufen lassen.

## Die Bestell-API prüfen

```
npm test
```

Vier Testläufe. Der erste fährt `api/bestellungen.ts` mit einem Speicher im
Arbeitsspeicher hoch und geht 28 Fälle durch. Zwei davon sind der eigentliche
Grund für den Testlauf:

- **Die Summe beim Ändern der Netze.** Sie wird neu gerechnet, und bei
  Einträgen aus der Zeit vor dem Feld `montageChf` muss die Montage aus der
  Differenz hergeleitet werden. Genau dort steckte ein Fehler, den der Test
  beim ersten Lauf gefunden hat: Die Herleitung geschah nach dem Austausch der
  Positionen und bezog sich damit auf die falschen Zahlen. Bei mehr Netzen als
  vorher wurde sie negativ und fiel auf null – die Montagepauschale wäre
  spurlos aus der Bestellung verschwunden, ohne Fehlermeldung.
- **`bezahlung` ist über PATCH nicht setzbar.** Der Zahlungsstand kommt allein
  von Stripe über `api/stripe-webhook.ts`. Käme er von hier durch, könnte ein
  Fehlklick eine unbezahlte Bestellung als bezahlt markieren – und sie würde
  ausgeliefert.

Der zweite prüft `src/lib/bestellauftrag.ts` – die Umrechnung von Bestellungen
in einen Auftrag an den Produzenten. Auch hier zwei Punkte, die den Testlauf
tragen:

- **Ein Set wird in seine einzelnen Netze aufgelöst.** Für das Geld ist „Set
  Mittel" eine Position mit einem Preis, für den Produzenten sind es sechs
  Netze mit sechs Massen. Beides muss gleichzeitig stimmen.
- **Fehlende Angaben werden gemeldet, nicht gefüllt.** Fehlt einem Netz die
  Rahmendicke oder die Öffnungsrichtung, entsteht kein Auftrag mit einer
  Annahme darin. Eine Lieferung aus der Türkei, die nicht passt, kostet
  Wochen; die Meldung kostet fünf Minuten.

Der dritte prüft die Margenrechnung (`bau/einkauf-test.mjs`): dass die
Montage nicht in den Warenerlös rutscht, und dass fehlende Einkaufspreise
gezählt und nicht hochgerechnet werden – eine Marge ohne Kosten sieht besser
aus als die Wirklichkeit, und das darf nie unbemerkt bleiben.

Die Testläufe brauchen keine Übersetzung: Node liest die `.ts`-Dateien mit
`--experimental-strip-types` direkt. Nur die Auflösung der Importe muss
nachgeholt werden – unter `api/` enden sie auf `.js` und meinen `.ts`, unter
`src/` haben sie gar keine Endung, weil dort sonst Vite auflöst. Beides
erledigt `bau/ts-aufloeser.mjs`, das auch `npm run pruefen` vorgeschaltet ist.

## Der Adminbereich auf Deutsch oder Türkisch

Oben in der Werkzeugleiste steht ein Schalter **DE / TR**. Grund: Ufuk
arbeitet mit derselben Liste, und seine Sprache ist Türkisch — eine
Verwaltungsmaske, die man nur halb versteht, führt zu Fehlern, die niemand
bemerkt, gerade bei Massen und Öffnungsrichtungen. Die Wahl bleibt im
Browser gespeichert.

Alle Beschriftungen stehen in `src/components/admin/sprache.ts`, ein Paar
`[deutsch, türkisch]` je Eintrag. Das ist Absicht: So sieht man beim Ändern
sofort, ob die andere Sprache nachgeführt ist, und eine schiefe Übersetzung
lässt sich an genau einer Stelle geraderücken.

Zwei Dinge folgen der Sprache **nicht**:

- **Beträge.** CHF bleibt in Schweizer Schreibweise (1'234.50), weil die
  Zahlen mit Rechnungen und Belegen übereinstimmen müssen.
- **Raumbezeichnungen** wie „Zimmer", „Bad". Das sind Daten, die wir
  eintippen, keine Beschriftungen.

Der Rahmen der Website darum herum (Kopfzeile, Fussleiste) bleibt deutsch —
das ist die Seite für die Kundschaft, nicht die Maske.

Die Sprache des **Dokuments** an den Produzenten ist davon unabhängig: Es
geht immer auf Türkisch raus, egal in welcher Sprache die Maske steht.

## Jeder Auftrag für sich

Es gibt keine Lieferrunde als eigene Sache mehr. Jeder Auftrag trägt seinen
Weg zu Bora selbst, auf seiner Karte:

- **Phase 3, Kosten klären:** „Preisanfrage an Bora anzeigen" druckt den Talon
  für genau diesen Auftrag. Boras Antwort wird unter „Kosten eintragen"
  abgetippt – je Netz der Stückpreis, dazu die Fracht. Die Zeilennummern
  sind dieselben wie auf dem Talon. Weiter geht es, sobald jedes Netz einen
  Einkaufspreis hat.
- **Phase 1, Neu:** Hier landet **jede** Bestellung, auch die aus dem
  Webshop. Fachlich müsste sie das nicht – an der Kasse ist zugesagt, Masse
  und Preis stehen im Katalog – aber der Betrieb will jede Bestellung einmal
  gesehen haben, bevor sie zu Bora geht. Katalogware trägt darum in „neu"
  einen eigenen Hauptknopf: „Geprüft – bestellen" führt direkt nach Phase 6
  und stempelt die Zusage. Der Weg über die Klärung bleibt leise daneben,
  falls in der Bemerkung doch eine Frage steht.

  Damit das hält, muss die Abbildung alter Werte wissen, wann sie sich
  heraushalten soll: Ein Datensatz mit `phaseSeit` ist von heute, sein
  Status gilt. Ohne diesen Riegel schöbe sie eine neue Katalogbestellung
  sofort wieder nach „bestellen".
- **Phase 4 und 5, Angebot und Zusage:** Verkaufspreise mit Boras Kosten
  daneben festlegen, Offerte drucken, „Offerte ist raus" – ab da wartet der
  Auftrag in „Warten auf Zusage": Zusage nach „Bestellen", Nachbessern
  zurück zum Angebot (der Haken „versendet" fällt), Absage ins Archiv.
- **Phase 6, Bestellen:** „Bestelltalon anzeigen", dann die zwei Stempel „bei
  Bora bestellt" und „unterwegs", zuletzt „angekommen" – das ist der Schritt
  nach Phase 7. Der Zoll kommt Wochen nach der Ware und wird unter „Kosten
  ändern" nachgetragen, auch noch in Phase 7.

Die Bündelung zu einer Sendung ist Organisation, kein Zustand. Was es dafür
gibt, ist das **Paket**: In Phase 6 mehrere Aufträge ankreuzen und „zu einem
Paket zusammenführen" – sie bekommen dasselbe Etikett (`P-2026-01`) und
einen gemeinsamen Bestelltalon, auf dem jeder Auftrag sein eigenes Paket mit
eigener Kennung bleibt. Das Etikett ist der ganze Zustand; „aus dem Paket
nehmen" löscht es wieder.

Die alten Runden liegen unangetastet im Speicher (`pf:lieferungen`). Gelesen
werden sie nur noch von der Abbildung alter Statuswerte in `api/_phasen.ts`:
Eine Bestellung, die gestern „neu" hiess und in einer eingefrorenen Runde
steckte, gehört nach „Kosten klären", nicht nach „Neu".

## Der Auftrag an den Produzenten

Der Talon eines Auftrags oder eines Pakets. Ob er eine Anfrage oder eine
Bestellung ist, folgt der Phase, aus der er geöffnet wurde. Gesichert wird er
über die Druckfunktion des Browsers als PDF; der Dateiname kommt aus dem
Dokumenttitel (`pfistanbul_siparis_P-2026-01`), denn beim Drucken aus
dem Browser gibt es dafür genau einen Hebel. Bewusst ohne PDF-Bibliothek – das
funktioniert auf dem Telefon genauso und kann nicht veralten.

Das Dokument hat zwei Teile, und das ist keine Doppelung: Die
**Fertigungstabelle** fasst alle Netze aller Kunden nach Bauart zusammen,
danach fertigt er. Die **Paketliste** zeigt sie je Kunde mit Raum, danach
packt er – und danach packen wir aus. Ohne die Kennung auf dem Paket ist bei
der Ankunft nicht mehr zu erkennen, welches der gleich grossen Netze zu wem
gehört.

**Die Sprache steht ausschliesslich in `src/data/produktion.ts`.** Der Auftrag
geht auf Türkisch raus — das ist die Vorwahl; Deutsch lässt sich zum Prüfen
umschalten, bevor er abgeschickt wird. Umgeschaltet wird nur, welches Feld
jeder Beschriftung genommen wird; der Aufbau des Blatts ist derselbe. Eine
Änderung an der Sprache ist ein Eintrag in dieser Datei, keine neue Fassung
des Dokuments.

Nicht übersetzt werden die **Raumbezeichnungen** in der Spalte „Pencere" —
„Wohnzimmer", „Bad", „Küche". Das sind Daten, die wir eintippen, keine
Beschriftungen. Für den Produzenten sind sie ohnehin nur Kennzeichen, die er
aufs Paket schreibt; für uns sind sie beim Auspacken die Zuordnung zum Raum,
und dort wollen wir sie auf Deutsch.

Die türkischen Zeichen (ğ, ş, ı, İ) liegen im Bereich `latin-ext`, und die
entsprechenden Schriftdateien sind eingebunden — sonst fielen genau diese
Buchstaben auf eine Systemschrift zurück, mitten im Wort.

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

## Anmelden statt warten (IndexNow)

Eine neue Seite, auf die niemand verlinkt, findet kein Crawler von selbst.
Sie kann technisch perfekt sein – steht sie in keinem Index, kann ein
KI-Werkzeug sie nicht nachschlagen. Genau daran ist unsere zweite Probe mit
Perplexity gescheitert: Die Seite war längst lesbar, aber unbekannt.

```
npm run melden
```

Meldet alle Adressen aus `src/data/site.ts` bei **Bing, Yandex, Seznam und
Naver**. **Google nimmt an IndexNow nicht teil** – dort läuft es über die
Search Console und über Geduld.

**Erst pushen, warten bis die Änderung live ist, dann melden.** Die Meldung
sagt „hier ist etwas Neues, hol es ab" – läuft sie zu früh, holen die Crawler
den alten Stand.

Der Schlüssel liegt als Datei im `public/`-Ordner und ergibt sich aus deren
Namen; eine zweite Stelle, die man beim Wechsel vergessen könnte, gibt es
nicht. Er ist **kein Geheimnis**: Die Suchmaschine holt die Datei zur
Kontrolle ab, sie muss öffentlich lesbar sein. Das Skript prüft vor dem Senden
selbst, ob sie erreichbar ist und den richtigen Inhalt hat.

## Was noch fehlt

Nichts Dringendes. Wenn eine eigene Domain kommt, siehe oben – eine Zeile.

Offen bleibt nur, ob `vercel.json` mit `cleanUrls` irgendwann durch echte
Weiterleitungen ersetzt werden sollte, falls Adressen dazukommen.
