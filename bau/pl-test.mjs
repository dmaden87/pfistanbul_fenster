/**
 * Testlauf fuer src/lib/pl.ts – die Erfolgsrechnung.
 *
 * Eine falsche Marge sieht aus wie eine richtige. Deshalb wird hier vor
 * allem geprueft, was bei UNVOLLSTAENDIGEN Daten passiert, und ob die
 * Trennung haelt, auf der das ganze Werkzeug steht: geschaetzt gegen
 * gemessen, erwartet gegen realisiert, verdient gegen einkassiert.
 */
import assert from 'node:assert/strict'
import {
  inRechnung, imFunnel, zaehltPhase, zahlenFuer, abschnitte, forecast, kennzahlen,
  kostenPosten, warenkosten, offeneForderungen, offeneSchulden,
  abrechnungZahlen, offeneEinnahmen, naechsteAbrechnungsnummer,
  abrechnungEntwurf, postenSchluessel, postenSummeFuer,
} from '../src/lib/pl.ts'
import { herstellungChf } from '../src/lib/kosten.ts'

let bestanden = 0
const fehler = []
function pruefe(name, lauf) {
  try { lauf(); bestanden++; console.log(`ok    ${name}`) }
  catch (f) { fehler.push(`${name}: ${f.message}`); console.log(`FEHL  ${name}\n      ${f.message.split('\n')[0]}`) }
}

const netz = (breiteCm, hoeheCm, preisChf, menge = 1) => ({
  id: `p${breiteCm}x${hoeheCm}`, bezeichnung: 'Netz', detail: '', menge, preisChf, breiteCm, hoeheCm,
})

function best(extra = {}) {
  const positionen = extra.positionen ?? [netz(100, 100, 150)]
  const montageChf = extra.montageChf ?? 0
  const anfahrtChf = extra.anfahrtChf ?? 0
  const rabattChf = extra.rabattChf ?? 0
  const waren = positionen.reduce((s, p) => s + p.preisChf * p.menge, 0)
  return {
    id: 'b1', referenz: 'A-1', art: 'bestellung', status: 'ausliefern',
    eingang: '2026-01-05T10:00:00.000Z', geaendert: '2026-01-05T10:00:00.000Z',
    kunde: { name: 'Muster', email: '', telefon: '', strasse: '', plz: '', ort: '', bemerkung: '' },
    montage: montageChf > 0,
    summeChf: waren + montageChf + anfahrtChf - rabattChf,
    ...extra,
    positionen,
    montageChf, anfahrtChf, rabattChf,
  }
}

const auslage = (extra = {}) => ({
  id: 'a1', am: '2026-01-20', bezeichnung: 'Aufkleber', kategorie: 'material',
  betragChf: 40, traeger: 'deniz', erfasstAm: '2026-01-20T08:00:00.000Z', ...extra,
})

/* --- Wer zaehlt ------------------------------------------------------------ */

pruefe('alles vor der Zusage ist Funnel, nicht Rechnung', () => {
  /*
   * "Warten auf Zusage" HEISST SO, WEIL DAS JA FEHLT. Der Zusage-Stempel
   * schiebt den Auftrag erst in "Bereit zum Bestellen". Hier stand zuerst
   * 'zusage' auf der Rechnungsseite - damit zaehlten Angebote als Ertrag,
   * die noch niemand angenommen hatte.
   */
  for (const status of ['neu', 'klaerung', 'offerte', 'zusage']) {
    assert.equal(inRechnung(best({ status })), false, status)
    assert.equal(imFunnel(best({ status })), true, status)
  }
})

pruefe('ab der Zusage des Kunden zaehlt alles bis zur Auslieferung', () => {
  for (const status of ['bestellen', 'bora', 'ausliefern']) {
    assert.equal(inRechnung(best({ status })), true, status)
    assert.equal(imFunnel(best({ status })), false, status)
  }
})

pruefe('Abgesagtes ist weder Rechnung noch Funnel', () => {
  assert.equal(inRechnung(best({ status: 'abgesagt' })), false)
  assert.equal(imFunnel(best({ status: 'abgesagt' })), false)
})

pruefe('abgesagt faellt wieder heraus', () => {
  assert.equal(inRechnung(best({ status: 'abgesagt' })), false)
})

pruefe('von Hand ausgenommen zaehlt nie', () => {
  assert.equal(inRechnung(best({ status: 'ausliefern', ausserRechnung: true })), false)
})

pruefe('die Phase allein kennt den Schalter nicht', () => {
  /*
   * Die Oberflaeche braucht beides getrennt: Zeigte sie nur, was
   * `inRechnung` durchlaesst, waere ein ausgenommener Auftrag samt seinem
   * Kaestchen verschwunden - und niemand koennte ihn wieder hereinholen.
   */
  const b = best({ status: 'ausliefern', ausserRechnung: true })
  assert.equal(zaehltPhase(b), true, 'die Phase zaehlt weiter')
  assert.equal(inRechnung(b), false, 'gerechnet wird trotzdem nicht')
  assert.equal(zaehltPhase(best({ status: 'neu' })), false)
  assert.equal(zaehltPhase(best({ status: 'zusage' })), false, 'Warten auf Zusage ist noch nicht fest')
  assert.equal(zaehltPhase(best({ status: 'abgesagt' })), false)
})

pruefe('ein ausgenommener Auftrag faellt aus allen Auswertungen', () => {
  const b = best({ status: 'ausliefern', ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02',
    ausserRechnung: true,
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 30, traeger: 'bora', erfasstAm: 'x' }] })
  assert.equal(abschnitte([b], [], 'total').length, 0, 'keine Periode')
  assert.equal(offeneForderungen([b]).length, 0)
  assert.equal(offeneSchulden([b], []).length, 0)
  assert.equal(offeneEinnahmen([b], []).length, 0)
})

/* --- Der Erloes, aufgeteilt ------------------------------------------------ */

pruefe('Netze, Montage, Anfahrt und Rabatt stehen einzeln', () => {
  const z = zahlenFuer(best({ positionen: [netz(100, 100, 150), netz(80, 60, 130)], montageChf: 30, anfahrtChf: 20, rabattChf: 50 }))
  assert.equal(z.netzeChf, 280)
  assert.equal(z.montageChf, 30)
  assert.equal(z.anfahrtChf, 20)
  assert.equal(z.rabattChf, 50)
  assert.equal(z.erloesChf, 280)      // 280 + 30 + 20 - 50
})

pruefe('abgeschalteter Rabatt zaehlt nicht, auch wenn ein Betrag dasteht', () => {
  const z = zahlenFuer(best({ rabatt: false, rabattChf: 50, summeChf: 150 }))
  assert.equal(z.rabattChf, 0)
  assert.equal(z.netzeChf, 150)
})

/* --- Die Kosten: geschaetzt gegen gemessen --------------------------------- */

pruefe('ohne erfasste Kosten rechnet die Formel – und sagt es', () => {
  const z = zahlenFuer(best({ positionen: [netz(128, 96, 150)] }))
  assert.equal(z.geschaetzt, true)
  assert.equal(z.herstellungChf, herstellungChf(128, 96))
  assert.ok(z.mwstChf > 0, 'Einfuhrsteuer muss gerechnet sein')
})

pruefe('ein erfasster Posten schlaegt die Formel', () => {
  const z = zahlenFuer(best({
    positionen: [netz(128, 96, 150)],
    kosten: [{ id: 'k1', art: 'herstellung', betragChf: 40, traeger: 'bora', erfasstAm: '2026-01-10T00:00:00.000Z' }],
  }))
  assert.equal(z.herstellungChf, 40)
})

