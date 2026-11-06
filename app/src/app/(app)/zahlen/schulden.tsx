import { beteiligte } from '@pf/data/kostenConfig'
import { offeneSchulden } from '@pf/lib/pl'
import { router } from 'expo-router'
import { Hinweis, ZahlenKarte, ZahlenSeite, ZahlZeile } from '@/components/Zahlen'
import { useBestellungen } from '@/lib/bestellungen'
import { useSprache } from '@/lib/sprache'
import { postenTitel } from '@/lib/zahlen'

/**
 * Wem wir was schulden – je Person: Bora fuer die Netze, Ufuk und Deniz
 * fuer Montage und Auslagen. Alles aus Sicht der Firma (siehe pl.ts).
 *
 * Nur zum Ansehen. Zurueckbezahlt wird ueber eine Abrechnung, und die
 * bleibt vorerst im Web-Admin: Dort wird ausgewaehlt, verteilt und
 * abgeschlossen, und ein halber Weg in der App waere einer, auf dem man
 * Geld doppelt auszahlt.
 */
export default function Schulden() {
  const { bestellungen, auslagen, abrechnungen } = useBestellungen()
  const { t, datumsform } = useSprache()
  const schulden = offeneSchulden(bestellungen, auslagen, abrechnungen)

  return (
    <ZahlenSeite titel={t.zSchuldenWir}>
      {schulden.length === 0 ? (
        <ZahlenKarte>
          <ZahlZeile erste titel={t.zNichtsOffen} />
        </ZahlenKarte>
      ) : null}
      {schulden.map((sch) => (
        <ZahlenKarte key={sch.traeger}>
          <ZahlZeile erste titel={beteiligte[sch.traeger]} betrag={sch.betragChf} stark />
          {sch.posten.map((p) => (
            <ZahlZeile
              key={`${p.bestellungId ?? p.auslageId ?? ''}:${p.postenId}`}
              titel={p.bezeichnung ?? postenTitel(p.art, t)}
              // "nicht erfasst" heisst: da fehlt ein Beleg. Die Montage ergibt sich aus dem Auftrag.
              marke={!p.erfasst && p.art !== 'montage' ? t.zGerechnet : undefined}
              unter={[p.kunde, new Date(p.am).toLocaleDateString(datumsform)].filter(Boolean).join(' · ')}
              betrag={p.betragChf}
              onPress={p.bestellungId ? () => router.push({ pathname: '/auftrag/[id]/kosten', params: { id: p.bestellungId! } }) : undefined}
            />
          ))}
        </ZahlenKarte>
      ))}
      <Hinweis>{t.zMontageSchuldSatz}</Hinweis>
    </ZahlenSeite>
  )
}
