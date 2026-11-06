/**
 * Nur fuer die Testumgebung im Browser (bau/app-testserver.mjs): SecureStore
 * hat dort keine Umsetzung. sessionStorage reicht – der Schluessel stammt
 * vom Demo-Server und verschwindet mit dem Reiter.
 */
export const tresor = {
  lesen: async (name: string) => sessionStorage.getItem(name),
  schreiben: async (name: string, wert: string) => sessionStorage.setItem(name, wert),
  loeschen: async (name: string) => sessionStorage.removeItem(name),
}
