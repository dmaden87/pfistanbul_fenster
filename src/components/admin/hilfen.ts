import type { AbsageGrund, Bestellung, BestellPosition, BestellQuelle } from '../../types'
import type { AdminTexte } from './sprache'

/**
 * Kleinkram, den mehrere Teile des Adminbereichs brauchen. Steht hier und
 * nicht in einer der Komponenten, damit die Beschriftungen an genau einer
 * Stelle stehen – "Anfrage Sondermass" in zwei Fassungen ist eine
 * Fehlerquelle, die niemand bemerkt, bis sie stoert.
 */

export function artText(art: Bestellung['art'], t: AdminTexte): string {
  return art === 'anfrage' ? t.artAnfrage : art === 'zahlung' ? t.artZahlung : t.artBestellung
}

export function quelleText(quelle: BestellQuelle, t: AdminTexte): string {
  const nach: Record<BestellQuelle, string> = {
    web: t.quelleWeb,
    whatsapp: t.quelleWhatsapp,
    instagram: t.quelleInstagram,
    telefon: t.quelleTelefon,
    persoenlich: t.quellePersoenlich,
  }
  return nach[quelle]
}

/** Warum eine Bestellung abgesagt wurde, als Text. Ohne Grund nur "abgesagt". */
export function grundText(grund: AbsageGrund | undefined, t: AdminTexte): string {
  switch (grund) {
    case 'spam':
      return t.grundSpam
    case 'doppelt':
      return t.grundDoppelt
    case 'keineAntwort':
      return t.grundKeineAntwort
    case 'kunde':
      return t.grundKunde
    case 'zuTeuer':
      return t.grundZuTeuer
    case 'storno':
      return t.grundStorno
    default:
      return t.abgesagtWeil
  }
}

/** Die Quellen zur Auswahl, in der Reihenfolge der Haeufigkeit. */
export const QUELLEN: BestellQuelle[] = ['whatsapp', 'instagram', 'telefon', 'persoenlich', 'web']

export function datum(iso: string | undefined, ort = 'de-CH'): string {
  if (!iso) return '–'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '–'
    : d.toLocaleString(ort, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function tag(iso: string | undefined, ort = 'de-CH'): string {
  if (!iso) return '–'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '–' : d.toLocaleDateString(ort, { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/**
 * Wie lange etwas schon liegt, in ganzen Tagen. Beim Nachfassen ist das die
 * einzige Zahl, die zaehlt: Eine Offerte von gestern braucht nichts, eine von
 * vor zwei Wochen einen Anruf.
 */
export function tageSeit(iso: string | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

/**
 * Was über die Zahlung wirklich bekannt ist.
 *
 * "Zahlungsart online" heisst nur, dass die Kundin diesen Weg gewählt hat –
 * ob Geld geflossen ist, weiss allein Stripe und meldet es an
 * api/stripe-webhook.ts. Solange diese Meldung fehlt, steht hier "offen" und
 * nicht "bezahlt": Eine Bestellung ausliefern, weil die Liste etwas
 * Falsches behauptet, wäre teurer als ein kurzer Blick ins Stripe-Konto.
 */
export function zahlungstext(b: Bestellung, t: AdminTexte, ort = 'de-CH'): string {
  if (b.zahlung !== 'online') return t.zahltBeiUebergabe
  if (b.bezahlung?.status === 'bezahlt') return `${t.onlineBezahltAm} ${datum(b.bezahlung.zeitpunkt, ort)}`
  if (b.bezahlung?.status === 'abgebrochen') return t.onlineAbgebrochen
  return t.onlineOffen
}

/** Die Masse eines Netzes als Text, wenn welche da sind. */
export function masse(p: BestellPosition): string {
  if (p.breiteCm && p.hoeheCm) return `${p.breiteCm} × ${p.hoeheCm} cm`
  if (p.breiteCm) return `${p.breiteCm} cm breit`
  if (p.hoeheCm) return `${p.hoeheCm} cm hoch`
  return ''
}

/** Was unter einem Netz steht: die Masse, sonst der mitgelieferte Text. */
export function positionDetail(p: BestellPosition): string {
  return masse(p) || p.detail
}

/** Was die Netze zusammen kosten, ohne Montage. */
export function positionenSumme(liste: BestellPosition[]): number {
  return Math.round(liste.reduce((summe, p) => summe + p.preisChf * p.menge, 0) * 100) / 100
}

/**
 * Die Montagepauschale. Dieselbe Herleitung wie auf dem Server: Steht sie als
 * eigenes Feld da, gilt dieses; bei Alteintraegen bleibt der Rueckschluss aus
 * der Differenz, der stimmt, weil ausser Netzen und Montage nichts in die
 * Summe eingeht.
 */
export function montageBetrag(b: Bestellung): number {
  if (typeof b.montageChf === 'number') return b.montageChf
  const rest = b.summeChf - positionenSumme(b.positionen)
  return rest > 0 ? Math.round(rest * 100) / 100 : 0
}

/**
 * Weicht der bezahlte Betrag von der Summe ab? Passiert, sobald jemand nach
 * einer Onlinezahlung noch Netze aendert. Das ist erlaubt – es muss nur
 * jemandem auffallen, statt still im Datensatz zu stehen.
 */
export function zahlungsdifferenz(b: Bestellung): number | null {
  if (b.bezahlung?.status !== 'bezahlt') return null
  const abweichung = Math.round((b.summeChf - b.bezahlung.betragChf) * 100) / 100
  return abweichung === 0 ? null : abweichung
}
