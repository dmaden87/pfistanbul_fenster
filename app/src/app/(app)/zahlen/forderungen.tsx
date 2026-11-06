import { formatChf } from '@pf/lib/format'
import { offeneForderungen } from '@pf/lib/pl'
import { router } from 'expo-router'
import { Alert } from 'react-native'
import { Hinweis, ZahlenKarte, ZahlenSeite, ZahlZeile } from '@/components/Zahlen'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'

/**
 * Wer uns was schuldet: feste Auftraege, deren Geld noch nicht da ist.
 *
 * Ein Tipp fragt, ob das Geld eingegangen ist – dasselbe Haekchen wie im
 * Web ("bezahlt"), das den Auftrag aus den Forderungen nimmt und ihn fuer
 * die Abrechnung freigibt. Nach Rueckfrage, weil es Geld betrifft.
 */
export default function Forderungen() {
  const { bestellungen, aendern } = useBestellungen()
  const { t, datumsform } = useSprache()
  const liste = offeneForderungen(bestellungen)
  const summe = liste.reduce((x, f) => x + f.betragChf, 0)

  function frage(id: string, kunde: string, betrag: number) {
    Alert.alert(t.zBezahltMarkieren, fuelle(t.zBezahltFrageSatz, { kunde, betrag: formatChf(betrag) }), [
      { text: t.abbrechen, style: 'cancel' },
      { text: t.auftrag, onPress: () => router.push({ pathname: '/auftrag/[id]', params: { id } }) },
      {
        text: t.zJaEingegangen,
        onPress: () => void aendern(id, { bezahlt: true }).catch((f) => Alert.alert(t.nichtGespeichert, f instanceof Error ? f.message : String(f))),
      },
    ])
  }

  return (
    <ZahlenSeite titel={t.zSchuldetUns}>
      <ZahlenKarte>
        {liste.length === 0 ? <ZahlZeile erste titel={t.zNichtsOffen} /> : null}
        {liste.map((f, i) => (
          <ZahlZeile
            key={f.bestellungId}
            erste={i === 0}
            titel={f.kunde}
            unter={fuelle(f.geliefert ? t.zGeliefertAm : t.zNichtGeliefert, { datum: new Date(f.seit).toLocaleDateString(datumsform) })}
            betrag={f.betragChf}
            onPress={() => frage(f.bestellungId, f.kunde, f.betragChf)}
          />
        ))}
        {liste.length > 1 ? <ZahlZeile titel={t.zZusammen} betrag={summe} stark /> : null}
      </ZahlenKarte>
      <Hinweis>{t.zForderungenSatz}</Hinweis>
    </ZahlenSeite>
  )
}
