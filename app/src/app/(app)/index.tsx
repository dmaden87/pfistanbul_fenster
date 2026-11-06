import { formatChf } from '@pf/lib/format'
import type { Bestellung } from '@pf/types'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Pfeil, Uhr } from '@/components/Symbol'
import { useAnmeldung } from '@/lib/anmeldung'
import {
  aktiv,
  baldFaellig,
  initialen,
  mussNachfassen,
  netzAnzahl,
  PHASE_LABEL,
  PHASEN,
  preisOffen,
  tageInPhase,
  type Aufgabe,
  type Phase,
  VORSCHAU_TAGE,
} from '@/lib/auftrag'
import { useBestellungen } from '@/lib/bestellungen'
import { farben, radius, TIPPFLAECHE } from '@/theme'

type Filter = 'alle' | Phase

/**
 * Die Auftragsliste: oben die Phasen als Reiter, darunter "Bald fällig",
 * dann eine Zeile pro Auftrag. Herunterziehen laedt neu.
 */
export default function Auftraege() {
  const { bestellungen, laedt, fehler, neuLaden } = useBestellungen()
  const { abmelden } = useAnmeldung()
  const [filter, setFilter] = useState<Filter>('alle')

  const aktive = useMemo(
    () => bestellungen.filter(aktiv).sort((a, b) => Date.parse(b.geaendert) - Date.parse(a.geaendert)),
    [bestellungen],
  )
  const anzahl = useMemo(() => {
    const z = Object.fromEntries(PHASEN.map((p) => [p, 0])) as Record<Phase, number>
    for (const b of aktive) z[b.status as Phase]++
    return z
  }, [aktive])
  const aufgaben = useMemo(() => baldFaellig(bestellungen), [bestellungen])
  const liste = filter === 'alle' ? aktive : aktive.filter((b) => b.status === filter)

  const kopf = (
    <View>
      <View style={s.kopf}>
        <Text style={s.titel} accessibilityRole="header">Aufträge</Text>
        <Pressable onPress={abmelden} accessibilityRole="button" style={s.abmelden} hitSlop={8}>
          <Text style={s.abmeldenText}>Abmelden</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.reiter} accessibilityRole="tablist">
        {(['alle', ...PHASEN] as Filter[]).map((f) => {
          const an = filter === f
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              accessibilityRole="tab"
              accessibilityState={{ selected: an }}
              style={[s.chip, an && s.chipAn]}
            >
              <Text style={[s.chipText, an && s.chipTextAn]}>{f === 'alle' ? 'Alle' : PHASE_LABEL[f]}</Text>
              <Text style={[s.chipZahl, an && s.chipZahlAn]}>{f === 'alle' ? aktive.length : anzahl[f]}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {fehler ? (
        <View style={s.fehlerBox}>
          <Text style={s.fehlerText}>{fehler}</Text>
          <Pressable onPress={neuLaden} accessibilityRole="button" style={s.nochmals}>
            <Text style={s.nochmalsText}>Nochmals versuchen</Text>
          </Pressable>
        </View>
      ) : null}

      {filter === 'alle' && aufgaben.length > 0 ? (
        <View style={s.block}>
          <Text style={s.blockTitel} accessibilityRole="header">{`Bald fällig · ${VORSCHAU_TAGE} Tage`}</Text>
          <View style={{ gap: 8 }}>
            {aufgaben.map((a) => <AufgabeZeile key={a.id} aufgabe={a} />)}
          </View>
        </View>
      ) : null}

      <Text style={[s.blockTitel, { marginHorizontal: 20 }]} accessibilityRole="header">
        {filter === 'alle' ? 'Alle aktiven Aufträge' : PHASE_LABEL[filter]}
      </Text>
    </View>
  )

  return (
    <SafeAreaView style={s.seite} edges={['top']}>
      <FlatList
        data={liste}
        keyExtractor={(b) => b.id}
        ListHeaderComponent={kopf}
        renderItem={({ item, index }) => <Zeile b={item} erste={index === 0} letzte={index === liste.length - 1} />}
        ListEmptyComponent={
          laedt ? (
            <ActivityIndicator style={{ marginTop: 32 }} color={farben.marke} />
          ) : (
            <Text style={s.leer}>{filter === 'alle' ? 'Keine aktiven Aufträge.' : `Nichts in «${PHASE_LABEL[filter]}».`}</Text>
          )
        }
        refreshControl={<RefreshControl refreshing={laedt && bestellungen.length > 0} onRefresh={neuLaden} tintColor={farben.marke} colors={[farben.marke]} />}
        contentContainerStyle={{ paddingBottom: 48 }}
      />
    </SafeAreaView>
  )
}

function oeffne(id: string) {
  router.push({ pathname: '/auftrag/[id]', params: { id } })
}

function AufgabeZeile({ aufgabe }: { aufgabe: Aufgabe }) {
  const d = aufgabe.dringend
  return (
    <Pressable onPress={() => oeffne(aufgabe.bestellungId)} accessibilityRole="button" style={({ pressed }) => [s.aufgabe, !d && s.aufgabeSpaeter, pressed && s.gedrueckt]}>
      <View style={s.aufgabeSymbol}><Uhr farbe={d ? farben.hinweisTinte : farben.marke} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.aufgabeTitel}>{aufgabe.titel}</Text>
        <Text style={[s.aufgabeText, !d && s.aufgabeTextSpaeter]}>{aufgabe.text}</Text>
      </View>
      <Pfeil farbe={d ? farben.hinweisTinte : farben.marke} />
    </Pressable>
  )
}

function Zeile({ b, erste, letzte }: { b: Bestellung; erste: boolean; letzte: boolean }) {
  const tage = tageInPhase(b)
  const nachfassen = mussNachfassen(b)
  return (
    <Pressable
      onPress={() => oeffne(b.id)}
      accessibilityRole="button"
      style={({ pressed }) => [s.zeile, erste && s.zeileErste, letzte && s.zeileLetzte, !erste && s.zeileTrenner, pressed && { backgroundColor: farben.grundAlt }]}
    >
      <View style={s.initialen}><Text style={s.initialenText}>{initialen(b.kunde.name)}</Text></View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={s.zeileOben}>
          <Text style={s.name} numberOfLines={1}>{b.kunde.name}</Text>
          <Text style={s.betrag}>{preisOffen(b) ? 'offen' : formatChf(b.summeChf)}</Text>
        </View>
        <View style={s.zeileUnten}>
          <Text style={s.meta} numberOfLines={1}>
            {[b.kunde.ort, `${netzAnzahl(b)} Netze`, tage === 0 ? 'heute' : `seit ${tage} T`].filter(Boolean).join(' · ')}
          </Text>
          <Text style={[s.marke, nachfassen && s.markeWarn]}>{PHASE_LABEL[b.status as Phase]}</Text>
        </View>
      </View>
    </Pressable>
  )
}

const s = StyleSheet.create({
  seite: { flex: 1, backgroundColor: farben.grund },
  kopf: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  titel: { flex: 1, fontSize: 30, fontWeight: '700', color: farben.marke },
  abmelden: { minHeight: TIPPFLAECHE, justifyContent: 'center', paddingHorizontal: 8 },
  abmeldenText: { color: farben.textLeise, fontSize: 15, fontWeight: '600' },
  reiter: { gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: radius.rund, borderWidth: 1, borderColor: farben.rand, backgroundColor: farben.flaeche },
  chipAn: { backgroundColor: farben.marke, borderColor: farben.marke },
  chipText: { fontSize: 14, fontWeight: '600', color: farben.text },
  chipTextAn: { color: farben.aufMarke },
  chipZahl: { fontSize: 12, fontWeight: '600', color: farben.textSchwach },
  chipZahlAn: { color: farben.minze },
  block: { marginHorizontal: 16, marginBottom: 18 },
  blockTitel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: farben.textLeise, marginBottom: 8, marginHorizontal: 4 },
  aufgabe: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.mittel, borderWidth: 1, borderColor: farben.hinweisRand, backgroundColor: farben.hinweisWeich },
  aufgabeSymbol: { width: 36, height: 36, borderRadius: 18, backgroundColor: farben.flaeche, alignItems: 'center', justifyContent: 'center' },
  aufgabeTitel: { fontSize: 15, fontWeight: '600', color: farben.text },
  aufgabeText: { fontSize: 13, color: farben.hinweisTinte },
  aufgabeSpaeter: { backgroundColor: farben.flaeche, borderColor: farben.rand },
  aufgabeTextSpaeter: { color: farben.textLeise },
  gedrueckt: { opacity: 0.8 },
  zeile: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 16, backgroundColor: farben.flaeche, borderLeftWidth: 1, borderRightWidth: 1, borderColor: farben.rand },
  zeileErste: { borderTopWidth: 1, borderTopLeftRadius: radius.gross, borderTopRightRadius: radius.gross },
  zeileLetzte: { borderBottomWidth: 1, borderBottomLeftRadius: radius.gross, borderBottomRightRadius: radius.gross },
  zeileTrenner: { borderTopWidth: 1, borderTopColor: farben.linie },
  initialen: { width: 40, height: 40, borderRadius: 20, backgroundColor: farben.markeWeich, alignItems: 'center', justifyContent: 'center' },
  initialenText: { color: farben.marke, fontWeight: '600', fontSize: 14 },
  zeileOben: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: farben.text },
  betrag: { fontSize: 15, fontWeight: '600', color: farben.text, fontVariant: ['tabular-nums'] },
  zeileUnten: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { flex: 1, fontSize: 13, color: farben.textLeise },
  marke: { fontSize: 12, fontWeight: '600', color: farben.marke, backgroundColor: farben.grundAlt, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.klein, overflow: 'hidden' },
  markeWarn: { backgroundColor: farben.hinweisWeich, color: farben.hinweisTinte },
  leer: { textAlign: 'center', color: farben.textSchwach, marginTop: 32, fontSize: 15 },
  fehlerBox: { marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: radius.mittel, backgroundColor: farben.gefahrWeich, gap: 8 },
  fehlerText: { color: farben.gefahr, fontSize: 15 },
  nochmals: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' },
  nochmalsText: { color: farben.gefahr, fontWeight: '700', fontSize: 15 },
})
