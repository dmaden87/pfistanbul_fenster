#!/usr/bin/env bash
# Installiert das APK, startet die App und schaut, ob sie abstuerzt.
# Aufgerufen von .github/workflows/admin-apk-test.yml.
set -u
APK="$1"
PAKET=ch.pfistanbul.admin

adb install -r "$APK"
adb logcat -c
adb shell monkey -p "$PAKET" -c android.intent.category.LAUNCHER 1
sleep 20

echo "===== Absturzprotokoll ====="
adb logcat -d -b crash
echo "===== AndroidRuntime / TWA ====="
adb logcat -d | grep -E "AndroidRuntime|TWALauncher|TwaLauncher|$PAKET|FATAL" | tail -80

if adb logcat -d -b crash | grep -q "$PAKET"; then
  echo "::error::Die App ist beim Start abgestuerzt (Stacktrace oben)."
  exit 1
fi
echo "Kein Absturz."
