import type { ExpoConfig } from 'expo/config'

/**
 * Konfiguration der App «PF Admin».
 *
 * PAKET-ID UND SCHLUESSEL SIND HEILIG: `ch.pfistanbul.admin` ist dieselbe ID
 * wie die bisherige Webseiten-App (android/). Weil auch der Signaturschluessel
 * derselbe ist, installiert sich die native App als Update darueber.
 *
 * Die Versionsnummer setzt der Build auf GitHub (PF_VERSION_CODE). Sie muss
 * hoeher sein als jede bisher installierte - auch als die der Webseiten-App
 * (dort hoechstens um 10). Deshalb beginnt die native App bei 100.
 */
const versionCode = Number(process.env.PF_VERSION_CODE ?? 100)
const version = process.env.PF_VERSION_NAME ?? '2.0.0'

const config: ExpoConfig = {
  name: 'PF Admin',
  slug: 'pf-admin',
  scheme: 'pfadmin',
  version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#faf8f4',
  ios: {
    bundleIdentifier: 'ch.pfistanbul.admin',
    supportsTablet: false,
  },
  android: {
    package: 'ch.pfistanbul.admin',
    versionCode,
    adaptiveIcon: {
      backgroundColor: '#0f3b34',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 160, backgroundColor: '#0f3b34' }],
    './plugins/signatur.js',
  ],
}

export default config
