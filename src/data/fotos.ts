/**
 * Erzeugt von scripts/bilder.mjs – nicht von Hand ändern.
 *
 * Die Masse stammen aus den Originalen und dienen dem Seitenverhältnis, damit
 * beim Nachladen eines Bildes nichts im Layout springt.
 */
export interface FotoMasse {
  breite: number
  hoehe: number
  groessen: number[]
}

export const fotos: Record<string, FotoMasse> = {
  'fenster-geschlossen': { breite: 4284, hoehe: 5712, groessen: [640, 1024, 1600] },
  'gewebe-detail': { breite: 4284, hoehe: 5712, groessen: [640, 1024, 1600] },
  'fassade-aussen': { breite: 5712, hoehe: 4284, groessen: [640, 1024, 1600] },
  'zimmer-storen': { breite: 5712, hoehe: 4284, groessen: [640, 1024, 1600] },
  'team': { breite: 2316, hoehe: 3088, groessen: [640, 1024, 1600] },
}

export type FotoName = keyof typeof fotos
