# Instagram

Fünf Beiträge zum Start, dazu Profiltext. Bilder liegen fertig daneben,
Format 4:5 (1080 × 1350) – das höchste, das Instagram im Feed ungeschnitten
zeigt. Ein quadratischer Beitrag verschenkt ein Viertel der Fläche.

`node instagram/erzeuge.mjs` schneidet die vier Fotos zu. Die Preistafel
kommt aus `preistafel.html` über den Browser (Grund steht in
`marke/LIESMICH.md`: die Schrift).

## Profil

**Name** (eigenes Feld, 30 Zeichen)

```
Pfistanbul Fenster
```

**Bio** (150 Zeichen, Zeilenumbrüche direkt eintippen)

```
Insektenschutz-Plissee nach Mass.
Von Freunden und Nachbarn für Freunde und Nachbarn.
Greifensee ZH · feste Preise fürs Pfisterhölzli
```

**Link**: `https://pfistanbul.vercel.app`

## Reihenfolge

Einer alle zwei bis drei Tage, in dieser Reihenfolge. Instagram zeigt den
neuesten zuoberst – wer zuletzt die Geschichte postet, begrüsst jeden neuen
Besucher damit. Für zwei Nachbarn, die etwas für die Siedlung organisieren,
ist das die bessere Visitenkarte als ein Produktfoto.

---

### 1 · `beitrag-1-fenster.jpg`

```
Fenster auf. Mücken draussen.

Das ist Denizʼ eigenes Fenster im Pfisterhölzli, Netz zugezogen. Man sieht es
kaum – und genau darum geht es. Ein gutes Insektengitter merkt man nur daran,
dass man nicht mehr darüber nachdenkt.

Wir sind zwei Nachbarn aus der Siedlung und lassen Plissee-Netze nach Mass
fertigen. Für die vier Fensterformate, die sich hier über alle Wohnungen
wiederholen, gibt es feste Preise.

Alles auf der Seite, Link im Profil.

#insektenschutz #fliegengitter #greifensee #pfisterhölzli #nachbarschaft
```

### 2 · `beitrag-2-gewebe.jpg`

```
So sieht es aus der Nähe aus.

Das Netz liegt in feinen Falten in einer schmalen Schiene. Sie ziehen es mit
einem Finger zu und genauso leicht wieder auf – wie ein Akkordeon.

Und im Herbst bleibt es einfach hängen. Kein Aushängen, kein Verstauen im
Keller, kein Suchen und Wiederanbringen im Frühling, wie man es von den
üblichen Spannrahmen kennt.

#insektenschutz #plissee #fliegengitter #greifensee
```

### 3 · `beitrag-3-aussen.jpg`

```
Und so sieht es von aussen aus.

Der Rahmen sitzt vor dem Fenster und trägt auf. Das gehört dazu, und wir sagen
es lieber vorher als nachher.

Dafür wird nichts gebohrt: Das Netz klebt rundum im äusseren Fensterrahmen.
Keine Löcher, keine bauliche Veränderung, nichts, was bei der Wohnungsabgabe
auffällt. Bei den allermeisten Fenstern geht das auf – wo die Klebefläche zu
schmal ist oder eine Dichtung im Weg sitzt, sagen wir es vor der Bestellung.

#insektenschutz #mietwohnung #ohnebohren #greifensee
```

### 4 · `beitrag-4-preise.jpg`

```
Vier Formate, feste Preise.

Die Siedlung wurde Anfang der Siebzigerjahre als Ganzes gebaut – entsprechend
wiederholen sich vier Fensterformate über alle Wohnungen. Wir haben sie
ausgemessen. Kein Konfigurator, keine Wartezeit auf eine Offerte: Sie sehen
den Preis und bestellen.

Wir sammeln gerade die Bestellungen für die erste Lieferung. Bezahlt wird bei
der Übergabe, bar oder mit TWINT.

Wohnen Sie woanders? Sagen Sie uns Ihre Masse, den Richtpreis rechnen wir
Ihnen direkt auf der Seite aus.

#pfisterhölzli #greifensee #insektenschutz #festepreise
```

### 5 · `beitrag-5-team.jpg`

```
Es begann mit einem Kaffee.

Diesen Sommer habe ich mir in der Türkei Fliegennetze machen lassen. Noch
während der Montage kam Ufuk auf einen Kaffee vorbei, schaute sie sich an und
fragte, ob ich ihm auch welche mitbringen könne. Bis der Kaffee ausgetrunken
war, hatten sich zwei weitere Nachbarn gemeldet.

Daraus ist Pfistanbul Fenster geworden: kein Unternehmen, das in die Siedlung
hinein verkauft, sondern zwei Nachbarn, die direkt beim Hersteller einkaufen
und die Bestellungen aus dem Quartier zu einer Lieferung bündeln. Deshalb der
Preis.

Ufuk & Deniz

#nachbarschaft #greifensee #pfisterhölzli #ausdernachbarschaft
```

---

## Was noch fehlt

Der **Handle**. Sobald er feststeht, kommt der Instagram-Link in die
Fussleiste der Website – sonst führt der Weg nur in eine Richtung.

## Vor dem Posten prüfen

- Stimmen die Preise im vierten Beitrag noch mit `src/data/catalog.ts` überein?
- Ist Ufuk mit dem Bild im fünften Beitrag einverstanden?
- Solange `shopConfig.operational` auf `false` steht, passt der Satz im vierten
  Beitrag über das Sammeln der Bestellungen. Danach gehört er geändert.
