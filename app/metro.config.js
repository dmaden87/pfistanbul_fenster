// Metro buendelt den JavaScript-Teil der App.
//
// Die App teilt Geschaeftslogik und Datentypen mit der Webseite: Phasen,
// Preise, Kosten (../src/lib, ../src/types). Damit Metro diese Dateien
// ausserhalb des App-Ordners ueberhaupt sieht, steht ../src in
// `watchFolders`. Importiert wird sie als `@pf/...` (tsconfig.json, `paths`).
const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '..', 'src')]
// Pakete fuer die geteilten Dateien in ../src kommen aus dem App-Ordner,
// nie aus dem node_modules der Webseite. Sonst suchte Metro fuer
// ../src/components/admin/sprache.ts zuerst im node_modules daneben: lokal
// stuende das React der Webseite neben dem der App, auf GitHub (wo nur app/
// installiert ist) nicht - zwei verschiedene Apps, je nach Rechner.
const appOrdner = __dirname
const geteilt = path.resolve(__dirname, '..', 'src') + path.sep
config.resolver.nodeModulesPaths = [path.resolve(appOrdner, 'node_modules')]
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const ausGeteilt = context.originModulePath.startsWith(geteilt)
  const paket = !moduleName.startsWith('.') && !moduleName.startsWith('/') && !moduleName.startsWith('@pf/')
  if (ausGeteilt && paket) {
    return context.resolveRequest({ ...context, originModulePath: path.join(appOrdner, 'package.json') }, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
