import { formatChf } from '@pf/lib/format'
import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Pfeil } from '@/components/Symbol'
import { useBestellungen } from '@/lib/bestellungen'
import { useSprache } from '@/lib/sprache'
import { farben, radius, TIPPFLAECHE } from '@/theme'

/**
 * Bausteine der Zahlen: eine Seite mit Zurueck, Karten, Zeilen mit Betrag.
 *
 * DIE APP ZEIGT LISTEN, KEINE TABELLEN. Im Web stehen die Zahlen in Tabellen
 * mit zehn Spalten – am Telefon waere das ein Seitwaerts-Rollen durch
 * Zahlen ohne Kopf. Hier hat jede Zeile links, was es ist, rechts den einen
 * Betrag, der zaehlt, und darunter in Klein den Rest. Wer mehr will, tippt.
 */
export function ZahlenSeite({ titel, unterzeile, children, unten }: { titel: string; unterzeile?: string; children: ReactNode; unten?: ReactNode }) {
  const { t } = useSprache()
  const { laedt, neuLaden } = useBestellungen()
  return (
    <SafeAreaView style={s.seite} edges={['top', 'bottom']}>
      <View style={s.kopf}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t.zurueck} style={s.zurueck}>
          <Pfeil farbe={farben.text} richtung="links" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.titel} accessibilityRole="header" numberOfLines={1}>{titel}</Text>
          {unterzeile ? <Text style={s.unterzeile} numberOfLines={2}>{unterzeile}</Text> : null}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={s.inhalt}
        refreshControl={<RefreshControl refreshing={laedt} onRefresh={neuLaden} tintColor={farben.marke} colors={[farben.marke]} />}
      >
        {children}
      </ScrollView>
      {unten}
    </SafeAreaView>
  )
}

export function ZahlenKarte({ titel, children }: { titel?: string; children: ReactNode }) {
  return (
    <View style={s.karte}>
      {titel ? <Text style={s.karteTitel} accessibilityRole="header">{titel}</Text> : null}
      {children}
    </View>
  )
}

/** Eine Zeile: links Titel und Kleingedrucktes, rechts der Betrag. Mit onPress ein Pfeil. */
export function ZahlZeile({
  titel,
  unter,
  betrag,
  wert,
  marke,
  stark,
  onPress,
  erste,
}: {
  titel: string
  unter?: string
  betrag?: number
  /** Statt eines Betrags ein Text (z. B. "12 %"). */
  wert?: string
  /** Kleine Marke neben dem Titel, z. B. "geschätzt". */
  marke?: string
  stark?: boolean
  onPress?: () => void
  erste?: boolean
}) {
  const inhalt = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={[s.zeilenTitel, stark && s.stark]}>{titel}</Text>
          {marke ? <Text style={s.marke}>{marke}</Text> : null}
        </View>
        {unter ? <Text style={s.unter}>{unter}</Text> : null}
      </View>
      {betrag !== undefined || wert !== undefined ? (
        <Text style={[s.betrag, stark && s.stark, betrag !== undefined && betrag < 0 && { color: farben.gefahr }]}>
          {wert ?? formatChf(betrag!)}
        </Text>
      ) : null}
      {onPress ? <Pfeil farbe={farben.marke} /> : null}
    </>
  )
  const stil = [s.zeile, !erste && s.trenner]
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [...stil, pressed && { opacity: 0.7 }]}>
      {inhalt}
    </Pressable>
  ) : (
    <View style={stil}>{inhalt}</View>
  )
}

/** Eine Zeile zum Ankreuzen – fuer die Auswahl einer Abrechnung. */
export function HakenZeile({
  titel,
  unter,
  betrag,
  an,
  gesperrt,
  onWechsel,
  erste,
}: {
  titel: string
  unter?: string
  betrag: number
  an: boolean
  gesperrt?: boolean
  onWechsel: (an: boolean) => void
  erste?: boolean
}) {
  return (
    <Pressable
      onPress={() => !gesperrt && onWechsel(!an)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: an, disabled: !!gesperrt }}
      style={({ pressed }) => [s.zeile, !erste && s.trenner, pressed && !gesperrt && { opacity: 0.7 }]}
    >
      <View style={[s.haken, an && s.hakenAn, gesperrt && { opacity: 0.5 }]}>{an ? <Text style={s.hakenZeichen}>✓</Text> : null}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.zeilenTitel}>{titel}</Text>
        {unter ? <Text style={s.unter}>{unter}</Text> : null}
      </View>
      <Text style={s.betrag}>{formatChf(betrag)}</Text>
    </Pressable>
  )
}

