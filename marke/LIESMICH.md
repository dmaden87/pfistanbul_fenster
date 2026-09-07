# Anzeigebild

Das Profilbild für Instagram und alles andere, was ein rundes Bildchen will.

`node marke/erzeuge.mjs` baut die Varianten ohne Schrift und legt am Schluss
`groessenprobe.png` an: alle Fassungen rund beschnitten in den Grössen, in
denen sie tatsächlich erscheinen – 176 im Profil, 96 in der Story-Leiste, 56
in Vorschlägen, 32 im Feed neben jedem Beitrag.

## Empfehlung: `profil-nurtext-1080.png`

Der Name gross, ohne Zeichen. Wer den Namen im Bild haben will, bekommt ihn so
am besten lesbar – im Profil und in der Story-Leiste.

Dahinter steckt eine Überlegung, die man leicht übersieht: Instagram schreibt
den Handle **immer** neben das Bild. Im Feed, wo nur 32 Pixel bleiben, kann
kein Name mehr gelesen werden – dort steht er ohnehin daneben. Der Name im
Bild zahlt sich genau dort aus, wo Platz ist: auf der Profilseite, auf die
jemand klickt, nachdem er einen Beitrag gesehen hat.

## Die Alternativen

| Datei | Was sie ist | Wo sie stark ist |
|---|---|---|
| `profil-wortmarke-1080.png` | Zeichen **und** Name | Wenn die Verbindung zur Website sichtbar bleiben soll. Im Profil gut lesbar, ab 96 Pixeln wird «Fenster» knapp |
| `profil-gitter-1080.png` | nur das Zeichen | Die einzige Fassung, die bis 32 Pixel hinunter klar bleibt |

Zwei weitere haben den Test nicht bestanden. Sie bleiben liegen, damit niemand
dieselbe Idee nochmals prüft:

- **`netz`** zeigt ein Fenster, dessen rechte Hälfte vom Gewebe bedeckt ist.
  Schön in gross, weil es sagt, worum es geht. Klein zerfällt das Gewebe zu
  einem grauen Fleck, und die Form liest sich eher wie ein Handy.
- **`hell`** hat cremefarbenen Grund. Fällt unter dunklen Profilbildern auf,
  verliert aber auf hellem Untergrund seinen Rand – der Kreis franst aus.

## Zwei Dinge, die den Entwurf bestimmt haben

**Instagram schneidet rund zu.** Alles in den Ecken ist weg. Der Inhalt sitzt
deshalb mit Abstand innerhalb des einbeschriebenen Kreises.

**Im Feed sind es rund 32 Pixel.** Das Zeichen der Website hat ein Gitter aus
sieben Linien; bei 32 Pixeln wäre jede davon ein Viertelpixel breit. Fürs
Profilbild ist das Gitter deshalb gröber – drei mal drei Felder statt vier mal
vier – und die Linien sind dicker. Der Rahmen ist stärker als das Innengitter,
sonst verschwimmt klein beides zu einer Fläche.

## Die Fassungen mit Schrift ändern

Sie stammen aus `marke/wortmarke.html` und werden im Browser gerendert, nicht
vom Skript. Grund: Der SVG-Rasterizer von sharp kennt die eingebettete
Fraunces nicht und setzt still eine Standardschrift ein – das Bild entsteht,
sieht aber falsch aus. Die HTML-Datei im Browser öffnen und die Fläche als
1080 × 1080 aufnehmen. Danach `node marke/erzeuge.mjs` laufen lassen, damit
die Grössenprobe die neuen Bilder mitprüft.

## Hochladen

Instagram verlangt mindestens 320 Pixel und rechnet selbst herunter; von einer
grösseren Vorlage bleibt mehr übrig. Deshalb die 1080er nehmen. Die
320er-Fassungen liegen für Dienste bereit, die kleine Dateien wollen.

## Logo als PDF

```
node marke/logo-a5.mjs
```

Erzeugt `pfistanbul-logo-a5.pdf` aus `logo-a5.html`: zwei A5-Seiten, die
erste auf dem dunklen Markengrund wie im Profil, die zweite dunkel auf Weiss
zum Ausdrucken. Wer nur eine braucht, druckt die eine Seite.

Weiss statt des cremefarbenen Markengrunds ist Absicht: Auf A5 gedruckt hiesse
Creme, Farbe über die ganze Fläche zu legen – und ein Heimdrucker trifft den
Rand nicht, es bliebe ein weisser Streifen ringsum.

**Es ist ein echtes Vektor-PDF.** Die Masse stehen in Millimetern, nicht in
Pixeln, und das Ergebnis lässt sich beliebig vergrössern – anders als die
PNG-Dateien daneben. Nachgemessen: 148 × 210 mm, keine Rasterbilder drin.

Eine Eigenheit, die man kennen sollte: Chromium bettet die Schrift als
**Type-3-Schrift** ein. Die Buchstaben liegen dabei als Zeichenprozeduren in
der Datei – sie sind also vollständig enthalten, es kann keine Ersatzschrift
einspringen, und jedes moderne Programm stellt sie richtig dar. Sehr alte
Druckvorstufen tun sich damit gelegentlich schwer. Falls eine Druckerei je
reklamiert: Dann wandelt man die Schrift in echte Pfade um, das ist eine
einmalige Sache.
