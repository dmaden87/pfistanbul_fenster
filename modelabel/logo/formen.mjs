// Gemeinsame Formen für Logo, Wortmarken und Baum-Skizzen.
// Glas nach Foto: Rand fast so breit wie der Boden, sanfte Taille, voller runder Bauch.
export const GLAS = 'M68,66 H132 C131,82 121,90 121,104 C121,120 131,130 131,142 C131,151 126,155 118,155 H82 C74,155 69,151 69,142 C69,130 79,120 79,104 C79,90 69,82 68,66 Z'
// Untersetzer: breiter Teller mit tiefer Mulde darunter.
export const TELLER = 'M38,160 C70,157 130,157 162,160 C160,165 150,168 136,169 C134,176 128,180 100,180 C72,180 66,176 64,169 C50,168 40,165 38,160 Z'
// Für «Reduziert»: nur die Glasseiten, Tellerkante und Mulde.
export const LINIEN = [
  'M68,66 C69,82 79,90 79,104 C79,120 69,130 69,142 C69,151 74,155 82,155',
  'M132,66 C131,82 121,90 121,104 C121,120 131,130 131,142 C131,151 126,155 118,155',
  'M40,162 C75,158 125,158 160,162',
  'M68,173 C85,177 115,177 132,173',
]

// Bäume: Fläche (Krone/Stamm) und feine Linien (Äste, Adern).
export const baeume = {
  platane: {
    name: 'Platane',
    text: 'Runde Krone wie die alten Platanen (çınar) über Teegärten. Der Stamm wächst aus dem Glas.',
    flaeche: ['M100,10 A68,68 0 1 1 99.99,10 Z'],
    linien: ['M100,100 V40', 'M100,80 L72,56', 'M100,62 L126,40'],
  },
  zypresse: {
    name: 'Zypresse',
    text: 'Die schlanke Zypresse der Istanbuler Hügel, leicht versetzt hinter dem Glas. Gibt dem Zeichen Höhe.',
    flaeche: ['M134,4 C156,40 160,110 154,166 H114 C108,110 112,40 134,4 Z'],
    linien: [],
  },
  teeblatt: {
    name: 'Teeblatt',
    text: 'Die Krone ist ein Teeblatt, seine Mittelader der Stamm. Baum und Tee in einer Form.',
    flaeche: ['M100,4 C168,30 172,112 100,152 C28,112 32,30 100,4 Z'],
    linien: ['M100,100 V30', 'M100,88 L134,62', 'M100,68 L68,46', 'M100,50 L122,34'],
  },
}


const svg = (inhalt) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="currentColor" role="img">${inhalt}</svg>`
const maske = (id, inhalt) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">${inhalt}</mask>`

// Glas vor die Krone stellen: [Fusspunkt-y im Bild, Massstab]. Das Glas steht im Original bei y 155.
const glasLage = (fuss, massstab) => `translate(100 ${fuss}) scale(${massstab}) translate(-100 155)`.replace('-100 155', '-100 -155')
const RAND = 'M68,66 H132'
const TELLER_LINIEN = LINIEN.slice(2)
const GLAS_LINIEN = [RAND, ...LINIEN.slice(0, 2)]

// Eine Variante: Kronenkreis, Äste, Glas (immer mit geschlossenem Rand), Teller.
// Alle Linien haben dieselbe Stärke – im Bild gemessen, unabhängig vom Massstab des Glases.
export function zeichen({ kreis: [cx, cy, r], strich, aeste = [], fuss, massstab, teller }) {
  const lage = glasLage(fuss, massstab)
  const luecke = `<path d="${GLAS}" transform="${lage}" fill="#000" stroke="#000" stroke-width="${(strich * 3.2) / massstab}" stroke-linejoin="round"/>`
  const linie = (d) => `<path d="${d}"/>`
  return (p) => svg(
    `<defs>${maske(`${p}r`, `<circle cx="${cx}" cy="${cy}" r="${r + strich / 2}" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="${r - strich / 2}" fill="#000"/>${luecke}`)}` +
    `${maske(`${p}a`, `<rect width="200" height="200" fill="#fff"/>${luecke}`)}</defs>` +
    `<rect width="200" height="200" fill="currentColor" mask="url(#${p}r)"/>` +
    `<g fill="none" stroke="currentColor" stroke-width="${strich}" stroke-linecap="round" stroke-linejoin="round">` +
    `<g mask="url(#${p}a)">${aeste.map(linie).join('')}</g>` +
    `<g transform="${lage}" stroke-width="${strich / massstab}">${GLAS_LINIEN.map(linie).join('')}${teller ? '' : TELLER_LINIEN.map(linie).join('')}</g>` +
    `${teller ? teller.map(linie).join('') : ''}</g>`)
}

// Das gewählte Zeichen «Pur»: Krone bis auf den Teller, ohne Äste.
export const PUR = { kreis: [100, 92, 70], strich: 4.5, fuss: 158, massstab: 0.8 }
