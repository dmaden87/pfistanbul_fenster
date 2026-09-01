# Pfistanbul Fenster

Webshop und Werbeseite für Insektenschutz – zugeschnitten auf die Wohnsiedlung
**Am Pfisterhölzli in Greifensee ZH**.

Die Seite verfolgt zwei Ziele gleichzeitig: Sie soll verkaufen (die vier
Fensterformate sind direkt bestellbar) und werben (der grössere Teil der Seite erklärt Nutzen,
Technik und Vertrauen). Beides teilt sich denselben visuellen Rahmen.

## Zwei Wege für Kundinnen und Kunden

| Weg | Für wen | Was passiert |
| --- | --- | --- |
| **Direktbestellung** | Bewohnerinnen und Bewohner des Pfisterhölzli | Set oder einzelne Netze → Warenkorb → Bestellformular |
| **Bestellanfrage** | Alle anderen Masse und Wohnungen | Anzahl und Masse angeben → Offerte per Mail |

Beide Wege enden in einer E-Mail an den Betreiber. Es wird nichts abgebucht und
keine Zahlung abgewickelt.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver auf http://localhost:5173
npm run build    # Typprüfung und Produktions-Build nach dist/
npm run preview  # gebauten Stand lokal ansehen
npm run lint
```

## Bestellungen empfangen – ohne die Mailadresse preiszugeben

Das ist der einzige Punkt, der vor dem Live-Gang zwingend konfiguriert werden
muss.

Die Seite hat kein Backend. Alles, was in einer `VITE_`-Variable steht, landet
im ausgelieferten JavaScript und ist für jeden lesbar – **die Mailadresse des
Betreibers darf deshalb nirgends im Code stehen**, auch nicht in einem
`mailto:`, einem versteckten Formularfeld oder einem Kommentar.

Gelöst wird das über einen Formulardienst: Die Zieladresse ist dort
serverseitig hinterlegt, im Frontend steht nur ein Schlüssel.

1. `.env.example` nach `.env` kopieren.
2. Bei [Web3Forms](https://web3forms.com) die Empfängeradresse eintragen
   (kostenlos, ohne Konto). Der Access Key kommt per Mail.
3. Key in `.env` unter `VITE_ORDER_ACCESS_KEY` eintragen.
4. `npm run build` – ab jetzt gehen Bestellungen und Anfragen an die hinterlegte
   Adresse.

Alternativ funktioniert jeder Dienst, der einen JSON-`POST` entgegennimmt, etwa
Formspree: dann `VITE_ORDER_ENDPOINT=https://formspree.io/f/<form-id>` setzen
und den Access Key leer lassen.

Ohne Konfiguration läuft die Seite im **Demo-Modus**: Der Bestellablauf ist
vollständig durchklickbar, es wird aber nichts verschickt – die Nachricht steht
stattdessen in der Browser-Konsole, und die Bestätigungsseite weist sichtbar
darauf hin.

> Hinweis zum Restrisiko: Der Access Key steht im ausgelieferten Code. Die
> Mailadresse bleibt verborgen, aber wer den Key ausliest, kann darüber
> Nachrichten an das Postfach schicken. Bei Spam lässt sich der Key beim Dienst
> jederzeit tauschen.

## Sortiment und Preise

Vier Fenstertypen, ausgemessen in der Überbauung, mit festen Preisen. Keine
Formel, keine Konfiguration – die Zahlen stammen aus dem Detailkonzept
«Preise & Kosten» vom 1.9.2026 und stehen in `src/data/catalog.ts`.

| Typ | Masse | Fläche | Preis |
| --- | --- | --- | --- |
| Bad | 117 × 82.5 cm | 0.965 m² | CHF 120 |
| Küche | 72.5 × 122 cm | 0.885 m² | CHF 120 |
| Zimmer | 160.5 × 122 cm | 1.958 m² | CHF 125 |
| Balkontüre | 84 × 206 cm | 1.730 m² | CHF 135 |

Dazu zwei Sets zum festen Zielpreis. Der ausgewiesene Rabatt wird aus der
Summe der Einzelpreise zurückgerechnet, nicht separat gepflegt:

