import { ScrollView, StyleSheet, Pressable, Text, View } from 'react-native'
import { farben, radius } from '@/theme'

export interface Option<T extends string> {
  wert: T
  text: string
}

/**
 * Eine Auswahl als Reihe von Knoepfen – fuer Rahmenfarbe, Gewebe usw. Auf
 * dem Telefon schneller als ein Aufklappmenue: alle Werte sichtbar, ein Tipp.
 */
export function Wahl<T extends string>({ label, optionen, wert, onWahl, gesperrt }: { label: string; optionen: Option<T>[]; wert: T | ''; onWahl: (w: T) => void; gesperrt?: boolean }) {
  return (
    <View style={s.feld}>
      <Text style={s.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.reihe} accessibilityRole="radiogroup">
        {optionen.map((o) => {
          const an = o.wert === wert
          return (
            <Pressable
              key={o.wert}
              onPress={() => onWahl(o.wert)}
              disabled={gesperrt}
              accessibilityRole="radio"
              accessibilityState={{ checked: an, disabled: !!gesperrt }}
              style={[s.chip, an && s.chipAn, gesperrt && !an && { opacity: 0.45 }]}
            >
              <Text style={[s.chipText, an && s.chipTextAn]}>{o.text}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  feld: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: farben.textLeise },
  reihe: { gap: 6 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.rund, borderWidth: 1, borderColor: farben.rand, backgroundColor: farben.flaeche, justifyContent: 'center' },
  chipAn: { backgroundColor: farben.marke, borderColor: farben.marke },
  chipText: { fontSize: 14, fontWeight: '600', color: farben.text },
  chipTextAn: { color: farben.aufMarke },
})
