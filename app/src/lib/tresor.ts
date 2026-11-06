import * as SecureStore from 'expo-secure-store'

/**
 * Wo der Anmeldeschluessel liegt: im geschuetzten Speicher des Geraets.
 * Die Web-Fassung (tresor.web.ts) gibt es nur fuer die Testumgebung.
 */
export const tresor = {
  lesen: (name: string) => SecureStore.getItemAsync(name),
  schreiben: (name: string, wert: string) => SecureStore.setItemAsync(name, wert),
  loeschen: (name: string) => SecureStore.deleteItemAsync(name),
}
