import { mailLink, nachricht, vorlagenFuer, whatsappLink, type VorlagenId } from '@pf/lib/nachrichten'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Knopf } from '@/components/Blatt'
import { Feld } from '@/components/Feld'
import { Abschnitt, BearbeitenRahmen, rahmenStile as r } from '@/components/Rahmen'
import { Wahl } from '@/components/Wahl'
import { whatsappNummer } from '@/lib/auftrag'
import { useBestellungen } from '@/lib/bestellungen'
import { farben, radius } from '@/theme'

type Weg = 'whatsapp' | 'mail'

/**
 * Eine Nachricht an die Kundschaft – Vorlagen A bis I aus
 * src/lib/nachrichten.ts.
 *
 * Senden heisst hier: vorbereitet uebergeben. Die App oeffnet WhatsApp bzw.
 * das Mailprogramm mit Empfaenger, Betreff und Text; gesendet wird dort.
 * Zurueck in der App steht "Gesendet?" – erst ein Ja macht den Schritt, den
 * die Vorlage vorsieht (z. B. "Warten auf Zusage"). Ein Nein laesst alles
 * stehen, wie es war.
 */
export default function NachrichtSenden() {
  const { id, vorlage } = useLocalSearchParams<{ id: string; vorlage?: string }>()
  const { bestellungen, aendern, offerteLinkFuer } = useBestellungen()
  const b = bestellungen.find((x) => x.id === id)
  const wahl = b ? vorlagenFuer(b) : []
  const start = (wahl.find((v) => v.id === vorlage && !v.gesperrt) ?? wahl.find((v) => v.empfohlen) ?? wahl.find((v) => !v.gesperrt))?.id
  const [vid, setVid] = useState<VorlagenId | undefined>(start)
  const [link, setLink] = useState<string | undefined>()
  const [linkFehler, setLinkFehler] = useState<string | null>(null)
  const [betreff, setBetreff] = useState('')
  const [text, setText] = useState('')
  const [geoeffnet, setGeoeffnet] = useState<Weg | null>(null)
  const [laeuft, setLaeuft] = useState(false)

  const vorlageJetzt = b && vid ? nachricht(b, vid) : null
  const brauchtLink = Boolean(vorlageJetzt?.mitLink)

  // Den Link holen, sobald eine Vorlage ihn braucht – einmal je Auftrag.
  useEffect(() => {
    if (!b || !brauchtLink || link) return
    let aktiv = true
    setLinkFehler(null)
    offerteLinkFuer(b.id)
      .then((l) => aktiv && setLink(l))
      .catch((f) => aktiv && setLinkFehler(f instanceof Error ? f.message : String(f)))
    return () => {
      aktiv = false
    }
  }, [b, brauchtLink, link, offerteLinkFuer])

  // Text neu aus der Vorlage, wenn sie wechselt oder der Link ankommt.
  useEffect(() => {
    if (!b || !vid) return
    const n = nachricht(b, vid, { link })
    setBetreff(n.betreff)
    setText(n.text)
    // Nur bei Wechsel der Vorlage bzw. Ankunft des Links – nicht bei jeder
    // Aenderung am Auftrag, sonst waere Getipptes weg.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vid, link])

  if (!b) return null

  if (!vid || !vorlageJetzt) {
    return (
      <BearbeitenRahmen titel="Nachricht" unterzeile={`${b.kunde.name} · ${b.referenz}`} speichernText="Zurück" onSpeichern={() => router.back()} laeuft={false}>
        <Text style={r.satz}>In dieser Phase gibt es keine Vorlage.</Text>
      </BearbeitenRahmen>
    )
  }

  const wa = whatsappLink(whatsappNummer(b.kunde.telefon), text)
  const mail = mailLink(b.kunde.email, betreff, text)
  const linkFehlt = brauchtLink && !link

  async function oeffne(weg: Weg) {
    const url = weg === 'whatsapp' ? wa : mail
    if (!url) return Alert.alert(weg === 'whatsapp' ? 'WhatsApp' : 'Mail', weg === 'whatsapp' ? 'Keine Handynummer hinterlegt.' : 'Keine Mailadresse hinterlegt.')
    if (linkFehlt) return Alert.alert('Link fehlt', linkFehler ?? 'Der Link zur Offerte wird noch geholt.')
    try {
      await Linking.openURL(url)
      setGeoeffnet(weg)
    } catch {
      Alert.alert('Nicht geöffnet', 'Dafür ist keine App installiert.')
    }
  }

  async function gesendet() {
    const danach = vorlageJetzt!.danach
    if (!danach) return router.back()
    setLaeuft(true)
    try {
      await aendern(b!.id, danach)
      router.back()
    } catch (f) {
      Alert.alert('Nicht gespeichert', f instanceof Error ? f.message : String(f))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <BearbeitenRahmen
      titel="Nachricht"
      unterzeile={`${b.kunde.name} · ${b.referenz}`}
      speichernText={wa ? 'In WhatsApp öffnen' : 'Per Mail öffnen'}
      onSpeichern={() => void oeffne(wa ? 'whatsapp' : 'mail')}
      laeuft={laeuft}
    >
      {geoeffnet ? (
        <View style={s.gesendet} accessibilityLiveRegion="polite">
          <Text style={s.gesendetTitel}>{`Gesendet${geoeffnet === 'whatsapp' ? ' in WhatsApp' : ' per Mail'}?`}</Text>
          {vorlageJetzt.danachText ? <Text style={r.satz}>{vorlageJetzt.danachText}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Knopf text="Ja, gesendet" onPress={() => void gesendet()} />
            </View>
            <View style={{ flex: 1 }}>
              <Knopf still text="Noch nicht" onPress={() => setGeoeffnet(null)} />
            </View>
          </View>
        </View>
      ) : null}

      <Abschnitt titel="Vorlage">
        <Wahl<VorlagenId>
          label="Was soll raus?"
          optionen={wahl.filter((v) => !v.gesperrt).map((v) => ({ wert: v.id, text: `${v.id} · ${v.titel}` }))}
          wert={vid}
          onWahl={(w) => {
            setVid(w)
            setGeoeffnet(null)
          }}
        />
        {wahl
          .filter((v) => v.gesperrt)
          .map((v) => (
            <Text key={v.id} style={r.satz}>{`${v.id} · ${v.titel}: ${v.gesperrt}`}</Text>
          ))}
      </Abschnitt>

      <Abschnitt titel="Text">
        {brauchtLink ? (
          <View style={r.zeile}>
            {link ? (
              <>
                <Text style={[r.satz, { flex: 1 }]} numberOfLines={1}>{link}</Text>
                <Pressable onPress={() => void Linking.openURL(link)} accessibilityRole="link" hitSlop={8}>
                  <Text style={r.link}>Ansehen</Text>
                </Pressable>
              </>
            ) : linkFehler ? (
              <Text style={[r.satz, { color: farben.gefahr }]}>{`Link nicht erhalten: ${linkFehler}`}</Text>
            ) : (
              <ActivityIndicator color={farben.marke} />
            )}
          </View>
        ) : null}
        {mail ? <Feld id="betreff" label="Betreff (nur Mail)" value={betreff} onChangeText={setBetreff} /> : null}
        <Feld id="text" label="Nachricht" value={text} onChangeText={setText} mehrzeilig style={{ minHeight: 260 }} />
        <Text style={r.satz}>Der Text lässt sich hier und in WhatsApp noch ändern.</Text>
      </Abschnitt>

      {wa && mail ? (
        <Pressable onPress={() => void oeffne('mail')} accessibilityRole="button" style={[r.zeile, { justifyContent: 'center' }]}>
          <Text style={r.link}>Stattdessen per Mail öffnen</Text>
        </Pressable>
      ) : null}
    </BearbeitenRahmen>
  )
}

const s = StyleSheet.create({
  gesendet: { backgroundColor: farben.hinweisWeich, borderRadius: radius.gross, padding: 14, gap: 10 },
  gesendetTitel: { fontSize: 17, fontWeight: '700', color: farben.text },
})
