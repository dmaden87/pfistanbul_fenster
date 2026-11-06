import type { BestellAenderung, Bestellung } from '../types'
import { operator } from '../data/operator'
import { site } from '../data/site'
import { formatChf } from './format'
import { abgeschlossen, abschnittFuer, bezahltAm, tageSeit } from './phasen'

/**
 * Die Nachrichten an die Kundschaft – Vorlagen A bis I.
 *
 * Gemeinsam fuer Web-Admin und App: welche Vorlage in welcher Phase passt,
 * was darin steht und welcher Schritt folgt, wenn sie raus ist. Die App
 * oeffnet damit WhatsApp oder das Mailprogramm, vorausgefuellt; gesendet
 * wird dort, und erst auf "Gesendet?" rueckt der Auftrag weiter. Ob WhatsApp
 * wirklich gesendet hat, weiss nur, wer es bedient.
 *
 * DER TON: gesiezt, kurz, ohne Floskeln – wie die Offerte, aber als
 * Nachricht und nicht als Brief. Immer Deutsch, egal in welcher Sprache die
 * Maske laeuft (siehe BestellKarte.tsx). Der Text bleibt vor dem Senden
 * bearbeitbar; die Vorlage ist ein Vorschlag, kein Formular.
 */

export type VorlagenId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I'

/** Wie lange wir uns an eine Offerte halten. Steht auch auf der Offerte. */
export const OFFERTE_GUELTIG_TAGE = 30

/** Nach so vielen Tagen ohne Antwort auf die Offerte: nachfassen. */
export const NACHFASSEN_NACH_TAGEN = 5

/** Der Link, unter dem die Kundschaft Offerte und Quittung sieht. */
export function offerteLink(geheim: string): string {
  return `${site.adresse}/offerte/${geheim}`
}

/**
 * Ab wann die Frist fuers Nachfassen laeuft: der Versand der Offerte oder das
 * letzte Nachfassen, je nachdem, was spaeter war. Fehlt beides (aeltere
 * Eintraege), zaehlt der Eintritt in die Phase.
 */
export function nachfassenAb(b: Bestellung): string {
  const kandidaten = [b.offerteAm, b.nachgefasstAm].filter((x): x is string => Boolean(x))
  if (kandidaten.length === 0) return b.phaseSeit ?? b.geaendert
  return kandidaten.reduce((a, c) => (Date.parse(c) > Date.parse(a) ? c : a))
}

/** Liegt die Offerte seit NACHFASSEN_NACH_TAGEN ohne Antwort beim Kunden? */
export function nachfassenFaellig(b: Bestellung, jetzt = Date.now()): boolean {
  return b.status === 'zusage' && (tageSeit(nachfassenAb(b), jetzt) ?? 0) >= NACHFASSEN_NACH_TAGEN
}

export interface VorlagenWahl {
  id: VorlagenId
  titel: string
  /** Die naheliegende Vorlage in dieser Phase – oben und hervorgehoben. */
  empfohlen: boolean
  /** Warum sie gerade nicht geht. */
  gesperrt?: string
}

const TITEL: Record<VorlagenId, string> = {
  A: 'Eingang bestätigen',
  B: 'Offerte senden',
  C: 'Nachfassen',
  D: 'Angepasste Offerte',
  E: 'Beim Lieferanten bestellt',
  F: 'Netze unterwegs',
  G: 'Netze eingetroffen',
  H: 'Montagetermin',
  I: 'Abschluss & Bewertung',
}

/** Welche Vorlagen zu einem Auftrag passen, die empfohlene zuerst. */
export function vorlagenFuer(b: Bestellung, jetzt = Date.now()): VorlagenWahl[] {
  const abschnitt = abschnittFuer(b)
  const festgelegt = Boolean(b.preiseFestgelegtAm)
  const ohnePreise = festgelegt ? undefined : 'Erst das Angebot festlegen.'
  const liste: VorlagenWahl[] = []
  const dazu = (id: VorlagenId, empfohlen = false, gesperrt?: string) => liste.push({ id, titel: TITEL[id], empfohlen: empfohlen && !gesperrt, gesperrt })

  switch (abschnitt) {
    case 'neu':
      dazu('A', true)
      break
    case 'klaerung':
      dazu('A')
      break
    case 'offerte':
      // D, wenn nachgebessert wurde – ob schon eine Offerte raus war, steht
      // nach dem Nachbessern nirgends mehr (offerteAm wird dabei geloescht).
      dazu('B', true, ohnePreise)
      dazu('D', false, ohnePreise)
      break
    case 'zusage':
      dazu('C', nachfassenFaellig(b, jetzt))
      dazu('D', false, ohnePreise)
      break
    case 'bestellen':
      dazu('E', true)
      break
    case 'bora':
      dazu('F', !b.versandAm)
      dazu('G', Boolean(b.versandAm))
      dazu('E')
      break
    case 'ausliefern': {
      const fertig = Boolean(b.ausgeliefertAm && bezahltAm(b))
      dazu('H', !fertig)
      dazu('I', fertig, fertig ? undefined : 'Erst Übergabe und Zahlung eintragen – dann gibt es die Quittung.')
      break
    }
    case 'archiv':
      if (abgeschlossen(b)) dazu('I', true)
      break
  }
  return liste.sort((a, c) => Number(c.empfohlen) - Number(a.empfohlen))
}

