# Anzeigebild

Das Profilbild für Instagram und alles andere, was ein rundes Bildchen will.

`node marke/erzeuge.mjs` erzeugt aus dem Skript drei Varianten als SVG sowie
als PNG in 1080 und 320 Pixeln – dazu `groessenprobe.png`, die alle drei rund
beschnitten in den Grössen zeigt, in denen sie tatsächlich erscheinen.

## Empfehlung: `profil-gitter-1080.png`

Das Zeichen der Website, für den Kreis gebaut. Es hält bis 32 Pixel hinunter,
und dort steht es im Feed neben jedem Beitrag.

Die beiden anderen sind Alternativen, die den Test nicht bestanden haben – sie
bleiben hier, damit niemand dieselbe Idee nochmals prüfen muss:

- **`netz`** zeigt ein Fenster, dessen rechte Hälfte vom Gewebe bedeckt ist.
  Schön in gross, weil es sagt, worum es geht. Klein zerfällt das Gewebe zu
  einem grauen Fleck und die Form liest sich nicht mehr als Fenster.
- **`hell`** hat cremefarbenen Grund. Fällt unter dunklen Profilbildern auf,
  verliert aber auf hellem Untergrund seinen Rand – der Kreis franst aus.

## Zwei Dinge, die den Entwurf bestimmt haben

**Instagram schneidet rund zu.** Alles in den Ecken ist weg. Das Zeichen sitzt
deshalb mit Abstand in der Mitte, gut innerhalb des einbeschriebenen Kreises.

**Im Feed sind es rund 32 Pixel.** Das Zeichen der Website hat ein Gitter aus
sieben Linien; bei 32 Pixeln wäre jede davon ein Viertelpixel breit. Für das
Profilbild ist das Gitter deshalb gröber (drei mal drei Felder statt vier mal
vier) und die Linien sind dicker. Der Rahmen ist bewusst stärker als das
Innengitter – sonst verschwimmt beides klein zu einer Fläche.

## Hochladen

`profil-gitter-1080.png` nehmen. Instagram verlangt mindestens 320 Pixel,
rechnet aber selbst herunter; von einer grösseren Vorlage bleibt mehr übrig.
Die 320er-Fassung liegt für Dienste bereit, die kleine Dateien wollen.
