# Kampagnen-Flyer

Zwei Entwürfe für die Verteilaktion in der Überbauung Am Pfisterhölzli, je
eine A4-Seite. Quelle ist jeweils die HTML-Datei; die PDF daneben ist daraus
gedruckt.

| Datei | Entwurf |
|---|---|
| `variante-a.html` | **Preis & Klarheit.** Heller Bogen, Titel und Nutzen links, Foto rechts, darunter die Preise, dann die drei Schritte. Wenig Farbfläche, deshalb günstig im Eigendruck. |
| `variante-b.html` | **Nachbarschaft.** Foto über die ganze Breite, darunter die Gründungsgeschichte mit dem Bild von uns beiden, Preise kompakt, dunkler Fuss mit dem Code. Wirkt wärmer, braucht mehr Farbe. |

## Drucken

HTML im Browser öffnen → Strg+P → A4, Ränder «keine», Hintergrundgrafiken
einschalten → als PDF sichern oder direkt drucken.

Variante B läuft randabfallend. Wer sie in einer Druckerei bestellt, fragt
dort nach, ob 3 mm Beschnittzugabe nötig sind.

## Was wo geändert wird

- **Preise, Masse, Sets** stehen im HTML als Text. Sie stammen aus
  `src/data/catalog.ts`, sind hier aber bewusst ausgeschrieben: Ein Flyer
  wird einmal gedruckt und liegt danach ein Jahr in der Schublade, während
  sich die Seite weiterentwickelt. Vor jedem Druck einmal gegen den Katalog
  prüfen.
- **QR-Code** ist als SVG eingebettet und zeigt auf die Startseite. Bei einer
  neuen Adresse neu erzeugen, zum Beispiel mit dem Paket `qrcode`:
  `npx qrcode -o qr.svg -t svg "https://…"`. Danach gegenprüfen, ob er sich
  wirklich scannen lässt – ein unlesbarer Code macht den ganzen Flyer wertlos.
- **Schriften und Farben** kommen aus `gemeinsam.css` und sind dieselben wie
  auf der Website. Wer den Flyer im Briefkasten hatte, soll die Seite
  wiedererkennen.
- **Fotos** liegen unter `public/fotos/`. Für den Druck sind die Fassungen mit
  `-1600` gedacht; bei rund 60 mm Bildbreite ergibt das über 600 dpi.

## Vor dem Verteilen prüfen

- Stimmen die Preise noch mit `src/data/catalog.ts` überein?
- Führt der QR-Code auf die richtige Adresse, und lässt er sich mit dem Handy
  vom **gedruckten** Blatt scannen?
- Ist die Aussage zur Lieferung noch richtig, solange
  `shopConfig.operational` auf `false` steht?
