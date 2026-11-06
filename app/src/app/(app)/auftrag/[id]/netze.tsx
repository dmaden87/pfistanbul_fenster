import { montageBetrag, positionenSumme } from '@pf/components/admin/hilfen'
import { netSets, netsInSet, windowTypes } from '@pf/data/catalog'
import { MECHANISMEN, NETZARTEN, NETZFARBEN, OEFFNUNGEN, RAHMENDICKEN, RAHMENFARBEN, RAHMENFARBEN_WAHL } from '@pf/data/produktion'
import { shopConfig } from '@pf/data/shopConfig'
import { formatChf, formatSize } from '@pf/lib/format'
import { ausKatalog, betragAusFeld, katalogWert, leer, netzeMitPreis, netzeZumSpeichern, zuEntwurf, type Entwurf } from '@pf/lib/netzentwurf'
import type { AdminSprache } from '@pf/components/admin/sprache'
import type { OpeningDirection } from '@pf/types'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { Feld } from '@/components/Feld'
import { Abschnitt, BearbeitenRahmen, rahmenStile as r } from '@/components/Rahmen'
import { Wahl, type Option } from '@/components/Wahl'
import { fuelle, useSprache } from '@/lib/sprache'
import { useBestellungen } from '@/lib/bestellungen'

/** Aus einer Beschriftungstabelle der Produktion die Knoepfe machen – in der Sprache der Maske. */
function optionen<T extends string>(tabelle: Record<T, Record<AdminSprache, string>>, sprache: AdminSprache, nur?: T[]): Option<T>[] {
  return (nur ?? (Object.keys(tabelle) as T[])).map((wert) => ({ wert, text: tabelle[wert][sprache] }))
}

/**
 * Die Netze einer Bestellung bearbeiten – das Gegenstueck zum Netz-Editor
 * im Web-Admin. Die Regeln (Preis, Richtpreis, was gueltig ist) kommen aus
 * src/lib/netzentwurf.ts; hier steht nur die Oberflaeche.
 *
 * Wie im Web: auf einem Entwurf gearbeitet, gespeichert auf Knopfdruck.
 * Zurueck verwirft den Entwurf.
 */