| Set | Inhalt | Einzeln | Preis | Ersparnis |
| --- | --- | --- | --- | --- |
| Mittel | 3× Zimmer, Balkontüre, Bad, Küche | CHF 750 | **CHF 660** | CHF 90 (12.0 %) |
| Gross | 4× Zimmer, Balkontüre, Bad, Küche | CHF 875 | **CHF 750** | CHF 125 (14.3 %) |

Montage durch den Betreiber kostet CHF 15 pro Fenster, auch im Set. Der Haken
dafür sitzt im Warenkorb und rechnet über alle Netze, Sets eingeschlossen.

**Nachzuprüfen:** Beim Typ Balkontüre steht im Konzept «206 × 84 cm» unter der
Spaltenüberschrift «B × H». Als Breite × Höhe gelesen wäre die Tür 84 cm hoch;
die Bemerkung «Türhöhe» und die Fläche sprechen dafür, dass 206 cm die Höhe
ist. Im Code steht deshalb 84 cm breit × 206 cm hoch.

## Sammelbestellung ist intern

`minimumBatchNets` (25) steht in `shopConfig.ts`, erscheint aber **bewusst
nirgends auf der Seite**. Die Schwelle ist eine Kalkulationsgrösse: Erst ab dort
trägt eine Runde ihre Frachtkosten. Bei Einzelanfragen entscheidet der
Offertprozess, ob sie in eine laufende Runde passen oder einen höheren Preis
brauchen.

Was die Seite stattdessen sagt: Wir fertigen auf Bestellung und bündeln die
Bestellungen zu einer Lieferung – das ist die Preisbegründung – und den
Liefertermin nennen wir mit der Bestätigung. Eine feste Frist ab Bestelleingang
wird nirgends zugesichert.

## Pollenschutz: Option statt Behauptung

Der Pollenschutz ist auf der Seite – aber als **Gewebe-Option mit Aufpreis auf
Anfrage**, nicht als Eigenschaft des Standardnetzes.

Der Grund ist Physik, nicht Juristerei: Ein normales Insektenschutzgewebe hält
keine Pollen zurück. Blütenpollen sind 10–100 Mikrometer, die Masche 1,4 × 1,6
Millimeter – rund das Sechzigfache. Zurückgehalten werden Pollen nur von einem
beschichteten Spezialgewebe, an dem sie haften bleiben. Genau so steht es auf
der Seite; das ist zugleich das überzeugendere Verkaufsargument, weil es
erklärt statt zu behaupten.

Preis und Verfügbarkeit des Gewebes sind laut Kostenkonzept noch offen –
deshalb «auf Anfrage» statt eines bestellbaren Artikels. **Prozentzahlen
gehören nie auf die Seite**: Die verbreiteten «bis zu 99 %» sind Bestwerte der
Hersteller bei schwachem Wind, unabhängige Messungen liegen bei 51–66 %, und
Art. 13a UWG kehrt die Beweislast um.

## Deployment auf Vercel

Das Repository direkt in Vercel importieren. Der Branch
`claude/fliegennetze-webshop-planning-hqqsny` ist der Default-Branch und wird
damit automatisch als Production Branch übernommen.

- **Framework Preset:** Vite (wird erkannt)
- **Build Command:** `npm run build` · **Output Directory:** `dist`
- Eine `vercel.json` braucht es nicht: Die Seite ist eine einzelne Route,
  Rechtsseiten und Bestellstrecke laufen über den Zustand der Anwendung.

**Zwingend vor dem ersten Deploy:** Die beiden Umgebungsvariablen in Vercel
eintragen (Settings → Environment Variables). `.env` liegt nur lokal und ist
in `.gitignore`, kommt also nicht mit:

```
VITE_ORDER_ENDPOINT   = https://api.web3forms.com/submit
VITE_ORDER_ACCESS_KEY = <Access Key aus dem Web3Forms-Konto>
```

**Beide als Typ «Config» anlegen, nicht als sensitive Variable.** Vercel legt
neue Variablen standardmässig als sensitive an – verschlüsselt und nur zur
Laufzeit auf dem Server lesbar. Eine `VITE_`-Variable muss aber zur Build-Zeit
gelesen werden und landet per Definition im Browser-Bundle; Vercel weist sie
deshalb mit dem Hinweis «Remove the public framework prefix to keep this value
private» ab. Über die CLI ist das Äquivalent `--no-sensitive`.

