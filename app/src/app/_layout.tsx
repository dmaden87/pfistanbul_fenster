import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AnmeldungProvider, useAnmeldung } from '@/lib/anmeldung'
import { farben } from '@/theme'

/**
 * Der Rahmen der App. Wer nicht angemeldet ist, sieht nur die Anmeldung;
 * alles unter (app)/ ist geschuetzt. `Stack.Protected` leitet von selbst um,
 * sobald sich der Stand aendert – nach dem Anmelden in die Liste, nach dem
 * Abmelden (oder einem abgelaufenen Schluessel) zurueck zur Anmeldung.
 */
export default function Wurzel() {
  return (
    <SafeAreaProvider>
      <AnmeldungProvider>
        <StatusBar style="dark" />
        <Navigation />
      </AnmeldungProvider>
    </SafeAreaProvider>
  )
}

function Navigation() {
  const { stand } = useAnmeldung()
  // Solange der gespeicherte Schluessel gelesen wird, bleibt der
  // Startbildschirm stehen - sonst blitzte kurz die Anmeldung auf.
  if (stand === 'laedt') return null

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: farben.grund } }}>
      <Stack.Protected guard={stand === 'angemeldet'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={stand !== 'angemeldet'}>
        <Stack.Screen name="anmelden" />
      </Stack.Protected>
    </Stack>
  )
}
