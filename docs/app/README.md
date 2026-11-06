# PF Admin – die native App

Die App für die Auftragsverwaltung und die Zahlen von Pfistanbul Fenster.
Gebaut wird sie mit Claude Code; dieses Dokument hält fest, was entschieden
ist und was als Nächstes kommt.

## Fahrplan

Die Stufen heissen wie die App-Version, die sie ausliefert: Version 2.0.x
ist die Auftragsverwaltung, 3.x die Zahlen. Die Nebennummer steht in
`app/package.json`, die letzte Stelle ist die Laufnummer des Builds.

| Version | Inhalt | Stand |
| --- | --- | --- |
| 1.x | MVP: Adminbereich der Webseite als App (TWA, `android/`) | ✅ |
| 2.0 | Native App: Fundament, Auftrag bearbeiten (Kontakt, Termine, Netze, Angebot, Kosten, Phase), Nachrichten A–I, Offerte als Link, Bestelltalon als PDF | ✅ (2.0.12) |
| 3.0 | Zahlen zum Arbeiten: Ausgaben erfassen, Kosten je Auftrag nachtragen, abrechnen (Entwurf → abschliessen); Auswertungen eine Ebene tiefer; Bedienung auch auf Türkisch | in Arbeit |
| 4.x | iOS (TestFlight) + Benutzerverwaltung (eigene Logins) | |

## Entscheidungen

**Expo / React Native statt Kotlin.** Ziel sind Android *und* iOS, gebaut mit
Claude Code. Expo baut iOS ohne eigenen Mac, und vor allem teilt die App die
Geschäftslogik der Webseite (`src/lib`, `src/types`) – Phasen, Preise, Kosten
werden nicht doppelt gepflegt.

**Dieselbe Paket-ID wie die Webseiten-App.** `ch.pfistanbul.admin`, gleicher
Schlüssel, Versionsnummern ab 100: Die native App installiert sich als Update
über die bisherige.

**Anmeldung mit Schlüssel statt Cookie.** Ein Passwort wie bisher; der Server
gibt der App einen Schlüssel, 30 Tage gültig, im geschützten Speicher des
Geräts. Wer das Passwort ändert, macht alle Schlüssel sofort ungültig. Die
Grundlage für eigene Logins (Version 4).

**Senden heisst: vorbereitet übergeben.** Die App öffnet WhatsApp bzw. das
Mailprogramm mit Empfänger und Text; gesendet wird dort. Danach fragt die App
«Gesendet?», und erst dann rücken Verlauf und Phase weiter. Offerten gehen
als **Link** (`pfistanbul.ch/offerte/<geheim>`) – so ist auch WhatsApp mit
Offerte vollständig vorausgefüllt. Direktes Senden über WhatsApp Business ist
bewusst nicht vorgesehen (Freigabe, Kosten).

**Bedienung Deutsch oder Türkisch, Kundentexte immer Deutsch.** Damit Ufuk
die App bedienen kann, schaltet `DE | TR` (Liste, Anmeldung) Menüs, Knöpfe,
Phasen und Hinweise um (`app/src/lib/sprache.tsx`, Wörter zuerst aus dem
Web-Admin). Nachrichten an die Kundschaft, Offerte und Quittung bleiben
Deutsch; das Blatt an Bora hat seine eigene Sprachwahl.

**Zahlen am Handy = arbeiten, nicht auswerten.** Unterwegs passieren drei
Dinge: eine Ausgabe erfassen (Beleg in der Hand), Boras echte Kosten bei
einem Auftrag nachtragen, abrechnen, wenn Geld eingegangen ist. Genau die
stehen auf der Zahlen-Seite, oben drei Zahlen (Ergebnis, wer uns, wem wir
schulden). Jahre, Sendungen und Funnel liegen unter «Auswertungen».
Abschliessen schreibt mit `abschlussSchritte` aus `src/lib/pl.ts` – derselben
Funktion wie der Web-Admin.

## Design

