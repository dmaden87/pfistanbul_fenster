const chf = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Preisangabe in Schweizer Franken, z. B. "CHF 49.00". */
export function formatChf(value: number): string {
  return chf.format(value)
}

/** Masse als "120 × 140 cm". */
export function formatSize(widthCm: number, heightCm: number): string {
  return `${widthCm} × ${heightCm} cm`
}

/** Auf 5 Rappen runden, wie in der Schweiz ueblich. */
export function roundToRappen(value: number): number {
  return Math.round(value * 20) / 20
}

/**
 * Einen getippten Betrag lesen – in Schweizer Schreibweise.
 *
 * WARUM ES DAS BRAUCHT: Die Felder lasen bisher `Number(text.replace(',', '.'))`.
 * Das verschluckt den Tausender-Apostroph, und zwar lautlos: Aus "1'234.50"
 * wird NaN und daraus eine Null. Wer einen Betrag von zwölftausend Franken
 * so eintippt, wie man ihn in der Schweiz schreibt, speichert eine Null –
 * und sieht es erst in der Abrechnung, wenn ueberhaupt.
 *
 * Erlaubt ist deshalb alles, was hier jemand tippen wuerde:
 *
 *   12'345.67   1'234.50   1234.50   1234,50   12 345.67   12’345.67
 *
 * WELCHES ZEICHEN TRENNT DIE RAPPEN? Das LETZTE von Punkt oder Komma. In
 * "1.234,50" ist es das Komma, in "1,234.50" der Punkt – beide Schreibweisen
 * kommen vor, und nur die Reihenfolge unterscheidet sie. Steht nur eines
 * da, trennt es die Rappen: "1,50" ist ein Franken fuenfzig, nicht
 * hundertfuenfzig.
 *
 * Was sich nicht als Zahl lesen laesst, gibt `null` – nicht 0. Der
 * Unterschied ist der ganze Punkt: Eine Null ist eine Aussage ("kostet
 * nichts"), ein Tippfehler ist keine.
 */
export function betragAusText(wert: string): number | null {
  const roh = wert.trim()
  if (roh === '') return null

  /* Tausendertrenner raus: Apostroph in seinen drei Formen, und Leerzeichen. */
  let text = roh.replace(/['\u2018\u2019\u00b4`\u00a0\u202f\s]/g, '')

  const letzterPunkt = text.lastIndexOf('.')
  const letztesKomma = text.lastIndexOf(',')
  if (letzterPunkt >= 0 && letztesKomma >= 0) {
    /* Beide da: Das spaetere trennt die Rappen, das fruehere war ein Tausendertrenner. */
    const trenner = letzterPunkt > letztesKomma ? '.' : ','
    const anderes = trenner === '.' ? ',' : '.'
    text = text.split(anderes).join('')
    text = text.replace(trenner, '.')
  } else if (letztesKomma >= 0) {
    text = text.replace(',', '.')
  }

  /* Jetzt muss eine nackte Zahl dastehen - sonst war es keine. */
  if (!/^-?\d*\.?\d*$/.test(text) || text === '.' || text === '-') return null
  const n = Number(text)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

/**
 * Dasselbe fuer Felder, in denen eine fehlende Angabe als 0 gilt.
 *
 * Negative Betraege gibt es hier nicht: Ein Preis unter null ist in keinem
 * dieser Felder eine gueltige Aussage.
 */
export function betragOderNull(wert: string): number {
  const n = betragAusText(wert)
  return n !== null && n >= 0 ? n : 0
}