pruefe('mehrere Posten derselben Art werden addiert', () => {
  const z = zahlenFuer(best({
    kosten: [
      { id: 'k1', art: 'weiteres', bezeichnung: 'Schrauben', betragChf: 12, traeger: 'deniz', erfasstAm: 'x' },
      { id: 'k2', art: 'weiteres', bezeichnung: 'Fahrt', betragChf: 8, traeger: 'ufuk', erfasstAm: 'x' },
    ],
  }))
  assert.equal(z.weitereChf, 20)
})

pruefe('alte Einkaufspreise aus den Lieferrunden gelten als gemessen', () => {
  /*
   * DIE EINFUHRSTEUER MUSS HIER MIT DASTEHEN. Ohne sie wird sie gerechnet,
   * und die Bestellung gilt zu Recht als geschaetzt – an der Herstellung
   * liegt es dann aber nicht. Genau diese Verwechslung hat der Test beim
   * ersten Lauf aufgedeckt: Die Erwartung war falsch, nicht die Rechnung.
   */
  const z = zahlenFuer(best({
    positionen: [{ ...netz(128, 96, 150), einkaufChf: 31 }],
    kosten: [{ id: 'm', art: 'mwst', betragChf: 2.51, traeger: 'bora', erfasstAm: 'x' }],
  }))
  assert.equal(z.herstellungChf, 31)
  assert.equal(z.geschaetzt, false, 'gemessene Zahlen sind keine Schaetzung')
})

pruefe('eine fehlende Einfuhrsteuer macht die Bestellung zur Schaetzung', () => {
  const z = zahlenFuer(best({ positionen: [{ ...netz(128, 96, 150), einkaufChf: 31 }] }))
  assert.equal(z.herstellungChf, 31, 'die Herstellung bleibt gemessen')
  assert.equal(z.geschaetzt, true, 'die Steuer ist gerechnet')
})

pruefe('ein einziger fehlender Einkaufspreis macht die ganze Bestellung zur Schaetzung', () => {
  const z = zahlenFuer(best({
    positionen: [{ ...netz(128, 96, 150), einkaufChf: 31 }, netz(80, 60, 130)],
  }))
  assert.equal(z.geschaetzt, true)
})

pruefe('Kargo und MWST stehen zusammen und werden gerechnet', () => {
  /*
   * HIER STAND DAS GEGENTEIL: "Lieferkosten werden NIE geschaetzt - lieber
   * eine Null als eine erfundene Fracht." Das war richtig, solange es keine
   * Zahl gab. Jetzt gibt es eine aus einer echten Sendung, und eine Null ist
   * nicht ehrlicher als eine Pauschale, die als solche gekennzeichnet ist:
   * Sie liess Boras groessten Posten nach der Ware ganz verschwinden.
   *
   * Zusammengefasst, weil Bora es so in Rechnung stellt - Fracht und
   * Einfuhrsteuer fallen mit derselben Sendung an und stehen auf seinem
   * Beleg nicht getrennt.
   */
  const b = best({ positionen: [netz(128, 96, 150)] })
  const kargo = kostenPosten(b).filter((k) => k.art === 'kargo')
  assert.equal(kargo.length, 1, 'genau ein Posten, nicht zwei')
  const ware = herstellungChf(128, 96)
  assert.equal(kargo[0].betragChf, runde(12 + runde(ware * 0.081)), '12 Fracht je Netz plus die Steuer')
  assert.equal(kargo[0].traeger, 'bora', 'die Fracht traegt immer Bora')
  assert.equal(kargo[0].geschaetzt, true, 'eine Pauschale sagt, dass sie eine ist')

  /* Und die Summe geht trotzdem in beide Zeilen auf. */
  const z = zahlenFuer(b)
  assert.equal(runde(z.lieferungChf + z.mwstChf), kargo[0].betragChf)
  assert.ok(z.lieferungChf > 0, 'die Fracht steckt jetzt drin')
})

pruefe('Erfasste Fracht schlaegt die Pauschale, und bleibt einzeln', () => {
  /*
   * ZUSAMMENGEFASST WIRD NUR, WO NICHTS ERFASST IST. Wer eine echte Rechnung
   * eintraegt, soll sie wiederfinden - nicht in einer Pauschale aufgehen
   * sehen.
   */
  const b = best({ kosten: [{ id: 'k', art: 'lieferung', betragChf: 18, traeger: 'bora', erfasstAm: 'x' }] })
  const arten = kostenPosten(b).map((k) => k.art)
  assert.ok(!arten.includes('kargo'), 'keine Pauschale daneben')
  assert.equal(zahlenFuer(b).lieferungChf, 18)
})

pruefe('die alten Felder lieferkostenChf und zollChf werden weiter gelesen', () => {
  const z = zahlenFuer(best({ lieferkostenChf: 18, zollChf: 9 }))
  assert.equal(z.lieferungChf, 18)
  assert.equal(z.mwstChf, 9)
})

pruefe('die Marge ist Erloes minus allen Kosten', () => {
  const z = zahlenFuer(best({
    positionen: [netz(100, 100, 200)], montageChf: 15,
    kosten: [
      { id: 'k1', art: 'herstellung', betragChf: 30, traeger: 'bora', erfasstAm: 'x' },
      { id: 'k2', art: 'lieferung', betragChf: 10, traeger: 'bora', erfasstAm: 'x' },
      { id: 'k3', art: 'mwst', betragChf: 2.43, traeger: 'bora', erfasstAm: 'x' },
    ],
  }))
  assert.equal(z.erloesChf, 215)
  /* 42.43 erfasst, dazu 15 Montage: Sie ist Aufwand und zaehlt mit. */
  assert.equal(z.montageKostenChf, 15)
  assert.equal(z.kostenChf, 57.43)
  assert.equal(z.margeChf, 157.57)
  assert.equal(z.margeProzent, 73.3)
})

/* --- Realisiert gegen erwartet --------------------------------------------- */

const geliefert = best({ id: 'g', status: 'ausliefern', ausgeliefertAm: '2026-03-10T00:00:00.000Z', zusageAm: '2026-02-01T00:00:00.000Z' })
const zugesagt = best({ id: 'z', status: 'bestellen', zusageAm: '2026-03-20T00:00:00.000Z' })

pruefe('jeder feste Auftrag zaehlt, der Stand steht daneben', () => {
  /*
   * FRUEHER STAND HIER DAS GEGENTEIL: Zugesagtes sei kein Ertrag. Das ist
   * buchhalterisch richtig und zum Steuern unbrauchbar - ein zugesagter
   * Auftrag hat einen festen Verkaufspreis. Die drei Stand-Spalten
   * zusammen ergeben wieder den Erloes.
   */
  const [a] = abschnitte([geliefert, zugesagt], [], 'total')
  assert.equal(a.erloesChf, 300, 'beide zaehlen')
  assert.equal(a.erwartetChf, 150, 'davon noch nicht geliefert')
  assert.equal(a.anzahl, 2)
  assert.equal(a.einkassiertChf + a.offenChf + a.erwartetChf, a.erloesChf)
})

pruefe('einkassiert wird getrennt gezaehlt', () => {
  const bezahlt = best({ ...geliefert, bezahltAm: '2026-03-15T00:00:00.000Z' })
  const [a] = abschnitte([bezahlt], [], 'total')
  assert.equal(a.erloesChf, 150)
  assert.equal(a.einkassiertChf, 150)
  const [b] = abschnitte([geliefert], [], 'total')
  assert.equal(b.einkassiertChf, 0, 'geliefert heisst nicht bezahlt')
})

pruefe('die Debitoren stecken im Erloes und stehen zusaetzlich einzeln da', () => {
  /*
   * GELIEFERT IST VERDIENT. Dass das Geld noch nicht da ist, aendert nichts
   * am Ertrag - es sagt nur, dass er noch aussteht. Erloes = einkassiert
   * plus offen, immer.
   */
  const bezahlt = best({ ...geliefert, id: 'p', bezahltAm: '2026-03-15T00:00:00.000Z' })
  const [a] = abschnitte([bezahlt, geliefert], [], 'total')
  assert.equal(a.erloesChf, 300)
  assert.equal(a.einkassiertChf, 150)
  assert.equal(a.offenChf, 150)
  assert.equal(a.erwartetChf, 0)
  assert.equal(a.einkassiertChf + a.offenChf, a.erloesChf)
})

