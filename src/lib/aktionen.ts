import type { AbsageGrund, Bestellung, BestellAenderung } from '../types'
import type { AdminTexte } from '../components/admin/sprache'
import { fuelle } from '../components/admin/sprache'
import { auftragAufbauen } from './bestellauftrag'
import { bezahltAm, phaseNachWiederoeffnen, phasenEntfallen, type Abschnitt } from './phasen'

/*
 * Was in welcher Phase zu tun ist – die Knoepfe einer Bestellung.
 *
 * WARUM HIER UND NICHT IN DER KARTE: Der Web-Admin (BestellKarte.tsx) und
 * die native App (app/) zeigen dieselben Schritte. Stand die Tabelle nur in
 * der Karte, haette die App sie nachbauen muessen - und die beiden waeren
 * auseinandergelaufen, sobald hier ein Schritt dazukommt. bau/aktionen-test
 * haelt fest, was wo moeglich ist.
 */

/**
 * Was ein Knopf tut: die Offerte oeffnen, die Absage-Frage stellen, oder
 * eine Aenderung an der Bestellung schicken. Als Daten und nicht als
 * Rueckruf, damit die Liste je Phase eine reine Tabelle bleibt.
 */
export type KartenKnopf = {
  tat: 'offerte' | 'absagen' | 'anfrageBlatt' | 'bestellBlatt' | 'boraBestellt' | BestellAenderung
  text: string
  art: 'haupt' | 'still'
  /** Warum der Knopf gerade nicht geht – steht daneben, statt dass er fehlt. */
  gesperrt?: string
}


/** Die Gruende fuer eine Absage, in der Reihenfolge, in der sie vorkommen. */
export const ABSAGE_GRUENDE: AbsageGrund[] = ['spam', 'doppelt', 'keineAntwort', 'kunde', 'zuTeuer', 'storno']

/** Wie viele Angaben dem Produzenten fuer diese Bestellung noch fehlen. */
export function fehlendeAngaben(b: Bestellung): number {
  return auftragAufbauen([b]).luecken.reduce((n, l) => n + l.fehlt.length, 0)
}

/**
 * Was von dieser Phase aus zu tun ist.
 *
 * Der Hauptknopf ist immer der Schritt VORWAERTS im Workflow. Zurueck geht
 * es leise und mit Grund. "Absagen" gibt es ueberall ausser im Archiv –
 * eine Bestellung kann in jeder Phase sterben.
 */
