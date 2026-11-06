import { formatChf, formatSize } from '@pf/lib/format'
import type { Bestellung } from '@pf/types'
import { router, useLocalSearchParams } from 'expo-router'
import type { ReactNode } from 'react'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Pfeil } from '@/components/Symbol'
import { netzAnzahl, PHASE_LABEL, PHASEN, preisOffen, quelleLabel, tageInPhase, termine, whatsappNummer, type Phase } from '@/lib/auftrag'
import { useBestellungen } from '@/lib/bestellungen'
import { farben, radius, TIPPFLAECHE } from '@/theme'

/**
 * Ein Auftrag auf einem Bildschirm. In V1.0 zum Ansehen und um die
 * Kundschaft zu erreichen (Anrufen, WhatsApp, Mail, Karte); Bearbeiten,
 * Phase umstellen und Vorlagen senden kommen mit V1.1 – siehe
 * docs/app/README.md.
 */
export default function Auftrag() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bestellungen } = useBestellungen()
  const b = bestellungen.find((x) => x.id === id)

  if (!b) {
    return (
      <SafeAreaView style={s.seite}>
        <Kopf>Auftrag</Kopf>
        <Text style={s.leer}>Diesen Auftrag gibt es nicht mehr.</Text>
      </SafeAreaView>
    )
  }

  const phase = b.status === 'abgesagt' ? null : (b.status as Phase)
  const idx = phase ? PHASEN.indexOf(phase) : -1
  const tage = tageInPhase(b)

  return (
    <SafeAreaView style={s.seite} edges={['top', 'bottom']}>
      <Kopf>{`${b.referenz} · ${quelleLabel(b)} · ${tage === 0 ? 'heute' : `seit ${tage} T`}`}</Kopf>
      <ScrollView contentContainerStyle={s.inhalt}>
        <Text style={s.name} accessibilityRole="header">{b.kunde.name}</Text>
        <Text style={s.unterzeile}>
          {[b.kunde.ort, `${netzAnzahl(b)} Netze`, preisOffen(b) ? 'Preis offen' : formatChf(b.summeChf)].filter(Boolean).join(' · ')}
        </Text>

        <Karte titel="Phase">
          <View style={s.phasenBalken}>
            {PHASEN.map((p, i) => (
              <View key={p} style={[s.balken, { backgroundColor: i < idx ? farben.marke : i === idx ? farben.hinweis : farben.rand }]} />
            ))}
          </View>
          <Text style={s.phaseText}>{phase ? PHASE_LABEL[phase] : 'Abgesagt'}</Text>
        </Karte>

        <Aktionen b={b} />

        <Karte titel="Kontakt">
          <Text style={s.zeilenText}>{b.kunde.telefon || '— keine Telefonnummer —'}</Text>
          <Text style={s.zeilenText}>{b.kunde.email || '— keine Mail —'}</Text>
          <Text style={s.leise}>{[b.kunde.strasse, [b.kunde.plz, b.kunde.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</Text>
        </Karte>

        <Karte titel="Termine">
          {termine(b).length ? (
            termine(b).map((t) => (
              <View key={t.art} style={s.paar}>
                <Text style={s.zeilenText}>{t.art}</Text>
                <Text style={[s.zeilenText, { fontWeight: '600' }]}>{t.wann}</Text>
              </View>
            ))
          ) : (
            <Text style={s.leise}>Noch kein Termin.</Text>
          )}
        </Karte>

        <Karte titel="Netze & Preise">
          {b.positionen.map((p, i) => (
            <View key={p.id ?? i} style={[s.netz, i > 0 && s.trenner]}>
              <Text style={s.menge}>{p.menge}×</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.zeilenText}>{p.bezeichnung}</Text>
                <Text style={s.leise}>
                  {p.breiteCm && p.hoeheCm ? formatSize(p.breiteCm, p.hoeheCm) : p.detail || ' '}
                </Text>
              </View>
              <Text style={s.preis}>{p.preisChf > 0 ? formatChf(p.preisChf) : 'Preis?'}</Text>
            </View>
          ))}
          {b.montage ? (
            <View style={[s.netz, s.trenner]}>
              <Text style={s.menge} />
              <Text style={[s.zeilenText, { flex: 1 }]}>Montage</Text>
              <Text style={s.preis}>{formatChf(b.montageChf ?? 0)}</Text>
            </View>
          ) : null}
          <View style={[s.paar, s.summe]}>
            <Text style={[s.zeilenText, { fontWeight: '700' }]}>Total</Text>
            <Text style={[s.preis, { fontWeight: '700' }]}>{formatChf(b.summeChf)}</Text>
          </View>
        </Karte>

        {b.kunde.bemerkung || b.notiz ? (
          <Karte titel="Notizen">
            {b.kunde.bemerkung ? <Text style={s.zeilenText}>{`Kundschaft: ${b.kunde.bemerkung}`}</Text> : null}
            {b.notiz ? <Text style={s.zeilenText}>{b.notiz}</Text> : null}
          </Karte>
        ) : null}

        <Text style={s.hinweis}>Bearbeiten, Phase umstellen und Nachrichten senden kommen mit dem nächsten Update.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Kopf({ children }: { children: string }) {
  return (
    <View style={s.kopf}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Zurück zu den Aufträgen" style={s.zurueck}>
        <Pfeil farbe={farben.text} richtung="links" />
      </Pressable>
      <Text style={s.kopfText} numberOfLines={1}>{children}</Text>
    </View>
  )
}

function Karte({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <View style={s.karte}>
      <Text style={s.karteTitel} accessibilityRole="header">{titel}</Text>
      {children}
    </View>
  )
}

/** Anrufen, WhatsApp, Mail, Karte – oeffnet die jeweilige App des Telefons. */
function Aktionen({ b }: { b: Bestellung }) {
  const wa = whatsappNummer(b.kunde.telefon)
  const adresse = [b.kunde.strasse, b.kunde.plz, b.kunde.ort].filter(Boolean).join(' ')
  const knoepfe: { label: string; url: string | null; fehlt: string }[] = [
    { label: 'Anrufen', url: b.kunde.telefon ? `tel:${b.kunde.telefon.replace(/\s/g, '')}` : null, fehlt: 'Keine Telefonnummer hinterlegt.' },
    { label: 'WhatsApp', url: wa ? `https://wa.me/${wa}` : null, fehlt: 'Keine Handynummer hinterlegt.' },
    { label: 'Mail', url: b.kunde.email ? `mailto:${b.kunde.email}` : null, fehlt: 'Keine Mailadresse hinterlegt.' },
    { label: 'Karte', url: adresse ? `geo:0,0?q=${encodeURIComponent(adresse)}` : null, fehlt: 'Keine Adresse hinterlegt.' },
  ]
  return (
    <View style={s.aktionen}>
      {knoepfe.map((k) => (
        <Pressable
          key={k.label}
          accessibilityRole="button"
          accessibilityState={{ disabled: !k.url }}
          onPress={() => (k.url ? Linking.openURL(k.url).catch(() => Alert.alert(k.label, 'Dafür ist keine App installiert.')) : Alert.alert(k.label, k.fehlt))}
          style={({ pressed }) => [s.aktion, !k.url && s.aktionAus, pressed && { opacity: 0.8 }]}
        >
          <Text style={[s.aktionText, !k.url && { color: farben.textSchwach }]}>{k.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  seite: { flex: 1, backgroundColor: farben.grund },
  kopf: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4 },
  zurueck: { width: TIPPFLAECHE, height: TIPPFLAECHE, alignItems: 'center', justifyContent: 'center' },
  kopfText: { flex: 1, fontSize: 13, color: farben.textLeise },
  inhalt: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  name: { fontSize: 28, fontWeight: '700', color: farben.marke, marginHorizontal: 4, marginTop: 4 },
  unterzeile: { fontSize: 15, color: farben.textLeise, marginHorizontal: 4, marginBottom: 4 },
  karte: { backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.rand, borderRadius: radius.gross, padding: 14, gap: 6 },
  karteTitel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: farben.textLeise, marginBottom: 2 },
  phasenBalken: { flexDirection: 'row', gap: 4 },
  balken: { flex: 1, height: 6, borderRadius: 3 },
  phaseText: { fontSize: 16, fontWeight: '600', color: farben.marke, marginTop: 4 },
  aktionen: { flexDirection: 'row', gap: 8 },
  aktion: { flex: 1, minHeight: 56, borderRadius: radius.mittel, borderWidth: 1, borderColor: farben.rand, backgroundColor: farben.flaeche, alignItems: 'center', justifyContent: 'center' },
  aktionAus: { backgroundColor: farben.grundAlt },
  aktionText: { fontSize: 13, fontWeight: '600', color: farben.marke },
  zeilenText: { fontSize: 15, color: farben.text },
  leise: { fontSize: 13, color: farben.textLeise },
  paar: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  netz: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  trenner: { borderTopWidth: 1, borderTopColor: farben.linie },
  menge: { width: 28, fontWeight: '600', color: farben.marke, fontSize: 15 },
  preis: { fontSize: 15, color: farben.text, fontVariant: ['tabular-nums'] },
  summe: { borderTopWidth: 1, borderTopColor: farben.rand, paddingTop: 8, marginTop: 2 },
  hinweis: { fontSize: 13, color: farben.textSchwach, textAlign: 'center', marginTop: 8 },
  leer: { textAlign: 'center', color: farben.textSchwach, marginTop: 32, fontSize: 15 },
})