pruefe('Zugesagtes ist kein Debitor', () => {
  const [a] = abschnitte([zugesagt], [], 'total')
  assert.equal(a.offenChf, 0, 'es ist nichts geliefert, also schuldet niemand etwas')
  assert.equal(a.erwartetChf, 150)
  assert.equal(a.erloesChf, 150, 'im Erloes steht es trotzdem')
})

pruefe('Stripes Meldung gilt auch als einkassiert', () => {
  const bezahlt = best({ ...geliefert, bezahlung: { status: 'bezahlt', am: '2026-03-12', sitzung: 'cs_1' } })
  const [a] = abschnitte([bezahlt], [], 'total')
  assert.equal(a.einkassiertChf, 150)
})

/* --- Perioden -------------------------------------------------------------- */

pruefe('YTD nimmt das laufende Jahr und sonst nichts', () => {
  /*
   * Aelteres gehoert ins Total, nicht ins laufende Jahr. Frueher kam je
   * Jahr eine Zeile heraus, und die aelteste hiess "2025 bis heute" -
   * falsch, denn das Jahr ist seit Silvester vollstaendig.
   */
  const heuer = new Date().getFullYear()
  const jetzt = best({ id: 'a', ausgeliefertAm: `${heuer}-02-10T00:00:00.000Z` })
  const frueher = best({ id: 'b', ausgeliefertAm: `${heuer - 1}-02-10T00:00:00.000Z` })
  const liste = abschnitte([jetzt, frueher], [], 'ytd')
  assert.equal(liste.length, 1)
  assert.equal(liste[0].etikett, `${heuer} bis heute`)
  assert.equal(liste[0].erloesChf, 150, 'nur der Auftrag aus diesem Jahr')
})

pruefe('Total nimmt alles, egal aus welchem Jahr', () => {
  const heuer = new Date().getFullYear()
  const jetzt = best({ id: 'a', ausgeliefertAm: `${heuer}-02-10T00:00:00.000Z` })
  const frueher = best({ id: 'b', ausgeliefertAm: `${heuer - 1}-02-10T00:00:00.000Z` })
  const liste = abschnitte([jetzt, frueher], [], 'total')
  assert.equal(liste.length, 1)
  assert.equal(liste[0].etikett, 'Total, alles bisher')
  assert.equal(liste[0].erloesChf, 300)
  assert.equal(liste[0].anzahl, 2)
})

pruefe('auch die Auslagen folgen der Periode', () => {
  const heuer = new Date().getFullYear()
  const b = best({ ausgeliefertAm: `${heuer}-02-10T00:00:00.000Z` })
  const alt = auslage({ id: 'alt', am: `${heuer - 1}-05-01`, betragChf: 90 })
  const neu = auslage({ id: 'neu', am: `${heuer}-05-01`, betragChf: 10 })
  assert.equal(abschnitte([b], [alt, neu], 'ytd')[0].betriebskostenChf, 10)
  assert.equal(abschnitte([b], [alt, neu], 'total')[0].betriebskostenChf, 100)
})

pruefe('Betriebskosten mindern das Ergebnis, nicht die Warenkosten', () => {
  const [a] = abschnitte([best({ ausgeliefertAm: '2026-01-10T00:00:00.000Z',
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 30, traeger: 'bora', erfasstAm: 'x' }] })],
    [auslage({ am: '2026-01-20', betragChf: 40 })], 'total')
  /* Herstellung erfasst, dazu die Kargo-Pauschale: 12 Fracht fuer ein Netz
     plus 8.1 Prozent Einfuhrsteuer auf die erfassten 30. */
  const kargo = runde(12 + runde(30 * 0.081))
  assert.equal(a.kostenChf, runde(30 + kargo), 'Herstellung plus Kargo und MWST')
  assert.equal(a.betriebskostenChf, 40)
  assert.equal(a.ergebnisChf, runde(150 - 30 - kargo - 40))
})

/* --- Die Kennzahlen oben --------------------------------------------------- */

pruefe('Total Erloes teilt sich in Cashed, Debit und In Arbeit', () => {
  const bezahlt = best({ id: 'c', ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02' })
  const offen = best({ id: 'd', ausgeliefertAm: '2026-03-01' })
  const arbeit = best({ id: 'f', status: 'bora', zusageAm: '2026-03-01' })
  const k = kennzahlen([bezahlt, offen, arbeit], [])
  assert.equal(k.erloesChf, 450)
  assert.equal(k.cashedChf, 150)
  assert.equal(k.debitChf, 150)
  assert.equal(k.inArbeitChf, 150)
  assert.equal(k.cashedChf + k.debitChf + k.inArbeitChf, k.erloesChf)
})

pruefe('der Funnel steht NEBEN dem Total Erloes, nicht darin', () => {
  const fest = best({ id: 'a', status: 'bora', zusageAm: '2026-03-01' })
  const anfrage = best({ id: 'b', status: 'offerte' })
  const k = kennzahlen([fest, anfrage], [])
  assert.equal(k.erloesChf, 150, 'nur der feste Auftrag')
  assert.equal(k.funnelChf, 150, 'die Anfrage steht im Funnel')
  assert.equal(k.warenkostenChf > 0, true)
})

pruefe('das Betriebsergebnis ist Erloes minus Waren- und Betriebskosten', () => {
  const b = best({ ausgeliefertAm: '2026-03-01',
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 30, traeger: 'bora', erfasstAm: 'x' },
             { id: 'k2', art: 'mwst', betragChf: 2.43, traeger: 'bora', erfasstAm: 'x' }] })
  const k = kennzahlen([b], [auslage({ betragChf: 20 })])
  assert.equal(k.warenkostenChf, 32.43)
  assert.equal(k.betriebskostenChf, 20)
  assert.equal(k.kostenChf, 52.43)
  assert.equal(k.betriebsergebnisChf, 97.57)
  assert.equal(k.rentabilitaet, 65)
})

pruefe('das REALE Ergebnis rechnet nur mit geflossenem Geld', () => {
  /*
   * Einkassiert 150, davon bezahlt: 30 Ware. Die Einfuhrsteuer steht offen
   * und die Auslage auch - beide duerfen das reale Ergebnis nicht mindern,
   * sie sind noch nicht geflossen.
   */
  const b = best({ ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02',
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 30, traeger: 'bora', bezahlt: true, erfasstAm: 'x' },
             { id: 'k2', art: 'mwst', betragChf: 2.43, traeger: 'bora', erfasstAm: 'x' }] })
  const k = kennzahlen([b], [auslage({ betragChf: 20 })])
  assert.equal(k.realErgebnisChf, 120)
  assert.ok(k.realErgebnisChf !== k.betriebsergebnisChf, 'die zwei Sichten unterscheiden sich')
})

pruefe('ein nicht einkassierter Auftrag traegt nichts zum realen Ergebnis bei', () => {
  const b = best({ ausgeliefertAm: '2026-03-01' })
  assert.equal(kennzahlen([b], []).realErgebnisChf, 0)
})

pruefe('Total Kosten zeigt, wie viel davon noch zu bezahlen ist', () => {
  const b = best({ status: 'ausliefern', ausgeliefertAm: '2026-03-01',
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 30, traeger: 'bora', erfasstAm: 'x' },
             { id: 'k2', art: 'lieferung', betragChf: 10, traeger: 'bora', bezahlt: true, erfasstAm: 'x' },
             { id: 'k3', art: 'mwst', betragChf: 0, traeger: 'bora', erfasstAm: 'x' }] })
  const k = kennzahlen([b], [auslage({ betragChf: 20, traeger: 'deniz' })])
  assert.equal(k.kostenChf, 60, '40 Ware plus 20 Betrieb')
  assert.equal(k.creditChf, 50, '30 Ware offen plus 20 Auslage offen')
  assert.equal(k.bezahltKostenChf, 10)
  assert.equal(k.ohneBelegChf, 0, 'alles ist erfasst')
})

