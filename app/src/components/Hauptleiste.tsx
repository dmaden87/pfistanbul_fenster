import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSprache } from '@/lib/sprache'
import { farben, TIPPFLAECHE } from '@/theme'

type Bereich = 'auftraege' | 'zahlen'

/**
 * Die Leiste unten: Aufträge | Zahlen.
 *
 * Selbst gebaut statt Tabs von Expo Router: Die brauchen ein weiteres natives
 * Paket, und fuer zwei Knoepfe lohnt das nicht. Gewechselt wird mit
 * replace, damit Zurueck nicht zwischen den Bereichen hin- und herspringt.
 */
export function Hauptleiste({ aktiv }: { aktiv: Bereich }) {
  const { t } = useSprache()
  const unten = useSafeAreaInsets().bottom
  const eintraege: { bereich: Bereich; text: string; ziel: '/' | '/zahlen' }[] = [
    { bereich: 'auftraege', text: t.auftraege, ziel: '/' },
    { bereich: 'zahlen', text: t.zahlen, ziel: '/zahlen' },
  ]
  return (
    <View style={[s.leiste, { paddingBottom: Math.max(unten, 6) }]} accessibilityRole="tablist">
      {eintraege.map((e) => {
        const an = e.bereich === aktiv
        return (
          <Pressable
            key={e.bereich}
            onPress={() => !an && router.replace(e.ziel)}
            accessibilityRole="tab"
            accessibilityState={{ selected: an }}
            style={s.eintrag}
          >
            <View style={[s.strich, an && s.strichAn]} />
            <Text style={[s.text, an && s.textAn]}>{e.text}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  leiste: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: farben.rand, backgroundColor: farben.flaeche },
  eintrag: { flex: 1, minHeight: TIPPFLAECHE + 8, alignItems: 'center', justifyContent: 'center', gap: 4 },
  strich: { width: 28, height: 3, borderRadius: 2, backgroundColor: 'transparent' },
  strichAn: { backgroundColor: farben.marke },
  text: { fontSize: 14, fontWeight: '600', color: farben.textLeise },
  textAn: { color: farben.marke, fontWeight: '700' },
})
