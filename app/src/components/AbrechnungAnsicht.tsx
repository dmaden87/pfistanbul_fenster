import { beteiligte } from '@pf/data/kostenConfig'
import { formatChf } from '@pf/lib/format'
import type { Abrechnung } from '@pf/types'
import { Text } from 'react-native'
import { ZahlenKarte, ZahlZeile } from '@/components/Zahlen'
import { fuelle, useSprache } from '@/lib/sprache'
import { postenTitel } from '@/lib/zahlen'
import { farben } from '@/theme'

const LEUTE = ['bora', 'ufuk', 'deniz'] as const

/**
 * Eine Abrechnung zum Lesen – dieselben Zahlen wie AbrechnungBlatt.tsx im
 * Web, aber in der Reihenfolge, in der man sie am Telefon braucht: zuerst,
 * wer wie viel bekommt, dann wie es sich ergibt, zuletzt was darin steht.
 */
export function AbrechnungAnsicht({ a }: { a: Abrechnung }) {
  const { t } = useSprache()
  const hinaus = Math.round((a.rueckzahlungChf + a.verteilbarChf) * 100) / 100
  return (
    <>
      <ZahlenKarte titel={t.zAuszahlen}>
        {LEUTE.map((wer, i) => (
          <ZahlZeile
            key={wer}
            erste={i === 0}
            titel={beteiligte[wer]}
            unter={fuelle(t.zAuszahlenUnter, { r: formatChf(a.rueckzahlung[wer]), a: formatChf(a.anteile[wer]) })}
            betrag={a.summe[wer]}
            stark
          />
        ))}
        <ZahlZeile titel={t.zZusammen} betrag={hinaus} />
        {a.verteilbarChf === 0 ? <Text style={{ fontSize: 13, color: farben.textLeise, paddingBottom: 6 }}>{t.zNichtsZuVerteilen}</Text> : null}
        {hinaus > a.erloesChf + 0.005 ? (
          <Text style={{ fontSize: 13, color: farben.hinweisTinte, paddingBottom: 6 }}>{fuelle(t.zUeberdeckung, { fehlt: formatChf(hinaus - a.erloesChf) })}</Text>
        ) : null}
      </ZahlenKarte>

      <ZahlenKarte titel={t.zRechnung}>
        <ZahlZeile erste titel={t.zEinkassiertWare} betrag={a.warenerloesChf} />
        <ZahlZeile titel={t.zEinkassiertMontage} betrag={a.montageerloesChf} />
        <ZahlZeile titel={t.zWarenkostenDieser} wert={`− ${formatChf(a.warenkostenChf)}`} />
        <ZahlZeile titel={t.zMontageSchuld} wert={`− ${formatChf(a.montagekostenChf ?? 0)}`} />
        <ZahlZeile titel={t.zBetriebskosten} wert={`− ${formatChf(a.betriebskostenChf)}`} />
        <ZahlZeile titel={t.zTopfWare} betrag={a.warengewinnChf} stark />
        <ZahlZeile titel={t.zTopfMontage} betrag={a.montagegewinnChf} stark />
      </ZahlenKarte>

      {a.auftraege.length > 0 ? (
        <ZahlenKarte titel={t.zAuftraegeDarin}>
          {a.auftraege.map((x, i) => (
            <ZahlZeile key={x.bestellungId} erste={i === 0} titel={x.kunde} unter={x.referenz} betrag={x.erloesChf} />
          ))}
        </ZahlenKarte>
      ) : null}

      {a.posten.length > 0 ? (
        <ZahlenKarte titel={t.zKostenDarin}>
          {a.posten.map((p, i) => (
            <ZahlZeile
              key={`${p.bestellungId ?? p.auslageId ?? ''}:${p.postenId}`}
              erste={i === 0}
              titel={p.bezeichnung ?? postenTitel(p.art, t)}
              unter={[beteiligte[p.traeger], p.kunde].filter(Boolean).join(' · ')}
              betrag={p.betragChf}
            />
          ))}
        </ZahlenKarte>
      ) : null}
    </>
  )
}
