# Titelblatt

Das Titelblatt von Pfistanbul Fenster als Bilddatei: **A4 hoch, 2480 × 3508
Punkte, 300 dpi, JPEG**. So gross, dass es gedruckt werden kann, und klein
genug, um es zu verschicken.

```bash
cd medien/titelblatt
node titelblatt.mjs            # alle Motive
node titelblatt.mjs tuere      # nur eines
```

Gebraucht wird nur Chromium – kein ffmpeg, kein ImageMagick, kein `npm
install`.

## Die zwei Fassungen

| Datei | Motiv | Wofür |
|---|---|---|
| `titelblatt-tuere.jpg` | Die montierte Balkontüre, Ufuk an der Türe | Der Normalfall. Man sieht in einem Blick, was wir machen, und es steht ein Mensch drauf. |
| `titelblatt-falten.jpg` | Faltenwurf und Rahmen, ohne Person | Wenn es ruhig und sachlich sein soll – eine Offerte, eine Beilage, etwas neben anderen Blättern. |

Ein drittes Motiv steckt im Skript (`schiene`, die Unterschiene mit dem
Aufkleber) und ist **absichtlich nicht gebaut**: Auf der Schiene klebt der
echte Schriftzug, und der kommt neben dem gesetzten Schriftzug zu liegen.
Derselbe Name zweimal nebeneinander, in zwei Grössen. Wer das Motiv will,
braucht zuerst einen anderen Ausschnitt.

## Was drauf steht

Zeichen oben links, unten die Marke, die Sparte, ein Strich, das Versprechen,
zuletzt eine ruhige Zeile mit Ort und Adresse. Kein Preis: Ein Titelblatt
nennt, wer wir sind, nicht was es kostet.

Schrift und Farben kommen aus dem Projekt – Fraunces und Inter aus
`public/fonts`, das Grün und die Minze aus `src/styles/tokens.css`, das
Zeichen ist dieselbe Zeichnung wie `public/favicon.svg`. Ändert sich die
Marke auf der Webseite, gehört sie hier nachgeführt.

## Warum es so gebaut ist

**Chromium statt Bildwerkzeug.** Die Schriften liegen als woff2 im Projekt.
Nur der Browser liest die; ImageMagick und ffmpeg können TTF und OTF. Ein
Titelblatt in einer fremden Schrift ist ein fremdes Titelblatt. Denselben Weg
geht das Reel nebenan.

**Über das DevTools-Protokoll statt `--screenshot`.** Der Schalter kann nur
PNG. Gefragt war eine Fotodatei, und JPEG gibt der Browser nur über
`Page.captureScreenshot`. Dort lässt sich ausserdem `clip.scale` setzen: Die
Seite wird in doppelter Auflösung gerastert statt nachträglich
hochgerechnet – Schrift und Linien kommen echt bei 300 dpi heraus.

**Die Auflösung steht im Dateikopf.** Chromium schreibt „1:1 ohne Einheit".
Dann rechnet ein Druckprogramm mit 72 dpi, und aus A4 wird ein Plakat. Das
Skript setzt die drei Zahlen im JFIF-Segment auf 300 dpi.

**Die Fotos sind 1932 × 2576 gross** und werden auf A4 bei 300 dpi um gut ein
Drittel vergrössert. Auf Armlänge sieht man das nicht; wer das Blatt als
Plakat drucken will, fotografiert das Motiv vorher neu.