Klickbarer Entwurf der Auftragsverwaltung:
https://claude.ai/artifact/9CFe97yyA7WuErDt2zHgi3

- Liste statt Kacheln, Phasen als Reiter, oben **«Bald fällig»** für die
  nächsten **10 Tage**, nach Datum: Nachfassen (**5 Tage** nach dem Versand
  der Offerte), neue Eingänge, Ausmess- und Montagetermine. Heute Fälliges
  und Überfälliges ist orange hervorgehoben.
- Ein Auftrag = ein Bildschirm, jeder Block mit eigenem Stift; Phase direkt
  antippen; Kosten und Preise überall bearbeitbar.
- «Nächster Schritt» als grosser Knopf, je nach Phase.

### Die Phasen

Namen wie im Web-Admin (`src/components/admin/sprache.ts`) – die App liest
sie von dort.

| Status | Name | Bedeutet |
| --- | --- | --- |
| `neu` | Neu | eingegangen, annehmen oder absagen |
| `klaerung` | Auftrag klären | Termin, ausmessen, Netze erfassen |
| `offerte` | Angebot erstellen | Preise prüfen, Offerte verschicken |
| `zusage` | Warten auf Zusage | Offerte liegt beim Kunden – hier wird nachgefasst |
| `bestellen` | Bereit zum Bestellen | zugesagt, wartet aufs nächste Paket |
| `bora` | Bei Bora | bestellt, in Produktion oder unterwegs |
| `ausliefern` | Ausliefern | Termin, übergeben, kassieren |

### Die Vorlagen

| | Vorlage | Phase | Anhang | Danach |
| --- | --- | --- | --- | --- |
| A | Eingang bestätigen | Neu | | → Auftrag klären |
| B | Offerte senden | Angebot erstellen | Offerte | → Warten auf Zusage |
| C | Nachfassen | Warten auf Zusage, ab 5 Tagen | | |
| D | Angepasste Offerte | Angebot erstellen, Warten auf Zusage | Offerte | → Warten auf Zusage |
| E | Beim Lieferanten bestellt | Bereit zum Bestellen | | → Bei Bora |
| F | Netze unterwegs | Bei Bora | | |
| G | Netze eingetroffen | Bei Bora | | → Ausliefern |
| H | Montagetermin anfragen | Ausliefern | | |
| I | Abschluss & Bewertung | Ausliefern | Quittung | |

Der klickbare Entwurf verwendet noch kurze Phasennamen und setzt
«Offerte» mit «Offerte verschickt» gleich; massgeblich ist diese Tabelle.

### Geteilte Regeln

Was Web-Admin und App gleich tun müssen, steht in `src/lib` und ist getestet:

| Datei | Regeln | Test |
| --- | --- | --- |
| `aktionen.ts` | welcher Knopf in welcher Phase was tut | `bau/aktionen-test.mjs` |
| `netzentwurf.ts` | Netz-Entwurf ↔ Position, Preisregel, Richtpreis | `bau/preisregeln-test.mjs` |
| `angebot.ts` | Vorbelegung, Summen, Rabattdeckel, Festlegen | `bau/preisregeln-test.mjs` |
| `kostenentwurf.ts` | Kosten vorbelegen und speichern | `bau/preisregeln-test.mjs` |
| `nachrichten.ts` | Vorlagen A–I: wann, Text, Schritt nach «Gesendet?», Nachfassen | `bau/nachrichten-test.mjs` |
| `bestellblatt.ts` | Preisanfrage und Bestelltalon an Bora als HTML (→ PDF) | `bau/bestellblatt-test.mjs` |
| `pl.ts` | Erfolgsrechnung, offene Posten, Sendungen, Abrechnung (Entwurf, Abschluss) | `bau/pl-test.mjs` |
| `phasen.ts`, `bestellauftrag.ts` | Phasen, Archiv, fehlende Angaben für Bora | bestehende Tests |

## Aufbau von `app/`

