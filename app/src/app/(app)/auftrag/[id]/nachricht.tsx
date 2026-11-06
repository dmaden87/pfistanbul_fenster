import { mailLink, nachricht, NACHFASSEN_NACH_TAGEN, vorlagenFuer, whatsappLink, type Nachricht, type VorlagenId } from '@pf/lib/nachrichten'
import type { Bestellung } from '@pf/types'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Knopf } from '@/components/Blatt'
import { Feld } from '@/components/Feld'
import { Abschnitt, BearbeitenRahmen, rahmenStile as r } from '@/components/Rahmen'
import { Wahl } from '@/components/Wahl'
import { phasenNamen, whatsappNummer, type Phase } from '@/lib/auftrag'
import { fuelle, useSprache, type Texte } from '@/lib/sprache'
import { useBestellungen } from '@/lib/bestellungen'
import { farben, radius } from '@/theme'

type Weg = 'whatsapp' | 'mail'

/*
 * Was "Gesendet?" ueber den naechsten Schritt sagt – in der Sprache der
 * Maske. Die Vorlage selbst (src/lib/nachrichten.ts) hat einen deutschen
 * Satz dafuer; hier wird er aus dem Schritt abgeleitet, damit Ufuk ihn
 * tuerkisch liest. Die Nachricht an die Kundschaft bleibt Deutsch.
 */
function danachHinweis(n: Nachricht, b: Bestellung, t: Texte): string | undefined {
  const d = n.danach
  if (!d) return undefined
  if (d.status && d.status !== b.status && d.status !== 'abgesagt') return fuelle(t.wechseltZu, { phase: phasenNamen(t)[d.status as Phase] })
  if (d.nachgefasst) return fuelle(t.nachfassenWieder, { n: NACHFASSEN_NACH_TAGEN })
  if (d.offerteVersendet) return t.fristNeu
  return undefined
}

/** Warum eine Vorlage gerade nicht geht – in der Sprache der Maske. */
function sperrGrund(id: VorlagenId, t: Texte): string {
  return id === 'I' ? t.sperreQuittung : t.sperrePreise
}

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
  const { t } = useSprache()
  const titel = (id: VorlagenId) => t[`vorlage${id}`]

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
      <BearbeitenRahmen titel={t.nachricht} unterzeile={`${b.kunde.name} · ${b.referenz}`} speichernText={t.zurueck} onSpeichern={() => router.back()} laeuft={false}>
        <Text style={r.satz}>{t.keineVorlage}</Text>
      </BearbeitenRahmen>
    )
  }

  const wa = whatsappLink(whatsappNummer(b.kunde.telefon), text)
  const mail = mailLink(b.kunde.email, betreff, text)
  const linkFehlt = brauchtLink && !link

  async function oeffne(weg: Weg) {
    const url = weg === 'whatsapp' ? wa : mail
    if (!url) return Alert.alert(weg === 'whatsapp' ? 'WhatsApp' : t.mail, weg === 'whatsapp' ? t.keineHandynummer : t.keineMailadresse)
    if (linkFehlt) return Alert.alert(t.linkFehlt, linkFehler ?? t.linkWirdGeholt)
    try {
      await Linking.openURL(url)
      setGeoeffnet(weg)
    } catch {
      Alert.alert(t.nichtGeoeffnet, t.keineApp)
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
      Alert.alert(t.nichtGespeichert, f instanceof Error ? f.message : String(f))
    } finally {
      setLaeuft(false)
    }
  }

  return (
    <BearbeitenRahmen
      titel={t.nachricht}
      unterzeile={`${b.kunde.name} · ${b.referenz}`}
      speichernText={wa ? t.inWhatsappOeffnen : t.perMailOeffnen}
      onSpeichern={() => void oeffne(wa ? 'whatsapp' : 'mail')}
      laeuft={laeuft}
    >
      {geoeffnet ? (
        <View style={s.gesendet} accessibilityLiveRegion="polite">
          <Text style={s.gesendetTitel}>{geoeffnet === 'whatsapp' ? t.gesendetWhatsapp : t.gesendetMail}</Text>
          {danachHinweis(vorlageJetzt, b, t) ? <Text style={r.satz}>{danachHinweis(vorlageJetzt, b, t)}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Knopf text={t.jaGesendet} onPress={() => void gesendet()} />
            </View>
            <View style={{ flex: 1 }}>
              <Knopf still text={t.nochNicht} onPress={() => setGeoeffnet(null)} />
            </View>
          </View>
        </View>
      ) : null}

      <Abschnitt titel={t.vorlage}>
        <Wahl<VorlagenId>
          label={t.wasSollRaus}
          optionen={wahl.filter((v) => !v.gesperrt).map((v) => ({ wert: v.id, text: `${v.id} · ${titel(v.id)}` }))}
          wert={vid}
          onWahl={(w) => {
            setVid(w)
            setGeoeffnet(null)
          }}
        />
        {wahl
          .filter((v) => v.gesperrt)
          .map((v) => (
            <Text key={v.id} style={r.satz}>{`${v.id} · ${titel(v.id)}: ${sperrGrund(v.id, t)}`}</Text>
          ))}
      </Abschnitt>

      <Abschnitt titel={t.text}>
        {brauchtLink ? (
          <View style={r.zeile}>
            {link ? (
              <>
                <Text style={[r.satz, { flex: 1 }]} numberOfLines={1}>{link}</Text>
                <Pressable onPress={() => void Linking.openURL(link)} accessibilityRole="link" hitSlop={8}>
                  <Text style={r.link}>{t.ansehen}</Text>
                </Pressable>
              </>
            ) : linkFehler ? (
              <Text style={[r.satz, { color: farben.gefahr }]}>{fuelle(t.linkNichtErhalten, { fehler: linkFehler })}</Text>
            ) : (
              <ActivityIndicator color={farben.marke} />
            )}
          </View>
        ) : null}
        {mail ? <Feld id="betreff" label={t.betreffNurMail} value={betreff} onChangeText={setBetreff} /> : null}
        <Feld id="text" label={t.nachricht} value={text} onChangeText={setText} mehrzeilig style={{ minHeight: 260 }} />
        <Text style={r.satz}>{t.textAendern}</Text>
      </Abschnitt>

      {wa && mail ? (
        <Pressable onPress={() => void oeffne('mail')} accessibilityRole="button" style={[r.zeile, { justifyContent: 'center' }]}>
          <Text style={r.link}>{t.stattdessenMail}</Text>
        </Pressable>
      ) : null}
    </BearbeitenRahmen>
  )
}

const s = StyleSheet.create({
  gesendet: { backgroundColor: farben.hinweisWeich, borderRadius: radius.gross, padding: 14, gap: 10 },
  gesendetTitel: { fontSize: 17, fontWeight: '700', color: farben.text },
})
