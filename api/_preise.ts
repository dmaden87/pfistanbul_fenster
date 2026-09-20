/**
 * Zieht beim LESEN gerade, was der Warenkorb frueher falsch abgelegt hat.
 *
 * DER FEHLER: `preisChf` einer Position ist der STUECKPREIS - so rechnet es
 * jede Stelle im Haus, `preisChf * menge`. Der Warenkorb schrieb dort aber
 * den Zeilenbetrag hinein, also Stueckpreis mal Menge. Zwei Fenster zu 150.-
 * lagen damit als "2 x 300.-" im Speicher: Die Netze zusammengerechnet gaben
 * 600.-, die mitgespeicherte Summe sagte 300.-.
 *
 * WARUM HIER UND NICHT IN EINEM UMSTELLSKRIPT: Dieselbe Regel wie bei der
 * Abbildung alter Statuswerte - kein bestehender Datensatz wird angefasst.
 * Was im Speicher liegt, bleibt liegen; gerade gezogen wird beim Lesen. Das
 * laesst sich zurueckdrehen, ein Umstellskript nicht.
 *
 * WIE DIE LESART ERKANNT WIRD: Nicht an der Position selbst - der sieht man
 * nichts an. Sondern an `summeChf`. Die stand von Anfang an richtig da, denn
 * sie kam aus derselben Rechnung, die die Kundin an der Kasse gesehen hat,
 * und danach hat auch Stripe abgerechnet. Es wird also geprueft, welche der
 * beiden Lesarten diese Summe trifft. Trifft keine, wird NICHTS geraten:
 * Lieber eine Zahl, die jemandem auffaellt, als eine stillschweigend
 * veraenderte.
 */

interface PreisPosition {
  menge: number
  preisChf: number
}

interface PreisBlick {
  positionen: PreisPosition[]
  summeChf?: number
  montageChf?: number
  rabattChf?: number
}

const runde2 = (n: number) => Math.round(n * 100) / 100

/** Rappengenau genug: Zwei Betraege gelten als gleich, wenn kein Rappen fehlt. */
const trifft = (a: number, b: number) => Math.abs(a - b) < 0.005

export function preiseVereinheitlichen<B extends PreisBlick>(b: B): B {
  const positionen = b.positionen
  if (!Array.isArray(positionen) || positionen.length === 0) return b
  if (typeof b.summeChf !== 'number') return b
  /*
   * Ohne eine Position mit mehr als einem Stueck sind beide Lesarten dieselbe
   * Zahl. Dann gibt es nichts zu entscheiden - und genau deshalb ist der
   * Fehler so lange nicht aufgefallen.
   */
  if (!positionen.some((p) => p.menge > 1)) return b

  const montage = typeof b.montageChf === 'number' ? b.montageChf : 0
  const rabatt = typeof b.rabattChf === 'number' ? b.rabattChf : 0
  // Was die Netze zusammen gekostet haben muessen, laut gespeicherter Summe.
  const soll = runde2(b.summeChf - montage + rabatt)

  const alsStueck = runde2(positionen.reduce((s, p) => s + p.preisChf * p.menge, 0))
  if (trifft(alsStueck, soll)) return b

  const alsZeile = runde2(positionen.reduce((s, p) => s + p.preisChf, 0))
  if (!trifft(alsZeile, soll)) return b

  const geteilt = positionen.map((p) => (p.menge > 0 ? { ...p, preisChf: runde2(p.preisChf / p.menge) } : p))
  /*
   * Gegenprobe. Geht die Teilung nicht rappengenau auf - etwa 100.- auf drei
   * Stueck -, bleibt alles stehen. Sonst entstuende aus einem Anzeigefehler
   * eine Bestellung, die um ein paar Rappen nicht mehr aufgeht.
   */
  const nachher = runde2(geteilt.reduce((s, p) => s + p.preisChf * p.menge, 0))
  if (!trifft(nachher, soll)) return b

  return { ...b, positionen: geteilt }
}
