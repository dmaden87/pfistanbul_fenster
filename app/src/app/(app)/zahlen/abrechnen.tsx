import { beteiligte } from '@pf/data/kostenConfig'
import { formatChf } from '@pf/lib/format'
import {
  abrechnungEntwurf, abrechnungZahlen, freiePosten, naechsteAbrechnungsnummer,
  offeneEinnahmen, offeneSchulden, postenSchluessel, postenSummeFuer,
} from '@pf/lib/pl'
import { router } from 'expo-router'
import { useState } from 'react'
import { Alert, Pressable, Text } from 'react-native'
import { Feld } from '@/components/Feld'
import { AbrechnungAnsicht } from '@/components/AbrechnungAnsicht'
import { BearbeitenRahmen, rahmenStile as r } from '@/components/Rahmen'
import { HakenZeile, Hinweis, ZahlenKarte, ZahlZeile } from '@/components/Zahlen'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'
import { postenTitel } from '@/lib/zahlen'

/**
 * Abrechnen: was bezahlt ist, verteilen.
 *
 * Zwei Zustaende, wie im Web (ZahlenPage.tsx, Block "Abrechnung"):
 *
 * 1. KEIN ENTWURF: ankreuzen, welche bezahlten Auftraege abgerechnet werden
 *    (ihre Kosten fahren mit – Netze, Kargo, Montage) und welche weiteren
 *    Posten dazukommen (Ausgaben ohne Auftrag). Daraus wird ein Entwurf.
 * 2. ENTWURF: Wer bekommt wie viel. Abschliessen setzt alles darin auf
 *    bezahlt – nach Rueckfrage, denn danach ist es ein Beleg.
 *
 * Gerechnet und geschrieben wird mit denselben Funktionen aus pl.ts wie im
 * Web (abrechnungEntwurf, abrechnungZahlen, abschlussSchritte).
 */