pruefe('bezahlt und offen ergeben zusammen die Gesamtkosten', () => {
  /*
   * DAS IST DIE EIGENTLICHE ZUSAGE DIESER KACHEL. Wer "Total Kosten" liest
   * und darunter zwei Teilsummen sieht, muss sie addieren koennen.
   *
   * Gerechnete Posten sind KEIN dritter Teil. Sie stehen beim Standardtraeger
   * offen, also stecken sie in "Credit" mit drin; ein eigener Summand waere
   * doppelt gezaehlt. (Bis die gerechneten Posten offen standen, war es
   * anders - der Test hat den Umbau mitgemacht.)
   */
  const erfasst = best({ id: 'e', status: 'ausliefern', ausgeliefertAm: '2026-03-01',
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 30, traeger: 'bora', bezahlt: true, erfasstAm: 'x' },
             { id: 'k2', art: 'mwst', betragChf: 2.43, traeger: 'bora', erfasstAm: 'x' }] })
  /* Dieser hat gar keine Posten – seine Kosten kommen aus der Formel. */
  const gerechnet = best({ id: 'g', status: 'bora', zusageAm: '2026-03-01' })
  const k = kennzahlen([erfasst, gerechnet], [auslage({ betragChf: 20 }), auslage({ id: 'a2', betragChf: 15, bezahlt: true })])

  assert.equal(runde(k.bezahltKostenChf + k.creditChf), k.kostenChf,
    `${k.bezahltKostenChf} + ${k.creditChf} ist nicht ${k.kostenChf}`)
  assert.ok(k.ohneBelegChf > 0, 'der gerechnete Auftrag hat keinen Beleg')
  assert.ok(k.ohneBelegChf <= k.creditChf, 'Gerechnetes steht offen, also steckt es in Credit')
  assert.equal(k.bezahltKostenChf, 45, '30 Ware plus 15 Auslage')
})

pruefe('der Funnel steht in Stueck und Geld in den Kennzahlen', () => {
  const kommt = best({ status: 'zusage', positionen: [netz(100, 100, 150), netz(80, 60, 130)] })
  const k = kennzahlen([kommt], [])
  assert.equal(k.funnelAnzahl, 1)
  assert.equal(k.funnelNetze, 2)
  assert.equal(k.funnelChf, 280)
  assert.ok(k.funnelKostenChf > 0, 'die Kosten sind gerechnet')
  assert.equal(k.funnelMargeChf, runde(k.funnelChf - k.funnelKostenChf))
})

function runde(x) { return Math.round(x * 100) / 100 }

/* --- Forecast -------------------------------------------------------------- */

pruefe('der Funnel reicht von neu bis Warten auf Zusage', () => {
  const liste = ['neu', 'klaerung', 'offerte', 'zusage'].map((status, i) => best({ id: 's' + i, status }))
  const f = forecast(liste)
  assert.deepEqual(f.map((x) => x.phase), ['neu', 'klaerung', 'offerte', 'zusage'],
    'in der Reihenfolge der Naehe')
  assert.equal(f.reduce((s, x) => s + x.erloesChf, 0), 600)
})

pruefe('feste Auftraege gehoeren nicht in den Funnel', () => {
  for (const status of ['bestellen', 'bora', 'ausliefern']) {
    assert.equal(forecast([best({ status })]).length, 0, status)
  }
})

pruefe('leere Phasen fallen weg', () => {
  const f = forecast([best({ status: 'zusage' })])
  assert.equal(f.length, 1)
})

pruefe('der Funnel rechnet die erwartete Marge mit', () => {
  const b = best({ status: 'offerte', positionen: [netz(128, 96, 150)],
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 30, traeger: 'bora', erfasstAm: 'x' },
             { id: 'k2', art: 'mwst', betragChf: 2.43, traeger: 'bora', erfasstAm: 'x' }] })
  const [f] = forecast([b])
  assert.equal(f.erloesChf, 150)
  assert.equal(f.kostenChf, 32.43)
  assert.equal(f.margeChf, 117.57)
})

pruefe('ein ausgenommener Auftrag steht auch nicht im Funnel', () => {
  assert.equal(forecast([best({ status: 'offerte', ausserRechnung: true })]).length, 0)
})

/* --- Die gerechneten Warenkosten ------------------------------------------- */

pruefe('die Warenkosten der festen Auftraege stehen nach Art getrennt', () => {
  /*
   * DIESE SUMME WIRD NIE EINGETIPPT. Unter den Betriebskosten stand bisher
   * nur, was jemand von Hand erfasst hatte - und die Netze fehlten dort,
   * obwohl sie der groesste Posten sind.
   */
  const fest = best({ id: 'f', status: 'bora', zusageAm: '2026-02-01',
    kosten: [
      { id: 'k1', art: 'herstellung', betragChf: 60, traeger: 'bora', erfasstAm: 'x' },
      { id: 'k2', art: 'lieferung', betragChf: 20, traeger: 'bora', erfasstAm: 'x' },
      { id: 'k3', art: 'mwst', betragChf: 4.86, traeger: 'bora', bezahlt: true, erfasstAm: 'x' },
      { id: 'k4', art: 'weiteres', bezeichnung: 'Dübel', betragChf: 7, traeger: 'deniz', erfasstAm: 'x' },
    ] })
  const w = warenkosten([fest, best({ id: 'n', status: 'offerte' })])
  assert.equal(w.auftraege, 1, 'der Funnel gehoert nicht dazu')
  assert.equal(w.herstellungChf, 60)
  assert.equal(w.lieferungChf, 20)
  assert.equal(w.mwstChf, 4.86)
  assert.equal(w.weitereChf, 7)
  assert.equal(w.summeChf, 91.86)
  assert.equal(w.offenChf, 87, 'die bezahlte Einfuhrsteuer steht nicht mehr offen')
})

pruefe('die Warenkosten stimmen mit der Kennzahl ueberein', () => {
  /*
   * ZWEI WEGE ZUR GLEICHEN ZAHL, und sie muessen sich treffen: Die Kachel
   * oben summiert ueber `zahlenFuer`, der Block unten ueber `kostenPosten`.
   * Liefen sie auseinander, stuende dasselbe Geld zweimal verschieden da.
   */
  const liste = [
    best({ id: 'a', status: 'bora', zusageAm: '2026-02-01' }),
    best({ id: 'b', status: 'ausliefern', ausgeliefertAm: '2026-03-01',
      positionen: [netz(128, 96, 180), netz(64, 96, 120)] }),
  ]
  assert.equal(warenkosten(liste).summeChf, kennzahlen(liste, []).warenkostenChf)
})

pruefe('Netze und Auftraege stehen in Stueck da, fest und im Funnel getrennt', () => {
  const liste = [
    best({ id: 'f', status: 'bora', zusageAm: '2026-02-01', positionen: [netz(100, 100, 150), netz(80, 60, 130)] }),
    best({ id: 'n', status: 'offerte', positionen: [netz(100, 100, 150)] }),
  ]
  const k = kennzahlen(liste, [])
  assert.equal(k.auftraegeAnzahl, 1)
  assert.equal(k.auftraegeNetze, 2)
  assert.equal(k.funnelAnzahl, 1)
  assert.equal(k.funnelNetze, 1)
})

