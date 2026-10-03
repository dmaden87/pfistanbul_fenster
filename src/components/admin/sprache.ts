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
  knopfAngenommen: ['Angenommen – Auftragsklärung', 'Kabul edildi – netleştirme'],
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
  zumPaketZusammenfuehren: ['Zu einem Paket zusammenführen', 'Tek pakette birleştir'],
  paketSatz: [
    'Die gewählten Aufträge bekommen ein gemeinsames Paket-Etikett und einen gemeinsamen Bestelltalon.',
    'Seçilen siparişler ortak bir paket etiketi ve ortak bir sipariş fişi alır.',
  ],
  paketAufloesen: ['Aus dem Paket nehmen', 'Paketten çıkar'],
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