export default function Abrechnen() {
  const { bestellungen, auslagen, abrechnungen, abrechnungAnlegen, abrechnungAbschliessen, abrechnungVerwerfen, abrechnungAendern } = useBestellungen()
  const { t, datumsform } = useSprache()
  const [auftraege, setAuftraege] = useState<string[]>([])
  const [posten, setPosten] = useState<string[]>([])
  const [laeuft, setLaeuft] = useState(false)
  const [notiz, setNotiz] = useState<string | null>(null)

  const entwurf = abrechnungen.find((a) => !a.erledigtAm)
  const einnahmen = offeneEinnahmen(bestellungen, abrechnungen)
  const schulden = offeneSchulden(bestellungen, auslagen, abrechnungen)
  const frei = freiePosten(schulden)
  const erledigte = abrechnungen.filter((a) => a.erledigtAm).length

  const fehler = (f: unknown) => Alert.alert(t.nichtGespeichert, f instanceof Error ? f.message : String(f))

  async function erstellen() {
    if (auftraege.length + posten.length === 0) return Alert.alert(t.zAbrechnung, t.zNichtsGewaehlt)
    const e = abrechnungEntwurf(einnahmen, schulden, auftraege, posten)
    setLaeuft(true)
    try {
      await abrechnungAnlegen({ nummer: naechsteAbrechnungsnummer(abrechnungen), auftraege: e.auftraege, posten: e.posten, ...abrechnungZahlen(e.auftraege, e.posten) })
      setAuftraege([])
      setPosten([])
    } catch (f) {
      fehler(f)
    } finally {
      setLaeuft(false)
    }
  }

  function abschliessen() {
    if (!entwurf) return
    Alert.alert(t.zAbrechnung, fuelle(t.zAbschliessenFrage, { nummer: entwurf.nummer }), [
      { text: t.abbrechen, style: 'cancel' },
      {
        text: t.zAbschliessen,
        onPress: async () => {
          setLaeuft(true)
          try {
            if (notiz !== null && notiz !== (entwurf.notiz ?? '')) await abrechnungAendern(entwurf.id, { notiz })
            await abrechnungAbschliessen(entwurf)
            router.back()
          } catch (f) {
            fehler(f)
          } finally {
            setLaeuft(false)
          }
        },
      },
    ])
  }

  function verwerfen() {
    if (!entwurf) return
    Alert.alert(t.zAbrechnung, fuelle(t.zVerwerfenFrage, { nummer: entwurf.nummer }), [
      { text: t.abbrechen, style: 'cancel' },
      { text: t.zVerwerfen, style: 'destructive', onPress: () => void abrechnungVerwerfen(entwurf.id).catch(fehler) },
    ])
  }

  if (entwurf) {
    return (
      <BearbeitenRahmen titel={`${t.zAbrechnung} ${entwurf.nummer}`} unterzeile={t.zEntwurf} speichernText={t.zErledigtKnopf} onSpeichern={abschliessen} laeuft={laeuft}>
        <Hinweis>{t.zEntwurfSatz}</Hinweis>
        <AbrechnungAnsicht a={entwurf} />
        {/* Die Notiz geht mit in den Beleg – z. B. "Bar an Ufuk am 12.11.". Gespeichert beim Verlassen des Felds. */}
        <Feld
          id="abrechnung-notiz"
          label={t.notiz}
          value={notiz ?? entwurf.notiz ?? ''}
          onChangeText={setNotiz}
          onBlur={() => {
            if (notiz !== null && notiz !== (entwurf.notiz ?? '')) void abrechnungAendern(entwurf.id, { notiz }).catch(fehler)
          }}
          mehrzeilig
          maxLength={300}
        />
        <Pressable onPress={verwerfen} accessibilityRole="button" style={[r.zeile, { justifyContent: 'center' }]}>
          <Text style={r.gefahrLink}>{t.zVerwerfenKnopf}</Text>
        </Pressable>
      </BearbeitenRahmen>
    )
  }

  const anzahl = auftraege.length + posten.length
  const umschalten = (liste: string[], setze: (l: string[]) => void, wert: string, an: boolean) => setze(an ? [...liste, wert] : liste.filter((x) => x !== wert))
  const mitPosten = abrechnungEntwurf(einnahmen, schulden, auftraege, posten).posten.length

  return (
    <BearbeitenRahmen
      titel={t.zAbrechnung}
      unterzeile={anzahl > 0 ? fuelle(t.zAuswahlUnter, {
        a: fuelle(auftraege.length === 1 ? t.zAuftragZahl : t.zAuftraegeZahl, { n: auftraege.length }),
        p: fuelle(t.zPostenZahl, { n: mitPosten }),
      }) : t.zNichtsGewaehlt}
      speichernText={t.zAbrechnungErstellen}
      onSpeichern={erstellen}
      laeuft={laeuft}
    >
      <ZahlenKarte titel={t.zEinnahmen}>
        {einnahmen.length === 0 ? <ZahlZeile erste titel={t.zNichtsEinzunehmen} /> : null}
        {einnahmen.map((e, i) => {
          const kosten = postenSummeFuer(schulden, e.bestellungId)
          return (
            <HakenZeile
              key={e.bestellungId}
              erste={i === 0}
              titel={e.kunde}
              unter={`${e.referenz} · ${new Date(e.am).toLocaleDateString(datumsform)}\n${fuelle(t.zMitKosten, { kosten: formatChf(kosten), bleibt: formatChf(e.erloesChf - kosten) })}`}
              betrag={e.erloesChf}
              an={auftraege.includes(e.bestellungId)}
              onWechsel={(an) => umschalten(auftraege, setAuftraege, e.bestellungId, an)}
            />
          )
        })}
      </ZahlenKarte>

      <ZahlenKarte titel={t.zWeitereAusgaben}>
        {frei.length === 0 ? <ZahlZeile erste titel={t.zKeineWeiterenKosten} /> : null}
        {frei.map((p, i) => (
          <HakenZeile
            key={postenSchluessel(p)}
            erste={i === 0}
            titel={p.bezeichnung ?? postenTitel(p.art, t)}
            unter={`${beteiligte[p.traeger]} · ${new Date(p.am).toLocaleDateString(datumsform)}`}
            betrag={p.betragChf}
            an={posten.includes(postenSchluessel(p))}
            onWechsel={(an) => umschalten(posten, setPosten, postenSchluessel(p), an)}
          />
        ))}
      </ZahlenKarte>
      <Hinweis>{t.zProAuftragSatz2}</Hinweis>
      {erledigte > 0 ? (
        <ZahlenKarte>
          <ZahlZeile erste titel={fuelle(t.zFruehereAnzahl, { n: erledigte })} onPress={() => router.push('/zahlen/historie')} />
        </ZahlenKarte>
      ) : null}
    </BearbeitenRahmen>
  )
}
