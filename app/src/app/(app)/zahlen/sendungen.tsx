import { formatChf } from '@pf/lib/format'
import { sendungen } from '@pf/lib/pl'
import { ZahlenKarte, ZahlenSeite, ZahlZeile } from '@/components/Zahlen'
import { useBestellungen } from '@/lib/bestellungen'
import { fuelle, useSprache } from '@/lib/sprache'

/** Pro Sendung: die Pakete, wie sie zu Bora gingen – Marge und Marge je Netz. */
export default function ProSendung() {
  const { bestellungen } = useBestellungen()
  const { t } = useSprache()
  const liste = sendungen(bestellungen)
  return (
    <ZahlenSeite titel={t.zProSendung}>
      <ZahlenKarte>
        {liste.length === 0 ? <ZahlZeile erste titel={t.zKeineAuftraege} /> : null}
        {liste.map((p, i) => (
          <ZahlZeile
            key={p.paket}
            erste={i === 0}
            titel={p.paket}
            marke={p.geschaetzt ? t.zGeschaetzt : undefined}
            unter={[
              fuelle(t.zSendungUnter, { a: p.anzahl, n: p.netze, erloes: formatChf(p.erloesChf), kosten: formatChf(p.kostenChf) }),
              [p.margeProzent !== null ? `${t.zMarge} ${p.margeProzent} %` : '', p.jeNetzChf !== null ? fuelle(t.zJeNetzUnter, { betrag: formatChf(p.jeNetzChf) }) : '']
                .filter(Boolean)
                .join(' · '),
            ].join('\n')}
            betrag={p.margeChf}
          />
        ))}
      </ZahlenKarte>
    </ZahlenSeite>
  )
}
