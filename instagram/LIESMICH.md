# Instagram

Fünf Beiträge zum Start, dazu Profiltext. Bilder liegen fertig daneben,
Format 4:5 (1080 × 1350) – das höchste, das Instagram im Feed ungeschnitten
zeigt. Ein quadratischer Beitrag verschenkt ein Viertel der Fläche.

`node instagram/erzeuge.mjs` schneidet die vier Fotos zu. Die Tafeln
(`preistafel`, `titelbild`, `livegang`) rendert `node instagram/tafel.mjs <name>`
über den Browser – warum nicht über sharp, steht in `marke/LIESMICH.md`: die
Schrift.

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

**Link**: `https://pfistanbul.ch`

**Handle**: `pfistanbul.fenster` – steht in `src/data/operator.ts` und von dort
in den strukturierten Daten (`sameAs`) und in der Fussleiste der Website.
Wird er auf Instagram umbenannt, muss er dort nachgeführt werden.

## Reihenfolge

Einer alle zwei bis drei Tage, in dieser Reihenfolge. Instagram zeigt den
neuesten zuoberst, also landet oben, was zuletzt gepostet wird – deshalb steht
das Titelbild am Schluss der Liste und nicht am Anfang.

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

### 6 · `beitrag-6-titel.jpg` — als letztes posten

```
Fenster auf. Mücken draussen.

Insektenschutz-Plissee nach Mass, für die vier Fensterformate, die sich im
Pfisterhölzli über alle Wohnungen wiederholen. Feste Preise, Lieferung in der
Siedlung gratis, bezahlt wird bei der Übergabe.

Die Netze hängen fertig montiert am Pfisterhölzli 38 – melden Sie sich, wir
zeigen sie Ihnen gerne.

Alles Weitere über den Link im Profil.

#pfisterhölzli #greifensee #insektenschutz #fliegengitter #nachbarschaft
```

---

## Vor dem Posten prüfen

- Stimmen die Preise im vierten und im sechsten Beitrag noch mit
  `src/data/catalog.ts` überein? Sie stehen dort als Text im Bild, nicht aus
  dem Katalog gezogen – ein Bild wird einmal gepostet und bleibt dann stehen.
- Ist Ufuk mit dem Bild im fünften Beitrag einverstanden?
- Solange `shopConfig.operational` auf `false` steht, passt der Satz im vierten
  Beitrag über das Sammeln der Bestellungen. Danach gehört er geändert.

---

### 7 · `beitrag-livegang.jpg` — zum Live-Gang

Der erste Beitrag, nachdem der Shop offen ist. Bewusst mit der Adresse gross
im Bild: Sie ist der einzige Grund, warum es diesen Beitrag gibt.

```
Insektenschutz nach Mass – ab heute können Sie bestellen.

Lange gemessen, gerechnet und ausprobiert – seit heute ist der Shop offen. Wir
lassen Insektenschutz-Plissees nach Mass fertigen und montieren sie selbst.

Die vier Fensterformate, die sich im Pfisterhölzli über alle Wohnungen
wiederholen, haben wir ausgemessen: dafür gibt es feste Preise ab CHF 130, das
Set für die ganze Wohnung ab CHF 775. Überall sonst fertigen wir nach Ihren
Massen – Richtwert CHF 100 bis 200 pro Fenster für Formate bis rund 2 m². Den
Richtpreis sehen Sie sofort auf der Seite, noch bevor Sie anfragen.

Der Rahmen klebt rundum im äusseren Fensterrahmen. Bei den allermeisten
Fenstern braucht es dafür weder Bohrer noch Dübel – keine Löcher, nichts, was
bei der Wohnungsabgabe auffällt. Und im Herbst bleibt das Netz einfach hängen.

Ein Lager haben wir nicht. Jedes Netz wird auf Bestellung gefertigt, und wir
bündeln die Bestellungen zu einer Lieferung. Genau daher kommt der Preis – den
Liefertermin nennen wir Ihnen mit der Bestätigung.

Bezahlt wird bei der Übergabe, bar oder mit TWINT. Und wenn der Betrag gerade
nicht auf einmal liegt: Sagen Sie es uns, wir finden eine Lösung.

Anschauen? Bei Deniz am Pfisterhölzli 38 hängen die Netze fertig montiert.

Alles auf der Seite, Link im Profil.

#insektenschutz #fliegengitter #plissee #greifensee #pfisterhölzli #nachbarschaft
```

---

## Stories

Format 1080 × 1920. Gerendert mit `node instagram/tafel.mjs <name> story`,
gemeinsame Stile in `story.css`.

**Instagram legt oben und unten eigene Bedienung über das Bild** – Profilzeile,
Antwortfeld, Linkaufkleber. Alles Wichtige liegt deshalb in den mittleren rund
1400 Pixeln; die Vorlagen halten die Ränder mit Polsterung frei. Die freie
Fläche in der Mitte ist Absicht: Dort gehören Aufkleber hin.

### `story-wir-sind-live.jpg`
Die Ankündigung auf der Fassadenaufnahme: Foto oben, das nach unten in den
Markengrund ausläuft, Text im unteren Drittel.

Die Zeile **„Erste Bestellung ist schon in Arbeit"** steht als eigenes Feld und
nicht im Fliesstext – sie ist eine Tatsache, keine Behauptung, und soll als
solche lesbar sein. **Sie muss stimmen.** Wird die Story später wiederverwendet,
gehört sie geprüft oder entfernt.

### `story-erster-tag.jpg`
Der soziale Beweis. **Wirkt nur, solange er stimmt**: keine erfundenen Zahlen,
sondern die drei Tatsachen, die es am ersten Tag gab. Wird der Beitrag später
wiederverwendet, gehören die Punkte angepasst.

### `story-unterwegs.jpg`
Der Moment statt der Ankündigung. Unten bleibt bewusst Platz für einen
Fragen-Aufkleber („Sollen wir bei dir auch vorbeischauen?"). Jede Antwort ist
ein Gespräch – und ein Gespräch ist mehr wert als eine Einblendung.


Die naechsten drei tragen alle dieselbe Botschaft – **wir sind live, die
ersten Bestellungen laufen, jetzt sind Sie dran** – in drei Darstellungen.
Sie sind Alternativen, nicht eine Reihe: eine davon reicht.

### `story-jetzt-dran.jpg`
Die Botschaft steckt in der Liste, nicht im Text: zwei Punkte abgehakt, der
dritte ein leerer Kreis mit „Ihr Insektenschutz nach Mass". Eine offene Zeile
am Ende einer sonst erledigten Liste zieht den Blick – man will sie schliessen.

### `story-heute-bestellen.jpg`
Dieselbe Botschaft ohne Foto, cremefarben. Der Status steht oben in einer
Zeile, damit die Schlagzeile die **Aufforderung** sein kann und nicht die
Ankuendigung. Zwischen zwei Fotostories eine optische Pause.

### `story-es-laeuft.jpg`
Ganzflaechiges Foto mit dunklem Schleier, Text in der Mitte. Wirkt im
Vollbild am staerksten, weil kein Rand die Flaeche bricht. Der Schleier ist
noetig, nicht dekorativ: heller Text auf hellem Foto ist auf dem Telefon in
der Sonne nicht lesbar.

**Alle drei haben ein Ablaufdatum.** „Erste Bestellungen in Arbeit" stimmt nur,
solange die erste Lieferung nicht draussen ist. Danach gehoert die Zeile
umgeschrieben – nicht einfach wiederverwendet.