export interface Nachricht {
  id: VorlagenId
  titel: string
  /** Fuer die Mail; WhatsApp kennt keinen Betreff. */
  betreff: string
  text: string
  /** Braucht den Link zu Offerte bzw. Quittung – den legt der Server an. */
  mitLink: boolean
  /** Der Schritt, wenn sie raus ist – oder keiner. */
  danach: BestellAenderung | null
  /** Was "Gesendet?" dazu sagt. */
  danachText?: string
}

export interface NachrichtOptionen {
  /** Offerte-Link aus offerteLink(); ohne ihn steht ein Platzhalter da. */
  link?: string
  /** Wer unterschreibt. */
  absender?: string
  jetzt?: number
}

function datum(iso: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso)
  const tag = d.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' })
  const zeit = /T\d{2}:\d{2}/.test(iso) && !/T12:00:00/.test(iso) ? `, ${d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} Uhr` : ''
  return tag + zeit
}

/** Die Nachricht einer Vorlage fuer einen Auftrag. */
export function nachricht(b: Bestellung, id: VorlagenId, o: NachrichtOptionen = {}): Nachricht {
  const n = b.positionen.reduce((s, p) => s + p.menge, 0)
  const netze = `${n} ${n === 1 ? 'Plissee' : 'Plissees'}`
  const total = formatChf(b.summeChf)
  const link = o.link ?? '[Link zur Offerte]'
  const ref = b.referenz || b.id
  const anrede = `Guten Tag ${b.kunde.name}`
  const gruss = `Freundliche Grüsse\n${o.absender ?? operator.businessName}`
  const montage = b.montage || (b.montageChf ?? 0) > 0
  const absatz = (...teile: (string | false | undefined)[]) => [anrede, ...teile.filter(Boolean), gruss].join('\n\n')

  switch (id) {
    case 'A':
      return {
        id, titel: TITEL[id], mitLink: false,
        betreff: `Ihre Anfrage bei ${operator.businessName}`,
        text: absatz(
          'Vielen Dank für Ihre Anfrage – sie ist bei uns angekommen.',
          b.klaerungTermin
            ? `Wie besprochen kommen wir am ${datum(b.klaerungTermin)} zum Ausmessen vorbei. Das Ausmessen ist kostenlos und unverbindlich.`
            : 'Gerne kommen wir zum Ausmessen bei Ihnen vorbei – kostenlos und unverbindlich. Wann passt es Ihnen?',
        ),
        danach: b.status === 'neu' ? { status: 'klaerung' } : null,
        danachText: b.status === 'neu' ? 'Der Auftrag wechselt zu «Auftrag klären».' : undefined,
      }
    case 'B':
      return {
        id, titel: TITEL[id], mitLink: true,
        betreff: `Ihre Offerte ${ref} – Insektenschutz-Plissees nach Mass`,
        text: absatz(
          `Vielen Dank für Ihr Interesse. Hier finden Sie unsere Offerte für ${netze} nach Mass, total ${total}:\n${link}`,
          `Die Offerte gilt ${OFFERTE_GUELTIG_TAGE} Tage. Für eine Zusage genügt eine kurze Antwort auf diese Nachricht. Bei Fragen sind wir gerne für Sie da.`,
        ),
        danach: { status: 'zusage', offerteVersendet: true },
        danachText: 'Der Auftrag wechselt zu «Warten auf Zusage».',
      }
    case 'C':
      return {
        id, titel: TITEL[id], mitLink: true,
        betreff: `Ihre Offerte ${ref}`,
        text: absatz(
          'Vor einigen Tagen haben wir Ihnen unsere Offerte geschickt. Konnten Sie sie schon anschauen?',
          `Falls noch Fragen offen sind oder Sie etwas anpassen möchten, melden Sie sich gerne – wir finden eine Lösung. Hier nochmals der Link:\n${link}`,
        ),
        danach: { nachgefasst: true },
        danachText: `In ${NACHFASSEN_NACH_TAGEN} Tagen erinnert die App wieder, falls bis dahin keine Antwort kommt.`,
      }
    case 'D':
      return {
        id, titel: TITEL[id], mitLink: true,
        betreff: `Ihre angepasste Offerte ${ref}`,
        text: absatz(
          `Wie besprochen haben wir die Offerte angepasst: ${netze}, total ${total}. Sie finden sie unter demselben Link:\n${link}`,
          'Für eine Zusage genügt eine kurze Antwort auf diese Nachricht.',
        ),
        danach: { status: 'zusage', offerteVersendet: true },
        danachText: b.status === 'zusage' ? 'Die Frist fürs Nachfassen beginnt neu.' : 'Der Auftrag wechselt zu «Warten auf Zusage».',
      }
    case 'E':
      return {
        id, titel: TITEL[id], mitLink: false,
        betreff: `Ihre Plissees sind bestellt (${ref})`,
        text: absatz(
          `Herzlichen Dank für Ihren Auftrag! Wir haben Ihre ${netze} soeben in Auftrag gegeben. Sie werden für Sie nach Mass gefertigt.`,
          'Sobald sie unterwegs sind, geben wir Ihnen Bescheid.',
        ),
        // Ein Paket geht als Ganzes zu Bora – das macht der Bestelltalon, nicht eine Nachricht an einen Kunden.
        danach: b.status === 'bestellen' && !b.paket ? { status: 'bora', bestellt: true } : null,
        danachText: b.status === 'bestellen' && !b.paket ? 'Der Auftrag wechselt zu «Bei Bora».' : undefined,
      }
    case 'F':
      return {
        id, titel: TITEL[id], mitLink: false,
        betreff: `Ihre Plissees sind unterwegs (${ref})`,
        text: absatz(
          `Ihre ${netze} sind fertig und auf dem Weg zu uns.`,
          `Sobald sie eingetroffen sind, melden wir uns, um ${montage ? 'die Montage' : 'die Übergabe'} zu vereinbaren.`,
        ),
        danach: null,
      }
    case 'G':
      return {
        id, titel: TITEL[id], mitLink: false,
        betreff: `Ihre Plissees sind eingetroffen (${ref})`,
        text: absatz(
          `Gute Nachrichten: Ihre ${netze} sind bei uns eingetroffen.`,
          montage
            ? 'Wann dürfen wir zur Montage vorbeikommen? Nennen Sie uns gerne zwei, drei Termine, die Ihnen passen.'
            : 'Wann passt es Ihnen für die Übergabe? Nennen Sie uns gerne zwei, drei Termine.',
        ),
        danach: b.status === 'bora' ? { status: 'ausliefern' } : null,
        danachText: b.status === 'bora' ? 'Der Auftrag wechselt zu «Ausliefern».' : undefined,
      }
    case 'H':
      return {
        id, titel: TITEL[id], mitLink: false,
        betreff: `${montage ? 'Montagetermin' : 'Übergabe'} Ihrer Plissees (${ref})`,
        text: absatz(
          b.montageTermin
            ? `Gerne bestätigen wir den Termin: Wir kommen am ${datum(b.montageTermin)} ${montage ? 'zur Montage' : 'zur Übergabe'} bei Ihnen vorbei.`
            : `Gerne würden wir Ihre Plissees ${montage ? 'montieren' : 'übergeben'}. Welcher Termin passt Ihnen?`,
          'Bezahlt wird bei der Übergabe, bar oder mit TWINT.',
        ),
        danach: null,
      }
    case 'I':
      return {
        id, titel: TITEL[id], mitLink: true,
        betreff: `Herzlichen Dank – Ihre Quittung (${ref})`,
        text: absatz(
          `Herzlichen Dank für Ihren Auftrag! Ihre Quittung finden Sie hier:\n${link}`,
          `Wenn Sie mit unseren Plissees zufrieden sind, freuen wir uns sehr über eine kurze Google-Bewertung – das dauert eine Minute und hilft uns mehr als alles andere:\n${operator.reviewUrl}`,
        ),
        danach: null,
      }
  }
}

/** Der WhatsApp-Link mit Text – oder null ohne brauchbare Nummer. */
export function whatsappLink(nummer: string | null, text: string): string | null {
  return nummer ? `https://wa.me/${nummer}?text=${encodeURIComponent(text)}` : null
}

/** Der Mail-Link mit Betreff und Text – oder null ohne Adresse. */
export function mailLink(email: string, betreff: string, text: string): string | null {
  if (!email.trim()) return null
  // Die Adresse unkodiert: Manche Mailprogramme lesen "%40" nicht als "@".
  return `mailto:${email.trim()}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(text)}`
}
