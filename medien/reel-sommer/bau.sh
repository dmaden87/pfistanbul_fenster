#!/bin/bash
#
# Baut das Reel "Sommer" aus dem Rohmaterial in ../roh.
#
# Aufruf aus diesem Ordner:    ./bau.sh
# Ergebnis:                    arbeit/reel-sommer.mp4  (1080x1920, ~14 s)
#
# Alles Zwischenzeug landet in arbeit/ und ist nicht im Repository – das
# Skript erzeugt es in rund einer Minute neu. Im Repository liegen nur der
# Bauplan und das Rohmaterial, denn aus beidem entsteht dasselbe Reel wieder.
#
# JEDER ABSCHNITT ENTSTEHT EINZELN und wird erst am Schluss aneinandergehaengt.
# Ein einziger langer Filtergraph laeuft bei jedem Fehler komplett neu, und man
# sieht nicht, welcher Teil schiefging; so laesst sich jeder Abschnitt fuer
# sich anschauen.
set -e
cd "$(dirname "$0")"

# --- ffmpeg ------------------------------------------------------------------
# Das im Container mitgelieferte ffmpeg (aus den Playwright-Browsern) kann nur
# WebM und hat keine Decoder – damit laesst sich dieses Material nicht
# anfassen. Volle Fassung:  npm install ffmpeg-static
FF=${FF:-$(node -e "console.log(require('ffmpeg-static'))" 2>/dev/null || echo ffmpeg)}
"$FF" -hide_banner -version >/dev/null 2>&1 || { echo "ffmpeg fehlt. Siehe Kommentar oben."; exit 1; }

ROH=../roh
A=arbeit
mkdir -p "$A"

# Gemeinsame Ausgabe aller Abschnitte: 1080x1920, 30 Bilder/s, ohne Ton.
AUS="-c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 30 -an -y"

# --- 1. Die Aufnahme von HDR nach SDR abbilden -------------------------------
#
# Das Telefon nimmt in HEVC 10 Bit nach HLG auf. Wer das ohne Tonwertabbildung
# wandelt, bekommt blasse, graue Bilder – der Fehler, den man genau einmal
# macht. Deshalb der Umweg ueber linear und zurueck nach bt709.
if [ ! -f "$A/tuer-sdr.mp4" ]; then
  echo "Abbildung HDR -> SDR …"
  "$FF" -hide_banner -loglevel error -i "$ROH/balkontuere-bedienen.mov" -map 0:v:0 \
    -vf "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p" \
    -c:v libx264 -crf 18 -preset medium -an -y "$A/tuer-sdr.mp4"
fi

# --- 2. Textkarten in Chromium rendern ---------------------------------------
# Mit den echten Markenschriften – siehe karten.mjs.
echo "Textkarten …"
node karten.mjs

# --- 3. Die Abschnitte -------------------------------------------------------

# Fotoabschnitt: 9:16 zuschneiden, langsam hineinfahren.
# $1 Datei  $2 Zuschnitt  $3 Dauer  $4 Ziel  $5 Zoom-Ende
#
# `-framerate 30` am EINGANG ist noetig, nicht nur das fps=30 im zoompan: Ohne
# das liest ffmpeg das Standbild mit 25 Bildern/s, zoompan macht aus jedem
# Eingangsbild genau eines, und der Abschnitt wird ein Sechstel zu kurz.
foto() {
  "$FF" -hide_banner -loglevel error -loop 1 -framerate 30 -t "$3" -i "$1" \
    -vf "crop=$2,scale=1620:2880,zoompan=z='min(1.0+0.0013*on,$5)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,format=yuv420p" \
    $AUS "$4"
}

# Videoabschnitt aus der abgebildeten Fassung. $1 Start $2 Dauer $3 Ziel
video() {
  "$FF" -hide_banner -loglevel error -ss "$1" -t "$2" -i "$A/tuer-sdr.mp4" \
    -vf "scale=1080:1920,format=yuv420p" $AUS "$3"
}

# Text darueberlegen. $1 Bild $2 Karte $3 Einblendung ab $4 Ziel
#
# `-loop 1 -framerate 30` am Eingang der Karte ist KEIN Beiwerk: Ohne das hat
# sie genau ein Bild bei t=0. Die Einblendung beginnt spaeter, dieses eine Bild
# steht also "vor dem Anfang" der Blende und damit auf Durchsichtigkeit null –
# und wird unveraendert wiederholt. Der Text erschiene nie. Genau so war der
# erste Durchgang: ein Film ganz ohne Schrift.
text() {
  "$FF" -hide_banner -loglevel error -i "$1" -loop 1 -framerate 30 -i "$2" \
    -filter_complex "[1:v]format=rgba,fade=t=in:st=$3:d=0.45:alpha=1[t];[0:v][t]overlay=0:0:format=auto:shortest=1" \
    $AUS "$4"
}

