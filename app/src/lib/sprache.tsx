import { texteFuer, type AdminSprache, type AdminTexte } from '@pf/components/admin/sprache'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { tresor } from '@/lib/tresor'

/**
 * Die App auf Deutsch oder Tuerkisch – fuer Ufuk.
 *
 * NUR DIE BEDIENUNG. Was an die Kundschaft geht (Nachrichten A–I, Offerte,
 * Quittung), bleibt Deutsch, egal wie die App eingestellt ist; das Blatt an
 * Bora hat seine eigene Sprachwahl. Dieselbe Regel wie im Web-Admin
 * (BestellKarte.tsx): Die Sprache der Maske sagt etwas ueber den, der sie
 * bedient, nicht ueber den, der die Nachricht liest.
 *
 * Die Woerter kommen zuerst aus dem Web-Admin (src/components/admin/
 * sprache.ts) – dort hat Ufuk sie schon gelesen. Was nur die App braucht,
 * steht unten, ebenfalls als Paar [deutsch, tuerkisch], damit beim Aendern
 * sofort auffaellt, wenn die andere Sprache fehlt.
 */

type Paar = readonly [string, string]

const APP = {
  /* --- Allgemein -------------------------------------------------------- */
  bearbeiten: ['Bearbeiten', 'Düzenle'],
  schliessen: ['Schliessen', 'Kapat'],
  nichtGespeichert: ['Nicht gespeichert', 'Kaydedilmedi'],
  keineApp: ['Dafür ist keine App installiert.', 'Bunun için yüklü bir uygulama yok.'],
  nochmalsVersuchen: ['Nochmals versuchen', 'Tekrar dene'],
  heute: ['heute', 'bugün'],
  heuteGross: ['Heute', 'Bugün'],
  morgen: ['Morgen', 'Yarın'],
  seitTagenKurz: ['seit {n} T', '{n} gündür'],
  netzeAnzahl: ['{n} Netze', '{n} sineklik'],
  preisOffen: ['Preis offen', 'Fiyat açık'],
  offen: ['offen', 'açık'],
  preisFrage: ['Preis?', 'Fiyat?'],
  zurueckZuAuftrag: ['Abbrechen, zurück zum Auftrag', 'Vazgeç, siparişe dön'],
  zurueckZuAuftraegen: ['Zurück zu den Aufträgen', 'Siparişlere dön'],

  /* --- Anmeldung ------------------------------------------------------- */
  anmeldeSatz: ['Aufträge und Zahlen von Pfistanbul Fenster.', 'Pfistanbul Fenster siparişleri ve rakamları.'],

  /* --- Liste ----------------------------------------------------------- */
  auftraege: ['Aufträge', 'Siparişler'],
  alle: ['Alle', 'Tümü'],
  baldFaellig: ['Bald fällig · {n} Tage', 'Yakında · {n} gün'],
  alleAktiven: ['Alle aktiven Aufträge', 'Tüm aktif siparişler'],
  keineAktiven: ['Keine aktiven Aufträge.', 'Aktif sipariş yok.'],
  nichtsIn: ['Nichts in «{phase}».', '«{phase}» içinde bir şey yok.'],
  aufgabeNachfassen: ['Nachfassen: {name}', 'Hatırlat: {name}'],
  aufgabeNeu: ['Neu: {name}', 'Yeni: {name}'],
  aufgabeNeuText: ['Eingang bestätigen, Ausmessen planen', 'Alındığını bildir, ölçü randevusu planla'],
  aufgabeAusmessen: ['Ausmessen: {name}', 'Ölçü: {name}'],
  aufgabeMontage: ['Montage: {name}', 'Montaj: {name}'],
  offerteRausVor: ['Offerte raus vor {n} {tage}', 'Teklif {n} {tage} önce gönderildi'],
  nachgefasstVor: ['nachgefasst vor {n} {tage}', '{n} {tage} önce hatırlatıldı'],
  tag: ['Tag', 'gün'],
  tage: ['Tagen', 'gün'],

  /* --- Auftrag --------------------------------------------------------- */
  auftrag: ['Auftrag', 'Sipariş'],
  auftragWeg: ['Diesen Auftrag gibt es nicht mehr.', 'Bu sipariş artık yok.'],
  phase: ['Phase', 'Aşama'],
  antippenUmstellen: ['Antippen zum Umstellen', 'Değiştirmek için dokun'],
  phaseUmstellen: ['Phase umstellen', 'Aşamayı değiştir'],
  aufPhaseSetzen: ['Auf «{phase}» setzen?', '«{phase}» olarak ayarlansın mı?'],
  umstellen: ['Umstellen', 'Değiştir'],
  abgesagt: ['Abgesagt', 'İptal edildi'],
  welche: ['welche?', 'hangileri?'],
  zeigtWasFehlt: ['Zeigt, was fehlt', 'Neyin eksik olduğunu gösterir'],
  fehltNoch: ['Für den Bestellschein fehlt noch', 'Sipariş fişi için hâlâ eksik'],
  fehltNochSatz: ['Für den Bestellschein fehlt noch:', 'Sipariş fişi için hâlâ eksik:'],
  keineNetzeErfasst: ['Es sind noch keine Netze erfasst.', 'Henüz sineklik girilmedi.'],
  erstAngebot: ['Erst das Angebot festlegen – davor stehen nur Vorschläge drin.', 'Önce teklifi belirle – öncesinde sadece öneriler var.'],
  paketBestellt: ['Alle {n} Aufträge im Paket «{paket}» als bestellt markieren?', '«{paket}» paketindeki {n} siparişin hepsi sipariş edildi olarak işaretlensin mi?'],
  alleBestellt: ['Alle {n} Aufträge als bei Bora bestellt markieren?', '{n} siparişin hepsi Bora’ya sipariş edildi olarak işaretlensin mi?'],
  alsBestellt: ['Als bei Bora bestellt markieren?', 'Bora’ya sipariş edildi olarak işaretlensin mi?'],
  jaBestellt: ['Ja, bestellt', 'Evet, sipariş edildi'],
  anrufen: ['Anrufen', 'Ara'],
  mail: ['Mail', 'E-posta'],
  karte: ['Karte', 'Harita'],
  keineTelefonnummer: ['Keine Telefonnummer hinterlegt.', 'Telefon numarası yok.'],
  keineHandynummer: ['Keine Handynummer hinterlegt.', 'Cep numarası yok.'],
  keineMailadresse: ['Keine Mailadresse hinterlegt.', 'E-posta adresi yok.'],
  keineAdresse: ['Keine Adresse hinterlegt.', 'Adres yok.'],
  kontakt: ['Kontakt', 'İletişim'],
  kontaktAendern: ['Kontakt bearbeiten', 'İletişimi düzenle'],
  ohneTelefon: ['— keine Telefonnummer —', '— telefon numarası yok —'],
  ohneMail: ['— keine Mail —', '— e-posta yok —'],
  ohneAdresse: ['— keine Adresse —', '— adres yok —'],
  termine: ['Termine', 'Randevular'],
  ausmessen: ['Ausmessen', 'Ölçü alma'],
  montage: ['Montage', 'Montaj'],
  eintragen: ['Eintragen', 'Ekle'],
  datumWaehlen: ['{art}: Datum wählen', '{art}: tarih seç'],
  nurAndroid: ['Termine eintragen geht vorerst nur auf Android.', 'Randevu eklemek şimdilik sadece Android’de mümkün.'],
  terminEntfernen: ['Termin entfernen?', 'Randevu silinsin mi?'],
  entfernen: ['Entfernen', 'Sil'],
  langeDruecken: ['Lange drücken zum Entfernen', 'Silmek için uzun bas'],
  netzePreise: ['Netze & Preise', 'Sineklikler ve fiyatlar'],
  total: ['Total', 'Toplam'],
  kostenMarge: ['Kosten & Marge', 'Maliyet ve kâr'],
  kostenMargeSatz: ['intern · Einkauf, Lieferung, weitere Kosten', 'dahili · alış, nakliye, diğer masraflar'],
  notiz: ['Notiz', 'Not'],
  notizBearbeiten: ['Notiz bearbeiten', 'Notu düzenle'],
  notizNurFuerUns: ['Nur für uns, nicht für die Kundschaft', 'Sadece bizim için, müşteri görmez'],
  keineNotiz: ['Noch keine Notiz.', 'Henüz not yok.'],
  kundschaft: ['Kundschaft: {text}', 'Müşteri: {text}'],
  absagenSatz: ['Warum wird nichts daraus? Der Auftrag kommt ins Archiv und lässt sich wieder öffnen.', 'Neden olmuyor? Sipariş arşive gider ve tekrar açılabilir.'],

  /* --- Nachricht ------------------------------------------------------- */
  nachricht: ['Nachricht', 'Mesaj'],
  nachrichtAnKundschaft: ['Nachricht an die Kundschaft', 'Müşteriye mesaj'],
  vorlageSenden: ['{titel} senden', '{titel} gönder'],
  andereVorlage: ['Andere Vorlage', 'Başka şablon'],
  nachrichtSchreiben: ['Nachricht schreiben', 'Mesaj yaz'],
  keineVorlage: ['In dieser Phase gibt es keine Vorlage.', 'Bu aşamada şablon yok.'],
  vorlage: ['Vorlage', 'Şablon'],
  wasSollRaus: ['Was soll raus?', 'Ne gönderilecek?'],
  text: ['Text', 'Metin'],
  betreffNurMail: ['Betreff (nur Mail)', 'Konu (sadece e-posta)'],
  textAendern: ['Der Text lässt sich hier und in WhatsApp noch ändern. Er geht auf Deutsch an die Kundschaft.', 'Metin burada ve WhatsApp’ta değiştirilebilir. Müşteriye Almanca gider.'],
  inWhatsappOeffnen: ['In WhatsApp öffnen', 'WhatsApp’ta aç'],
  perMailOeffnen: ['Per Mail öffnen', 'E-posta ile aç'],
  stattdessenMail: ['Stattdessen per Mail öffnen', 'Bunun yerine e-posta ile aç'],
  gesendetWhatsapp: ['Gesendet in WhatsApp?', 'WhatsApp’ta gönderildi mi?'],
  gesendetMail: ['Gesendet per Mail?', 'E-posta ile gönderildi mi?'],
  jaGesendet: ['Ja, gesendet', 'Evet, gönderildi'],
  nochNicht: ['Noch nicht', 'Henüz değil'],
  nichtGeoeffnet: ['Nicht geöffnet', 'Açılmadı'],
  linkFehlt: ['Link fehlt', 'Link eksik'],
  linkWirdGeholt: ['Der Link zur Offerte wird noch geholt.', 'Teklif linki hâlâ alınıyor.'],
  linkNichtErhalten: ['Link nicht erhalten: {fehler}', 'Link alınamadı: {fehler}'],
  ansehen: ['Ansehen', 'Görüntüle'],
  wechseltZu: ['Der Auftrag wechselt zu «{phase}».', 'Sipariş «{phase}» aşamasına geçer.'],
  nachfassenWieder: ['In {n} Tagen erinnert die App wieder, falls bis dahin keine Antwort kommt.', 'O zamana kadar cevap gelmezse uygulama {n} gün sonra tekrar hatırlatır.'],
  fristNeu: ['Die Frist fürs Nachfassen beginnt neu.', 'Hatırlatma süresi yeniden başlar.'],
  sperrePreise: ['Erst das Angebot festlegen.', 'Önce teklifi belirle.'],
  sperreQuittung: ['Erst Übergabe und Zahlung eintragen – dann gibt es die Quittung.', 'Önce teslim ve ödemeyi gir – sonra makbuz olur.'],
  vorlageA: ['Eingang bestätigen', 'Alındığını bildir'],
  vorlageB: ['Offerte senden', 'Teklif gönder'],
  vorlageC: ['Nachfassen', 'Hatırlat'],
  vorlageD: ['Angepasste Offerte', 'Güncellenmiş teklif'],
  vorlageE: ['Beim Lieferanten bestellt', 'Üreticiye sipariş verildi'],
  vorlageF: ['Netze unterwegs', 'Sineklikler yolda'],
  vorlageG: ['Netze eingetroffen', 'Sineklikler geldi'],
  vorlageH: ['Montagetermin', 'Montaj randevusu'],
  vorlageI: ['Abschluss & Bewertung', 'Kapanış ve değerlendirme'],

  /* --- Blatt an Bora --------------------------------------------------- */
  blattAnfrage: ['Preisanfrage an Bora', 'Bora’ya fiyat talebi'],
  blattBestellung: ['Bestelltalon an Bora', 'Bora’ya sipariş fişi'],
  pdfNichtErstellt: ['PDF nicht erstellt', 'PDF oluşturulamadı'],
  anBoraGesendet: ['An Bora gesendet?', 'Bora’ya gönderildi mi?'],
  paketAuftraege: ['Paket {nummer} · {n} Aufträge', 'Paket {nummer} · {n} sipariş'],
  pdfTeilen: ['PDF teilen ({n} {netze})', 'PDF paylaş ({n} {netze})'],
  netze: ['Netze', 'sineklik'],
  angabenFehlen: ['Angaben fehlen', 'Bilgiler eksik'],
  blattNichtRaus: ['So kann das Blatt nicht raus', 'Belge bu haliyle gönderilemez'],
  blattNichtRausSatz: ['Es fehlen Angaben – eine Lieferung aus der Türkei, die nicht passt, kostet Wochen:', 'Bilgiler eksik – Türkiye’den uymayan bir teslimat haftalar kaybettirir:'],
  blatt: ['Blatt', 'Belge'],
  blattSprache: ['Sprache des Blatts', 'Belgenin dili'],
  deutschPruefen: ['Deutsch (nur prüfen)', 'Almanca (sadece kontrol)'],
  blattAnfrageSatz: ['Mit leerer Preisspalte – Bora trägt den Stückpreis je Zeile ein.', 'Boş fiyat sütunuyla – Bora her satıra birim fiyatı yazar.'],
  blattBestellungSatz: ['Verbindlicher Auftrag, ohne Preise. Jede Zeile ist ein Stück und trägt die Bündelkennung.', 'Kesin sipariş, fiyatsız. Her satır bir adettir ve paket kodunu taşır.'],
  notizGehtMit: [' Die Notiz des Auftrags geht als Bemerkung mit.', ' Siparişin notu açıklama olarak gider.'],
  vorschauDrucken: ['Vorschau / drucken', 'Önizleme / yazdır'],
  beispielTermin: ['z. B. Ende November', 'örn. Kasım sonu'],

  /* --- Netze, Angebot, Kosten ------------------------------------------ */
  netzEntfernenLabel: ['Netz {n} entfernen', '{n}. sinekliği sil'],
  netzfarbe: ['Netzfarbe', 'Tül rengi'],
  rahmenfarbe: ['Rahmenfarbe', 'Çerçeve rengi'],
  alt: ['alt', 'eski'],
  masseFehlen: ['Masse fehlen – kein Preis', 'Ölçüler eksik – fiyat yok'],
  montageEinsetzen: ['{n} Netze × {preis} einsetzen', '{n} sineklik × {preis} uygula'],
  verkaufspreise: ['Verkaufspreise', 'Satış fiyatları'],
  kostenIntern: ['Kosten (intern)', 'Maliyetler (dahili)'],
  postenEntfernen: ['Posten entfernen', 'Kalemi sil'],

  /* --- Zahlen ---------------------------------------------------------- */
  zOffenTitel: ['Offen', 'Açık'],
  zAuswertung: ['Auswertung', 'Değerlendirme'],
  zJahre: ['Jahre', 'Yıllar'],
  zAnzahlAuftraege: ['{n} Aufträge', '{n} sipariş'],
  zAnzahlPosten: ['{n} Posten', '{n} kalem'],
  zAnzahlSendungen: ['{n} Sendungen', '{n} sevkiyat'],
  zKostenUnter: ['Ware {ware} · Betrieb {betrieb}', 'Mal {ware} · İşletme {betrieb}'],
  zErloesUnter: ['cashed {cashed} · debit {debit} · in Arbeit {arbeit}', 'tahsil {cashed} · alacak {debit} · işlemde {arbeit}'],
  zRentabilitaetUnter: ['Rentabilität {r} · real {real}', 'Kârlılık {r} · gerçek {real}'],
  zBezahltMarkieren: ['Als bezahlt markieren', 'Ödendi olarak işaretle'],
  zBezahltFrageSatz: ['{kunde}: {betrag} eingegangen?', '{kunde}: {betrag} tahsil edildi mi?'],
  zJaEingegangen: ['Ja, eingegangen', 'Evet, tahsil edildi'],
  zGeliefertAm: ['geliefert · seit {datum}', 'teslim edildi · {datum} tarihinden beri'],
  zNichtGeliefert: ['noch nicht geliefert · seit {datum}', 'henüz teslim edilmedi · {datum} tarihinden beri'],
  zAuftragUnter: ['{ref} · Erlös {erloes} · Kosten {kosten}', '{ref} · Gelir {erloes} · Maliyet {kosten}'],
  zSendungUnter: ['{a} Aufträge · {n} Netze · Erlös {erloes} · Kosten {kosten}', '{a} sipariş · {n} sineklik · Gelir {erloes} · Maliyet {kosten}'],
  zJeNetzUnter: ['{betrag} je Netz', 'sineklik başına {betrag}'],
  zForecastUnter: ['{a} Anfragen · {n} Netze · Erlös {erloes} · Kosten {kosten}', '{a} talep · {n} sineklik · Gelir {erloes} · Maliyet {kosten}'],
  zJahrUnter: ['{a} Aufträge · {n} Netze', '{a} sipariş · {n} sineklik'],
  zForderungenSatz: ['Feste Aufträge, deren Geld noch nicht da ist – geliefert oder noch in Arbeit. Antippen, wenn das Geld eingegangen ist.', 'Parası henüz gelmemiş kesin siparişler – teslim edilmiş ya da hâlâ işlemde. Para geldiğinde dokun.'],
  zMargeTippen: ['Antippen öffnet die Kosten des Auftrags.', 'Dokunmak siparişin maliyetlerini açar.'],

  zAusgabeErfassen: ['Ausgabe erfassen', 'Gider ekle'],
  zAusgabeNeu: ['Neue Ausgabe', 'Yeni gider'],
  zAusgabeBearbeiten: ['Ausgabe bearbeiten', 'Gideri düzenle'],
  zAusgabeLoeschen: ['Ausgabe löschen', 'Gideri sil'],
  zAusgabeLoeschenFrage: ['«{text}» ({betrag}) löschen?', '«{text}» ({betrag}) silinsin mi?'],
  zAusgabeAbgerechnet: ['Steht in einer abgeschlossenen Abrechnung – nicht mehr änderbar.', 'Tamamlanmış bir hesaplaşmada – artık değiştirilemez.'],
  zAusgabeFehlt: ['Betrag und «Wofür?» ausfüllen.', 'Tutarı ve «Ne için?» alanını doldur.'],
  zAusgabeBeispiel: ['z. B. Klebeband, Benzin, Inserat', 'örn. bant, benzin, ilan'],
  zAlleAusgaben: ['Alle Ausgaben ({n})', 'Tüm giderler ({n})'],
  zKeineAusgaben: ['Noch keine Ausgaben erfasst.', 'Henüz gider yok.'],
  zAusgabeUnter: ['{datum} · {kategorie} · {wer}', '{datum} · {kategorie} · {wer}'],
  zKostenErfassen: ['Kosten erfassen', 'Maliyet gir'],
  zKostenErfassenSatz: ['Boras Kosten noch geschätzt – antippen und die echten Beträge eintragen.', 'Bora maliyetleri hâlâ tahmini – dokun ve gerçek tutarları gir.'],
  zAlleKosten: ['Kosten aller Aufträge ({n})', 'Tüm siparişlerin maliyeti ({n})'],
  zAllesErfasst: ['Alle Kosten erfasst – nichts mehr geschätzt.', 'Tüm maliyetler girildi – tahmini kalmadı.'],
  zKostenGeschaetztUnter: ['{ref} · Kosten {kosten} (geschätzt)', '{ref} · Maliyet {kosten} (tahmini)'],
  zAbrechnenBereit: ['{a} bezahlte Aufträge · {p} weitere Posten', '{a} ödenmiş sipariş · {p} diğer kalem'],
  zNichtsAbzurechnen: ['Nichts abzurechnen – kein bezahlter Auftrag offen.', 'Hesaplaşılacak bir şey yok – açık ödenmiş sipariş yok.'],
  zEntwurfWartet: ['Entwurf {nummer} – abschliessen oder verwerfen', '{nummer} taslağı – kapat veya sil'],
  zAbrechnungErstellen: ['Abrechnung erstellen', 'Hesaplaşma oluştur'],
  zAuswahlUnter: ['{a} · {p}', '{a} · {p}'],
  zNichtsGewaehlt: ['Aufträge oder Posten auswählen', 'Sipariş veya kalem seç'],
  zAbschliessenFrage: ['Abrechnung {nummer} abschliessen? Alle Posten darin gelten danach als bezahlt.', '{nummer} hesaplaşması kapatılsın mı? İçindeki tüm kalemler ödenmiş sayılır.'],
  zAbschliessen: ['Abschliessen', 'Kapat'],
  zVerwerfenFrage: ['Entwurf {nummer} verwerfen?', '{nummer} taslağı silinsin mi?'],
  zVerwerfen: ['Verwerfen', 'Sil'],
  zAuszahlen: ['Auszahlen', 'Ödenecek'],
  zAuszahlenUnter: ['Rückzahlung {r} · Anteil {a}', 'Geri ödeme {r} · Pay {a}'],
  zDarin: ['Darin', 'İçinde'],
  zRechnung: ['Rechnung', 'Hesap'],
  zMitKosten: ['mit {kosten} Kosten · bleibt {bleibt}', '{kosten} maliyetle · kalan {bleibt}'],
  zAuswertungen: ['Auswertungen', 'Değerlendirmeler'],
  zAuswertungenUnter: ['Kennzahlen, pro Auftrag, Sendung, Jahre, Funnel', 'Göstergeler, sipariş, sevkiyat, yıllar, funnel'],
  zErgebnisKurz: ['Ergebnis', 'Sonuç'],
  zKennzahlen: ['Kennzahlen', 'Göstergeler'],
  zFruehereAnzahl: ['Frühere Abrechnungen ({n})', 'Önceki hesaplaşmalar ({n})'],
  zHistorieUnter: ['{datum} · {a} Aufträge · {p} Posten', '{datum} · {a} sipariş · {p} kalem'],

  /* --- Einstellungen ---------------------------------------------------- */
  spracheWechseln: ['Sprache: Deutsch', 'Dil: Türkçe'],
} as const satisfies Record<string, Paar>

