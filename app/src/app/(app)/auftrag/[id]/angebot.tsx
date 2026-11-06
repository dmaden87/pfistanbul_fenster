import { positionDetail, vorschlagFuer } from '@pf/components/admin/hilfen'
import { shopConfig } from '@pf/data/shopConfig'
import {
  abweichendeStempel,
  angebotAenderung,
  angebotRechnung,
  angebotStart,
  preiseAusVorschlaegen,
  preiseNeuGerechnet,
  schluesselFuer,
  type AngebotEntwurf,
} from '@pf/lib/angebot'
import { formatChf } from '@pf/lib/format'
import { router, useLocalSearchParams } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { Alert, Pressable, Switch, Text, View } from 'react-native'
import { Feld } from '@/components/Feld'
import { Abschnitt, BearbeitenRahmen, rahmenStile as r } from '@/components/Rahmen'
import { fuelle, useSprache } from '@/lib/sprache'
import { useBestellungen } from '@/lib/bestellungen'
import { farben } from '@/theme'

const runde2 = (n: number) => Math.round(n * 100) / 100

/**
 * Das Angebot festlegen – Verkaufspreise, Montage, Anfahrt, Rabatt.
 * Gegenstueck zu Angebot.tsx im Web-Admin; die Regeln kommen aus
 * src/lib/angebot.ts. Der Vorschlag des Rechners bleibt neben jedem Preis
 * stehen, die Abweichung daneben.
 */
