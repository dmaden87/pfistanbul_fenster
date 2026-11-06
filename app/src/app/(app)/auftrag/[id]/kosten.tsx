import { fuelle } from '@pf/components/admin/sprache'
import { beteiligte } from '@pf/data/kostenConfig'
import { formatChf } from '@pf/lib/format'
import { kostenBetrag, kostenStart, kostenZumSpeichern, KOSTEN_TRAEGER, weitererKostenposten, type KostenZeile } from '@pf/lib/kostenentwurf'
import { zahlenFuer } from '@pf/lib/pl'
import type { Beteiligter, KostenArt } from '@pf/types'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, Switch, Text, View } from 'react-native'
import { Feld } from '@/components/Feld'
import { Abschnitt, BearbeitenRahmen, rahmenStile as r } from '@/components/Rahmen'
import { Wahl } from '@/components/Wahl'
import { TEXTE as t } from '@/lib/auftrag'
import { useBestellungen } from '@/lib/bestellungen'
import { farben } from '@/theme'

const TITEL: Record<KostenArt, string> = {
  herstellung: t.zHerstellung,
  lieferung: t.zLieferkosten,
  mwst: t.zEinfuhrsteuer,
  kargo: t.zKargoMwst,
  montage: t.zMontageSchuld,
  weiteres: t.zWeitereKosten,
}

/**
 * Die Kosten eines Auftrags – intern, nie fuer die Kundschaft.
 *
 * Wie im Web-Admin liegen sie hinter einem eigenen Schritt: Den Auftrag
 * zeigt man beim Ausmessen auch mal her, Boras Einkaufspreis soll dabei
 * nicht einen Tipp entfernt sein. Regeln aus src/lib/kostenentwurf.ts.
 */
export default function KostenErfassen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bestellungen, aendern } = useBestellungen()
  const b = bestellungen.find((x) => x.id === id)
  const [zeilen, setZeilen] = useState<KostenZeile[]>(() => (b ? kostenStart(b) : []))
  const [laeuft, setLaeuft] = useState(false)

  if (!b) return null
  const aendere = (kid: string, teil: Partial<KostenZeile>) => setZeilen((l) => l.map((k) => (k.id === kid ? { ...k, ...teil, neu: false } : k)))
  const summe = Math.round(zeilen.reduce((s, k) => s + kostenBetrag(k), 0) * 100) / 100
  const erloes = zahlenFuer(b).erloesChf

  async function speichern() {
    setLaeuft(true)
    try {
      await aendern(b!.id, { kosten: kostenZumSpeichern(zeilen) })
      router.back()
    } catch (f) {
      Alert.alert('Nicht gespeichert', f instanceof Error ? f.message : String(f))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <BearbeitenRahmen titel="Kosten (intern)" unterzeile={`${b.kunde.name} · ${b.referenz}`} speichernText={t.zKostenSpeichern} onSpeichern={speichern} laeuft={laeuft}>
      <Abschnitt>
        <Text style={r.zeilenText}>
          {fuelle(t.zKostenZusammenzug, { kosten: formatChf(summe), erloes: formatChf(erloes), marge: formatChf(erloes - summe) })}
        </Text>
      </Abschnitt>

      {zeilen.map((k) => (
        <Abschnitt
          key={k.id}
          titel={TITEL[k.art]}
          rechts={
            k.art === 'weiteres' ? (
              <Pressable onPress={() => setZeilen((l) => l.filter((x) => x.id !== k.id))} accessibilityRole="button" accessibilityLabel="Posten entfernen" hitSlop={10}>
                <Text style={r.gefahrLink}>{t.zWeg}</Text>
              </Pressable>
            ) : k.neu ? (
              <Text style={r.marke}>{t.zGeschaetzt}</Text>
            ) : undefined
          }
        >
          {k.art === 'weiteres' ? <Feld id={`wofuer-${k.id}`} label={t.zWofuer} value={k.bezeichnung ?? ''} onChangeText={(v) => aendere(k.id, { bezeichnung: v })} /> : null}
          <Feld id={`betrag-${k.id}`} label={`${t.zBetrag} (CHF)`} value={k.betragText} onChangeText={(v) => aendere(k.id, { betragText: v })} keyboardType="decimal-pad" />
          <Wahl<Beteiligter>
            label={t.zAusgelegtVon}
            optionen={KOSTEN_TRAEGER.map((wer) => ({ wert: wer, text: beteiligte[wer] }))}
            wert={k.traeger}
            onWahl={(traeger) => aendere(k.id, { traeger })}
          />
          <View style={r.zeile}>
            <Text style={r.zeilenText}>{t.zZurueckbezahlt}</Text>
            <Switch
              value={Boolean(k.bezahlt)}
              onValueChange={(bezahlt) => aendere(k.id, { bezahlt })}
              trackColor={{ true: farben.marke, false: farben.randStark }}
              accessibilityLabel={`${TITEL[k.art]}: ${t.zZurueckbezahlt}`}
            />
          </View>
        </Abschnitt>
      ))}

      <Pressable onPress={() => setZeilen((l) => [...l, weitererKostenposten()])} accessibilityRole="button" style={[r.zeile, { justifyContent: 'center' }]}>
        <Text style={r.link}>{`+ ${t.zWeitereKosten}`}</Text>
      </Pressable>
    </BearbeitenRahmen>
  )
}
