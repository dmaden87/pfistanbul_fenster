import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { farben, radius } from '@/theme'

/** Ein beschriftetes Eingabefeld. Die Beschriftung ist mit dem Feld verbunden (Bildschirmleser). */
export function Feld({ label, id, mehrzeilig, ...rest }: { label: string; id: string; mehrzeilig?: boolean } & TextInputProps) {
  return (
    <View style={s.feld}>
      <Text style={s.label} nativeID={id}>{label}</Text>
      <TextInput
        accessibilityLabelledBy={id}
        style={[s.eingabe, mehrzeilig && s.mehrzeilig]}
        multiline={mehrzeilig}
        textAlignVertical={mehrzeilig ? 'top' : 'center'}
        placeholderTextColor={farben.textSchwach}
        {...rest}
      />
    </View>
  )
}

const s = StyleSheet.create({
  feld: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: farben.textLeise },
  eingabe: { minHeight: 48, borderRadius: radius.mittel, borderWidth: 1, borderColor: farben.randStark, backgroundColor: farben.flaeche, paddingHorizontal: 12, fontSize: 16, color: farben.text },
  mehrzeilig: { minHeight: 120, paddingTop: 12 },
})
