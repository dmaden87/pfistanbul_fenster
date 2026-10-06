import { useSprache } from './sprache'

/**
 * Der Schalter zwischen Deutsch und Türkisch.
 *
 * EIN BAUTEIL FUER BEIDE BEREICHE. Er steht im Adminbereich und im Bereich
 * "Zahlen", aber die Wahl ist dieselbe: Sie liegt im SprachRahmen und wird
 * dort gespeichert. Zweimal dasselbe Markup haette gereicht, aber dann
 * waere die zweite Fassung beim naechsten Umbau zurueckgeblieben.
 */
export function SprachSchalter() {
  const { sprache, setzeSprache, t } = useSprache()
  return (
    <div className="admin__sprache" role="group" aria-label={t.sprache}>
      <button
        type="button"
        className={sprache === 'deutsch' ? 'admin__sprache-knopf admin__sprache-knopf--an' : 'admin__sprache-knopf'}
        aria-pressed={sprache === 'deutsch'}
        onClick={() => setzeSprache('deutsch')}
      >
        DE
      </button>
      <button
        type="button"
        className={sprache === 'tuerkisch' ? 'admin__sprache-knopf admin__sprache-knopf--an' : 'admin__sprache-knopf'}
        aria-pressed={sprache === 'tuerkisch'}
        onClick={() => setzeSprache('tuerkisch')}
      >
        TR
      </button>
    </div>
  )
}
