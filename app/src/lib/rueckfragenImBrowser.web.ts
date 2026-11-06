import { Alert, type AlertButton } from 'react-native'

/*
 * Nur fuer die Testumgebung im Browser (bau/app-testserver.mjs).
 *
 * react-native-web laesst Alert.alert leer – jede Rueckfrage ("Abrechnung
 * abschliessen?", "Gesendet?") waere dort ein toter Knopf, und der Ablauf
 * dahinter liesse sich nicht durchklicken. Hier wird daraus confirm():
 * OK nimmt den letzten Knopf, der nicht "Abbrechen" ist, sonst Abbrechen.
 * Bei mehr als zwei Knoepfen gilt dasselbe – der letzte ist in der App
 * immer der Schritt nach vorn.
 */
Alert.alert = (titel: string, text?: string, knoepfe?: AlertButton[]) => {
  const satz = [titel, text].filter(Boolean).join('\n\n')
  if (!knoepfe || knoepfe.length <= 1) {
    window.alert(satz)
    knoepfe?.[0]?.onPress?.()
    return
  }
  const weiter = [...knoepfe].reverse().find((k) => k.style !== 'cancel')
  const zurueck = knoepfe.find((k) => k.style === 'cancel')
  if (window.confirm(satz)) weiter?.onPress?.()
  else zurueck?.onPress?.()
}
