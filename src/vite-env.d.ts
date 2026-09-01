/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Ziel-URL des Formulardienstes, der die Bestellung an die Betreiberadresse
   * weiterleitet (z. B. Web3Forms oder Formspree). Die Mailadresse selbst wird
   * beim Dienst hinterlegt und taucht deshalb nie im Browser auf.
   * Sonderwert "demo": Versand wird nur simuliert.
   */
  readonly VITE_ORDER_ENDPOINT?: string
  /** Optionaler Zugriffsschluessel des Formulardienstes (Web3Forms: access_key). */
  readonly VITE_ORDER_ACCESS_KEY?: string
  /** Oeffentlich anzeigbare Telefonnummer fuer Rueckfragen. */
  readonly VITE_CONTACT_PHONE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
