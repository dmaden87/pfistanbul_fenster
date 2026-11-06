# PF Admin – die native App

Die App für die Auftragsverwaltung und die Zahlen von Pfistanbul Fenster.
Gebaut wird sie mit Claude Code; dieses Dokument hält fest, was entschieden
ist und was als Nächstes kommt.

## Fahrplan

| Stufe | Inhalt | Stand |
| --- | --- | --- |
| MVP | Adminbereich der Webseite als App (TWA, `android/`) | ✅ |
| **V1.0** | Fundament: Expo-Projekt, Login, Auftragsliste, Auftrag ansehen, Build auf GitHub | **in Arbeit** |
| V1.1 | Auftrag bearbeiten: Kontakt, Termine, Netze & Preise, Kosten, Phase umstellen | |
| V1.2 | Nachrichten senden: Vorlagen A–I, WhatsApp/Mail, Offerte als Link und PDF | |
| V1.3 | Zahlen: Buchhaltung mit Übersicht → Detail | |
| V2 | iOS (TestFlight) + Benutzerverwaltung (eigene Logins) | |
| V3 | offen | |

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
Grundlage für eigene Logins in V2.

**Senden heisst: vorbereitet übergeben.** Die App öffnet WhatsApp bzw. das
Mailprogramm mit Empfänger und Text; gesendet wird dort. Danach fragt die App
«Gesendet?», und erst dann rücken Verlauf und Phase weiter. Offerten gehen
als **Link** (`pfistanbul.ch/offerte/<geheim>`) – so ist auch WhatsApp mit
Offerte vollständig vorausgefüllt. Direktes Senden über WhatsApp Business ist
bewusst nicht vorgesehen (Freigabe, Kosten).

## Design

Klickbarer Entwurf der Auftragsverwaltung:
https://claude.ai/artifact/9CFe97yyA7WuErDt2zHgi3

- Liste statt Kacheln, Phasen als Reiter, «Heute zu tun» oben
  (Nachfassen **5 Tage** nach dem Versand der Offerte, neue Eingänge, Termine).
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
    │       └── auftrag/[id].tsx   ein Auftrag
    ├── lib/               API, Anmeldung, geladene Bestellungen, Hilfen
    ├── components/
    └── theme.ts           Farben (= Webseite)
```

## Ausprobieren

- **Auf dem Handy:** Release `app-2.0.<n>` unter
  [Releases](https://github.com/dmaden87/pfistanbul_fenster/releases)
  herunterladen und installieren.
- **Am Computer** (mit Android Studio): `cd app && npm install && npm run android`.
