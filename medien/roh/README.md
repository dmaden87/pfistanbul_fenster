# Rohmaterial

Originalaufnahmen für Webseite, Instagram und Werbung. **Unbearbeitet** – was
hier liegt, kommt so aus der Kamera und wird nie überschrieben. Zuschnitte,
Umwandlungen und Montagen entstehen daraus und landen woanders.

## Warum das hier im Repository liegt

Die `.gitignore` hält `bilder-original/` bewusst draussen: Fotos für die
Webseite sind mehrere Megabyte gross, gehören nicht in den Browser, und aus
ihnen erzeugt `npm run bilder` die Fassungen in `public/fotos/`. Diese Regel
gilt weiter.

Dieser Ordner ist etwas anderes. Er ist **das Archiv**, nicht die Quelle für
den Bildbau. Der Grund ist unromantisch: Die Aufnahmen entstehen auf dem
Telefon und kommen über eine Cloud-Sitzung herein, deren Container nach
Stunden verschwindet. Ohne Ablage im Repository wäre das Material beim
nächsten Mal weg und müsste neu hochgeladen werden – und irgendwann hätte
niemand mehr das Original, sondern nur noch den dritten Export des zweiten
Zuschnitts.

Was daraus für die Webseite wird, gehört nach `public/fotos/` und entsteht
über `npm run bilder`. Hier wird nichts gelöscht und nichts ersetzt.

Zwei Bilder aus diesem Ordner stehen inzwischen auf der Webseite. Sie sind
in `scripts/bilder.mjs` eingetragen und zeigen mit `ordner: 'medien/roh'`
hierher – die älteren Webseiten-Fotos liegen weiterhin in `bilder-original/`,
das nicht im Repository ist.

## Was drin ist

| Datei | Motiv | Technik |
|---|---|---|
| `gewebe-fein-falten.jpg` | Feines Gewebe, Rautengeflecht, Falten im Streiflicht | 1932 × 2576, 3:4 |
| `gewebe-grob-falten.jpg` | Grobes Gewebe, Quadratgitter, Falten | 1932 × 2576, 3:4 |
| `balkontuere-montiert-person.jpg` | Montierte Balkontüre, jemand öffnet sie | 1932 × 2576, 3:4 |
| `plissees-angelehnt-falten.jpg` | Zwei Plissees angelehnt, Faltenwurf und Rahmen | 1932 × 2576, 3:4 |
| `unterschiene-logo.jpg` | Unterschiene mit Pfistanbul-Aufkleber, Parkett | 2576 × 1932, 4:3 |
| `fenster-aussicht-wiese.jpg` | Blick durch das geschlossene Netz auf Baum, Wiese und Himmel | 1932 × 2576, 3:4 |
| `musterbuch-profile.jpg` | Rahmenprofile in mehreren Farben auf dem Musterbuch | 1930 × 2576, 3:4 |
| `musterbuch-gewebe-farben.jpg` | Musterbuch aufgeschlagen: Gewebe- und Farbmuster | 2576 × 1932, 4:3 |
| `balkontuere-bedienen.mov` | Plissee der Balkontüre wird zugezogen und wieder geöffnet | 6,6 s |
| `lieferung-pakete.mov` | Schwenk über die angekommene Sendung, Pakete auf dem Boden | 5,7 s |
| `grossnetz-zuziehen.mov` | Grosses zweiteiliges Netz, an die Wand gelehnt, wird ganz zugezogen | 8,4 s |

Ursprüngliche Dateinamen der Videos: `IMG_0322.mov` (Bedienen),
`IMG_0309.mov` (Lieferung) und `IMG_0324.mov` (Grossnetz).

## Technisches zu den Videos

Alle drei gleich aufgenommen, und zwei Eigenschaften sind beim Verarbeiten
wichtig:

- **1920 × 1080 mit 90° Drehung im Container**, angezeigt also **1080 × 1920
  hochkant**. Das ist genau das Format von Reel und Story – es muss nichts
  beschnitten werden. Werkzeuge, welche die Drehung ignorieren, liefern das
  Bild liegend; ffmpeg dreht von sich aus richtig.
- **HEVC in 10 Bit, HDR nach HLG** (`bt2020nc`, `arib-std-b67`). Wer das ohne
  Tonwertabbildung nach SDR wandelt, bekommt blasse, graue Bilder. Für eine
  Fassung in SDR braucht es eine Abbildung, etwa über `zscale`/`tonemap`,
  nicht nur ein `-pix_fmt yuv420p`.

Dazu je eine Tonspur AAC (Stereo) und eine zweite in Apples räumlichem Format
(`apac`), die gängige Werkzeuge nicht lesen können – beim Umwandeln die
AAC-Spur ausdrücklich wählen.

Zum Verarbeiten braucht es ein vollständiges ffmpeg. Das im Container
mitgelieferte (aus den Playwright-Browsern) kann nur WebM und hat keine
Decoder; `npm install ffmpeg-static` liefert eine brauchbare Fassung.

## Wofür sich was eignet

- **`balkontuere-bedienen.mov`** ist das wertvollste Stück: Es zeigt das
  Produkt bei der Arbeit, in einer Bewegung, in sechs Sekunden. Zwischen
  Sekunde 1 und 3 ist das Plissee ganz zu und die Falten stehen sauber im
  Licht – das ist der Ausschnitt für ein Reel.
- **`lieferung-pakete.mov`** taugt als kurzer Einschub zum Thema Lieferung.
  Die ersten drei Sekunden sind brauchbar, danach wird der Schwenk unruhig
  und die letzten Bilder sind verwischt.
- **`grossnetz-zuziehen.mov`** zeigt, was auf keinem anderen Bild zu sehen
  ist: die Grösse. Ein zweiteiliges Netz, fast so hoch wie der Raum, wird in
  einem Zug zugezogen – und daneben steht ein Mensch, an dem man es messen
  kann. Das Netz lehnt an der Wand und ist nicht montiert; wer daraus etwas
  über Montage erzählen will, erzählt es falsch. Als Beleg für „nach Mass,
  auch gross" ist es das beste Stück im Ordner.
- **`unterschiene-logo.jpg`** ist das beste Markenbild: Produkt, Logo und
  Handwerk in einem Ausschnitt, ohne Text. Steht seit Oktober 2026 unter
  „Unsere Versprechen" – beschnitten, siehe `scripts/bilder.mjs`.
- **`fenster-aussicht-wiese.jpg`** ist das einzige Bild mit Licht und Weite:
  Durch das zugezogene Netz sind Baum, Wiese und Himmel klar zu sehen. Es
  behauptet nichts, es zeigt das Versprechen. Steht seit Oktober 2026 als
  Band über dem Schluss-Aufruf.
- **Die beiden Gewebebilder** gehören zusammen. Sie zeigen zwei verschiedene
  Gewebe – fein und grob –, und nebeneinander erklären sie den Unterschied
  ohne ein Wort.
- **Die beiden Musterbuchbilder** zeigen, was es wirklich gibt: Rahmenprofile
  in mehreren Farbtönen und Gewebe in weit mehr Farben, als Katalog und
  Rechner heute kennen (dort stehen drei Rahmenfarben und zwei Gewebefarben).
  Das gehört angeschaut, bevor die neuen Auswahlmöglichkeiten gebaut werden.