pruefe('ein erfasster Posten schreibt den gerechneten fest, ohne die Summe zu bewegen', () => {
  /*
   * DAS MACHT DAS HAEKCHEN IN DER OBERFLAECHE: Es legt den nicht erfassten
   * Posten mit DERSELBEN KENNUNG und demselben Betrag an und setzt ihn auf
   * bezahlt. Waere die Summe danach eine andere, verschoebe ein Haken die
   * Erfolgsrechnung.
   */
  const vorher = best({ status: 'bora', zusageAm: '2026-02-01' })
  const posten = kostenPosten(vorher)
  const nachher = best({
    status: 'bora', zusageAm: '2026-02-01',
    kosten: posten.map((k) => ({
      id: k.id, art: k.art, betragChf: k.betragChf, traeger: k.traeger,
      bezahlt: true, erfasstAm: 'x',
    })),
  })
  assert.equal(zahlenFuer(nachher).kostenChf, zahlenFuer(vorher).kostenChf, 'gleiche Summe')
  assert.equal(offeneSchulden([vorher], []).length, 1)
  assert.equal(offeneSchulden([nachher], []).length, 0, 'abgehakt, also nicht mehr offen')
  assert.equal(zahlenFuer(nachher).geschaetzt, false, 'jetzt steht ein Beleg dahinter')
})

/* --- Offene Posten --------------------------------------------------------- */

pruefe('wer uns was schuldet: jeder feste Auftrag, der nicht bezahlt ist', () => {
  /*
   * NICHT ERST AB DER AUSLIEFERUNG. Zuerst stand `realisiert` als Bedingung,
   * und die Liste blieb auf der echten Datenlage leer: fest waren mehrere
   * Auftraege, geliefert noch keiner. Ob die Ware schon steht, sagt eine
   * Spalte - es entscheidet nicht, ob der Betrag aussteht.
   */
  const liste = offeneForderungen([geliefert, zugesagt])
  assert.equal(liste.length, 2, 'auch das Zugesagte steht aus')
  assert.deepEqual(liste.map((f) => f.bestellungId), ['g', 'z'], 'nach Datum')
  assert.equal(liste[0].betragChf, 150)
  assert.equal(liste[0].geliefert, true)
  assert.equal(liste[1].geliefert, false, 'zugesagt, aber noch nicht geliefert')
})

pruefe('bezahlte Bestellungen stehen nicht mehr offen', () => {
  assert.equal(offeneForderungen([best({ ...geliefert, bezahltAm: '2026-03-15' })]).length, 0)
})

pruefe('wem wir was schulden, je Traeger zusammengefasst', () => {
  const b = best({
    kosten: [
      { id: 'k1', art: 'herstellung', betragChf: 60, traeger: 'bora', erfasstAm: 'x', am: '2026-02-01' },
      { id: 'k2', art: 'lieferung', betragChf: 20, traeger: 'bora', erfasstAm: 'x', am: '2026-02-01' },
      { id: 'k3', art: 'weiteres', bezeichnung: 'Dübel', betragChf: 7, traeger: 'deniz', erfasstAm: 'x', am: '2026-02-03' },
    ],
  })
  const liste = offeneSchulden([b], [auslage({ betragChf: 40, traeger: 'deniz' })])
  assert.equal(liste.length, 2)
  assert.equal(liste[0].traeger, 'bora')
  /* 60 Herstellung, 20 Lieferung und die gerechnete Einfuhrsteuer auf die 60. */
  assert.equal(liste[0].betragChf, runde(80 + 60 * 0.081))
  assert.equal(liste[0].posten.length, 3)
  assert.deepEqual(liste[0].posten.map((p) => p.erfasst), [true, true, false])
  assert.equal(liste[1].traeger, 'deniz')
  assert.equal(liste[1].betragChf, 47)
  assert.equal(liste[1].posten.length, 2)
})

pruefe('gerechnete Kosten schulden wir auch, ohne dass sie erfasst sind', () => {
  /*
   * DAS WAR DER FEHLER AUF DEN ECHTEN DATEN: "Wem wir was schulden" blieb
   * leer, obwohl Bora die Netze und die Fracht laengst ausgelegt hatte -
   * weil niemand die Betraege eingetippt hatte. Sie ergeben sich aus dem
   * Auftrag, und bis jemand "ausgeglichen" setzt, stehen sie offen.
   */
  const b = best({ status: 'bora', zusageAm: '2026-02-01', positionen: [netz(100, 100, 150)] })
  const liste = offeneSchulden([b], [])
  assert.equal(liste.length, 1)
  assert.equal(liste[0].traeger, 'bora', 'Netze und Fracht legt Bora aus')
  const ware = herstellungChf(100, 100)
  assert.equal(liste[0].posten.find((p) => p.art === 'herstellung').betragChf, ware)
  assert.equal(liste[0].betragChf, runde(liste[0].posten.reduce((x, p) => x + p.betragChf, 0)))
  assert.ok(liste[0].betragChf > ware, 'die Einfuhrsteuer kommt dazu')
  assert.ok(liste[0].posten.every((p) => !p.erfasst), 'nichts davon ist erfasst')
  assert.ok(liste[0].posten.every((p) => p.postenId.length > 0), 'jeder Posten ist einzeln abhakbar')
})

pruefe('jeder Posten hat seine eigene Kennung, auch mehrere "Weiteres"', () => {
  /*
   * Wer nach der ART abhakt, setzt alle "Weiteres" eines Auftrags zugleich
   * auf bezahlt. Darum fuehrt jeder Posten seine Kennung mit.
   */
  const b = best({
    kosten: [
      { id: 'w1', art: 'weiteres', bezeichnung: 'Dübel', betragChf: 7, traeger: 'deniz', erfasstAm: 'x' },
      { id: 'w2', art: 'weiteres', bezeichnung: 'Fahrt', betragChf: 9, traeger: 'deniz', erfasstAm: 'x' },
    ],
  })
  const [s] = offeneSchulden([b], []).filter((x) => x.traeger === 'deniz')
  assert.deepEqual(s.posten.map((p) => p.postenId), ['w1', 'w2'])
})

pruefe('bezahlte Posten schulden wir nicht mehr', () => {
  /*
   * Die Einfuhrsteuer muss hier MIT ERFASST sein. Sonst rechnet sie sich aus
   * der Ware und bleibt offen stehen - richtig so, aber nicht, was dieser
   * Test misst.
   */
  const b = best({ kosten: [
    { id: 'k1', art: 'herstellung', betragChf: 60, traeger: 'bora', bezahlt: true, erfasstAm: 'x' },
    { id: 'k2', art: 'mwst', betragChf: 4.86, traeger: 'bora', bezahlt: true, erfasstAm: 'x' },
  ] })
  assert.equal(offeneSchulden([b], []).length, 0)
})

pruefe('Kosten einer Bestellung vor der Zusage schulden wir noch nicht', () => {
  const b = best({ status: 'klaerung', kosten: [{ id: 'k1', art: 'herstellung', betragChf: 60, traeger: 'bora', erfasstAm: 'x' }] })
  assert.equal(offeneSchulden([b], []).length, 0)
})

/* --- Abrechnung ------------------------------------------------------------ */

/*
 * DIE ABRECHNUNG IST EIN BELEG, KEINE VORSCHAU.
 *
 * Vorher rechnete `aufteilung` jedes Mal neu, was eine Abrechnung ueber ALLE
 * festen Auftraege ergaebe - auch ueber die, von denen noch kein Rappen da
 * war, und ohne zu wissen, was beim letzten Mal schon verteilt wurde. Zum
 * Anschauen war das richtig, zum Verteilen unbrauchbar.
 */

const einnahme = (id, erloes, ware, montage) => ({
  bestellungId: id, referenz: id, kunde: id,
  erloesChf: erloes, warenerloesChf: ware, montageerloesChf: montage,
})
const kosten = (id, betrag, traeger, art = 'herstellung') => ({
  bestellungId: 'b1', postenId: id, art, betragChf: betrag, traeger,
})

