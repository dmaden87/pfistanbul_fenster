import { beteiligte } from '@pf/data/kostenConfig'
import { router } from 'expo-router'
import { Knopf } from '@/components/Blatt'
import { ZahlenKarte, ZahlenSeite, ZahlZeile } from '@/components/Zahlen'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'
import { kategorieTitel } from '@/lib/zahlen'

/** Alle Betriebsausgaben, nach Monat, neueste zuerst. Ein Tipp oeffnet sie. */
export default function Ausgaben() {
  const { auslagen } = useBestellungen()
  const { t, datumsform } = useSprache()
  const sortiert = [...auslagen].sort((x, y) => (x.am < y.am ? 1 : -1))
  const monate = new Map<string, typeof sortiert>()
  for (const a of sortiert) {
    const m = a.am.slice(0, 7)
    monate.set(m, [...(monate.get(m) ?? []), a])
  }
  return (
    <ZahlenSeite titel={t.zBetriebskosten} unten={null}>
      <Knopf text={`+ ${t.zAusgabeErfassen}`} onPress={() => router.push('/zahlen/ausgabe')} />
      {sortiert.length === 0 ? (
        <ZahlenKarte>
          <ZahlZeile erste titel={t.zKeineAusgaben} />
        </ZahlenKarte>
      ) : null}
      {[...monate.entries()].map(([monat, liste]) => (
        <ZahlenKarte key={monat} titel={new Date(`${monat}-15T12:00:00`).toLocaleDateString(datumsform, { month: 'long', year: 'numeric' })}>
          {liste.map((a, i) => (
            <ZahlZeile
              key={a.id}
              erste={i === 0}
              titel={a.bezeichnung}
              marke={a.bezahlt ? t.zAusgeglichen : undefined}
              unter={fuelle(t.zAusgabeUnter, { datum: new Date(a.am).toLocaleDateString(datumsform), kategorie: kategorieTitel(a.kategorie, t), wer: beteiligte[a.traeger] })}
              betrag={a.betragChf}
              onPress={() => router.push({ pathname: '/zahlen/ausgabe', params: { id: a.id } })}
            />
          ))}
          <ZahlZeile titel={t.zZusammen} betrag={liste.reduce((x, a) => x + a.betragChf, 0)} stark />
        </ZahlenKarte>
      ))}
    </ZahlenSeite>
  )
}
