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
  /**
   * Sitzstaat des Formulardienstes. Art. 19 Abs. 4 DSG verlangt bei einer
   * Bekanntgabe ins Ausland die Angabe des Staates – sobald bekannt, hier
   * eintragen; dann verschwindet die markierte Lücke in der
   * Datenschutzerklärung von selbst.
   */
  formServiceCountry: null as string | null,
  /** Anfragen ohne Bestellung werden nach dieser Frist gelöscht. */
  inquiryRetentionMonths: 12,
} as const