pruefe('Verteilt wird, was ausgewaehlt ist – nicht alles', () => {
  const eine = abrechnungZahlen([einnahme('a', 180, 165, 15)], [])
  const beide = abrechnungZahlen([einnahme('a', 180, 165, 15), einnahme('b', 180, 165, 15)], [])
  assert.equal(eine.erloesChf, 180)
  assert.equal(beide.erloesChf, 360)
})

pruefe('Zuerst zurueck, dann verteilen', () => {
  /* 200 Warenerloes, 100 Auslage von Bora: 100 gehen zurueck, 100 werden verteilt. */
  const a = abrechnungZahlen([einnahme('a', 300, 200, 100)], [kosten('k1', 100, 'bora')])
  assert.equal(a.warenkostenChf, 100)
  assert.equal(a.rueckzahlung.bora, 100)
  assert.equal(a.warengewinnChf, 100)
  assert.equal(a.montagegewinnChf, 100)
  assert.equal(a.anteile.bora, 20, '20 Prozent der Ware, nichts von der Montage')
  assert.equal(a.anteile.ufuk, 40 + 50)
  assert.equal(a.anteile.deniz, 40 + 50)
  assert.equal(a.summe.bora, 120, 'Anteil plus Auslage')
  assert.equal(a.summe.ufuk, 90)
})

pruefe('Was hereinkam, geht vollstaendig wieder hinaus', () => {
  /*
   * DIE PROBE AUFS GANZE. Rueckzahlungen plus Anteile muessen den Erloes
   * ergeben - sonst bleibt Geld in der Rechnung haengen, und niemand sieht,
   * wo.
   */
  const a = abrechnungZahlen(
    [einnahme('a', 170, 150, 20)],
    [kosten('k1', 28.8, 'bora'), kosten('k2', 14, 'bora'), kosten('k3', 2.33, 'deniz'),
     { auslageId: 'al', postenId: 'al', art: 'auslage', betragChf: 95, traeger: 'ufuk' }],
  )
  const hinaus = runde(a.summe.bora + a.summe.ufuk + a.summe.deniz)
  assert.equal(hinaus, 170, `${hinaus} statt 170`)
  assert.equal(runde(a.rueckzahlungChf + a.verteilbarChf), 170)
})

pruefe('Die Anfahrt gehoert zur Arbeit, nicht zur Ware', () => {
  const a = abrechnungZahlen([einnahme('a', 170, 150, 20)], [])
  assert.equal(a.montagegewinnChf, 20)
  assert.equal(a.anteile.bora, 150 * 0.2, 'Bora bekommt nichts von der Anfahrt')
})

pruefe('Ein Topf im Minus wird nicht verteilt, die Auslage geht trotzdem zurueck', () => {
  /*
   * Ohne diese Regel stand in der Anzeige "Bora -10.02" - das sieht aus,
   * als schuldete Bora uns Geld. In Wahrheit ist nur noch nichts zu
   * verteilen. Was jemand ausgelegt hat, bekommt er aber auch dann zurueck.
   */
  const a = abrechnungZahlen([einnahme('a', 150, 150, 0)], [kosten('k1', 900, 'deniz')])
  assert.ok(a.warengewinnChf < 0, 'der Topf zeigt die Lage')
  assert.equal(a.anteile.bora, 0)
  assert.equal(a.anteile.ufuk, 0)
  assert.equal(a.anteile.deniz, 0)
  assert.equal(a.verteilbarChf, 0)
  assert.equal(a.rueckzahlung.deniz, 900, 'die Auslage bleibt eine Auslage')
})

pruefe('Eine leere Abrechnung ergibt lauter Nullen', () => {
  const a = abrechnungZahlen([], [])
  assert.equal(a.erloesChf, 0)
  assert.equal(a.verteilbarChf, 0)
  assert.equal(a.summe.bora, 0)
})

/* --- Die Montage als Schuld an uns selbst ----------------------------------- */

pruefe('Montage und Anfahrt stehen bei Ufuk und Deniz offen, haelftig', () => {
  /*
   * WARUM ES DAS GIBT: In "Wem wir was schulden" standen Boras Auslagen -
   * und nicht die eigene Arbeit. Das Geld fuer die Montage tauchte erst
   * ganz am Schluss auf, als Anteil am Topf. Jetzt steht es dort, wo man es
   * sucht.
   */
  const b = best({ status: 'ausliefern', ausgeliefertAm: '2026-03-01', montageChf: 30, anfahrtChf: 20 })
  const liste = offeneSchulden([b], [])
  const ufuk = liste.find((s) => s.traeger === 'ufuk')
  const deniz = liste.find((s) => s.traeger === 'deniz')
  const m = (s) => s.posten.filter((p) => p.art === 'montage')
  assert.equal(m(ufuk).length, 1)
  assert.equal(m(ufuk)[0].betragChf, 25, 'die Haelfte von 30 Montage plus 20 Anfahrt')
  assert.equal(m(deniz)[0].betragChf, 25)
})

pruefe('Ohne Montage und ohne Anfahrt steht nichts da', () => {
  const b = best({ status: 'ausliefern', ausgeliefertAm: '2026-03-01' })
  const alle = offeneSchulden([b], []).flatMap((s) => s.posten)
  assert.equal(alle.filter((p) => p.art === 'montage').length, 0)
})

pruefe('Eine abgeschaltete Anfahrt zaehlt nicht, auch mit Betrag', () => {
  const b = best({ status: 'ausliefern', ausgeliefertAm: '2026-03-01',
    montageChf: 30, anfahrt: false, anfahrtChf: 20 })
  const ufuk = offeneSchulden([b], []).find((s) => s.traeger === 'ufuk')
  assert.equal(ufuk.posten.find((p) => p.art === 'montage').betragChf, 15, 'nur die Montage')
})

pruefe('Die Montage IST Aufwand und mindert die Marge', () => {
  /*
   * HIER STAND DAS GEGENTEIL: "Wer sich selbst fuer die eigene Arbeit
   * bezahlt, hat keine Ausgabe, sondern verteilt Erloes." Das gilt fuer eine
   * Gewinnverteilung - fuer eine Leistung, die zum Ansatz je Netz anfaellt,
   * gilt es nicht. Deniz' Entscheid: Montieren kostet, auch wenn es die
   * eigenen Leute tun.
   */
  const ohne = best({ status: 'ausliefern', ausgeliefertAm: '2026-03-01' })
  const mit = best({ status: 'ausliefern', ausgeliefertAm: '2026-03-01', montageChf: 30, anfahrtChf: 20 })
  assert.equal(
    runde(zahlenFuer(mit).kostenChf - zahlenFuer(ohne).kostenChf),
    50,
    'Montage und Anfahrt zusammen',
  )
  assert.ok(zahlenFuer(mit).margeProzent < zahlenFuer(ohne).margeProzent, 'die Marge sinkt')
})

pruefe('Die Montage traegt, wer montiert: halbe / halbe', () => {
  const b = best({ status: 'ausliefern', ausgeliefertAm: '2026-03-01', montageChf: 30, anfahrtChf: 20 })
  const m = kostenPosten(b).filter((k) => k.art === 'montage')
  assert.equal(m.length, 2, 'Ufuk und Deniz, nicht Bora')
  assert.deepEqual(m.map((k) => k.traeger).sort(), ['deniz', 'ufuk'])
  assert.ok(m.every((k) => k.betragChf === 25))
  assert.ok(m.every((k) => !k.geschaetzt), 'der Betrag steht im Auftrag, er ist nicht geraten')
})