export type Texte = AdminTexte & { [K in keyof typeof APP]: string }

function texte(sprache: AdminSprache): Texte {
  const i = sprache === 'tuerkisch' ? 1 : 0
  const app = Object.fromEntries(Object.entries(APP).map(([k, paar]) => [k, paar[i]])) as { [K in keyof typeof APP]: string }
  return { ...texteFuer(sprache), ...app }
}

/**
 * Die Pflichtangaben fuer Bora heissen in src/lib/bestellauftrag.ts deutsch
 * (sie stehen auch so im Web-Admin). Fuer die tuerkische Maske hier
 * uebersetzt – sonst stuende mitten im Tuerkischen "Öffnungsrichtung".
 */
const ANGABEN: Record<string, string> = {
  Breite: 'Genişlik',
  Höhe: 'Yükseklik',
  Rahmendicke: 'Çerçeve kalınlığı',
  Rahmenfarbe: 'Çerçeve rengi',
  Netzfarbe: 'Tül rengi',
  Mechanismus: 'Mekanizma',
  Öffnungsrichtung: 'Açılış yönü',
}

interface SprachWert {
  sprache: AdminSprache
  t: Texte
  /** Fuer Datum und Uhrzeit. Betraege bleiben in Schweizer Schreibweise (formatChf). */
  datumsform: 'de-CH' | 'tr-TR'
  setSprache: (s: AdminSprache) => void
  /** Eine fehlende Angabe ("Breite") in der Sprache der Maske. */
  angabe: (name: string) => string
}

