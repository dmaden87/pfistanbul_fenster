import { formatChf } from '@pf/lib/format'
import { forecast } from '@pf/lib/pl'
import { Hinweis, ZahlenKarte, ZahlenSeite, ZahlZeile } from '@/components/Zahlen'
import { phasenNamen, type Phase } from '@/lib/auftrag'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'

/**
 * Funnel – Forecast: was noch nicht zugesagt ist, je Phase. Steht getrennt
 * und geht nie in eine Summe mit dem Ist (pl.ts, Grundsatz 2).
 */
export default function Pipeline() {
  const { bestellungen } = useBestellungen()
  const { t } = useSprache()
  const zeilen = forecast(bestellungen)
  const namen = phasenNamen(t)
  const summe = (f: (x: (typeof zeilen)[number]) => number) => zeilen.reduce((s, x) => s + f(x), 0)
  return (
    <ZahlenSeite titel={t.zFunnelTitel}>
      <ZahlenKarte>
        {zeilen.length === 0 ? <ZahlZeile erste titel={t.zKeineAnfragen} /> : null}
        {zeilen.map((f, i) => (
          <ZahlZeile
            key={f.phase}
            erste={i === 0}
            titel={namen[f.phase as Phase] ?? f.etikett}
            marke={f.geschaetzt ? t.zGeschaetzt : undefined}
            unter={`${fuelle(t.zForecastUnter, { a: f.anzahl, n: f.netzZahl, erloes: formatChf(f.erloesChf), kosten: formatChf(f.kostenChf) })}\n${t.zMargeErwartet}`}
            betrag={f.margeChf}
          />
        ))}
        {zeilen.length > 1 ? (
          <ZahlZeile
            titel={t.zZusammen}
            stark
            unter={fuelle(t.zForecastUnter, { a: summe((x) => x.anzahl), n: summe((x) => x.netzZahl), erloes: formatChf(summe((x) => x.erloesChf)), kosten: formatChf(summe((x) => x.kostenChf)) })}
            betrag={summe((x) => x.margeChf)}
          />
        ) : null}
      </ZahlenKarte>
      <Hinweis>{t.zFunnelHinweis}</Hinweis>
    </ZahlenSeite>
  )
}