pruefe('Der Montage-Aufwand kommt aus dem ANGEBOT, nicht aus einer Pauschale', () => {
  /*
   * DIE 15 JE NETZ SIND EINE VORBELEGUNG, kein Gesetz. Im Angebot laesst
   * sich der Betrag ueberschreiben - nachgelassen, erhoeht, geschenkt - und
   * was dort steht, ist der Aufwand. Wer stattdessen 15 mal die Netzzahl
   * rechnete, bekaeme bei jedem Nachlass einen Montage-Topf, den es nicht
   * gibt, und eine Marge, die nicht stimmt.
   */
  const auftrag = (montageChf, mehr = {}) => best({
    status: 'ausliefern', ausgeliefertAm: '2026-03-01',
    positionen: [netz(100, 200, 165, 2)], summeChf: 330,
    montage: true, montageChf, ...mehr,
  })
  const summe = (b) => runde(kostenPosten(b).filter((k) => k.art === 'montage')
    .reduce((s, k) => s + k.betragChf, 0))

  assert.equal(summe(auftrag(30)), 30, 'zwei Netze zum Ansatz')
  assert.equal(summe(auftrag(50)), 50, 'im Angebot erhoeht')
  assert.equal(summe(auftrag(10)), 10, 'im Angebot nachgelassen')
  assert.equal(summe(auftrag(0)), 0, 'geschenkt heisst kein Aufwand')
  assert.equal(summe(auftrag(30, { anfahrt: true, anfahrtChf: 20 })), 50, 'die Anfahrt zaehlt mit')

  /* Und die Gegenprobe: Mehr Netze allein aendern nichts. */
  const vierNetze = best({
    status: 'ausliefern', ausgeliefertAm: '2026-03-01',
    positionen: [netz(100, 200, 165, 4)], summeChf: 690,
    montage: true, montageChf: 30,
  })
  assert.equal(summe(vierNetze), 30, 'der Betrag steht im Auftrag, nicht in der Netzzahl')
})

pruefe('Bezahlt und offen ergeben weiter die Gesamtkosten', () => {
  /*
   * Eine Weile musste die Montage hier herausgerechnet werden, weil sie als
   * Schuld dastand, ohne eine Koste zu sein. Seit sie Aufwand ist, geht die
   * Rechnung von selbst auf.
   */
  const b = best({ status: 'ausliefern', ausgeliefertAm: '2026-03-01', montageChf: 30, anfahrtChf: 20 })
  const k = kennzahlen([b], [])
  assert.equal(runde(k.bezahltKostenChf + k.creditChf), k.kostenChf)
})

pruefe('Die Montage mindert den Montage-Topf, nicht den Waren-Topf', () => {
  /*
   * Sonst waere es so, als haette Bora unsere Montage bezahlt: Sein Anteil
   * stiege, weil wir uns selbst auszahlen.
   */
  const montage = [
    { bestellungId: 'b', postenId: 'm1', art: 'montage', betragChf: 25, traeger: 'ufuk' },
    { bestellungId: 'b', postenId: 'm2', art: 'montage', betragChf: 25, traeger: 'deniz' },
  ]
  const a = abrechnungZahlen([einnahme('b', 200, 150, 50)], montage)
  assert.equal(a.montagekostenChf, 50)
  assert.equal(a.warenkostenChf, 0, 'die Ware bleibt unberuehrt')
  assert.equal(a.warengewinnChf, 150)
  assert.equal(a.montagegewinnChf, 0, 'der Montage-Topf ist aufgebraucht')
  assert.equal(a.anteile.bora, 30, '20 Prozent der Ware, wie ohne Montage-Schuld')
})

pruefe('Mit und ohne Montage-Schuld bekommt jeder dasselbe', () => {
  /*
   * DIE PROBE AUF DEN UMBAU. Es sollte sich nur die Darstellung aendern:
   * frueher kam das Montagegeld als Anteil am Topf, jetzt als Rueckzahlung.
   * Unter dem Strich muss bei jedem dasselbe herauskommen.
   */
  const ohne = abrechnungZahlen([einnahme('b', 200, 150, 50)], [])
  const mit = abrechnungZahlen([einnahme('b', 200, 150, 50)], [
    { bestellungId: 'b', postenId: 'm1', art: 'montage', betragChf: 25, traeger: 'ufuk' },
    { bestellungId: 'b', postenId: 'm2', art: 'montage', betragChf: 25, traeger: 'deniz' },
  ])
  for (const wer of ['bora', 'ufuk', 'deniz']) {
    assert.equal(mit.summe[wer], ohne.summe[wer], wer)
  }
})

pruefe('Eine abgerechnete Montage steht nicht noch einmal offen', () => {
  const b = best({ id: 'b1', status: 'ausliefern', ausgeliefertAm: '2026-03-01', montageChf: 30 })
  const fertig = {
    erledigtAm: '2026-03-05',
    auftraege: [],
    posten: [{ bestellungId: 'b1', postenId: 'b1-montage-ufuk', art: 'montage', betragChf: 15, traeger: 'ufuk' }],
  }
  const liste = offeneSchulden([b], [], [fertig])
  const alle = liste.flatMap((s) => s.posten).filter((p) => p.art === 'montage')
  assert.deepEqual(alle.map((p) => p.postenId), ['b1-montage-deniz'], 'nur die noch offene Haelfte')
})

pruefe('Eine bezahlte Montage steht nicht mehr offen', () => {
  /*
   * WIE JEDER ANDERE POSTEN AUCH. Die Montage hatte eine Weile einen eigenen
   * Weg - sichtbar als Schuld, aber keine Koste, und erledigt dadurch, dass
   * ihr Auftrag in einer Abrechnung stand. Seit sie Aufwand ist, gilt
   * `bezahlt` wie ueberall sonst.
   */
  const offen = best({ id: 'b1', status: 'ausliefern', ausgeliefertAm: '2026-03-01', montageChf: 30 })
  assert.equal(offeneSchulden([offen], []).flatMap((s) => s.posten)
    .filter((p) => p.art === 'montage').length, 2)

  const quitt = best({ id: 'b1', status: 'ausliefern', ausgeliefertAm: '2026-03-01', montageChf: 30,
    kosten: [
      { id: 'b1-montage-ufuk', art: 'montage', betragChf: 15, traeger: 'ufuk', bezahlt: true, erfasstAm: 'x' },
      { id: 'b1-montage-deniz', art: 'montage', betragChf: 15, traeger: 'deniz', bezahlt: true, erfasstAm: 'x' },
    ] })
  assert.equal(offeneSchulden([quitt], []).flatMap((s) => s.posten)
    .filter((p) => p.art === 'montage').length, 0)
  /* Koste bleibt sie trotzdem - bezahlt heisst nicht gratis. */
  assert.equal(zahlenFuer(quitt).montageKostenChf, 30)
})

pruefe('Mehr hinaus als herein ist moeglich und laesst sich erkennen', () => {
  /*
   * DER FALL IST ECHT: Boras Netzkosten und die eigene Montage stehen offen,
   * sobald ein Auftrag fest ist - auch wenn die Kundschaft noch nicht
   * bezahlt hat. Wer sie dann abrechnet, schuettet Geld aus, das noch nicht
   * da ist. Gesperrt wird es nicht (es kann gewollt sein, jemanden
   * vorzustrecken), aber die Oberflaeche muss es sagen koennen - und dafuer
   * muessen die Zahlen es hergeben.
   */
  const a = abrechnungZahlen([einnahme('b', 100, 100, 0)], [
    { bestellungId: 'x', postenId: 'k', art: 'herstellung', betragChf: 40, traeger: 'bora' },
    { bestellungId: 'y', postenId: 'm', art: 'montage', betragChf: 60, traeger: 'ufuk' },
  ])
  const hinaus = runde(a.rueckzahlungChf + a.verteilbarChf)
  assert.equal(hinaus, 160, '100 Auslagen zurueck plus 60 aus dem Waren-Topf')
  assert.ok(hinaus > a.erloesChf, 'mehr als hereingekommen ist')
  assert.equal(a.montagegewinnChf, -60, 'der Montage-Topf steht im Minus')
  assert.equal(runde(a.summe.bora + a.summe.ufuk + a.summe.deniz), hinaus)
})

/* --- Was sich abrechnen laesst --------------------------------------------- */

