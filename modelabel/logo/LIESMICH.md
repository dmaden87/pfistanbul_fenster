# Logo für das Modelabel – dritte Runde

Çay-Glas (Form nach Foto) vor einer Platane (çınar). Vier Kronen, jede als
«Reduziert» (Linie) und als «Siegel» (Kreis, Motiv ausgespart).
`vorschau.html` im Browser öffnen für alle Grössen- und Grundproben.

| Krone | Linie | Siegel |
|---|---|---|
| Runde Krone | `reduziert-cinar-rund.svg` | `siegel-cinar-rund.svg` |
| Wolkenkrone | `reduziert-cinar-wolke.svg` | `siegel-cinar-wolke.svg` |
| Drei Kreise | `reduziert-cinar-drei.svg` | `siegel-cinar-drei.svg` |
| Im Schatten | `reduziert-cinar-schatten.svg` | `siegel-cinar-schatten.svg` |

`node modelabel/logo/erzeuge.mjs` baut SVGs und Vorschau neu. Glas, Teller
und Kronen stehen in `formen.mjs`.

## Die Bäume als Skizze

`baeume.html` zeigt Platane, Zypresse und Teestrauch als Zeichnung neben
der Form, die im Logo steckt. `node modelabel/logo/skizzen.mjs` baut sie neu.
Glas, Teller und Logo-Bäume liegen gemeinsam in `formen.mjs`.
