import { texteFuer } from '@pf/components/admin/sprache'
import { abschnittFuer, PHASEN, tageSeit, type Phase } from '@pf/lib/phasen'
import type { Bestellung, BestellQuelle } from '@pf/types'

/**
 * Was die App ueber einen Auftrag wissen will, das die Webseite so nicht
 * braucht: Phasennamen, "Bald fällig", Kontakt-Links.
 *
 * Die Regeln selbst – Phasen, was abgeschlossen ist, wie alt etwas ist –
 * kommen aus der gemeinsamen Logik (`@pf/lib/phasen`). Hier wird nichts davon
 * nachgebaut, damit App und Webseite immer gleich rechnen.
 */
export { PHASEN, type Phase }

/**
 * Die Namen der Phasen – dieselben wie im Web-Admin, aus dessen Texten
 * (src/components/admin/sprache.ts). Frueher standen hier eigene, kurze
 * Namen; "Zusage" hiess dann in der App, was im Web "Warten auf Zusage"
 * heisst, und ein Auftrag schien in einer anderen Phase zu stehen.
 * Die tuerkische Fassung liegt dort schon bereit.
 */
const TEXTE = texteFuer('deutsch')
export const PHASE_LABEL: Record<Phase, string> = {
  neu: TEXTE.phaseNeu,
  klaerung: TEXTE.phaseKlaerung,
  offerte: TEXTE.phaseOfferte,
  zusage: TEXTE.phaseZusage,
  bestellen: TEXTE.phaseBestellen,
  bora: TEXTE.phaseBora,
  ausliefern: TEXTE.phaseAusliefern,
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

/**
 * Wann die Offerte rausging. `offerteAm` setzt der Web-Admin beim Versand;
 * fehlt es (aeltere Eintraege), zaehlt der Eintritt in die Phase.
 */
function offerteSeit(b: Bestellung, jetzt = Date.now()): number {
  return tageSeit(b.offerteAm ?? b.phaseSeit ?? b.geaendert, jetzt) ?? 0
}

/**
 * Nachfassen, wenn die Offerte beim Kunden liegt ("Warten auf Zusage",
 * Status `zusage`) und seit NACHFASSEN_NACH_TAGEN keine Antwort kam.
 * Nicht in "Angebot erstellen" (`offerte`): Dort ist die Offerte noch gar
 * nicht verschickt.
 */
export function mussNachfassen(b: Bestellung): boolean {
  return b.status === 'zusage' && offerteSeit(b) >= NACHFASSEN_NACH_TAGEN
}

/** Wie weit "Bald fällig" vorausschaut. */
export const VORSCHAU_TAGE = 10

export interface Aufgabe {
  id: string
  bestellungId: string
  titel: string
  text: string
  /** Wann es faellig ist (ms). Ueberfaelliges liegt in der Vergangenheit. */
  faellig: number
  /** Heute faellig oder schon ueberfaellig - wird hervorgehoben. */
  dringend: boolean
}

/** Ein Termin als Datum; reine Daten ("2026-11-20") gelten ab Mitternacht. */
function zeitpunkt(termin: string): number {
  return Date.parse(termin.length === 10 ? `${termin}T00:00` : termin)
}

function tagText(t: Date, jetzt: number): string {
  const heute = new Date(jetzt)
  const morgen = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + 1)
  if (t.toDateString() === heute.toDateString()) return 'Heute'
  if (t.toDateString() === morgen.toDateString()) return 'Morgen'
  return t.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'numeric' })
}

function terminText(termin: string, jetzt = Date.now()): string {
  const t = new Date(zeitpunkt(termin))
  const tag = tagText(t, jetzt)
  return termin.length === 10 ? tag : `${tag}, ${t.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
}

const TAG = 86_400_000

/**
 * "Bald fällig": was in den naechsten VORSCHAU_TAGE ansteht, nach Datum
 * sortiert, Ueberfaelliges zuoberst.
 *  - neue Eingaenge (bestaetigen, Ausmessen planen) – sofort faellig
 *  - Nachfassen: NACHFASSEN_NACH_TAGEN nach dem Versand der Offerte, auch
 *    wenn das erst in ein paar Tagen ist
 *  - Ausmess- und Montagetermine
 */
export function baldFaellig(bestellungen: Bestellung[], jetzt = Date.now()): Aufgabe[] {
  const aufgaben: Aufgabe[] = []
  const heuteAb = new Date(new Date(jetzt).toDateString()).getTime()
  const morgenAb = heuteAb + TAG
  const bis = heuteAb + (VORSCHAU_TAGE + 1) * TAG

  const dazu = (a: Omit<Aufgabe, 'dringend'>) => {
    if (a.faellig < bis) aufgaben.push({ ...a, dringend: a.faellig < morgenAb })
  }

  for (const b of bestellungen.filter(aktiv)) {
    if (b.status === 'zusage') {
      const versandt = Date.parse(b.offerteAm ?? b.phaseSeit ?? b.geaendert)
      if (!Number.isNaN(versandt)) {
        const faellig = versandt + NACHFASSEN_NACH_TAGEN * TAG
        const tage = offerteSeit(b, jetzt)
        dazu({
          id: `${b.id}-nach`, bestellungId: b.id, faellig,
          titel: `Nachfassen: ${b.kunde.name}`,
          text: faellig < morgenAb
            ? `Offerte seit ${tage} Tagen ohne Antwort`
            : `${tagText(new Date(faellig), jetzt)} · Offerte seit ${tage} ${tage === 1 ? 'Tag' : 'Tagen'} draussen`,
        })
      }
    }
    if (b.status === 'neu') {
      dazu({ id: `${b.id}-neu`, bestellungId: b.id, faellig: Date.parse(b.eingang) || jetzt, titel: `Neu: ${b.kunde.name}`, text: 'Eingang bestätigen, Ausmessen planen' })
    }
    for (const [art, termin] of [['Ausmessen', b.klaerungTermin], ['Montage', b.montageTermin]] as const) {
      if (!termin) continue
      const t = zeitpunkt(termin)
      // Vergangene Termine sind erledigt (oder gehoeren nachgetragen) - kein "faellig".
      if (Number.isNaN(t) || t < heuteAb) continue
      dazu({ id: `${b.id}-${art}`, bestellungId: b.id, faellig: t, titel: `${art}: ${b.kunde.name}`, text: `${terminText(termin, jetzt)} · ${b.kunde.strasse || b.kunde.ort}` })
    }
  }
  return aufgaben.sort((a, b) => a.faellig - b.faellig)
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
