# Fertige Stücke

Was tatsächlich veröffentlicht wurde oder dafür gedacht war – im Unterschied
zu `../roh` (Aufnahmen) und `../reel-sommer`, `../titelblatt` (Baupläne, aus
denen etwas entsteht).

## `reel-montage.mov`

Ein Reel von Deniz und Ufuk, geschnitten in CapCut am 3. Oktober 2026.
Vorne das Titelblatt aus `../titelblatt`, hinten die Abspannkarte aus
`../reel-sommer` – dazwischen eigene Aufnahmen von Lieferung, Montage und
fertigem Fenster.

26,3 Sekunden · 1080 × 1920 · HEVC 10 Bit nach HLG · AAC 44,1 kHz Stereo ·
12,5 MB.

| Zeit | Was |
|---|---|
| 0,0 – 2,9 s | Titelblatt, Fassung „falten" |
| 2,9 – 19,9 s | Balkontüre, Auspacken, Montage, fertiges Fenster mit Aussicht |
| 19,9 – 24,2 s | Abspannkarte aus dem Reel „Sommer" |
| 24,3 – 26,3 s | CapCut-Abspann |

**Die Aufnahmen daraus liegen nicht im Repository.** Was zwischen Sekunde 3
und 20 zu sehen ist – die beiden mit dem Rahmen auf dem Parkett, das fertige
Fenster mit Wiese und Himmel dahinter – gibt es nur in dieser geschnittenen
Fassung. Wer damit weiterarbeiten will, braucht die Originalclips vom
Telefon.

### Was daran noch nicht stimmt

Festgehalten, damit es beim nächsten Mal nicht wieder passiert – nicht als
Vorwurf an ein Stück, das sonst sitzt:

1. **Der CapCut-Abspann** am Ende. In CapCut lässt sich der letzte Clip in
   der Zeitleiste löschen oder der Abspann in den Export-Einstellungen
   abschalten.
2. **Schwarze Balken am Anfang.** Dort liegt das A4-Titelblatt in einem
   9 : 16-Rahmen; Papier ist 1 : 1,41, das Telefon 1 : 1,78. Seither gibt es
   dieselbe Gestaltung als `titelblatt-falten-9x16.jpg` – die passt ohne
   Balken.
3. **Der Ton übersteuert**: Spitze +0,4 dB links, +0,7 dB rechts, also über
   Vollaussteuerung. Gesamtlautheit −12,2 LUFS bei 6,0 LU Umfang. Instagram
   regelt auf etwa −14 LUFS herunter, die Verzerrung bleibt aber in der
   Datei. Die Musik vor dem Export 3 dB leiser ziehen.

Gemessen mit `ffmpeg -af ebur128=peak=true` und `astats`; die Zeiten stammen
aus der Szenenerkennung (`select='gt(scene,0.35)'`).

## Warum diese Datei hier liegt

Sonst liegen im Repository nur Baupläne, keine fertigen Filme – das Reel
„Sommer" entsteht in einer Minute neu, deshalb ist dort nur das Skript
eingecheckt. Hier geht das nicht: Dieses Stück lässt sich ohne die
Originalclips nicht wiederherstellen, und es ist das erste, das von vorne
bis hinten in unserer Bildsprache läuft. Was nicht reproduzierbar ist,
gehört aufbewahrt.
