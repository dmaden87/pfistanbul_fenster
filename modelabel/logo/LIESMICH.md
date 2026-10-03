# Logo für das Modelabel – vierte Runde

Gewählt: Çay-Glas (Form nach Foto) vor einer runden Platanenkrone (çınar),
als Linie. Drei Varianten für das Basic-Premium-Segment, alle mit einer
einzigen Linienstärke. `vorschau.html` zeigt sie in 48/24/16 Pixeln, auf
einem Webetikett und auf einem Kartonanhänger.

| Datei | Idee |
|---|---|
| `runde-krone-fein.svg` | gewählte Form, feiner, eine Astgabel, Glas etwas grösser |
| `runde-krone-pur.svg` | ohne Äste, Krone reicht bis auf den Teller |
| `runde-krone-im-kreis.svg` | Krone umschliesst alles, Teller als Sehne im Kreis |

`node modelabel/logo/erzeuge.mjs` baut SVGs und Vorschau neu. Glas und
Teller stehen in `formen.mjs`, die Varianten oben in `erzeuge.mjs`.

## Die Bäume als Skizze

`baeume.html` zeigt Platane, Zypresse und Teestrauch als Zeichnung neben
der Form, die im Logo steckt. `node modelabel/logo/skizzen.mjs` baut sie neu.
Glas, Teller und Logo-Bäume liegen gemeinsam in `formen.mjs`.
