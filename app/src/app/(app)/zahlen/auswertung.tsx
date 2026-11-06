import { formatChf } from '@pf/lib/format'
import { forecast, kennzahlen, sendungen } from '@pf/lib/pl'
import { router } from 'expo-router'
import { Text, View } from 'react-native'
import { Hinweis, ZahlenKarte, ZahlenSeite, ZahlZeile, zahlenStile as z } from '@/components/Zahlen'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'
import { farben, radius } from '@/theme'

/**
 * Die Auswertungen – fuer den Blick zurueck, eine Ebene unter der
 * Arbeitsseite. Kennzahlen wie im Web, dann die Listen.
 */
export default function Auswertung() {
  const { bestellungen, auslagen, abrechnungen } = useBestellungen()
  const { t } = useSprache()
  const k = kennzahlen(bestellungen, auslagen, abrechnungen)
  const geh = (wohin: string) => router.push(`/zahlen/${wohin}` as never)
  return (
    <ZahlenSeite titel={t.zAuswertungen}>
      <View style={{ backgroundColor: farben.markeWeich, borderRadius: radius.gross, padding: 14, gap: 2 }}>
        <Text style={z.grossTitel}>{t.zBetriebsergebnis}</Text>
        <Text style={[z.gross, k.betriebsergebnisChf < 0 && { color: farben.gefahr }]}>{formatChf(k.betriebsergebnisChf)}</Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: farben.marke }}>
          {fuelle(t.zRentabilitaetUnter, { r: k.rentabilitaet === null ? '–' : `${k.rentabilitaet} %`, real: formatChf(k.realErgebnisChf) })}
        </Text>
      </View>
      <ZahlenKarte titel={t.zKennzahlen}>
        <ZahlZeile erste titel={t.zTotalErloes} betrag={k.erloesChf} unter={fuelle(t.zErloesUnter, { cashed: formatChf(k.cashedChf), debit: formatChf(k.debitChf), arbeit: formatChf(k.inArbeitChf) })} />
        <ZahlZeile titel={t.zTotalKosten} betrag={k.kostenChf} unter={fuelle(t.zKostenUnter, { ware: formatChf(k.warenkostenChf), betrieb: formatChf(k.betriebskostenChf) })} />
        <ZahlZeile titel={`  ${t.zBezahlt} / ${t.zCredit}`} wert={`${formatChf(k.bezahltKostenChf)} / ${formatChf(k.creditChf)}`} />
      </ZahlenKarte>
      <ZahlenKarte>
        <ZahlZeile erste titel={t.zProAuftrag} unter={fuelle(t.zAnzahlAuftraege, { n: k.auftraegeAnzahl })} onPress={() => geh('auftraege')} />
        <ZahlZeile titel={t.zProSendung} unter={fuelle(t.zAnzahlSendungen, { n: sendungen(bestellungen).length })} onPress={() => geh('sendungen')} />
        <ZahlZeile titel={t.zAuftraegeIst} unter={t.zJahre} onPress={() => geh('jahre')} />
        <ZahlZeile titel={t.zFunnelTitel} betrag={k.funnelChf} unter={fuelle(t.zFunnelSatz, { n: forecast(bestellungen).reduce((x, f) => x + f.anzahl, 0), m: k.funnelNetze })} onPress={() => geh('pipeline')} />
      </ZahlenKarte>
      <Hinweis>{t.zBetriebsergebnisSatz}</Hinweis>
    </ZahlenSeite>
  )
}
