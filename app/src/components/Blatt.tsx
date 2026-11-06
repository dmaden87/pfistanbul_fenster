import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { farben, radius, TIPPFLAECHE } from '@/theme'

/**
 * Ein Blatt, das von unten hereinfaehrt – fuer alles Bearbeiten im Auftrag.
 * Ein Tipp daneben schliesst es, ebenso die Zurueck-Taste von Android.
 */
export function Blatt({ offen, titel, onSchliessen, children }: { offen: boolean; titel: string; onSchliessen: () => void; children: ReactNode }) {
  const abstand = useSafeAreaInsets()
  return (
    <Modal visible={offen} transparent animationType="slide" onRequestClose={onSchliessen} statusBarTranslucent>
      <KeyboardAvoidingView style={s.huelle} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={s.daneben} onPress={onSchliessen} accessibilityLabel="Schliessen" accessibilityRole="button" />
        <View style={[s.blatt, { paddingBottom: Math.max(abstand.bottom, 16) + 8 }]}>
          <View style={s.griff} />
          <Text style={s.titel} accessibilityRole="header">{titel}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.inhalt}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

/** Der grosse Knopf unten im Blatt oder im Auftrag. */
export function Knopf({ text, onPress, still, gesperrt, gefahr }: { text: string; onPress: () => void; still?: boolean; gesperrt?: boolean; gefahr?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={gesperrt}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!gesperrt }}
      style={({ pressed }) => [s.knopf, still && s.knopfStill, gefahr && s.knopfGefahr, gesperrt && s.knopfAus, pressed && { opacity: 0.85 }]}
    >
      <Text style={[s.knopfText, still && s.knopfTextStill, gefahr && s.knopfTextGefahr]}>{text}</Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  huelle: { flex: 1, justifyContent: 'flex-end' },
  daneben: { flex: 1, backgroundColor: 'rgba(23,33,31,0.4)' },
  blatt: { backgroundColor: farben.grund, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, maxHeight: '88%' },
  griff: { width: 40, height: 4, borderRadius: 2, backgroundColor: farben.randStark, alignSelf: 'center', marginBottom: 10 },
  titel: { fontSize: 22, fontWeight: '700', color: farben.marke, marginBottom: 12 },
  inhalt: { gap: 12, paddingBottom: 4 },
  knopf: { minHeight: TIPPFLAECHE + 6, borderRadius: radius.gross, backgroundColor: farben.marke, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  knopfStill: { backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.rand },
  knopfGefahr: { backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.gefahrWeich },
  knopfAus: { opacity: 0.45 },
  knopfText: { color: farben.aufMarke, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  knopfTextStill: { color: farben.marke },
  knopfTextGefahr: { color: farben.gefahr },
})