export function knoepfe(b: Bestellung, abschnitt: Abschnitt, t: AdminTexte, imPaket: boolean): KartenKnopf[] {
  const absagen: KartenKnopf = { tat: 'absagen', text: t.knopfAbsagen, art: 'still' }
  const zurueck = (phase: Bestellung['status'], name: string): KartenKnopf => ({
    tat: { status: phase },
    text: fuelle(t.knopfZurueck, { phase: name }),
    art: 'still',
  })

  switch (abschnitt) {
    case 'neu':
      /*
       * Katalogware ist im Webshop bestellt: Masse, Bauart und Preis stehen
       * fest, der Kunde hat an der Kasse zugesagt. Nach der Kontrolle geht
       * sie deshalb direkt ans Bestellen. Der Weg ueber die Klaerung bleibt
       * leise daneben – manchmal steht in der Bemerkung doch eine Frage.
       */
      if (phasenEntfallen(b)) {
        return [
          { tat: { status: 'bestellen', zusage: true }, text: t.knopfGeprueftBestellen, art: 'haupt' },
          { tat: { status: 'klaerung' }, text: t.knopfAngenommen, art: 'still' },
          absagen,
        ]
      }
      return [{ tat: { status: 'klaerung' }, text: t.knopfAngenommen, art: 'haupt' }, absagen]
    case 'klaerung': {
      /*
       * Von hier geht es direkt ans Angebot: Die Zwischenphase "Kosten
       * klaeren" gibt es nicht mehr. Gesperrt bleibt der Weg, solange dem
       * Produzenten Angaben fehlen – ein Angebot ueber ein Netz, das so
       * nicht gebaut werden kann, ist keines.
       */
      const fehlt = b.positionen.length === 0 ? 1 : fehlendeAngaben(b)
      return [
        {
          tat: { status: 'offerte' },
          text: t.knopfKlaerungFertig,
          art: 'haupt',
          gesperrt: fehlt > 0 ? fuelle(t.angabenFehlenMarke, { n: fehlt }) : undefined,
        },
        absagen,
      ]
    }
    case 'offerte':
      /*
       * Erst das Angebot zusammenstellen, dann die Offerte: Solange niemand
       * die Preise bestaetigt hat, stehen Vorschlaege drin, und der
       * Hauptknopf ist der Block darueber. "Offerte ist raus" ist der Schritt
       * vorwaerts – ins Warten.
       *
       * Die Preisanfrage an Bora steht leise daneben. Sie ist keine Phase
       * mehr, aber manchmal ist ein Netz so ungewoehnlich, dass man vorher
       * fragt – dafuer braucht es ein Blatt und keinen Workflow.
       */
      return [
        { tat: 'offerte', text: t.knopfOfferteAnzeigen, art: b.preiseFestgelegtAm ? 'haupt' : 'still' },
        { tat: { status: 'zusage', offerteVersendet: true }, text: t.knopfOfferteRaus, art: b.preiseFestgelegtAm ? 'haupt' : 'still' },
        { tat: 'anfrageBlatt', text: t.preisanfrageAnzeigen, art: 'still' },
        { tat: { status: 'klaerung' }, text: t.knopfAenderungswunsch, art: 'still' },
        absagen,
      ]
    case 'zusage':
      // Beim Kunden. Drei Ausgaenge: Zusage nach vorn, Nachbessern zurueck
      // zum Angebot, Absage ins Archiv – und der Aenderungswunsch zur Klaerung.
      return [
        { tat: { status: 'bestellen', zusage: true }, text: t.knopfKundeZugesagt, art: 'haupt' },
        { tat: 'offerte', text: t.knopfOfferteAnzeigen, art: 'still' },
        { tat: { status: 'offerte' }, text: t.knopfNachbessern, art: 'still' },
        { tat: { status: 'klaerung' }, text: t.knopfAenderungswunsch, art: 'still' },
        absagen,
      ]
    case 'bestellen': {
      /*
       * DER BACKLOG. Hier liegt alles, was zugesagt ist und noch nicht bei
       * Bora – und hier wird gebuendelt: Ein Paket geht als Ganzes zu ihm,
       * mit einem gemeinsamen Talon.
       *
       * Der Hauptknopf ist der Talon, denn ohne ihn wird nichts bestellt.
       * Erst danach kommt "bei Bora bestellt" – der Schritt in die naechste
       * Phase, und zwar fuer das ganze Paket auf einmal: Wer ein Paket
       * zusammenstellt und dann jeden Auftrag einzeln weiterklicken muesste,
       * vergisst den dritten.
       */
      /*
       * Genau EIN Hauptknopf, und das ist der Schritt vorwaerts. Der Talon
       * steht leise daneben: Zwei dunkle Knoepfe uebereinander sahen auf dem
       * Telefon aus wie zwei gleich wichtige Wege, und die Karte wurde zur
       * Wand aus Knoepfen.
       */
      /*
       * IM PAKET STEHEN DIESE BEIDEN OBEN, nicht hier. Sie betreffen das
       * ganze Paket; auf jeder Karte wiederholt waeren sie bei vier
       * Auftraegen viermal derselbe Knopf, der viermal dasselbe tut.
       */
      const liste: KartenKnopf[] = imPaket
        ? []
        : [
            { tat: 'boraBestellt', text: t.knopfBeiBoraBestellt, art: 'haupt' },
            { tat: 'bestellBlatt', text: t.bestelltalonAnzeigen, art: 'still' },
          ]
      if (b.paket) liste.push({ tat: { paket: '' }, text: t.paketAufloesen, art: 'still' })
      if (!phasenEntfallen(b)) liste.push({ tat: { status: 'zusage', zusage: false }, text: t.knopfZusageZurueck, art: 'still' })
      liste.push(absagen)
      return liste
    }
    case 'bora': {
      /*
       * BEI BORA. Zwei Dinge sind hier zu wissen: ob die Ware unterwegs ist
       * (Haken in der Reihe darueber) und unter welcher Nummer. Der Schritt
       * vorwaerts ist "angekommen".
       */
      // Auch hier gilt: Was die ganze Sendung betrifft, steht im Paketkopf.
      const liste: KartenKnopf[] = imPaket
        ? []
        : [
            { tat: { status: 'ausliefern' }, text: t.knopfAngekommen, art: 'haupt' },
            { tat: 'bestellBlatt', text: t.bestelltalonAnzeigen, art: 'still' },
          ]
      if (b.paket) liste.push({ tat: { paket: '' }, text: t.paketAufloesen, art: 'still' })
      if (!imPaket) liste.push(zurueck('bestellen', t.phaseBestellen))
      liste.push(absagen)
      return liste
    }
    case 'ausliefern': {
      const bezahlt = Boolean(bezahltAm(b))
      const uebergeben = Boolean(b.ausgeliefertAm)
      const liste: KartenKnopf[] = []
      if (!uebergeben && !bezahlt) {
        liste.push({ tat: { ausgeliefert: true, bezahlt: true }, text: t.knopfUebergeben, art: 'haupt' })
        liste.push({ tat: { ausgeliefert: true }, text: t.knopfNurAusgeliefert, art: 'still' })
      } else if (!uebergeben) {
        liste.push({ tat: { ausgeliefert: true }, text: t.knopfNurAusgeliefert, art: 'haupt' })
      } else if (!bezahlt) {
        liste.push({ tat: { bezahlt: true }, text: t.knopfBezahlt, art: 'haupt' })
      }
      liste.push(zurueck('bora', t.phaseBora))
      liste.push(absagen)
      return liste
    }
    case 'archiv':
      if (b.status === 'abgesagt') {
        return [{ tat: { status: phaseNachWiederoeffnen(b) }, text: t.knopfWiederOeffnen, art: 'still' }]
      }
      return [{ tat: { ausgeliefert: false, bezahlt: false }, text: t.knopfWiederOeffnen, art: 'still' }]
    default:
      return []
  }
}
