import type { Plugin } from 'vite'

/**
 * Erzeugt dist/admin.html - die Huelle der Android-App fuer den Adminbereich.
 *
 * WARUM EINE EIGENE DATEI und nicht einfach index.html unter /admin: Die
 * index.html wird nach dem Build durch die vorgerenderte Startseite ersetzt
 * (bau/vorgerendert.ts). Unter /admin stuende dann beim Oeffnen der App fuer
 * einen Augenblick die ganze Verkaufsseite, bevor React sie wegwirft. Und sie
 * truege Startseiten-Angaben - canonical, JSON-LD, og:-Tags -, die fuer eine
 * gesperrte Admin-Adresse falsch sind.
 *
 * Vor allem aber: Nur diese Datei verweist auf admin.webmanifest. Haenge das
 * Manifest an der Startseite, boete Chrome jeder Kundin an, "Pfistanbul
 * Admin" zu installieren.
 *
 * Gebaut wird aus der frischen Huelle, die Vite gerade erzeugt hat - die
 * Verweise auf die Bundle-Dateien stimmen damit immer. Uebernommen werden nur
 * Skript, Stylesheet und die Schrift-Preloads; alles andere steht hier.
 */
export function adminApp(): Plugin {
  return {
    name: 'pfistanbul-admin-app',
    apply: 'build',
    enforce: 'post',

    generateBundle(_optionen, bundle) {
      const huelle = bundle['index.html']
      if (!huelle || huelle.type !== 'asset') {
        this.error('index.html fehlt im Bundle - admin.html kann nicht erzeugt werden.')
      }
      const html = String(huelle.source)

      const uebernehmen = [
        ...html.matchAll(/<script\b[^>]*\bsrc="\/assets\/[^"]+"[^>]*><\/script>/g),
        ...html.matchAll(/<link\b[^>]*\bhref="\/assets\/[^"]+"[^>]*>/g),
        ...html.matchAll(/<link\b[^>]*\brel="preload"[^>]*>/g),
      ].map((t) => t[0])

      if (!uebernehmen.some((tag) => tag.startsWith('<script'))) {
        this.error('Im index.html wurde kein Bundle-Skript gefunden - admin.html bliebe weiss.')
      }

      const admin = `<!doctype html>
<html lang="de-CH">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="theme-color" content="#0f3b34" />
    <title>Pfistanbul Admin</title>
    <link rel="manifest" href="/admin.webmanifest" />
    <link rel="icon" href="/favicon.ico" sizes="32x32" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="PF Admin" />
    ${uebernehmen.join('\n    ')}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`
      this.emitFile({ type: 'asset', fileName: 'admin.html', source: admin })
    },
  }
}