export default function AngebotFestlegen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bestellungen, aendern } = useBestellungen()
  const b = bestellungen.find((x) => x.id === id)
  const [e, setE] = useState<AngebotEntwurf | null>(() => (b ? angebotStart(b) : null))
  const [stempelErsetzen, setStempelErsetzen] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const { t } = useSprache()

  if (!b || !e) return null
  const rechnung = angebotRechnung(b, e)
  const abweichend = abweichendeStempel(b)
  const setze = (teil: Partial<AngebotEntwurf>) => setE({ ...e, ...teil })

  async function speichern() {
    if (rechnung.unvollstaendig) return Alert.alert(t.nichtGespeichert, t.preisFehltSatz)
    setLaeuft(true)
    try {
      await aendern(b!.id, angebotAenderung(b!, e!, stempelErsetzen))
      router.back()
    } catch (f) {
      Alert.alert(t.nichtGespeichert, f instanceof Error ? f.message : String(f))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <BearbeitenRahmen titel={t.angebotTitel} unterzeile={`${b.kunde.name} · ${b.referenz}`} speichernText={t.knopfPreiseFestlegen} onSpeichern={speichern} laeuft={laeuft}>
      <Text style={r.satz}>{t.angebotSatz}</Text>

      <Abschnitt
        titel={t.verkaufspreise}
        rechts={
          <Pressable onPress={() => setze({ preise: preiseAusVorschlaegen(b, e.preise) })} accessibilityRole="button" hitSlop={8}>
            <Text style={r.link}>{t.richtpreiseUebernehmen}</Text>
          </Pressable>
        }
      >
        {b.positionen.map((p, i) => {
          const schluessel = schluesselFuer(p, i)
          const vorschlag = vorschlagFuer(p)
          const v = rechnung.verkauf(p, i)
          const abweichung = vorschlag !== null && v > 0 ? runde2((v - vorschlag) * p.menge) : null
          return (
            <View key={schluessel} style={{ gap: 6, paddingTop: i > 0 ? 10 : 0, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: farben.linie }}>
              <Text style={[r.zeilenText, r.stark]}>{`${p.menge}× ${p.bezeichnung}`}</Text>
              {positionDetail(p) ? <Text style={r.satz}>{positionDetail(p)}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
                <View style={{ flex: 1 }}>
                  <Feld
                    id={`preis-${i}`}
                    label={t.verkaufJeStueck}
                    value={e.preise[schluessel] ?? ''}
                    onChangeText={(w) => setze({ preise: { ...e.preise, [schluessel]: w } })}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1, paddingBottom: 12, gap: 2 }}>
                  <Text style={r.satz}>{`${t.richtpreisSpalte}: ${vorschlag !== null ? formatChf(vorschlag) : '—'}`}</Text>
                  {abweichung !== null && abweichung !== 0 ? (
                    <Text style={[r.satz, { color: abweichung < 0 ? farben.hinweisTinte : farben.erfolg, fontWeight: '600' }]}>
                      {`${t.abweichungSpalte} ${abweichung > 0 ? '+' : ''}${formatChf(abweichung)}`}
                    </Text>
                  ) : null}
                </View>
              </View>
              {vorschlag === null ? <Text style={r.satz}>{t.keinVorschlag}</Text> : null}
            </View>
          )
        })}
        {abweichend > 0 ? (
          <View style={{ gap: 6 }}>
            <Text style={r.satz}>{fuelle(t.richtpreiseAbweichendSatz, { n: abweichend })}</Text>
            <Pressable
              onPress={() => {
                setStempelErsetzen(true)
                setze({ preise: preiseNeuGerechnet(b, e.preise) })
              }}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={r.link}>{stempelErsetzen ? `✓ ${t.richtpreiseNeuAktiv}` : t.richtpreiseNeuRechnen}</Text>
            </Pressable>
          </View>
        ) : null}
      </Abschnitt>

      <Posten titel={t.montageDurchUns} an={e.montage} onAn={(montage) => setze({ montage })}>
        <Feld id="montage" label={t.montageInsgesamt} value={e.montageChf} onChangeText={(montageChf) => setze({ montageChf })} keyboardType="decimal-pad" />
        <Text style={r.satz}>{fuelle(t.montageProFenster, { preis: formatChf(shopConfig.montageChf) })}</Text>
      </Posten>

      <Posten titel={t.anfahrtSumme} an={e.anfahrt} onAn={(anfahrt) => setze({ anfahrt })}>
        <Feld id="anfahrt" label={t.anfahrtBetrag} value={e.anfahrtChf} onChangeText={(anfahrtChf) => setze({ anfahrtChf })} keyboardType="decimal-pad" />
        <Text style={r.satz}>{fuelle(t.anfahrtSatz, { gebiet: shopConfig.serviceArea, preis: formatChf(shopConfig.anfahrtspauschaleChf) })}</Text>
      </Posten>

      <Posten titel={t.rabattSumme} an={e.rabatt} onAn={(rabatt) => setze({ rabatt })}>
        <Feld id="rabatt" label={t.rabattBetrag} value={e.rabattChf} onChangeText={(rabattChf) => setze({ rabattChf })} keyboardType="decimal-pad" />
        <Feld id="rabatt-text" label={t.rabattText} value={e.rabattText} onChangeText={(rabattText) => setze({ rabattText })} placeholder={t.rabattTextBeispiel} />
      </Posten>

      <Abschnitt>
        <Zeile text={t.netzeSumme} betrag={rechnung.netzeChf} />
        {e.montage ? <Zeile text={t.montageSumme} betrag={rechnung.montageSumme} /> : null}
        {e.anfahrt ? <Zeile text={t.anfahrtSumme} betrag={rechnung.anfahrtSumme} /> : null}
        {e.rabatt && rechnung.rabattSumme > 0 ? <Zeile text={t.rabattSumme} betrag={-rechnung.rabattSumme} /> : null}
        <Zeile text={t.totalSumme} betrag={rechnung.totalChf} stark />
      </Abschnitt>
    </BearbeitenRahmen>
  )
}

function Posten({ titel, an, onAn, children }: { titel: string; an: boolean; onAn: (an: boolean) => void; children: ReactNode }) {
  return (
    <Abschnitt
      titel={titel}
      rechts={<Switch value={an} onValueChange={onAn} trackColor={{ true: farben.marke, false: farben.randStark }} accessibilityLabel={titel} />}
    >
      {an ? children : null}
    </Abschnitt>
  )
}

function Zeile({ text, betrag, stark }: { text: string; betrag: number; stark?: boolean }) {
  return (
    <View style={r.zeile}>
      <Text style={[r.zeilenText, stark && r.stark]}>{text}</Text>
      <Text style={[r.zahl, stark && r.stark]}>{formatChf(betrag)}</Text>
    </View>
  )
}
