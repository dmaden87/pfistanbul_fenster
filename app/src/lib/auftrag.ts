import { abschnittFuer, PHASEN, tageSeit, type Phase } from '@pf/lib/phasen'
import type { Bestellung, BestellQuelle } from '@pf/types'

/**
 * Was die App ueber einen Auftrag wissen will, das die Webseite so nicht
 * braucht: kurze Bezeichnungen, "Heute zu tun", Kontakt-Links.
 *
 * Die Regeln selbst – Phasen, was abgeschlossen ist, wie alt etwas ist –
 * kommen aus der gemeinsamen Logik (`@pf/lib/phasen`). Hier wird nichts davon
 * nachgebaut, damit App und Webseite immer gleich rechnen.
 */
export { PHASEN, type Phase }

export const PHASE_LABEL: Record<Phase, string> = {
  neu: 'Neu',
  klaerung: 'Klärung',
  offerte: 'Offerte',
  zusage: 'Zusage',
  bestellen: 'Bestellen',
  bora: 'Bei Bora',
  ausliefern: 'Ausliefern',
}

const QUELLE_LABEL: Record<BestellQuelle, string> = {
  web: 'Web',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telefon: 'Telefon',
  persoenlich: 'Persönlich',
}

/** Nach so vielen Tagen ohne Antwort auf eine Offerte heisst es "nachfassen". */
export const NACHFASSEN_NACH_TAGEN = 5

export function quelleLabel(b: Bestellung): string {
  return b.quelle ? QUELLE_LABEL[b.quelle] : 'Web'
}

/** Aktiv = weder abgesagt noch abgeschlossen. */
export function aktiv(b: Bestellung): b is Bestellung & { status: Phase } {
  return abschnittFuer(b) !== 'archiv'
}

/** Seit wie vielen Tagen der Auftrag in seiner Phase steht. */
export function tageInPhase(b: Bestellung): number {
  return tageSeit(b.phaseSeit ?? b.geaendert) ?? 0
}

export function netzAnzahl(b: Bestellung): number {
  return b.positionen.reduce((s, p) => s + p.menge, 0)
}

export function preisOffen(b: Bestellung): boolean {
  return b.positionen.length === 0 || b.positionen.some((p) => !(p.preisChf > 0))
}

export function mussNachfassen(b: Bestellung): boolean {
  return b.status === 'offerte' && (tageSeit(b.offerteAm ?? b.phaseSeit ?? b.geaendert) ?? 0) >= NACHFASSEN_NACH_TAGEN
}

export interface Aufgabe {
  id: string
  bestellungId: string
  titel: string
  text: string
}

/** Ein Termin als Datum; reine Daten ("2026-11-20") gelten ab Mitternacht. */
function zeitpunkt(termin: string): number {
  return Date.parse(termin.length === 10 ? `${termin}T00:00` : termin)
}

function terminText(termin: string): string {
  const t = new Date(zeitpunkt(termin))
  const heute = new Date()
  const morgen = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + 1)
  const tag =
    t.toDateString() === heute.toDateString()
      ? 'Heute'
      : t.toDateString() === morgen.toDateString()
        ? 'Morgen'
        : t.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'numeric' })
  return termin.length === 10 ? tag : `${tag}, ${t.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * "Heute zu tun": was die App von sich aus vorschlaegt.
 *  - neue Eingaenge (bestaetigen, Ausmessen planen)
 *  - Offerten, die seit NACHFASSEN_NACH_TAGEN ohne Antwort sind
 *  - Ausmess- und Montagetermine heute und in den naechsten zwei Tagen
 */
export function heuteZuTun(bestellungen: Bestellung[], jetzt = Date.now()): Aufgabe[] {
  const aufgaben: Aufgabe[] = []
  const bis = jetzt + 2 * 86_400_000
  const ab = new Date(new Date(jetzt).toDateString()).getTime()

  for (const b of bestellungen.filter(aktiv)) {
    if (mussNachfassen(b)) {
      const tage = tageSeit(b.offerteAm ?? b.phaseSeit ?? b.geaendert) ?? 0
      aufgaben.push({ id: `${b.id}-nach`, bestellungId: b.id, titel: `Nachfassen: ${b.kunde.name}`, text: `Offerte seit ${tage} Tagen ohne Antwort` })
    }
    if (b.status === 'neu') {
      aufgaben.push({ id: `${b.id}-neu`, bestellungId: b.id, titel: `Neu: ${b.kunde.name}`, text: 'Eingang bestätigen, Ausmessen planen' })
    }
    for (const [art, termin] of [['Ausmessen', b.klaerungTermin], ['Montage', b.montageTermin]] as const) {
      if (!termin) continue
      const t = zeitpunkt(termin)
      if (t >= ab && t <= bis) {
        aufgaben.push({ id: `${b.id}-${art}`, bestellungId: b.id, titel: `${art}: ${b.kunde.name}`, text: `${terminText(termin)} · ${b.kunde.strasse || b.kunde.ort}` })
      }
    }
  }
  return aufgaben
}

export function termine(b: Bestellung): { art: string; wann: string }[] {
  const liste: { art: string; wann: string }[] = []
  if (b.klaerungTermin) liste.push({ art: 'Ausmessen', wann: terminText(b.klaerungTermin) })
  if (b.montageTermin) liste.push({ art: 'Montage', wann: terminText(b.montageTermin) })
  return liste
}

/**
 * Schweizer Handynummer fuer WhatsApp: nur Ziffern, mit Landesvorwahl.
 * "079 412 33 18" → "41794123318", "+49 170 …" → "49170…". Null, wenn es
 * keine brauchbare Nummer ist.
 */
export function whatsappNummer(telefon: string): string | null {
  const ziffern = telefon.replace(/[^\d+]/g, '')
  if (!ziffern) return null
  let n = ziffern.startsWith('+') ? ziffern.slice(1) : ziffern
  if (n.startsWith('00')) n = n.slice(2)
  else if (n.startsWith('0')) n = `41${n.slice(1)}`
  n = n.replace(/\D/g, '')
  return n.length >= 9 ? n : null
}

/** Name zu zwei Initialen, fuer den Kreis in der Liste. */
export function initialen(name: string): string {
  const teile = name.trim().split(/\s+/).filter(Boolean)
  return teile.map((t) => t[0]).join('').slice(0, 2).toUpperCase() || '?'
}