export default function NetzeBearbeiten() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bestellungen, aendern } = useBestellungen()
  const b = bestellungen.find((x) => x.id === id)
  const katalog = b?.art === 'bestellung'
  const [entwuerfe, setEntwuerfe] = useState<Entwurf[]>(() => (b && b.positionen.length > 0 ? b.positionen.map(zuEntwurf) : [leer()]))
  const [montage, setMontage] = useState(() => String(b ? montageBetrag(b) : 0))
  const [laeuft, setLaeuft] = useState(false)
  const { t, sprache } = useSprache()

  if (!b) return null

  const netze = netzeMitPreis(entwuerfe, b.positionen, katalog)
  const summeNetze = positionenSumme(netze)
  const anzahl = netze.reduce((n, p) => n + p.menge, 0)
  const aendere = (i: number, teil: Partial<Entwurf>) => setEntwuerfe((l) => l.map((e, j) => (j === i ? { ...e, ...teil } : e)))

  async function speichern() {
    const pruefung = netzeZumSpeichern(netze, katalog)
    if (pruefung.fehler) return Alert.alert(t.nichtGespeichert, t[pruefung.fehler])
    setLaeuft(true)
    try {
      await aendern(b!.id, { positionen: pruefung.netze, montageChf: betragAusFeld(montage) })
      router.back()
    } catch (f) {
      Alert.alert(t.nichtGespeichert, f instanceof Error ? f.message : String(f))
    } finally {
      setLaeuft(false)
    }
  }

  const katalogOptionen: Option<string>[] = [
    ...windowTypes.map((typ) => ({ wert: `typ:${typ.id}`, text: `${typ.label} · ${formatChf(typ.priceChf)}` })),
    ...netSets.map((set) => ({ wert: `set:${set.id}`, text: `${set.label} (${netsInSet(set)}) · ${formatChf(set.priceChf)}` })),
  ]

  return (
    <BearbeitenRahmen titel={t.netzeBearbeiten} unterzeile={`${b.kunde.name} · ${b.referenz}`} speichernText={t.netzeSpeichern} onSpeichern={speichern} laeuft={laeuft}>
      <Text style={r.satz}>{katalog ? t.katalogSatz : t.preisGerechnetSatz}</Text>

      {entwuerfe.map((e, i) => {
        const netz = netze[i]
        const rahmenfarben = optionen(RAHMENFARBEN, sprache, RAHMENFARBEN_WAHL.includes(e.rahmenfarbe) ? RAHMENFARBEN_WAHL : [...RAHMENFARBEN_WAHL, e.rahmenfarbe])
        const dicken = optionen(RAHMENDICKEN, sprache)
        // Alteintraege tragen manchmal freien Text ("ca. 3 cm") – der bleibt waehlbar.
        if (e.rahmendicke && !dicken.some((d) => d.wert === e.rahmendicke)) dicken.push({ wert: e.rahmendicke as never, text: `${e.rahmendicke} (${t.alt})` })
        return (
          <Abschnitt
            key={i}
            titel={`${t.netzNummer} ${i + 1}`}
            rechts={
              entwuerfe.length > 1 ? (
                <Pressable onPress={() => setEntwuerfe((l) => l.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={fuelle(t.netzEntfernenLabel, { n: i + 1 })} hitSlop={10}>
                  <Text style={r.gefahrLink}>{t.netzEntfernen}</Text>
                </Pressable>
              ) : undefined
            }
          >
            {katalog ? (
              <Wahl label={t.katalogprodukt} optionen={katalogOptionen} wert={katalogWert(e)} onWahl={(w) => setEntwuerfe((l) => l.map((x, j) => (j === i ? ausKatalog(w, x) : x)))} />
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Feld id={`bez-${i}`} label={t.bezeichnungRaum} value={e.bezeichnung} onChangeText={(v) => aendere(i, { bezeichnung: v })} />
              </View>
              <View style={{ width: 80 }}>
                <Feld id={`menge-${i}`} label={t.anzahlKurz} value={e.menge} onChangeText={(v) => aendere(i, { menge: v })} keyboardType="number-pad" />
              </View>
            </View>
            {!katalog ? (
              <>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Feld id={`breite-${i}`} label={t.breiteCm} value={e.breiteCm} onChangeText={(v) => aendere(i, { breiteCm: v })} keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Feld id={`hoehe-${i}`} label={t.hoeheCm} value={e.hoeheCm} onChangeText={(v) => aendere(i, { hoeheCm: v })} keyboardType="decimal-pad" />
                  </View>
                </View>
                <Wahl label={t.rahmendicke} optionen={dicken} wert={e.rahmendicke} onWahl={(w) => aendere(i, { rahmendicke: w })} />
                <Wahl label={t.rahmenfarbe} optionen={rahmenfarben} wert={e.rahmenfarbe} onWahl={(w) => aendere(i, { rahmenfarbe: w })} />
                <Wahl label={t.netzfarbe} optionen={optionen(NETZFARBEN, sprache)} wert={e.netzfarbe} onWahl={(w) => aendere(i, { netzfarbe: w })} />
                <Wahl label={t.netzart} optionen={optionen(NETZARTEN, sprache)} wert={e.netzart} onWahl={(w) => aendere(i, { netzart: w })} />
                <Wahl label={t.mechanismus} optionen={optionen(MECHANISMEN, sprache)} wert={e.mechanismus} onWahl={(w) => aendere(i, { mechanismus: w })} />
                <Wahl<OpeningDirection> label={t.oeffnungVonInnen} optionen={optionen(OEFFNUNGEN, sprache)} wert={e.oeffnung} onWahl={(w) => aendere(i, { oeffnung: w })} />
              </>
            ) : null}
            <View style={r.zeile}>
              <Text style={r.satz}>
                {netz.breiteCm && netz.hoeheCm ? formatSize(netz.breiteCm, netz.hoeheCm) : katalog ? '' : t.masseFehlen}
              </Text>
              <Text style={[r.zahl, r.stark]}>{netz.preisChf > 0 ? `${netz.menge}× ${formatChf(netz.preisChf)}` : t.preisFrage}</Text>
            </View>
          </Abschnitt>
        )
      })}

      <Pressable onPress={() => setEntwuerfe((l) => [...l, leer()])} accessibilityRole="button" style={[r.zeile, { justifyContent: 'center' }]}>
        <Text style={r.link}>{`+ ${t.netzHinzufuegen}`}</Text>
      </Pressable>

      <Abschnitt titel={t.montageDurchUns}>
        <Feld id="montage" label={t.montageInsgesamt} value={montage} onChangeText={setMontage} keyboardType="decimal-pad" />
        <Text style={r.satz}>{fuelle(t.montageProFenster, { preis: formatChf(shopConfig.montageChf) })}</Text>
        {anzahl > 0 ? (
          <Pressable onPress={() => setMontage(String(anzahl * shopConfig.montageChf))} accessibilityRole="button" hitSlop={8}>
            <Text style={r.link}>{fuelle(t.montageEinsetzen, { n: anzahl, preis: formatChf(shopConfig.montageChf) })}</Text>
          </Pressable>
        ) : null}
      </Abschnitt>

      <Abschnitt>
        <View style={r.zeile}>
          <Text style={r.zeilenText}>{t.netzeSumme}</Text>
          <Text style={r.zahl}>{formatChf(summeNetze)}</Text>
        </View>
        <View style={r.zeile}>
          <Text style={[r.zeilenText, r.stark]}>{t.totalSumme}</Text>
          <Text style={[r.zahl, r.stark]}>{formatChf(Math.round((summeNetze + betragAusFeld(montage)) * 100) / 100)}</Text>
        </View>
      </Abschnitt>
    </BearbeitenRahmen>
  )
}
