import { useEffect } from 'react'
import './druckblatt.css'

/**
 * Macht aus einem Element auf dem Bildschirm ein Blatt Papier.
 *
 * Zwei Dinge gehoeren dazu, und nur eines davon laesst sich in einer
 * gewoehnlichen CSS-Datei sagen.
 *
 * PAPIERFORMAT – hier. `@page` gilt fuer das ganze Dokument und laesst sich
 * nicht auf einen Bereich einschraenken. Stuenden in zwei Stylesheets zwei
 * `@page`-Regeln, gewaenne die zuletzt geladene – fuer BEIDE Dokumente. Der
 * Auftrag an den Produzenten ist quer, die Offerte an die Kundschaft hoch;
 * eines von beiden kaeme falsch aus dem Drucker, je nachdem, wie der Bau die
 * Dateien sortiert. Deshalb wird die Regel eingesetzt, solange das jeweilige
 * Dokument offen ist, und danach wieder entfernt.
 *
 * DER REST DER SEITE – in `druckblatt.css`. Das Blatt traegt dort das
 * Merkmal `data-druckblatt`, alles andere verschwindet im Druck.
 */
export function useSeitenformat(ausrichtung: 'quer' | 'hoch', randMm = 12) {
  useEffect(() => {
    const stil = document.createElement('style')
    stil.dataset.zweck = 'seitenformat'
    stil.textContent = `@page { size: A4 ${ausrichtung === 'quer' ? 'landscape' : 'portrait'}; margin: ${randMm}mm; }`
    document.head.appendChild(stil)
    return () => {
      stil.remove()
    }
  }, [ausrichtung, randMm])
}
