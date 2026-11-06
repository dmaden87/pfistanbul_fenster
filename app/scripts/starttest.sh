#!/usr/bin/env bash
# Installiert das APK im Emulator, startet die App und prueft zweierlei:
#   1. Sie stuerzt nicht ab (sonst steht der Stacktrace im Log).
#   2. Der Anmeldebildschirm ist wirklich zu sehen - eine App, die nur einen
#      leeren Bildschirm zeigt, stuerzt nicht ab und waere trotzdem kaputt.
# Aufgerufen von .github/workflows/app.yml.
set -u
APK="$1"
PAKET=ch.pfistanbul.admin

adb install -r "$APK"
adb logcat -c
adb shell monkey -p "$PAKET" -c android.intent.category.LAUNCHER 1
sleep 25

echo "===== Absturzprotokoll ====="
adb logcat -d -b crash
echo "===== React Native / App ====="
adb logcat -d | grep -E "ReactNativeJS|AndroidRuntime|FATAL|$PAKET" | tail -60

if adb logcat -d -b crash | grep -q "$PAKET"; then
  echo "::error::Die App ist beim Start abgestuerzt (Stacktrace oben)."
  exit 1
fi

adb exec-out uiautomator dump /dev/tty > bildschirm.xml 2>/dev/null || true
adb exec-out screencap -p > bildschirm.png || true
if grep -q "Anmelden" bildschirm.xml && grep -q "PF Admin" bildschirm.xml; then
  echo "Kein Absturz, Anmeldebildschirm sichtbar."
else
  echo "::error::Die App laeuft, aber der Anmeldebildschirm ist nicht zu sehen (Bildschirmfoto im Artefakt)."
  head -c 3000 bildschirm.xml
  exit 1
fi
