import { bestellblatt, type BlattArt, type BlattSprache } from '@pf/lib/bestellblatt'
import { File, Paths } from 'expo-file-system'
import * as Print from 'expo-print'
import { router, useLocalSearchParams } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useState } from 'react'
import { Alert, Platform, Pressable, Text, View } from 'react-native'
import { Feld } from '@/components/Feld'
import { Abschnitt, BearbeitenRahmen, rahmenStile as r } from '@/components/Rahmen'
import { Wahl } from '@/components/Wahl'
import { TEXTE as t } from '@/lib/auftrag'
import { useBestellungen } from '@/lib/bestellungen'

/* A4 quer in Punkten (72 je Zoll) – elf Spalten passen hochkant nicht. */
const A4_QUER = { width: 842, height: 595 }

/**
 * Das Blatt an Bora: Preisanfrage oder Bestelltalon, als PDF zum Teilen.
 *
 * Inhalt aus src/lib/bestellblatt.ts – dieselben Zeilen und Texte wie im
 * Web-Admin. Termin und Bemerkung gehoeren wie dort zum Blatt und werden
 * nicht gespeichert.
 *
 * Nach dem Teilen fragt die App, ob das Blatt raus ist: Erst dann wird der
 * Auftrag "bei Bora bestellt". Ob WhatsApp wirklich gesendet hat, kann die
 * App nicht wissen – das weiss nur, wer sie bedient.
 */
export default function Blatt() {
  const { id, art: artParam } = useLocalSearchParams<{ id: string; art?: string }>()
  const art: BlattArt = artParam === 'anfrage' ? 'anfrage' : 'bestellung'
  const { bestellungen, aendern } = useBestellungen()
  const b = bestellungen.find((x) => x.id === id)
  const [sprache, setSprache] = useState<BlattSprache>('tuerkisch')
  const [termin, setTermin] = useState('')
  const [bemerkung, setBemerkung] = useState('')
  const [laeuft, setLaeuft] = useState(false)

  if (!b) return null
  // Wie im Web-Admin: Die Bestellung geht fuer das ganze Paket, die Anfrage je Auftrag.
  const drauf = art === 'bestellung' && b.paket ? bestellungen.filter((x) => x.paket === b.paket) : [b]
  const nummer = art === 'bestellung' ? (b.paket ?? (b.referenz || b.id)) : b.referenz || b.id
  const ergebnis = bestellblatt(drauf, { art, nummer, sprache, termin, bemerkung })
  const titel = art === 'anfrage' ? 'Preisanfrage an Bora' : 'Bestelltalon an Bora'

  async function teilen() {
    if (!('html' in ergebnis)) return
    setLaeuft(true)
    try {
      if (Platform.OS === 'web') {
        // Nur fuer die Testumgebung im Browser: dort gibt es kein PDF-Teilen.
        const fenster = window.open('', '_blank')
        fenster?.document.write(ergebnis.html)
        return
      }
      const { uri } = await Print.printToFileAsync({ html: ergebnis.html, ...A4_QUER })
      // Ein sprechender Dateiname, wie ihn der Web-Admin vorschlaegt – sonst
      // kommt bei Bora eine Datei mit Zufallsnamen an.
      const ziel = new File(Paths.cache, `${ergebnis.dateiname}.pdf`)
      await new File(uri).move(ziel, { overwrite: true })
      await Sharing.shareAsync(ziel.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: titel })
      nachfragen()
    } catch (f) {
      Alert.alert('PDF nicht erstellt', f instanceof Error ? f.message : String(f))
    } finally {
      setLaeuft(false)
    }
  }

  /** Nach dem Teilen: Ist es raus? Nur dann den Schritt machen. */
  function nachfragen() {
    const offen = drauf.filter((x) => x.status === 'bestellen')
    if (art !== 'bestellung' || offen.length === 0) return
    const frage = offen.length > 1 ? `Alle ${offen.length} Aufträge als bei Bora bestellt markieren?` : 'Als bei Bora bestellt markieren?'
    Alert.alert('An Bora gesendet?', frage, [
      { text: 'Noch nicht', style: 'cancel' },
      {
        text: 'Ja, bestellt',
        onPress: async () => {
          try {
            for (const x of offen) await aendern(x.id, { status: 'bora', bestellt: true })
            router.back()
          } catch (f) {
            Alert.alert('Nicht gespeichert', f instanceof Error ? f.message : String(f))
          }
        },
      },
    ])
  }

  async function vorschau() {
    if (!('html' in ergebnis)) return
    try {
      await Print.printAsync({ html: ergebnis.html, orientation: Print.Orientation.landscape })
    } catch {
      // Abgebrochen – nichts zu tun.
    }
  }

  return (
    <BearbeitenRahmen
      titel={titel}
      unterzeile={`${drauf.length > 1 ? `Paket ${nummer} · ${drauf.length} Aufträge` : `${b.kunde.name} · ${b.referenz}`}`}
      speichernText={'html' in ergebnis ? `PDF teilen (${ergebnis.anzahl} ${ergebnis.anzahl === 1 ? 'Netz' : 'Netze'})` : 'Angaben fehlen'}
      onSpeichern={'html' in ergebnis ? teilen : () => router.back()}
      laeuft={laeuft}
    >
      {'luecken' in ergebnis ? (
        <Abschnitt titel="So kann das Blatt nicht raus">
          <Text style={r.satz}>Es fehlen Angaben – eine Lieferung aus der Türkei, die nicht passt, kostet Wochen:</Text>
          {ergebnis.luecken.map((l, i) => (
            <Text key={i} style={r.zeilenText}>{`• ${drauf.length > 1 ? `${l.kennung}, ` : ''}${l.netz}: ${l.fehlt.join(', ')}`}</Text>
          ))}
          {drauf.length === 1 ? (
            <Pressable onPress={() => router.replace({ pathname: '/auftrag/[id]/netze', params: { id: b.id } })} accessibilityRole="button" hitSlop={8}>
              <Text style={r.link}>Netze bearbeiten</Text>
            </Pressable>
          ) : null}
        </Abschnitt>
      ) : (
        <>
          <Abschnitt titel="Blatt">
            <Wahl<BlattSprache>
              label="Sprache"
              optionen={[
                { wert: 'tuerkisch', text: 'Türkçe' },
                { wert: 'deutsch', text: 'Deutsch (nur prüfen)' },
              ]}
              wert={sprache}
              onWahl={setSprache}
            />
            {art === 'bestellung' ? <Feld id="termin" label={t.terminFuersBlatt} value={termin} onChangeText={setTermin} placeholder="z. B. Ende November" /> : null}
            <Feld id="bemerkung" label={t.bemerkungFuersBlatt} value={bemerkung} onChangeText={setBemerkung} mehrzeilig />
          </Abschnitt>
          <Abschnitt>
            <Text style={r.satz}>
              {art === 'anfrage'
                ? 'Mit leerer Preisspalte – Bora trägt den Stückpreis je Zeile ein.'
                : 'Verbindlicher Auftrag, ohne Preise. Jede Zeile ist ein Stück und trägt die Bündelkennung.'}
              {drauf.some((x) => x.notiz?.trim()) ? ' Die Notiz des Auftrags geht als Bemerkung mit.' : ''}
            </Text>
            {Platform.OS !== 'web' ? (
              <View style={r.zeile}>
                <Pressable onPress={vorschau} accessibilityRole="button" hitSlop={8}>
                  <Text style={r.link}>Vorschau / drucken</Text>
                </Pressable>
              </View>
            ) : null}
          </Abschnitt>
        </>
      )}
    </BearbeitenRahmen>
  )
}
