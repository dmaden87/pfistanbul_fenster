import { quelleText, whatsappNummer } from '@pf/components/admin/hilfen'
import { nachfassenAb, nachfassenFaellig, NACHFASSEN_NACH_TAGEN } from '@pf/lib/nachrichten'
import { abschnittFuer, PHASEN, tageSeit, type Phase } from '@pf/lib/phasen'
import type { Bestellung } from '@pf/types'
import { fuelle, type Texte } from '@/lib/sprache'

/**
 * Was die App ueber einen Auftrag wissen will, das die Webseite so nicht
 * braucht: Phasennamen, "Bald fällig", Kontakt-Links.
 *
 * Die Regeln selbst – Phasen, was abgeschlossen ist, wie alt etwas ist –
 * kommen aus der gemeinsamen Logik (`@pf/lib/phasen`). Hier wird nichts davon
 * nachgebaut, damit App und Webseite immer gleich rechnen.
 */
export { PHASEN, type Phase }

/** Die Namen der Phasen – dieselben wie im Web-Admin, in der Sprache der Maske. */
export function phasenNamen(t: Texte): Record<Phase, string> {
  return {
    neu: t.phaseNeu,
    klaerung: t.phaseKlaerung,
    offerte: t.phaseOfferte,
    zusage: t.phaseZusage,
    bestellen: t.phaseBestellen,
    bora: t.phaseBora,
    ausliefern: t.phaseAusliefern,
  }
}

/** Nachfassen: Frist und Regel aus src/lib/nachrichten.ts (Vorlage C). */
export { NACHFASSEN_NACH_TAGEN }

export function quelleLabel(b: Bestellung, t: Texte): string {
  return quelleText(b.quelle ?? 'web', t)
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

/** Tage seit dem Versand der Offerte bzw. dem letzten Nachfassen. */
function offerteSeit(b: Bestellung, jetzt = Date.now()): number {
  return tageSeit(nachfassenAb(b), jetzt) ?? 0
}

/**
 * Nachfassen, wenn die Offerte beim Kunden liegt ("Warten auf Zusage") und
 * seit NACHFASSEN_NACH_TAGEN keine Antwort kam – gerechnet ab dem letzten
 * Nachfassen, wenn es eines gab.
 */
export function mussNachfassen(b: Bestellung): boolean {
  return nachfassenFaellig(b)
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

/** Wie Daten geschrieben werden: Woerter und Datumsform der Maske. */
export interface Sprachform {
  t: Texte
  datumsform: string
}

function tagText(d: Date, jetzt: number, f: Sprachform): string {
  const heute = new Date(jetzt)
  const morgen = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + 1)
  if (d.toDateString() === heute.toDateString()) return f.t.heuteGross
  if (d.toDateString() === morgen.toDateString()) return f.t.morgen
  return d.toLocaleDateString(f.datumsform, { weekday: 'short', day: 'numeric', month: 'numeric' })
}

function terminText(termin: string, f: Sprachform, jetzt = Date.now()): string {
  const d = new Date(zeitpunkt(termin))
  const tag = tagText(d, jetzt, f)
  return termin.length === 10 ? tag : `${tag}, ${d.toLocaleTimeString(f.datumsform, { hour: '2-digit', minute: '2-digit' })}`
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
export function baldFaellig(bestellungen: Bestellung[], f: Sprachform, jetzt = Date.now()): Aufgabe[] {
  const { t } = f
  const aufgaben: Aufgabe[] = []
  const heuteAb = new Date(new Date(jetzt).toDateString()).getTime()
  const morgenAb = heuteAb + TAG
  const bis = heuteAb + (VORSCHAU_TAGE + 1) * TAG

  const dazu = (a: Omit<Aufgabe, 'dringend'>) => {
    if (a.faellig < bis) aufgaben.push({ ...a, dringend: a.faellig < morgenAb })
  }

  for (const b of bestellungen.filter(aktiv)) {
    if (b.status === 'zusage') {
      const versandt = Date.parse(nachfassenAb(b))
      if (!Number.isNaN(versandt)) {
        const faellig = versandt + NACHFASSEN_NACH_TAGEN * TAG
        const tage = offerteSeit(b, jetzt)
        dazu({
          id: `${b.id}-nach`, bestellungId: b.id, faellig,
          titel: fuelle(t.aufgabeNachfassen, { name: b.kunde.name }),
          text: `${faellig < morgenAb ? '' : `${tagText(new Date(faellig), jetzt, f)} · `}${fuelle(b.nachgefasstAm ? t.nachgefasstVor : t.offerteRausVor, { n: tage, tage: tage === 1 ? t.tag : t.tage })}`,
        })
      }
    }
    if (b.status === 'neu') {
      dazu({ id: `${b.id}-neu`, bestellungId: b.id, faellig: Date.parse(b.eingang) || jetzt, titel: fuelle(t.aufgabeNeu, { name: b.kunde.name }), text: t.aufgabeNeuText })
    }
    for (const [art, titel, termin] of [['ausmessen', t.aufgabeAusmessen, b.klaerungTermin], ['montage', t.aufgabeMontage, b.montageTermin]] as const) {
      if (!termin) continue
      const wann = zeitpunkt(termin)
      // Vergangene Termine sind erledigt (oder gehoeren nachgetragen) - kein "faellig".
      if (Number.isNaN(wann) || wann < heuteAb) continue
      dazu({ id: `${b.id}-${art}`, bestellungId: b.id, faellig: wann, titel: fuelle(titel, { name: b.kunde.name }), text: `${terminText(termin, f, jetzt)} · ${b.kunde.strasse || b.kunde.ort}` })
    }
  }
  return aufgaben.sort((a, b) => a.faellig - b.faellig)
}

/** Aus dem Web-Admin (src/components/admin/hilfen.ts), damit beide dieselbe Nummer waehlen. */
export { whatsappNummer }

/** Name zu zwei Initialen, fuer den Kreis in der Liste. */
export function initialen(name: string): string {
  const teile = name.trim().split(/\s+/).filter(Boolean)
  return teile.map((t) => t[0]).join('').slice(0, 2).toUpperCase() || '?'
}
