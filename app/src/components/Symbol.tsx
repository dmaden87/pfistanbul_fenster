import { StyleSheet, View } from 'react-native'

/**
 * Ein paar einfache Symbole, aus Flaechen gebaut statt aus einer
 * Symbolschrift. Solange es bei diesen wenigen bleibt, braucht es keine
 * Symbol-Bibliothek (@expo/vector-icons oder SF Symbols / Material
 * Symbols nativ) - und kein Paket mehr im APK.
 */
export function Pfeil({ farbe, richtung = 'rechts' }: { farbe: string; richtung?: 'rechts' | 'links' }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        s.pfeil,
        { borderColor: farbe, transform: [{ rotate: richtung === 'rechts' ? '45deg' : '-135deg' }] },
      ]}
    />
  )
}

export function Uhr({ farbe }: { farbe: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.uhr, { borderColor: farbe }]}>
      <View style={[s.zeigerLang, { backgroundColor: farbe }]} />
      <View style={[s.zeigerKurz, { backgroundColor: farbe }]} />
    </View>
  )
}

const s = StyleSheet.create({
  pfeil: { width: 10, height: 10, borderTopWidth: 2, borderRightWidth: 2 },
  uhr: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  zeigerLang: { position: 'absolute', left: 6, top: 2, width: 2, height: 6 },
  zeigerKurz: { position: 'absolute', left: 6, top: 6.5, width: 5, height: 2 },
})
