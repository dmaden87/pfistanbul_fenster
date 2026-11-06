import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Knopf } from '@/components/Blatt'
import { Pfeil } from '@/components/Symbol'
import { useSprache } from '@/lib/sprache'
import { farben, radius, TIPPFLAECHE } from '@/theme'

/**
 * Der Rahmen eines Bearbeiten-Bildschirms: Kopf mit Zurueck, Inhalt zum
 * Rollen, unten der Speichern-Knopf. Abbrechen = zurueck, ohne zu speichern.
 */
export function BearbeitenRahmen({
  titel,
  unterzeile,
  children,
  speichernText,
  onSpeichern,
  laeuft,
}: {
  titel: string
  unterzeile?: string
  children: ReactNode
  speichernText: string
  onSpeichern: () => void
  laeuft: boolean
}) {
  const { t } = useSprache()
  return (
    <SafeAreaView style={s.seite} edges={['top', 'bottom']}>
      <View style={s.kopf}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t.zurueckZuAuftrag} style={s.zurueck}>
          <Pfeil farbe={farben.text} richtung="links" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.titel} accessibilityRole="header" numberOfLines={1}>{titel}</Text>
          {unterzeile ? <Text style={s.unterzeile} numberOfLines={1}>{unterzeile}</Text> : null}
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.inhalt} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        <View style={s.fuss}>
          {laeuft ? <ActivityIndicator color={farben.marke} style={{ height: TIPPFLAECHE + 6 }} /> : <Knopf text={speichernText} onPress={onSpeichern} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

/** Eine Karte im Bearbeiten-Bildschirm. */
export function Abschnitt({ titel, rechts, children }: { titel?: string; rechts?: ReactNode; children: ReactNode }) {
  return (
    <View style={s.karte}>
      {titel || rechts ? (
        <View style={s.karteKopf}>
          {titel ? <Text style={s.karteTitel} accessibilityRole="header">{titel}</Text> : <View style={{ flex: 1 }} />}
          {rechts}
        </View>
      ) : null}
      {children}
    </View>
  )
}

export const rahmenStile = StyleSheet.create({
  satz: { fontSize: 13, color: farben.textLeise, lineHeight: 19 },
  zeile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: TIPPFLAECHE },
  zeilenText: { fontSize: 15, color: farben.text },
  zahl: { fontSize: 15, color: farben.text, fontVariant: ['tabular-nums'] },
  stark: { fontWeight: '700' },
  link: { color: farben.marke, fontWeight: '700', fontSize: 14 },
  gefahrLink: { color: farben.gefahr, fontWeight: '600', fontSize: 14 },
  marke: { alignSelf: 'flex-start', fontSize: 12, fontWeight: '600', color: farben.hinweisTinte, backgroundColor: farben.hinweisWeich, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.klein, overflow: 'hidden' },
})

const s = StyleSheet.create({
  seite: { flex: 1, backgroundColor: farben.grund },
  kopf: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8, gap: 4 },
  zurueck: { width: TIPPFLAECHE, height: TIPPFLAECHE, alignItems: 'center', justifyContent: 'center' },
  titel: { fontSize: 20, fontWeight: '700', color: farben.marke },
  unterzeile: { fontSize: 13, color: farben.textLeise },
  inhalt: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  karte: { backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.rand, borderRadius: radius.gross, padding: 14, gap: 10 },
  karteKopf: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  karteTitel: { flex: 1, fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: farben.textLeise },
  fuss: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: farben.rand, backgroundColor: farben.grund },
})
