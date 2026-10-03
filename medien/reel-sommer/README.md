# Reel „Sommer"

Ein Instagram-Reel aus dem Material in `../roh`: 1080 × 1920, rund 14 Sekunden,
mit Ton.

```bash
cd medien/reel-sommer
npm install ffmpeg-static     # einmalig, siehe unten
./bau.sh                      # Ergebnis: arbeit/reel-sommer.mp4
```

Im Repository liegen **nur der Bauplan und das Rohmaterial**. Das fertige Reel
und alle Zwischenschritte entstehen in `arbeit/` und sind nicht eingecheckt –
sie fallen in einer Minute wieder an, und eine Videodatei im Verlauf bleibt für
immer. Wer das Reel braucht, baut es.

## Der Ablauf

| Zeit | Bild | Text |
|---|---|---|
| 0,0 – 2,5 s | Das Plissee wird über die Balkontüre gezogen | **D'Türe blibt offe.** / *Den ganzen Sommer.* |
| 2,5 – 4,7 s | Makro des feinen Gewebes, langsam hinein | **Feines Gewebe.** / *Vo wiitem unsichtbar.* |
| 4,7 – 6,9 s | Zwei Plissees mit Faltenwurf und Rahmen | **Nach Mass.** / *Für jedes Fenster.* |
| 6,9 – 8,8 s | Das Plissee wird wieder geöffnet | **Luft ine.** / *Alles andere bliibt dusse.* |
| 8,8 – 11,2 s | Die Unterschiene mit dem Aufkleber | — |
| 11,2 – 13,8 s | Abspann | Marke, Ort, Preis als Fussnote |

Die Positionierung folgt dem, was wir an den früheren Reels gelernt haben: erst
das Bedürfnis, der Preis zuletzt und klein. Deshalb steht „ab CHF 100" im
Abspann in grauer Schrift und nicht als Argument im Bild.

## Was beim Bauen wichtig ist

**ffmpeg.** Das im Container mitgelieferte (aus den Playwright-Browsern) kann
nur WebM und hat überhaupt keine Decoder – damit lässt sich dieses Material
nicht anfassen. `npm install ffmpeg-static` liefert eine volle Fassung; das
Skript findet sie von selbst oder nimmt ein System-ffmpeg.

**HDR.** Die Aufnahme ist HEVC in 10 Bit nach HLG. Ohne Tonwertabbildung nach
SDR wird das Bild blass und grau. Der Umweg über linear und zurück nach bt709
steht im Skript und ist der erste Schritt.

**Die Schriften** kommen aus `public/fonts` und werden in Chromium gesetzt –
dieselben wie auf der Webseite. `drawtext` von ffmpeg kann das nicht: Es liest
nur TTF und OTF, unsere Schriften liegen als woff2. Eine Werbung in einer
anderen Schrift als die Seite, auf die sie führt, ist eine fremde Werbung.

**Der Ton** ist bewusst karg. Das Beste daran ist das echte Geräusch des
Plissees auf der Schiene, und das steckt in der Originalaufnahme; darunter
liegt nur ein ruhiger Grundton, der die Fotostellen füllt. Wer das Reel teilt,
legt oft eigene Musik darüber – ein ausgearbeitetes Stück wäre dann weg, ein
Grundton stört nicht und fehlt auch nicht.

## Die Dateien

- `bau.sh` – der ganze Ablauf, von der Tonwertabbildung bis zur fertigen Datei
- `karten.mjs` – die Textkarten, in Chromium gesetzt, durchsichtig
- `bett.mjs` – der Klangteppich, gerechnet als WAV