const SPEICHER = 'pf-admin-sprache'
const Kontext = createContext<SprachWert | null>(null)

export function SpracheProvider({ children }: { children: ReactNode }) {
  const [sprache, setzen] = useState<AdminSprache>('deutsch')

  useEffect(() => {
    tresor
      .lesen(SPEICHER)
      .then((s) => {
        if (s === 'tuerkisch' || s === 'deutsch') setzen(s)
      })
      .catch(() => {})
  }, [])

  const setSprache = useCallback((s: AdminSprache) => {
    setzen(s)
    void tresor.schreiben(SPEICHER, s).catch(() => {})
  }, [])

  const wert = useMemo<SprachWert>(
    () => ({
      sprache,
      t: texte(sprache),
      datumsform: sprache === 'tuerkisch' ? 'tr-TR' : 'de-CH',
      setSprache,
      angabe: (name) => (sprache === 'tuerkisch' ? (ANGABEN[name] ?? name) : name),
    }),
    [sprache, setSprache],
  )
  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>
}

export function useSprache(): SprachWert {
  const k = useContext(Kontext)
  if (!k) throw new Error('useSprache ausserhalb von SpracheProvider')
  return k
}

/** Platzhalter {name} fuellen – wie fuelle() im Web-Admin. */
export { fuelle } from '@pf/components/admin/sprache'

/** Umschalter fuer den Kopf von Liste und Anmeldung. */
export const SPRACHEN: { wert: AdminSprache; kurz: string }[] = [
  { wert: 'deutsch', kurz: 'DE' },
  { wert: 'tuerkisch', kurz: 'TR' },
]
