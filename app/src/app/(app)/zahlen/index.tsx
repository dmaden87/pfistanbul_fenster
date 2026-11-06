import { beteiligte } from '@pf/data/kostenConfig'
import { formatChf } from '@pf/lib/format'
import { freiePosten, kennzahlen, offeneEinnahmen, offeneForderungen, offeneSchulden, zaehltPhase, zahlenFuer } from '@pf/lib/pl'
import { router } from 'expo-router'
import { useMemo } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Knopf } from '@/components/Blatt'
import { Hauptleiste } from '@/components/Hauptleiste'
import { SprachSchalter } from '@/components/SprachSchalter'
import { Streifen, ZahlenKarte, ZahlZeile } from '@/components/Zahlen'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'
import { kategorieTitel } from '@/lib/zahlen'
import { farben, radius, TIPPFLAECHE } from '@/theme'

/** Wie viele Zeilen je Block direkt hier stehen; der Rest eine Ebene tiefer. */
const KURZ = 4

/**
 * Die Zahlen am Telefon: zum Arbeiten, nicht zum Auswerten.
 *
 * Drei Dinge passieren unterwegs, und genau die stehen hier, in dieser
 * Reihenfolge: eine Ausgabe erfassen (Knopf ganz oben), die echten Kosten
 * eines Auftrags nachtragen, wenn Bora sie nennt, und abrechnen, wenn
 * Geld eingegangen ist. Die drei Zahlen oben sagen, wo man steht; die
 * Auswertungen (Jahre, Sendungen, Funnel) liegen eine Ebene tiefer – die
 * liest man am Schreibtisch.
 *
 * Gerechnet wird ausschliesslich in src/lib/pl.ts.
 */
