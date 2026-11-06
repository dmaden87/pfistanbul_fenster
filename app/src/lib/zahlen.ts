import type { KostenArt } from '@pf/types'
import type { Texte } from '@/lib/sprache'

/** Wie ein Posten heisst, wenn er keine eigene Bezeichnung hat – wie KOSTENTITEL im Web. */
export function postenTitel(art: KostenArt | 'auslage', t: Texte): string {
  const titel: Record<KostenArt | 'auslage', string> = {
    herstellung: t.zHerstellung,
    lieferung: t.zLieferkosten,
    mwst: t.zEinfuhrsteuer,
    kargo: t.zKargoMwst,
    weiteres: t.zWeitereKosten,
    auslage: t.zBetriebskosten,
    montage: t.zMontageSchuld,
  }
  return titel[art]
}
