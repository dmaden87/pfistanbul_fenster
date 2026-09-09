import { createContext, useContext } from 'react'

/**
 * Der Adminbereich auf Deutsch oder Türkisch.
 *
 * Grund: Ufuk arbeitet mit derselben Liste, und seine Sprache ist Türkisch.
 * Eine Verwaltungsmaske, die man nur zur Hälfte versteht, führt zu Fehlern,
 * die niemand bemerkt – gerade bei Massen und Öffnungsrichtungen.
 *
 * Beide Fassungen stehen unten NEBENEINANDER, ein Paar je Eintrag. Das ist
 * absichtlich: So sieht man beim Ändern sofort, ob die andere Sprache
 * nachgeführt ist, und Ufuk kann eine schiefe Übersetzung an genau einer
 * Stelle geraderücken.
 *
 * Nicht übersetzt werden Beträge: CHF bleibt in Schweizer Schreibweise
 * (1'234.50), weil die Zahlen mit Rechnungen und Belegen übereinstimmen
 * müssen. Datumsangaben folgen der gewählten Sprache.
 */

export type AdminSprache = 'deutsch' | 'tuerkisch'

/** [deutsch, türkisch] */
type Paar = readonly [string, string]

const PAARE = {
  /* --- Allgemein --------------------------------------------------------- */
  sprache: ['Sprache', 'Dil'],
  deutsch: ['Deutsch', 'Almanca'],
  tuerkisch: ['Türkisch', 'Türkçe'],
  laedt: ['Wird geladen …', 'Yükleniyor …'],
  aktualisieren: ['Aktualisieren', 'Yenile'],
  abmelden: ['Abmelden', 'Çıkış'],
  zurSeite: ['Zur Seite', 'Siteye'],
  zurueckZurListe: ['Zurück zur Liste', 'Listeye dön'],
  abbrechen: ['Abbrechen', 'Vazgeç'],
  ja: ['Ja', 'Evet'],
  nein: ['Nein', 'Hayır'],
  nichtsHier: ['Nichts hier.', 'Burada bir şey yok.'],
  wirdGespeichert: ['Wird gespeichert …', 'Kaydediliyor …'],

  /* --- Anmeldung --------------------------------------------------------- */
  adminbereich: ['Adminbereich', 'Yönetim'],
  passwort: ['Passwort', 'Şifre'],
  anmelden: ['Anmelden', 'Giriş'],
  wirdGeprueft: ['Wird geprüft …', 'Kontrol ediliyor …'],
  zurueckZurSeite: ['Zurück zur Seite', 'Siteye dön'],
  nochNichtEingerichtet: ['Der Bereich ist noch nicht fertig eingerichtet:', 'Bu bölüm henüz tam kurulmadı:'],
  speicherFehlt: ['Es fehlt der Speicher.', 'Veri deposu eksik.'],
  speicherFehltSatz: [
    'In Vercel unter Storage ein Upstash-Redis anlegen und mit diesem Projekt verbinden. Die Zugangsdaten setzt Vercel danach selbst.',
    'Vercel’de Storage altında bir Upstash-Redis oluşturup bu projeye bağlayın. Erişim bilgilerini Vercel kendisi ayarlar.',
  ],
  passwortFehlt: ['Es fehlt das Passwort.', 'Şifre eksik.'],
  passwortFehltSatz: [
    'In Vercel die Umgebungsvariable ADMIN_PASSWORT anlegen – mindestens acht Zeichen, ohne VITE_ davor, damit sie nicht im Browser landet.',
    'Vercel’de ADMIN_PASSWORT ortam değişkenini oluşturun – en az sekiz karakter, başında VITE_ olmadan, tarayıcıya düşmesin diye.',
  ],
  neuDeployen: ['Nach beidem einmal neu deployen.', 'İkisinden sonra bir kez yeniden deploy edin.'],

  /* --- Bestellliste ------------------------------------------------------ */
  bestellungen: ['Bestellungen', 'Siparişler'],
  bestellung: ['Bestellung', 'Sipariş'],
  bestellungErfassen: ['Bestellung erfassen', 'Sipariş gir'],
  erfassenSchliessen: ['Erfassen schliessen', 'Girişi kapat'],
  insgesamt: ['insgesamt', 'toplam'],
  davonNeu: ['davon', 'bunlardan'],
  neuKlein: ['neu', 'yeni'],
  inOfferte: ['in Offerte', 'teklifte'],

  /* --- Bloecke und Abschnitte der Arbeitsliste ---------------------------- */
  blockBeiDir: ['Bei dir', 'Sende'],
  blockBeiDirSatz: [
    'Hier ist etwas zu tun.',
    'Burada yapılacak bir şey var.',
  ],
  blockBeimLieferanten: ['Bei Bora', 'Bora’da'],
  blockBeimLieferantenSatz: [
    'Läuft. Wir warten auf den Lieferanten.',
    'Devam ediyor. Tedarikçiyi bekliyoruz.',
  ],
  blockBeimKunden: ['Beim Kunden', 'Müşteride'],
  blockBeimKundenSatz: [
    'Die Offerte ist draussen. Wir warten auf die Zusage.',
    'Teklif gönderildi. Onayı bekliyoruz.',
  ],
  blockArchiv: ['Archiv', 'Arşiv'],
  blockArchivSatz: [
    'Abgeschlossen oder abgesagt. Bleibt zum Nachschlagen stehen.',
    'Tamamlandı veya iptal edildi. Bakmak için burada kalır.',
  ],

  schrittNeuTitel: ['Neu – Preis anfragen', 'Yeni – fiyat sor'],
  schrittNeuSatz: [
    'Für die Lieferrunde ankreuzen und eine Preisanfrage an Bora auslösen.',
    'Sevkiyat turu için işaretleyin ve Bora’dan fiyat isteyin.',
  ],
  schrittOfferteRechnenTitel: ['Kosten da – Offerte rechnen', 'Maliyet geldi – teklifi hesapla'],
  schrittOfferteRechnenSatz: [
    'Boras Preise liegen vor. Offerte erstellen, verschicken und hier abhaken.',
    'Bora’nın fiyatları geldi. Teklifi hazırlayın, gönderin ve burada işaretleyin.',
  ],
  schrittBereitTitel: ['Bereit zum Bestellen', 'Sipariş için hazır'],
  schrittBereitSatz: [
    'Zugesagt. Für die nächste Bestellrunde ankreuzen.',
    'Onaylandı. Bir sonraki sipariş turu için işaretleyin.',
  ],
  schrittAusliefernTitel: ['Ware da – ausliefern', 'Mal geldi – teslim et'],
  schrittAusliefernSatz: [
    'Die Lieferung ist eingetroffen. Termin machen, übergeben, kassieren.',
    'Sevkiyat geldi. Randevu alın, teslim edin, tahsil edin.',
  ],
  schrittZahlungOffenTitel: ['Ausgeliefert – Zahlung offen', 'Teslim edildi – ödeme bekliyor'],
  schrittZahlungOffenSatz: [
    'Übergeben, aber noch nicht bezahlt.',
    'Teslim edildi ama henüz ödenmedi.',
  ],
  schrittAnfrageLaeuftTitel: ['Preisanfrage läuft', 'Fiyat talebi gönderildi'],
  schrittBeimLieferantenTitel: ['Bestellt, unterwegs', 'Sipariş verildi, yolda'],
  schrittOfferteDraussenTitel: ['Offerte draussen', 'Teklif dışarıda'],
  schrittAbgeschlossenTitel: ['Abgeschlossen', 'Tamamlandı'],
  schrittAbgesagtTitel: ['Abgesagt', 'İptal edildi'],

  inRunde: ['in Runde', 'turda'],
  zuTun: ['zu tun', 'yapılacak'],

  /* --- Art und Quelle ---------------------------------------------------- */
  artBestellung: ['Bestellung', 'Sipariş'],
  artAnfrage: ['Anfrage Sondermass', 'Özel ölçü talebi'],
  artZahlung: ['Anfrage Zahlung', 'Ödeme talebi'],
  quelleWeb: ['über die Seite', 'site üzerinden'],
  quelleWhatsapp: ['WhatsApp', 'WhatsApp'],
  quelleInstagram: ['Instagram', 'Instagram'],
  quelleTelefon: ['Telefon', 'Telefon'],
  quellePersoenlich: ['persönlich', 'yüz yüze'],

  /* --- Bestellkarte ------------------------------------------------------ */
  fuerDieLieferrunde: ['für die Lieferrunde', 'sevkiyat turu için'],
  netz: ['Netz', 'sineklik'],
  netzeMehrzahl: ['Netze', 'sineklik'],
  nochKeineNetze: ['noch keine Netze', 'henüz sineklik yok'],
  mitMontage: ['mit Montage', 'montaj dahil'],
  netzeAnzeigen: ['Netze und Angaben anzeigen', 'Sineklikleri ve bilgileri göster'],
  zuklappen: ['Zuklappen', 'Kapat'],
  keineEmail: ['keine E-Mail', 'e-posta yok'],
  eingang: ['Eingang', 'Geliş'],
  zuletztGeaendert: ['zuletzt geändert', 'son değişiklik'],
  ausgemessen: ['Ausgemessen', 'Ölçüldü'],
  offerteVersendet: ['Offerte versendet', 'Teklif gönderildi'],
  am: ['am', 'tarihinde'],
  ohneAntwortSeit: ['seit {n} Tagen ohne Antwort', '{n} gündür cevap yok'],
  keineNetzeErfasst: ['Noch keine Netze erfasst.', 'Henüz sineklik girilmedi.'],
  netzeBearbeiten: ['Netze bearbeiten', 'Sineklikleri düzenle'],
  offerteAnzeigen: ['Offerte anzeigen', 'Teklifi göster'],
  interneNotiz: ['Interne Notiz', 'İç not'],
  notizSpeichern: ['Notiz speichern', 'Notu kaydet'],
  datenLoeschen: ['Daten löschen', 'Verileri sil'],
  endgueltigLoeschen: ['Endgültig löschen?', 'Kalıcı olarak silinsin mi?'],
  jaDatenEntfernen: ['Ja, Daten entfernen', 'Evet, verileri sil'],
  abgesagtMarke: ['abgesagt', 'iptal'],
  erledigtMarke: ['erledigt', 'tamam'],
  bezahltMarke: ['bezahlt', 'ödendi'],

  /* --- Zahlung ----------------------------------------------------------- */
  zahltBeiUebergabe: ['zahlt bei Übergabe', 'teslimde ödüyor'],
  onlineBezahltAm: ['online bezahlt am', 'online ödendi'],
  onlineAbgebrochen: ['Onlinezahlung abgebrochen', 'Online ödeme iptal edildi'],
  onlineOffen: ['Onlinezahlung noch offen', 'Online ödeme henüz açık'],
  ratenwunsch: ['Ratenwunsch', 'Taksit isteği'],
  achtungBezahlt: [
    'Achtung: Bezahlt wurden {bezahlt}, die Bestellung steht jetzt auf {summe} – {richtung} {differenz}. Über Stripe nachbuchen oder zurückerstatten.',
    'Dikkat: {bezahlt} ödendi, sipariş şimdi {summe} – {richtung} {differenz}. Stripe üzerinden tamamlayın veya iade edin.',
  ],
  offenRichtung: ['offen', 'eksik'],
  zuVielRichtung: ['zu viel bezahlt', 'fazla ödendi'],

  /* --- Schritte ---------------------------------------------------------- */
  knopfOfferteAnzeigen: ['Offerte anzeigen', 'Teklifi göster'],
  knopfOfferteRaus: ['Offerte ist raus', 'Teklif gönderildi'],
  knopfKundeZugesagt: ['Kunde hat zugesagt', 'Müşteri onayladı'],
  knopfAbsagen: ['Absagen', 'İptal et'],
  knopfUebergeben: ['Übergeben & bezahlt', 'Teslim edildi & ödendi'],
  knopfNurAusgeliefert: ['nur ausgeliefert', 'sadece teslim edildi'],
  knopfBezahlt: ['Bezahlt', 'Ödendi'],
  knopfWiederOeffnen: ['Wieder öffnen', 'Yeniden aç'],
  knopfZurueckNeu: ['Zurück zu neu', 'Yeniye geri'],

  /* --- Netz-Editor ------------------------------------------------------- */
  anzahlKurz: ['Anz.', 'Adet'],
  bezeichnungRaum: ['Bezeichnung / Raum', 'Tanım / Oda'],
  breiteCm: ['Breite cm', 'Genişlik cm'],
  hoeheCm: ['Höhe cm', 'Yükseklik cm'],
  preisChf: ['Preis CHF', 'Fiyat CHF'],
  rahmendicke: ['Rahmendicke', 'Kasa kalınlığı'],
  rahmen: ['Rahmen', 'Kasa'],
  netzSpalte: ['Netz', 'Tül'],
  mechanismus: ['Mechanismus', 'Mekanizma'],
  oeffnungVonInnen: ['Öffnungsrichtung, von innen gesehen', 'Açılma yönü, içeriden bakıldığında'],
  nochOffen: ['— noch offen —', '— henüz boş —'],
  netzNummer: ['Netz', 'Sineklik'],
  setAusKatalog: ['Set aus dem Katalog', 'Katalogdan set'],
  netzHinzufuegen: ['Netz hinzufügen', 'Sineklik ekle'],
  netzeSpeichern: ['Netze speichern', 'Sineklikleri kaydet'],
  netzEntfernen: ['entfernen', 'kaldır'],
  montageInsgesamt: ['Montage insgesamt (CHF)', 'Toplam montaj (CHF)'],
  montageProFenster: [
    '{preis} pro Fenster. Leer lassen oder 0, wenn selbst montiert wird.',
    'Pencere başına {preis}. Kendisi monte ediyorsa boş bırakın veya 0 yazın.',
  ],
  netzeSumme: ['Netze', 'Sineklikler'],
  montageSumme: ['Montage', 'Montaj'],
  bezeichnungFehlt: [
    'Jedes Netz braucht eine Bezeichnung – sonst weiss später niemand, welches Fenster gemeint ist.',
    'Her sinekliğin bir tanımı olmalı – yoksa sonradan hangi pencere olduğu anlaşılmaz.',
  ],

  /* --- Von Hand erfassen ------------------------------------------------- */
  vonHandErfassen: ['Bestellung von Hand erfassen', 'Elle sipariş girişi'],
  vonHandSatz: [
    'Für alles, was nicht über das Formular kommt. Landet in derselben Liste wie die Bestellungen von der Seite.',
    'Formdan gelmeyen her şey için. Siteden gelen siparişlerle aynı listeye düşer.',
  ],
  art: ['Art', 'Tür'],
  kamUeber: ['Kam über', 'Nereden geldi'],
  name: ['Name', 'İsim'],
  telefon: ['Telefon', 'Telefon'],
  email: ['E-Mail', 'E-posta'],
  strasse: ['Strasse', 'Sokak'],
  plz: ['PLZ', 'Posta kodu'],
  ort: ['Ort', 'Yer'],
  bemerkungKundschaft: ['Bemerkung der Kundschaft', 'Müşterinin notu'],
  montageDurchUns: ['Montage durch uns', 'Montaj bizden'],
  fehltNameRueckweg: [
    'Es fehlt der Name und ein Rückweg – E-Mail oder Telefonnummer, eines von beidem genügt.',
    'İsim ve bir ulaşım yolu eksik – e-posta veya telefon, biri yeterli.',
  ],
  bestellungAnlegen: ['Bestellung anlegen', 'Siparişi oluştur'],

  /* --- Lieferrunden ------------------------------------------------------ */
  lieferrunden: ['Lieferrunden', 'Sevkiyat turları'],
  lieferrundenSatz: [
    'Anfrage, Preise, Bestellung. Ein Dokument, das seinen Zustand mit sich führt.',
    'Talep, fiyatlar, sipariş. Durumunu kendisi taşıyan tek bir belge.',
  ],
  fuerLieferrundeGewaehlt: ['für die Lieferrunde gewählt', 'sevkiyat turu için seçildi'],
  lieferrundeAnlegen: ['Lieferrunde anlegen', 'Sevkiyat turu oluştur'],
  auswahlAufheben: ['Auswahl aufheben', 'Seçimi kaldır'],

  standEntwurf: ['Entwurf', 'Taslak'],
  standEntwurfSatz: [
    'Noch nichts verschickt. Solange kann an den Netzen der Bestellungen geändert werden.',
    'Henüz bir şey gönderilmedi. O zamana kadar siparişlerin sineklikleri değiştirilebilir.',
  ],
  standAngefragt: ['Anfrage versendet', 'Talep gönderildi'],
  standAngefragtSatz: [
    'Bei Bora. Die Zeilen sind eingefroren – seine Preise beziehen sich auf die Nummern.',
    'Bora’da. Satırlar dondurulmuş – fiyatları satır numaralarına göre.',
  ],
  standPreise: ['Preise erhalten', 'Fiyatlar geldi'],
  standPreiseSatz: [
    'Preise eintragen und die Marge prüfen. Danach als Bestellung erteilen.',
    'Fiyatları girin ve kârı kontrol edin. Sonra sipariş olarak verin.',
  ],
  standBestellt: ['Bestellt', 'Sipariş verildi'],
  standBestelltSatz: ['Beim Produzenten in Fertigung.', 'Üreticide üretimde.'],
  standGeliefert: ['Geliefert', 'Teslim alındı'],
  standGeliefertSatz: ['Angekommen. Bleibt zum Nachschlagen stehen.', 'Geldi. Bakmak için burada kalır.'],

  angelegt: ['angelegt', 'oluşturuldu'],
  plissees: ['Plissees', 'plise'],
  dokumentAnzeigen: ['Dokument anzeigen', 'Belgeyi göster'],
  dokumentErzeugen: ['Dokument erzeugen und Zeilen einfrieren', 'Belgeyi oluştur ve satırları dondur'],
  erstFehlenAngaben: [
    'Erst fehlen noch Angaben ({n}). Im Dokument steht, welche.',
    'Önce eksik bilgiler var ({n}). Hangileri olduğu belgede yazıyor.',
  ],
  antwortDaPreise: ['Antwort da – Preise eintragen', 'Cevap geldi – fiyatları gir'],
  bestellungErteilen: ['Bestellung erteilen', 'Siparişi ver'],
  istAngekommen: ['Ist angekommen', 'Geldi'],
  zurueckZuAnfrage: ['Zurück zu „Anfrage versendet"', '„Talep gönderildi" durumuna dön'],
  lieferrundeVerwerfen: ['Lieferrunde verwerfen', 'Sevkiyat turunu sil'],
  verwerfenEntwurf: [
    'Verwerfen? Die Bestellungen bleiben, nur die Runde verschwindet.',
    'Silinsin mi? Siparişler kalır, sadece tur kaybolur.',
  ],
  verwerfenSpaeter: [
    'Verwerfen? Die {n} eingefrorenen Zeilen und die eingetragenen Preise sind dann weg. Die Bestellungen behalten den Status, den sie jetzt haben.',
    'Silinsin mi? Dondurulmuş {n} satır ve girilen fiyatlar kaybolur. Siparişler şu anki durumlarında kalır.',
  ],
  jaVerwerfen: ['Ja, verwerfen', 'Evet, sil'],

  /* --- Preise und Rechnung ----------------------------------------------- */
  preiseVomProduzenten: ['Preise vom Produzenten', 'Üreticiden gelen fiyatlar'],
  zeilennummernSatz: [
    'Die Zeilennummern sind dieselben wie auf dem Dokument, das Bora ausgefüllt zurückschickt.',
    'Satır numaraları, Bora’nın doldurup geri gönderdiği belgedeki numaralarla aynıdır.',
  ],
  nummerKurz: ['Nr.', 'No.'],
  paket: ['Paket', 'Paket'],
  fenster: ['Fenster', 'Pencere'],
  masse: ['Masse', 'Ölçü'],
  einkauf: ['Einkauf', 'Alış'],
  lieferkosten: ['Lieferkosten', 'Nakliye bedeli'],
  ganzeLieferung: ['Ganze Lieferung', 'Tüm sevkiyat'],
  ganzeLieferungGilt: [
    'Steht bei „Ganze Lieferung" ein Betrag, gilt dieser – die Einzelbeträge dienen dann nur der Übersicht.',
    '„Tüm sevkiyat" alanında bir tutar varsa o geçerlidir – tek tek tutarlar sadece bilgi içindir.',
  ],
  liefertermin: ['Liefertermin', 'Teslim tarihi'],
  lieferterminSatz: [
    'Was der Produzent nennt – später unser erwarteter Termin',
    'Üreticinin verdiği tarih – sonra bizim beklediğimiz tarih',
  ],
  preiseSpeichern: ['Preise speichern', 'Fiyatları kaydet'],

  rechnungDerRunde: ['Rechnung der Runde', 'Turun hesabı'],
  zeilenOhnePreis: [
    '{n} von {gesamt} Zeilen haben noch keinen Preis – die Zahlen unten sind deshalb unvollständig.',
    '{gesamt} satırdan {n} tanesinin fiyatı yok – aşağıdaki rakamlar bu yüzden eksik.',
  ],
  lieferkostenDoppelt: [
    'Es steht sowohl je Paket als auch für die ganze Lieferung ein Betrag da. Gerechnet wird mit dem Gesamtbetrag – bitte bei Bora nachfragen, was gilt.',
    'Hem paket başına hem de tüm sevkiyat için bir tutar var. Hesapta toplam tutar kullanılıyor – hangisi geçerli, Bora’ya sorun.',
  ],
  einsatz: ['Einsatz', 'Maliyet'],
  warenerloes: ['Warenerlös (ohne Montage)', 'Mal geliri (montaj hariç)'],
  marge: ['Marge', 'Kâr'],
  einsatzJeNetz: ['Einsatz je Netz', 'Sineklik başına maliyet'],
  mindestmenge: [
    'Angesetzt sind {n} Netze, ab denen eine Runde ihre Fracht trägt. Diese Runde hat {ist}.',
    'Bir turun nakliyesini karşılaması için {n} sineklik öngörülmüş. Bu turda {ist} var.',
  ],

  /* --- Zeilentabelle der Runde ------------------------------------------- */
  zeilenDerLieferung: ['Zeilen der Lieferung', 'Sevkiyatın satırları'],
  zeilenSatz: [
    'Genau das kommt aufs Dokument, ein Plissee je Zeile. Änderungen hier schreiben in die Bestellung – eine falsche Breite ist auch bei der Montage falsch.',
    'Belgeye tam olarak bu gelir, her satır bir plise. Buradaki değişiklikler siparişe de yazılır – yanlış bir genişlik montajda da yanlıştır.',
  ],
  zeilenLuecken: [
    '{n} Zeilen haben noch Lücken. Die orangen Felder füllen, dann kann der Auftrag raus.',
    '{n} satırda hâlâ eksik var. Turuncu alanları doldurun, sonra sipariş gidebilir.',
  ],
  dicke: ['Dicke', 'Kalınlık'],
  oeffnung: ['Öffnung', 'Açılma'],
  ausLieferung: ['aus Lieferung', 'sevkiyattan çıkar'],
  ausLieferungHilfe: [
    'Aus dieser Lieferung nehmen – das Netz bleibt in der Bestellung',
    'Bu sevkiyattan çıkar – sineklik siparişte kalır',
  ],
  loeschen: ['löschen', 'sil'],
  loeschenHilfe: [
    'Netz aus der Bestellung löschen – die Kundschaft bekommt es nicht mehr',
    'Sinekliği siparişten sil – müşteri artık almayacak',
  ],
  ausBestellungLoeschen: ['Aus der Bestellung löschen?', 'Siparişten silinsin mi?'],
  zeileOhneBestellung: ['Zeile ohne Bestellung hinzufügen', 'Siparişsiz satır ekle'],
  zeileOhneBestellungSatz: [
    'Für ein Reservenetz oder ein Muster. Erscheint auf dem Auftrag, aber auf keiner Rechnung.',
    'Yedek sineklik veya numune için. Siparişte görünür, hiçbir faturada görünmez.',
  ],
  nichtInDieserLieferung: ['Nicht in dieser Lieferung', 'Bu sevkiyatta değil'],
  nichtInDieserLieferungSatz: [
    'Diese Netze bleiben in der Bestellung und kommen in eine spätere Runde.',
    'Bu sineklikler siparişte kalır ve sonraki bir tura girer.',
  ],
  zurueckInDieLieferung: ['zurück in die Lieferung', 'sevkiyata geri al'],

  /* --- Dokument-Steuerung ------------------------------------------------ */
  deutschNurPruefen: ['Deutsch (nur zum Prüfen)', 'Almanca (sadece kontrol için)'],
  druckenAlsPdf: ['Drucken / als PDF sichern', 'Yazdır / PDF olarak kaydet'],
  zurueckZurLieferung: ['Zurück zur Lieferung', 'Sevkiyata dön'],
  auftragKannNichtRaus: [
    'So kann der Auftrag nicht raus – es fehlen Angaben:',
    'Sipariş bu haliyle gönderilemez – eksik bilgiler var:',
  ],
  angabenImNetzEditor: [
    'Die Angaben stehen im Netz-Editor der jeweiligen Bestellung. Danach hier nochmals aufrufen.',
    'Bilgiler ilgili siparişin sineklik düzenleyicisinde. Sonra buraya tekrar gelin.',
  ],
  bemerkungAnProduzenten: ['Bemerkung an den Produzenten (freiwillig)', 'Üreticiye not (isteğe bağlı)'],
} as const satisfies Record<string, Paar>

export type AdminTexte = { [K in keyof typeof PAARE]: string }

export function texteFuer(sprache: AdminSprache): AdminTexte {
  const stelle = sprache === 'tuerkisch' ? 1 : 0
  const raus: Record<string, string> = {}
  for (const [schluessel, paar] of Object.entries(PAARE)) raus[schluessel] = paar[stelle]
  return raus as AdminTexte
}

/** Setzt Platzhalter wie {n} ein. */
export function fuelle(vorlage: string, werte: Record<string, string | number>): string {
  return vorlage.replace(/\{(\w+)\}/g, (ganz, name) => String(werte[name] ?? ganz))
}

export const SPRACH_SPEICHER = 'pf:adminsprache'

export interface SprachRahmenWert {
  sprache: AdminSprache
  setzeSprache: (s: AdminSprache) => void
  t: AdminTexte
  /** Sprachkennung für Datumsangaben. */
  ort: string
}

export const SprachKontext = createContext<SprachRahmenWert | null>(null)

export function useSprache(): SprachRahmenWert {
  const rahmen = useContext(SprachKontext)
  if (!rahmen) throw new Error('useSprache braucht den SprachRahmen darum herum.')
  return rahmen
}

