# Logo für das Modelabel – zweite Runde

Çay-Glas (Form nach Foto: breiter runder Bauch, sanfte Taille, tiefer
Untersetzer) mit einem minimalistischen Baum dahinter. Jeder Baum gibt es
als «Reduziert» (Linie) und als «Siegel» (Kreis, Motiv ausgespart).
`vorschau.html` im Browser öffnen für alle Grössen- und Grundproben.

| Baum | Linie | Siegel |
|---|---|---|
| Platane (çınar) | `reduziert-platane.svg` | `siegel-platane.svg` |
| Zypresse | `reduziert-zypresse.svg` | `siegel-zypresse.svg` |
| Teeblatt | `reduziert-teeblatt.svg` | `siegel-teeblatt.svg` |

`node modelabel/logo/erzeuge.mjs` baut SVGs und Vorschau neu. Glas, Teller
und Bäume stehen als Pfade oben im Skript.

## Die Bäume als Skizze

`baeume.html` zeigt Platane, Zypresse und Teestrauch als Zeichnung neben
der Form, die im Logo steckt. `node modelabel/logo/skizzen.mjs` baut sie neu.
Glas, Teller und Logo-Bäume liegen gemeinsam in `formen.mjs`.