/** Drei Zahlen nebeneinander, jede antippbar – der Kopf der Zahlen. */
export function Streifen({ felder }: { felder: { titel: string; betrag: number; onPress?: () => void }[] }) {
  return (
    <View style={s.streifen}>
      {felder.map((f, i) => (
        <Pressable
          key={f.titel}
          onPress={f.onPress}
          disabled={!f.onPress}
          accessibilityRole={f.onPress ? 'button' : undefined}
          style={({ pressed }) => [s.feld, i > 0 && s.feldTrenner, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.feldTitel} numberOfLines={2}>{f.titel}</Text>
          <Text style={[s.feldBetrag, f.betrag < 0 && { color: farben.gefahr }]} numberOfLines={1} adjustsFontSizeToFit>
            {/* Ganze Franken, ohne "CHF": drei Betraege muessen nebeneinander passen. */}
            {formatChf(Math.round(f.betrag)).replace(/^CHF\s*/u, '').replace(/\.00$/, '')}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

export function Hinweis({ children }: { children: string }) {
  return <Text style={s.hinweis}>{children}</Text>
}

export const zahlenStile = StyleSheet.create({
  gross: { fontSize: 34, fontWeight: '700', color: farben.marke, fontVariant: ['tabular-nums'] },
  grossTitel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: farben.textLeise },
})

const s = StyleSheet.create({
  seite: { flex: 1, backgroundColor: farben.grund },
  kopf: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8, gap: 4 },
  zurueck: { width: TIPPFLAECHE, height: TIPPFLAECHE, alignItems: 'center', justifyContent: 'center' },
  titel: { fontSize: 20, fontWeight: '700', color: farben.marke },
  unterzeile: { fontSize: 13, color: farben.textLeise },
  inhalt: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  karte: { backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.rand, borderRadius: radius.gross, paddingHorizontal: 14, paddingVertical: 8 },
  karteTitel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: farben.textLeise, paddingTop: 6, paddingBottom: 4 },
  zeile: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: TIPPFLAECHE + 4, paddingVertical: 8 },
  trenner: { borderTopWidth: 1, borderTopColor: farben.linie },
  zeilenTitel: { fontSize: 15, color: farben.text },
  unter: { fontSize: 13, color: farben.textLeise },
  betrag: { fontSize: 15, color: farben.text, fontVariant: ['tabular-nums'] },
  stark: { fontWeight: '700' },
  marke: { fontSize: 12, fontWeight: '600', color: farben.hinweisTinte, backgroundColor: farben.hinweisWeich, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.klein, overflow: 'hidden' },
  haken: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: farben.randStark, alignItems: 'center', justifyContent: 'center', backgroundColor: farben.flaeche },
  hakenAn: { backgroundColor: farben.marke, borderColor: farben.marke },
  hakenZeichen: { color: farben.aufMarke, fontWeight: '700', fontSize: 16 },
  streifen: { flexDirection: 'row', backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.rand, borderRadius: radius.gross },
  feld: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, gap: 2, minHeight: TIPPFLAECHE + 12, justifyContent: 'center' },
  feldTrenner: { borderLeftWidth: 1, borderLeftColor: farben.linie },
  feldTitel: { fontSize: 12, fontWeight: '600', color: farben.textLeise },
  feldBetrag: { fontSize: 18, fontWeight: '700', color: farben.marke, fontVariant: ['tabular-nums'] },
  hinweis: { fontSize: 13, color: farben.textLeise, lineHeight: 19, marginHorizontal: 4 },
})
