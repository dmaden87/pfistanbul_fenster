import { router, useLocalSearchParams } from 'expo-router'
import { AbrechnungAnsicht } from '@/components/AbrechnungAnsicht'
import { Hinweis, ZahlenKarte, ZahlenSeite, ZahlZeile } from '@/components/Zahlen'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'

/** Fruehere Abrechnungen – die Liste, und mit ?id= eine davon. */
export default function Historie() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { abrechnungen } = useBestellungen()
  const { t, datumsform } = useSprache()
  const erledigte = abrechnungen.filter((a) => a.erledigtAm).sort((x, y) => ((x.erledigtAm ?? '') < (y.erledigtAm ?? '') ? 1 : -1))
  const eine = id ? erledigte.find((a) => a.id === id) : undefined

  if (eine) {
    return (
      <ZahlenSeite titel={`${t.zAbrechnung} ${eine.nummer}`} unterzeile={`${t.zAbrechnungAm} ${new Date(eine.erledigtAm!).toLocaleDateString(datumsform)}`}>
        {eine.notiz ? <Hinweis>{eine.notiz}</Hinweis> : null}
        <AbrechnungAnsicht a={eine} />
      </ZahlenSeite>
    )
  }

  return (
    <ZahlenSeite titel={t.zHistorie}>
      <ZahlenKarte>
        {erledigte.length === 0 ? <ZahlZeile erste titel={t.zHistorieLeer} /> : null}
        {erledigte.map((a, i) => (
          <ZahlZeile
            key={a.id}
            erste={i === 0}
            titel={a.nummer}
            unter={fuelle(t.zHistorieUnter, { datum: new Date(a.erledigtAm!).toLocaleDateString(datumsform), a: a.auftraege.length, p: a.posten.length })}
            betrag={a.erloesChf}
            onPress={() => router.push({ pathname: '/zahlen/historie', params: { id: a.id } })}
          />
        ))}
      </ZahlenKarte>
    </ZahlenSeite>
  )
}
