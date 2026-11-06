import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SPRACHEN, useSprache } from '@/lib/sprache'
import { farben, radius } from '@/theme'

/**
 * DE | TR – die Sprache der Bedienung. Steht in der Liste und auf der
 * Anmeldung, damit Ufuk sie findet, bevor er etwas lesen muss.
 */
export function SprachSchalter() {
  const { sprache, setSprache, t } = useSprache()
  return (
    <View style={s.reihe} accessibilityRole="radiogroup" accessibilityLabel={t.sprache}>
      {SPRACHEN.map((x) => {
        const an = x.wert === sprache
        return (
          <Pressable
            key={x.wert}
            onPress={() => setSprache(x.wert)}
            accessibilityRole="radio"
            accessibilityState={{ checked: an }}
            accessibilityLabel={x.wert === 'deutsch' ? 'Deutsch' : 'Türkçe'}
            style={[s.knopf, an && s.an]}
            hitSlop={4}
          >
            <Text style={[s.text, an && s.textAn]}>{x.kurz}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  reihe: { flexDirection: 'row', borderWidth: 1, borderColor: farben.rand, borderRadius: radius.rund, overflow: 'hidden' },
  knopf: { minWidth: 48, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, backgroundColor: farben.flaeche },
  an: { backgroundColor: farben.marke },
  text: { fontSize: 13, fontWeight: '700', color: farben.textLeise },
  textAn: { color: farben.aufMarke },
})
