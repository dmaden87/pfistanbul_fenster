/**
 * Farben und Masse der App – dieselben wie auf pfistanbul.ch
 * (src/styles/tokens.css). Steht hier als Werte, weil React Native kein CSS
 * liest.
 */
export const farben = {
  grund: '#faf8f4',
  grundAlt: '#f2eee6',
  flaeche: '#ffffff',
  text: '#17211f',
  textLeise: '#4d5b57',
  textSchwach: '#636d6a',
  rand: '#e4ded3',
  randStark: '#d2cabb',
  linie: '#f2eee6',
  marke: '#0f3b34',
  markeDunkel: '#10302b',
  markeWeich: '#dcefe7',
  aufMarke: '#f7fbf9',
  minze: '#7ee0c4',
  hinweis: '#d98324',
  hinweisWeich: '#fbeedd',
  hinweisRand: '#f0d9b8',
  hinweisTinte: '#7a4408',
  erfolg: '#1c7a55',
  gefahr: '#a8352c',
  gefahrWeich: '#fbe6e3',
} as const

export const radius = { klein: 8, mittel: 14, gross: 16, rund: 999 } as const

/** Mindestgroesse fuer alles, was man antippt (Android: 48 dp, iOS: 44 pt). */
export const TIPPFLAECHE = 48