Das ist hier unbedenklich: Der Endpunkt ist eine öffentliche API-URL, und der
Web3Forms-Key ist ein *Public Access Key*, der genau dafür gebaut ist, im
Browser zu stehen. Er erlaubt nur, eine Nachricht an das bei Web3Forms
hinterlegte Postfach zu senden, und gibt keinen Zugriff aufs Konto. Die
Mailadresse selbst steht nicht im Bundle.

Fehlen die Variablen, bricht der Bestellabschluss mit einer sichtbaren
Fehlermeldung ab und der Warenkorb bleibt erhalten – bewusst so: Eine live
geschaltete Seite darf keine Bestellung bestätigen, die niemand erhält. Nur der
ausdrückliche Wert `VITE_ORDER_ENDPOINT=demo` simuliert den Versand.

Vite liest `VITE_`-Variablen zur **Build-Zeit**. Nach dem Nachtragen also ein
Redeploy auslösen, sonst steckt im Bundle noch der alte Stand.

## Bekanntes Problem: Formularversand noch nicht verifiziert

Der Web3Forms-Schlüssel ist in `.env` hinterlegt und der Code sendet korrekt an
den Endpunkt. **Ein echter Durchlauf konnte noch nicht bestätigt werden**, weil
die Entwicklungsumgebung hinter einem Proxy liegt, der die TLS-Verbindung des
Testbrowsers nach wenigen Sekunden kappt (`ws_closed_mid_exchange` gegen
`api.web3forms.com:443`). Serverseitige Aufrufe lehnt Web3Forms grundsätzlich
ab – auch mit falschem oder ganz ohne Schlüssel kommt dieselbe 403 zurück, die
Antwort sagt also nichts über die Gültigkeit aus.

Nach dem ersten Deployment deshalb zwingend:

1. Die echte Vercel-Domain im Web3Forms-Konto hinterlegen (der Schlüssel war
   für «Localhost» aufgesetzt).
2. Eine Testbestellung über die live geschaltete Seite auslösen.
3. Prüfen, ob die Mail ankommt – und ob der Autoresponder für die
   Kundenbestätigung eingeschaltet ist. Den verlangt Art. 3 Abs. 1 lit. s
   Ziff. 4 UWG.

Geht dabei etwas schief, steht die Ursache in der Browser-Konsole: eine
fehlende Konfiguration meldet sich dort im Klartext, eine Domain-Sperre kommt
als Antwort von Web3Forms zurück.

Bis dahin bleibt der Bestellabschluss unbestätigt. Wer ohne Konfiguration
testen will, setzt `VITE_ORDER_ENDPOINT=demo`: Dann ist der Ablauf vollständig
durchklickbar, es wird nichts verschickt, und die Bestätigungsseite weist
sichtbar darauf hin.

## Was vor dem Live-Gang noch fehlt

1. **Reale Herstellerpreise je Typ** bei 25 / 50 / 75 Stück und **reale
   Frachtofferten** – beides steht im Kostenkonzept als offener Punkt. Die
   Marge des Zimmer-Netzes ist die kritische Position: Bei Ankauf +20 % und
   Fracht +30 % fällt sie auf 21 %, bei zu kleiner Sammelrunde ins Minus.
   Entscheid Zimmer-Preis CHF 125 gegen CHF 130 steht aus.
2. **MwSt-Status klären.** `shopConfig.vatRegistered` steht auf `false`, weil
   die Pflicht erst ab CHF 100'000 Jahresumsatz gilt. Ist der Betreiber
   pflichtig, auf `true` setzen – sonst ist «inkl. MwSt.» eine unrichtige
   Angabe, umgekehrt aber auch das Fehlen.
3. **Rechtsseiten ausfüllen.** Impressum, Datenschutz und AGB sind Entwürfe mit
   farbig markierten Lücken.
4. **Sich vorstellen.** Der Block in `Promises.tsx` ist ein sichtbarer
   Platzhalter für Name, Foto und ein paar eigene Sätze. Ein echter Name bringt
   in einer Siedlung mehr als jedes Gütesiegel – deshalb steht dort bewusst
   keine erfundene Person.
