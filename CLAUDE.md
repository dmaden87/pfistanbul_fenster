# Pfistanbul Fenster – Notizen für Claude

Insektenschutz-Plissees nach Mass, Greifensee ZH. Ein echtes Geschäft:
Bestellungen, Preise und Daten von Nachbarn hängen daran.

## Was in diesem Repository steckt

| Ordner | Was | Läuft wo |
| --- | --- | --- |
| `src/`, `index.html` | Webseite + Adminbereich (React, Vite) | Vercel |
| `api/` | Serverfunktionen: Bestellungen, Auslagen, Abrechnungen, Stripe | Vercel |
| `app/` | **Native App «PF Admin»** (Expo / React Native) | Android, später iOS |
| `android/` | Alte Webseiten-App (TWA) – wird von `app/` abgelöst | – |
| `bau/` | Build-Skripte und Tests der Webseite | lokal / CI |
| `docs/app/` | Fahrplan und Entscheidungen zur App | – |

Die Webseite ist in `README.md` ausführlich beschrieben, die App in
`docs/app/README.md`.

## Arbeitsweise

- Sprache in Code, Kommentaren, Commits und Oberfläche: **Deutsch**
  (Schweizer Schreibweise, «ss» statt «ß»). Kommentare erklären das
  **Warum**, nicht das Was.
- Kleine Schritte, je ein Pull Request mit Beschreibung. Nichts
  direkt auf den Default-Branch.
- Vor jedem Push die Prüfungen laufen lassen (unten). Was nicht geprüft
  werden konnte, ausdrücklich sagen.

## Prüfungen

```bash
# Webseite und API (im Hauptordner)
npm run lint && npm test && npm run pruefen

# App (in app/)
npx tsc --noEmit
npm run bundle:android      # bündelt den JS-Teil – findet kaputte Importe
```

`src/` geändert? Dann ist `vorgerendert/` veraltet und der Build bricht ab:
`CHROMIUM=<pfad zu chrome-headless-shell> npm run vorrendern`.

APK-Build, Emulator-Starttest und Release laufen auf GitHub
(`.github/workflows/app.yml`), weil das Android-SDK hier nicht verfügbar ist.

## Regeln für die App (`app/`)

- **Geschäftslogik nie nachbauen.** Phasen, Preise, Kosten und Abrechnung
  kommen aus `src/lib` und `src/types` der Webseite, importiert als
  `@pf/…`. App und Webseite müssen immer gleich rechnen. Was dort fehlt,
  wird dort ergänzt – mit Test in `bau/`.
- Neue Expo-Pakete mit `EXPO_OFFLINE=1 npx expo install <paket>` (die
  Expo-Server sind aus der Cloud-Umgebung nicht erreichbar; offline nimmt
  `expo install` die zur SDK passende Version aus
  `node_modules/expo/bundledNativeModules.json`).
- Expo ändert sich schnell: APIs in den installierten Paketen nachlesen
  (`node_modules/<paket>/build/*.d.ts`), nicht aus dem Gedächtnis.
- Paket-ID `ch.pfistanbul.admin` und der Signaturschlüssel bleiben **immer**
  gleich – sonst lässt sich kein Update über die installierte App spielen.
  `android/` und `ios/` in `app/` werden erzeugt (`expo prebuild`) und nie
  von Hand bearbeitet; native Einstellungen gehören in `app.config.ts` oder
  ein Plugin in `app/plugins/`.
- Anmeldung: Passwort → Schlüssel (`Authorization: Bearer …`), 30 Tage
  gültig, im SecureStore. Server-Seite: `api/_sitzung.ts`.
- Tippflächen mindestens 48 dp, Texte mindestens 13 pt, Farben aus
  `app/src/theme.ts` (= `src/styles/tokens.css`).