```
app/
├── app.config.ts          Name, Paket-ID, Symbole, Plugins
├── metro.config.js        sieht ../src (geteilte Logik)
├── plugins/signatur.js    signiert das Release-APK
├── scripts/starttest.sh   Emulator-Test auf GitHub
└── src/
    ├── app/               Bildschirme (Expo Router: jede Datei ein Bildschirm)
    │   ├── _layout.tsx    Anmeldung oder App
    │   ├── anmelden.tsx
    │   └── (app)/         nur angemeldet
    │       ├── index.tsx          Auftragsliste
    │       └── auftrag/[id]/
    │           ├── index.tsx      ein Auftrag
    │           ├── netze.tsx      Netze bearbeiten
    │           ├── angebot.tsx    Angebot festlegen
    │           ├── kosten.tsx     Kosten (intern)
    │           ├── nachricht.tsx  Nachricht senden (Vorlagen A–I)
    │           └── blatt.tsx      Preisanfrage / Bestelltalon als PDF
    │       └── zahlen/
    │           ├── index.tsx      Arbeitsseite: Ausgabe, Abrechnen, Kosten, Ausgaben
    │           ├── ausgabe.tsx    Ausgabe erfassen / ändern
    │           ├── abrechnen.tsx  Auswahl → Entwurf → abschliessen
    │           └── …              Auswertungen, Forderungen, Schulden, Historie
    ├── lib/               API, Anmeldung, geladene Bestellungen, Hilfen
    ├── components/
    └── theme.ts           Farben (= Webseite)
```

## Offerte als Link

`pfistanbul.ch/offerte/<geheim>` zeigt der Kundschaft ihre Offerte – dasselbe
Blatt wie im Web-Admin (`Offerte.tsx`), am Handy als Karten. Ist der Auftrag
übergeben und bezahlt, steht unter demselben Link die Quittung (Vorlage I).

- Das Geheimnis (18 Zufallsbytes) legt der Server beim ersten Senden an
  (`POST /api/bestellungen?aktion=offerte-link`) und behält es: Ein
  angepasstes Angebot (Vorlage D) gilt unter demselben Link.
- Öffentlich (`GET ?aktion=offerte&g=…`) kommt nur, was auf der Offerte
  steht (`kundenfassung` in `api/bestellungen.ts`): kein Telefon, keine
  Mail, keine Kosten, keine Notiz. Erst mit festgelegten Preisen; nach einer
  Absage «nicht mehr gültig».
- Die Seite ist `noindex` und hat eine eigene Hülle (`dist/offerte.html`).

## Testen ohne Handy

Die App läuft als Web-Fassung gegen die echten API-Handler im Demo-Modus –
mit den Beispielaufträgen aus `api/_demo.ts` und einem Speicher im
Arbeitsspeicher statt Upstash:

```bash
npx vite build                 # nur für den Offerte-Link
cd app && npm run web:bauen     # App als Web-Fassung (dist-web)
npm run testserver              # http://localhost:8090, Passwort testpasswort
npm run bildschirme -- <ordner> "tippe|Marlène|01-auftrag"   # Fotos mit Playwright
```

Was es im Browser nicht gibt – PDF teilen, WhatsApp, Datumswähler, der
geschützte Speicher (dort `tresor.web.ts`) –, prüft erst das Handy.
Rückfragen (`Alert`) werden im Browser zu `confirm()`
(`rueckfragenImBrowser.web.ts`); OK nimmt den Schritt nach vorn.

## Release

Ein APK entsteht **nur auf Knopfdruck**, gesammelt für ein Release:
GitHub → Actions → «PF Admin App (nativ)» → Run workflow (Branch wählen).
Bei jedem Push läuft nur die schnelle Prüfung (`app-pruefen.yml`: Typen,
Bündel). Den Link zum Release erst weitergeben, wenn Tag und Commit
geprüft sind.

## Ausprobieren

- **Auf dem Handy:** Release `app-2.0.<n>` unter
  [Releases](https://github.com/dmaden87/pfistanbul_fenster/releases)
  herunterladen und installieren.
- **Am Computer** (mit Android Studio): `cd app && npm install && npm run android`.
