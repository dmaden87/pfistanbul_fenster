import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SprachSchalter } from '@/components/SprachSchalter'
import { useAnmeldung } from '@/lib/anmeldung'
import { useSprache } from '@/lib/sprache'
import { farben, radius, TIPPFLAECHE } from '@/theme'

/** Anmeldung mit demselben Passwort wie im Adminbereich der Webseite. */
export default function Anmelden() {
  const { anmelden } = useAnmeldung()
  const { t } = useSprache()
  const [passwort, setPasswort] = useState('')
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function los() {
    if (!passwort || laeuft) return
    setLaeuft(true)
    setFehler(null)
    try {
      await anmelden(passwort)
    } catch (f) {
      setFehler(f instanceof Error ? f.message : String(f))
      setLaeuft(false)
    }
  }

  return (
    <SafeAreaView style={s.seite}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 8 }}>
        <SprachSchalter />
      </View>
      <KeyboardAvoidingView style={s.mitte} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.zeichen} accessible accessibilityLabel="Pfistanbul Fenster">
          <View style={s.fenster}>
            <View style={s.kreuzSenkrecht} />
            <View style={s.kreuzWaagrecht} />
          </View>
        </View>
        <Text style={s.titel} accessibilityRole="header">PF Admin</Text>
        <Text style={s.satz}>{t.anmeldeSatz}</Text>

        <Text style={s.label} nativeID="passwortLabel">{t.passwort}</Text>
        <TextInput
          style={s.eingabe}
          value={passwort}
          onChangeText={setPasswort}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={los}
          accessibilityLabelledBy="passwortLabel"
          editable={!laeuft}
        />
        {fehler ? <Text style={s.fehler} accessibilityLiveRegion="polite">{fehler}</Text> : null}

        <Pressable
          onPress={los}
          disabled={!passwort || laeuft}
          accessibilityRole="button"
          style={({ pressed }) => [s.knopf, (!passwort || laeuft) && s.knopfAus, pressed && s.gedrueckt]}
        >
          {laeuft ? <ActivityIndicator color={farben.aufMarke} /> : <Text style={s.knopfText}>{t.anmelden}</Text>}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  seite: { flex: 1, backgroundColor: farben.grund },
  mitte: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  zeichen: { width: 72, height: 72, borderRadius: 20, backgroundColor: farben.marke, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  fenster: { width: 38, height: 38, borderWidth: 3, borderColor: farben.aufMarke, borderRadius: 6 },
  kreuzSenkrecht: { position: 'absolute', left: 15.5, top: 0, bottom: 0, width: 2.5, backgroundColor: farben.aufMarke },
  kreuzWaagrecht: { position: 'absolute', top: 15.5, left: 0, right: 0, height: 2.5, backgroundColor: farben.aufMarke },
  titel: { fontSize: 32, fontWeight: '700', color: farben.marke },
  satz: { fontSize: 16, color: farben.textLeise, marginBottom: 24 },
  label: { fontSize: 14, color: farben.textLeise, fontWeight: '600' },
  eingabe: { height: 52, borderRadius: radius.mittel, borderWidth: 1, borderColor: farben.randStark, backgroundColor: farben.flaeche, paddingHorizontal: 14, fontSize: 17, color: farben.text },
  fehler: { color: farben.gefahr, fontSize: 15, marginTop: 4 },
  knopf: { minHeight: TIPPFLAECHE + 6, borderRadius: radius.gross, backgroundColor: farben.marke, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  knopfAus: { opacity: 0.5 },
  gedrueckt: { opacity: 0.85 },
  knopfText: { color: farben.aufMarke, fontSize: 17, fontWeight: '600' },
})
