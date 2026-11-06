import { beteiligte } from '@pf/data/kostenConfig'
import { betragAusText, formatChf } from '@pf/lib/format'
import { abgerechneteAuslagen } from '@pf/lib/pl'
import type { AuslagenKategorie, Beteiligter } from '@pf/types'
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Feld } from '@/components/Feld'
import { Abschnitt, BearbeitenRahmen, rahmenStile as r } from '@/components/Rahmen'
import { Wahl } from '@/components/Wahl'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'
import { KATEGORIEN, kategorieTitel } from '@/lib/zahlen'
import { farben, radius } from '@/theme'

const LEUTE: Beteiligter[] = ['deniz', 'ufuk', 'bora']

/** Heute als ISO-Tag in Ortszeit – so speichert auch der Web-Admin. */
function isoTag(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

/**
 * Eine Betriebsausgabe erfassen oder aendern – das, was unterwegs am
 * haeufigsten passiert: an der Kasse stehen, Beleg in der Hand.
 *
 * Darum steht der Betrag zuoberst und gross, die Tastatur ist sofort offen,
 * und alles andere ist vorbelegt (heute, Material, wer die App bedient).
 * Zwei Felder und ein Tipp, dann ist es drin.
 *
 * Steht die Ausgabe in einer abgeschlossenen Abrechnung, ist sie ein Beleg
 * und nicht mehr aenderbar – wie im Web.
 */
export default function Ausgabe() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { auslagen, abrechnungen, auslageAnlegen, auslageAendern, auslageEntfernen } = useBestellungen()
  const { t, datumsform } = useSprache()
  const alt = id ? auslagen.find((a) => a.id === id) : undefined
  const fest = alt ? abgerechneteAuslagen(abrechnungen).has(alt.id) : false

  const [betrag, setBetrag] = useState(alt ? String(alt.betragChf) : '')
  const [bezeichnung, setBezeichnung] = useState(alt?.bezeichnung ?? '')
  const [kategorie, setKategorie] = useState<AuslagenKategorie>(alt?.kategorie ?? 'material')
  const [traeger, setTraeger] = useState<Beteiligter>(alt?.traeger ?? 'deniz')
  const [am, setAm] = useState(alt?.am?.slice(0, 10) ?? isoTag(new Date()))
  const [notiz, setNotiz] = useState(alt?.notiz ?? '')
  const [laeuft, setLaeuft] = useState(false)

  const zahl = betragAusText(betrag)

  async function speichern() {
    if (fest) return router.back()
    if (!(zahl !== null && zahl > 0) || !bezeichnung.trim()) return Alert.alert(t.nichtGespeichert, t.zAusgabeFehlt)
    setLaeuft(true)
    try {
      const daten = { am, bezeichnung: bezeichnung.trim(), kategorie, betragChf: zahl, traeger, ...(notiz.trim() ? { notiz: notiz.trim() } : {}) }
      if (alt) await auslageAendern(alt.id, daten)
      else await auslageAnlegen(daten)
      router.back()
    } catch (f) {
      Alert.alert(t.nichtGespeichert, f instanceof Error ? f.message : String(f))
    } finally {
      setLaeuft(false)
    }
  }

  function loeschen() {
    if (!alt) return
    Alert.alert(t.zAusgabeLoeschen, fuelle(t.zAusgabeLoeschenFrage, { text: alt.bezeichnung, betrag: formatChf(alt.betragChf) }), [
      { text: t.abbrechen, style: 'cancel' },
      {
        text: t.entfernen,
        style: 'destructive',
        onPress: async () => {
          try {
            await auslageEntfernen(alt.id)
            router.back()
          } catch (f) {
            Alert.alert(t.nichtGespeichert, f instanceof Error ? f.message : String(f))
          }
        },
      },
    ])
  }

  function datumWaehlen() {
    if (Platform.OS !== 'android') return
    DateTimePickerAndroid.open({ value: new Date(`${am}T12:00:00`), mode: 'date', onValueChange: (_e, d) => setAm(isoTag(d)) })
  }

  return (
    <BearbeitenRahmen
      titel={alt ? t.zAusgabeBearbeiten : t.zAusgabeNeu}
      speichernText={fest ? t.zurueck : t.speichern}
      onSpeichern={speichern}
      laeuft={laeuft}
    >
      {fest ? <Text style={[r.satz, s.fest]}>{t.zAusgabeAbgerechnet}</Text> : null}

      <View style={s.betragFeld}>
        <Text style={s.waehrung}>CHF</Text>
        <TextInput
          style={s.betrag}
          value={betrag}
          onChangeText={setBetrag}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={farben.textSchwach}
          autoFocus={!alt}
          editable={!fest}
          accessibilityLabel={t.zBetrag}
        />
      </View>

      <Abschnitt>
        <Feld id="wofuer" label={t.zWofuer} value={bezeichnung} onChangeText={setBezeichnung} placeholder={t.zAusgabeBeispiel} editable={!fest} />
        <Wahl<AuslagenKategorie>
          label={t.zKategorie}
          optionen={KATEGORIEN.map((k) => ({ wert: k, text: kategorieTitel(k, t) }))}
          wert={kategorie}
          onWahl={setKategorie}
          gesperrt={fest}
        />
        <Wahl<Beteiligter> label={t.zAusgelegtVon} optionen={LEUTE.map((w) => ({ wert: w, text: beteiligte[w] }))} wert={traeger} onWahl={setTraeger} gesperrt={fest} />
        <View style={r.zeile}>
          <Text style={r.zeilenText}>{t.zDatum}</Text>
          {Platform.OS === 'android' ? (
            <Pressable onPress={datumWaehlen} disabled={fest} accessibilityRole="button" hitSlop={8}>
              <Text style={r.link}>{new Date(`${am}T12:00:00`).toLocaleDateString(datumsform, { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })}</Text>
            </Pressable>
          ) : (
            <TextInput style={s.datum} value={am} onChangeText={setAm} editable={!fest} accessibilityLabel={t.zDatum} />
          )}
        </View>
        <Feld id="notiz" label={t.notiz} value={notiz} onChangeText={setNotiz} editable={!fest} />
      </Abschnitt>

      {alt && !fest ? (
        <Pressable onPress={loeschen} accessibilityRole="button" style={[r.zeile, { justifyContent: 'center' }]}>
          <Text style={r.gefahrLink}>{t.zAusgabeLoeschen}</Text>
        </Pressable>
      ) : null}
    </BearbeitenRahmen>
  )
}

const s = StyleSheet.create({
  betragFeld: { flexDirection: 'row', alignItems: 'baseline', gap: 10, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.rand, borderRadius: radius.gross, paddingHorizontal: 16, paddingVertical: 8 },
  waehrung: { fontSize: 20, fontWeight: '600', color: farben.textLeise },
  // minWidth/width 0: Ohne das nimmt das Feld im Browser seine Standardbreite und schiebt die Seite seitwaerts.
  betrag: { flex: 1, minWidth: 0, width: 0, fontSize: 36, fontWeight: '700', color: farben.marke, paddingVertical: 4, fontVariant: ['tabular-nums'] },
  datum: { minWidth: 130, fontSize: 15, borderWidth: 1, borderColor: farben.rand, borderRadius: radius.klein, paddingHorizontal: 10, paddingVertical: 8, color: farben.text },
  fest: { backgroundColor: farben.hinweisWeich, padding: 10, borderRadius: radius.mittel, color: farben.hinweisTinte },
})
