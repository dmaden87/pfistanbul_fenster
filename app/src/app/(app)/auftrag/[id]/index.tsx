import { ABSAGE_GRUENDE, knoepfe, type KartenKnopf } from '@pf/lib/aktionen'
import { auftragAufbauen } from '@pf/lib/bestellauftrag'
import { formatChf } from '@pf/lib/format'
import { abschnittFuer, preisAenderbar } from '@pf/lib/phasen'
import { grundText, positionDetail } from '@pf/components/admin/hilfen'
import type { AbsageGrund, BestellAenderung, Bestellung } from '@pf/types'
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { router, useLocalSearchParams } from 'expo-router'
import { useState, type ReactNode } from 'react'
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Blatt, Knopf } from '@/components/Blatt'
import { Feld } from '@/components/Feld'
import { Pfeil } from '@/components/Symbol'
import { netzAnzahl, PHASE_LABEL, PHASEN, preisOffen, quelleLabel, tageInPhase, TEXTE, whatsappNummer, type Phase } from '@/lib/auftrag'
import { useBestellungen } from '@/lib/bestellungen'
import { farben, radius, TIPPFLAECHE } from '@/theme'

const t = TEXTE

/**
 * Ein Auftrag auf einem Bildschirm.
 *
 * Phase weiterschalten (dieselben Schritte wie im Web-Admin, aus
 * src/lib/aktionen.ts), Kontakt, Termine, Notiz, Absagen; Netze, Angebot
 * und Kosten auf eigenen Bildschirmen (netze.tsx, angebot.tsx, kosten.tsx).
 * Nachrichten folgen mit V1.2 – docs/app/README.md.
 */
