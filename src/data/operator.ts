/**
 * Angaben zum Betreiber. Art. 3 Abs. 1 lit. s UWG verlangt bei einem
 * Onlineshop Identität und Kontaktadresse "einschliesslich derjenigen der
 * elektronischen Post" – die Mailadresse muss also im Impressum als Text
 * stehen, ein Kontaktformular genügt nicht.
 *
 * Hinweis: Damit steht die Adresse auch im ausgelieferten JavaScript und ist
 * für Spam-Sammler lesbar. Wer das später trennen will, legt eine
 * Alias-Adresse an (etwa info@…), die aufs private Postfach weiterleitet, und
 * trägt nur die Alias hier ein.
 */
export const operator = {
  businessName: 'Pfistanbul Fenster',
  people: [
    { name: 'Deniz Maden', street: 'Am Pfisterhölzli 38', zip: '8606', city: 'Greifensee' },
    { name: 'Ufuk Soruklu', street: 'Am Pfisterhölzli 28', zip: '8606', city: 'Greifensee' },
  ],
  email: 'deniz.maden@gmx.net',
  /** Keine Telefonnummer – gesetzlich auch nicht verlangt. */
  phone: null as string | null,
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
