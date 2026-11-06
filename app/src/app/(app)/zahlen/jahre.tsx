import { formatChf } from '@pf/lib/format'
import { abschnitte, type Periode } from '@pf/lib/pl'
import { useState } from 'react'
import { View } from 'react-native'
import { Hinweis, ZahlenKarte, ZahlenSeite, ZahlZeile } from '@/components/Zahlen'
import { Wahl } from '@/components/Wahl'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'

/** Aufträge – IST: das laufende Jahr oder alles bisher, wie im Web. */
export default function Jahre() {
  const { bestellungen, auslagen } = useBestellungen()
  const { t } = useSprache()
  const [periode, setPeriode] = useState<Periode>('ytd')
  const liste = abschnitte(bestellungen, auslagen, periode)
  return (
    <ZahlenSeite titel={t.zAuftraegeIst}>
      <View style={{ marginHorizontal: 4 }}>
        <Wahl<Periode>
          label={t.zAbschnitt}
          optionen={[
            { wert: 'ytd', text: t.zJahrBisHeute },
            { wert: 'total', text: t.zTotal },
          ]}
          wert={periode}
          onWahl={setPeriode}
        />
      </View>
      {liste.length === 0 ? (
        <ZahlenKarte>
          <ZahlZeile erste titel={t.zKeineAuftraege} />
        </ZahlenKarte>
      ) : null}
      {liste.map((a) => (
        <ZahlenKarte key={a.schluessel} titel={periode === 'total' ? t.zAbschnittTotal : fuelle(t.zAbschnittJahr, { jahr: a.schluessel })}>
          <ZahlZeile erste titel={t.zErgebnis} betrag={a.ergebnisChf} stark unter={fuelle(t.zJahrUnter, { a: a.anzahl, n: a.netzZahl })} marke={a.geschaetzt ? t.zGeschaetzt : undefined} />
          <ZahlZeile titel={t.zErloes} betrag={a.erloesChf} />
          <ZahlZeile titel={`  ${t.zEinkassiert}`} betrag={a.einkassiertChf} />
          <ZahlZeile titel={`  ${t.zOffen}`} betrag={a.offenChf} />
          <ZahlZeile titel={`  ${t.zInArbeit}`} betrag={a.erwartetChf} />
          <ZahlZeile titel={t.zWarenkosten} wert={`− ${formatChf(a.kostenChf)}`} />
          <ZahlZeile titel={t.zBetriebskosten} wert={`− ${formatChf(a.betriebskostenChf)}`} />
        </ZahlenKarte>
      ))}
      <Hinweis>{t.zIstSatz}</Hinweis>
    </ZahlenSeite>
  )
}
