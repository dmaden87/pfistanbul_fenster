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
// Pakete werden nur aus dem App-Ordner geladen, nie aus dem node_modules der
// Webseite - sonst stuenden zwei Reacts nebeneinander.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')]

module.exports = config
