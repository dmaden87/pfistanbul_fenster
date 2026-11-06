import { formatChf } from '@pf/lib/format'
import { forecast, kennzahlen, offeneForderungen, offeneSchulden, sendungen, zaehltPhase } from '@pf/lib/pl'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Hauptleiste } from '@/components/Hauptleiste'
import { SprachSchalter } from '@/components/SprachSchalter'
import { Hinweis, ZahlenKarte, ZahlZeile, zahlenStile as z } from '@/components/Zahlen'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'
import { farben, radius, TIPPFLAECHE } from '@/theme'

/**
 * Die Zahlen auf einen Blick – und von hier eine Ebene tiefer.
 *
 * Im Web steht alles untereinander auf einer langen Seite mit Kacheln und
 * breiten Tabellen. Hier oben das eine, was zaehlt (Betriebsergebnis), dann
 * Erloes, Kosten, Funnel als Zeilen; darunter, was offen ist, und die
 * Auswertungen. Jede Zeile fuehrt auf ihre eigene Seite.
 *
 * Gerechnet wird ausschliesslich in src/lib/pl.ts – dieselben Funktionen wie
 * in ZahlenPage.tsx. Die App rechnet nichts selbst.
 */
export default function Zahlen() {
  const { bestellungen, auslagen, abrechnungen, laedt, fehler, neuLaden } = useBestellungen()
  const { t } = useSprache()

  const daten = useMemo(() => {
    const k = kennzahlen(bestellungen, auslagen, abrechnungen)
    const forderungen = offeneForderungen(bestellungen)
    const schulden = offeneSchulden(bestellungen, auslagen, abrechnungen)
    return {
      k,
      forderungen: { n: forderungen.length, chf: forderungen.reduce((x, f) => x + f.betragChf, 0) },
      schulden: { n: schulden.reduce((x, s) => x + s.posten.length, 0), chf: schulden.reduce((x, s) => x + s.betragChf, 0) },
      auftraege: bestellungen.filter(zaehltPhase).length,
      sendungen: sendungen(bestellungen).length,
      funnel: forecast(bestellungen).reduce((x, f) => x + f.anzahl, 0),
    }
  }, [bestellungen, auslagen, abrechnungen])
  const { k } = daten
  const geh = (wohin: string) => router.push(`/zahlen/${wohin}` as never)

  return (
    <SafeAreaView style={s.seite} edges={['top']}>
      <View style={s.kopf}>
        <Text style={s.titel} accessibilityRole="header">{t.zahlen}</Text>
        <SprachSchalter />
      </View>
      <ScrollView
        contentContainerStyle={s.inhalt}
        refreshControl={<RefreshControl refreshing={laedt && bestellungen.length > 0} onRefresh={neuLaden} tintColor={farben.marke} colors={[farben.marke]} />}
      >
        {fehler ? (
          <View style={s.fehlerBox}>
            <Text style={s.fehlerText}>{fehler}</Text>
            <Pressable onPress={neuLaden} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center' }}>
              <Text style={s.nochmals}>{t.nochmalsVersuchen}</Text>
            </Pressable>
          </View>
        ) : null}
        {laedt && bestellungen.length === 0 ? <ActivityIndicator color={farben.marke} style={{ marginTop: 32 }} /> : null}

        <View style={s.held}>
          <Text style={z.grossTitel}>{t.zBetriebsergebnis}</Text>
          <Text style={[z.gross, k.betriebsergebnisChf < 0 && { color: farben.gefahr }]}>{formatChf(k.betriebsergebnisChf)}</Text>
          <Text style={s.heldUnter}>
            {fuelle(t.zRentabilitaetUnter, { r: k.rentabilitaet === null ? '–' : `${k.rentabilitaet} %`, real: formatChf(k.realErgebnisChf) })}
          </Text>
          <Text style={s.heldSatz}>{t.zBetriebsergebnisSatz}</Text>
        </View>

        <ZahlenKarte>
          <ZahlZeile
            erste
            titel={t.zTotalErloes}
            betrag={k.erloesChf}
            unter={fuelle(t.zErloesUnter, { cashed: formatChf(k.cashedChf), debit: formatChf(k.debitChf), arbeit: formatChf(k.inArbeitChf) })}
          />
          <ZahlZeile
            titel={t.zTotalKosten}
            betrag={k.kostenChf}
            unter={fuelle(t.zKostenUnter, { ware: formatChf(k.warenkostenChf), betrieb: formatChf(k.betriebskostenChf) })}
          />
          <ZahlZeile titel={t.zFunnel} betrag={k.funnelChf} unter={fuelle(t.zFunnelSatz, { n: k.funnelAnzahl, m: k.funnelNetze })} onPress={() => geh('pipeline')} />
        </ZahlenKarte>

        <ZahlenKarte titel={t.zOffenTitel}>
          <ZahlZeile
            erste
            titel={t.zSchuldetUns}
            betrag={daten.forderungen.chf}
            unter={fuelle(t.zAnzahlAuftraege, { n: daten.forderungen.n })}
            onPress={() => geh('forderungen')}
          />
          <ZahlZeile
            titel={t.zSchuldenWir}
            betrag={daten.schulden.chf}
            unter={fuelle(t.zAnzahlPosten, { n: daten.schulden.n })}
            onPress={() => geh('schulden')}
          />
        </ZahlenKarte>

        <ZahlenKarte titel={t.zAuswertung}>
          <ZahlZeile erste titel={t.zProAuftrag} unter={fuelle(t.zAnzahlAuftraege, { n: daten.auftraege })} onPress={() => geh('auftraege')} />
          <ZahlZeile titel={t.zProSendung} unter={fuelle(t.zAnzahlSendungen, { n: daten.sendungen })} onPress={() => geh('sendungen')} />
          <ZahlZeile titel={t.zAuftraegeIst} unter={t.zJahre} onPress={() => geh('jahre')} />
        </ZahlenKarte>

        <Hinweis>{t.zSpaeterAbrechnen}</Hinweis>
      </ScrollView>
      <Hauptleiste aktiv="zahlen" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  seite: { flex: 1, backgroundColor: farben.grund },
  kopf: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, minHeight: TIPPFLAECHE },
  titel: { flex: 1, fontSize: 30, fontWeight: '700', color: farben.marke },
  inhalt: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  held: { backgroundColor: farben.markeWeich, borderRadius: radius.gross, padding: 16, gap: 4 },
  heldUnter: { fontSize: 15, fontWeight: '600', color: farben.marke },
  heldSatz: { fontSize: 13, color: farben.textLeise, marginTop: 2 },
  fehlerBox: { padding: 14, borderRadius: radius.mittel, backgroundColor: farben.gefahrWeich, gap: 8 },
  fehlerText: { color: farben.gefahr, fontSize: 15 },
  nochmals: { color: farben.gefahr, fontWeight: '700', fontSize: 15 },
})