echo "Abschnitte …"
video 0.10 2.50 "$A/roh-1.mp4"                                                   # Plissee wird zugezogen
foto "$ROH/gewebe-fein-falten.jpg"        1449:2576:241:0   2.20 "$A/roh-2.mp4" 1.10
foto "$ROH/plissees-angelehnt-falten.jpg" 1449:2576:241:0   2.20 "$A/roh-3.mp4" 1.10
video 2.50 1.90 "$A/roh-4.mp4"                                                   # und wieder geoeffnet
foto "$ROH/unterschiene-logo.jpg"         1087:1932:1450:0  2.40 "$A/roh-5.mp4" 1.09
"$FF" -hide_banner -loglevel error -loop 1 -framerate 30 -t 2.60 -i abspann.png \
  -vf "scale=1080:1920,format=yuv420p" $AUS "$A/roh-6.mp4"

echo "Text …"
text "$A/roh-1.mp4" text-1.png 0.55 "$A/teil-1.mp4"
text "$A/roh-2.mp4" text-2.png 0.20 "$A/teil-2.mp4"
text "$A/roh-3.mp4" text-3.png 0.20 "$A/teil-3.mp4"
text "$A/roh-4.mp4" text-4.png 0.15 "$A/teil-4.mp4"
cp "$A/roh-5.mp4" "$A/teil-5.mp4"
cp "$A/roh-6.mp4" "$A/teil-6.mp4"

echo "Zusammenhaengen …"
printf "file 'teil-%d.mp4'\n" 1 2 3 4 5 6 > "$A/liste.txt"
"$FF" -hide_banner -loglevel error -f concat -safe 0 -i "$A/liste.txt" -c copy -y "$A/stumm.mp4"

# --- 4. Ton ------------------------------------------------------------------
#
# Das Bett wird gerechnet (bett.mjs), das echte Geraeusch des Plissees kommt
# aus der Originalaufnahme – Tonspur 0, denn Spur 1 ist Apples raeumliches
# Format, das kein Werkzeug liest.
#
# PEGEL: Die Tuere liegt auf 1.0, also auf ihrem Originalpegel. Mit 1.5
# uebersteuerte die Mischung (Spitze 0.0 dB), und ein Begrenzer half nicht –
# `alimiter` hebt mit seiner Vorgabe von sich aus wieder an. Lieber leise und
# sauber: Instagram hebt ohnehin an, Uebersteuerung nimmt es mit.
echo "Ton …"
node bett.mjs
"$FF" -hide_banner -loglevel error -ss 0.10 -t 2.50 -i "$ROH/balkontuere-bedienen.mov" -map 0:a:0 -ac 2 -ar 48000 -y "$A/tuer-ton-1.wav"
"$FF" -hide_banner -loglevel error -ss 2.50 -t 1.90 -i "$ROH/balkontuere-bedienen.mov" -map 0:a:0 -ac 2 -ar 48000 -y "$A/tuer-ton-2.wav"
"$FF" -hide_banner -loglevel error \
  -i "$A/bett.wav" -i "$A/tuer-ton-1.wav" -i "$A/tuer-ton-2.wav" \
  -filter_complex "\
    [0:a]volume=1.0[bett]; \
    [1:a]highpass=f=90,volume=1.0,afade=t=in:st=0:d=0.15,afade=t=out:st=2.25:d=0.25,adelay=0|0[t1]; \
    [2:a]highpass=f=90,volume=1.0,afade=t=in:st=0:d=0.15,afade=t=out:st=1.65:d=0.25,adelay=6900|6900[t2]; \
    [bett][t1][t2]amix=inputs=3:duration=first:dropout_transition=0:normalize=0,afade=t=out:st=13.3:d=0.5[aus]" \
  -map "[aus]" -c:a aac -b:a 192k -ar 48000 -y "$A/ton.m4a"

echo "Fertig machen …"
"$FF" -hide_banner -loglevel error -i "$A/stumm.mp4" -i "$A/ton.m4a" \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a copy -movflags +faststart -shortest -y "$A/reel-sommer.mp4"

echo
"$FF" -hide_banner -i "$A/reel-sommer.mp4" 2>&1 | grep -E 'Duration|Stream'
echo
echo "Ton nachgemessen (die Spitze muss unter 0 dBFS liegen):"
"$FF" -hide_banner -i "$A/reel-sommer.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E '^    (I:|Peak:)'