export default function Zahlen() {
  const { bestellungen, auslagen, abrechnungen, laedt, fehler, neuLaden } = useBestellungen()
  const { t, datumsform } = useSprache()

  const d = useMemo(() => {
    const k = kennzahlen(bestellungen, auslagen, abrechnungen)
    const schulden = offeneSchulden(bestellungen, auslagen, abrechnungen)
    const einnahmen = offeneEinnahmen(bestellungen, abrechnungen)
    const geschaetzt = bestellungen
      .filter((b) => zaehltPhase(b) && !b.ausserRechnung)
      .map((b) => ({ b, z: zahlenFuer(b) }))
      .filter((x) => x.z.geschaetzt)
      .sort((x, y) => (x.z.datum < y.z.datum ? -1 : 1))
    return {
      k,
      forderungenChf: offeneForderungen(bestellungen).reduce((x, f) => x + f.betragChf, 0),
      schuldenChf: schulden.reduce((x, s) => x + s.betragChf, 0),
      einnahmen,
      einnahmenChf: einnahmen.reduce((x, e) => x + e.erloesChf, 0),
      frei: freiePosten(schulden).length,
      entwurf: abrechnungen.find((a) => !a.erledigtAm),
      erledigt: abrechnungen.filter((a) => a.erledigtAm).length,
      geschaetzt,
      alleAuftraege: bestellungen.filter(zaehltPhase).length,
      ausgaben: [...auslagen].sort((x, y) => (x.am < y.am ? 1 : -1)),
    }
  }, [bestellungen, auslagen, abrechnungen])

  const geh = (wohin: string, params?: Record<string, string>) => router.push({ pathname: `/zahlen/${wohin}` as never, params })

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

        <Streifen
          felder={[
            { titel: t.zErgebnisKurz, betrag: d.k.betriebsergebnisChf, onPress: () => geh('auswertung') },
            { titel: t.zSchuldetUns, betrag: d.forderungenChf, onPress: () => geh('forderungen') },
            { titel: t.zSchuldenWir, betrag: d.schuldenChf, onPress: () => geh('schulden') },
          ]}
        />

        <Knopf text={`+ ${t.zAusgabeErfassen}`} onPress={() => geh('ausgabe')} />

        {/* --- Abrechnen ---------------------------------------------------- */}
        <ZahlenKarte titel={t.zAbrechnung}>
          {d.entwurf ? (
            <ZahlZeile erste titel={fuelle(t.zEntwurfWartet, { nummer: d.entwurf.nummer })} marke={t.zEntwurf} betrag={d.entwurf.erloesChf} onPress={() => geh('abrechnen')} />
          ) : d.einnahmen.length + d.frei > 0 ? (
            <ZahlZeile
              erste
              titel={t.zAbrechnenKnopf}
              unter={fuelle(t.zAbrechnenBereit, { a: d.einnahmen.length, p: d.frei })}
              betrag={d.einnahmenChf}
              stark
              onPress={() => geh('abrechnen')}
            />
          ) : (
            <ZahlZeile erste titel={t.zNichtsAbzurechnen} />
          )}
          {d.erledigt > 0 ? <ZahlZeile titel={fuelle(t.zFruehereAnzahl, { n: d.erledigt })} onPress={() => geh('historie')} /> : null}
        </ZahlenKarte>

        {/* --- Kosten erfassen ---------------------------------------------- */}
        <ZahlenKarte titel={t.zKostenErfassen}>
          {d.geschaetzt.length === 0 ? <ZahlZeile erste titel={t.zAllesErfasst} /> : <Text style={s.satz}>{t.zKostenErfassenSatz}</Text>}
          {d.geschaetzt.slice(0, KURZ).map(({ b, z }, i) => (
            <ZahlZeile
              key={b.id}
              erste={i === 0}
              titel={b.kunde.name}
              unter={fuelle(t.zKostenGeschaetztUnter, { ref: b.referenz, kosten: formatChf(z.kostenChf) })}
              onPress={() => router.push({ pathname: '/auftrag/[id]/kosten', params: { id: b.id } })}
            />
          ))}
          <ZahlZeile titel={fuelle(t.zAlleKosten, { n: d.alleAuftraege })} onPress={() => geh('auftraege')} />
        </ZahlenKarte>

        {/* --- Betriebsausgaben --------------------------------------------- */}
        <ZahlenKarte titel={t.zBetriebskosten}>
          {d.ausgaben.length === 0 ? <ZahlZeile erste titel={t.zKeineAusgaben} /> : null}
          {d.ausgaben.slice(0, KURZ).map((a, i) => (
            <ZahlZeile
              key={a.id}
              erste={i === 0}
              titel={a.bezeichnung}
              unter={fuelle(t.zAusgabeUnter, { datum: new Date(a.am).toLocaleDateString(datumsform), kategorie: kategorieTitel(a.kategorie, t), wer: beteiligte[a.traeger] })}
              betrag={a.betragChf}
              onPress={() => geh('ausgabe', { id: a.id })}
            />
          ))}
          {d.ausgaben.length > KURZ ? <ZahlZeile titel={fuelle(t.zAlleAusgaben, { n: d.ausgaben.length })} onPress={() => geh('ausgaben')} /> : null}
        </ZahlenKarte>

        <ZahlenKarte>
          <ZahlZeile erste titel={t.zAuswertungen} unter={t.zAuswertungenUnter} onPress={() => geh('auswertung')} />
        </ZahlenKarte>
      </ScrollView>
      <Hauptleiste aktiv="zahlen" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  seite: { flex: 1, backgroundColor: farben.grund },
  kopf: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, minHeight: TIPPFLAECHE },
  titel: { flex: 1, fontSize: 26, fontWeight: '700', color: farben.marke },
  inhalt: { paddingHorizontal: 12, paddingBottom: 24, gap: 10 },
  satz: { fontSize: 13, color: farben.textLeise, paddingBottom: 4 },
  fehlerBox: { padding: 14, borderRadius: radius.mittel, backgroundColor: farben.gefahrWeich, gap: 8 },
  fehlerText: { color: farben.gefahr, fontSize: 15 },
  nochmals: { color: farben.gefahr, fontWeight: '700', fontSize: 15 },
})
