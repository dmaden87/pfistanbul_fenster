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
  zahlen: ['Zahlen', 'Rakamlar'],
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

  /* --- Die sieben Phasen und das Archiv ----------------------------------- */
  phaseNeu: ['Neu', 'Yeni'],
  phaseNeuSatz: [
    'Eingegangen. Annehmen – oder absagen, wenn es Spam oder ein Doppel ist.',
    'Geldi. Kabul edin – ya da spam veya kopya ise iptal edin.',
  ],
  phaseKlaerung: ['Auftrag klären', 'Siparişi netleştir'],
  phaseKlaerungSatz: [
    'Termin beim Kunden, ausmessen, Netze erfassen. Weiter, sobald alle Angaben da sind.',
    'Müşteride randevu, ölçüm, sineklikleri girin. Tüm bilgiler tamam olunca devam.',
  ],
  phaseOfferte: ['Angebot erstellen', 'Teklif hazırlama'],
  phaseOfferteSatz: [
    'Preise prüfen, Montage, Anfahrt und Rabatt setzen, Offerte verschicken.',
    'Fiyatları kontrol edin, montaj, yol ve indirimi ayarlayın, teklifi gönderin.',
  ],
  phaseZusage: ['Warten auf Zusage', 'Onay bekleniyor'],
  phaseZusageSatz: [
    'Die Offerte ist beim Kunden. Zusage → Bestellen, Nachbessern → zurück zum Angebot, Absage → Archiv.',
    'Teklif müşteride. Onay → Sipariş, düzeltme → teklife geri, ret → Arşiv.',
  ],
  phaseBestellen: ['Bereit zum Bestellen', 'Siparişe hazır'],
  phaseBestellenSatz: [
    'Zugesagt, aber noch nicht bei Bora. Mehrere Aufträge zu einem Paket zusammenführen und als Ganzes bestellen.',
    'Onaylandı ama henüz Bora’da değil. Birden fazla siparişi tek pakette birleştirip bir bütün olarak sipariş edin.',
  ],
  phaseBora: ['Bei Bora', 'Bora’da'],
  phaseBoraSatz: [
    'Bestellt. Sobald die Sendung läuft: Haken «Unterwegs» und, wenn es eine gibt, die Sendungsnummer.',
    'Sipariş verildi. Gönderi yola çıkınca: «Yolda» işareti ve varsa gönderi numarası.',
  ],
  phaseAusliefern: ['Ausliefern', 'Teslim etme'],
  phaseAusliefernSatz: [
    'Die Ware ist da. Termin machen, übergeben, kassieren.',
    'Mal geldi. Randevu alın, teslim edin, tahsil edin.',
  ],
  phaseArchiv: ['Archiv', 'Arşiv'],
  phaseArchivSatz: [
    'Abgeschlossen oder abgesagt. Bleibt zum Nachschlagen stehen.',
    'Tamamlandı veya iptal edildi. Bakmak için burada kalır.',
  ],

  zuTun: ['in Arbeit', 'devam eden'],
  seitTagen: ['seit {n} Tagen hier', '{n} gündür burada'],
  entfaelltMarke: ['Katalogware – Klärung und Offerte entfallen', 'Katalog ürünü – netleştirme ve teklif yok'],
  zugesagtMarke: ['zugesagt am', 'onaylandı'],
  zahlungAusstehendMarke: ['Onlinezahlung nicht eingegangen', 'Online ödeme gelmedi'],
  angabenFehlenMarke: ['{n} Angabe(n) fehlen', '{n} bilgi eksik'],
  einkaufspreiseStand: ['{da} von {alle} Einkaufspreisen da', '{alle} alış fiyatından {da} tanesi var'],
  restbetrag: ['Rest offen', 'Kalan'],

  /* --- Angebot zusammenstellen -------------------------------------------- */
  angebotTitel: ['Angebot zusammenstellen', 'Teklifi oluştur'],
  /*
   * Wegweiser im Preisblock. Wer hier steht, offeriert gerade - und genau
   * dann faellt auf, dass ein Netz zu viel drin ist. Die Liste hier kann
   * nur Preise; entfernt wird im Netz-Editor, und der liegt zwei Klicks
   * entfernt hinter einer Klappe. Ohne diesen Satz sucht man ihn nicht.
   */
  netzZuVielSatz: [
    'Ein Netz zu viel? Unter „Netze und Angaben anzeigen“ lässt sich jedes einzeln entfernen.',
    'Fazla bir sineklik mi var? „Sineklikleri ve bilgileri göster“ altında tek tek kaldırabilirsin.',
  ],
  angebotSatz: [
    'Der Rechner schlägt je Netz einen Preis vor – denselben, den die Kundschaft auf der Seite sieht. Überschreibe ihn, wo es nötig ist; der Vorschlag bleibt daneben stehen.',
    'Hesaplayıcı her sineklik için bir fiyat önerir – müşterinin sitede gördüğü fiyatın aynısı. Gerekirse üzerine yazın; öneri yanında kalır.',
  ],
  richtpreisMarke: ['Preise noch nicht festgelegt', 'Fiyatlar henüz belirlenmedi'],
  preiseFestgelegtAm: ['Angebot festgelegt am', 'Teklif belirlendi'],
  verkaufJeStueck: ['Verkauf / Stück', 'Satış / adet'],
  richtpreisSpalte: ['Vorschlag / Stück', 'Öneri / adet'],
  abweichungSpalte: ['Abweichung', 'Fark'],
  richtpreiseUebernehmen: ['Vorschlag für alle übernehmen', 'Öneriyi tümüne uygula'],
  keinVorschlag: [
    'Für dieses Netz gibt es keinen Vorschlag – es fehlen die Masse.',
    'Bu sineklik için öneri yok – ölçüler eksik.',
  ],
  postenTitel: ['Dazu oder davon ab', 'Ekle veya çıkar'],
  postenAnfahrt: ['Anfahrt verrechnen', 'Yol ücreti ekle'],
  postenRabatt: ['Rabatt geben', 'İndirim ver'],
  anfahrtBetrag: ['Anfahrt (CHF)', 'Yol (CHF)'],
  anfahrtSatz: [
    'Im {gebiet} kostenlos, ausserhalb {preis} pauschal. Aktiv mit 0.00 heisst auf der Offerte «kostenlos» – das ist ein Argument und soll dastehen.',
    '{gebiet} içinde ücretsiz, dışında {preis} sabit. 0.00 ile aktif olması teklifte «ücretsiz» demektir – bu bir argüman, görünsün.',
  ],
  anfahrtSumme: ['Anfahrt', 'Yol'],
  kostenlos: ['kostenlos', 'ücretsiz'],
  totalSumme: ['Total', 'Toplam'],
  rabattSumme: ['Rabatt', 'İndirim'],
  rabattBetrag: ['Rabatt auf die Bestellung (CHF)', 'Siparişe indirim (CHF)'],
  rabattText: ['Bezeichnung des Rabatts', 'İndirimin adı'],
  rabattTextBeispiel: ['z. B. Kennenlernrabatt', 'örn. tanışma indirimi'],
  knopfPreiseFestlegen: ['Angebot festlegen', 'Teklifi belirle'],
  knopfPreiseAendern: ['Angebot ändern', 'Teklifi değiştir'],
  preisFehltSatz: [
    'Jedes Netz braucht einen Verkaufspreis über 0.',
    'Her sinekliğin 0’dan büyük bir satış fiyatı olmalı.',
  ],

  /* --- Felder je Phase --------------------------------------------------- */
  klaerungTermin: ['Termin Auftragsklärung', 'Netleştirme randevusu'],
  montageTermin: ['Liefer-/Montagetermin', 'Teslim/montaj tarihi'],
  zahlungKommentar: ['Zur Zahlung (bar, TWINT, Rate …)', 'Ödeme notu (nakit, TWINT, taksit …)'],
  speichern: ['Speichern', 'Kaydet'],

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

  /* --- Knoepfe je Phase -------------------------------------------------- */
  knopfAngenommen: ['Angenommen – Auftrag klären', 'Kabul edildi – siparişi netleştir'],
  knopfGeprueftBestellen: ['Geprüft – bereit zum Bestellen', 'Kontrol edildi – siparişe hazır'],
  knopfBeiBoraBestellt: ['Bei Bora bestellt', 'Bora’ya sipariş verildi'],
  knopfPaketBestellt: ['Ganzes Paket bei Bora bestellt', 'Tüm paketi Bora’ya sipariş ver'],
  knopfKlaerungFertig: ['Auftrag geklärt – Angebot rechnen', 'Sipariş netleşti – teklifi hesapla'],
  knopfOfferteAnzeigen: ['Offerte anzeigen', 'Teklifi göster'],
  knopfOfferteRaus: ['Offerte ist raus', 'Teklif gönderildi'],
  knopfKundeZugesagt: ['Kunde hat zugesagt', 'Müşteri onayladı'],
  knopfAenderungswunsch: ['Änderungswunsch – zurück zur Klärung', 'Değişiklik isteği – netleştirmeye dön'],
  knopfNachbessern: ['Offerte nachbessern – zurück zum Angebot', 'Teklifi düzelt – teklife geri'],
  knopfZusageZurueck: ['Zusage zurücknehmen', 'Onayı geri al'],
  knopfAbsagen: ['Absagen', 'İptal et'],
  knopfUebergeben: ['Übergeben & bezahlt', 'Teslim edildi & ödendi'],
  knopfNurAusgeliefert: ['nur übergeben', 'sadece teslim edildi'],
  knopfBezahlt: ['Bezahlt', 'Ödendi'],
  knopfWiederOeffnen: ['Wieder öffnen', 'Yeniden aç'],
  knopfZurueck: ['Zurück zu «{phase}»', '«{phase}» aşamasına dön'],

  /* --- Absage: warum ------------------------------------------------------ */
  absageWarum: ['Absagen – warum?', 'İptal – neden?'],
  grundSpam: ['Spam / Test', 'Spam / deneme'],
  grundDoppelt: ['Doppelt erfasst', 'Çift kayıt'],
  grundKeineAntwort: ['Keine Antwort vom Kunden', 'Müşteriden cevap yok'],
  grundKunde: ['Kunde will nicht mehr', 'Müşteri vazgeçti'],
  grundZuTeuer: ['Zu teuer', 'Çok pahalı'],
  grundStorno: ['Storno nach Zusage', 'Onaydan sonra iptal'],
  abgesagtWeil: ['abgesagt', 'iptal'],

  /* --- Paket -------------------------------------------------------------- */
  fuerPaketGewaehlt: ['fürs Paket gewählt', 'paket için seçildi'],
  auswahlAufheben: ['Auswahl aufheben', 'Seçimi kaldır'],

  /* --- Netz-Editor ------------------------------------------------------- */
  anzahlKurz: ['Anz.', 'Adet'],
  bezeichnungRaum: ['Bezeichnung / Raum', 'Tanım / Oda'],
  breiteCm: ['Breite cm', 'Genişlik cm'],
  hoeheCm: ['Höhe cm', 'Yükseklik cm'],
  preisChf: ['Preis CHF', 'Fiyat CHF'],
  preisGerechnet: ['Richtpreis gerechnet', 'Hesaplanan fiyat'],
  preisGerechnetSatz: [
    'Der Preis wird aus den Massen gerechnet – derselbe Richtpreis, den die Kundschaft auf der Seite sieht. Festgelegt wird der Verkaufspreis später unter „Angebot erstellen“; ein dort von Hand gesetzter Preis bleibt stehen, solange die Masse gleich bleiben.',
    'Fiyat ölçülerden hesaplanır – müşterinin sitede gördüğü tahmini fiyatın aynısı. Satış fiyatı daha sonra „Teklif hazırlama“ altında belirlenir; orada elle girilen fiyat, ölçüler değişmediği sürece korunur.',
  ],
  rahmendicke: ['Rahmendicke', 'Kasa kalınlığı'],
  rahmen: ['Rahmen', 'Kasa'],
  netzSpalte: ['Netz', 'Tül'],
  mechanismus: ['Mechanismus', 'Mekanizma'],
  oeffnungVonInnen: ['Öffnungsrichtung, von innen gesehen', 'Açılma yönü, içeriden bakıldığında'],
  nochOffen: ['— noch offen —', '— henüz boş —'],
  netzNummer: ['Netz', 'Sineklik'],
  setAusKatalog: ['Set aus dem Katalog', 'Katalogdan set'],
  netzHinzufuegen: ['Netz hinzufügen', 'Sineklik ekle'],
  katalogprodukt: ['Katalogprodukt', 'Katalog ürünü'],
  bitteWaehlen: ['— wählen —', '— seçin —'],
  einzelneNetze: ['Einzelne Netze', 'Tek sineklikler'],
  setsGruppe: ['Sets', 'Setler'],
  katalogFehlt: [
    'Jedes Netz braucht ein Katalogprodukt. Masse, Bauart und Preis kommen aus dem Katalog.',
    'Her sineklik için bir katalog ürünü seçin. Ölçü, yapı ve fiyat katalogdan gelir.',
  ],
  katalogSatz: [
    'Katalogware: Produkt wählen, Anzahl und Raum anpassen. Masse, Bauart und Preis stehen im Katalog und werden hier nicht geändert.',
    'Katalog ürünü: ürünü seçin, adet ve odayı ayarlayın. Ölçü, yapı ve fiyat katalogdadır, burada değişmez.',
  ],
  netzeSpeichern: ['Netze speichern', 'Sineklikleri kaydet'],
  // Fuer die Vorlesehilfe, zusammen mit der Nummer: "Netz 3 entfernen".
  netzEntfernen: ['entfernen', 'kaldır'],
  // Die sichtbare Beschriftung. Sie nennt die Sache beim Namen - ein blankes
  // Kreuz wurde im Betrieb nicht als Entfernen erkannt.
  netzWegKnopf: ['Dieses Netz entfernen', 'Bu sinekliği kaldır'],
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

  /* --- Talon an Bora: Preisanfrage oder Bestellung ----------------------- */
  preisanfrageAnzeigen: ['Preisanfrage an Bora anzeigen', 'Bora’ya fiyat talebini göster'],
  bestelltalonAnzeigen: ['Bestelltalon anzeigen', 'Sipariş fişini göster'],
  bestelltalonPaket: ['Bestelltalon für das Paket anzeigen', 'Paketin sipariş fişini göster'],
  entwurfBalken: ['ENTWURF – noch nicht verschickt', 'TASLAK – henüz gönderilmedi'],
  terminFuersBlatt: ['Liefertermin (auf dem Blatt)', 'Teslim tarihi (belgede)'],
  bemerkungFuersBlatt: ['Bemerkung an den Produzenten (auf dem Blatt)', 'Üreticiye not (belgede)'],
  auftraegeAufDemBlatt: ['Aufträge auf diesem Blatt', 'Bu belgedeki siparişler'],

  /* --- Bei Bora: bestellt, unterwegs, Paket ------------------------------- */
  bestelltBeiBora: ['Bei Bora bestellt', 'Bora’ya sipariş verildi'],
  unterwegs: ['Unterwegs', 'Yolda'],
  unterwegsPaket: ['Unterwegs – ganzes Paket', 'Yolda – tüm paket'],
  sendungsnummer: ['Sendungsnummer (freiwillig)', 'Gönderi numarası (isteğe bağlı)'],
  sendungsnummerPaket: [
    'Sendungsnummer – gilt für das ganze Paket',
    'Gönderi numarası – tüm paket için geçerli',
  ],
  knopfAngekommen: ['Angekommen – ausliefern', 'Geldi – teslim et'],
  paketMarke: ['Paket', 'Paket'],
  fuerPaket: ['zum Paket', 'pakete'],
  paketSatz: [
    'Ein neues Paket, oder dazu in eines, das noch nicht bei Bora ist. Danach geht der gemeinsame Bestelltalon auf.',
    'Yeni bir paket ya da henüz Bora’da olmayan bir pakete ekleme. Ardından ortak sipariş fişi açılır.',
  ],
  paketZiel: ['Wohin', 'Nereye'],
  paketNeu: ['Neues Paket', 'Yeni paket'],
  paketNeuAnlegen: ['Neues Paket anlegen', 'Yeni paket oluştur'],
  paketDazu: ['Zu {paket} hinzufügen', '{paket} paketine ekle'],
  paketMitAnzahl: ['{paket} · {n} bisher', '{paket} · şu ana kadar {n}'],
  paketZielWeg: [
    'Dieses Paket ist inzwischen bei Bora – ihm lässt sich nichts mehr hinzufügen. Bitte neu wählen.',
    'Bu paket artık Bora’da – ona bir şey eklenemez. Lütfen yeniden seçin.',
  ],
  paketAufloesen: ['Aus dem Paket nehmen', 'Paketten çıkar'],
  paketInhalt: [
    '{auftraege} {auftragWort} · {netze} {netzWort}',
    '{auftraege} {auftragWort} · {netze} {netzWort}',
  ],
  paketZugeklapptSatz: [
    'Aufklappen, um die einzelnen Bestellungen zu bearbeiten.',
    'Tek tek siparişleri düzenlemek için açın.',
  ],
  imPaketMit: ['im Paket mit', 'paketinde, birlikte'],

  /* --- Dokument-Steuerung ------------------------------------------------ */
  deutschNurPruefen: ['Deutsch (nur zum Prüfen)', 'Almanca (sadece kontrol için)'],
  druckenAlsPdf: ['Drucken / als PDF sichern', 'Yazdır / PDF olarak kaydet'],
  zurueckZurLieferung: ['Zurück zur Liste', 'Listeye dön'],
  auftragKannNichtRaus: [
    'So kann der Auftrag nicht raus – es fehlen Angaben:',
    'Sipariş bu haliyle gönderilemez – eksik bilgiler var:',
  ],
  angabenImNetzEditor: [
    'Die Angaben stehen im Netz-Editor der jeweiligen Bestellung. Danach hier nochmals aufrufen.',
    'Bilgiler ilgili siparişin sineklik düzenleyicisinde. Sonra buraya tekrar gelin.',
  ],
  bemerkungAnProduzenten: ['Bemerkung an den Produzenten (freiwillig)', 'Üreticiye not (isteğe bağlı)'],

  /* --- Testumgebung ------------------------------------------------------- */
  demoTitel: ['Testumgebung', 'Test ortamı'],
  demoSatz: [
    'Beispieldaten zum Durchklicken. Keine Anmeldung, keine echten Bestellungen – die Produktivdaten liegen in einer anderen Tabelle und werden hier nicht angefasst.',
    'Denemek için örnek veriler. Giriş yok, gerçek sipariş yok – canlı veriler başka bir tabloda ve buradan hiç dokunulmuyor.',
  ],
  demoZuruecksetzen: ['Beispieldaten zurücksetzen', 'Örnek verileri sıfırla'],

  /* --- Bereich "Zahlen" --------------------------------------------------- */
  /*
   * EIN SCHALTER FUER BEIDE BEREICHE. Die Wahl steht im Adminbereich und
   * gilt hier mit: Wer dort auf TR stellt, bekommt auch die Zahlen auf
   * Tuerkisch. Ein zweiter Schalter waere eine zweite Stelle, an der die
   * beiden Bereiche auseinanderlaufen koennen.
   *
   * Betraege bleiben in Schweizer Schreibweise – siehe oben.
   */
  zahlenTitel: ['Zahlen', 'Rakamlar'],
  zurueck: ['Zurück', 'Geri'],
  zahlenDemo: [
    'Testumgebung – Beispieldaten, keine Anmeldung nötig.',
    'Test ortamı – örnek veriler, giriş gerekmiyor.',
  ],

  zTotalErloes: ['Total Erlös', 'Toplam gelir'],
  zTotalErloesSatz: [
    'alle festen Aufträge zum Verkaufspreis – ab der Zusage der Kundschaft',
    'müşteri onayından itibaren tüm kesin siparişler, satış fiyatıyla',
  ],
  zCashed: ['Cashed', 'Tahsil edildi'],
  zCashedHilfe: [
    'Geliefert und bezahlt – das Geld ist auf dem Konto.',
    'Teslim edildi ve ödendi – para hesapta.',
  ],
  zDebit: ['Debit', 'Alacak'],
  zDebitHilfe: [
    'Geliefert, aber noch nicht bezahlt – die Debitoren.',
    'Teslim edildi ama henüz ödenmedi – alacaklar.',
  ],
  zInArbeit: ['In Arbeit', 'İşlemde'],
  zInArbeitHilfe: [
    'Zugesagt und noch nicht ausgeliefert: bereit zum Bestellen oder bei Bora.',
    'Onaylandı ama henüz teslim edilmedi: siparişe hazır veya Bora’da.',
  ],

  zBetriebsergebnis: ['Betriebsergebnis', 'Faaliyet sonucu'],
  zBetriebsergebnisSatz: [
    'Erlöse aller festen Aufträge minus Waren- und Betriebskosten',
    'tüm kesin siparişlerin geliri eksi mal ve işletme giderleri',
  ],
  zRentabilitaet: ['Rentabilität', 'Kârlılık'],
  zErgebnisReal: ['Betriebsergebnis real', 'Faaliyet sonucu, gerçek'],
  zErgebnisRealSatz: [
    'nur was geflossen ist: einkassiert gegen bezahlte Rechnungen',
    'yalnızca gerçekleşen akış: tahsil edilen karşısında ödenen faturalar',
  ],

  zTotalKosten: ['Total Kosten', 'Toplam maliyet'],
  zWare: ['Ware', 'Mal'],
  zBetrieb: ['Betrieb', 'İşletme'],
  zBezahlt: ['Bezahlt', 'Ödendi'],
  zBezahltHilfe: ['Schon geflossen.', 'Çoktan ödendi.'],
  zCredit: ['Credit', 'Borç'],
  zCreditHilfe: [
    'Erfasst und noch offen – das schulden wir Bora oder uns selbst.',
    'Kaydedildi ve hâlâ açık – Bora’ya veya kendimize borçluyuz.',
  ],
  zOhneBeleg: ['Ohne Beleg', 'Belgesiz'],
  zOhneBelegHilfe: [
    'Aus der Formel gerechnet, noch kein Posten erfasst – deshalb ohne Stand.',
    'Formülle hesaplandı, henüz kalem girilmedi – bu yüzden durumu yok.',
  ],

  zFunnel: ['Funnel', 'Funnel'],
  zFunnelSatz: [
    '{n} Anfragen · {m} Netze, noch nicht zugesagt',
    '{n} talep · {m} sineklik, henüz onaylanmadı',
  ],

  zAuftraegeIst: ['Aufträge – IST', 'Siparişler – GERÇEK'],
  zJahrBisHeute: ['Jahr bis heute', 'Yıl başından bugüne'],
  zTotal: ['Total', 'Toplam'],
  zAbschnitt: ['Abschnitt', 'Dönem'],
  zAbschnittJahr: ['{jahr} bis heute', '{jahr} başından bugüne'],
  zAbschnittTotal: ['Total, alles bisher', 'Toplam, şimdiye kadar hepsi'],
  zAuftraege: ['Aufträge', 'Siparişler'],
  zErloes: ['Erlös', 'Gelir'],
  zEinkassiert: ['einkassiert', 'tahsil edildi'],
  zOffen: ['offen', 'açık'],
  zWarenkosten: ['Warenkosten', 'Mal maliyeti'],
  zBetriebskosten: ['Betriebskosten', 'İşletme giderleri'],
  zErgebnis: ['Ergebnis', 'Sonuç'],
  zKeineAuftraege: ['Noch keine festen Aufträge.', 'Henüz kesin sipariş yok.'],
  zIstSatz: [
    'Hier stehen alle festen Aufträge – ab dem Moment, in dem die Kundschaft zugesagt hat. Der Erlös zählt im Monat der Auslieferung, bei noch nicht Geliefertem im Monat der Zusage. Die drei Spalten danach sagen, wie weit jeder ist, und ergeben zusammen wieder den Erlös: einkassiert ist auf dem Konto, offen sind die Debitoren (geliefert, noch nicht bezahlt), in Arbeit ist zugesagt und noch nicht geliefert. Wo noch keine Kosten erfasst sind, rechnet die Formel – welche Aufträge das sind, steht weiter unten bei „Pro Auftrag“.',
    'Burada tüm kesin siparişler var – müşterinin onay verdiği andan itibaren. Gelir teslim ayında sayılır, henüz teslim edilmemişse onay ayında. Sonraki üç sütun her birinin nerede olduğunu söyler ve toplamları yine geliri verir: tahsil edilen hesapta, açık olanlar alacaklar (teslim edildi, ödenmedi), işlemde olan onaylandı ama teslim edilmedi. Maliyet henüz girilmemişse formül hesaplar – hangi siparişler olduğu aşağıda „Sipariş başına“ bölümünde görülür.',
  ],

  zFunnelTitel: ['Funnel – Forecast', 'Funnel – Forecast'],
  zStand: ['Stand', 'Durum'],
  zAnfragen: ['Anfragen', 'Talepler'],
  zErloesErwartet: ['Erlös erwartet', 'Beklenen gelir'],
  zKostenErwartet: ['Kosten erwartet', 'Beklenen maliyet'],
  zMargeErwartet: ['Marge erwartet', 'Beklenen marj'],
  zZusammen: ['Zusammen', 'Toplam'],
  zKeineAnfragen: ['Keine offenen Anfragen.', 'Açık talep yok.'],
  zFunnelHinweis: [
    'Alles vor der Zusage: von der frischen Anfrage bis zum Warten auf das Ja. Geordnet nach Nähe und nicht nach Monat – wann daraus etwas wird, und ob überhaupt, weiss heute niemand. Die Preise sind Vorschläge, die Kosten durchwegs aus der Formel gerechnet. Nichts davon ist Ertrag, und deshalb geht diese Tabelle nie in eine Summe mit den Aufträgen ein.',
    'Onaydan önceki her şey: yeni talepten „evet“i beklemeye kadar. Aya göre değil, yakınlığa göre sıralı – ne zaman ve hiç olup olmayacağını bugün kimse bilmiyor. Fiyatlar öneri, maliyetler tamamen formülle hesaplanmış. Hiçbiri gelir değildir, bu yüzden bu tablo siparişlerle asla toplanmaz.',
  ],

  zProAuftrag: ['Pro Auftrag', 'Sipariş başına'],
  zProAuftragSatz: [
    'Diese Sicht rechnet, sie verwaltet nicht. Soll ein Auftrag nicht mitzählen, gehört er im Adminbereich abgesagt – dann fällt er hier von selbst heraus.',
    'Bu görünüm hesaplar, yönetmez. Bir sipariş sayılmasın isteniyorsa yönetim bölümünde iptal edilir – o zaman burada kendiliğinden düşer.',
  ],
  zAuftrag: ['Auftrag', 'Sipariş'],
  zKosten: ['Kosten', 'Maliyet'],
  zMarge: ['Marge', 'Marj'],
  zGeschaetzt: ['geschätzt', 'tahmini'],
  zBearbeiten: ['bearbeiten', 'düzenle'],
  zSchliessen: ['schliessen', 'kapat'],
  zStandEinkassiert: ['einkassiert', 'tahsil edildi'],
  zStandOffen: ['offen', 'açık'],
  zStandErwartet: ['erwartet', 'bekleniyor'],
  zStandNichtGerechnet: ['nicht gerechnet', 'hesaba katılmadı'],

  zProSendung: ['Pro Sendung', 'Sevkiyat başına'],
  zJeNetz: ['je Netz', 'sineklik başına'],

  zSchuldetUns: ['Wer uns was schuldet', 'Bize kim ne borçlu'],
  zSchuldenWir: ['Wem wir was schulden', 'Kime ne borçluyuz'],
  zNichtsOffen: ['Nichts offen.', 'Açık bir şey yok.'],
  zGeliefert: ['Geliefert', 'Teslim'],
  zWer: ['Wer', 'Kim'],
  zPosten: ['Posten', 'Kalem'],
  zBetrag: ['Betrag', 'Tutar'],

  zAbrechnung: [
    'Abrechnung, wenn man heute abrechnen würde',
    'Bugün hesaplaşılsa ne çıkardı',
  ],
  zEinkassiertWare: ['Einkassiert, aus der Ware', 'Tahsil edilen, maldan'],
  zEinkassiertMontage: [
    'Einkassiert, aus Montage und Anfahrt',
    'Tahsil edilen, montaj ve yoldan',
  ],
  zWarenkostenDieser: ['Warenkosten dieser Aufträge', 'Bu siparişlerin mal maliyeti'],
  zTopfWare: ['Topf Ware', 'Mal havuzu'],
  zTopfMontage: ['Topf Montage und Anfahrt', 'Montaj ve yol havuzu'],
  zNichtsZuVerteilen: [
    'Noch nichts zu verteilen. Die Kosten sind grösser als das, was bisher eingegangen ist – ein Topf im Minus wird nicht ausgeschüttet.',
    'Dağıtılacak bir şey yok. Maliyetler şimdiye kadar gelenden büyük – eksideki havuz dağıtılmaz.',
  ],
  zZuerstZurueck: [
    'Zuerst gehen {betrag} an die zurück, die sie ausgelegt haben – siehe „Wem wir was schulden“.',
    'Önce {betrag} tutarı, parayı yatıranlara geri gider – bkz. „Kime ne borçluyuz“.',
  ],
  zVerteilungSatz: [
    'Verteilt wird nur, was wirklich eingegangen ist. Die Ware geht 20 / 40 / 40 an Bora, Ufuk und Deniz, Montage und Anfahrt zur Hälfte an Ufuk und Deniz. Kurs {kurs} CHF/EUR, Einfuhrsteuer {steuer} % auf dem Warenwert.',
    'Yalnızca gerçekten gelen para dağıtılır. Mal 20 / 40 / 40 oranında Bora, Ufuk ve Deniz’e; montaj ve yol yarı yarıya Ufuk ve Deniz’e. Kur {kurs} CHF/EUR, ithalat vergisi mal değeri üzerinden %{steuer}.',
  ],

  /* --- Kosteneditor und Betriebskosten ------------------------------------ */
  zPostenSpalte: ['Posten', 'Kalem'],
  zAusgelegtVon: ['Ausgelegt von', 'Ödeyen'],
  zZurueckbezahlt: ['Zurückbezahlt', 'Geri ödendi'],
  zWofuer: ['Wofür?', 'Ne için?'],
  zWeg: ['weg', 'sil'],
  zWeitereKosten: ['Weitere Kosten', 'Başka maliyet'],
  zKostenSpeichern: ['Kosten speichern', 'Maliyeti kaydet'],
  zWirdGespeichert: ['Wird gespeichert …', 'Kaydediliyor …'],
  zSpeichernSchiefgelaufen: [
    'Das Speichern ging schief.',
    'Kaydetme başarısız oldu.',
  ],
  zKostenZusammenzug: [
    'Kosten {kosten} · Erlös {erloes} · Marge {marge}',
    'Maliyet {kosten} · Gelir {erloes} · Marj {marge}',
  ],
  zHerstellung: ['Herstellung Netze', 'Sineklik üretimi'],
  zLieferkosten: ['Lieferkosten', 'Nakliye'],
  zEinfuhrsteuer: ['Einfuhrsteuer', 'İthalat vergisi'],

  zBetriebskostenTitel: ['Betriebskosten', 'İşletme giderleri'],
  zBetriebskostenSatz: [
    '{n} Einträge, zusammen {summe} – davon {offen} noch nicht zurückbezahlt.',
    '{n} kayıt, toplam {summe} – bunun {offen} tutarı henüz geri ödenmedi.',
  ],
  zDatum: ['Datum', 'Tarih'],
  zKategorie: ['Kategorie', 'Kategori'],
  zEintragen: ['Eintragen', 'Kaydet'],
  zLoeschen: ['löschen', 'sil'],
  zMarketing: ['Marketing', 'Pazarlama'],
  zInfrastruktur: ['Infrastruktur', 'Altyapı'],
  zMaterial: ['Material', 'Malzeme'],
  zWerkzeug: ['Werkzeug', 'Alet'],
  zFahrten: ['Fahrten', 'Yol'],
  zSonstiges: ['Sonstiges', 'Diğer'],
  zDatenFehler: [
    'Die Daten liessen sich nicht laden.',
    'Veriler yüklenemedi.',
  ],
  zAnmeldungFehler: ['Die Anmeldung ging schief.', 'Giriş başarısız oldu.'],
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