export default function Auftrag() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { bestellungen, aendern } = useBestellungen()
  const b = bestellungen.find((x) => x.id === id)
  const [blatt, setBlatt] = useState<null | 'kontakt' | 'notiz' | 'absagen'>(null)
  const [laeuft, setLaeuft] = useState(false)

  if (!b) {
    return (
      <SafeAreaView style={s.seite}>
        <Kopf>Auftrag</Kopf>
        <Text style={s.leer}>Diesen Auftrag gibt es nicht mehr.</Text>
      </SafeAreaView>
    )
  }

  /** Jede Aenderung laeuft hierueber: Sperre, Fehler als Hinweis. */
  async function speichere(aenderung: BestellAenderung, ziel: Bestellung = b!): Promise<boolean> {
    setLaeuft(true)
    try {
      await aendern(ziel.id, aenderung)
      return true
    } catch (f) {
      Alert.alert('Nicht gespeichert', f instanceof Error ? f.message : String(f))
      return false
    } finally {
      setLaeuft(false)
    }
  }

  /*
   * Was dem Bestellschein fuer Bora noch fehlt, je Netz – aus derselben
   * Pruefung, die im Web-Admin den Schritt zum Angebot sperrt. Nur "2 Angaben
   * fehlen" zu melden, hilft unterwegs nicht: man muss wissen, welche.
   */
  // Der Bestellschein fuehrt jedes Stueck einzeln; hier zaehlen gleiche Netze
  // mit gleichen Luecken als eine Zeile ("2× Sondermass Küche: …").
  const luecken = Object.values(
    (b.positionen.length === 0 ? [] : auftragAufbauen([b]).luecken).reduce<Record<string, { text: string; n: number }>>((acc, l) => {
      const text = `${l.netz}: ${l.fehlt.join(', ')}`
      acc[text] = { text, n: (acc[text]?.n ?? 0) + 1 }
      return acc
    }, {}),
  ).map(({ text, n }) => (n > 1 ? `${n}× ${text}` : text))
  const lueckenText = b.positionen.length === 0 ? 'Es sind noch keine Netze erfasst.' : luecken.map((l) => `• ${l}`).join('\n')
  const zeigeLuecken = (titel: string) => Alert.alert(titel, `Für den Bestellschein fehlt noch:\n\n${lueckenText}`)

  const abschnitt = abschnittFuer(b)
  const oeffneUnter = (wohin: 'netze' | 'angebot' | 'kosten') => router.push({ pathname: `/auftrag/[id]/${wohin}`, params: { id: b!.id } })
  const alleKnoepfe = knoepfe(b, abschnitt, t, false)
  const hauptKnopf = alleKnoepfe.find((k) => k.art === 'haupt')
  const weitere = alleKnoepfe.filter((k) => k !== hauptKnopf && k.tat !== 'absagen')
  const kannAbsagen = alleKnoepfe.some((k) => k.tat === 'absagen')

  /** Was ein Knopf aus der gemeinsamen Tabelle in der App tut. */
  function druecke(k: KartenKnopf) {
    if (k.gesperrt) return
    if (k.tat === 'absagen') return setBlatt('absagen')
    if (k.tat === 'anfrageBlatt' || k.tat === 'bestellBlatt') {
      return router.push({ pathname: '/auftrag/[id]/blatt', params: { id: b!.id, art: k.tat === 'anfrageBlatt' ? 'anfrage' : 'bestellung' } })
    }
    if (k.tat === 'offerte') {
      return Alert.alert(k.text, 'Die Offerte als Link kommt mit V1.2 in die App. Bis dahin im Web-Admin.')
    }
    if (k.tat === 'boraBestellt') {
      // Wie im Web-Admin: ein Paket geht als Ganzes zu Bora.
      const paket = b!.paket ? bestellungen.filter((x) => x.paket === b!.paket && x.status === 'bestellen') : [b!]
      const frage = paket.length > 1 ? `Alle ${paket.length} Aufträge im Paket «${b!.paket}» als bestellt markieren?` : 'Als bei Bora bestellt markieren?'
      return Alert.alert(k.text, frage, [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Ja, bestellt',
          onPress: async () => {
            for (const x of paket) if (!(await speichere({ status: 'bora', bestellt: true }, x))) return
          },
        },
      ])
    }
    void speichere(k.tat)
  }

  /**
   * Eine Phase direkt antippen. Gibt es dafuer einen Schritt in der Tabelle,
   * wird der genommen – er setzt die richtigen Stempel (Zusage, Versand).
   * Sonst nur der Status, nach Rueckfrage.
   */
  function setzePhase(ziel: Phase) {
    if (b!.status === ziel) return
    const schritt = alleKnoepfe.find((k) => typeof k.tat === 'object' && k.tat.status === ziel && !k.gesperrt)
    Alert.alert('Phase umstellen', `Auf «${PHASE_LABEL[ziel]}» setzen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Umstellen', onPress: () => void speichere(schritt ? (schritt.tat as BestellAenderung) : { status: ziel }) },
    ])
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

        <Karte titel="Phase" hinweis={phase ? 'Antippen zum Umstellen' : undefined}>
          <View style={s.phasenBalken}>
            {PHASEN.map((p, i) => (
              <View key={p} style={[s.balken, { backgroundColor: i < idx ? farben.marke : i === idx ? farben.hinweis : farben.rand }]} />
            ))}
          </View>
          {phase ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.phasenReihe}>
              {PHASEN.map((p, i) => (
                <Pressable
                  key={p}
                  onPress={() => setzePhase(p)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i === idx }}
                  style={[s.phaseChip, i < idx && s.phaseChipErledigt, i === idx && s.phaseChipAktiv]}
                >
                  <Text style={[s.phaseChipText, i < idx && { color: farben.marke }, i === idx && { color: '#ffffff' }]}>{PHASE_LABEL[p]}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={s.phaseText}>{`Abgesagt · ${grundText(b.absageGrund, t)}`}</Text>
          )}
          {weitere.length ? (
            <View style={s.weitere}>
              {weitere.map((k) => (
                <Pressable
                  key={k.text}
                  onPress={() => (k.gesperrt ? zeigeLuecken(k.gesperrt) : druecke(k))}
                  accessibilityRole="button"
                  accessibilityHint={k.gesperrt ? 'Zeigt, was fehlt' : undefined}
                  disabled={laeuft}
                  style={s.weitererSchritt}
                >
                  <Text style={[s.weitererText, k.gesperrt && { color: farben.textSchwach }]}>{k.text}</Text>
                  {k.gesperrt ? <Text style={s.fehltLink}>{`${k.gesperrt} · welche?`}</Text> : <Pfeil farbe={farben.marke} />}
                </Pressable>
              ))}
            </View>
          ) : null}
        </Karte>

        <Aktionen b={b} />

        <Karte titel="Kontakt" stift={() => setBlatt('kontakt')} stiftLabel="Kontakt bearbeiten">
          <Text style={s.zeilenText}>{b.kunde.telefon || '— keine Telefonnummer —'}</Text>
          <Text style={s.zeilenText}>{b.kunde.email || '— keine Mail —'}</Text>
          <Text style={s.leise}>{[b.kunde.strasse, [b.kunde.plz, b.kunde.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '— keine Adresse —'}</Text>
        </Karte>

        <Karte titel="Termine">
          <TerminZeile art="Ausmessen" wert={b.klaerungTermin} onSpeichern={(w) => speichere({ klaerungTermin: w })} />
          <TerminZeile art="Montage" wert={b.montageTermin} onSpeichern={(w) => speichere({ montageTermin: w })} />
          <View style={[s.paar, s.trenner, { paddingTop: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.zeilenText}>Ausgemessen</Text>
              {b.ausgemessenAm ? <Text style={s.leise}>{new Date(b.ausgemessenAm).toLocaleDateString('de-CH')}</Text> : null}
            </View>
            <Switch
              value={Boolean(b.ausgemessenAm)}
              onValueChange={(an) => void speichere({ ausgemessen: an })}
              disabled={laeuft}
              trackColor={{ true: farben.marke, false: farben.randStark }}
              accessibilityLabel="Ausgemessen"
            />
          </View>
        </Karte>

        <Karte titel="Netze & Preise" stift={() => oeffneUnter('netze')} stiftLabel="Netze bearbeiten">
          {b.positionen.map((p, i) => (
            <View key={p.id ?? i} style={[s.netz, i > 0 && s.trenner]}>
              <Text style={s.menge}>{p.menge}×</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.zeilenText}>{p.bezeichnung}</Text>
                <Text style={s.leise}>{positionDetail(p) || ' '}</Text>
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
          {luecken.length > 0 ? (
            <View style={s.fehltBox}>
              <Text style={s.fehltTitel}>Für den Bestellschein fehlt noch</Text>
              {luecken.map((l) => (
                <Text key={l} style={s.fehltText}>{l}</Text>
              ))}
            </View>
          ) : null}
          {b.preiseFestgelegtAm ? (
            <Text style={s.leise}>{`${t.preiseFestgelegtAm} ${new Date(b.preiseFestgelegtAm).toLocaleDateString('de-CH')}`}</Text>
          ) : null}
          {preisAenderbar(b, abschnitt) ? (
            <View style={{ marginTop: 6 }}>
              <Knopf still text={b.preiseFestgelegtAm ? t.knopfPreiseAendern : t.angebotTitel} onPress={() => oeffneUnter('angebot')} />
            </View>
          ) : null}
        </Karte>

        {/* Die Kosten liegen hinter einem eigenen Schritt – wie im Web-Admin:
            Den Auftrag zeigt man auch mal her, Boras Preise nicht. */}
        <Pressable onPress={() => oeffneUnter('kosten')} accessibilityRole="button" style={s.kostenZeile}>
          <View style={{ flex: 1 }}>
            <Text style={s.zeilenText}>Kosten & Marge</Text>
            <Text style={s.leise}>intern · Einkauf, Lieferung, weitere Kosten</Text>
          </View>
          <Pfeil farbe={farben.marke} />
        </Pressable>

        <Karte titel="Notiz" stift={() => setBlatt('notiz')} stiftLabel="Notiz bearbeiten">
          {b.kunde.bemerkung ? <Text style={s.zeilenText}>{`Kundschaft: ${b.kunde.bemerkung}`}</Text> : null}
          <Text style={b.notiz ? s.zeilenText : s.leise}>{b.notiz || 'Noch keine Notiz.'}</Text>
        </Karte>

        {kannAbsagen ? (
          <Pressable onPress={() => setBlatt('absagen')} accessibilityRole="button" style={s.absagen}>
            <Text style={s.absagenText}>{t.knopfAbsagen}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {hauptKnopf ? (
        <View style={s.fuss}>
          {hauptKnopf.gesperrt ? (
            <Pressable onPress={() => zeigeLuecken(hauptKnopf.gesperrt!)} accessibilityRole="button" style={s.fehltZeile}>
              <Text style={s.fehltLink}>{`${hauptKnopf.gesperrt} · welche?`}</Text>
            </Pressable>
          ) : null}
          {laeuft ? (
            <ActivityIndicator color={farben.marke} style={{ height: TIPPFLAECHE + 6 }} />
          ) : (
            <Knopf text={hauptKnopf.text} onPress={() => druecke(hauptKnopf)} gesperrt={!!hauptKnopf.gesperrt} />
          )}
        </View>
      ) : null}

      <KontaktBlatt b={b} offen={blatt === 'kontakt'} onSchliessen={() => setBlatt(null)} speichere={speichere} />
      <NotizBlatt b={b} offen={blatt === 'notiz'} onSchliessen={() => setBlatt(null)} speichere={speichere} />
      <Blatt offen={blatt === 'absagen'} titel={t.knopfAbsagen} onSchliessen={() => setBlatt(null)}>
        <Text style={s.leise}>Warum wird nichts daraus? Der Auftrag kommt ins Archiv und lässt sich wieder öffnen.</Text>
        {ABSAGE_GRUENDE.map((g: AbsageGrund) => (
          <Knopf
            key={g}
            still
            text={grundText(g, t)}
            onPress={async () => {
              if (await speichere({ status: 'abgesagt', absageGrund: g })) setBlatt(null)
            }}
          />
        ))}
      </Blatt>
    </SafeAreaView>
  )
}

type Speichere = (aenderung: BestellAenderung) => Promise<boolean>

function KontaktBlatt({ b, offen, onSchliessen, speichere }: { b: Bestellung; offen: boolean; onSchliessen: () => void; speichere: Speichere }) {
  const [k, setK] = useState(b.kunde)
  const [vorher, setVorher] = useState(offen)
  // Beim Oeffnen den aktuellen Stand uebernehmen, nicht den vom letzten Mal.
  if (offen !== vorher) {
    setVorher(offen)
    if (offen) setK(b.kunde)
  }
  const feld = (name: keyof typeof k) => ({ value: k[name], onChangeText: (v: string) => setK({ ...k, [name]: v }) })
  return (
    <Blatt offen={offen} titel="Kontakt bearbeiten" onSchliessen={onSchliessen}>
      <Feld id="k-name" label="Name" {...feld('name')} autoCapitalize="words" />
      <Feld id="k-tel" label="Telefon" {...feld('telefon')} keyboardType="phone-pad" />
      <Feld id="k-mail" label="Mail" {...feld('email')} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <Feld id="k-strasse" label="Strasse" {...feld('strasse')} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ width: 96 }}><Feld id="k-plz" label="PLZ" {...feld('plz')} keyboardType="number-pad" /></View>
        <View style={{ flex: 1 }}><Feld id="k-ort" label="Ort" {...feld('ort')} /></View>
      </View>
      <Knopf
        text="Speichern"
        onPress={async () => {
          const { name, telefon, email, strasse, plz, ort } = k
          if (await speichere({ kunde: { name, telefon, email, strasse, plz, ort } })) onSchliessen()
        }}
      />
    </Blatt>
  )
}

function NotizBlatt({ b, offen, onSchliessen, speichere }: { b: Bestellung; offen: boolean; onSchliessen: () => void; speichere: Speichere }) {
  const [notiz, setNotiz] = useState(b.notiz ?? '')
  const [vorher, setVorher] = useState(offen)
  if (offen !== vorher) {
    setVorher(offen)
    if (offen) setNotiz(b.notiz ?? '')
  }
  return (
    <Blatt offen={offen} titel="Notiz" onSchliessen={onSchliessen}>
      <Feld id="notiz" label="Nur für uns, nicht für die Kundschaft" value={notiz} onChangeText={setNotiz} mehrzeilig maxLength={1200} />
      <Knopf text="Speichern" onPress={async () => { if (await speichere({ notiz })) onSchliessen() }} />
    </Blatt>
  )
}

/** ISO-Datum (JJJJ-MM-TT) in Ortszeit – so speichert der Web-Admin Termine. */
function isoTag(d: Date): string {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

function TerminZeile({ art, wert, onSpeichern }: { art: string; wert?: string; onSpeichern: (wert: string) => Promise<boolean> }) {
  const datum = wert ? new Date(wert.length === 10 ? `${wert}T00:00` : wert) : null
  function waehle() {
    if (Platform.OS !== 'android') {
      // iOS folgt mit V2: dort ist der Datumswaehler ein eingebettetes Element.
      return Alert.alert(art, 'Termine eintragen geht vorerst nur auf Android.')
    }
    DateTimePickerAndroid.open({
      value: datum ?? new Date(),
      mode: 'date',
      title: `${art}: Datum wählen`,
      onValueChange: (_e, d) => void onSpeichern(isoTag(d)),
    })
  }
  return (
    <View style={[s.paar, { alignItems: 'center', minHeight: TIPPFLAECHE }]}>
      <Text style={[s.zeilenText, { flex: 1 }]}>{art}</Text>
      {datum ? (
        <Pressable onLongPress={() => Alert.alert(art, 'Termin entfernen?', [{ text: 'Abbrechen', style: 'cancel' }, { text: 'Entfernen', style: 'destructive', onPress: () => void onSpeichern('') }])} onPress={waehle} accessibilityRole="button" accessibilityHint="Lange drücken zum Entfernen" style={s.terminWert}>
          <Text style={s.terminText}>{datum.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={waehle} accessibilityRole="button" style={s.terminWert}>
          <Text style={[s.terminText, { color: farben.marke }]}>Eintragen</Text>
        </Pressable>
      )}
    </View>
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

function Karte({ titel, hinweis, stift, stiftLabel, children }: { titel: string; hinweis?: string; stift?: () => void; stiftLabel?: string; children: ReactNode }) {
  return (
    <View style={s.karte}>
      <View style={s.karteKopf}>
        <Text style={s.karteTitel} accessibilityRole="header">{titel}</Text>
        {hinweis ? <Text style={s.karteHinweis}>{hinweis}</Text> : null}
        {stift ? (
          <Pressable onPress={stift} accessibilityRole="button" accessibilityLabel={stiftLabel} style={s.stift} hitSlop={8}>
            <Text style={s.stiftText}>Bearbeiten</Text>
          </Pressable>
        ) : null}
      </View>
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
  karteKopf: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 },
  karteTitel: { flex: 1, fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: farben.textLeise },
  karteHinweis: { fontSize: 12, color: farben.textSchwach },
  stift: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  stiftText: { color: farben.marke, fontWeight: '700', fontSize: 14 },
  phasenBalken: { flexDirection: 'row', gap: 4 },
  balken: { flex: 1, height: 6, borderRadius: 3 },
  phasenReihe: { gap: 6, paddingTop: 6 },
  phaseChip: { minHeight: 40, paddingHorizontal: 12, borderRadius: radius.rund, borderWidth: 1, borderColor: farben.rand, backgroundColor: farben.flaeche, justifyContent: 'center' },
  phaseChipErledigt: { backgroundColor: farben.markeWeich, borderColor: farben.markeWeich },
  phaseChipAktiv: { backgroundColor: farben.hinweis, borderColor: farben.hinweis },
  phaseChipText: { fontSize: 13, fontWeight: '600', color: farben.textLeise },
  phaseText: { fontSize: 16, fontWeight: '600', color: farben.marke, marginTop: 4 },
  weitere: { marginTop: 6, borderTopWidth: 1, borderTopColor: farben.linie },
  weitererSchritt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: TIPPFLAECHE, borderBottomWidth: 1, borderBottomColor: farben.linie },
  weitererText: { flex: 1, fontSize: 15, color: farben.marke, fontWeight: '600' },
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
  terminWert: { minHeight: TIPPFLAECHE, justifyContent: 'center', paddingHorizontal: 4 },
  terminText: { fontSize: 15, fontWeight: '600', color: farben.text },
  absagen: { minHeight: TIPPFLAECHE, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  absagenText: { color: farben.gefahr, fontWeight: '600', fontSize: 15 },
  fuss: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: farben.rand, backgroundColor: farben.grund },
  leer: { textAlign: 'center', color: farben.textSchwach, marginTop: 32, fontSize: 15 },
  kostenZeile: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingHorizontal: 14, borderRadius: radius.gross, borderWidth: 1, borderColor: farben.rand, backgroundColor: farben.flaeche },
  fehltLink: { fontSize: 13, fontWeight: '600', color: farben.hinweisTinte, textDecorationLine: 'underline' },
  fehltZeile: { minHeight: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  fehltBox: { marginTop: 6, padding: 12, borderRadius: radius.mittel, backgroundColor: farben.hinweisWeich, borderWidth: 1, borderColor: farben.hinweisRand, gap: 4 },
  fehltTitel: { fontSize: 13, fontWeight: '700', color: farben.hinweisTinte },
  fehltText: { fontSize: 14, color: farben.text },
})
