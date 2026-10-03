// Gemeinsame Formen für Logo und Baum-Skizzen.
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

// Çınar-Kronen aus Kreisen [x, y, r]; die Vereinigung ergibt die Krone.
const wolkenkranz = [-15, 25, 60, 90, 120, 155, 195].map(w => {
  const b = (w * Math.PI) / 180
  return [100 + 46 * Math.cos(b), 72 - 46 * Math.sin(b), 24]
})
// Y-förmig: der Stamm endet in der Gabel, die Äste gehen nach oben auseinander.
const aeste = ['M100,114 V68', 'M100,68 L84,48', 'M100,68 L116,46', 'M100,88 L82,74']
export const kronen = {
  rund: {
    name: 'Runde Krone',
    text: 'Ein einziger Kreis. Am ruhigsten und am besten zu sticken. Der Glasrand ist jetzt geschlossen, so liest sich das Glas klar als eigener Gegenstand vor dem Baum.',
    kreise: [[100, 72, 62]],
    aeste,
  },
  wolke: {
    name: 'Wolkenkrone',
    text: 'Die Krone aus Bögen, wie das Laub einer Platane. Sofort als Baum erkennbar, auch ohne Erklärung.',
    kreise: [[100, 74, 44], ...wolkenkranz],
    aeste,
  },
  drei: {
    name: 'Drei Kreise',
    text: 'Drei Kreise als Krone, die unteren beiden rahmen das Glas ein. Geometrisch und modisch, gut für Druck und Prägung.',
    kreise: [[100, 50, 40], [64, 88, 30], [136, 88, 30]],
    aeste: ['M100,114 V58', 'M100,58 L86,40', 'M100,58 L114,38', 'M100,80 L84,68'],
  },
  schatten: {
    name: 'Im Schatten',
    text: 'Der Stamm steht neben dem Glas, die breite Krone wölbt sich darüber. Erzählt das Bild vom Tee im Schatten der Çınar.',
    kreise: [[42, 62, 20], [72, 48, 30], [108, 38, 34], [144, 48, 30], [170, 64, 18]],
    stamm: 'M40,178 C38,140 50,100 84,62',
    aeste: ['M84,62 L112,44', 'M84,62 L74,40'],
  },
}
