/**
 * Config-Plugin: signiert das Release-APK mit dem Schluessel von PF Admin.
 *
 * WARUM: Der Ordner android/ wird bei jedem Build neu erzeugt (`expo
 * prebuild`) und steht nicht im Repository. Von Hand dort eingetragene
 * Einstellungen waeren beim naechsten Build weg. Ein Plugin traegt sie bei
 * jedem Erzeugen wieder ein.
 *
 * WOHER DER SCHLUESSEL KOMMT: aus zwei Umgebungsvariablen, die der Build auf
 * GitHub aus den Repository-Secrets setzt:
 *   PF_KEYSTORE          Pfad zur Schluesseldatei
 *   PF_KEYSTORE_PASSWORT ihr Passwort (Alias: pfadmin)
 * Fehlen sie, wird mit dem Debug-Schluessel signiert. Das APK laeuft dann
 * zum Testen, laesst sich aber nicht ueber die installierte App spielen.
 *
 * Es MUSS derselbe Schluessel sein wie bei der Webseiten-App (android/ im
 * Repository-Hauptordner): nur dann installiert sich die native App als
 * Update darueber.
 */
const { withAppBuildGradle } = require('expo/config-plugins')

const MARKE = '// pf-admin: Release-Signatur'

function mitSignatur(gradle) {
  if (gradle.includes(MARKE)) return gradle

  const release = `
        release { ${MARKE}
            if (System.getenv('PF_KEYSTORE')) {
                storeFile file(System.getenv('PF_KEYSTORE'))
                storePassword System.getenv('PF_KEYSTORE_PASSWORT')
                keyAlias 'pfadmin'
                keyPassword System.getenv('PF_KEYSTORE_PASSWORT')
            }
        }`

  const mitBlock = gradle.replace(/(signingConfigs\s*\{\s*\n\s*debug\s*\{[^}]*\})/, `$1${release}`)
  if (mitBlock === gradle) throw new Error('signatur.js: signingConfigs { debug { … } } nicht gefunden – hat sich die Vorlage geaendert?')

  const mitWahl = mitBlock.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    "$1signingConfig System.getenv('PF_KEYSTORE') ? signingConfigs.release : signingConfigs.debug",
  )
  if (mitWahl === mitBlock) throw new Error('signatur.js: signingConfig im release-Build nicht gefunden – hat sich die Vorlage geaendert?')
  return mitWahl
}

module.exports = function withPfSignatur(config) {
  return withAppBuildGradle(config, (c) => {
    c.modResults.contents = mitSignatur(c.modResults.contents)
    return c
  })
}
