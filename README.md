# Pfistanbul Fenster

Webshop und Werbeseite für Insektenschutz – zugeschnitten auf die Wohnsiedlung
**Am Pfisterhölzli in Greifensee ZH**.

Die Seite verfolgt zwei Ziele gleichzeitig: Sie soll verkaufen (Standardgrössen
sind direkt bestellbar) und werben (der grössere Teil der Seite erklärt Nutzen,
Technik und Vertrauen). Beides teilt sich denselben visuellen Rahmen.

## Zwei Wege für Kundinnen und Kunden

| Weg | Für wen | Was passiert |
| --- | --- | --- |
| **Direktbestellung** | Bewohnerinnen und Bewohner des Pfisterhölzli | Wohnungstyp wählen → passendes Netz-Paket → Warenkorb → Bestellformular |
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

## Preise: zwei Zahlen, eine Formel

Es gibt keine handgetippte Preisliste. Jeder Preis entsteht aus

```
(Grundpreis + (Quadratmeterrate + Gewebeaufschlag) × m²) × Faktor der Bauart
```

aufgerundet auf volle fünf Franken. In `src/lib/pricing.ts` stehen
`BASE_CHF = 39` und `RATE_CHF_PER_M2 = 85` – über diese beiden Zahlen lässt
sich der ganze Shop neu bepreisen. Die Faktoren der Bauarten (Spannrahmen 0.65,
Plissee Fenster 1.00, Plissee Balkontür 1.35) stehen in `src/data/catalog.ts`.

Der flächenunabhängige Grundpreis macht kleine Elemente pro Quadratmeter teurer
als grosse. Das ist Absicht und ehrlich: Ein kleiner Rahmen braucht gleich viele
Handgriffe wie ein grosser.

Positionierung: Ein Plissee 100 × 120 cm kostet hier CHF 145. Im Baumarkt liegt
ein Bausatz zum Selberzuschneiden bei rund CHF 100, beim Fachbetrieb beginnt ein
vergleichbares Plissee bei mehreren hundert Franken. Unter dem Baumarktpreis zu
liegen wäre kein Vorteil – es würde das Passgenauigkeitsversprechen
unglaubwürdig machen.

## Der Pollenschutz ist bewusst abgeschaltet

`shopConfig.pollenEnabled` steht auf `false`. Solange das gilt, erscheinen die
Gewebeoption, der Vorteilstext, die FAQ-Antwort und die Tabellenzeile zum
Pollenschutz nirgends auf der Seite.

Der Grund: Ein normales Insektenschutzgewebe hält keine Pollen zurück – Pollen
sind rund sechzigmal kleiner als die Masche. Zurückgehalten werden sie nur von
einem beschichteten Spezialgewebe, an dem sie haften bleiben. Ohne das
Datenblatt eines solchen Gewebes wäre jede Pollenaussage nach UWG eine
unrichtige Angabe, und Art. 13a UWG kehrt die Beweislast um: Im Streitfall
müsste der Betreiber die Richtigkeit beweisen.

Sobald Handelsname, Maschenweite und Herstellerdatenblatt vorliegen: Schalter
auf `true`, und die ganze Pollen-Geschichte erscheint. Prozentzahlen gehören
auch dann nicht auf die Seite – die verbreiteten «bis zu 99 %» sind Bestwerte
der Hersteller bei schwachem Wind, unabhängige Messungen liegen deutlich
darunter.

## Was vor dem Live-Gang noch fehlt

Diese Punkte sind im Code als Kommentar markiert und bewusst nicht erfunden:

1. **Fenstermasse erheben.** `src/data/catalog.ts` enthält marktübliche
   Schweizer Fensterformate, keine Messung in der Siedlung. Für das Bausystem
   Am Pfisterhölzli gibt es keine öffentlich belegten Masse, und die Fassaden
   wurden ab 1993 etappenweise saniert – je Haus können andere Profile verbaut
   sein. Die Seite formuliert deshalb «typisches Format für …» statt einer
   Zusicherung und bittet ausdrücklich ums Nachmessen.
2. **Zuordnung Wohnungstyp → Fenster prüfen** (ebenfalls `catalog.ts`). Die
   Wohnungstypen (2 bis 5.5 Zimmer plus Attika) sind belegt, die Anzahl Fenster
   je Typ ist geschätzt.
3. **Grundpreis und Quadratmeterrate rechnen.** CHF 39 und CHF 85 sind
   Positionierungsannahmen aus recherchierten Marktspannen, keine Kalkulation.
   Gegen echte Einkaufspreise, Arbeitszeit und Wunschmarge prüfen. Dasselbe gilt
   für die Rabattstaffel: Bei einem Grundpreis von CHF 39 pro Element frisst ein
   Rabatt von 12 % einen erheblichen Teil davon.
4. **Gewebedaten prüfen.** Maschenweite und offene Fläche in `catalog.ts` sind
   Richtwerte des Marktes, nicht das Datenblatt des eingekauften Materials. Vor
   der Veröffentlichung ersetzen. Markennamen wie Transpatec, Polltec oder
   Petscreen nur verwenden, wenn genau dieses Material verbaut wird.
5. **Beim Lieferanten abfragen, was fertigbar ist.** Davon hängt ab, wo die
   Grenze zwischen Direktbestellung und Anfrage wirklich liegt.
6. **Rechtsseiten ausfüllen.** Impressum, Datenschutz und AGB sind Entwürfe mit
   farbig markierten Lücken.
7. **Sich vorstellen.** Der Block in `Promises.tsx` ist ein sichtbarer
   Platzhalter für Name, Foto und ein paar eigene Sätze. Ein echter Name bringt
   in einer Siedlung mehr als jedes Gütesiegel – deshalb steht dort bewusst
   keine erfundene Person.
8. **Keine erfundenen Kundenstimmen.** Es gibt bewusst keinen
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
│   ├── catalog.ts   Bauarten, Gewebe, Standardmasse, Wohnungstypen ← hier pflegen
│   └── shopConfig.ts MwSt, Fristen, Garantie, Pollen-Schalter      ← und hier
├── lib/             Preislogik, Formatierung, Validierung, Versand
├── hooks/useCart.ts Warenkorb, im Browser gespeichert
└── styles/          Design-Tokens und Grundlagen
```

Der Warenkorb liegt im `localStorage` des Besuchers und verlässt dessen Gerät
nicht. Es gibt kein Tracking, keine Analyse-Werkzeuge und keine Cookie-Banner.