pruefe('Nur bezahlte Auftraege stehen zum Abrechnen bereit', () => {
  /*
   * DAS WAR DER DENKFEHLER IM ERSTEN ENTWURF: Die Einnahmeseite sollte aus
   * "Wer uns was schuldet" kommen. Dort stehen aber genau die UNbezahlten -
   * das Geld, das verteilt werden soll, findet sich dort nie.
   */
  const bezahlt = best({ id: 'p', ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02' })
  const offen = best({ id: 'o', ausgeliefertAm: '2026-03-01' })
  const liste = offeneEinnahmen([bezahlt, offen], [])
  assert.deepEqual(liste.map((e) => e.bestellungId), ['p'])
  assert.equal(liste[0].erloesChf, 150)
})

pruefe('Ware und Montage stehen getrennt, der Rabatt mindert die Ware', () => {
  const b = best({
    ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02',
    montageChf: 30, anfahrtChf: 20, rabattChf: 10,
  })
  const [e] = offeneEinnahmen([b], [])
  assert.equal(e.warenerloesChf, 140, '150 Netze minus 10 Rabatt')
  assert.equal(e.montageerloesChf, 50, 'Montage und Anfahrt sind unsere Arbeit')
  assert.equal(e.erloesChf, 190)
  assert.equal(runde(e.warenerloesChf + e.montageerloesChf), e.erloesChf, 'die beiden ergeben den Erloes')
})

pruefe('Ein abgerechneter Auftrag steht nicht noch einmal bereit', () => {
  const b = best({ id: 'p', ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02' })
  const fertig = { erledigtAm: '2026-03-03', auftraege: [{ bestellungId: 'p' }], posten: [] }
  assert.equal(offeneEinnahmen([b], [fertig]).length, 0)
})

pruefe('Auch ein Entwurf haelt den Auftrag fest', () => {
  /*
   * Sonst liesse er sich in zwei Abrechnungen zugleich legen, und das Geld
   * waere zweimal verteilt.
   */
  const b = best({ id: 'p', ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02' })
  const entwurf = { auftraege: [{ bestellungId: 'p' }], posten: [] }
  assert.equal(offeneEinnahmen([b], [entwurf]).length, 0)
})

pruefe('Was nicht fest ist, laesst sich auch bezahlt nicht abrechnen', () => {
  // Eine Anzahlung auf eine Offerte ist kein Erloes.
  const b = best({ status: 'offerte', bezahltAm: '2026-03-02' })
  assert.equal(offeneEinnahmen([b], []).length, 0)
})

/* --- Abgerechnet wird pro Auftrag ------------------------------------------ */

pruefe('Mit dem Auftrag gehen seine Kosten mit, ungefragt', () => {
  /*
   * DIE REGEL, DIE DEN DOPPELFALL VERSCHWINDEN LAESST. Vorher liessen sich
   * Erloes und Kosten eines Auftrags trennen, und das ging zweimal schief:
   * Wer den Erloes verteilt und die Montage offen laesst, zahlt sie ueber
   * den Topf aus - und wenn er den Posten spaeter noch einmal abrechnet, ein
   * zweites Mal. Der Auftrag ist die Einheit, in der das Geschaeft
   * stattfindet; also ist er die Einheit, in der abgerechnet wird.
   */
  const b = best({ id: 'b1', status: 'ausliefern', ausgeliefertAm: '2026-03-01',
    bezahltAm: '2026-03-02', montageChf: 30 })
  const einnahmen = offeneEinnahmen([b], [])
  const schulden = offeneSchulden([b], [])

  /* Nur den Auftrag angekreuzt, keinen einzigen Posten. */
  const e = abrechnungEntwurf(einnahmen, schulden, ['b1'], [])
  assert.equal(e.auftraege.length, 1)
  assert.ok(e.posten.length >= 3, 'Netze, Kargo und zweimal Montage gehen mit')
  assert.ok(e.posten.some((p) => p.art === 'montage'))
  assert.ok(e.posten.some((p) => p.art === 'herstellung'))

  /* Und die Probe: Was hereinkam, geht vollstaendig hinaus. */
  const z = abrechnungZahlen(e.auftraege, e.posten)
  const hinaus = runde(z.summe.bora + z.summe.ufuk + z.summe.deniz)
  assert.equal(hinaus, z.erloesChf, `${hinaus} statt ${z.erloesChf}`)
})

pruefe('Was zu keinem gewaehlten Auftrag gehoert, bleibt draussen', () => {
  const dabei = best({ id: 'b1', status: 'ausliefern', ausgeliefertAm: '2026-03-01',
    bezahltAm: '2026-03-02', montageChf: 30 })
  const daneben = best({ id: 'b2', status: 'ausliefern', ausgeliefertAm: '2026-03-01', montageChf: 30 })
  const e = abrechnungEntwurf(
    offeneEinnahmen([dabei, daneben], []),
    offeneSchulden([dabei, daneben], []),
    ['b1'], [],
  )
  assert.ok(e.posten.every((p) => p.bestellungId === 'b1'), 'nur die des gewaehlten Auftrags')
})

pruefe('Auslagen ohne Auftrag lassen sich weiter einzeln waehlen', () => {
  /*
   * Werbung, Hosting, Material gehoeren zu keinem Auftrag - sie haetten
   * sonst keinen Weg in eine Abrechnung.
   */
  const b = best({ id: 'b1', status: 'ausliefern', ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02' })
  const l = auslage({ id: 'al1', betragChf: 40, traeger: 'deniz' })
  const schulden = offeneSchulden([b], [l])
  const e = abrechnungEntwurf(offeneEinnahmen([b], []), schulden, [], ['al1:al1'])
  assert.equal(e.auftraege.length, 0)
  assert.deepEqual(e.posten.map((p) => p.auslageId), ['al1'])
})

pruefe('Ein einzeln gewaehlter Posten kommt nicht doppelt mit', () => {
  const b = best({ id: 'b1', status: 'ausliefern', ausgeliefertAm: '2026-03-01',
    bezahltAm: '2026-03-02', montageChf: 30 })
  const schulden = offeneSchulden([b], [])
  const alle = schulden.flatMap((s) => s.posten).map((p) => postenSchluessel(p))
  const e = abrechnungEntwurf(offeneEinnahmen([b], []), schulden, ['b1'], alle)
  const kennungen = e.posten.map((p) => postenSchluessel(p))
  assert.equal(new Set(kennungen).size, kennungen.length, 'jede Kennung genau einmal')
})

pruefe('Die Kostensumme eines Auftrags laesst sich einzeln lesen', () => {
  /* Fuer die Spalte "Kosten" neben dem Erloes. */
  const b = best({ id: 'b1', status: 'ausliefern', ausgeliefertAm: '2026-03-01',
    bezahltAm: '2026-03-02', montageChf: 30 })
  const schulden = offeneSchulden([b], [auslage({ id: 'al1', betragChf: 40 })])
  const summe = postenSummeFuer(schulden, 'b1')
  assert.equal(summe, zahlenFuer(b).kostenChf, 'alles, was am Auftrag offen ist')
  assert.ok(summe > 0)
})

pruefe('Die Nummer zaehlt je Jahr hoch', () => {
  const jahr = new Date('2026-05-05T00:00:00.000Z')
  assert.equal(naechsteAbrechnungsnummer([], jahr), 'A-2026-01')
  assert.equal(naechsteAbrechnungsnummer([{ nummer: 'A-2026-01' }], jahr), 'A-2026-02')
  assert.equal(naechsteAbrechnungsnummer([{ nummer: 'A-2025-07' }], jahr), 'A-2026-01', 'altes Jahr zaehlt nicht mit')
  assert.equal(
    naechsteAbrechnungsnummer([{ nummer: 'A-2026-03' }, { nummer: 'A-2026-01' }], jahr),
    'A-2026-04',
    'die hoechste gewinnt, nicht die letzte',
  )
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) process.exit(1)