5. **Keine erfundenen Kundenstimmen.** Es gibt bewusst keinen
   Testimonial-Bereich. Sobald echte Rückmeldungen vorliegen, lohnt sich einer.

## Schweizer Pflichten, die schon umgesetzt sind

- **UWG Art. 3 Abs. 1 lit. s** verlangt von einem Onlineshop vier Dinge
  kumulativ. Drei davon stecken im Code: der Hinweis auf die technischen
  Schritte (Schrittanzeige im Checkout), die Möglichkeit zur Fehlerkorrektur
  vor Abgabe (Prüfseite mit «Ändern») und die vollständige Anbieterkennzeichnung
  (Impressum-Entwurf).
- **Der vierte Punkt ist noch offen**: die unverzügliche elektronische
  Bestätigung an die Kundschaft. Das braucht einen Autoresponder beim
  Formulardienst – Web3Forms und Formspree können das, bitte einschalten.
- **Ein Konflikt bleibt bestehen** und ist eine Entscheidung des Betreibers:
  Dasselbe Gesetz verlangt die Kontaktadresse «einschliesslich derjenigen der
  elektronischen Post». Eine E-Mail-Adresse muss also im Impressum als Text
  stehen; ein Kontaktformular genügt nicht. Auflösen lässt sich das mit einer
  Alias-Adresse (etwa `info@…`), die auf das private Postfach weiterleitet: Die
  Alias steht im Impressum, die private Adresse taucht nirgends auf.
- **Preisbekanntgabeverordnung**: Alle Preise sind Endpreise in CHF, die
  Lieferkosten stehen auf derselben Seite wie das Angebot. Der Mengenrabatt
  erscheint als eigene Zeile im Warenkorb, nicht als durchgestrichener Preis –
  durchgestrichene Preise gelten als Vergleichspreise und brauchen einen
  dokumentierten Preisverlauf.
- **Art. 40a ff. OR**: Wird ein Vertrag über mehr als CHF 100 bei der
  Kundschaft zu Hause abgeschlossen – etwa nach einem Ausmesstermin –, besteht
  ein Widerrufsrecht von 14 Tagen. Es entfällt, wenn der Termin ausdrücklich
  gewünscht wurde; genau das hält die Checkbox im Anfrageformular fest.

## Aussagen, die nicht verändert werden sollten

Zwei Formulierungen sind das Ergebnis einer Faktenprüfung und lauterkeitsrechtlich
heikel, wenn man sie zuspitzt:

- **Pollen.** Die Schutzwirkung kommt von einer Beschichtung, an der Pollen
  haften – nicht von einer feineren Masche. Prozentangaben wie «bis zu 99 %»
  sind Bestwerte der Gewebehersteller bei schwachem Wind; unabhängige Messungen
  liegen deutlich darunter. Ohne zertifiziertes Gewebe gilt: keine Zahl, kein
  «filtert», nur «reduziert».
- **Kleintiere.** Standardgewebe hält Mücken, Fliegen und Wespen ab – aber weder
  Gnitzen und Thripse noch das Gewicht einer Katze. Beides steht deshalb
  ausdrücklich auf der Seite.

## Aufbau

```
src/
├── components/
│   ├── layout/      Header, Footer
│   ├── sections/    Die Abschnitte der Startseite plus Rechtsseiten
│   ├── shop/        Warenkorb-Panel
│   └── forms/       Bestellung und Sonderanfertigung
├── data/
│   ├── catalog.ts    Überbauungen mit Fenstertypen und Sets, Gewebe,
│   │                 Richtpreisspanne                    ← hier pflegen
│   └── shopConfig.ts MwSt, Montage, Sammelmenge (intern) ← und hier
├── lib/             Preislogik, Formatierung, Validierung, Versand
├── hooks/useCart.ts Warenkorb, im Browser gespeichert
└── styles/          Design-Tokens und Grundlagen
```

Der Warenkorb liegt im `localStorage` des Besuchers und verlässt dessen Gerät
nicht. Es gibt kein Tracking, keine Analyse-Werkzeuge und keine Cookie-Banner.
