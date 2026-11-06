import type { AuslagenKategorie, KostenArt } from '@pf/types'
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

/** Die Kategorien der Betriebsausgaben, wie im Web (AuslagenListe.tsx). */
export const KATEGORIEN: AuslagenKategorie[] = ['material', 'fahrten', 'werkzeug', 'marketing', 'infrastruktur', 'sonstiges']

export function kategorieTitel(k: AuslagenKategorie, t: Texte): string {
  const titel: Record<AuslagenKategorie, string> = {
    marketing: t.zMarketing,
    infrastruktur: t.zInfrastruktur,
    material: t.zMaterial,
    werkzeug: t.zWerkzeug,
    fahrten: t.zFahrten,
    sonstiges: t.zSonstiges,
  }
  return titel[k]
}
