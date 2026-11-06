/**
 * Klickt die Web-Fassung der App durch und legt Bildschirmfotos ab – gegen
 * den Testserver (bau/app-testserver.mjs). Telefongroesse wie ein Pixel.
 *
 * Aufruf: node bau/app-bildschirme.mjs <zielordner> [schritt ...]
 * Schritte: "tippe|Text|foto" (Teiltext), "genau|Text|foto" (ganzer Text),
 * "rolle|Pixel|foto", "url|/pfad|foto", "zurueck||foto".
 */
import { createRequire } from 'node:module'

// Playwright ist in der Cloud-Umgebung global installiert, nicht im Projekt;
// require() findet es dort, ein ES-Import nicht.
const { chromium } = createRequire(import.meta.url)('playwright')

const ziel = process.argv[2] ?? 'bildschirme'
const basis = process.env.APP_URL ?? 'http://localhost:8090'
const browser = await chromium.launch()
const seite = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 })
const meldungen = []
seite.on('pageerror', (f) => meldungen.push(`Seitenfehler: ${f.message}`))
seite.on('console', (m) => m.type() === 'error' && meldungen.push(`Konsole: ${m.text()}`))
seite.on('dialog', async (d) => {
  meldungen.push(`Dialog: ${d.message().replace(/\n+/g, ' / ')}`)
  await d.accept()
})

const foto = async (name) => {
  await seite.waitForTimeout(600)
  await seite.screenshot({ path: `${ziel}/${name}.png` })
  console.log(`foto ${name}`)
}

await seite.goto(basis)
await seite.getByText('Anmelden').first().waitFor()
await foto('01-anmelden')
await seite.locator('input').first().fill(process.env.ADMIN_PASSWORT ?? 'testpasswort')
await seite.getByRole('button', { name: /anmelden/i }).click()
await seite.waitForTimeout(1500)
await foto('02-liste')

// Jeder Schritt: Text antippen, Foto. Fehlt der Text, wird es gemeldet.
for (const schritt of process.argv.slice(3)) {
  const [aktion, wert, name] = schritt.split('|')
  try {
    if (aktion === 'tippe') await seite.getByText(wert, { exact: false }).first().click({ timeout: 4000 })
    if (aktion === 'genau') await seite.getByText(wert, { exact: true }).first().click({ timeout: 4000 })
    if (aktion === 'rolle') await seite.mouse.wheel(0, Number(wert))
    if (aktion === 'url') await seite.goto(`${basis}${wert}`)
    if (aktion === 'zurueck') await seite.goBack()
    await seite.waitForTimeout(800)
    if (name) await foto(name)
  } catch (f) {
    meldungen.push(`Schritt «${schritt}»: ${f.message.split('\n')[0]}`)
  }
}

console.log(meldungen.length ? `\n${meldungen.join('\n')}` : '\nkeine Fehler')
await browser.close()
