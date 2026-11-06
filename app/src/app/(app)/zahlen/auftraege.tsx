import { formatChf } from '@pf/lib/format'
import { zaehltPhase, zahlenFuer } from '@pf/lib/pl'
import { router } from 'expo-router'
import { Hinweis, ZahlenKarte, ZahlenSeite, ZahlZeile } from '@/components/Zahlen'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'

/**
 * Pro Auftrag: Marge rechts, Erloes und Kosten darunter. Ein Tipp oeffnet
 * die Kosten des Auftrags – dort wird erfasst, was Bora verlangt hat.
 */
export default function ProAuftrag() {
  const { bestellungen } = useBestellungen()
  const { t } = useSprache()
  const zeilen = bestellungen
    .filter(zaehltPhase)
    .map((b) => ({ b, z: zahlenFuer(b) }))
    // Erst die mit geschaetzten Kosten – dort ist noch etwas zu tun.
    .sort((x, y) => Number(y.z.geschaetzt) - Number(x.z.geschaetzt) || (x.z.datum < y.z.datum ? 1 : -1))

  const stand = (b: (typeof zeilen)[number]['b'], z: (typeof zeilen)[number]['z']) =>
    b.ausserRechnung ? t.zStandNichtGerechnet : z.einkassiert ? t.zStandEinkassiert : z.realisiert ? t.zStandOffen : t.zStandErwartet

  return (
    <ZahlenSeite titel={t.zKostenErfassen} unterzeile={t.zMargeTippen}>
      <ZahlenKarte>
        {zeilen.length === 0 ? <ZahlZeile erste titel={t.zKeineAuftraege} /> : null}
        {zeilen.map(({ b, z }, i) => (
          <ZahlZeile
            key={b.id}
            erste={i === 0}
            titel={b.kunde.name}
            marke={z.geschaetzt ? t.zGeschaetzt : undefined}
            unter={`${fuelle(t.zAuftragUnter, { ref: b.referenz, erloes: formatChf(z.erloesChf), kosten: formatChf(z.kostenChf) })}\n${t.zMarge}${z.margeProzent !== null ? ` ${z.margeProzent} %` : ''} · ${stand(b, z)}`}
            betrag={z.margeChf}
            onPress={() => router.push({ pathname: '/auftrag/[id]/kosten', params: { id: b.id } })}
          />
        ))}
      </ZahlenKarte>
      <Hinweis>{t.zProAuftragSatz}</Hinweis>
    </ZahlenSeite>
  )
}
