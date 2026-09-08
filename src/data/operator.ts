/**
 * Angaben zum Betreiber. Art. 3 Abs. 1 lit. s UWG verlangt bei einem
 * Onlineshop Identität und Kontaktadresse "einschliesslich derjenigen der
 * elektronischen Post" – die Mailadresse muss also im Impressum als Text
 * stehen, ein Kontaktformular genügt nicht.
 *
 * Hinweis: Damit steht die Adresse auch im ausgelieferten JavaScript und ist
 * für Spam-Sammler lesbar. Das ist der Preis dafür, dass sie im Impressum als
 * Text stehen muss; ein Kontaktformular genügt dem Gesetz nicht.
 *
 * Die frühere Gmail-Adresse steht noch auf den gedruckten Flyern und
 * funktioniert weiter. Hier steht die Adresse, die Kundschaft künftig sieht.
 */
export const operator = {
  businessName: 'Pfistanbul Fenster',
  people: [
    { name: 'Deniz Maden', street: 'Am Pfisterhölzli 38', zip: '8606', city: 'Greifensee' },
    { name: 'Ufuk Soruklu', street: 'Am Pfisterhölzli 28', zip: '8606', city: 'Greifensee' },
  ],
  email: 'dma@pfistanbul.ch',
  /** Keine Telefonnummer – gesetzlich auch nicht verlangt. */
  phone: null as string | null,
  /**
   * Oeffentliche Profile, die dasselbe Unternehmen zeigen.
   *
   * Steht als `sameAs` in den strukturierten Daten. Das ist die uebliche Art,
   * Webseite und Profil als DIESELBE Sache auszuweisen - fuer Suchmaschinen
   * und KI-Werkzeuge ein Beleg, dass es hinter dem Namen etwas Wirkliches
   * gibt. Bei einem Namen, den Google fuer einen Tippfehler von "Istanbul"
   * haelt, zaehlt jeder solche Beleg.
   *
   * ACHTUNG BEI AENDERUNGEN: Wird der Handle auf Instagram umbenannt, zeigt
   * dieser Verweis ins Leere. Dann hier nachfuehren.
   */
  instagram: 'https://www.instagram.com/pfistanbul.fenster/',

  /** Dienst, der die Formulare an die Mailbox weiterleitet. */
  formService: 'Web3Forms',
  /** Betreiberin des Dienstes. */
  formServiceCompany: 'Web3Creative',
  /**
   * Art. 19 Abs. 4 DSG verlangt bei einer Bekanntgabe ins Ausland die Angabe
   * des Staates. Sitz der Betreiberin und Standort der Server fallen hier
   * auseinander – beides gehört genannt.
   */
  formServiceCountry: 'Indien',
  formServerCountry: 'den USA',
  /** Anfragen ohne Bestellung werden nach dieser Frist gelöscht. */
  inquiryRetentionMonths: 12,
  /*
   * Das Foto der beiden Gründer wird nicht mehr hier verwaltet: Es läuft wie
   * alle anderen Bilder durch scripts/bilder.mjs und heisst dort "team".
   */
} as const
