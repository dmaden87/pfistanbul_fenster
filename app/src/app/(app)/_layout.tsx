import { Stack } from 'expo-router'
import { BestellungenProvider } from '@/lib/bestellungen'
import { farben } from '@/theme'

/** Alles hinter der Anmeldung teilt sich dieselben geladenen Bestellungen. */
export default function AngemeldetLayout() {
  return (
    <BestellungenProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: farben.grund } }} />
    </BestellungenProvider>
  )
}
