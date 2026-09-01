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

## Was vor dem Live-Gang noch fehlt

Diese Punkte sind im Code als Kommentar markiert und bewusst nicht erfunden:

1. **Fenstermasse nachmessen.** `src/data/catalog.ts` enthält plausible, aber
   nicht erhobene Masse. Das Versprechen «wir kennen Ihre Fenster» trägt die
   ganze Seite – ein einziger Fehlkauf beschädigt es in einer Siedlung mit
   direkter Nachbarschaftskommunikation überproportional.
2. **Zuordnung Wohnungstyp → Fenster prüfen** (ebenfalls `catalog.ts`). Die
   Wohnungstypen (2 bis 5.5 Zimmer plus Attika) sind belegt, die Anzahl Fenster
   je Typ ist geschätzt.
3. **Preise kalkulieren.** Die Preisleiter orientiert sich am Schweizer Markt
   (Baumarkt-Niveau als Untergrenze, Fachanbieter als Obergrenze), ist aber
   nicht gegen echte Einkaufspreise gerechnet.
4. **Gewebedaten prüfen.** Die Tabelle in `src/components/sections/MeshTable.tsx`
   nennt marktübliche Richtwerte. Vor der Veröffentlichung gegen das Datenblatt
   des tatsächlich eingekauften Gewebes ersetzen. Markennamen wie Transpatec,
   Polltec oder Petscreen nur verwenden, wenn genau dieses Material verbaut wird.
5. **Rechtsseiten ausfüllen.** Impressum, Datenschutz und AGB sind Entwürfe mit
   farbig markierten Lücken. Eine Anbieterkennzeichnung ist in der Schweiz für
   Verkaufsseiten Pflicht (UWG Art. 3 Abs. 1 lit. s).
6. **Sich vorstellen.** Der Block in `Promises.tsx` ist ein sichtbarer
   Platzhalter für Name, Foto und ein paar eigene Sätze. Ein echter Name bringt
   in einer Siedlung mehr als jedes Gütesiegel – deshalb steht dort bewusst
   keine erfundene Person.
7. **Keine erfundenen Kundenstimmen.** Es gibt bewusst keinen
   Testimonial-Bereich. Sobald echte Rückmeldungen vorliegen, lohnt sich einer.

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
├── data/catalog.ts  Bauarten, Standardgrössen, Wohnungstypen  ← hier pflegen
├── lib/             Preislogik, Formatierung, Validierung, Versand
├── hooks/useCart.ts Warenkorb, im Browser gespeichert
└── styles/          Design-Tokens und Grundlagen
```

Der Warenkorb liegt im `localStorage` des Besuchers und verlässt dessen Gerät
nicht. Es gibt kein Tracking, keine Analyse-Werkzeuge und keine Cookie-Banner.
