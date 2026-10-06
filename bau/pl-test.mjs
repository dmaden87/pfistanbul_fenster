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
  offeneForderungen, offeneSchulden, aufteilung,
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
  assert.equal(aufteilung([b], []).einkassiertChf, 0)
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

pruefe('Lieferkosten werden NIE geschaetzt', () => {
  const z = zahlenFuer(best({ positionen: [netz(128, 96, 150)] }))
  assert.equal(z.lieferungChf, 0, 'lieber eine Null als eine erfundene Fracht')
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
  assert.equal(z.kostenChf, 42.43)
  assert.equal(z.margeChf, 172.57)
  assert.equal(z.margeProzent, 80.3)
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
  assert.equal(a.kostenChf, 30 + 0 + 2.43, 'Herstellung plus gerechnete Einfuhrsteuer')
  assert.equal(a.betriebskostenChf, 40)
  assert.equal(a.ergebnisChf, 150 - 32.43 - 40)
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

pruefe('die drei Teile der Kosten ergeben zusammen den Gesamtbetrag', () => {
  /*
   * DAS IST DIE EIGENTLICHE ZUSAGE DIESER KACHEL. Ohne den dritten Teil
   * ("ohne Beleg") blieb eine Differenz stehen, die aussieht wie ein
   * Rechenfehler - dabei ist es die Schaetzung aus der Formel.
   */
  const erfasst = best({ id: 'e', status: 'ausliefern', ausgeliefertAm: '2026-03-01',
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 30, traeger: 'bora', bezahlt: true, erfasstAm: 'x' },
             { id: 'k2', art: 'mwst', betragChf: 2.43, traeger: 'bora', erfasstAm: 'x' }] })
  /* Dieser hat gar keine Posten – seine Kosten kommen aus der Formel. */
  const gerechnet = best({ id: 'g', status: 'bora', zusageAm: '2026-03-01' })
  const k = kennzahlen([erfasst, gerechnet], [auslage({ betragChf: 20 }), auslage({ id: 'a2', betragChf: 15, bezahlt: true })])

  assert.equal(runde(k.bezahltKostenChf + k.creditChf + k.ohneBelegChf), k.kostenChf,
    `${k.bezahltKostenChf} + ${k.creditChf} + ${k.ohneBelegChf} ist nicht ${k.kostenChf}`)
  assert.ok(k.ohneBelegChf > 0, 'der gerechnete Auftrag hat keinen Beleg')
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

/* --- Offene Posten --------------------------------------------------------- */

pruefe('wer uns was schuldet: geliefert und nicht bezahlt', () => {
  const liste = offeneForderungen([geliefert, zugesagt])
  assert.equal(liste.length, 1, 'Zugesagtes schuldet noch niemand')
  assert.equal(liste[0].bestellungId, 'g')
  assert.equal(liste[0].betragChf, 150)
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
  assert.equal(liste[0].betragChf, 80)
  assert.equal(liste[1].traeger, 'deniz')
  assert.equal(liste[1].betragChf, 47)
  assert.equal(liste[1].posten.length, 2)
})

pruefe('bezahlte Posten schulden wir nicht mehr', () => {
  const b = best({ kosten: [{ id: 'k1', art: 'herstellung', betragChf: 60, traeger: 'bora', bezahlt: true, erfasstAm: 'x' }] })
  assert.equal(offeneSchulden([b], []).length, 0)
})

pruefe('Kosten einer Bestellung vor der Zusage schulden wir noch nicht', () => {
  const b = best({ status: 'klaerung', kosten: [{ id: 'k1', art: 'herstellung', betragChf: 60, traeger: 'bora', erfasstAm: 'x' }] })
  assert.equal(offeneSchulden([b], []).length, 0)
})

/* --- Abrechnung ------------------------------------------------------------ */

pruefe('verteilt wird nur, was einkassiert ist', () => {
  const offen = best({ id: 'o', ausgeliefertAm: '2026-03-01' })
  const bezahlt = best({ id: 'p', ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02' })
  const a = aufteilung([offen, bezahlt], [])
  assert.equal(a.einkassiertChf, 150, 'die offene Bestellung bleibt draussen')
})

pruefe('zwei Toepfe: Bora an der Ware, die Montage unter Ufuk und Deniz', () => {
  const b = best({
    ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02',
    positionen: [netz(100, 100, 200)], montageChf: 100,
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 100, traeger: 'bora', bezahlt: true, erfasstAm: 'x' },
             { id: 'k2', art: 'mwst', betragChf: 0, traeger: 'bora', bezahlt: true, erfasstAm: 'x' }],
  })
  const a = aufteilung([b], [])
  assert.equal(a.warengewinnChf, 100, '200 Warenerloes minus 100 Kosten')
  assert.equal(a.montagegewinnChf, 100)
  assert.equal(a.anteile.bora, 20, '20 Prozent von 100, nichts von der Montage')
  assert.equal(a.anteile.ufuk, 40 + 50)
  assert.equal(a.anteile.deniz, 40 + 50)
  assert.equal(a.anteile.bora + a.anteile.ufuk + a.anteile.deniz, a.verteilbarChf)
})

pruefe('offene Auslagen gehen vor der Verteilung zurueck', () => {
  const b = best({ ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02' })
  const a = aufteilung([b], [auslage({ betragChf: 40, traeger: 'deniz' })])
  assert.equal(a.rueckzahlungChf, 40)
})

pruefe('die Anfahrt gehoert zur Arbeit, nicht zur Ware', () => {
  const b = best({
    ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02', anfahrtChf: 20,
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 0, traeger: 'bora', erfasstAm: 'x' },
             { id: 'k2', art: 'mwst', betragChf: 0, traeger: 'bora', erfasstAm: 'x' }],
  })
  const a = aufteilung([b], [])
  assert.equal(a.montagegewinnChf, 20)
  assert.equal(a.anteile.bora, 150 * 0.2, 'Bora bekommt nichts von der Anfahrt')
})

pruefe('ein Topf im Minus wird nicht verteilt', () => {
  /*
   * Ohne diese Regel stand in der Anzeige "Bora -10.02" - das sieht aus,
   * als schuldete Bora uns Geld. In Wahrheit ist nur noch nichts zu
   * verteilen. Der Topf bleibt negativ, die Anteile nicht.
   */
  const b = best({ ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02' })
  const a = aufteilung([b], [auslage({ betragChf: 900, traeger: 'deniz' })])
  assert.ok(a.warengewinnChf < 0, 'der Topf zeigt die Lage')
  assert.equal(a.anteile.bora, 0)
  assert.equal(a.anteile.ufuk, 0)
  assert.equal(a.anteile.deniz, 0)
  assert.equal(a.verteilbarChf, 0)
})

pruefe('die Abrechnung weist Erloese und Kosten einzeln aus', () => {
  const b = best({
    ausgeliefertAm: '2026-03-01', bezahltAm: '2026-03-02', montageChf: 30, anfahrtChf: 20,
    kosten: [{ id: 'k', art: 'herstellung', betragChf: 40, traeger: 'bora', erfasstAm: 'x' },
             { id: 'k2', art: 'mwst', betragChf: 3.24, traeger: 'bora', erfasstAm: 'x' }],
  })
  const a = aufteilung([b], [])
  assert.equal(a.warenerloesChf, 150)
  assert.equal(a.montageerloesChf, 50)
  assert.equal(a.warenkostenChf, 43.24)
  assert.equal(a.einkassiertChf, 200)
})

console.log(`\n${bestanden}/${bestanden + fehler.length} bestanden`)
if (fehler.length > 0) process.exit(1)
