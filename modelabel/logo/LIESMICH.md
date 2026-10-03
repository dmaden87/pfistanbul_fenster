# Logo für das Modelabel – erste Runde

Sechs Vorschläge, alle vom klassischen türkischen Çay-Glas (ince belli) auf dem
Untersetzer ausgehend. `vorschau.html` im Browser öffnen: dort stehen alle
Zeichen gross, in 64/32/16 Pixeln, auf dunklem und teerotem Grund und neben
einem Namen, den man live ändern kann.

| Datei | Idee |
|---|---|
| `a-silhouette.svg` | Glas und Teller als volle Fläche |
| `b-linie.svg` | durchgehende Kontur |
| `c-tee.svg` | Kontur, mit Tee in «tavşan kanı»-Rot gefüllt |
| `d-siegel.svg` | Kreis, Glas ausgespart (Knopf, Anhänger, Profilbild) |
| `e-dampf.svg` | Silhouette mit einer Dampflinie |
| `f-reduziert.svg` | nur die Glasseiten und ein Tellerstrich |

`node modelabel/logo/erzeuge.mjs` baut SVGs und Vorschau neu. Die Formen
stehen als Pfade oben im Skript (`GLAS`, `TELLER`).
